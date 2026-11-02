// testes-visuais-servidor.js — infraestrutura comum dos testes visuais (docs/contratos.md §14):
// sobe o servidor real (banco :memory:) com um usuário comum e um admin já criados, e abre o
// navegador (Playwright, canal do Edge instalado — NAVEGADOR_TESTES para trocar) com uma aba
// por identidade (anônima, comum, admin), reaproveitada em toda a matriz.

import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

const SENHA = 'senha-de-teste-123';

function extrairCookie(resposta, nome) {
  return (resposta.headers.getSetCookie?.() ?? [])
    .map((linha) => new RegExp(`${nome}=([^;]*)`).exec(linha)?.[1])
    .find((valor) => valor !== undefined);
}

async function criarUsuario(base, email, nome) {
  const inicial = await fetch(base);
  const csrf = extrairCookie(inicial, 'af_csrf');
  const resposta = await fetch(base + '/api/autenticacao/criar-conta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: `af_csrf=${csrf}` },
    body: JSON.stringify({ nome, email, senha: SENHA, aceitou_termos: true }),
  });
  const sessao = extrairCookie(resposta, 'af_sessao');
  return sessao;
}

// Registra os ouvintes de erro uma única vez por página; o `estado` é reaproveitado e limpo
// antes de cada navegação em preparaEstado().
function prepararPagina(pagina, estado) {
  pagina.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const texto = msg.text();
    if (/Content Security Policy/i.test(texto)) {
      estado.violacoesCsp.push(texto);
      return;
    }
    // "Failed to load resource" do próprio documento principal é só o eco do status HTTP da
    // navegação (ex.: a rota de 404 de propósito) — isso é conferido separadamente pelo status
    // da resposta, não é "erro de console" da aplicação.
    if (/Failed to load resource/.test(texto) && msg.location()?.url === estado.urlAtual) return;
    estado.erros.push(texto);
  });
  pagina.on('pageerror', (erro) => estado.erros.push(`pageerror: ${erro.message}`));
  pagina.on('response', (resposta) => {
    if (resposta.status() >= 500) estado.respostasComErro.push(`${resposta.status()} ${resposta.url()}`);
  });
  pagina.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evento) => {
      window.__afViolacoesCsp = window.__afViolacoesCsp || [];
      window.__afViolacoesCsp.push(`${evento.violatedDirective} :: ${evento.blockedURI}`);
    });
  });
}

function preparaEstado(estado, urlAtual) {
  estado.erros = [];
  estado.violacoesCsp = [];
  estado.respostasComErro = [];
  estado.urlAtual = urlAtual;
}

// A matriz visual navega dezenas de vezes em menos de um minuto, sempre do mesmo IP de loopback
// — isso estouraria de propósito o limite de tráfego real (docs/contratos.md §9.2), que já tem
// teste próprio em seguranca-limite-trafego.test.js. Aqui o limitador é substituído por um que
// nunca bloqueia, para não confundir "429 por causa do próprio teste" com um defeito do site.
function criarLimitadorSemLimite() {
  return {
    middleware: () => (req, res, next) => next(),
    registrarFalha: () => ({ bloqueado: false, segundosRestantes: 0 }),
    limparFalhas: () => {},
    verificar: () => ({ bloqueado: false, segundosRestantes: 0 }),
    listarBloqueios: () => [],
    desbloquear: () => {},
  };
}

export async function subirAmbienteVisual() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-visual-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco, modulos: { limitador: criarLimitadorSemLimite() } });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const host = '127.0.0.1';

  const sessaoComum = await criarUsuario(base, 'visual-comum@teste.dev', 'Visual Comum');
  const sessaoAdmin = await criarUsuario(base, 'visual-admin@teste.dev', 'Visual Admin');
  banco.prepare("UPDATE usuarios SET papel = 'admin' WHERE email = 'visual-admin@teste.dev'").run();

  const browser = await chromium.launch({ channel: process.env.NAVEGADOR_TESTES ?? 'msedge' });

  const paginas = {};
  const estados = {};

  async function criarIdentidade(nome, sessao) {
    const contexto = await browser.newContext();
    const cookies = [];
    if (sessao) cookies.push({ name: 'af_sessao', value: sessao, domain: host, path: '/' });
    if (cookies.length) await contexto.addCookies(cookies);
    const pagina = await contexto.newPage();
    const estado = { erros: [], violacoesCsp: [], respostasComErro: [], urlAtual: '' };
    prepararPagina(pagina, estado);
    paginas[nome] = pagina;
    estados[nome] = estado;
  }

  await criarIdentidade('anonimo', null);
  await criarIdentidade('comum', sessaoComum);
  await criarIdentidade('admin', sessaoAdmin);

  // Visitar (identidade, caminho, { tema, idioma, viewport }) → devolve a resposta HTTP da
  // navegação principal, já com os coletores de erro zerados para esta chamada.
  async function visitar(identidade, caminho, { tema, idioma, viewport }) {
    const pagina = paginas[identidade];
    const estado = estados[identidade];
    const urlAlvo = base + caminho;
    preparaEstado(estado, urlAlvo);
    await pagina.setViewportSize(viewport);
    await pagina.context().addCookies([
      { name: 'tema', value: tema, domain: host, path: '/' },
      { name: 'idioma', value: idioma, domain: host, path: '/' },
    ]);
    const resposta = await pagina.goto(urlAlvo, { waitUntil: 'networkidle' });
    const violacoesEvento = await pagina.evaluate(() => window.__afViolacoesCsp ?? []);
    estado.violacoesCsp.push(...violacoesEvento);
    return { pagina, estado, resposta };
  }

  async function fechar() {
    await browser.close();
    await new Promise((resolver) => servidor.close(resolver));
    banco.close();
  }

  return { base, banco, visitar, fechar };
}

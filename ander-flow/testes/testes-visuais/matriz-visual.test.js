// matriz-visual.test.js — testes visuais Playwright (docs/contratos.md §14): 1440×900 e
// 390×844 × tema claro/escuro × pt-BR/en, nas telas principais (públicas, com sessão e com
// sessão admin). Cada combinação falha se houver erro de console, `pageerror`, violação de
// CSP, requisição com status ≥ 500, ou chave de idioma crua/variável não substituída visível
// no texto de <main>. Confere também `<html lang>` e `data-tema`, e salva uma captura de tela
// em testes/testes-visuais/capturas/ (fora do git).

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { subirAmbienteVisual } from './testes-visuais-servidor.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_CAPTURAS = join(AQUI, 'capturas');
mkdirSync(PASTA_CAPTURAS, { recursive: true });

// Padrão de chave de idioma crua ("pagina.secao.chave") vazada no texto visível — ver
// docs/contratos.md §3.3. Exige pelo menos dois pontos (3 segmentos) para não confundir com
// preço formatado ("R$74.41") ou outro texto com um único ponto.
const REGEX_CHAVE_CRUA = /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\b/;
// Variável de idioma não substituída ("{nome}") vazada no texto visível.
const REGEX_VARIAVEL_CRUA = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/;

const ROTAS = [
  { slug: 'inicio', caminho: '/', identidade: 'anonimo' },
  { slug: 'ferramentas', caminho: '/ferramentas', identidade: 'anonimo' },
  { slug: 'ferramentas-preco-de-venda', caminho: '/ferramentas/preco-de-venda', identidade: 'anonimo' },
  { slug: 'ferramentas-limpar-planilha', caminho: '/ferramentas/limpar-planilha', identidade: 'anonimo' },
  { slug: 'entrar', caminho: '/entrar', identidade: 'anonimo' },
  { slug: 'planos', caminho: '/planos', identidade: 'anonimo' },
  { slug: 'salvos', caminho: '/salvos', identidade: 'anonimo' },
  { slug: 'avisos', caminho: '/avisos', identidade: 'anonimo' },
  { slug: 'rota-inexistente-404', caminho: '/isso-nao-existe-de-verdade-af13', identidade: 'anonimo', statusEsperado: 404 },
  { slug: 'trabalho', caminho: '/trabalho', identidade: 'comum' },
  { slug: 'conta', caminho: '/conta', identidade: 'comum' },
  { slug: 'admin', caminho: '/admin', identidade: 'admin' },
];

const VIEWPORTS = [
  { nome: 'desktop-1440x900', width: 1440, height: 900 },
  { nome: 'celular-390x844', width: 390, height: 844 },
];

const TEMAS = ['claro', 'escuro'];
const IDIOMAS = ['pt-BR', 'en'];

let ambiente;

before(async () => {
  ambiente = await subirAmbienteVisual();
});

after(async () => {
  await ambiente.fechar();
});

for (const rota of ROTAS) {
  for (const viewport of VIEWPORTS) {
    for (const tema of TEMAS) {
      for (const idioma of IDIOMAS) {
        const nomeTeste = `${rota.slug} · ${viewport.nome} · ${tema} · ${idioma}`;

        test(nomeTeste, async () => {
          const { pagina, estado, resposta } = await ambiente.visitar(rota.identidade, rota.caminho, {
            tema,
            idioma,
            viewport,
          });

          const statusEsperado = rota.statusEsperado ?? 200;
          assert.equal(resposta.status(), statusEsperado, `status HTTP da navegação para ${rota.caminho}`);

          assert.deepEqual(estado.erros, [], `erro(s) de console em ${nomeTeste}`);
          assert.deepEqual(estado.violacoesCsp, [], `violação(ões) de CSP em ${nomeTeste}`);
          assert.deepEqual(estado.respostasComErro, [], `requisição(ões) com status ≥ 500 em ${nomeTeste}`);

          const langHtml = await pagina.evaluate(() => document.documentElement.getAttribute('lang'));
          const temaHtml = await pagina.evaluate(() => document.documentElement.getAttribute('data-tema'));
          assert.equal(langHtml, idioma, `<html lang> deveria ser "${idioma}"`);
          assert.equal(temaHtml, tema, `<html data-tema> deveria ser "${tema}"`);
          const idiomasPressionados = await pagina.evaluate(() =>
            [...document.querySelectorAll('[data-acao="trocar-idioma"][aria-pressed="true"]')].map((botao) => botao.dataset.idioma));
          assert.deepEqual(idiomasPressionados, [idioma], `só o botão "${idioma}" deveria estar pressionado`);

          const textoPrincipal = await pagina.evaluate(() => document.querySelector('main')?.innerText ?? '');
          const chaveCrua = REGEX_CHAVE_CRUA.exec(textoPrincipal);
          const variavelCrua = REGEX_VARIAVEL_CRUA.exec(textoPrincipal);
          assert.equal(chaveCrua, null, `chave de idioma crua visível em <main>: "${chaveCrua?.[0]}"`);
          assert.equal(variavelCrua, null, `variável não substituída visível em <main>: "${variavelCrua?.[0]}"`);

          // scripts-verificar-nomes.js (§1) exige minúsculas e prefixo pela pasta-mãe ("capturas-")
          // mesmo em arquivo gerado/gitignorado — daí "pt-BR" em minúsculas só no nome do arquivo.
          const arquivo = join(
            PASTA_CAPTURAS,
            `capturas-${rota.slug}-${viewport.nome}-${tema}-${idioma.toLowerCase()}.png`,
          );
          await pagina.screenshot({ path: arquivo, fullPage: true });
        });
      }
    }
  }
}

#!/usr/bin/env node
// scripts-verificar-nomes.js — confere as regras de nome de arquivo do §1 dos contratos:
// minúsculas, hífen, sem acento/espaço/underscore, prefixado pela pasta-mãe (algum ancestral
// direto até a raiz verificada) — exceto em testes/, onde basta terminar em ".test.js".
// Uso: node scripts/scripts-verificar-nomes.js [--raiz <pasta>]
import { readdirSync, statSync } from 'node:fs';
import { extname, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PASTAS_VERIFICADAS = ['frontend', 'servidor', 'banco', 'scripts', 'testes'];
const EXCECOES_EXATAS = new Set(['package.json', 'package-lock.json', 'README.md', 'CHECKLIST.md', '.gitignore']);

function ehExcecao(nome) {
  if (EXCECOES_EXATAS.has(nome)) return true;
  if (nome.startsWith('.')) return true; // .env*, .gitkeep, etc.
  return false;
}

/** Minúsculas, sem espaço, sem underscore, sem acento, só [a-z0-9.-]. Função pura. */
export function nomeValido(nome) {
  if (/\s/.test(nome)) return false;
  if (nome.includes('_')) return false;
  if (nome !== nome.toLowerCase()) return false;
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (semAcento !== nome) return false;
  return /^[a-z0-9.-]+$/.test(nome);
}

/**
 * O nome do arquivo precisa começar com o nome de algum ancestral direto (a "pasta-mãe",
 * em qualquer nível até a raiz verificada) — ex.: `catalogo-lista.js` em `paginas/catalogo/`,
 * ou `banco-sementes.js` em `banco/sementes/` (ancestral `banco`). Dentro de `testes/`, o nome
 * do módulo testado é livre; só é exigido terminar em `.test.js`. Função pura.
 */
export function prefixadoPelaPastaMae(nomeArquivo, pastasAncestrais) {
  if (pastasAncestrais.includes('testes')) return nomeArquivo.endsWith('.test.js');
  const base = nomeArquivo.slice(0, nomeArquivo.length - extname(nomeArquivo).length);
  return pastasAncestrais.some((pasta) => base === pasta || base.startsWith(`${pasta}-`));
}

function listarTudo(pasta) {
  const itens = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    const info = statSync(caminho);
    itens.push({ nome, caminho, diretorio: info.isDirectory() });
    if (info.isDirectory()) itens.push(...listarTudo(caminho));
  }
  return itens;
}

/** Roda a verificação completa em `raiz` e devolve a lista de problemas (vazia = aprovado). */
export function verificarNomes(raiz) {
  const problemas = [];

  for (const pastaTopo of PASTAS_VERIFICADAS) {
    const caminhoTopo = join(raiz, pastaTopo);
    try {
      statSync(caminhoTopo);
    } catch {
      continue; // pasta ainda não existe (agente que a povoa não rodou ainda)
    }
    for (const item of listarTudo(caminhoTopo)) {
      if (ehExcecao(item.nome)) continue;
      const relativoRaiz = relative(raiz, item.caminho).replace(/\\/g, '/');
      if (!nomeValido(item.nome)) {
        problemas.push(`${relativoRaiz}: nome inválido (use minúsculas, hífen, sem acento/espaço/underscore)`);
        continue;
      }
      if (item.diretorio) continue; // a exigência de prefixo vale para arquivos
      const partesAncestrais = relative(raiz, dirname(item.caminho)).replace(/\\/g, '/').split('/').filter(Boolean);
      if (!prefixadoPelaPastaMae(item.nome, partesAncestrais)) {
        problemas.push(`${relativoRaiz}: não está prefixado pela pasta-mãe (${partesAncestrais.join('/')})`);
      }
    }
  }

  return problemas;
}

function ehModuloPrincipal() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (ehModuloPrincipal()) {
  const raizPadrao = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const argumentos = process.argv.slice(2);
  const indiceRaiz = argumentos.indexOf('--raiz');
  const raiz = resolve(indiceRaiz >= 0 ? argumentos[indiceRaiz + 1] : raizPadrao);

  const problemas = verificarNomes(raiz);
  if (problemas.length) {
    console.error(`REPROVADO: ${problemas.length} problema(s) de nome de arquivo:`);
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exit(1);
  }
  console.log('APROVADO: nomes de arquivo seguem as regras do §1.');
}

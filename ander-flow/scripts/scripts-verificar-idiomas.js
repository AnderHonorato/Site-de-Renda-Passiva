#!/usr/bin/env node
// scripts-verificar-idiomas.js — paridade total de chaves entre pt-BR e en (compartilhado,
// páginas, ferramentas e os campos bilíngues dos manifestos), valores não vazios, e toda chave
// usada em data-texto* (HTML) ou t('...') literal (JS) existe no dicionário pt-BR.
// Uso: node scripts/scripts-verificar-idiomas.js [--raiz <pasta>]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function listarArquivos(pasta, filtro) {
  const resultado = [];
  if (!existsSync(pasta)) return resultado;
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) resultado.push(...listarArquivos(caminho, filtro));
    else if (filtro(caminho)) resultado.push(caminho);
  }
  return resultado;
}

function lerJson(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

/** Achata um objeto aninhado em chaves com ponto (`compartilhado.rodape.direitos`). Função pura. */
export function achatar(objeto, prefixo = '') {
  const chaves = {};
  for (const [chave, valor] of Object.entries(objeto ?? {})) {
    const caminhoChave = prefixo ? `${prefixo}.${chave}` : chave;
    if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
      Object.assign(chaves, achatar(valor, caminhoChave));
    } else {
      chaves[caminhoChave] = valor;
    }
  }
  return chaves;
}

/** Vazio: string em branco, array vazio, ou array com algum item vazio. Função pura. */
export function valorVazio(valor) {
  if (valor == null) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (Array.isArray(valor)) return valor.length === 0 || valor.some((item) => valorVazio(item));
  return false;
}

/** Compara dois dicionários já achatados e devolve a lista de problemas de paridade. Função pura. */
export function compararParidade(dicPtBr, dicEn, rotuloPtBr, rotuloEn) {
  const problemas = [];
  for (const [chave, valor] of Object.entries(dicPtBr)) {
    if (valorVazio(valor)) problemas.push(`${rotuloPtBr}: chave "${chave}" está vazia`);
    if (!(chave in dicEn)) problemas.push(`${rotuloEn}: falta a chave "${chave}" (existe em pt-BR)`);
    else if (valorVazio(dicEn[chave])) problemas.push(`${rotuloEn}: chave "${chave}" está vazia`);
  }
  for (const chave of Object.keys(dicEn)) {
    if (!(chave in dicPtBr)) problemas.push(`${rotuloPtBr}: falta a chave "${chave}" (existe em en)`);
  }
  return problemas;
}

function chaveEhEstatica(chave) {
  return !chave.includes('{') && !chave.includes('+');
}

const EXPR_ATRIBUTO_TEXTO = /data-texto(?:-[a-z-]+)?="([^"]+)"/g;
const EXPR_CHAMADA_T = /\bt\(\s*['"]([^'"]+)['"]/g;
const CAMPOS_BILINGUES = ['nome', 'descricao', 'intencoes', 'etiquetas'];

/** Roda a verificação completa em `raiz` e devolve a lista de problemas (vazia = aprovado). */
export function verificarIdiomas(raiz) {
  const problemas = [];

  // 1) pares compartilhado/páginas/ferramentas: *-idioma-pt-br.json / *-idioma-en.json
  const arquivosPtBr = listarArquivos(join(raiz, 'frontend'), (caminho) => caminho.endsWith('-idioma-pt-br.json'));
  const dicionarioGeralPtBr = {};

  for (const caminhoPtBr of arquivosPtBr) {
    const caminhoEn = caminhoPtBr.replace(/-idioma-pt-br\.json$/, '-idioma-en.json');
    const rotuloPtBr = relative(raiz, caminhoPtBr).replace(/\\/g, '/');
    const rotuloEn = relative(raiz, caminhoEn).replace(/\\/g, '/');

    let dicPtBr;
    try {
      dicPtBr = achatar(lerJson(caminhoPtBr));
    } catch (erro) {
      problemas.push(`${rotuloPtBr}: JSON inválido (${erro.message})`);
      continue;
    }
    Object.assign(dicionarioGeralPtBr, dicPtBr);

    if (!existsSync(caminhoEn)) {
      problemas.push(`${rotuloEn}: arquivo não existe (esperado, com as mesmas chaves de ${rotuloPtBr})`);
      continue;
    }
    let dicEn;
    try {
      dicEn = achatar(lerJson(caminhoEn));
    } catch (erro) {
      problemas.push(`${rotuloEn}: JSON inválido (${erro.message})`);
      continue;
    }
    problemas.push(...compararParidade(dicPtBr, dicEn, rotuloPtBr, rotuloEn));
  }

  // 2) campos bilíngues dos manifestos de ferramenta
  const manifestos = listarArquivos(join(raiz, 'frontend', 'ferramentas'), (caminho) => caminho.endsWith('-manifesto.json'));
  for (const caminho of manifestos) {
    const rotulo = relative(raiz, caminho).replace(/\\/g, '/');
    let manifesto;
    try {
      manifesto = lerJson(caminho);
    } catch (erro) {
      problemas.push(`${rotulo}: JSON inválido (${erro.message})`);
      continue;
    }
    for (const campo of CAMPOS_BILINGUES) {
      const valorCampo = manifesto[campo];
      if (valorCampo == null) {
        if (campo === 'nome' || campo === 'descricao') problemas.push(`${rotulo}: falta o campo "${campo}"`);
        continue;
      }
      for (const idioma of ['pt-BR', 'en']) {
        if (!(idioma in valorCampo)) {
          problemas.push(`${rotulo}: campo "${campo}" sem "${idioma}"`);
        } else if (valorVazio(valorCampo[idioma])) {
          problemas.push(`${rotulo}: campo "${campo}.${idioma}" está vazio`);
        }
      }
    }
  }

  // 3) toda chave usada em data-texto*="..." (HTML) ou t('...') literal (JS) existe no pt-BR
  for (const caminho of listarArquivos(join(raiz, 'frontend'), (c) => c.endsWith('.html'))) {
    const rotulo = relative(raiz, caminho).replace(/\\/g, '/');
    const conteudo = readFileSync(caminho, 'utf8');
    let correspondencia;
    while ((correspondencia = EXPR_ATRIBUTO_TEXTO.exec(conteudo))) {
      const chave = correspondencia[1];
      if (!chaveEhEstatica(chave)) continue;
      if (!(chave in dicionarioGeralPtBr)) problemas.push(`${rotulo}: chave de idioma "${chave}" não existe em pt-BR`);
    }
  }

  for (const caminho of listarArquivos(join(raiz, 'frontend'), (c) => c.endsWith('.js'))) {
    const rotulo = relative(raiz, caminho).replace(/\\/g, '/');
    const conteudo = readFileSync(caminho, 'utf8');
    let correspondencia;
    while ((correspondencia = EXPR_CHAMADA_T.exec(conteudo))) {
      const chave = correspondencia[1];
      if (!chaveEhEstatica(chave)) continue;
      if (!(chave in dicionarioGeralPtBr)) problemas.push(`${rotulo}: chave de idioma "${chave}" não existe em pt-BR`);
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

  const problemas = verificarIdiomas(raiz);
  if (problemas.length) {
    console.error(`REPROVADO: ${problemas.length} problema(s) de idioma:`);
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exit(1);
  }
  console.log('APROVADO: idiomas em paridade e chaves usadas existem em pt-BR.');
}

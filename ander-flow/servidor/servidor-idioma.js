// servidor-idioma.js — dicionários de idioma no servidor (docs/contratos.md §8.7).
// Lê compartilhado-idioma-*.json e <pagina>-idioma-*.json (ou <slug>-idioma-*.json),
// mescla en com queda por chave para pt-BR, e traduz textos com variáveis {nome}.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const IDIOMAS_SUPORTADOS = ['pt-BR', 'en'];

/** Lê um valor aninhado em um objeto a partir de uma chave com pontos ("a.b.c"). */
export function obterPorCaminho(objeto, caminho) {
  if (typeof caminho !== 'string' || caminho === '') return undefined;
  return caminho.split('.').reduce(
    (atual, parte) => (atual && typeof atual === 'object' ? atual[parte] : undefined),
    objeto,
  );
}

/** Substitui ocorrências de {nome} pelo valor de variaveis.nome (sem escapar). */
export function substituirVariaveisTexto(texto, variaveis = {}) {
  if (typeof texto !== 'string') return texto;
  return texto.replace(/\{([a-zA-Z0-9_]+)\}/g, (correspondencia, nome) => {
    if (variaveis && Object.prototype.hasOwnProperty.call(variaveis, nome)) {
      const valor = variaveis[nome];
      return valor === undefined || valor === null ? '' : String(valor);
    }
    return correspondencia;
  });
}

function sufixoArquivo(codigo) {
  return codigo === 'en' ? 'en' : 'pt-br';
}

function caminhoSeguro(pedaco) {
  return typeof pedaco === 'string' && pedaco !== '' && !pedaco.includes('..') && !/[\\/]/.test(pedaco);
}

function mesclarComFallback(base, prioridade) {
  if (Array.isArray(base)) {
    return Array.isArray(prioridade) ? prioridade : base;
  }
  if (base !== null && typeof base === 'object') {
    const resultado = {};
    for (const chave of Object.keys(base)) {
      const valorPrioridade =
        prioridade && typeof prioridade === 'object' && !Array.isArray(prioridade) ? prioridade[chave] : undefined;
      resultado[chave] = mesclarComFallback(base[chave], valorPrioridade);
    }
    return resultado;
  }
  return prioridade !== undefined ? prioridade : base;
}

export function criarIdioma({ raiz }) {
  let cache = new Map();

  function normalizarCodigo(codigo) {
    if (typeof codigo !== 'string') return 'pt-BR';
    return codigo.trim().toLowerCase() === 'en' ? 'en' : 'pt-BR';
  }

  function idiomaDaRequisicao(req) {
    return normalizarCodigo(req?.cookies?.idioma);
  }

  function lerJson(caminho) {
    if (!existsSync(caminho)) return null;
    try {
      return JSON.parse(readFileSync(caminho, 'utf8'));
    } catch {
      return null;
    }
  }

  function pastaDaPagina(pagina) {
    const caminhoPaginas = join(raiz, 'frontend', 'paginas', pagina);
    if (existsSync(caminhoPaginas)) return caminhoPaginas;
    return join(raiz, 'frontend', 'ferramentas', pagina);
  }

  function carregarCompartilhado(codigo) {
    const caminho = join(raiz, 'frontend', 'compartilhado', `compartilhado-idioma-${sufixoArquivo(codigo)}.json`);
    return lerJson(caminho)?.compartilhado ?? {};
  }

  function carregarPagina(codigo, pagina) {
    if (!caminhoSeguro(pagina)) return {};
    const pasta = pastaDaPagina(pagina);
    const caminho = join(pasta, `${pagina}-idioma-${sufixoArquivo(codigo)}.json`);
    return lerJson(caminho)?.[pagina] ?? {};
  }

  function dicionario(codigo, pagina) {
    const cod = normalizarCodigo(codigo);
    const chaveCache = `${cod}:${pagina}`;
    if (cache.has(chaveCache)) return cache.get(chaveCache);

    const compartilhadoPt = carregarCompartilhado('pt-BR');
    const paginaPt = carregarPagina('pt-BR', pagina);

    let resultado;
    if (cod === 'pt-BR') {
      resultado = { compartilhado: compartilhadoPt, [pagina]: paginaPt };
    } else {
      const compartilhadoOutro = carregarCompartilhado(cod);
      const paginaOutro = carregarPagina(cod, pagina);
      resultado = {
        compartilhado: mesclarComFallback(compartilhadoPt, compartilhadoOutro),
        [pagina]: mesclarComFallback(paginaPt, paginaOutro),
      };
    }
    cache.set(chaveCache, resultado);
    return resultado;
  }

  function traduzir(codigo, chave, variaveis = {}, pagina) {
    const dic = dicionario(codigo, pagina);
    const valor = obterPorCaminho(dic, chave);
    const bruto = typeof valor === 'string' ? valor : chave;
    return substituirVariaveisTexto(bruto, variaveis);
  }

  function recarregar() {
    cache = new Map();
  }

  return {
    idiomas: IDIOMAS_SUPORTADOS,
    normalizarCodigo,
    idiomaDaRequisicao,
    dicionario,
    traduzir,
    recarregar,
  };
}

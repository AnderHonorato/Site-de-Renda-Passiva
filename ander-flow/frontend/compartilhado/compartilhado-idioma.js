// compartilhado-idioma.js — tradução no navegador (pt-BR <-> en).
// A lógica pura (substituição de variáveis, tradução a partir de um dicionário,
// montagem do cookie) fica em funções exportadas separadas, para rodar no Node sem DOM.

import { chamarApi } from './compartilhado-api.js';

let dicionarioCarregado = null;
let variaveisGlobaisCarregadas = null;
const escutadoresDeTroca = new Set();

/** Lê um bloco `<script type="application/json" id="...">` e devolve o objeto (ou {} se ausente/inválido). */
function lerBlocoJson(id) {
  try {
    const elemento = document.getElementById(id);
    if (!elemento) return {};
    const dados = JSON.parse(elemento.textContent || '{}');
    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}

function obterDicionario() {
  if (dicionarioCarregado) return dicionarioCarregado;
  dicionarioCarregado = typeof document !== 'undefined' ? lerBlocoJson('af-textos') : {};
  return dicionarioCarregado;
}

function obterVariaveisGlobais() {
  if (variaveisGlobaisCarregadas) return variaveisGlobaisCarregadas;
  variaveisGlobaisCarregadas = typeof document !== 'undefined' ? lerBlocoJson('af-variaveis') : {};
  return variaveisGlobaisCarregadas;
}

/** Substitui `{nome}` no texto pelo valor em `variaveis`; sem valor, deixa como está. Função pura. */
export function substituirVariaveis(texto, variaveis = {}) {
  if (typeof texto !== 'string') return texto;
  return texto.replace(/\{(\w+)\}/g, (correspondencia, nome) => {
    const valor = variaveis[nome];
    return valor === undefined || valor === null ? correspondencia : String(valor);
  });
}

/**
 * Navega `dicionario` pela chave com pontos e devolve o texto (ou a própria chave, se não achar).
 * A variável na própria chave é substituída antes da busca — `erro.{codigo}.titulo` vira
 * `erro.404.titulo` —, igual ao que o montador faz no servidor. Função pura.
 */
export function traduzirComDicionario(dicionario, chave, variaveis = {}) {
  const partes = substituirVariaveis(String(chave), variaveis).split('.');
  let atual = dicionario;
  for (const parte of partes) {
    if (atual == null || typeof atual !== 'object' || !(parte in atual)) return chave;
    atual = atual[parte];
  }
  if (typeof atual !== 'string') return chave;
  return substituirVariaveis(atual, variaveis);
}

/** Monta a string do cookie `idioma` (1 ano, SameSite=Lax, path=/). Função pura. */
export function montarCookieIdioma(codigo, { emProducao = false } = {}) {
  const partes = [
    `idioma=${encodeURIComponent(codigo)}`,
    `Max-Age=${60 * 60 * 24 * 365}`,
    'Path=/',
    'SameSite=Lax',
  ];
  if (emProducao) partes.push('Secure');
  return partes.join('; ');
}

export function idiomaAtual() {
  try {
    return document.documentElement.lang === 'en' ? 'en' : 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}

export function t(chave, variaveis = {}) {
  const globais = obterVariaveisGlobais();
  return traduzirComDicionario(obterDicionario(), chave, { ...globais, ...variaveis });
}

/** Aplica `data-texto*` em um trecho de DOM criado pelo JS (não faz negrito — use textoComNegrito para isso). */
export function aplicarTextos(raiz = document) {
  if (typeof document === 'undefined') return;
  const ATRIBUTOS = {
    // `**negrito**` vira <strong> como o montador faz no servidor; sem asterisco na tela.
    'data-texto': (elemento, texto) => { aplicarTextoComNegrito(elemento, texto); },
    'data-texto-placeholder': (elemento, texto) => elemento.setAttribute('placeholder', texto),
    'data-texto-aria-label': (elemento, texto) => elemento.setAttribute('aria-label', texto),
    'data-texto-title': (elemento, texto) => elemento.setAttribute('title', texto),
    'data-texto-alt': (elemento, texto) => elemento.setAttribute('alt', texto),
    'data-texto-content': (elemento, texto) => elemento.setAttribute('content', texto),
    'data-texto-value': (elemento, texto) => { elemento.value = texto; },
  };
  for (const [atributo, aplicar] of Object.entries(ATRIBUTOS)) {
    const seletor = `[${atributo}]`;
    const candidatos = raiz.matches?.(seletor) ? [raiz, ...raiz.querySelectorAll(seletor)] : [...raiz.querySelectorAll(seletor)];
    for (const elemento of candidatos) {
      const chave = elemento.getAttribute(atributo);
      if (!chave) continue;
      aplicar(elemento, t(chave));
    }
  }
}

/**
 * Aplica um texto traduzido com **negrito** dentro de `elemento`, criando nós de texto e `<strong>`
 * via DOM (nunca innerHTML). `textoComNegrito` faz a quebra em segmentos (função pura, testável).
 */
export function segmentarNegrito(texto) {
  const segmentos = [];
  const expressao = /\*\*(.+?)\*\*/g;
  let ultimoIndice = 0;
  let correspondencia;
  while ((correspondencia = expressao.exec(texto)) !== null) {
    if (correspondencia.index > ultimoIndice) {
      segmentos.push({ negrito: false, texto: texto.slice(ultimoIndice, correspondencia.index) });
    }
    segmentos.push({ negrito: true, texto: correspondencia[1] });
    ultimoIndice = correspondencia.index + correspondencia[0].length;
  }
  if (ultimoIndice < texto.length) segmentos.push({ negrito: false, texto: texto.slice(ultimoIndice) });
  return segmentos;
}

/** Escreve o texto no elemento montando `<strong>` para cada trecho entre `**`. */
export function aplicarTextoComNegrito(elemento, texto) {
  if (typeof document === 'undefined') return;
  const segmentos = segmentarNegrito(texto);
  if (segmentos.length === 1 && !segmentos[0].negrito) {
    elemento.textContent = texto;
    return;
  }
  elemento.textContent = '';
  for (const segmento of segmentos) {
    if (segmento.negrito) {
      const forte = document.createElement('strong');
      forte.textContent = segmento.texto;
      elemento.appendChild(forte);
    } else {
      elemento.appendChild(document.createTextNode(segmento.texto));
    }
  }
}

export function textoComNegrito(elemento, chave, variaveis = {}) {
  aplicarTextoComNegrito(elemento, t(chave, variaveis));
}

export function aoTrocarIdioma(funcao) {
  escutadoresDeTroca.add(funcao);
  return () => escutadoresDeTroca.delete(funcao);
}

export async function trocarIdioma(codigo) {
  if (typeof document === 'undefined') return;
  const pagina = document.documentElement.dataset.pagina || '';
  const resposta = await chamarApi(`/api/idioma/${codigo}/${pagina}`);
  if (resposta) {
    dicionarioCarregado = resposta.textos ?? {};
    variaveisGlobaisCarregadas = resposta.variaveis ?? {};
  }
  try {
    document.cookie = montarCookieIdioma(codigo, { emProducao: document.location.protocol === 'https:' });
  } catch {
    // armazenamento indisponível; segue sem persistir
  }
  try {
    localStorage.setItem('af-idioma', codigo);
  } catch {
    // armazenamento indisponível
  }
  document.documentElement.lang = codigo === 'en' ? 'en' : 'pt-BR';
  document.documentElement.dataset.idioma = codigo;
  aplicarTextos(document);
  for (const funcao of escutadoresDeTroca) funcao(codigo);
  document.dispatchEvent(new CustomEvent('af:idioma', { detail: { idioma: codigo } }));
  if (document.documentElement.dataset.sessao === 'ativa') {
    try {
      await chamarApi('/api/conta', { metodo: 'PATCH', corpo: { idioma: codigo } });
    } catch {
      // falha ao sincronizar preferência da conta; a troca local já ocorreu
    }
  }
}

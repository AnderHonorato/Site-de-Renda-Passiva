/** Favoritos, histórico recente e tema — tudo guardado só neste aparelho. */
import { ler, gravar, apagar } from './armazenamento.js';

const LIMITE_FAVORITOS = 60;
const LIMITE_RECENTES = 12;

/** @returns {string[]} slugs favoritados */
export function lerFavoritos() {
  const lista = ler('favoritos', []);
  return Array.isArray(lista) ? lista.filter((s) => typeof s === 'string').slice(0, LIMITE_FAVORITOS) : [];
}

/**
 * Alterna o favorito de uma ferramenta.
 * @param {string} slug
 * @returns {{favoritado: boolean, limiteAtingido: boolean}}
 */
export function alternarFavorito(slug) {
  const atuais = lerFavoritos();
  const posição = atuais.indexOf(slug);
  if (posição >= 0) {
    atuais.splice(posição, 1);
    gravar('favoritos', atuais);
    return { favoritado: false, limiteAtingido: false };
  }
  if (atuais.length >= LIMITE_FAVORITOS) return { favoritado: false, limiteAtingido: true };
  atuais.unshift(slug);
  gravar('favoritos', atuais);
  return { favoritado: true, limiteAtingido: false };
}

/** @param {string} slug */
export function éFavorito(slug) {
  return lerFavoritos().includes(slug);
}

/** @returns {string[]} slugs abertos recentemente, do mais recente ao mais antigo */
export function lerRecentes() {
  const lista = ler('recentes', []);
  return Array.isArray(lista) ? lista.filter((s) => typeof s === 'string').slice(0, LIMITE_RECENTES) : [];
}

/** @param {string} slug */
export function registrarUso(slug) {
  const atuais = lerRecentes().filter((s) => s !== slug);
  atuais.unshift(slug);
  gravar('recentes', atuais.slice(0, LIMITE_RECENTES));
}

export function limparRecentes() {
  apagar('recentes');
}

/** @returns {'claro'|'escuro'|'sistema'} */
export function lerTema() {
  const tema = ler('tema', 'sistema');
  return ['claro', 'escuro', 'sistema'].includes(tema) ? tema : 'sistema';
}

/**
 * Aplica o tema no documento.
 * @param {'claro'|'escuro'|'sistema'} tema
 */
export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'sistema') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', tema);
  gravar('tema', tema);
}

/** Alterna entre claro e escuro, partindo do que está valendo agora. */
export function alternarTema() {
  const atual = lerTema();
  const escuroAgora = atual === 'escuro'
    || (atual === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  const novo = escuroAgora ? 'claro' : 'escuro';
  aplicarTema(novo);
  return novo;
}

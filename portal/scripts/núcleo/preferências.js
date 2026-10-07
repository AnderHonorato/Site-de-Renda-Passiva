/** Favoritos, histórico recente e tema — tudo guardado só neste aparelho. */
import { ler, gravar, apagar } from './armazenamento.js';
import { api } from './api.js';
import { avisar } from './interface.js';

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
    enviarFavorito(slug, false);
    return { favoritado: false, limiteAtingido: false };
  }
  if (atuais.length >= LIMITE_FAVORITOS) return { favoritado: false, limiteAtingido: true };
  atuais.unshift(slug);
  gravar('favoritos', atuais);
  enviarFavorito(slug, true);
  return { favoritado: true, limiteAtingido: false };
}

const slugValido = (slug) => /^[a-z0-9-]{2,80}$/.test(slug);

async function enviarFavorito(slug, adicionar) {
  if (!slugValido(slug)) return;
  try {
    const { obterSessao } = await import('./sessão.js');
    const sessao = await obterSessao();
    if (!sessao.usuario) return;
    await api(`/api/favoritos/${encodeURIComponent(slug)}`, { metodo: adicionar ? 'PUT' : 'DELETE' });
    const evolucao = await import('./evolução.js');
    void evolucao.conferirConquistas(sessao);
  } catch (erro) {
    if (erro.message === 'limite_favoritos') avisar(document.documentElement.lang === 'en'
      ? 'Account favorite limit reached. Saved on this device.'
      : 'Limite de favoritos da conta atingido. Salvo neste aparelho.');
  }
}

/** Junta os favoritos da conta aos deste aparelho sem apagar os excedentes locais. */
let sincronizacaoPendente;
export function sincronizarFavoritos() {
  if (!sincronizacaoPendente) sincronizacaoPendente = juntarFavoritos().finally(() => { sincronizacaoPendente = undefined; });
  return sincronizacaoPendente;
}

async function juntarFavoritos() {
  const resposta = await api('/api/favoritos');
  const remotos = (resposta.favoritos || []).filter(slugValido);
  const locais = lerFavoritos().filter(slugValido);
  const unidos = [...new Set([...locais, ...remotos])].slice(0, LIMITE_FAVORITOS);
  gravar('favoritos', unidos);
  let excedentesLocais = 0;
  const pendentes = locais.filter((slug) => !remotos.includes(slug));
  for (const [indice, slug] of pendentes.entries()) {
    try { await api(`/api/favoritos/${encodeURIComponent(slug)}`, { metodo: 'PUT' }); }
    catch (erro) {
      if (erro.message === 'limite_favoritos') { excedentesLocais += pendentes.length - indice; break; }
      excedentesLocais += 1;
    }
  }
  return { total: unidos.length, excedentesLocais };
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
  document.dispatchEvent(new CustomEvent('portal:tema-alterado', { detail: { tema } }));
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

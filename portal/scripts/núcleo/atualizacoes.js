/** Feed compartilhado pelo blog e pelo sino; também funciona na publicação estática. */
import { api } from './api.js';
let carregamento;
const CATEGORIAS = new Set(['novo', 'melhoria', 'correcao']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function traducao(valor) {
  if (!valor || typeof valor !== 'object') return null;
  for (const [campo, limite] of [['titulo', 120], ['resumo', 300], ['conteudo', 12000]]) {
    if (typeof valor[campo] !== 'string' || !valor[campo].trim() || valor[campo].length > limite) return null;
  }
  return { titulo: valor.titulo, resumo: valor.resumo, conteudo: valor.conteudo };
}

export function validarFeedAtualizacoes(feed, agora = Date.now()) {
  if (!feed || !Array.isArray(feed.itens)) throw new Error('Feed de atualizações inválido.');
  const ids = new Set(), slugs = new Set(), itens = [];
  for (const item of feed.itens.slice(0, 500)) {
    if (!item || typeof item.id !== 'string' || !SLUG.test(item.id) || item.id.length > 80
      || typeof item.slug !== 'string' || !SLUG.test(item.slug) || item.slug.length > 80
      || ids.has(item.id) || slugs.has(item.slug) || !CATEGORIAS.has(item.categoria)
      || typeof item.versao !== 'string' || item.versao.length > 40
      || (item.estado !== undefined && item.estado !== 'publicado')) continue;
    const publicada = Date.parse(item.publicado_em), atualizada = Date.parse(item.atualizado_em);
    const pt = traducao(item.pt), en = traducao(item.en);
    if (!pt || !Number.isFinite(publicada) || publicada > agora || !Number.isFinite(atualizada)) continue;
    ids.add(item.id); slugs.add(item.slug);
    itens.push({ id: item.id, slug: item.slug, categoria: item.categoria, versao: item.versao,
      publicado_em: new Date(publicada).toISOString(), atualizado_em: new Date(atualizada).toISOString(),
      pt, ...(en ? { en } : {}) });
  }
  itens.sort((a, b) => b.publicado_em.localeCompare(a.publicado_em) || a.id.localeCompare(b.id));
  return { itens };
}

async function carregar() {
  try {
    return validarFeedAtualizacoes(await api('/api/atualizacoes', { prazoMs: 2500 }));
  } catch { /* O portal estático usa o feed publicado junto com as páginas. */ }
  const resposta = await fetch(new URL('../../dados/atualizacoes.json', import.meta.url), {
    credentials: 'same-origin', signal: AbortSignal.timeout(5000),
  });
  if (!resposta.ok) throw new Error('Não foi possível carregar as atualizações.');
  return validarFeedAtualizacoes(await resposta.json());
}

export function carregarAtualizacoes({ atualizar = false } = {}) {
  if (atualizar || !carregamento) {
    carregamento = carregar().catch(erro => { carregamento = undefined; throw erro; });
  }
  return carregamento;
}

import { readFileSync } from 'node:fs';
import { editorial } from '../dados/editorial-publicado.js';

const configuracao = JSON.parse(readFileSync(new URL('./servidor-planos.json', import.meta.url), 'utf8'));
const porId = new Map(configuracao.planos.map((plano) => [plano.id, plano]));
export function aplicarLimitesPublicados(limites = {}) {
  for(const original of configuracao.planos)porId.set(original.id,{...original,...limites[original.id],limites:{...original.limites,...limites[original.id]?.limites}});
}
aplicarLimitesPublicados(editorial.limites);
const SITUACOES = new Set(['em_aberto', 'salvo']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DADOS_MAXIMO_BYTES = 20 * 1024;

export function limitesDoPlano(id = 'gratuito') {
  const plano = porId.get(id) || porId.get('gratuito');
  return Object.freeze({ ...plano.limites });
}

export function planosPublicos() {
  return [...porId.values()].map(({ id, limites, dados_maximo_bytes, armazenamento_maximo_bytes, provisorio = false }) => ({ id, limites: { ...limites }, dados_maximo_bytes, armazenamento_maximo_bytes, provisorio }));
}

export function limiteDadosDoPlano(id = 'gratuito') { return (porId.get(id) || porId.get('gratuito')).dados_maximo_bytes; }
export function limiteArmazenamento(id = 'gratuito') { return (porId.get(id) || porId.get('gratuito')).armazenamento_maximo_bytes; }
export function bytesUsados(db,id) { return Number(db.prepare('SELECT coalesce(sum(length(CAST(dados AS BLOB))),0) total FROM trabalhos WHERE usuario_id=?').get(id).total); }

export function dadosDeTrabalhoValidos(valor, plano = 'gratuito') {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  try {
    const json = JSON.stringify(valor);
    return Buffer.byteLength(json, 'utf8') <= limiteDadosDoPlano(plano);
  } catch {
    return false;
  }
}

export function validarNovoTrabalho({ ferramenta_slug, titulo, dados, situacao = 'salvo' } = {}, plano = 'gratuito') {
  return typeof ferramenta_slug === 'string' && ferramenta_slug.length <= 100 && SLUG.test(ferramenta_slug)
    && typeof titulo === 'string' && titulo.trim().length >= 1 && titulo.trim().length <= 120
    && dadosDeTrabalhoValidos(dados, plano) && SITUACOES.has(situacao);
}

export function validarEdicaoTrabalho({ titulo, dados, situacao } = {}, plano = 'gratuito') {
  if (titulo !== undefined && (typeof titulo !== 'string' || titulo.trim().length < 1 || titulo.trim().length > 120)) return false;
  if (dados !== undefined && !dadosDeTrabalhoValidos(dados, plano)) return false;
  if (situacao !== undefined && !SITUACOES.has(situacao)) return false;
  return titulo !== undefined || dados !== undefined || situacao !== undefined;
}

export function trabalhoPublico(linha, ferramenta, incluirDados = true) {
  return {
    id: linha.id,
    ferramenta_slug: linha.ferramenta_slug,
    ferramenta_nome: ferramenta?.nome || linha.ferramenta_slug,
    titulo: linha.titulo,
    ...(incluirDados ? { dados: JSON.parse(linha.dados) } : {}),
    situacao: linha.situacao,
    criado_em: linha.criado_em,
    atualizado_em: linha.atualizado_em,
  };
}

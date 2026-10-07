import { readFileSync } from 'node:fs';

const configuracao = JSON.parse(readFileSync(new URL('./servidor-planos.json', import.meta.url), 'utf8'));
const porId = new Map(configuracao.planos.map((plano) => [plano.id, plano]));
const SITUACOES = new Set(['em_aberto', 'salvo']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DADOS_MAXIMO_BYTES = 20 * 1024;

export function limitesDoPlano(id = 'gratuito') {
  const plano = porId.get(id) || porId.get('gratuito');
  return Object.freeze({ ...plano.limites });
}

export function planosPublicos() {
  return configuracao.planos.map(({ id, limites, provisorio = false }) => ({ id, limites: { ...limites }, provisorio }));
}

export function dadosDeTrabalhoValidos(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  try {
    const json = JSON.stringify(valor);
    return Buffer.byteLength(json, 'utf8') <= DADOS_MAXIMO_BYTES;
  } catch {
    return false;
  }
}

export function validarNovoTrabalho({ ferramenta_slug, titulo, dados, situacao = 'salvo' } = {}) {
  return typeof ferramenta_slug === 'string' && ferramenta_slug.length <= 100 && SLUG.test(ferramenta_slug)
    && typeof titulo === 'string' && titulo.trim().length >= 1 && titulo.trim().length <= 120
    && dadosDeTrabalhoValidos(dados) && SITUACOES.has(situacao);
}

export function validarEdicaoTrabalho({ titulo, dados, situacao } = {}) {
  if (titulo !== undefined && (typeof titulo !== 'string' || titulo.trim().length < 1 || titulo.trim().length > 120)) return false;
  if (dados !== undefined && !dadosDeTrabalhoValidos(dados)) return false;
  if (situacao !== undefined && !SITUACOES.has(situacao)) return false;
  return titulo !== undefined || dados !== undefined || situacao !== undefined;
}

export function trabalhoPublico(linha, ferramenta) {
  return {
    id: linha.id,
    ferramenta_slug: linha.ferramenta_slug,
    ferramenta_nome: ferramenta?.nome || linha.ferramenta_slug,
    titulo: linha.titulo,
    dados: JSON.parse(linha.dados),
    situacao: linha.situacao,
    criado_em: linha.criado_em,
    atualizado_em: linha.atualizado_em,
  };
}

/**
 * Catálogo único do portal.
 *
 * Esta é a fonte de verdade: a busca, o menu, as páginas geradas, os testes e a
 * matriz em `documentação/catalogo-ferramentas.md` saem todos daqui. Nenhuma
 * ferramenta pode existir na interface sem estar registrada neste catálogo.
 */
import { ferramentas as finanças } from './catálogo/finanças.js';
import { ferramentas as dadosETécnica } from './catálogo/dados-e-técnica.js';
import { ferramentas as conteúdo } from './catálogo/conteúdo.js';
import { ferramentas as trabalhoEOperações } from './catálogo/trabalho-e-operações.js';
import { ferramentas as ofícioEEstudos } from './catálogo/ofício-e-estudos.js';
import { categoriaPorId } from './categorias.js';

const BRUTAS = [
  ...finanças,
  ...dadosETécnica,
  ...conteúdo,
  ...trabalhoEOperações,
  ...ofícioEEstudos,
];

/**
 * Completa os campos derivados de uma entrada do catálogo.
 * @param {object} bruta entrada como escrita no arquivo de categoria
 * @returns {Readonly<object>} ferramenta normalizada
 */
function normalizar(bruta) {
  const categoria = categoriaPorId[bruta.cat];
  if (!categoria) throw new Error(`Categoria desconhecida em ${bruta.id}: ${bruta.cat}`);
  return Object.freeze({
    ...bruta,
    categoriaNome: categoria.nome,
    ícone: bruta.ícone || categoria.ícone,
    exporta: Object.freeze(bruta.exporta ?? []),
    tarefas: Object.freeze(bruta.tarefas ?? []),
    tags: Object.freeze(bruta.tags ?? []),
    intenções: Object.freeze(bruta.intenções ?? []),
    unifica: Object.freeze(bruta.unifica ?? []),
    plano: bruta.plano ?? 'gratuito',
    local: bruta.local !== false,
    // Toda ferramenta do portal é projetada para o celular: não existe exceção.
    móvel: true,
    duplicada: false,
    caminho: `/portal/f/${bruta.slug}/`,
  });
}

/** Todas as ferramentas, em ordem de id. */
export const ferramentas = Object.freeze(
  BRUTAS.map(normalizar).sort((a, b) => a.id.localeCompare(b.id, 'pt-BR')),
);

/** Só as que já abrem, calculam, validam, exportam e têm teste. */
export const ferramentasProntas = Object.freeze(
  ferramentas.filter((f) => f.status === 'pronta'),
);

/** Índice por slug. */
export const ferramentaPorSlug = Object.freeze(
  Object.fromEntries(ferramentas.map((f) => [f.slug, f])),
);

/**
 * Verifica as regras que o catálogo precisa respeitar.
 * Usada pelos testes e pelo script de verificação.
 * @returns {string[]} lista de problemas; vazia quando está tudo certo
 */
export function conferirCatálogo() {
  const problemas = [];
  const vistos = { id: new Set(), slug: new Set(), nome: new Set() };
  const obrigatórios = ['id', 'slug', 'nome', 'cat', 'resumo', 'problema', 'entra', 'processa', 'sai', 'status'];

  for (const f of ferramentas) {
    for (const campo of obrigatórios) {
      if (!f[campo]) problemas.push(`${f.id}: campo obrigatório ausente: ${campo}`);
    }
    for (const chave of /** @type {const} */ (['id', 'slug', 'nome'])) {
      const valor = String(f[chave]).toLowerCase();
      if (vistos[chave].has(valor)) problemas.push(`${f.id}: ${chave} repetido: ${f[chave]}`);
      vistos[chave].add(valor);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) {
      problemas.push(`${f.id}: slug fora do padrão (minúsculas, sem acento, hífens): ${f.slug}`);
    }
    if (!['pronta', 'planejada'].includes(f.status)) {
      problemas.push(`${f.id}: status inválido: ${f.status}`);
    }
    if (f.resumo.length > 130) {
      problemas.push(`${f.id}: resumo longo demais para uma linha (${f.resumo.length} caracteres)`);
    }
  }
  return problemas;
}

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
import { categoriaPorId as categoriaPorIdAtiva, categoriasDoIdioma } from './categorias.js';
import { normalizarIdioma } from './idiomas.js';

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
function normalizar(bruta, categoriaPorId = categoriaPorIdAtiva) {
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
    // Slugs mostrados primeiro em "Ferramentas relacionadas"; o resto é completado pela categoria.
    relacionadas: Object.freeze(bruta.relacionadas ?? []),
    plano: bruta.plano ?? 'gratuito',
    local: bruta.local !== false,
    // Toda ferramenta do portal é projetada para o celular: não existe exceção.
    móvel: true,
    duplicada: false,
    caminho: `/portal/f/${bruta.slug}/`,
  });
}

/**
 * O catálogo num idioma. Em inglês, nome, resumo, palavras de busca e intenções vêm de
 * dados/traduções/en/catálogo.js e o nome da categoria, da tradução das categorias; o resto
 * (ficha, cálculo, exportação) segue em português até a Onda 9. Sem tradução, é o catálogo de sempre.
 * @param {Record<string, {nome: string, resumo: string, tags: string[], intenções: string[]}> | null} traduções
 * @param {{categorias: object, tarefas: object} | null} traduçõesDeCategorias
 */
export function catálogoDoIdioma(traduções = null, traduçõesDeCategorias = null) {
  const { categoriaPorId } = categoriasDoIdioma(traduçõesDeCategorias);
  const todas = BRUTAS.map((bruta) => {
    const t = traduções?.[bruta.id];
    if (traduções && !t) throw new Error(`Sem tradução para ${bruta.id}`);
    return normalizar(t ? { ...bruta, nome: t.nome, resumo: t.resumo, tags: t.tags, intenções: t.intenções } : bruta, categoriaPorId);
  });
  const ferramentas = Object.freeze(todas.sort((a, b) => a.id.localeCompare(b.id, 'pt-BR')));
  return Object.freeze({
    ferramentas,
    ferramentasProntas: Object.freeze(ferramentas.filter((f) => f.status === 'pronta')),
    ferramentaPorSlug: Object.freeze(Object.fromEntries(ferramentas.map((f) => [f.slug, f]))),
  });
}

/** Idioma da página (no navegador, o lang do <html>; no Node, português). */
const idiomaAtivo = normalizarIdioma(typeof document !== 'undefined' ? document.documentElement.lang : '');

/** Só a página em inglês baixa a tradução do catálogo. */
const ATIVO = idiomaAtivo === 'en'
  ? catálogoDoIdioma((await import('./traduções/en/catálogo.js')).default, (await import('./traduções/en/categorias.js')).default)
  : catálogoDoIdioma();

/** Todas as ferramentas, em ordem de id. */
export const ferramentas = ATIVO.ferramentas;

/** Só as que já abrem, calculam, validam, exportam e têm teste. */
export const ferramentasProntas = ATIVO.ferramentasProntas;

/** Índice por slug. */
export const ferramentaPorSlug = ATIVO.ferramentaPorSlug;

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
  // Relação declarada precisa apontar para outra ferramenta que existe.
  const slugs = new Set(ferramentas.map((f) => f.slug));
  for (const f of ferramentas) {
    for (const outra of f.relacionadas) {
      if (outra === f.slug) problemas.push(`${f.id}: relacionada consigo mesma`);
      else if (!slugs.has(outra)) problemas.push(`${f.id}: relacionada desconhecida: ${outra}`);
    }
  }
  return problemas;
}

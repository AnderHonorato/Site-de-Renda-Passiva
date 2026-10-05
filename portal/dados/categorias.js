/**
 * Categorias do portal. Cada uma tem ícone próprio e um verbo de tarefa dominante.
 * A ordem aqui é a ordem mostrada no menu e na página inicial.
 */
import { normalizarIdioma } from './idiomas.js';

const CATEGORIAS_PT = Object.freeze([
  { id: 'dinheiro', nome: 'Dinheiro e preços', ícone: 'dinheiro', resumo: 'Preço, margem, juros, parcelas e divisão de contas.' },
  { id: 'vendas', nome: 'Vendas e propostas', ícone: 'vendas', resumo: 'Orçamento, proposta, comissão e acompanhamento.' },
  { id: 'cálculo', nome: 'Cálculo e conversão', ícone: 'cálculo', resumo: 'Porcentagem, regra de três e unidades de medida.' },
  { id: 'datas', nome: 'Datas e horas', ícone: 'datas', resumo: 'Diferenças, prazos, dias úteis e carga horária.' },
  { id: 'texto', nome: 'Texto', ícone: 'texto', resumo: 'Contar, limpar, padronizar, comparar e transformar.' },
  { id: 'pdf', nome: 'PDF', ícone: 'documento', resumo: 'Juntar, dividir, comprimir, converter, proteger e assinar arquivos PDF.' },
  { id: 'documentos', nome: 'Documentos', ícone: 'documento', resumo: 'Gerar, converter e organizar declarações, contratos, currículos e outros documentos.' },
  { id: 'planilhas', nome: 'Planilhas e dados', ícone: 'planilha', resumo: 'Limpar, comparar, converter e analisar tabelas.' },
  { id: 'imagens', nome: 'Imagens, áudio e vídeo', ícone: 'imagem', resumo: 'Redimensionar, converter, comprimir, cortar e transcrever imagens, áudio e vídeo.' },
  { id: 'desenvolvimento', nome: 'Desenvolvimento', ícone: 'código', resumo: 'JSON, códigos, conversores e utilitários técnicos.' },
  { id: 'segurança', nome: 'Senhas e segurança', ícone: 'chave', resumo: 'Gerar segredos, validar documentos e conferir dados.' },
  { id: 'trabalho', nome: 'RH e trabalho', ícone: 'pessoas', resumo: 'Jornada, férias, currículo, escala e avaliação.' },
  { id: 'operações', nome: 'Estoque e logística', ícone: 'caixa', resumo: 'Estoque, reposição, frete, cubagem e conferência.' },
  { id: 'marketing', nome: 'Marketing', ícone: 'alvo', resumo: 'Campanha, métricas, UTM e materiais de conteúdo.' },
  { id: 'produtividade', nome: 'Produtividade', ícone: 'lista', resumo: 'Tarefas, reuniões, planejamento e acompanhamento.' },
  { id: 'estudos', nome: 'Estudos', ícone: 'livro', resumo: 'Atividades, treino, revisão e material para imprimir.' },
  { id: 'ofício', nome: 'Ofício, casa e obra', ícone: 'martelo', resumo: 'Produção artesanal, reforma, festas e embalagens.' },
]);

/**
 * Tipos de tarefa usados como filtro transversal ("o que você quer fazer").
 */
const TAREFAS_PT = Object.freeze([
  { id: 'calcular', nome: 'Calcular' },
  { id: 'converter', nome: 'Converter' },
  { id: 'criar', nome: 'Criar' },
  { id: 'organizar', nome: 'Organizar' },
  { id: 'comparar', nome: 'Comparar' },
  { id: 'validar', nome: 'Validar' },
  { id: 'analisar', nome: 'Analisar' },
  { id: 'exportar', nome: 'Exportar' },
]);

/**
 * Categorias e tarefas num idioma. Sem tradução (português), devolve os originais; com a tradução
 * de dados/traduções/en/categorias.js, troca só nome e resumo e mantém ids, ícones e ordem.
 * @param {{categorias: Record<string, {nome: string, resumo: string}>, tarefas: Record<string, string>} | null} traduções
 */
export function categoriasDoIdioma(traduções = null) {
  const categorias = traduções
    ? Object.freeze(CATEGORIAS_PT.map((c) => Object.freeze({ ...c, ...traduções.categorias[c.id] })))
    : CATEGORIAS_PT;
  const tarefas = traduções
    ? Object.freeze(TAREFAS_PT.map((t) => Object.freeze({ ...t, nome: traduções.tarefas[t.id] })))
    : TAREFAS_PT;
  const categoriaPorId = Object.freeze(Object.fromEntries(categorias.map((c) => [c.id, c])));
  return Object.freeze({ categorias, categoriaPorId, tarefas });
}

/** Idioma da página (no navegador, o lang do <html>; no Node, português). */
const idiomaAtivo = normalizarIdioma(typeof document !== 'undefined' ? document.documentElement.lang : '');

/** Só a página em inglês baixa a tradução; a em português não carrega uma linha de inglês. */
const ATIVAS = categoriasDoIdioma(idiomaAtivo === 'en' ? (await import('./traduções/en/categorias.js')).default : null);

export const categorias = ATIVAS.categorias;

/** Índice por id, para consultas rápidas. */
export const categoriaPorId = ATIVAS.categoriaPorId;

export const tarefas = ATIVAS.tarefas;

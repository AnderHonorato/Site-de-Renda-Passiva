import { especificacoes } from '../profissionais.js';

/** Lote novo: a lista completa compartilha entradas/saídas; cada motor tem sua própria regra. */
export const ferramentas = especificacoes.map(s => ({
  id: s.id, slug: s.slug, nome: s.nome, cat: s.cat, plano: s.plano,
  status: 'pronta', local: false, tarefas: ['analisar', 'exportar'],
  resumo: s.resumo, problema: s.problema,
  entra: s.entrada === 'documento'
    ? 'Texto editável ou upload TXT, Markdown, PDF com texto selecionável ou DOCX; até 1 MB após extração.'
    : 'Tabela editável ou upload CSV, TSV, JSON ou XLSX; até 2.000 registros e 1 MB após conversão.',
  processa: s.processa, sai: s.sai,
  exporta: ['pdf', 'xlsx', 'csv', 'json', 'txt'],
  tags: [s.nome, 'análise profissional', s.plano, 'upload', 'relatório', s.dominio],
  intenções: [s.problema],
}));

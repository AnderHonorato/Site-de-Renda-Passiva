/**
 * Categorias do portal. Cada uma tem ícone próprio e um verbo de tarefa dominante.
 * A ordem aqui é a ordem mostrada no menu e na página inicial.
 */
export const categorias = Object.freeze([
  { id: 'dinheiro', nome: 'Dinheiro e preços', ícone: 'dinheiro', resumo: 'Preço, margem, juros, parcelas e divisão de contas.' },
  { id: 'vendas', nome: 'Vendas e propostas', ícone: 'vendas', resumo: 'Orçamento, proposta, comissão e acompanhamento.' },
  { id: 'cálculo', nome: 'Cálculo e conversão', ícone: 'cálculo', resumo: 'Porcentagem, regra de três e unidades de medida.' },
  { id: 'datas', nome: 'Datas e horas', ícone: 'datas', resumo: 'Diferenças, prazos, dias úteis e carga horária.' },
  { id: 'texto', nome: 'Texto', ícone: 'texto', resumo: 'Contar, limpar, padronizar, comparar e transformar.' },
  { id: 'documentos', nome: 'Documentos e PDF', ícone: 'documento', resumo: 'Gerar, converter, organizar e assinar documentos.' },
  { id: 'planilhas', nome: 'Planilhas e dados', ícone: 'planilha', resumo: 'Limpar, comparar, converter e analisar tabelas.' },
  { id: 'imagens', nome: 'Imagens', ícone: 'imagem', resumo: 'Redimensionar, converter, comprimir e inspecionar.' },
  { id: 'desenvolvimento', nome: 'Desenvolvimento', ícone: 'código', resumo: 'JSON, códigos, conversores e utilitários técnicos.' },
  { id: 'segurança', nome: 'Senhas e segurança', ícone: 'chave', resumo: 'Gerar segredos, validar documentos e conferir dados.' },
  { id: 'trabalho', nome: 'RH e trabalho', ícone: 'pessoas', resumo: 'Jornada, férias, currículo, escala e avaliação.' },
  { id: 'operações', nome: 'Estoque e logística', ícone: 'caixa', resumo: 'Estoque, reposição, frete, cubagem e conferência.' },
  { id: 'marketing', nome: 'Marketing', ícone: 'alvo', resumo: 'Campanha, métricas, UTM e materiais de conteúdo.' },
  { id: 'produtividade', nome: 'Produtividade', ícone: 'lista', resumo: 'Tarefas, reuniões, planejamento e acompanhamento.' },
  { id: 'estudos', nome: 'Estudos', ícone: 'livro', resumo: 'Atividades, treino, revisão e material para imprimir.' },
  { id: 'ofício', nome: 'Ofício, casa e obra', ícone: 'martelo', resumo: 'Produção artesanal, reforma, festas e embalagens.' },
]);

/** Índice por id, para consultas rápidas. */
export const categoriaPorId = Object.freeze(
  Object.fromEntries(categorias.map((c) => [c.id, c])),
);

/**
 * Tipos de tarefa usados como filtro transversal ("o que você quer fazer").
 */
export const tarefas = Object.freeze([
  { id: 'calcular', nome: 'Calcular' },
  { id: 'converter', nome: 'Converter' },
  { id: 'criar', nome: 'Criar' },
  { id: 'organizar', nome: 'Organizar' },
  { id: 'comparar', nome: 'Comparar' },
  { id: 'validar', nome: 'Validar' },
  { id: 'analisar', nome: 'Analisar' },
  { id: 'exportar', nome: 'Exportar' },
]);

/**
 * Identidade do site: o único lugar onde o nome aparece escrito.
 *
 * O nome é global e provisório (decisão 24). Cabeçalho, rodapé, títulos das páginas,
 * manifesto, documentos em PDF, planilhas e a vitrine animada leem daqui. Para trocar
 * o nome, mude `destaque` e `complemento` e rode `npm run gerar`.
 *
 * O módulo não importa nada e não toca em `window`, então roda no navegador, no Node
 * e nos testes.
 */
const destaque = 'Ferramentas';
const complemento = 'do Ander';

export const site = Object.freeze({
  /** Primeira linha da marca (cabeçalho, rodapé e assinatura da vitrine). */
  destaque,
  /** Segunda linha da marca. */
  complemento,
  /** Nome completo, para títulos de página, manifesto e documentos. */
  nome: `${destaque} ${complemento}`,
  /** Nome curto, para o ícone na tela inicial do celular. */
  nomeCurto: destaque,
  /** Quem assina o site. Vai no rodapé e nas propriedades de PDF e planilha. */
  autor: 'Anderson',
  /** Assinatura curta da animação de abertura, por idioma. */
  assinatura: Object.freeze({ 'pt-BR': 'por Ander', en: 'by Ander' }),
  /** Frase do cabeçalho de documentos gerados. */
  descrição: 'Ferramentas para calcular, criar e organizar, direto no navegador.',
});

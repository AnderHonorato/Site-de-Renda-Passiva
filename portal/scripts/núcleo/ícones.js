/**
 * Conjunto de ícones próprio do portal.
 *
 * Gramática única: grade 24×24, traço 1.75, pontas e junções arredondadas,
 * sem preenchimento, cantos com raio 2, formas construídas em múltiplos de 1.5.
 * Nenhum ícone vem de biblioteca de terceiros e nenhum emoji é usado como ícone.
 */

const FORMAS = {
  // Marca e navegação
  marca: '<path d="M12 3.5 5 7v5.2c0 4.2 2.9 7.3 7 8.3 4.1-1 7-4.1 7-8.3V7l-7-3.5Z"/><path d="M9.2 12.1l2 2.1 3.6-4"/>',
  início: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.8V19a1 1 0 0 0 1 1h3.5v-4.5h3V20H17a1 1 0 0 0 1-1V9.8"/>',
  grade: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  busca: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/>',
  mais: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  fechar: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
  seta: '<path d="M5 12h13"/><path d="m12.5 6.5 6 5.5-6 5.5"/>',
  'seta-diagonal': '<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
  'seta-baixo': '<path d="M12 5v13"/><path d="m6.5 12.5 5.5 5.5 5.5-5.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  'chevron-baixo': '<path d="m6 9.5 6 6 6-6"/>',
  voltar: '<path d="M19 12H6"/><path d="m11.5 6.5-5.5 5.5 5.5 5.5"/>',

  // Estados
  marcador: '<path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-3.8L5.5 20V5.5a1 1 0 0 1 1-1Z"/>',
  estrela: '<path d="m12 4 2.5 5.1 5.5.8-4 3.9.9 5.6-4.9-2.6-4.9 2.6.9-5.6-4-3.9 5.5-.8L12 4Z"/>',
  relógio: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 1.8"/>',
  confere: '<path d="m5.5 12.5 4.2 4.2L18.5 8"/>',
  'confere-círculo': '<circle cx="12" cy="12" r="8"/><path d="m8.4 12.2 2.6 2.6 4.6-5"/>',
  alerta: '<path d="M12 4.5 3.8 19a1 1 0 0 0 .9 1.5h14.6a1 1 0 0 0 .9-1.5L12 4.5Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  escudo: '<path d="M12 3.5 5 6.5v5.7c0 4.1 2.9 7.2 7 8.3 4.1-1.1 7-4.2 7-8.3V6.5l-7-3Z"/>',
  cadeado: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',

  // Ações
  copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 5.5h-9a2 2 0 0 0-2 2v9"/>',
  baixar: '<path d="M12 4v10"/><path d="m7.5 10 4.5 4 4.5-4"/><path d="M4.5 17v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V17"/>',
  imprimir: '<path d="M7 9V4.5h10V9"/><rect x="3.5" y="9" width="17" height="7" rx="2"/><path d="M7 14h10v5.5H7V14Z"/>',
  compartilhar: '<circle cx="17.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="m8.8 10.8 6.4-3.1"/><path d="m8.8 13.2 6.4 3.1"/>',
  lixeira: '<path d="M4.5 7h15"/><path d="M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7"/><path d="M6.5 7v12a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V7"/>',
  atualizar: '<path d="M19 11a7 7 0 1 0-1.6 5.4"/><path d="M19.5 5.5V11H14"/>',
  ajuda: '<circle cx="12" cy="12" r="8"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.1 2.6c-.6.2-.8.7-.8 1.3v.4"/><path d="M12 17h.01"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6 17 7M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"/>',
  lua: '<path d="M19.5 13.8A7.7 7.7 0 0 1 10.2 4.5a7.8 7.8 0 1 0 9.3 9.3Z"/>',

  // Categorias
  dinheiro: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.5 0-2.5.8-2.5 2s1 1.8 2.5 2 2.5.6 2.5 2-1 2-2.5 2c-1.1 0-2-.5-2.5-1.3"/><path d="M12 6.3v1.7M12 16v1.7"/>',
  cálculo: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 7.5h7"/><path d="M8.7 12h.01M12 12h.01M15.3 12h.01M8.7 16h.01M12 16h.01M15.3 16h.01"/>',
  datas: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3.5v4M16 3.5v4"/>',
  texto: '<path d="M5 6.5V5h14v1.5"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  documento: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8l-4.5-4.5Z"/><path d="M14 3.5V8h4.5"/><path d="M9 13h6M9 16.5h4"/>',
  planilha: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15M15 4.5v15"/>',
  imagem: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.8" cy="9.5" r="1.6"/><path d="m4.5 17 4.3-4.3 3.4 3.4 3-3 4.3 4.3"/>',
  código: '<path d="m8.5 8-4 4 4 4"/><path d="m15.5 8 4 4-4 4"/><path d="m13.5 5.5-3 13"/>',
  chave: '<circle cx="8" cy="12" r="4"/><path d="M12 12h8"/><path d="M17 12v3M20 12v2.2"/>',
  vendas: '<path d="M3.5 6.5h2.3l2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.4a1.5 1.5 0 0 0 1.5-1.2l1.3-6.4H6.3"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
  pessoas: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.8a3 3 0 0 1 0 5.6"/><path d="M17.5 14.8a5.5 5.5 0 0 1 3 4.7"/>',
  caixa: '<path d="M12 3.5 4 7.5v9l8 4 8-4v-9l-8-4Z"/><path d="m4 7.5 8 4 8-4"/><path d="M12 11.5v9"/>',
  alvo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  lista: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  livro: '<path d="M4.5 5a1.5 1.5 0 0 1 1.5-1.5h5V20H6a1.5 1.5 0 0 1-1.5-1.5V5Z"/><path d="M19.5 5A1.5 1.5 0 0 0 18 3.5h-5V20h5a1.5 1.5 0 0 0 1.5-1.5V5Z"/>',
  martelo: '<path d="m14.5 6.5 3 3"/><path d="M10.5 10.5 4.8 16.2a2 2 0 0 0 2.8 2.8l5.7-5.7"/><path d="M12.6 4.4a2 2 0 0 1 2.8 0l4.2 4.2a2 2 0 0 1 0 2.8l-1.4 1.4-7-7 1.4-1.4Z"/>',
  régua: '<rect x="2.5" y="8.5" width="19" height="7" rx="2"/><path d="M7 8.5v3M11 8.5v4M15 8.5v3M19 8.5v4"/>',
  pasta: '<path d="M3.5 7a2 2 0 0 1 2-2h3.3l2 2.5h7.7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"/>',
  balão: '<path d="M20 11.5c0 3.9-3.6 7-8 7a9 9 0 0 1-2.4-.3L4.5 20l1.3-3.8A6.6 6.6 0 0 1 4 11.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z"/>',
  coração: '<path d="M12 19.5c-.4 0-.8-.1-1.1-.4l-5.7-5A4.8 4.8 0 0 1 12 7.4a4.8 4.8 0 0 1 6.8 6.7l-5.7 5c-.3.3-.7.4-1.1.4Z"/>',
  filtro: '<path d="M4 5.5h16l-6 7v6l-4 2v-8l-6-7Z"/>',
  gráfico: '<path d="M4.5 19.5h15"/><rect x="6" y="11" width="3.2" height="6"/><rect x="11.4" y="7" width="3.2" height="10"/><rect x="16.8" y="13.5" width="3.2" height="3.5"/>',
};

/** Nomes disponíveis, para verificação automática. */
export const nomesDeÍcone = Object.freeze(Object.keys(FORMAS));

/**
 * Devolve o SVG de um ícone como texto, já com as propriedades da gramática.
 * @param {string} nome nome do ícone
 * @param {{tamanho?: number, classe?: string}} [opções]
 * @returns {string} markup SVG pronto para inserir
 */
export function ícone(nome, opções = {}) {
  const formas = FORMAS[nome];
  if (!formas) throw new Error(`Ícone desconhecido: ${nome}`);
  const tamanho = opções.tamanho ?? 24;
  const classe = opções.classe ? ` class="${opções.classe}"` : '';
  return `<svg${classe} width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none"`
    + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
    + ` aria-hidden="true" focusable="false">${formas}</svg>`;
}

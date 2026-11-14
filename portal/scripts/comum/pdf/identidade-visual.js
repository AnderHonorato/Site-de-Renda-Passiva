/** Cores de documentos em harmonia com a identidade do portal. */
export const paletaPDF = Object.freeze({
  fundo: '#f6f2ec',
  papel: '#fffdf9',
  tinta: '#292521',
  suave: '#716960',
  borda: '#e6ddd2',
  marca: '#a8472a',
  marcaFraca: '#f5e5dc',
  ok: '#426c55',
});

/** Aceita somente cores hexadecimais CSS de seis dígitos. */
export function normalizarCorPdf(cor, padrão = paletaPDF.tinta) {
  const valor = typeof cor === 'string' ? cor.trim() : '';
  if (/^#[\da-f]{6}$/i.test(valor)) return valor.toLowerCase();
  return /^#[\da-f]{6}$/i.test(padrão) ? padrão.toLowerCase() : paletaPDF.tinta;
}

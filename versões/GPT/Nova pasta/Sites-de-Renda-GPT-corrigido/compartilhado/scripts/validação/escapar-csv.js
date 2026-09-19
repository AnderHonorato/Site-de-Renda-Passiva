// Prepara um valor para uma célula CSV. Neutraliza fórmulas (= + - @ tabulação e
// retorno no início) para que a planilha não execute o conteúdo, e aplica aspas.
export function escaparCsv(valor, separador = ';') {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  const precisaDeAspas = texto.includes(separador) || /["\r\n]/.test(texto) || texto.startsWith("'");
  return precisaDeAspas ? `"${texto.replace(/"/g, '""')}"` : texto;
}

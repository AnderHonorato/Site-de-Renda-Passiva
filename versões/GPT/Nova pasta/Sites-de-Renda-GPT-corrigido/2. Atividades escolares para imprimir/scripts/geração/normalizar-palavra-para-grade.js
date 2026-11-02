// Normaliza uma palavra para entrar na grade do caça-palavras: maiúsculas, sem
// espaços/pontuação, e — no modo "remover" — sem acentos nem cedilha, para que a
// grade, a lista exibida e o gabarito usem exatamente as mesmas letras.
export function normalizarPalavraParaGrade(palavra, modoDeAcentos = 'manter') {
  const apenasLetras = String(palavra ?? '')
    .trim()
    .toLocaleUpperCase('pt-BR')
    .replace(/[^\p{L}]/gu, '');
  if (modoDeAcentos === 'remover') {
    return apenasLetras.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  return apenasLetras;
}

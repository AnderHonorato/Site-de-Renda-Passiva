// Converte reais em centavos inteiros com o modo de arredondamento escolhido.
// A tolerância evita erros de ponto flutuante, como 1,005 virar 100 centavos
// ou 2,29 virar 230 ao arredondar para cima.
export function arredondarParaCentavos(valorEmReais, modo = 'próximo') {
  if (!Number.isFinite(valorEmReais)) throw new RangeError('Valor inválido para arredondamento.');
  const centavos = valorEmReais * 100;
  const tolerância = 1e-9 * Math.max(1, Math.abs(centavos));
  let resultado;
  if (modo === 'acima') resultado = Math.ceil(centavos - tolerância);
  else if (modo === 'abaixo') resultado = Math.floor(centavos + tolerância);
  else if (modo === 'próximo') resultado = Math.sign(centavos) * Math.round(Math.abs(centavos) + tolerância);
  else throw new RangeError(`Modo de arredondamento desconhecido: ${modo}`);
  return resultado === 0 ? 0 : resultado;
}

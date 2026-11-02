/** Escrita de números por extenso em português do Brasil. */

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ESCALAS = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
  ['trilhão', 'trilhões'],
];

/** Escreve um grupo de até três dígitos. */
function grupo(n) {
  if (n === 100) return 'cem';
  const partes = [];
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  if (centena > 0) partes.push(CENTENAS[centena]);
  if (resto >= 20) {
    const dezena = Math.floor(resto / 10);
    const unidade = resto % 10;
    partes.push(unidade === 0 ? DEZENAS[dezena] : `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`);
  } else if (resto >= 10) {
    partes.push(DEZ_A_DEZENOVE[resto - 10]);
  } else if (resto > 0) {
    partes.push(UNIDADES[resto]);
  }
  return partes.join(' e ');
}

/**
 * Escreve um número inteiro por extenso.
 * @param {number} valor inteiro de 0 a 999.999.999.999.999
 * @returns {string}
 */
export function inteiroPorExtenso(valor) {
  if (!Number.isInteger(valor)) throw new Error('Informe um número inteiro.');
  if (valor < 0) return `menos ${inteiroPorExtenso(-valor)}`;
  if (valor === 0) return 'zero';
  if (valor > 999999999999999) throw new Error('Número grande demais para escrever por extenso.');

  // Quebra em grupos de três, do mais significativo para o menos.
  const grupos = [];
  let restante = valor;
  while (restante > 0) {
    grupos.unshift(restante % 1000);
    restante = Math.floor(restante / 1000);
  }

  const partes = [];
  grupos.forEach((número, índice) => {
    if (número === 0) return;
    const escala = grupos.length - 1 - índice;
    if (escala === 1) {
      // "mil" não leva "um" na frente: 1000 é "mil", não "um mil".
      partes.push(número === 1 ? 'mil' : `${grupo(número)} mil`);
    } else if (escala === 0) {
      partes.push(grupo(número));
    } else {
      const [singular, plural] = ESCALAS[escala];
      partes.push(`${grupo(número)} ${número === 1 ? singular : plural}`);
    }
  });

  // "e" antes do último grupo quando ele é menor que cem ou múltiplo de cem.
  const último = grupos[grupos.length - 1];
  if (partes.length > 1 && último > 0 && (último < 100 || último % 100 === 0)) {
    return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
  }
  return partes.join(', ');
}

/**
 * Escreve um valor em reais por extenso a partir de centavos inteiros.
 * @param {number} centavos
 * @returns {string}
 */
export function reaisPorExtenso(centavos) {
  if (!Number.isSafeInteger(centavos)) throw new Error('Os centavos precisam ser inteiros.');
  if (centavos < 0) return `menos ${reaisPorExtenso(-centavos)}`;

  const reais = Math.floor(centavos / 100);
  const resto = centavos % 100;
  const partes = [];

  if (reais > 0) partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (resto > 0) partes.push(`${inteiroPorExtenso(resto)} ${resto === 1 ? 'centavo' : 'centavos'}`);
  if (partes.length === 0) return 'zero real';
  return partes.join(' e ');
}

/** Conversão de unidades e proporções. */

/**
 * Tabela de conversão: cada unidade guarda quanto vale na unidade base da grandeza.
 * Temperatura não entra aqui porque não é proporcional — tem função própria.
 */
export const GRANDEZAS = Object.freeze({
  comprimento: {
    nome: 'Comprimento', base: 'm',
    unidades: {
      mm: { nome: 'milímetro', fator: 0.001 },
      cm: { nome: 'centímetro', fator: 0.01 },
      m: { nome: 'metro', fator: 1 },
      km: { nome: 'quilômetro', fator: 1000 },
      pol: { nome: 'polegada', fator: 0.0254 },
      pé: { nome: 'pé', fator: 0.3048 },
      jd: { nome: 'jarda', fator: 0.9144 },
      mi: { nome: 'milha', fator: 1609.344 },
    },
  },
  massa: {
    nome: 'Massa', base: 'kg',
    unidades: {
      mg: { nome: 'miligrama', fator: 0.000001 },
      g: { nome: 'grama', fator: 0.001 },
      kg: { nome: 'quilograma', fator: 1 },
      t: { nome: 'tonelada', fator: 1000 },
      oz: { nome: 'onça', fator: 0.028349523125 },
      lb: { nome: 'libra', fator: 0.45359237 },
      arroba: { nome: 'arroba', fator: 15 },
    },
  },
  volume: {
    nome: 'Volume', base: 'L',
    unidades: {
      ml: { nome: 'mililitro', fator: 0.001 },
      L: { nome: 'litro', fator: 1 },
      m3: { nome: 'metro cúbico', fator: 1000 },
      xíc: { nome: 'xícara (240 ml)', fator: 0.24 },
      colherSopa: { nome: 'colher de sopa (15 ml)', fator: 0.015 },
      colherChá: { nome: 'colher de chá (5 ml)', fator: 0.005 },
      gal: { nome: 'galão americano', fator: 3.785411784 },
    },
  },
  área: {
    nome: 'Área', base: 'm²',
    unidades: {
      cm2: { nome: 'centímetro quadrado', fator: 0.0001 },
      m2: { nome: 'metro quadrado', fator: 1 },
      km2: { nome: 'quilômetro quadrado', fator: 1000000 },
      ha: { nome: 'hectare', fator: 10000 },
      alqueire: { nome: 'alqueire paulista', fator: 24200 },
      pé2: { nome: 'pé quadrado', fator: 0.09290304 },
    },
  },
  tempo: {
    nome: 'Tempo', base: 's',
    unidades: {
      s: { nome: 'segundo', fator: 1 },
      min: { nome: 'minuto', fator: 60 },
      h: { nome: 'hora', fator: 3600 },
      d: { nome: 'dia', fator: 86400 },
      sem: { nome: 'semana', fator: 604800 },
    },
  },
  velocidade: {
    nome: 'Velocidade', base: 'm/s',
    unidades: {
      'm/s': { nome: 'metro por segundo', fator: 1 },
      'km/h': { nome: 'quilômetro por hora', fator: 1 / 3.6 },
      'mph': { nome: 'milha por hora', fator: 0.44704 },
      'nó': { nome: 'nó', fator: 0.514444 },
    },
  },
  dados: {
    nome: 'Dados digitais', base: 'byte',
    unidades: {
      B: { nome: 'byte', fator: 1 },
      KB: { nome: 'kilobyte (1000 B)', fator: 1000 },
      KiB: { nome: 'kibibyte (1024 B)', fator: 1024 },
      MB: { nome: 'megabyte', fator: 1000 ** 2 },
      MiB: { nome: 'mebibyte', fator: 1024 ** 2 },
      GB: { nome: 'gigabyte', fator: 1000 ** 3 },
      GiB: { nome: 'gibibyte', fator: 1024 ** 3 },
      TB: { nome: 'terabyte', fator: 1000 ** 4 },
    },
  },
});

/** Temperatura tem deslocamento além do fator, então converte via Celsius. */
const TEMPERATURAS = {
  C: { nome: 'Celsius', paraC: (v) => v, deC: (v) => v },
  F: { nome: 'Fahrenheit', paraC: (v) => (v - 32) * (5 / 9), deC: (v) => v * (9 / 5) + 32 },
  K: { nome: 'Kelvin', paraC: (v) => v - 273.15, deC: (v) => v + 273.15 },
};

export const UNIDADES_DE_TEMPERATURA = Object.freeze(TEMPERATURAS);

/**
 * Converte um valor entre unidades da mesma grandeza.
 * @param {number} valor
 * @param {string} grandeza chave de GRANDEZAS ou 'temperatura'
 * @param {string} de
 * @param {string} para
 * @returns {number}
 */
export function converter(valor, grandeza, de, para) {
  if (!Number.isFinite(valor)) throw new Error('Informe um número válido.');

  if (grandeza === 'temperatura') {
    const origem = TEMPERATURAS[de];
    const destino = TEMPERATURAS[para];
    if (!origem || !destino) throw new Error('Unidade de temperatura desconhecida.');
    const emCelsius = origem.paraC(valor);
    if (emCelsius < -273.15 - 1e-9) throw new Error('Abaixo do zero absoluto: temperatura impossível.');
    return destino.deC(emCelsius);
  }

  const tabela = GRANDEZAS[grandeza];
  if (!tabela) throw new Error(`Grandeza desconhecida: ${grandeza}`);
  const origem = tabela.unidades[de];
  const destino = tabela.unidades[para];
  if (!origem || !destino) throw new Error('Unidade desconhecida para esta grandeza.');
  return (valor * origem.fator) / destino.fator;
}

/**
 * Regra de três.
 * @param {number} a se a está para b
 * @param {number} b
 * @param {number} c assim como c está para x
 * @param {{inversa?: boolean}} [opções]
 * @returns {{x: number, fórmula: string}}
 */
export function regraDeTrês(a, b, c, { inversa = false } = {}) {
  if (![a, b, c].every(Number.isFinite)) throw new Error('Informe os três valores.');
  if (a === 0) throw new Error('O primeiro valor não pode ser zero.');
  if (inversa) {
    // Na proporção inversa o divisor é C, e dividir por zero não tem resultado.
    if (c === 0) throw new Error('Na proporção inversa, o terceiro valor não pode ser zero.');
    return { x: (a * b) / c, fórmula: `x = (${a} × ${b}) ÷ ${c}` };
  }
  return { x: (b * c) / a, fórmula: `x = (${b} × ${c}) ÷ ${a}` };
}

// Gera as rampas de cor (100–900) de cada produto em OKLCH, com a mesma escala de
// luminosidade perceptual para todas as funções, e verifica contraste WCAG.

const LUMINOSIDADES = { 100: 0.97, 200: 0.93, 300: 0.87, 400: 0.79, 500: 0.7, 600: 0.6, 700: 0.5, 800: 0.41, 900: 0.32 };
const CROMA_RELATIVO = { 100: 0.2, 200: 0.34, 300: 0.55, 400: 0.8, 500: 0.95, 600: 1, 700: 0.95, 800: 0.82, 900: 0.66 };

function hexadecimalParaRgb(hexadecimal) {
  const valor = parseInt(hexadecimal.slice(1), 16);
  return [((valor >> 16) & 255) / 255, ((valor >> 8) & 255) / 255, (valor & 255) / 255];
}

const paraLinear = (canal) => (canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
const paraGama = (canal) => (canal <= 0.0031308 ? 12.92 * canal : 1.055 * canal ** (1 / 2.4) - 0.055);

function rgbParaOklch(rgb) {
  const [r, g, b] = rgb.map(paraLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(a, bb), h: Math.atan2(bb, a) };
}

function oklchParaRgbLinear({ L, C, h }) {
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const dentroDoGamute = (linear) => linear.every((canal) => canal >= -1e-5 && canal <= 1 + 1e-5);

function oklchParaHexadecimal(cor) {
  let croma = cor.C;
  let linear = oklchParaRgbLinear({ ...cor, C: croma });
  let mínimo = 0;
  let máximo = croma;
  if (!dentroDoGamute(linear)) {
    for (let passo = 0; passo < 30; passo += 1) {
      croma = (mínimo + máximo) / 2;
      if (dentroDoGamute(oklchParaRgbLinear({ ...cor, C: croma }))) mínimo = croma;
      else máximo = croma;
    }
    croma = mínimo;
    linear = oklchParaRgbLinear({ ...cor, C: croma });
  }
  return `#${linear
    .map((canal) => Math.round(Math.min(1, Math.max(0, paraGama(Math.min(1, Math.max(0, canal))))) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function luminânciaRelativa(hexadecimal) {
  const [r, g, b] = hexadecimalParaRgb(hexadecimal).map(paraLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(corA, corB) {
  const [clara, escura] = [luminânciaRelativa(corA), luminânciaRelativa(corB)].sort((x, y) => y - x);
  return (clara + 0.05) / (escura + 0.05);
}

export function gerarRampa(hexadecimal, cromaMáximo = Infinity) {
  const base = rgbParaOklch(hexadecimalParaRgb(hexadecimal));
  const croma = Math.min(base.C, cromaMáximo);
  const rampa = {};
  for (const [passo, L] of Object.entries(LUMINOSIDADES)) {
    rampa[passo] = oklchParaHexadecimal({ L, C: croma * CROMA_RELATIVO[passo], h: base.h });
  }
  return rampa;
}

export function ajustarLuminosidade(hexadecimal, deslocamento, fatorDeCroma = 1) {
  const cor = rgbParaOklch(hexadecimalParaRgb(hexadecimal));
  return oklchParaHexadecimal({ L: Math.min(0.995, Math.max(0, cor.L + deslocamento)), C: cor.C * fatorDeCroma, h: cor.h });
}

// Escolhe o primeiro passo da rampa (do mais claro ao mais escuro) que atinge o contraste mínimo.
export function escolherPassoComContraste(rampa, passos, fundos, mínimo = 4.5) {
  for (const passo of passos) {
    if (fundos.every((fundo) => contraste(rampa[passo], fundo) >= mínimo)) return passo;
  }
  return passos.at(-1);
}

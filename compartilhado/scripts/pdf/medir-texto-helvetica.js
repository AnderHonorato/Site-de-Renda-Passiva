// Mede a largura de um texto nas fontes padrão Helvetica e Helvetica-Bold do PDF,
// em pontos. Larguras das métricas AFM (unidades por 1000). Letras acentuadas usam
// a largura da letra base. Caracteres raros usam uma largura média.

const REGULAR = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333,
  '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584,
  '>': 584, '?': 556, '@': 1015, '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333, '{': 334,
  '|': 260, '}': 334, '~': 584, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722,
  V: 667, W: 944, X: 667, Y: 667, Z: 611, a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556,
  h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500,
  t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500, '°': 400, 'º': 365, 'ª': 370, '×': 584,
  '÷': 584, '€': 556, '–': 556, '—': 1000, '“': 333, '”': 333, '‘': 222, '’': 222, '•': 350, '…': 1000,
  '²': 333, '³': 333, '½': 834, '¼': 834, '«': 556, '»': 556, 'ß': 611, '¿': 611, '¡': 333,
};

const NEGRITO = {
  ' ': 278, '!': 333, '"': 474, '%': 889, '&': 722, '(': 333, ')': 333, '+': 584, ',': 278, '-': 333,
  '.': 278, '/': 278, ':': 333, ';': 333, '=': 584, '?': 611, '@': 975, A: 722, B: 722, C: 722, D: 722,
  E: 667, F: 611, G: 778, H: 722, I: 278, J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778,
  R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, a: 556, b: 611, c: 556,
  d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278, m: 889, n: 611, o: 611,
  p: 611, q: 611, r: 389, s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500, '×': 584,
};

function larguraDoCaractere(caractere, tabela) {
  if (/\d/.test(caractere)) return 556;
  if (caractere in tabela) return tabela[caractere];
  const base = caractere.normalize('NFD')[0];
  if (base in tabela) return tabela[base];
  if (base in REGULAR) return REGULAR[base];
  return 556;
}

export function medirTextoHelvetica(texto, tamanhoEmPontos, negrito = false) {
  const tabela = negrito ? NEGRITO : REGULAR;
  let unidades = 0;
  for (const caractere of String(texto ?? '').normalize('NFC')) unidades += larguraDoCaractere(caractere, tabela);
  return (unidades / 1000) * tamanhoEmPontos;
}

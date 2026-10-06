/**
 * Apoio dos testes das ferramentas de PDF: criar PDFs de teste e ler de volta o
 * que as ferramentas escreveram nas páginas.
 */
import * as biblioteca from '../../recursos/pdf-lib.esm.min.js';

export { biblioteca };
const { PDFDocument, PDFName, PDFArray, PDFRawStream, decodePDFRawStream, StandardFonts } = biblioteca;

/**
 * PDF de `quantidade` páginas, cada uma com o texto "Original N" (para os testes
 * enxergarem o que ficou por cima e por baixo).
 * @param {number} quantidade
 * @param {{largura?: number, altura?: number, rotações?: number[], texto?: boolean}} [opções]
 */
export async function pdfDeTeste(quantidade, { largura = 595.28, altura = 841.89, rotações = [], texto = true } = {}) {
  const documento = await PDFDocument.create();
  const fonte = await documento.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < quantidade; i++) {
    const página = documento.addPage([largura, altura]);
    if (texto) página.drawText(`Original ${i + 1}`, { x: 50, y: altura - 80, size: 18, font: fonte });
    if (rotações[i]) página.setRotation(biblioteca.degrees(rotações[i]));
  }
  return documento.save();
}

/** PDF "protegido": o dicionário /Encrypt no trailer é o que a pdf-lib reconhece como proteção. */
export async function pdfProtegido() {
  const documento = await PDFDocument.create();
  documento.addPage([200, 200]);
  documento.context.trailerInfo.Encrypt = documento.context.obj({ Filter: 'Standard', V: 2, R: 3 });
  return documento.save({ useObjectStreams: false });
}

/** Bytes de todos os fluxos de conteúdo da página, já descompactados, como texto. */
export function conteúdoDaPágina(documento, índice) {
  const página = documento.getPage(índice);
  const conteúdo = página.node.Contents();
  const fluxos = conteúdo instanceof PDFArray
    ? conteúdo.asArray().map((ref) => documento.context.lookup(ref))
    : [conteúdo];
  return fluxos.filter(Boolean).map((fluxo) => {
    const bytes = fluxo instanceof PDFRawStream ? decodePDFRawStream(fluxo).decode() : fluxo.getUnencodedContents();
    return new TextDecoder('latin1').decode(bytes);
  }).join('\n');
}

/** Texto dos operadores `Tj` ("(…) Tj" e "<hex> Tj") de uma página, na ordem. */
export function textosDaPágina(documento, índice) {
  const conteúdo = conteúdoDaPágina(documento, índice);
  const textos = [];
  for (const [, parênteses, hex] of conteúdo.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj|<([0-9A-Fa-f]*)>\s*Tj/g)) {
    if (hex !== undefined) {
      textos.push(hex.match(/../g)?.map((h) => String.fromCharCode(parseInt(h, 16))).join('') ?? '');
    } else {
      textos.push(parênteses.replace(/\\(.)/g, '$1'));
    }
  }
  return textos;
}

/** Números da matriz `Tm` de cada texto: [a, b, c, d, x, y]. */
export function matrizesDeTexto(documento, índice) {
  return [...conteúdoDaPágina(documento, índice).matchAll(/([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) Tm/g)]
    .map((m) => m.slice(1, 7).map(Number));
}

/** Caixa de um tipo ("CropBox", "MediaBox"…) como [x1, y1, x2, y2], ou null. */
export function caixaDaPágina(documento, índice, nome) {
  const matriz = documento.getPage(índice).node.lookup(PDFName.of(nome));
  return matriz instanceof PDFArray ? matriz.asArray().map((n) => n.asNumber()) : null;
}

export const perto = (a, b, tolerância = 0.01) => Math.abs(a - b) <= tolerância;

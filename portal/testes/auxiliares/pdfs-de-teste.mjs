/**
 * PDFs gerados no próprio teste (nada de arquivo guardado no repositório) para as
 * ferramentas de páginas. Cada página numerada tem uma largura própria (100 + número),
 * o que permite saber, no PDF de saída, de qual página original cada uma veio.
 */
import * as biblioteca from '../../recursos/pdf-lib.esm.min.js';

export { biblioteca };
const { PDFDocument, degrees } = biblioteca;

/** PDF com `quantidade` páginas; a página n tem largura 100 + n e altura 200. */
export async function pdfNumerado(quantidade, { rotações = {} } = {}) {
  const documento = await PDFDocument.create();
  for (let n = 1; n <= quantidade; n++) {
    const página = documento.addPage([100 + n, 200]);
    if (rotações[n] !== undefined) página.setRotation(degrees(rotações[n]));
  }
  return documento.save({ useObjectStreams: false });
}

/** Origem de cada página de um PDF de saída: a largura menos 100 devolve o número original. */
export async function origensDasPáginas(bytes) {
  const documento = await PDFDocument.load(bytes);
  return documento.getPages().map((página) => Math.round(página.getWidth()) - 100);
}

export async function rotaçõesDasPáginas(bytes) {
  const documento = await PDFDocument.load(bytes);
  return documento.getPages().map((página) => página.getRotation().angle);
}

/** PDF com marcação de senha: um dicionário /Encrypt no trailer, que é o que a pdf-lib reconhece. */
export async function pdfProtegido() {
  const documento = await PDFDocument.create();
  documento.addPage([200, 200]);
  documento.context.trailerInfo.Encrypt = documento.context.obj({ Filter: 'Standard', V: 2, R: 3 });
  return documento.save({ useObjectStreams: false });
}

export const bytesDeTexto = (texto) => new TextEncoder().encode(texto);

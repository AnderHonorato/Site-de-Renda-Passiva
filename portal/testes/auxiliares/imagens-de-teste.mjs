/**
 * Imagens geradas pelo próprio teste, sem arquivo no repositório.
 *
 * O PNG é válido de verdade (zlib do Node). O JPEG tem os marcadores certos
 * (SOI, EXIF opcional, SOF0, SOS, EOI) mas dados de imagem vazios: a pdf-lib só
 * lê o cabeçalho para incorporá-lo, e é exatamente isso que o teste exercita.
 */
import { deflateSync } from 'node:zlib';

const tabelaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const b of bytes) c = tabelaCrc[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const meio = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(meio));
  return Buffer.concat([tamanho, meio, crc]);
}

/**
 * PNG sólido.
 * @param {number} largura
 * @param {number} altura
 * @param {{alfa?: boolean, linhas?: number}} [opções] `alfa`: RGBA semitransparente; `linhas`: quantas
 *   linhas de dados gravar (menos que a altura gera um PNG com cabeçalho mentiroso)
 */
export function png(largura, altura, { alfa = false, linhas: quantasLinhas = altura } = {}) {
  const cabeçalho = Buffer.alloc(13);
  cabeçalho.writeUInt32BE(largura, 0);
  cabeçalho.writeUInt32BE(altura, 4);
  cabeçalho[8] = 8;
  cabeçalho[9] = alfa ? 6 : 2;
  const canais = alfa ? 4 : 3;
  const linhas = Buffer.alloc((largura * canais + 1) * quantasLinhas, 0x80);
  for (let y = 0; y < quantasLinhas; y++) linhas[y * (largura * canais + 1)] = 0; // filtro "nenhum"
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cabeçalho), bloco('IDAT', deflateSync(linhas)), bloco('IEND', Buffer.alloc(0)),
  ]));
}

/**
 * JPEG de cabeçalho válido.
 * @param {number} largura
 * @param {number} altura
 * @param {{orientação?: number}} [opções] orientação EXIF a gravar (1 a 8)
 */
export function jpeg(largura, altura, { orientação } = {}) {
  const partes = [Buffer.from([0xff, 0xd8])];
  if (orientação) {
    // APP1 "Exif" com um IFD de uma entrada: a tag 0x0112 (orientação), em ordem de bytes "MM".
    const tiff = Buffer.from([
      0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // cabeçalho TIFF, IFD em 8
      0x00, 0x01, // uma entrada
      0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientação, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);
    const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
    const tamanho = Buffer.alloc(2);
    tamanho.writeUInt16BE(exif.length + 2);
    partes.push(Buffer.from([0xff, 0xe1]), tamanho, exif);
  }
  const quadro = Buffer.alloc(17);
  quadro.writeUInt16BE(17, 0);
  quadro[2] = 8;
  quadro.writeUInt16BE(altura, 3);
  quadro.writeUInt16BE(largura, 5);
  quadro[7] = 3;
  [[1, 0x11, 0], [2, 0x11, 1], [3, 0x11, 1]].forEach(([id, amostra, tabela], i) => {
    quadro[8 + i * 3] = id;
    quadro[9 + i * 3] = amostra;
    quadro[10 + i * 3] = tabela;
  });
  partes.push(Buffer.from([0xff, 0xc0]), quadro);
  partes.push(Buffer.from([0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00]));
  partes.push(Buffer.alloc(32, 0x55), Buffer.from([0xff, 0xd9]));
  return new Uint8Array(Buffer.concat(partes));
}

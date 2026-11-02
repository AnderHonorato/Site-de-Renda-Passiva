// Sincronizado de compartilhado/scripts/exportação/calcular-crc32.js — edite a origem e rode "npm run sincronizar" na raiz.
// CRC-32 (polinômio 0xEDB88320), usado pelo formato ZIP que envolve a planilha .xlsx.
let tabela = null;

function montarTabela() {
  const resultado = new Uint32Array(256);
  for (let índice = 0; índice < 256; índice += 1) {
    let valor = índice;
    for (let bit = 0; bit < 8; bit += 1) valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    resultado[índice] = valor >>> 0;
  }
  return resultado;
}

export function calcularCrc32(bytes) {
  tabela ??= montarTabela();
  let crc = 0xffffffff;
  for (const byte of bytes) crc = tabela[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

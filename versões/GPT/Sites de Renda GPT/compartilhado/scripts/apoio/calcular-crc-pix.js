// CRC16-CCITT-FALSE exigido pelo BR Code: polinômio 0x1021, valor inicial 0xFFFF,
// sem reflexão e sem XOR final. Retorna quatro dígitos hexadecimais maiúsculos.
export function calcularCrcPix(texto) {
  const bytes = new TextEncoder().encode(String(texto));
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

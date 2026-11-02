/**
 * Imagens de QR Code geradas no próprio teste (nada de arquivo guardado no repositório): desenha os módulos
 * do gerador do portal em pixels RGBA e, quando preciso, empacota num PNG de verdade para o navegador abrir.
 */
import { deflateSync } from 'node:zlib';

import qrcode from '../../recursos/qrcode.mjs';
import { gerarMatrizQr } from '../../scripts/comum/qr/gerar-matriz-qr.js';
import { calcularCrc32 } from '../../scripts/comum/exportação/calcular-crc32.js';

/**
 * Desenha QR Codes lado a lado numa imagem RGBA branca (ou invertida).
 * @param {string[]} textos
 * @param {{escala?: number, margem?: number, inverter?: boolean, espaço?: number, altura?: number}} [opções]
 * @returns {{data: Uint8ClampedArray, width: number, height: number}}
 */
export function desenharQr(textos, { escala = 6, margem = 4, inverter = false, espaço = 6, altura = 0 } = {}) {
  const matrizes = textos.map((t) => gerarMatrizQr(t, qrcode));
  const lados = matrizes.map((m) => (m.length + margem * 2) * escala);
  const largura = lados.reduce((s, l) => s + l, 0) + espaço * escala * (textos.length - 1);
  const alto = Math.max(altura, ...lados);
  const dados = new Uint8ClampedArray(largura * alto * 4);
  const claro = inverter ? 0 : 255;
  const escuro = inverter ? 255 : 0;
  for (let i = 0; i < dados.length; i += 4) {
    dados.fill(claro, i, i + 3);
    dados[i + 3] = 255;
  }
  let x0 = 0;
  matrizes.forEach((matriz, k) => {
    matriz.forEach((linha, y) => linha.forEach((escura, x) => {
      if (!escura) return;
      for (let dy = 0; dy < escala; dy += 1) {
        for (let dx = 0; dx < escala; dx += 1) {
          const px = x0 + (x + margem) * escala + dx;
          const py = (y + margem) * escala + dy;
          dados.fill(escuro, (py * largura + px) * 4, (py * largura + px) * 4 + 3);
        }
      }
    }));
    x0 += lados[k] + espaço * escala;
  });
  return { data: dados, width: largura, height: alto };
}

const u32 = (n) => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

function bloco(tipo, dados) {
  const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  return Buffer.concat([u32(dados.length), corpo, u32(calcularCrc32(corpo))]);
}

/**
 * Codifica pixels RGBA em PNG (sem filtro, com deflate do Node).
 * @param {{data: Uint8ClampedArray, width: number, height: number}} imagem
 * @returns {Buffer}
 */
export function pngDe({ data, width, height }) {
  const linhas = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    linhas[y * (width * 4 + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(linhas, y * (width * 4 + 1) + 1);
  }
  const cabeçalho = Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    bloco('IHDR', cabeçalho),
    bloco('IDAT', deflateSync(linhas)),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

/** Imagem de ruído (cada pixel aleatório): a pior entrada possível para a jsQR. */
export function ruído(largura, altura, semente = 12345) {
  const dados = new Uint8ClampedArray(largura * altura * 4);
  let s = semente;
  for (let i = 0; i < dados.length; i += 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    dados[i] = s >> 16;
  }
  for (let i = 3; i < dados.length; i += 4) dados[i] = 255;
  return { data: dados, width: largura, height: altura };
}

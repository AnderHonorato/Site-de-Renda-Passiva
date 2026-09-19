// Monta o SVG de um QR Code como texto, sem interpolar conteúdo do usuário:
// os módulos viram um único caminho vetorial, então o texto original não aparece
// no markup e não há como injetar nada pelo conteúdo codificado.
import { gerarMatrizQr } from './gerar-matriz-qr.js';

/**
 * @param {string} texto conteúdo a codificar
 * @param {Function} fábricaDeQr função qrcode da biblioteca
 * @param {{margem?: number, escala?: number, corEscura?: string, corClara?: string}} [opções]
 * @returns {{svg: string, lado: number, módulos: number}}
 */
export function gerarSvgQr(texto, fábricaDeQr, opções = {}) {
  const { margem = 4, escala = 10, corEscura = '#111111', corClara = '#ffffff' } = opções;
  const matriz = gerarMatrizQr(texto, fábricaDeQr);
  const módulos = matriz.length;
  const lado = módulos + margem * 2;

  const trechos = [];
  matriz.forEach((linha, y) => {
    linha.forEach((escuro, x) => {
      if (escuro) trechos.push(`M${x + margem} ${y + margem}h1v1h-1z`);
    });
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" `
    + `width="${lado * escala}" height="${lado * escala}" shape-rendering="crispEdges" role="img">`
    + `<rect width="${lado}" height="${lado}" fill="${corClara}"/>`
    + `<path d="${trechos.join('')}" fill="${corEscura}"/></svg>`;

  return { svg, lado: lado * escala, módulos };
}

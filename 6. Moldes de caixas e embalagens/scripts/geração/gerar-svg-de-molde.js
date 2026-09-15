// Gera o texto de um arquivo SVG vetorial do molde, em milímetros reais (width/height e
// viewBox na mesma escala 1:1), com linhas de corte contínuas e de dobra tracejadas —
// distinguíveis mesmo em preto e branco, porque o traço tracejado não depende de cor.
// Texto do usuário é escapado. Função pura (string), usada pelo botão "Baixar SVG".
import { escaparXml } from '../comum/validação/escapar-xml.js';

function traçarSegmentos(segmentos, classe) {
  return segmentos
    .map((segmento) => `<line x1="${arred(segmento.x1)}" y1="${arred(segmento.y1)}" x2="${arred(segmento.x2)}" y2="${arred(segmento.y2)}" class="${classe}"/>`)
    .join('');
}

function arred(valor) {
  return Math.round(valor * 100) / 100;
}

export function gerarSvgDeMolde({ segmentosDeCorte, segmentosDeDobra, retânguloEnvolvente, textoOpcional = '', tituloDoMolde = 'Molde' }) {
  const { larguraMm, alturaMm } = retânguloEnvolvente;
  const partes = [];
  partes.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  partes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraMm}mm" height="${alturaMm}mm" viewBox="0 0 ${larguraMm} ${alturaMm}">`,
  );
  partes.push(`<title>${escaparXml(tituloDoMolde)}</title>`);
  partes.push(
    `<style>.corte{fill:none;stroke:#000000;stroke-width:0.3;}.dobra{fill:none;stroke:#000000;stroke-width:0.25;stroke-dasharray:2,1.4;}</style>`,
  );
  partes.push(`<rect x="0" y="0" width="${larguraMm}" height="${alturaMm}" fill="#ffffff"/>`);
  partes.push(traçarSegmentos(segmentosDeDobra, 'dobra'));
  partes.push(traçarSegmentos(segmentosDeCorte, 'corte'));
  if (textoOpcional) {
    const texto = escaparXml(textoOpcional).slice(0, 200);
    partes.push(
      `<text x="${arred(larguraMm / 2)}" y="${arred(alturaMm / 2)}" text-anchor="middle" font-size="4" font-family="sans-serif" fill="#000000">${texto}</text>`,
    );
  }
  partes.push(`</svg>`);
  return partes.join('');
}

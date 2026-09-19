// Sincronizado de compartilhado/scripts/apoio/renderizar-código-qr.js — edite a origem e rode "npm run sincronizar" na raiz.
// Cria um elemento SVG com o QR Code do texto. A biblioteca é carregada somente
// quando necessária. Construído com createElementNS: nenhum HTML interpolado.
import { gerarMatrizQr } from './gerar-matriz-qr.js';

const ESPAÇO_SVG = 'http://www.w3.org/2000/svg';

export async function renderizarCódigoQr(texto, { margem = 4, rótulo = 'Código QR' } = {}) {
  const módulo = await import('../../../recursos/bibliotecas/qrcode.mjs');
  const matriz = gerarMatrizQr(texto, módulo.default);
  const lado = matriz.length + margem * 2;

  const svg = document.createElementNS(ESPAÇO_SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${lado} ${lado}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', rótulo);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('xmlns', ESPAÇO_SVG);

  const fundo = document.createElementNS(ESPAÇO_SVG, 'rect');
  fundo.setAttribute('width', String(lado));
  fundo.setAttribute('height', String(lado));
  fundo.setAttribute('fill', '#ffffff');
  svg.append(fundo);

  const trechos = [];
  matriz.forEach((linha, y) => {
    linha.forEach((escuro, x) => {
      if (escuro) trechos.push(`M${x + margem} ${y + margem}h1v1h-1z`);
    });
  });
  const caminho = document.createElementNS(ESPAÇO_SVG, 'path');
  caminho.setAttribute('d', trechos.join(''));
  caminho.setAttribute('fill', '#000000');
  svg.append(caminho);
  return svg;
}

/**
 * Ponte entre o pdf.js e as ferramentas que precisam do TEXTO das páginas (extrair texto,
 * comparar, ocultar informações) e de uma prévia desenhada (assinar, ocultar).
 *
 * Reaproveita o carregamento de `leitor-pdfjs.js` (módulo e trabalhador da própria origem,
 * sem WebAssembly e sem fontes do navegador criadas a partir de blob:), então a política
 * de segurança continua a mesma. Nada é baixado de fora.
 *
 * O texto sai em "coordenadas da vista": pontos, com a origem no canto superior esquerdo
 * da página COMO APARECE (CropBox e rotação já aplicados), e o y cresce para baixo. Cada
 * pedaço de texto traz a origem da linha de base (ox, oy), o vetor ao longo da linha (ux, uy,
 * com o comprimento do pedaço) e o vetor "para cima" (vx, vy, com a altura da letra).
 */
import { carregarPdfjs } from './leitor-pdfjs.js';

/** Opções do pdf.js que valem em todas as ferramentas (ver `leitor-pdfjs.js`). */
const OPÇÕES = Object.freeze({ useWasm: false, disableFontFace: true, enableXfa: false, verbosity: 0 });

/** Maior lado de um canvas de prévia (um canvas enorme falha em silêncio no celular). */
const LADO_MÁXIMO_DO_CANVAS = 8000;

/**
 * Pedaço de texto do pdf.js em coordenadas da vista.
 * @returns {{str: string, ox: number, oy: number, ux: number, uy: number, vx: number, vy: number, eol: boolean} | null}
 */
export function itemEmCoordenadasDaVista(item, viewport, Util) {
  if (typeof item?.str !== 'string' || !Array.isArray(item.transform)) return null;
  const m = Util.transform(viewport.transform, item.transform);
  const tamanhoU = Math.hypot(m[0], m[1]);
  const tamanhoV = Math.hypot(m[2], m[3]);
  const largura = Number.isFinite(item.width) ? Math.max(0, item.width) : 0;
  const altura = item.height > 0 ? item.height : tamanhoV;
  // Sem direção (matriz degenerada) não há onde colocar o texto: o pedaço só marca fim de linha.
  const [dux, duy] = tamanhoU > 1e-9 ? [m[0] / tamanhoU, m[1] / tamanhoU] : [1, 0];
  const [dvx, dvy] = tamanhoV > 1e-9 ? [m[2] / tamanhoV, m[3] / tamanhoV] : [0, -1];
  return {
    str: item.str,
    ox: m[4],
    oy: m[5],
    ux: dux * largura,
    uy: duy * largura,
    vx: dvx * altura,
    vy: dvy * altura,
    eol: Boolean(item.hasEOL),
  };
}

/**
 * Abre um PDF no pdf.js e devolve o que as ferramentas de texto e de prévia usam.
 * Quem chama é responsável por `fechar()`.
 * Erro de senha chega com `name === 'PasswordException'`; o leitor ausente, com `name === 'LeitorIndisponível'`.
 * @param {Uint8Array} bytes
 */
export async function abrirComPdfjsParaTexto(bytes) {
  const pdfjs = await carregarPdfjs();
  // O pdf.js entrega o buffer ao trabalhador e o esvazia; a cópia deixa os bytes da tela intactos.
  const tarefa = pdfjs.getDocument({ data: bytes.slice(), ...OPÇÕES });
  const documento = await tarefa.promise;

  return {
    páginas: documento.numPages,

    async tamanho(número) {
      const página = await documento.getPage(número);
      const { width, height } = página.getViewport({ scale: 1 });
      return { largura: width, altura: height };
    },

    /** Texto da página em coordenadas da vista. */
    async texto(número) {
      const página = await documento.getPage(número);
      try {
        const viewport = página.getViewport({ scale: 1 });
        const conteúdo = await página.getTextContent();
        const itens = [];
        for (const item of conteúdo.items) {
          const convertido = itemEmCoordenadasDaVista(item, viewport, pdfjs.Util);
          // Fonte de largura fixa: a ocultação divide o trecho em partes iguais em vez de medir as letras.
          const família = conteúdo.styles?.[item.fontName]?.fontFamily;
          if (convertido) itens.push({ ...convertido, mono: família === 'monospace', serif: família === 'serif' });
        }
        return { itens, largura: viewport.width, altura: viewport.height };
      } finally {
        página.cleanup();
      }
    },

    /**
     * Desenha a página inteira num canvas que o chamador entrega (prévia na tela).
     * @param {number} número
     * @param {HTMLCanvasElement} tela
     * @param {number} larguraEmPixels largura que a tela deve ter
     * @returns {Promise<{largura: number, altura: number}>} tamanho da página em pontos
     */
    async desenharNaTela(número, tela, larguraEmPixels) {
      const página = await documento.getPage(número);
      try {
        const base = página.getViewport({ scale: 1 });
        const escala = Math.min(larguraEmPixels / base.width, LADO_MÁXIMO_DO_CANVAS / Math.max(base.width, base.height));
        const viewport = página.getViewport({ scale: escala });
        tela.width = Math.max(1, Math.round(viewport.width));
        tela.height = Math.max(1, Math.round(viewport.height));
        const contexto = tela.getContext('2d');
        if (!contexto) throw new Error('canvas indisponível');
        await página.render({ canvas: tela, canvasContext: contexto, viewport, background: '#ffffff' }).promise;
        return { largura: base.width, altura: base.height };
      } finally {
        página.cleanup();
      }
    },

    /**
     * Desenha a página, pinta as tarjas por cima e devolve a imagem pronta (JPEG ou PNG).
     * As tarjas vêm em pontos, em coordenadas da vista.
     * @param {number} número
     * @param {{largura: number, altura: number, escala: number}} medida tamanho da imagem em pixels e escala sobre os pontos
     * @param {{x: number, y: number, largura: number, altura: number}[]} tarjas
     * @param {string} cor cor CSS da tarja
     * @param {{tipo: string}} formato
     * @param {number} qualidade 0 a 1 (só vale para JPEG)
     * @returns {Promise<Uint8Array>}
     */
    async desenharComTarjas(número, medida, tarjas, cor, formato, qualidade) {
      const página = await documento.getPage(número);
      const tela = document.createElement('canvas');
      tela.width = medida.largura;
      tela.height = medida.altura;
      try {
        const contexto = tela.getContext('2d');
        if (!contexto) throw new Error('canvas indisponível');
        const viewport = página.getViewport({ scale: medida.escala });
        await página.render({ canvas: tela, canvasContext: contexto, viewport, background: '#ffffff' }).promise;
        // A escala exata por eixo absorve o arredondamento do tamanho final em pixels.
        const base = página.getViewport({ scale: 1 });
        const fx = medida.largura / base.width;
        const fy = medida.altura / base.height;
        contexto.fillStyle = cor;
        for (const t of tarjas) {
          // Arredonda para fora: a tarja nunca fica menor que o pedido por causa de uma fração de pixel.
          const x0 = Math.floor(t.x * fx);
          const y0 = Math.floor(t.y * fy);
          const x1 = Math.ceil((t.x + t.largura) * fx);
          const y1 = Math.ceil((t.y + t.altura) * fy);
          contexto.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
        const imagem = await new Promise((resolver, rejeitar) => {
          tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('sem imagem'))), formato.tipo, qualidade);
        });
        return new Uint8Array(await imagem.arrayBuffer());
      } finally {
        página.cleanup();
        tela.width = 0;
        tela.height = 0;
      }
    },

    async fechar() {
      await tarefa.destroy();
    },
  };
}

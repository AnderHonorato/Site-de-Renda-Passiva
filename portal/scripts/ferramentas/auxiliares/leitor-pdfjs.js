/**
 * Ponte entre o pdf.js (Apache-2.0, em recursos/pdfjs/) e o cálculo de PDF para JPG.
 *
 * O pdf.js roda sob a política de segurança estrita do portal SEM relaxá-la:
 *  - o leitor é um módulo da própria origem (script-src 'self') e o trabalho
 *    pesado vai para um worker de módulo, também da própria origem;
 *  - `useWasm: false`: WebAssembly exigiria 'wasm-unsafe-eval' na política, então
 *    JBIG2 e JPEG 2000 usam as versões em JavaScript que acompanham a biblioteca;
 *  - `disableFontFace: true`: as fontes do PDF são desenhadas como contornos, sem
 *    criar fontes do navegador a partir de blob:, que a política não permite;
 *  - nada é baixado de fora: `standardFontDataUrl` e `cMapUrl` não são usados,
 *    então PDF com fonte padrão não embutida usa as fontes do aparelho.
 */

const CAMINHO_DO_LEITOR = '../../../recursos/pdfjs/pdf.mjs';
const CAMINHO_DO_WORKER = '../../../recursos/pdfjs/pdf.worker.mjs';
const PASTA_DO_LEITOR = '../../../recursos/pdfjs/';

let carregando;

/** Carrega o pdf.js uma vez só, só quando a ferramenta precisa. */
export function carregarPdfjs() {
  carregando ??= import(CAMINHO_DO_LEITOR).then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(CAMINHO_DO_WORKER, import.meta.url).href;
    return pdfjs;
  }).catch((erro) => {
    carregando = undefined;
    const falha = new Error(String(erro?.message ?? erro));
    falha.name = 'LeitorIndisponível';
    throw falha;
  });
  return carregando;
}

/**
 * Abre o PDF no formato que `converterPdfEmImagens` espera.
 * @param {Uint8Array} bytes
 */
export async function abrirComPdfjs(bytes) {
  const pdfjs = await carregarPdfjs();
  // O pdf.js entrega o buffer ao worker e o esvazia; a cópia deixa os bytes da tela intactos.
  const tarefa = pdfjs.getDocument({
    data: bytes.slice(),
    useWasm: false,
    wasmUrl: new URL(PASTA_DO_LEITOR, import.meta.url).href,
    disableFontFace: true,
    enableXfa: false,
    verbosity: 0,
  });
  const documento = await tarefa.promise;

  return {
    páginas: documento.numPages,
    async tamanho(número) {
      const página = await documento.getPage(número);
      const { width, height } = página.getViewport({ scale: 1 });
      return { largura: width, altura: height };
    },
    async desenhar(número, { largura, altura, escala }, formato, qualidade) {
      const página = await documento.getPage(número);
      const tela = document.createElement('canvas');
      tela.width = largura;
      tela.height = altura;
      try {
        const contexto = tela.getContext('2d');
        if (!contexto) throw new Error('canvas indisponível');
        // O tamanho final vem do arredondamento acima; a escala exata mantém a proporção da página.
        const viewport = página.getViewport({ scale: escala });
        await página.render({ canvas: tela, canvasContext: contexto, viewport, background: '#ffffff' }).promise;
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

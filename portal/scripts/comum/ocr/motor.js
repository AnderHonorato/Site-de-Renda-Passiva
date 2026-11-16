/** Ponte pequena para o protocolo do Worker Tesseract.js 6.0.1, fixado no build.
 * Controlar o Worker desde a criação permite cancelar inclusive o primeiro download.
 * Os testes de navegador exercitam o protocolo e os bytes reais do PDF pesquisável.
 */
export const LIMITES_OCR = Object.freeze({ pixels: 8_000_000, bytes: 20 * 1024 * 1024, tempoMs: 180000 });
export const IDIOMAS_OCR = Object.freeze(['por', 'eng', 'spa']);
let ocupado = false;
export class ErroOCR extends Error {
  constructor(codigo, mensagem, opcoes) { super(mensagem, opcoes); this.name = 'ErroOCR'; this.codigo = codigo; }
}
const cancelado = () => Object.assign(new Error('Reconhecimento cancelado. Você pode escolher outro arquivo ou começar novamente.'), { name: 'AbortError', cancelado: true });
export function validarIdiomaOCR(idioma) {
  if (!IDIOMAS_OCR.includes(idioma)) throw new ErroOCR('idioma', 'Escolha português, inglês ou espanhol para reconhecer o texto.');
  return idioma;
}
export function validarDimensoesOCR(largura, altura) {
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 1 || altura < 1) throw new ErroOCR('imagem', 'Não consegui ler o tamanho da imagem. Escolha outra imagem.');
  if (largura * altura > LIMITES_OCR.pixels || largura > 8000 || altura > 8000) throw new ErroOCR('pixels', 'A imagem para reconhecimento passa de 8 milhões de pixels ou 8.000 pixels de lado. Reduza o tamanho e tente novamente.');
}
async function bytesDaImagem(imagem) {
  let blob;
  if (typeof HTMLCanvasElement !== 'undefined' && imagem instanceof HTMLCanvasElement) {
    validarDimensoesOCR(imagem.width, imagem.height);
    blob = await new Promise(ok => imagem.toBlob(ok, 'image/png'));
  } else if (typeof OffscreenCanvas !== 'undefined' && imagem instanceof OffscreenCanvas) {
    validarDimensoesOCR(imagem.width, imagem.height);
    blob = await imagem.convertToBlob({ type: 'image/png' });
  } else if (imagem instanceof Blob) {
    if (imagem.size > LIMITES_OCR.bytes) throw new ErroOCR('tamanho', 'A imagem passa de 20 MB. Escolha uma versão menor.');
    let bitmap;
    try { bitmap = await createImageBitmap(imagem); validarDimensoesOCR(bitmap.width, bitmap.height); }
    catch (erro) { if (erro instanceof ErroOCR) throw erro; throw new ErroOCR('imagem', 'Não consegui abrir esta imagem. Use JPG, PNG ou WebP.'); }
    finally { bitmap?.close(); }
    blob = imagem;
  }
  if (!blob || blob.size > LIMITES_OCR.bytes) throw new ErroOCR('imagem', 'Não consegui preparar esta imagem. Use uma imagem menor em JPG, PNG ou WebP.');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function criarLeitorOCR({ idioma = 'por', signal, aoProgredir } = {}) {
  validarIdiomaOCR(idioma);
  if (signal?.aborted) throw cancelado();
  if (ocupado) throw new ErroOCR('ocupado', 'Um reconhecimento já está em andamento. Aguarde ou cancele antes de iniciar outro.');
  ocupado = true;
  let worker, encerrado = false, motivo, sequencia = 0, timer, reconhecendo = false;
  const pendentes = new Map();
  const avisar = evento => { try { aoProgredir?.(evento); } catch { /* apresentação não altera o arquivo */ } };
  const fechar = async (erro) => {
    if (encerrado) return;
    encerrado = true; motivo = erro || cancelado(); clearTimeout(timer);
    signal?.removeEventListener('abort', abortar);
    globalThis.removeEventListener?.('pagehide', sair);
    worker?.terminate();
    for (const p of pendentes.values()) p.reject(motivo);
    pendentes.clear(); ocupado = false;
  };
  const abortar = () => { void fechar(cancelado()); };
  const sair = () => { void fechar(cancelado()); };
  const prazo = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { void fechar(new ErroOCR('tempo', 'O reconhecimento demorou além do limite deste aparelho. Experimente uma página menor ou uma foto mais nítida.')); }, LIMITES_OCR.tempoMs);
  };
  const chamar = (action, payload) => {
    if (encerrado) return Promise.reject(motivo);
    const jobId = String(++sequencia);
    return new Promise((resolve, reject) => {
      pendentes.set(jobId, { resolve, reject });
      try { worker.postMessage({ workerId: 'ocr-local', jobId, action, payload }); }
      catch (erro) { pendentes.delete(jobId); reject(erro); }
    });
  };
  try {
    const pasta = new URL('../../../recursos/ocr/', import.meta.url);
    worker = new Worker(new URL('worker.min.js', pasta));
    worker.onmessage = ({ data: pacote }) => {
      if (pacote.status === 'progress') {
        const progresso = pacote.data?.progress;
        avisar({ etapa: pacote.action === 'recognize' ? 'reconhecendo' : 'carregando', ...(Number.isFinite(progresso) ? { progresso: Math.max(0, Math.min(1, progresso)) } : {}) });
        return;
      }
      const p = pendentes.get(pacote.jobId);
      if (!p) return;
      pendentes.delete(pacote.jobId);
      if (pacote.status === 'resolve') p.resolve(pacote.data);
      else p.reject(new ErroOCR('processamento', 'Não consegui reconhecer esta página. Experimente uma foto mais nítida e confira o idioma.'));
    };
    worker.onerror = evento => { evento.preventDefault?.(); void fechar(new ErroOCR('motor', 'Não consegui carregar o leitor de texto. Confira sua conexão e tente novamente.')); };
    worker.onmessageerror = () => { void fechar(new ErroOCR('motor', 'O leitor de texto foi interrompido. Tente novamente com um arquivo menor.')); };
    signal?.addEventListener('abort', abortar, { once: true });
    globalThis.addEventListener?.('pagehide', sair);
    if (signal?.aborted) throw cancelado();
    prazo(); avisar({ etapa: 'carregando' });
    await chamar('load', { options: { lstmOnly: true, corePath: pasta.href, logging: false } });
    await chamar('loadLanguage', { langs: idioma, options: { langPath: pasta.href, gzip: true, cacheMethod: 'none', lstmOnly: true } });
    await chamar('initialize', { langs: idioma, oem: 1, config: {} });
    await chamar('setParameters', { params: { tessedit_pageseg_mode: '3', user_defined_dpi: '300', preserve_interword_spaces: '1' } });
    clearTimeout(timer);
    return {
      async reconhecer(imagem, { pdf = false } = {}) {
        if (encerrado) throw motivo;
        if (reconhecendo) throw new ErroOCR('ocupado', 'Aguarde o reconhecimento desta página antes de começar outra.');
        reconhecendo = true; prazo();
        try {
          const image = await bytesDaImagem(imagem);
          if (encerrado) throw motivo;
          avisar({ etapa: 'reconhecendo', progresso: 0 });
          const data = await chamar('recognize', { image, options: { pdfTitle: 'Texto reconhecido', pdfTextOnly: false }, output: { text: true, pdf: Boolean(pdf) } });
          return { texto: String(data.text || ''), confianca: Number.isFinite(data.confidence) ? data.confidence : 0, ...(pdf && data.pdf ? { pdf: new Uint8Array(data.pdf) } : {}) };
        } catch (erro) {
          if (encerrado) throw motivo;
          if (erro instanceof ErroOCR) throw erro;
          throw new ErroOCR('processamento', 'Não consegui ler esta imagem. Experimente outra foto ou um tamanho menor.', { cause: erro });
        } finally { reconhecendo = false; clearTimeout(timer); }
      },
      fechar: () => fechar(),
    };
  } catch (erro) {
    await fechar(erro instanceof Error ? erro : new ErroOCR('motor', 'Não consegui preparar o leitor de texto. Confira sua conexão e tente novamente.'));
    throw motivo;
  }
}

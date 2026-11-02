// juntar-pdf-processamento.js — validação e junção de PDFs (contrato §13.5).
// A biblioteca pdf-lib entra por parâmetro, para o teste rodar no Node sem DOM.

export const TAMANHO_MAXIMO_POR_ARQUIVO = 100 * 1024 * 1024; // 100 MB
const ASSINATURA_PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF

/** Confere a assinatura %PDF nos primeiros bytes (aceita BOM/lixo nos primeiros 1024 bytes). */
export function pareceArquivoPdf(bytes) {
  const limite = Math.min(bytes.length, 1024);
  for (let inicio = 0; inicio <= limite - ASSINATURA_PDF.length; inicio++) {
    let igual = true;
    for (let i = 0; i < ASSINATURA_PDF.length; i++) {
      if (bytes[inicio + i] !== ASSINATURA_PDF[i]) {
        igual = false;
        break;
      }
    }
    if (igual) return true;
  }
  return false;
}

export function validarArquivo({ nome, tamanho, bytes }) {
  if (tamanho > TAMANHO_MAXIMO_POR_ARQUIVO) {
    return { ok: false, erro: 'arquivo_grande_demais', nome };
  }
  if (!pareceArquivoPdf(bytes)) {
    return { ok: false, erro: 'arquivo_nao_pdf', nome };
  }
  return { ok: true, nome };
}

function classificarFalha(erro) {
  const mensagem = String(erro?.message ?? erro);
  if (/encrypt/i.test(mensagem)) return 'pdf_protegido';
  return 'pdf_corrompido';
}

/**
 * Junta os PDFs na ordem recebida.
 * @param {Array<{nome: string, bytes: Uint8Array}>} arquivos
 * @param {object} opcoes
 * @param {object} opcoes.biblioteca — módulo pdf-lib (precisa de PDFDocument)
 * @param {(progresso: {pagina: number, total: number, arquivo: string}) => void} [opcoes.aoProgredir]
 * @param {() => boolean} [opcoes.cancelado]
 * @param {number} [opcoes.limiteDeArquivos]
 */
export async function juntarPdfs(arquivos, { biblioteca, aoProgredir, cancelado, limiteDeArquivos = 3 } = {}) {
  if (!Array.isArray(arquivos) || arquivos.length < 2) {
    return { ok: false, erro: 'poucos_arquivos' };
  }
  if (arquivos.length > limiteDeArquivos) {
    return { ok: false, erro: 'limite_de_arquivos', extras: { limite: limiteDeArquivos, enviados: arquivos.length } };
  }

  const { PDFDocument } = biblioteca;
  const documentos = [];
  let totalDePaginas = 0;

  for (const arquivo of arquivos) {
    const validacao = validarArquivo({ nome: arquivo.nome, tamanho: arquivo.bytes.length, bytes: arquivo.bytes });
    if (!validacao.ok) return { ok: false, erro: validacao.erro, extras: { nome: arquivo.nome } };
    try {
      const documento = await PDFDocument.load(arquivo.bytes, { ignoreEncryption: false });
      documentos.push({ nome: arquivo.nome, documento });
      totalDePaginas += documento.getPageCount();
    } catch (erro) {
      return { ok: false, erro: classificarFalha(erro), extras: { nome: arquivo.nome } };
    }
  }

  const juntado = await PDFDocument.create();
  let pagina = 0;
  for (const { nome, documento } of documentos) {
    const indices = documento.getPageIndices();
    const paginas = await juntado.copyPages(documento, indices);
    for (const pagina_ of paginas) {
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      juntado.addPage(pagina_);
      pagina++;
      aoProgredir?.({ pagina, total: totalDePaginas, arquivo: nome });
    }
  }

  const bytes = await juntado.save();
  return { ok: true, bytes, paginas: totalDePaginas, arquivos: arquivos.length };
}

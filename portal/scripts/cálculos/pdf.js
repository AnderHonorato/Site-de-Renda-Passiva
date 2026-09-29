/**
 * Cálculos de PDF: conferir se um arquivo é PDF e juntar vários em um.
 *
 * Comportamento e casos de teste vindos da ferramenta pronta do Ander Flow
 * (juntar-pdf-processamento.js). A biblioteca pdf-lib entra por parâmetro:
 * assim o teste roda no Node e a página só baixa a biblioteca quando precisa.
 */

/** Tamanho máximo de cada arquivo, o mesmo do Ander Flow. */
export const TAMANHO_MÁXIMO_POR_ARQUIVO = 100 * 1024 * 1024; // 100 MB

/**
 * Quantos arquivos dá para juntar de uma vez sem conta, como no plano grátis
 * do Ander Flow. O lote maior de lá depende de conta, que o portal ainda não tem.
 */
export const LIMITE_DE_ARQUIVOS = 3;

const ASSINATURA_PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF

/**
 * Confere a assinatura %PDF nos primeiros bytes. Aceita lixo antes dela nos
 * primeiros 1024 bytes, como os leitores de PDF aceitam.
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function pareceArquivoPdf(bytes) {
  const limite = Math.min(bytes?.length ?? 0, 1024);
  for (let início = 0; início <= limite - ASSINATURA_PDF.length; início++) {
    if (ASSINATURA_PDF.every((byte, i) => bytes[início + i] === byte)) return true;
  }
  return false;
}

/**
 * Valida um arquivo antes de entrar na lista: tamanho e conteúdo, não extensão.
 * @param {{nome: string, tamanho: number, bytes: Uint8Array}} arquivo
 * @returns {{ok: true, nome: string} | {ok: false, erro: 'arquivo_grande_demais'|'arquivo_nao_pdf', nome: string}}
 */
export function validarArquivoPdf({ nome, tamanho, bytes }) {
  if (tamanho > TAMANHO_MÁXIMO_POR_ARQUIVO) return { ok: false, erro: 'arquivo_grande_demais', nome };
  if (!pareceArquivoPdf(bytes)) return { ok: false, erro: 'arquivo_nao_pdf', nome };
  return { ok: true, nome };
}

/**
 * Mensagem para a pessoa a partir do código de erro.
 * @param {string} erro código devolvido por `validarArquivoPdf` ou `juntarPdfs`
 * @param {{nome?: string, limite?: number}} [dados]
 * @returns {string}
 */
export function mensagemDeErroDoPdf(erro, { nome = '', limite = LIMITE_DE_ARQUIVOS } = {}) {
  const mensagens = {
    arquivo_nao_pdf: `"${nome}" não é um PDF de verdade: o conteúdo do arquivo não confere.`,
    pdf_protegido: `"${nome}" está protegido por senha. Abra no leitor de PDF, salve uma cópia sem proteção e use a cópia.`,
    pdf_corrompido: `Não foi possível ler "${nome}". O arquivo parece estar danificado.`,
    arquivo_grande_demais: `"${nome}" passa de 100 MB.`,
    poucos_arquivos: 'Escolha pelo menos dois PDFs.',
    limite_de_arquivos: `Dá para juntar até ${limite} arquivos por vez. Para mais, junte estes, baixe o resultado e junte com os próximos.`,
    cancelado: 'Junção cancelada. Nenhum arquivo foi gerado.',
  };
  return mensagens[erro] ?? 'Não foi possível juntar os PDFs.';
}

/**
 * Tamanho de arquivo legível: "1,2 MB" ou "350 kB".
 * @param {number} bytes
 * @returns {string}
 */
export function formatarTamanho(bytes) {
  const mega = bytes / (1024 * 1024);
  if (mega >= 1) return `${mega.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} kB`;
}

/**
 * Páginas copiadas entre uma folga e outra para a página respirar. Sem a folga,
 * o laço de cópia roda de uma vez só: a barra de progresso não se mexe e o
 * clique em "Cancelar" só é atendido quando já não há o que cancelar.
 */
const PÁGINAS_POR_FOLGA = 10;
const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

function classificarFalha(erro) {
  return /encrypt/i.test(String(erro?.message ?? erro)) ? 'pdf_protegido' : 'pdf_corrompido';
}

/**
 * Junta os PDFs na ordem recebida.
 * @param {Array<{nome: string, bytes: Uint8Array}>} arquivos
 * @param {{
 *   biblioteca: {PDFDocument: any},
 *   aoProgredir?: (progresso: {página: number, total: number, arquivo: string}) => void,
 *   cancelado?: () => boolean,
 *   limiteDeArquivos?: number,
 * }} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, páginas: number, arquivos: number, detalhes: {nome: string, páginas: number}[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function juntarPdfs(arquivos, { biblioteca, aoProgredir, cancelado, limiteDeArquivos = LIMITE_DE_ARQUIVOS } = {}) {
  if (!Array.isArray(arquivos) || arquivos.length < 2) return { ok: false, erro: 'poucos_arquivos' };
  if (arquivos.length > limiteDeArquivos) {
    return { ok: false, erro: 'limite_de_arquivos', extras: { limite: limiteDeArquivos, enviados: arquivos.length } };
  }

  const { PDFDocument } = biblioteca;
  const documentos = [];
  let totalDePáginas = 0;

  for (const arquivo of arquivos) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const validação = validarArquivoPdf({ nome: arquivo.nome, tamanho: arquivo.bytes.length, bytes: arquivo.bytes });
    if (!validação.ok) return { ok: false, erro: validação.erro, extras: { nome: arquivo.nome } };
    try {
      const documento = await PDFDocument.load(arquivo.bytes, { ignoreEncryption: false });
      documentos.push({ nome: arquivo.nome, documento });
      totalDePáginas += documento.getPageCount();
    } catch (erro) {
      return { ok: false, erro: classificarFalha(erro), extras: { nome: arquivo.nome } };
    }
  }

  const juntado = await PDFDocument.create();
  let página = 0;
  for (const { nome, documento } of documentos) {
    await folga();
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const cópias = await juntado.copyPages(documento, documento.getPageIndices());
    for (const cópia of cópias) {
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      juntado.addPage(cópia);
      página++;
      aoProgredir?.({ página, total: totalDePáginas, arquivo: nome });
      if (página % PÁGINAS_POR_FOLGA === 0) await folga();
    }
  }

  const bytes = await juntado.save();
  // Cancelado enquanto gravava: o arquivo pronto é descartado, como prometido.
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };
  return {
    ok: true,
    bytes,
    páginas: totalDePáginas,
    arquivos: arquivos.length,
    detalhes: documentos.map(({ nome, documento }) => ({ nome, páginas: documento.getPageCount() })),
  };
}

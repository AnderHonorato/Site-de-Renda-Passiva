import { spawn } from 'node:child_process';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import * as pdf from '../recursos/pdf-lib.esm.min.js';
import { editarMetadadosPdf } from '../scripts/cálculos/editar-metadados-do-pdf.js';
import { arquivosDoRelatorio } from '../scripts/comum/profissionais/arquivos.js';
import { compactarZip } from '../scripts/comum/exportação/compactar-zip.js';

const MB = 1024 ** 2;
export const limitesPdf = Object.freeze({ arquivos: 6, arquivo: 10 * MB, lote: 40 * MB, paginasArquivo: 100, paginasLote: 200, saidas: 60 * MB });
const perfis = { tela: 72, equilibrado: 150, impressao: 300 };
const padrao = { perfil: 'equilibrado', cinza: false, removerMetadados: true, unir: false };

function erroPdf(mensagem, status = 400) {
  return Object.assign(new Error(mensagem), { status });
}

export function validarOpcoesPdf(opcoes = {}) {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes) || Object.keys(opcoes).some(k => !Object.hasOwn(padrao, k))) {
    throw erroPdf('Confira as opções de otimização do lote.');
  }
  const ajustes = { ...padrao, ...opcoes };
  if (typeof ajustes.perfil !== 'string' || !Object.hasOwn(perfis, ajustes.perfil) ||
      ['cinza', 'removerMetadados', 'unir'].some(k => typeof ajustes[k] !== 'boolean')) {
    throw erroPdf('Escolha um perfil de qualidade e confira as opções do PDF.');
  }
  return ajustes;
}

function otimizar(caminho, pasta, opcoes, signal, limite) {
  signal?.throwIfAborted();
  const dpi = perfis[opcoes.perfil];
  const args = ['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dPDFSTOPONERROR', '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.7', '-dDetectDuplicateImages=true', '-dAutoRotatePages=/None',
    '-dDownsampleColorImages=true', '-dDownsampleGrayImages=true', '-dDownsampleMonoImages=true',
    '-dColorImageDownsampleType=/Bicubic', '-dGrayImageDownsampleType=/Bicubic',
    '-dPassThroughJPEGImages=false', '-dPassThroughJPXImages=false',
    `-dColorImageResolution=${dpi}`, `-dGrayImageResolution=${dpi}`, `-dMonoImageResolution=${dpi}`];
  if (opcoes.cinza) args.push('-sColorConversionStrategy=Gray', '-dProcessColorModel=/DeviceGray');
  args.push('-sstdout=%stderr', '-sOutputFile=%stdout', '-f', resolve(caminho));
  return new Promise((sucesso, falha) => {
    const proc = spawn('gs', args, { cwd: pasta, shell: false, env: { PATH: process.env.PATH, TMPDIR: pasta }, stdio: ['ignore', 'pipe', 'ignore'] });
    const partes = [];
    let tamanho = 0, erro;
    function parar(mensagem) {
      erro ??= erroPdf(mensagem);
      proc.kill('SIGKILL');
    }
    const cancelar = () => parar('Processamento do lote cancelado.');
    signal?.addEventListener('abort', cancelar, { once: true });
    const timer = setTimeout(() => parar('Este PDF demorou demais para converter. Divida o documento e envie novamente.'), 90000);
    proc.on('error', () => { erro = erroPdf('O motor de PDF do servidor está indisponível.', 503); });
    proc.stdout.on('data', parte => {
      tamanho += parte.length;
      if (tamanho > limite) parar('A saída do lote passou de 60 MB. Reduza a qualidade ou divida o lote.');
      else if (!erro) partes.push(parte);
    });
    proc.once('close', codigo => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancelar);
      if (erro) falha(erro);
      else if (codigo !== 0 || !tamanho) falha(erroPdf('O servidor não conseguiu otimizar este PDF. Salve uma cópia sem senha e envie novamente.'));
      else sucesso(Buffer.concat(partes, tamanho));
    });
  });
}

function nomeArquivo(nome, indice) {
  const base = basename(String(nome || 'documento.pdf').replaceAll('\\', '/')).replace(/\.pdf$/i, '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 64);
  return `${indice + 1}-${base || 'documento'}-otimizado.pdf`;
}

async function lerDocumento(bytes) {
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw erroPdf('O arquivo enviado precisa ser um PDF válido.');
  try {
    return await pdf.PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
  } catch {
    throw erroPdf('Não foi possível abrir o PDF. Verifique se o documento está íntegro e sem senha.');
  }
}

export async function executarLotePdf({ arquivos: entradas, opcoes: dados, pastaSaida: diretorio, signal, progresso }) {
  function informar(percentual, etapa) {
    signal?.throwIfAborted();
    progresso?.(percentual, etapa);
  }
  const opcoes = validarOpcoesPdf(dados);
  if (!Array.isArray(entradas) || !entradas.length || entradas.length > limitesPdf.arquivos) throw erroPdf('Selecione de 1 a 6 PDFs.');
  const fontes = [];
  let paginas = 0, bytesEntrada = 0, bytesSaida = 0;
  informar(1, 'Conferindo os documentos');
  for (const entrada of entradas) {
    const info = await lstat(entrada.caminho);
    bytesEntrada += info.size;
    if (!info.isFile() || !info.size || info.size > limitesPdf.arquivo || bytesEntrada > limitesPdf.lote) {
      throw erroPdf('Use até 10 MB por PDF e 40 MB no lote.');
    }
    const doc = await lerDocumento(await readFile(entrada.caminho));
    const quantidade = doc.getPageCount();
    paginas += quantidade;
    if (quantidade < 1 || quantidade > limitesPdf.paginasArquivo || paginas > limitesPdf.paginasLote) throw erroPdf('Use até 100 páginas por PDF e 200 no lote.');
    fontes.push({ ...entrada, quantidade, tamanho: info.size });
    signal?.throwIfAborted();
  }
  const arquivos = [], linhas = [], membros = [];
  async function salvar(nome, mime, bytes) {
    signal?.throwIfAborted();
    const caminho = join(diretorio, nome);
    await writeFile(caminho, bytes, { flag: 'wx', mode: 0o600 });
    arquivos.push({ nome, mime, tamanho: bytes.length, caminho });
    membros.push({ nome, conteúdo: bytes });
  }
  const unido = opcoes.unir ? await pdf.PDFDocument.create({ updateMetadata: false }) : null;
  for (const [i, fonte] of fontes.entries()) {
    informar(10 + Math.floor(i / fontes.length * 70), `Otimizando PDF ${i + 1} de ${fontes.length}`);
    let bytes = await otimizar(fonte.caminho, diretorio, opcoes, signal, limitesPdf.saidas - bytesSaida);
    if (opcoes.removerMetadados) bytes = (await editarMetadadosPdf(bytes, {}, pdf, { limparTudo: true })).bytes;
    const doc = await pdf.PDFDocument.load(bytes, { updateMetadata: false });
    if (doc.getPageCount() !== fonte.quantidade) throw erroPdf('A conferência de páginas encontrou uma diferença após a conversão.');
    bytesSaida += bytes.length;
    if (bytesSaida > limitesPdf.saidas) throw erroPdf('Os PDFs gerados ultrapassaram 60 MB. Divida o lote.');
    const nome = nomeArquivo(fonte.nome, i);
    await salvar(nome, 'application/pdf', bytes);
    linhas.push([basename(String(fonte.nome).replaceAll('\\', '/')).slice(0, 128), fonte.quantidade, fonte.tamanho, bytes.length, fonte.tamanho - bytes.length]);
    if (unido) for (const pagina of await unido.copyPages(doc, doc.getPageIndices())) unido.addPage(pagina);
  }
  if (unido) {
    informar(82, 'Unindo os PDFs otimizados');
    const bytes = await unido.save();
    if (bytesSaida + bytes.length > limitesPdf.saidas) throw erroPdf('A cópia unificada ultrapassaria 60 MB de saída. Desative a união ou divida o lote.');
    await salvar('lote-unificado.pdf', 'application/pdf', bytes);
  }
  informar(90, 'Preparando os relatórios de tamanho e páginas');
  const relatorio = { titulo: 'Otimização de PDFs em lote', indicadores: [['Documentos', fontes.length], ['Páginas', paginas], ['Entrada (bytes)', bytesEntrada], ['Saída individual (bytes)', bytesSaida]],
    colunas: ['Documento', 'Páginas', 'Entrada (bytes)', 'Saída (bytes)', 'Economia (bytes)'], linhas,
    metodo: `Conversão com Ghostscript, resolução de imagens de ${perfis[opcoes.perfil]} dpi${opcoes.cinza ? ' em tons de cinza' : ''}. Comparação dos tamanhos reais dos arquivos individuais.`,
    notas: ['Uma economia negativa indica que o PDF cresceu. O total individual exclui a cópia unificada e os relatórios.',
      'A regravação pode alterar transparências e elementos interativos e invalida assinaturas digitais. Conserve os originais.',
      ...(opcoes.removerMetadados ? ['Removidos os campos Info e o XMP do catálogo. O texto visível das páginas é preservado.'] : [])] };
  for (const formato of arquivosDoRelatorio(relatorio, 'relatorio-do-lote')) {
    const arquivo = await formato.gerar();
    await salvar(arquivo.nome, arquivo.tipo, arquivo.bytes);
  }
  informar(96, 'Montando o pacote ZIP');
  await salvar('central-pdf-em-lote.zip', 'application/zip', compactarZip(membros));
  return { arquivos, relatorio, resumo: `${fontes.length} PDF(s) processado(s), com ${paginas} página(s) no total.` };
}

import { lerCsv, detectarSeparador } from './tabular.js';

/** Limites comuns ao texto colado, arquivo CSV e aba escolhida do XLSX. */
export const LIMITES_IMPORTACAO = Object.freeze({ bytes: 10 * 1024 * 1024, descompactado: 40 * 1024 * 1024, linhas: 50000, colunas: 256, celulas: 500000, caracteres: 5000000, arquivosZip: 2000, abas: 100 });

export function lerDadosTexto(conteudo) {
  if (!String(conteudo ?? '').trim()) throw new Error('Escolha um arquivo ou cole os dados da planilha.');
  if (conteudo.length > LIMITES_IMPORTACAO.caracteres) throw new Error('O limite é 5 milhões de caracteres. Divida os dados em partes.');
  return validarTabelaImportada(lerCsv(conteudo, { separador: detectarSeparador(conteudo) }));
}

export function validarTabelaImportada(tabela) {
  if (!Array.isArray(tabela) || !tabela.length || !tabela.some(linha => linha.some(v => String(v ?? '').trim()))) throw new Error('Não encontrei dados nesta planilha.');
  if (tabela.length > LIMITES_IMPORTACAO.linhas) throw new Error('O limite é 50.000 linhas por aba. Divida a planilha em partes.');
  const colunas = tabela.reduce((n, linha) => Math.max(n, linha.length), 0);
  if (colunas > LIMITES_IMPORTACAO.colunas) throw new Error('O limite é 256 colunas por aba.');
  if (colunas * tabela.length > LIMITES_IMPORTACAO.celulas) throw new Error('O limite é 500.000 células por aba. Escolha uma aba menor ou divida a planilha.');
  let caracteres = 0;
  const linhas = tabela.map(linha => Array.from({ length: colunas }, (_, i) => {
    const valor = String(linha[i] ?? '');
    caracteres += valor.length;
    if (valor.length > 32767) throw new Error('Uma célula passa do limite de 32.767 caracteres do Excel.');
    if (caracteres > LIMITES_IMPORTACAO.caracteres) throw new Error('Os dados passam de 5 milhões de caracteres. Divida a planilha em partes.');
    return valor;
  }));
  return { linhas, colunas };
}

/** CSV de trabalho preserva valores; a proteção de fórmulas ocorre na exportação. */
export function tabelaParaTexto(tabela) {
  const texto = tabela.map(linha => linha.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
  if (texto.length > LIMITES_IMPORTACAO.caracteres) throw new Error('O conteúdo convertido passa de 5 milhões de caracteres. Divida a planilha.');
  return texto;
}

/** Confere o pacote e seus tamanhos antes de entregar dados ao leitor de planilhas. */
export async function conferirPacoteXlsx(bytes) {
  const erro = () => new Error('Não foi possível ler este XLSX. Use um arquivo válido, sem senha, ou salve a aba como CSV.');
  if (!(bytes instanceof Uint8Array) || bytes.length < 22 || bytes.length > LIMITES_IMPORTACAO.bytes) throw erro();
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fim = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (vista.getUint32(i, true) === 0x06054b50 && i + 22 + vista.getUint16(i + 20, true) === bytes.length) { fim = i; break; }
  if (fim < 0 || vista.getUint16(fim + 4, true) || vista.getUint16(fim + 6, true)) throw erro();
  const quantidade = vista.getUint16(fim + 10, true), tamanho = vista.getUint32(fim + 12, true), inicio = vista.getUint32(fim + 16, true);
  if (!quantidade || quantidade > LIMITES_IMPORTACAO.arquivosZip || vista.getUint16(fim + 8, true) !== quantidade || inicio + tamanho !== fim) throw erro();
  let pos = inicio, total = 0;
  const nomes = new Set();
  for (let i = 0; i < quantidade; i++) {
    if (pos + 46 > fim || vista.getUint32(pos, true) !== 0x02014b50) throw erro();
    const flags = vista.getUint16(pos + 8, true), metodo = vista.getUint16(pos + 10, true), comprimido = vista.getUint32(pos + 20, true), expandido = vista.getUint32(pos + 24, true);
    const n = vista.getUint16(pos + 28, true), extra = vista.getUint16(pos + 30, true), comentario = vista.getUint16(pos + 32, true), local = vista.getUint32(pos + 42, true);
    if (flags & 1 || ![0, 8].includes(metodo) || pos + 46 + n + extra + comentario > fim || local + 30 > inicio) throw erro();
    const nome = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + n));
    if (nomes.has(nome) || nome.startsWith('/') || nome.includes('\\') || nome.split('/').includes('..') || /vbaProject\.bin$/i.test(nome)) throw erro();
    nomes.add(nome);total += expandido;
    if (total > LIMITES_IMPORTACAO.descompactado) throw new Error('Este XLSX expande para mais de 40 MB. Divida a planilha em partes.');
    if (vista.getUint32(local, true) !== 0x04034b50 || vista.getUint16(local + 8, true) !== metodo || vista.getUint16(local + 6, true) & 1) throw erro();
    const localN = vista.getUint16(local + 26, true), dados = local + 30 + localN + vista.getUint16(local + 28, true);
    if (dados + comprimido > inicio || new TextDecoder().decode(bytes.subarray(local + 30, local + 30 + localN)) !== nome) throw erro();
    if (metodo === 0) { if (expandido !== comprimido) throw erro(); }
    else {
      // Conta a expansão real em fluxo: um tamanho mentiroso não pode alocar uma bomba.
      if (typeof DecompressionStream === 'undefined') throw new Error('Seu navegador não consegue ler este XLSX. Use CSV ou atualize o navegador.');
      const leitor = new Blob([bytes.subarray(dados, dados + comprimido)]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      let lidos = 0;
      try { while (true) { const parte = await leitor.read(); if (parte.done) break; lidos += parte.value.length; if (lidos > expandido || lidos > LIMITES_IMPORTACAO.descompactado) { await leitor.cancel(); throw erro(); } } }
      catch { throw erro(); }
      finally { leitor.releaseLock(); }
      if (lidos !== expandido) throw erro();
    }
    pos += 46 + n + extra + comentario;
  }
  if (pos !== fim || !nomes.has('[Content_Types].xml') || !nomes.has('xl/workbook.xml') || ![...nomes].some(n => /^xl\/worksheets\/[^/]+\.xml$/.test(n))) throw erro();
}

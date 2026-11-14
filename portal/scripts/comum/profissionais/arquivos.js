/** Importação local de valores/texto e exportação integral dos relatórios profissionais.
 * Não executa fórmulas, macros, OCR nem conteúdo ativo dos arquivos. */
import { lerCsv, detectarSeparador } from '../../cálculos/tabular.js';
import { validarCsvProfissional } from '../../cálculos/validar-csv-profissional.js';
import { decodificarTexto, recusarSeNãoForTexto } from '../../cálculos/converter-planilha.js';
import { lerZip, extrairEntrada } from '../../cálculos/zip.js';
import { montarCsv } from '../../núcleo/exportar.js';
import { gerarExcelComAbas } from './excel-abas.js';
import { gerarPdfRelatorio } from './pdf-relatorio.js';
import { graficoRelatorioSvg } from './grafico-svg.js';

export const LIMITES_ARQUIVOS = Object.freeze({ bytes: 10 * 1024 * 1024, descompactado: 30 * 1024 * 1024,
  entradasZip: 1500, paginas: 100, linhas: 2000, colunas: 80, celulas: 160080, texto: 1000000, celula: 32767 });
const utf8 = new TextEncoder();
const falhar = (mensagem) => { throw new Error(mensagem); };
function limitarTexto(texto) {
  if (!texto.trim()) falhar('O arquivo não contém texto ou dados utilizáveis.');
  if (utf8.encode(texto).length > LIMITES_ARQUIVOS.texto) falhar('O conteúdo normalizado ultrapassa 1 MB. Divida o arquivo em partes menores.');
  return texto;
}
const escalar = (valor) => {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string' || typeof valor === 'boolean' || (typeof valor === 'number' && Number.isFinite(valor))) return valor;
  falhar('Cada célula precisa conter texto, número, booleano ou null. Objetos e listas dentro de células não são aceitos.');
};
function conferirTabela(tabela) {
  if (!Array.isArray(tabela) || tabela.length < 2) falhar('A tabela precisa de cabeçalho e pelo menos uma linha de dados.');
  if (tabela.length - 1 > LIMITES_ARQUIVOS.linhas) falhar('O limite de importação é 2.000 linhas de dados. Divida a tabela.');
  if (!Array.isArray(tabela[0]) || !tabela[0].length || tabela[0].length > LIMITES_ARQUIVOS.colunas) falhar('Use de 1 a 80 colunas.');
  const largura = tabela[0].length;
  if (tabela.length * largura > LIMITES_ARQUIVOS.celulas) falhar('A tabela ultrapassa 160.080 células. Divida a tabela.');
  const cabecalho = tabela[0].map((c) => String(escalar(c)).trim());
  if (cabecalho.some((c) => !c || c.length > 128) || new Set(cabecalho.map((c) => c.toLowerCase())).size !== cabecalho.length) falhar('Use nomes de coluna com até 128 caracteres, preenchidos e sem repetição (inclusive maiúsculas/minúsculas).');
  if (cabecalho.some((c) => ['__proto__', 'prototype', 'constructor'].includes(c.toLowerCase()))) falhar('O cabeçalho contém um nome reservado. Renomeie essa coluna.');
  const dados = tabela.slice(1).map((linha, indice) => {
    if (!Array.isArray(linha) || linha.length !== largura) falhar(`A linha ${indice + 2} tem quantidade de células diferente do cabeçalho. Confira o separador.`);
    return linha.map((v) => {
      const c = escalar(v);
      if (String(c).length > LIMITES_ARQUIVOS.celula) falhar('Uma célula ultrapassa 32.767 caracteres. Divida seu conteúdo.');
      return c;
    });
  });
  if (!dados.some((linha) => linha.some((c) => String(c).trim()))) falhar('A tabela tem cabeçalho, mas não contém dados preenchidos.');
  return { conteudo: limitarTexto(montarCsv([cabecalho, ...dados], { comBom: false, protegerFórmulas: false })), linhas: dados.length };
}
function tabelaJson(texto) {
  let lista;
  try { lista = JSON.parse(texto); } catch { falhar('JSON inválido. Use uma lista de objetos, uma lista de listas com cabeçalho ou um relatório com colunas e linhas.'); }
  if (lista && !Array.isArray(lista) && Array.isArray(lista.colunas) && Array.isArray(lista.linhas)) return [lista.colunas, ...lista.linhas];
  if (!Array.isArray(lista) || !lista.length) falhar('O JSON precisa ser uma lista não vazia de objetos ou listas.');
  if (lista.every(Array.isArray)) return lista;
  if (!lista.every((item) => item && typeof item === 'object' && !Array.isArray(item))) falhar('O JSON mistura tipos de linha. Use somente objetos ou somente listas.');
  const chaves = [...new Set(lista.flatMap(Object.keys))];
  return [chaves, ...lista.map((objeto) => chaves.map((c) => Object.hasOwn(objeto, c) ? objeto[c] : ''))];
}
/** Confere também os tamanhos reais descompactados e o CRC antes de entregar o pacote ao parser. */
async function pacoteOffice(bytes, obrigatorio) {
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4)) falhar('O arquivo não tem a assinatura de um pacote Office válido. Salve novamente como XLSX ou DOCX.');
  const pacote = lerZip(bytes);
  if (pacote.entradas.length > LIMITES_ARQUIVOS.entradasZip || pacote.tamanhoTotal > LIMITES_ARQUIVOS.descompactado) falhar('O pacote ultrapassa 1.500 entradas ou 30 MB descompactados. Divida o arquivo.');
  const nomes = new Set();
  const extraidos = new Map();
  let total = 0;
  for (const entrada of pacote.entradas) {
    if (entrada.recusa) falhar(`Pacote Office recusado: ${entrada.recusa}.`);
    if (nomes.has(entrada.nome.toLowerCase())) falhar('Pacote Office inválido: há entradas com nomes repetidos.');
    nomes.add(entrada.nome.toLowerCase());
    if (/vbaProject|macrosheets|activeX/i.test(entrada.nome)) falhar('O pacote contém macros ou controles ativos. Salve uma cópia sem macros.');
    if (entrada.éPasta) continue;
    const dados = await extrairEntrada(bytes, entrada);
    total += dados.length;
    if (total > LIMITES_ARQUIVOS.descompactado) falhar('O conteúdo descompactado ultrapassa 30 MB.');
    if (entrada.nome === obrigatorio || entrada.nome === '[Content_Types].xml') extraidos.set(entrada.nome, dados);
  }
  if (!extraidos.has(obrigatorio) || !extraidos.has('[Content_Types].xml')) falhar('O pacote não corresponde à extensão informada ou está incompleto.');
  if (/<Override\b[^>]*(?:macroEnabled|vbaProject)/i.test(new TextDecoder().decode(extraidos.get('[Content_Types].xml')))) falhar('Este pacote contém macros. Salve uma cópia sem macros.');
  return extraidos;
}
async function importarXlsx(bytes) {
  await pacoteOffice(bytes, 'xl/workbook.xml');
  const leitor = await import('../../../recursos/bibliotecas/xlsx-0.20.3.mjs');
  const livro = leitor.read(bytes, { type: 'array', sheets: 0, sheetRows: LIMITES_ARQUIVOS.linhas + 2,
    cellHTML: false, cellFormula: true, sheetStubs: true, cellStyles: false, cellText: false, cellDates: false, bookVBA: false });
  const nome = livro.SheetNames?.[0];
  const aba = livro.Sheets?.[nome];
  if (!aba?.['!ref']) falhar('A primeira aba do XLSX está vazia. Mova a aba desejada para a primeira posição.');
  const faixa = leitor.utils.decode_range(aba['!fullref'] || aba['!ref']);
  const altura = faixa.e.r - faixa.s.r + 1;
  const largura = faixa.e.c - faixa.s.c + 1;
  if (altura > LIMITES_ARQUIVOS.linhas + 1 || largura > LIMITES_ARQUIVOS.colunas || altura * largura > LIMITES_ARQUIVOS.celulas) falhar('A primeira aba ultrapassa 2.000 linhas, 80 colunas ou 160.080 células. Divida a tabela.');
  let formulas = 0;
  const tabela = Array.from({ length: altura }, (_, r) => Array.from({ length: largura }, (_, c) => {
    const celula = aba[leitor.utils.encode_cell({ r: faixa.s.r + r, c: faixa.s.c + c })];
    if (celula?.f) {
      formulas++;
      if (celula.v === undefined || celula.t === 'z') falhar('Há fórmula sem resultado salvo. Recalcule e salve no Excel/LibreOffice ou exporte os valores como CSV.');
    }
    if (celula?.t === 'e') falhar('A primeira aba contém uma célula com erro do Excel. Corrija os erros antes de importar.');
    return celula?.v ?? '';
  }));
  const resultado = conferirTabela(tabela);
  resultado.aviso = `Importada a primeira aba: ${nome}.${livro.SheetNames.length > 1 ? ` O arquivo contém ${livro.SheetNames.length} abas; as demais não foram importadas.` : ''} Somente valores; formatação e gráficos não são preservados. Datas numéricas do Excel permanecem números: converta-as para ISO no original.${formulas ? ' Fórmulas não foram executadas; usados somente resultados salvos, que podem estar desatualizados.' : ''}`;
  return resultado;
}
function entidadeXml(texto) {
  if (/&(?!(?:#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);)/i.test(texto)) falhar('DOCX com entidade XML desconhecida ou incompleta.');
  return texto.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    const nomes = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (nomes[e]) return nomes[e];
    const n = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    if (!Number.isInteger(n) || n < 1 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) falhar('DOCX com entidade XML inválida.');
    return String.fromCodePoint(n);
  });
}
async function importarDocx(bytes) {
  const pacote = await pacoteOffice(bytes, 'word/document.xml');
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(pacote.get('word/document.xml'));
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) falhar('DOCX com entidades XML externas não é aceito.');
  const pilha = [], partes = [];
  let corpo = false, texto = false;
  // Tokenizador restrito: nenhum XML é inserido no DOM e nenhuma relação externa é seguida.
  const tokens = xml.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]*>|[^<]+/g) || [];
  if (tokens.join('') !== xml) falhar('O XML do DOCX está malformado.');
  for (const token of tokens) {
    if (token.startsWith('<!--') || token.startsWith('<?')) continue;
    if (!token.startsWith('<')) { if (corpo && texto) partes.push(entidadeXml(token)); continue; }
    const tag = /^<(\/?)\s*([\w:.-]+)(?:\s[\s\S]*?)?\s*(\/?)>$/.exec(token);
    if (!tag) falhar('O XML do DOCX está malformado. Salve o documento novamente.');
    const nome = tag[2], local = nome.split(':').pop();
    if (tag[1]) {
      if (pilha.pop() !== nome) falhar('O XML do DOCX está incompleto ou malformado.');
      if (corpo && local === 'p') partes.push('\n\n');
      if (corpo && local === 'tc') partes.push('\t');
      if (local === 't') texto = false;
      if (local === 'body') corpo = false;
    } else {
      if (!tag[3]) pilha.push(nome);
      if (pilha.length > 128) falhar('O XML do DOCX excede o limite de profundidade.');
      if (local === 'body') corpo = true;
      if (corpo && local === 't' && !tag[3]) texto = true;
      if (corpo && (local === 'br' || local === 'cr')) partes.push('\n');
      if (corpo && local === 'tab') partes.push('\t');
    }
  }
  if (pilha.length) falhar('O XML do DOCX está incompleto.');
  return { conteudo: limitarTexto(partes.join('').replace(/\n{3,}/g, '\n\n').trim()), aviso: 'Extraído o texto do corpo principal do DOCX. Layout, imagens, cabeçalhos, rodapés e notas não são preservados; não há OCR.' };
}
async function importarPdf(bytes) {
  if (new TextDecoder('ascii').decode(bytes.subarray(0, 5)) !== '%PDF-') falhar('O arquivo não tem a assinatura de um PDF válido.');
  const { abrirComPdfjsParaTexto } = await import('../../ferramentas/auxiliares/pdfjs-textos.js');
  const { montarTextoDaPágina } = await import('../../cálculos/extrair-texto-de-pdf.js');
  let documento;
  try {
    documento = await abrirComPdfjsParaTexto(bytes);
    if (documento.páginas > LIMITES_ARQUIVOS.paginas) falhar('O PDF ultrapassa 100 páginas. Divida o documento antes de importar.');
    const partes = [], vazias = [];
    let tamanho = 0;
    for (let p = 1; p <= documento.páginas; p++) {
      const trecho = montarTextoDaPágina((await documento.texto(p)).itens);
      if (!trecho.trim()) vazias.push(p);
      partes.push(trecho);
      tamanho += utf8.encode(trecho).length + 2;
      if (tamanho > LIMITES_ARQUIVOS.texto) falhar('O texto extraído ultrapassa 1 MB. Divida o PDF.');
    }
    if (partes.every((p) => !p.trim())) falhar('Este PDF não contém texto extraível. PDFs escaneados ou só com imagens exigem OCR, que não é oferecido aqui.');
    return { conteudo: limitarTexto(partes.join('\n\n').trim()), aviso: `Extraído somente texto incorporado no PDF, na ordem do arquivo. Layout e tabelas não são preservados; não há OCR.${vazias.length ? ` ${vazias.length} página(s) sem texto extraível foram ignoradas.` : ''}` };
  } catch (erro) {
    if (erro?.name === 'PasswordException') falhar('O PDF está protegido por senha. Importe uma cópia sem proteção.');
    if (['InvalidPDFException', 'UnknownErrorException'].includes(erro?.name)) falhar('Não foi possível ler o PDF: arquivo incompleto, corrompido ou incompatível.');
    throw erro;
  } finally { if (documento) await documento.fechar(); }
}
/** Retorna conteúdo normalizado para revisão antes do processamento remoto. */
export async function importarArquivo(file, { entrada = 'tabela', colunas = [] } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') falhar('Escolha um arquivo para importar.');
  if (!['tabela', 'documento'].includes(entrada)) falhar('Tipo de entrada inválido.');
  const extensao = /\.([a-z0-9]+)$/i.exec(file.name || '')?.[1]?.toLowerCase();
  const permitidas = entrada === 'tabela' ? ['csv', 'tsv', 'txt', 'json', 'xlsx'] : ['txt', 'md', 'json', 'srt', 'vtt', 'pdf', 'docx'];
  if (!permitidas.includes(extensao)) falhar(`Formato não suportado. Escolha ${permitidas.map((e) => e.toUpperCase()).join(', ')}.`);
  if (!Number.isInteger(file.size) || file.size <= 0) falhar('O arquivo está vazio ou tem tamanho inválido.');
  if (file.size > LIMITES_ARQUIVOS.bytes) falhar('O limite por arquivo é 10 MB. Divida o arquivo.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length || bytes.length > LIMITES_ARQUIVOS.bytes) falhar('O arquivo está vazio ou ultrapassa 10 MB.');
  if (bytes.length !== file.size) falhar('O tamanho lido difere do arquivo selecionado. Selecione o arquivo novamente.');
  let resultado;
  if (extensao === 'xlsx') resultado = await importarXlsx(bytes);
  else if (extensao === 'docx') resultado = await importarDocx(bytes);
  else if (extensao === 'pdf') resultado = await importarPdf(bytes);
  else {
    const recusa = recusarSeNãoForTexto(bytes);
    if (recusa) falhar(recusa);
    const { texto, codificação } = decodificarTexto(bytes);
    if (/[\u0000-\u0008\u000b\u000e-\u001f]/.test(texto)) falhar('O arquivo contém dados binários ou controles inválidos. Salve uma cópia em UTF-8.');
    limitarTexto(texto);
    if (entrada === 'documento') resultado = { conteudo: texto };
    else {
      const separador = extensao === 'tsv' ? '\t' : detectarSeparador(texto);
      if (extensao !== 'json') validarCsvProfissional(texto, { separador });
      resultado = conferirTabela(extensao === 'json' ? tabelaJson(texto) : lerCsv(texto, { separador }));
    }
    if (codificação !== 'UTF-8') resultado.aviso = `Texto decodificado como ${codificação}. Confira os acentos antes de processar.`;
  }
  if (entrada === 'tabela' && colunas.length) {
    const cabecalho = lerCsv(resultado.conteudo, { separador: ';' })[0];
    const faltam = colunas.map((c) => typeof c === 'string' ? c : c.chave).filter((c) => !cabecalho.includes(c));
    if (faltam.length) resultado.aviso = [resultado.aviso, `Revise o cabeçalho: a ferramenta espera ${faltam.join(', ')}.`].filter(Boolean).join(' ');
  }
  return resultado;
}
function conferirRelatorio(r) {
  if (!r || typeof r.titulo !== 'string' || !Array.isArray(r.colunas) || !Array.isArray(r.linhas) || !r.colunas.length) falhar('Relatório inválido para exportação.');
  if (r.linhas.length > 10000 || r.colunas.length > 100 || r.linhas.length * r.colunas.length > 1000000) falhar('Relatório ultrapassa os limites de exportação: 10.000 linhas, 100 colunas e 1.000.000 de células.');
  for (const nome of r.colunas) if (typeof nome !== 'string' || nome.length > 300) falhar('Cabeçalho de relatório inválido ou maior que 300 caracteres.');
  for (const linha of r.linhas) {
    if (!Array.isArray(linha) || linha.length !== r.colunas.length) falhar('Relatório com linha incompleta.');
    for (const v of linha) if ((v !== null && !['string', 'number', 'boolean'].includes(typeof v)) || (typeof v === 'number' && !Number.isFinite(v))) falhar('Relatório contém uma célula inválida.');
  }
  return r;
}
function csvSeguro(linhas, opcoes = {}) {
  // O tipo é respeitado: números continuam números; texto nunca se torna fórmula.
  const protegidas = linhas.map((linha) => linha.map((v) => typeof v === 'string' && (/^[\s\u0000-\u001f\u007f\uFEFF]*[=+@-]/.test(v) || /^[\t\r\n]/.test(v)) ? `\'${v}` : v));
  return montarCsv(protegidas, { ...opcoes, protegerFórmulas: false });
}
function textoExcel(v) {
  const texto = v === null ? '' : String(v);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(texto) || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(texto)) falhar('O conteúdo contém caracteres incompatíveis com o XML do Excel. Para preservar o original, exporte como JSON ou TXT.');
  // ST_Xstring interpreta _xNNNN_: escape somente o underscore original, sem reprocessar o inserido.
  return texto.replace(/_(?=x[0-9a-f]{4}_)/gi, '_x005F_').replace(/\r/g, '_x000D_');
}
function excelRelatorio(r) {
  const indicadores = [['Indicador', 'Valor'], ...(r.indicadores || [])];
  if ([r.colunas, ...r.linhas, ...indicadores].some((linha) => linha.some((v) => typeof v === 'string' && v.length > 32767))) falhar('O Excel aceita até 32.767 caracteres por célula. Para preservar todo o conteúdo, exporte como JSON, TXT ou PDF.');
  const metodo = [['Seção', 'Item', 'Parte', 'Conteúdo']];
  const adicionar = (secao, item, texto) => {
    const valor = String(texto ?? '');
    let inicio = 0, parte = 1;
    do {
      let fim = Math.min(inicio + 32000, valor.length);
      if (fim < valor.length && /[\uD800-\uDBFF]/.test(valor[fim - 1])) fim--;
      metodo.push([secao, item, parte++, valor.slice(inicio, fim)]);
      inicio = fim;
    } while (inicio < valor.length);
  };
  adicionar('Relatório', 1, r.titulo);
  adicionar('Método', 1, r.metodo);
  (r.notas || []).forEach((nota, i) => adicionar('Premissa', i + 1, nota));
  const tipar = (linhas) => linhas.map((linha, indice) => linha.map((v) => typeof v === 'number' ? { número: v } : { texto: textoExcel(v), ...(indice === 0 ? { estilo: 'cabeçalho' } : {}) }));
  return gerarExcelComAbas({ titulo: r.titulo, autor: 'Ander Flow', abas: [
    { nome: 'Dados', linhas: tipar([r.colunas, ...r.linhas]) },
    { nome: 'Indicadores', linhas: tipar(indicadores) },
    { nome: 'Método', linhas: tipar(metodo) },
  ] });
}
function textoRelatorio(r) {
  return [r.titulo, '', 'INDICADORES', ...(r.indicadores || []).map(([k, v]) => `${k}: ${v ?? 'Não aplicável'}`), '',
    'DADOS (CSV; textos que poderiam virar fórmulas são protegidos por apóstrofo)', csvSeguro([r.colunas, ...r.linhas], { comBom: false }), '',
    'MÉTODO', r.metodo || '', '', 'NOTAS E PREMISSAS', ...(r.notas || [])].join('\n');
}
/** Cada gerador entrega bytes, nome e MIME; a interface utiliza o download comum do portal. */
export function arquivosDoRelatorio(relatorio, slug = 'relatorio') {
  const r = conferirRelatorio(relatorio);
  const nomeBase = String(slug).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 100) || 'relatorio';
  const arquivo = (extensao, tipo, gerar) => async () => ({ nome: `${nomeBase}.${extensao}`, tipo, bytes: await gerar() });
  const arquivos = [
    { rótulo: 'PDF', ícone: 'arquivo', gerar: arquivo('pdf', 'application/pdf', () => gerarPdfRelatorio(r, { slug })) },
    { rótulo: 'Excel', ícone: 'planilha', gerar: arquivo('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', () => excelRelatorio(r)) },
    { rótulo: 'TXT', ícone: 'arquivo', gerar: arquivo('txt', 'text/plain;charset=utf-8', () => utf8.encode(textoRelatorio(r))) },
    { rótulo: 'CSV', ícone: 'planilha', gerar: arquivo('csv', 'text/csv;charset=utf-8', () => utf8.encode(csvSeguro([r.colunas, ...r.linhas]))) },
    { rótulo: 'JSON', ícone: 'arquivo', gerar: arquivo('json', 'application/json;charset=utf-8', () => utf8.encode(JSON.stringify(r, null, 2))) },
  ];
  if (Array.isArray(r.series) && r.series.length && r.series.every((s) => s && typeof s.nome === 'string' && typeof s.valor === 'number' && Number.isFinite(s.valor))) {
    arquivos.push({ rótulo: 'SVG', ícone: 'imagem', gerar: arquivo('svg', 'image/svg+xml;charset=utf-8', () => graficoRelatorioSvg(r)) });
  }
  return arquivos;
}

// limpar-planilha-exportacao.js — geração dos arquivos de saída (etapa 4): CSV em UTF-8 com BOM
// e o separador original, e XLSX. A biblioteca SheetJS é injetada por quem chama (ver
// limpar-planilha-leitura.js). Funções puras (devolvem texto/bytes); `gerarBlobCsv`/`gerarBlobXlsx`
// usam `Blob`, disponível também no Node 20+, para permitir teste de ida e volta sem navegador.

const BOM_UTF8 = '﻿';

function precisaDeAspas(valor, separador) {
  return /["\n\r]/.test(valor) || valor.includes(separador);
}

function escaparCampoCsv(valor, separador) {
  const texto = valor == null ? '' : String(valor);
  if (!precisaDeAspas(texto, separador)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Gera o texto CSV (sem BOM) com o separador informado, terminando linhas em `\r\n`. Função pura. */
export function gerarTextoCsv({ cabecalho, linhas }, separador = ',') {
  const todasAsLinhas = [cabecalho, ...linhas];
  return todasAsLinhas.map((linha) => linha.map((valor) => escaparCampoCsv(valor, separador)).join(separador)).join('\r\n');
}

/** Igual a `gerarTextoCsv`, mas com o BOM UTF-8 no início (para abrir certo no Excel). Função pura. */
export function gerarTextoCsvComBom(dados, separador = ',') {
  return BOM_UTF8 + gerarTextoCsv(dados, separador);
}

/** `Blob` do CSV (UTF-8 com BOM), pronto para baixar. */
export function gerarBlobCsv(dados, separador = ',') {
  return new Blob([gerarTextoCsvComBom(dados, separador)], { type: 'text/csv;charset=utf-8' });
}

/** Bytes (`Uint8Array`) de um XLSX com uma aba a partir de `{cabecalho, linhas}`. Recebe o módulo SheetJS. */
export function gerarBytesXlsx(modulo, { cabecalho, linhas }, nomeAba = 'Planilha') {
  const planilha = modulo.utils.aoa_to_sheet([cabecalho, ...linhas]);
  const livro = modulo.utils.book_new();
  modulo.utils.book_append_sheet(livro, planilha, nomeAba.slice(0, 31));
  return modulo.write(livro, { bookType: 'xlsx', type: 'array' });
}

/** `Blob` do XLSX, pronto para baixar. Recebe o módulo SheetJS. */
export function gerarBlobXlsx(modulo, dados, nomeAba) {
  const bytes = gerarBytesXlsx(modulo, dados, nomeAba);
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** `<nome-original>-limpo.<extensao>`, trocando só a extensão final. Função pura. */
export function nomeArquivoLimpo(nomeOriginal, extensao) {
  const semExtensao = String(nomeOriginal ?? 'planilha').replace(/\.[^./\\]+$/, '');
  return `${semExtensao}-limpo.${extensao}`;
}

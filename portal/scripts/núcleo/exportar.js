/** Saídas comuns a todas as ferramentas: copiar, baixar, CSV, planilha e PDF. */
import { gerarPlanilhaXlsx } from '../comum/exportação/gerar-planilha-xlsx.js';

/**
 * Copia texto para a área de transferência, com alternativa quando o
 * navegador recusa a permissão.
 * @param {string} texto
 * @returns {Promise<'copiado'|'manual'>}
 */
export async function copiar(texto) {
  try {
    if (navigator.clipboard && isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return 'copiado';
    }
  } catch { /* cai para a alternativa manual */ }
  return 'manual';
}

/**
 * Entrega um arquivo para download.
 * @param {BlobPart} conteúdo
 * @param {string} nome nome do arquivo
 * @param {string} tipo tipo MIME
 */
export function baixar(conteúdo, nome, tipo) {
  const blob = conteúdo instanceof Blob ? conteúdo : new Blob([conteúdo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const ligação = document.createElement('a');
  ligação.href = url;
  ligação.download = nome;
  document.body.append(ligação);
  ligação.click();
  ligação.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Converte linhas em CSV com escape correto e BOM, para o Excel abrir com acento.
 * @param {readonly (readonly unknown[])[]} linhas
 * @param {{separador?: string, comBom?: boolean}} [opções]
 * @returns {string}
 */
export function montarCsv(linhas, { separador = ';', comBom = true } = {}) {
  const escapar = (célula) => {
    const texto = célula === null || célula === undefined ? '' : String(célula);
    return /["\n\r]|[;,\t]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const corpo = linhas.map((linha) => linha.map(escapar).join(separador)).join('\r\n');
  return (comBom ? '﻿' : '') + corpo;
}

/**
 * Baixa um CSV.
 * @param {readonly (readonly unknown[])[]} linhas
 * @param {string} nome sem extensão
 * @param {{separador?: string}} [opções]
 */
export function baixarCsv(linhas, nome, opções = {}) {
  baixar(montarCsv(linhas, opções), `${nome}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Baixa uma planilha .xlsx gerada no próprio navegador.
 * @param {readonly (readonly unknown[])[]} linhas primeira linha é o cabeçalho
 * @param {string} nome sem extensão
 * @param {{aba?: string, larguras?: number[], título?: string}} [opções]
 */
export function baixarPlanilha(linhas, nome, { aba = 'Dados', larguras = [], título } = {}) {
  const bytes = gerarPlanilhaXlsx({
    nomeDaAba: aba,
    linhas,
    largurasDasColunas: larguras,
    corDoCabeçalho: '#9a3d28',
    título: título ?? nome,
    autor: 'Portal de Ferramentas',
  });
  baixar(bytes, `${nome}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * Baixa um PDF já gerado em bytes.
 * @param {Uint8Array} bytes
 * @param {string} nome sem extensão
 */
export function baixarPdf(bytes, nome) {
  baixar(bytes, `${nome}.pdf`, 'application/pdf');
}

/**
 * Monta um nome de arquivo seguro a partir de um texto livre.
 * @param {string} base
 * @returns {string}
 */
export function nomeDeArquivo(base) {
  return String(base ?? 'arquivo')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'arquivo';
}

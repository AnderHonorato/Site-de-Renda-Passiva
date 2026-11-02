// Monta o PDF de "Tabuada": folha de atividade com as multiplicações em branco e o
// gabarito em página separada. Usa criarDocumentoPdf (comum).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

const MARGEM_MM = 18;
const LARGURA_MM = 210;
const ALTURA_MM = 297;

function desenharCabeçalho(documento, título, comCabeçalho) {
  let y = MARGEM_MM;
  documento.texto(MARGEM_MM, y, título || 'Tabuada', { tamanho: 16, negrito: true });
  y += 9;
  if (comCabeçalho) {
    documento.texto(MARGEM_MM, y, 'Nome: _______________________________________', { tamanho: 11 });
    documento.texto(LARGURA_MM - MARGEM_MM - 48, y, 'Data: ____ / ____ / ______', { tamanho: 11 });
    y += 8;
  }
  documento.linha(MARGEM_MM, y, LARGURA_MM - MARGEM_MM, y, { espessura: 0.4, cor: '#a3a3a3' });
  return y + 8;
}

function desenharItens(documento, itens, yInicial, mostrarRespostas, título) {
  const colunas = 3;
  const larguraColuna = (LARGURA_MM - MARGEM_MM * 2) / colunas;
  const alturaLinha = 11;
  const linhasPorPágina = Math.max(1, Math.floor((ALTURA_MM - MARGEM_MM - yInicial) / alturaLinha));
  let coluna = 0;
  let linha = 0;
  let y = yInicial;
  for (const [índice, item] of itens.entries()) {
    if (linha >= linhasPorPágina) {
      documento.novaPágina();
      y = desenharCabeçalho(documento, título, false);
      linha = 0;
    }
    const resposta = mostrarRespostas ? String(item.resposta) : '_____';
    documento.texto(MARGEM_MM + coluna * larguraColuna, y + linha * alturaLinha, `${índice + 1})  ${item.fator} × ${item.multiplicador} = ${resposta}`, { tamanho: 13 });
    coluna += 1;
    if (coluna >= colunas) {
      coluna = 0;
      linha += 1;
    }
  }
}

export function gerarPdfDeTabuada({ itens, tituloDaAtividade = '', comCabeçalho = false, sementeUsada, ordem }) {
  const título = tituloDaAtividade || 'Tabuada';
  const documento = criarDocumentoPdf({ título });
  documento.novaPágina();
  const yInicial = desenharCabeçalho(documento, título, comCabeçalho);
  desenharItens(documento, itens, yInicial, false, título);

  const rodapé = ordem === 'embaralhada' && sementeUsada !== undefined ? `Ordem embaralhada — semente ${sementeUsada}` : sementeUsada !== undefined ? `Semente usada nesta folha: ${sementeUsada}` : '';
  if (rodapé) documento.texto(MARGEM_MM, ALTURA_MM - 9, rodapé, { tamanho: 8, cor: '#999999' });

  documento.novaPágina();
  const yGabarito = desenharCabeçalho(documento, `Gabarito — ${título}`, false);
  desenharItens(documento, itens, yGabarito, true, `Gabarito — ${título}`);

  return documento.gerarBytes();
}

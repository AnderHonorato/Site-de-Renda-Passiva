// Monta o PDF de "Caligrafia" a partir da geometria de calcularFolhaDeCaligrafia: três
// linhas-guia por linha (ascendente, x-altura tracejada e base) e o texto repetido —
// a primeira ocorrência sólida (modelo) e as demais em contorno/cinza claro, para que
// sejam realmente cobríveis (a fonte Helvetica do PDF não tem uma variante pontilhada).
// Esta atividade não tem "resposta certa", então não há gabarito separado.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

const MARGEM_MM = 18;
const LARGURA_MM = 210;
const ALTURA_MM = 297;

function desenharCabeçalho(documento, título, comCabeçalho) {
  let y = MARGEM_MM;
  documento.texto(MARGEM_MM, y, título || 'Caligrafia', { tamanho: 16, negrito: true });
  y += 9;
  if (comCabeçalho) {
    documento.texto(MARGEM_MM, y, 'Nome: _______________________________________', { tamanho: 11 });
    documento.texto(LARGURA_MM - MARGEM_MM - 48, y, 'Data: ____ / ____ / ______', { tamanho: 11 });
    y += 8;
  }
  documento.linha(MARGEM_MM, y, LARGURA_MM - MARGEM_MM, y, { espessura: 0.4, cor: '#a3a3a3' });
  return y;
}

export function gerarPdfDeCaligrafia({ folha, tituloDaAtividade = '', comCabeçalho = false }) {
  const título = tituloDaAtividade || `Caligrafia — ${folha.texto}`;
  const documento = criarDocumentoPdf({ título });
  documento.novaPágina();
  desenharCabeçalho(documento, título, comCabeçalho);

  const larguraLinha = folha.larguraPáginaMm - folha.margemMm * 2;
  for (const linha of folha.linhas) {
    documento.linha(folha.margemMm, linha.ascendenteYMm, folha.margemMm + larguraLinha, linha.ascendenteYMm, { espessura: 0.25, cor: '#c9c9c9' });
    documento.linha(folha.margemMm, linha.xAlturaYMm, folha.margemMm + larguraLinha, linha.xAlturaYMm, { espessura: 0.25, cor: '#c9c9c9', tracejado: [1.5, 1.5] });
    documento.linha(folha.margemMm, linha.baselineYMm, folha.margemMm + larguraLinha, linha.baselineYMm, { espessura: 0.4, cor: '#4d4d4d' });

    for (const repetição of linha.repetições) {
      documento.texto(repetição.xMm, linha.baselineYMm, folha.texto, {
        tamanho: folha.tamanhoDaLetra,
        contorno: repetição.contorno,
        cor: repetição.contorno ? '#9a9a9a' : '#141414',
      });
    }
  }

  if (folha.limitadoPelaPágina) {
    documento.texto(folha.margemMm, folha.alturaPáginaMm - 9, 'Algumas linhas ou repetições foram ajustadas para caber na folha A4.', { tamanho: 8, cor: '#999999' });
  }

  return documento.gerarBytes();
}

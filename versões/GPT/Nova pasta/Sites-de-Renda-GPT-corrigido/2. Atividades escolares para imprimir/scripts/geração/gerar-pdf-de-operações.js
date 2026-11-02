// Monta o PDF de "Operações matemáticas": folha de atividade (respostas em branco)
// seguida do gabarito em página separada, sem anúncios nem faixa de apoio — o PDF é
// material impresso, não uma página do site. Usa criarDocumentoPdf (comum) e paginação
// simples baseada no espaço restante da página A4.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

const MARGEM_MM = 18;
const LARGURA_MM = 210;
const ALTURA_MM = 297;
const SÍMBOLO_DO_OPERADOR = { '+': '+', '−': '−', '×': '×', '÷': '÷' };

function textoDaResposta(operação) {
  if (operação.operador === '÷' && operação.resto) return `${operação.resposta} (resto ${operação.resto})`;
  return String(operação.resposta);
}

function desenharCabeçalho(documento, título, comCabeçalho) {
  let y = MARGEM_MM;
  documento.texto(MARGEM_MM, y, título || 'Atividade de matemática', { tamanho: 16, negrito: true });
  y += 9;
  if (comCabeçalho) {
    documento.texto(MARGEM_MM, y, 'Nome: _______________________________________', { tamanho: 11 });
    documento.texto(LARGURA_MM - MARGEM_MM - 48, y, 'Data: ____ / ____ / ______', { tamanho: 11 });
    y += 8;
  }
  documento.linha(MARGEM_MM, y, LARGURA_MM - MARGEM_MM, y, { espessura: 0.4, cor: '#a3a3a3' });
  return y + 8;
}

function desenharApresentaçãoEmLinha(documento, operações, yInicial, mostrarRespostas) {
  const colunas = 2;
  const larguraColuna = (LARGURA_MM - MARGEM_MM * 2) / colunas;
  const alturaLinha = 13;
  const linhasPorPágina = Math.max(1, Math.floor((ALTURA_MM - MARGEM_MM - yInicial) / alturaLinha));
  let coluna = 0;
  let linha = 0;
  let y = yInicial;
  for (const [índice, operação] of operações.entries()) {
    if (linha >= linhasPorPágina) {
      documento.novaPágina();
      y = desenharCabeçalho(documento, null, false);
      linha = 0;
    }
    const x = MARGEM_MM + coluna * larguraColuna;
    const resposta = mostrarRespostas ? textoDaResposta(operação) : '________';
    documento.texto(x, y + linha * alturaLinha, `${índice + 1})  ${operação.operandoA} ${SÍMBOLO_DO_OPERADOR[operação.operador]} ${operação.operandoB} = ${resposta}`, { tamanho: 13 });
    coluna += 1;
    if (coluna >= colunas) {
      coluna = 0;
      linha += 1;
    }
  }
}

function desenharApresentaçãoArmada(documento, operações, yInicial, mostrarRespostas) {
  const larguraCaixa = 44;
  const alturaCaixa = 32;
  const colunas = Math.max(1, Math.floor((LARGURA_MM - MARGEM_MM * 2) / larguraCaixa));
  const linhasPorPágina = Math.max(1, Math.floor((ALTURA_MM - MARGEM_MM - yInicial) / alturaCaixa));
  let coluna = 0;
  let linha = 0;
  let y = yInicial;
  for (const [índice, operação] of operações.entries()) {
    if (linha >= linhasPorPágina) {
      documento.novaPágina();
      y = desenharCabeçalho(documento, null, false);
      linha = 0;
    }
    const xCaixa = MARGEM_MM + coluna * larguraCaixa;
    const yCaixa = y + linha * alturaCaixa;
    const bordaDireita = xCaixa + larguraCaixa - 8;
    documento.texto(xCaixa, yCaixa, `${índice + 1})`, { tamanho: 9, cor: '#8a8a8a' });
    documento.texto(bordaDireita, yCaixa + 7, String(operação.operandoA), { tamanho: 15, alinhamento: 'direita' });
    documento.texto(xCaixa + 2, yCaixa + 16, SÍMBOLO_DO_OPERADOR[operação.operador], { tamanho: 15 });
    documento.texto(bordaDireita, yCaixa + 16, String(operação.operandoB), { tamanho: 15, alinhamento: 'direita' });
    documento.linha(xCaixa, yCaixa + 19, xCaixa + larguraCaixa - 6, yCaixa + 19, { espessura: 0.6 });
    if (mostrarRespostas) {
      documento.texto(bordaDireita, yCaixa + 27, textoDaResposta(operação), { tamanho: 12, alinhamento: 'direita', cor: '#333333' });
    }
    coluna += 1;
    if (coluna >= colunas) {
      coluna = 0;
      linha += 1;
    }
  }
}

function desenharGabarito(documento, operações, título) {
  documento.novaPágina();
  let y = desenharCabeçalho(documento, `Gabarito — ${título || 'Atividade de matemática'}`, false);
  const colunas = 3;
  const larguraColuna = (LARGURA_MM - MARGEM_MM * 2) / colunas;
  const alturaLinha = 9;
  const linhasPorPágina = Math.max(1, Math.floor((ALTURA_MM - MARGEM_MM - y) / alturaLinha));
  let coluna = 0;
  let linha = 0;
  for (const [índice, operação] of operações.entries()) {
    if (linha >= linhasPorPágina) {
      documento.novaPágina();
      y = desenharCabeçalho(documento, `Gabarito — ${título || 'Atividade de matemática'}`, false);
      linha = 0;
    }
    documento.texto(MARGEM_MM + coluna * larguraColuna, y + linha * alturaLinha, `${índice + 1}) ${textoDaResposta(operação)}`, { tamanho: 11 });
    coluna += 1;
    if (coluna >= colunas) {
      coluna = 0;
      linha += 1;
    }
  }
}

export function gerarPdfDeOperações({ operações, apresentação = 'linha', tituloDaAtividade = '', comCabeçalho = false, sementeUsada }) {
  const documento = criarDocumentoPdf({ título: tituloDaAtividade || 'Atividade de matemática' });
  documento.novaPágina();
  const yInicial = desenharCabeçalho(documento, tituloDaAtividade, comCabeçalho);

  if (apresentação === 'armada') desenharApresentaçãoArmada(documento, operações, yInicial, false);
  else desenharApresentaçãoEmLinha(documento, operações, yInicial, false);

  if (sementeUsada !== undefined) {
    documento.texto(MARGEM_MM, ALTURA_MM - 9, `Semente usada nesta folha: ${sementeUsada}`, { tamanho: 8, cor: '#999999' });
  }

  desenharGabarito(documento, operações, tituloDaAtividade);

  return documento.gerarBytes();
}

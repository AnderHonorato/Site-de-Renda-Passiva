// Monta o PDF do "Planejador de estudos": uma grade semanal (colunas = dias escolhidos,
// linhas = sessões e pausas, sempre na mesma sequência) e o total de minutos por dia e por
// semana, separando estudo puro de estudo com pausas — nunca promete aprovação, é só uma
// distribuição de tempo. Usa criarDocumentoPdf.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

const MARGEM_MM = 16;
const LARGURA_MM = 210;
const ALTURA_MM = 297;

function rótuloDoBloco(bloco) {
  return bloco.tipo === 'pausa' ? `Pausa — ${bloco.minutos} min` : `${bloco.disciplina} — ${bloco.minutos} min`;
}

function primeiraLetraMaiúscula(texto) {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

function desenharCabeçalho(documento, título, comCabeçalho) {
  let y = MARGEM_MM;
  documento.texto(MARGEM_MM, y, título || 'Planejador de estudos', { tamanho: 16, negrito: true });
  y += 9;
  if (comCabeçalho) {
    documento.texto(MARGEM_MM, y, 'Nome: _______________________________________', { tamanho: 11 });
    documento.texto(LARGURA_MM - MARGEM_MM - 48, y, 'Data: ____ / ____ / ______', { tamanho: 11 });
    y += 8;
  }
  documento.linha(MARGEM_MM, y, LARGURA_MM - MARGEM_MM, y, { espessura: 0.4, cor: '#a3a3a3' });
  return y + 8;
}

function desenharGradeSemanal(documento, gerado, yTopo) {
  const larguraTotal = LARGURA_MM - MARGEM_MM * 2;
  const larguraColuna = larguraTotal / gerado.diasDaSemana.length;
  const alturaCabeçalho = 8;
  const alturaLinha = 8;

  documento.retângulo(MARGEM_MM, yTopo, larguraTotal, alturaCabeçalho, { contorno: true, espessura: 0.4, cor: '#999999', preenchimento: '#f0efe9' });
  gerado.diasDaSemana.forEach((dia, índice) => {
    const x = MARGEM_MM + índice * larguraColuna;
    if (índice > 0) documento.linha(x, yTopo, x, yTopo + alturaCabeçalho, { espessura: 0.3, cor: '#c9c9c9' });
    documento.texto(x + larguraColuna / 2, yTopo + 5.5, primeiraLetraMaiúscula(dia), { tamanho: 10, negrito: true, alinhamento: 'centro' });
  });

  let y = yTopo + alturaCabeçalho;
  for (const bloco of gerado.blocosDoDia) {
    documento.retângulo(MARGEM_MM, y, larguraTotal, alturaLinha, { contorno: true, espessura: 0.25, cor: '#d9d9d9' });
    const cor = bloco.tipo === 'pausa' ? '#8a6d3b' : '#1a1a1a';
    gerado.diasDaSemana.forEach((_, índice) => {
      const x = MARGEM_MM + índice * larguraColuna;
      if (índice > 0) documento.linha(x, y, x, y + alturaLinha, { espessura: 0.2, cor: '#e3e3e3' });
      documento.texto(x + larguraColuna / 2, y + 5.5, rótuloDoBloco(bloco), { tamanho: 9, alinhamento: 'centro', cor });
    });
    y += alturaLinha;
  }
  return y;
}

export function gerarPdfDePlanejadorDeEstudos({ gerado, tituloDaAtividade = '', comCabeçalho = false }) {
  const título = tituloDaAtividade || 'Planejador de estudos';
  const documento = criarDocumentoPdf({ título });
  documento.novaPágina();
  const yInicial = desenharCabeçalho(documento, título, comCabeçalho);
  const yApósGrade = desenharGradeSemanal(documento, gerado, yInicial);

  let y = yApósGrade + 9;
  documento.texto(MARGEM_MM, y, `Estudo por dia: ${gerado.minutosDeEstudoPorDia} min (${gerado.minutosTotaisPorDia} min contando as pausas).`, { tamanho: 10.5 });
  y += 6.5;
  documento.texto(MARGEM_MM, y, `Estudo na semana: ${gerado.minutosDeEstudoPorSemana} min (${gerado.minutosTotaisPorSemana} min contando as pausas), em ${gerado.diasDaSemana.length} dia(s).`, { tamanho: 10.5 });
  y += 9;
  documento.texto(MARGEM_MM, y, 'Este planejador só distribui o tempo informado; não avalia conteúdo nem promete aprovação ou qualquer resultado escolar.', { tamanho: 8.5, cor: '#666666' });

  return documento.gerarBytes();
}

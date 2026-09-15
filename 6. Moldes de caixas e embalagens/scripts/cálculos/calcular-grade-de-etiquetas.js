// Calcula quantas etiquetas/tags de um tamanho fixo cabem na área útil de uma folha A4,
// considerando a margem imprimível e o espaçamento entre etiquetas, e devolve a posição de
// cada uma (para desenhar a grade) mais os segmentos de corte de cada etiqueta. Função
// pura, em milímetros. Não há linhas de dobra (etiquetas não dobram).
const LARGURA_A4_MM = 210;
const ALTURA_A4_MM = 297;
const MARGEM_MM = 10;
const MÍNIMO_MM = 10;
const MÁXIMO_MM = 190;

export function calcularGradeDeEtiquetas({ larguraDaEtiquetaMm, alturaDaEtiquetaMm, espaçamentoMm = 0, margemMm = MARGEM_MM, textoOpcional = '' }) {
  for (const [campo, rótulo, valor] of [
    ['larguraDaEtiquetaMm', 'Largura da etiqueta', larguraDaEtiquetaMm],
    ['alturaDaEtiquetaMm', 'Altura da etiqueta', alturaDaEtiquetaMm],
  ]) {
    if (!Number.isFinite(valor) || valor < MÍNIMO_MM || valor > MÁXIMO_MM) {
      return { válido: false, campo, erro: `${rótulo} precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_MM} mm.` };
    }
  }
  if (!Number.isFinite(espaçamentoMm) || espaçamentoMm < 0 || espaçamentoMm > 20) {
    return { válido: false, campo: 'espaçamentoMm', erro: 'O espaçamento precisa estar entre 0 mm e 20 mm.' };
  }
  if (!Number.isFinite(margemMm) || margemMm < 5 || margemMm > 30) {
    return { válido: false, campo: 'margemMm', erro: 'A margem precisa estar entre 5 mm e 30 mm.' };
  }

  const larguraÚtilMm = LARGURA_A4_MM - 2 * margemMm;
  const alturaÚtilMm = ALTURA_A4_MM - 2 * margemMm;
  const colunas = Math.floor((larguraÚtilMm + espaçamentoMm) / (larguraDaEtiquetaMm + espaçamentoMm));
  const linhas = Math.floor((alturaÚtilMm + espaçamentoMm) / (alturaDaEtiquetaMm + espaçamentoMm));

  if (colunas < 1 || linhas < 1) {
    return { válido: false, campo: 'larguraDaEtiquetaMm', erro: 'Essa etiqueta não cabe nem uma vez na área útil da folha A4 com essa margem.' };
  }

  const total = colunas * linhas;
  const larguraUsadaMm = colunas * larguraDaEtiquetaMm + (colunas - 1) * espaçamentoMm;
  const alturaUsadaMm = linhas * alturaDaEtiquetaMm + (linhas - 1) * espaçamentoMm;
  const sobraLarguraMm = larguraÚtilMm - larguraUsadaMm;
  const sobraAlturaMm = alturaÚtilMm - alturaUsadaMm;
  const deslocamentoXMm = margemMm + sobraLarguraMm / 2;
  const deslocamentoYMm = margemMm + sobraAlturaMm / 2;

  const posições = [];
  const segmentosDeCorte = [];
  for (let linha = 0; linha < linhas; linha += 1) {
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      const x = deslocamentoXMm + coluna * (larguraDaEtiquetaMm + espaçamentoMm);
      const y = deslocamentoYMm + linha * (alturaDaEtiquetaMm + espaçamentoMm);
      posições.push({ linha, coluna, xMm: x, yMm: y });
      segmentosDeCorte.push(
        { x1: x, y1: y, x2: x + larguraDaEtiquetaMm, y2: y, tipo: 'corte' },
        { x1: x + larguraDaEtiquetaMm, y1: y, x2: x + larguraDaEtiquetaMm, y2: y + alturaDaEtiquetaMm, tipo: 'corte' },
        { x1: x + larguraDaEtiquetaMm, y1: y + alturaDaEtiquetaMm, x2: x, y2: y + alturaDaEtiquetaMm, tipo: 'corte' },
        { x1: x, y1: y + alturaDaEtiquetaMm, x2: x, y2: y, tipo: 'corte' },
      );
    }
  }

  return {
    válido: true,
    larguraDaEtiquetaMm,
    alturaDaEtiquetaMm,
    espaçamentoMm,
    margemMm,
    colunas,
    linhas,
    total,
    posições,
    textoOpcional,
    segmentosDeCorte,
    segmentosDeDobra: [],
    retânguloEnvolvente: { larguraMm: LARGURA_A4_MM, alturaMm: ALTURA_A4_MM },
  };
}

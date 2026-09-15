// Calcula a geometria (em milímetros, folha A4) do papel quadriculado: quantas colunas e
// linhas cabem na área útil dado o tamanho da quadrícula e a margem, mais a posição do
// quadrado de calibração de 10 mm — sempre 10 mm de verdade, independente da quadrícula
// escolhida, para quem imprimir conferir com uma régua se a impressão saiu em tamanho
// real. A mesma geometria alimenta a prévia em SVG e o PDF, então os dois sempre batem.
export const LARGURA_PÁGINA_MM = 210;
export const ALTURA_PÁGINA_MM = 297;
export const TAMANHO_DA_CALIBRAÇÃO_MM = 10;
const ALTURA_DO_CABEÇALHO_MM = 18;

export const CORES_DE_LINHA = {
  cinza: '#c4c4c4',
  azul: '#a9c6e8',
  verde: '#a9d9b7',
};

export function calcularPapelQuadriculado({ tamanhoDaQuadrículaMm = 5, margemMm = 10, corDaLinha = 'cinza', comCabeçalho = false } = {}) {
  if (!Number.isFinite(tamanhoDaQuadrículaMm) || tamanhoDaQuadrículaMm < 2 || tamanhoDaQuadrículaMm > 20) {
    return { válido: false, erro: 'O tamanho da quadrícula precisa ficar entre 2 mm e 20 mm.' };
  }
  if (!Number.isInteger(margemMm) || margemMm < 5 || margemMm > 25) {
    return { válido: false, erro: 'A margem precisa ser um número inteiro entre 5 mm e 25 mm.' };
  }
  if (!Object.hasOwn(CORES_DE_LINHA, corDaLinha)) {
    return { válido: false, erro: 'Escolha uma cor de linha válida.' };
  }

  const topoDaÁreaÚtilMm = margemMm + (comCabeçalho ? ALTURA_DO_CABEÇALHO_MM : 0);
  const larguraÚtilMm = LARGURA_PÁGINA_MM - margemMm * 2;
  const alturaÚtilMm = ALTURA_PÁGINA_MM - margemMm - topoDaÁreaÚtilMm;
  const colunas = Math.floor(larguraÚtilMm / tamanhoDaQuadrículaMm);
  const linhas = Math.floor(alturaÚtilMm / tamanhoDaQuadrículaMm);
  if (colunas < 1 || linhas < 1) {
    return { válido: false, erro: 'A margem e o tamanho da quadrícula escolhidos não deixam espaço para nenhuma linha. Diminua a margem ou o tamanho da quadrícula.' };
  }

  const larguraGradeMm = colunas * tamanhoDaQuadrículaMm;
  const alturaGradeMm = linhas * tamanhoDaQuadrículaMm;
  if (larguraGradeMm < TAMANHO_DA_CALIBRAÇÃO_MM || alturaGradeMm < TAMANHO_DA_CALIBRAÇÃO_MM) {
    return { válido: false, erro: `A área útil ficou menor que o quadrado de calibração (${TAMANHO_DA_CALIBRAÇÃO_MM} mm). Diminua a margem ou o tamanho da quadrícula.` };
  }

  const xInicialMm = margemMm + (larguraÚtilMm - larguraGradeMm) / 2;
  const yInicialMm = topoDaÁreaÚtilMm;

  return {
    válido: true,
    tamanhoDaQuadrículaMm,
    margemMm,
    corDaLinha,
    corDaLinhaHex: CORES_DE_LINHA[corDaLinha],
    larguraPáginaMm: LARGURA_PÁGINA_MM,
    alturaPáginaMm: ALTURA_PÁGINA_MM,
    colunas,
    linhas,
    xInicialMm,
    yInicialMm,
    larguraGradeMm,
    alturaGradeMm,
    tamanhoDaCalibraçãoMm: TAMANHO_DA_CALIBRAÇÃO_MM,
    calibraçãoXMm: xInicialMm + larguraGradeMm - TAMANHO_DA_CALIBRAÇÃO_MM,
    calibraçãoYMm: yInicialMm + alturaGradeMm - TAMANHO_DA_CALIBRAÇÃO_MM,
  };
}

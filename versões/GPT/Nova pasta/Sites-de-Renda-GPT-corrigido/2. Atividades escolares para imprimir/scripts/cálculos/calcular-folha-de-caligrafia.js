// Calcula a geometria (em milímetros, folha A4) das linhas-guia e das repetições de
// uma folha de caligrafia: linha de base, x-altura e ascendente, mais a posição de
// cada repetição do texto ao longo da linha. A mesma geometria alimenta a prévia na
// tela (SVG) e o PDF, para que os dois fiquem sempre iguais. Usa a métrica real da
// fonte Helvetica (medirTextoHelvetica) para caber o texto na largura da página.
import { medirTextoHelvetica } from '../comum/pdf/medir-texto-helvetica.js';

const MM_POR_PONTO = 25.4 / 72;
export const LARGURA_PÁGINA_MM = 210;
export const ALTURA_PÁGINA_MM = 297;
export const MARGEM_MM = 20;
const ALTURA_DO_CABEÇALHO_MM = 18;
const FATOR_ALTURA_X = 0.5;
const FATOR_ASCENDENTE = 1.0;
const FATOR_ENTRELINHA = 2.4;
const FATOR_ESPAÇO_ENTRE_REPETIÇÕES = 0.7;

export function calcularFolhaDeCaligrafia({ texto = '', repetições = 6, quantidadeDeLinhas = 6, tamanhoDaLetra = 28, comCabeçalho = false } = {}) {
  const textoLimpo = String(texto ?? '').trim();
  if (!textoLimpo) return { válido: false, erro: 'Digite o texto que vai virar as linhas de caligrafia.' };
  if (textoLimpo.length > 40) return { válido: false, erro: 'Use um texto de até 40 caracteres.' };
  if (!Number.isInteger(repetições) || repetições < 1 || repetições > 30) {
    return { válido: false, erro: 'As repetições por linha precisam ser um número inteiro entre 1 e 30.' };
  }
  if (!Number.isInteger(quantidadeDeLinhas) || quantidadeDeLinhas < 1 || quantidadeDeLinhas > 40) {
    return { válido: false, erro: 'A quantidade de linhas precisa ser um número inteiro entre 1 e 40.' };
  }
  if (!Number.isFinite(tamanhoDaLetra) || tamanhoDaLetra < 12 || tamanhoDaLetra > 72) {
    return { válido: false, erro: 'O tamanho da letra precisa ficar entre 12 e 72 pontos.' };
  }

  const larguraÚtilMm = LARGURA_PÁGINA_MM - MARGEM_MM * 2;
  const topoDaÁreaÚtilMm = MARGEM_MM + (comCabeçalho ? ALTURA_DO_CABEÇALHO_MM : 0);
  const alturaÚtilMm = ALTURA_PÁGINA_MM - MARGEM_MM - topoDaÁreaÚtilMm;

  const alturaXMm = tamanhoDaLetra * MM_POR_PONTO * FATOR_ALTURA_X;
  const alturaAscendenteMm = tamanhoDaLetra * MM_POR_PONTO * FATOR_ASCENDENTE;
  const espaçamentoEntreLinhasMm = tamanhoDaLetra * MM_POR_PONTO * FATOR_ENTRELINHA;

  const linhasQueCabem = Math.max(1, Math.floor((alturaÚtilMm - alturaAscendenteMm) / espaçamentoEntreLinhasMm) + 1);
  const linhasReais = Math.min(quantidadeDeLinhas, linhasQueCabem);

  const larguraDoTextoMm = medirTextoHelvetica(textoLimpo, tamanhoDaLetra) * MM_POR_PONTO;
  const espaçoEntreRepetiçõesMm = tamanhoDaLetra * MM_POR_PONTO * FATOR_ESPAÇO_ENTRE_REPETIÇÕES;
  const passoMm = larguraDoTextoMm + espaçoEntreRepetiçõesMm;
  const repetiçõesQueCabem = Math.max(1, Math.floor((larguraÚtilMm + espaçoEntreRepetiçõesMm) / passoMm));
  const repetiçõesReais = Math.min(repetições, repetiçõesQueCabem);

  const linhas = [];
  for (let índice = 0; índice < linhasReais; índice += 1) {
    const baselineYMm = topoDaÁreaÚtilMm + alturaAscendenteMm + índice * espaçamentoEntreLinhasMm;
    const repetiçõesDaLinha = [];
    for (let posição = 0; posição < repetiçõesReais; posição += 1) {
      repetiçõesDaLinha.push({ xMm: MARGEM_MM + posição * passoMm, contorno: posição > 0 });
    }
    linhas.push({ baselineYMm, xAlturaYMm: baselineYMm - alturaXMm, ascendenteYMm: baselineYMm - alturaAscendenteMm, repetições: repetiçõesDaLinha });
  }

  return {
    válido: true,
    texto: textoLimpo,
    tamanhoDaLetra,
    larguraPáginaMm: LARGURA_PÁGINA_MM,
    alturaPáginaMm: ALTURA_PÁGINA_MM,
    margemMm: MARGEM_MM,
    larguraDoTextoMm,
    linhas,
    linhasSolicitadas: quantidadeDeLinhas,
    linhasReais,
    repetiçõesSolicitadas: repetições,
    repetiçõesReais,
    limitadoPelaPágina: linhasReais < quantidadeDeLinhas || repetiçõesReais < repetições,
  };
}

// Calcula os moldes de uma caixa de duas peças: a base e a tampa separada, cada uma
// montada como uma rede de base + paredes + abas (construir-rede-de-caixa.js). A tampa
// recebe as mesmas medidas de comprimento e largura da base MAIS a folga informada, somada
// duas vezes (uma por lado) — por isso uma base de 100 mm com folga de 1 mm produz uma
// tampa com 102 mm de largura interna. A espessura do papel é somada à base de cada peça
// separadamente (mesmo critério de calcular-caixa-retangular.js), depois da folga já
// aplicada, para não alterar essa relação de 2×folga. Função pura, em milímetros.
import { construirRedeDeCaixa } from './construir-rede-de-caixa.js';

const MÍNIMO_MM = 10;
const MÁXIMO_MM = 1000;
const ESPESSURA_MÁXIMA_MM = 3;
const FOLGA_MÁXIMA_MM = 20;

function construirPeça({ comprimentoInternoMm, larguraInternoMm, alturaInternoMm, espessuraDoPapelMm, tamanhoDaAbaMm }) {
  const comprimentoDoMoldeMm = comprimentoInternoMm + espessuraDoPapelMm;
  const larguraDoMoldeMm = larguraInternoMm + espessuraDoPapelMm;
  const rede = construirRedeDeCaixa({ comprimentoMm: comprimentoDoMoldeMm, larguraMm: larguraDoMoldeMm, alturaMm: alturaInternoMm, abaMm: tamanhoDaAbaMm });
  if (!rede) return null;
  return { medidasInternasMm: { comprimento: comprimentoInternoMm, largura: larguraInternoMm, altura: alturaInternoMm }, tamanhoDaAbaMm, ...rede };
}

export function calcularCaixaComTampa({
  comprimentoInternoMm,
  larguraInternoMm,
  alturaDaBaseMm,
  alturaDaTampaMm,
  folgaMm,
  espessuraDoPapelMm = 0,
  tamanhoDaAbaMm,
  tipoDePapel = '',
  textoOpcional = '',
}) {
  for (const [campo, rótulo, valor] of [
    ['comprimentoInternoMm', 'Comprimento interno da base', comprimentoInternoMm],
    ['larguraInternoMm', 'Largura interna da base', larguraInternoMm],
    ['alturaDaBaseMm', 'Altura da base', alturaDaBaseMm],
    ['alturaDaTampaMm', 'Altura da tampa', alturaDaTampaMm],
  ]) {
    if (!Number.isFinite(valor) || valor < MÍNIMO_MM || valor > MÁXIMO_MM) {
      return { válido: false, campo, erro: `${rótulo} precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_MM} mm.` };
    }
  }
  if (!Number.isFinite(folgaMm) || folgaMm < 0 || folgaMm > FOLGA_MÁXIMA_MM) {
    return { válido: false, campo: 'folgaMm', erro: `A folga precisa estar entre 0 mm e ${FOLGA_MÁXIMA_MM} mm por lado.` };
  }
  if (!Number.isFinite(espessuraDoPapelMm) || espessuraDoPapelMm < 0 || espessuraDoPapelMm > ESPESSURA_MÁXIMA_MM) {
    return { válido: false, campo: 'espessuraDoPapelMm', erro: `A espessura do papel precisa estar entre 0 mm e ${ESPESSURA_MÁXIMA_MM} mm.` };
  }
  if (!Number.isFinite(tamanhoDaAbaMm) || tamanhoDaAbaMm <= 0) {
    return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Informe um tamanho de aba maior que zero.' };
  }
  if (tamanhoDaAbaMm > Math.min(alturaDaBaseMm, alturaDaTampaMm)) {
    return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'A aba não pode ser maior que a altura da base nem da tampa.' };
  }

  const larguraInternaDaTampaMm = larguraInternoMm + 2 * folgaMm;
  const comprimentoInternoDaTampaMm = comprimentoInternoMm + 2 * folgaMm;

  const base = construirPeça({ comprimentoInternoMm, larguraInternoMm, alturaInternoMm: alturaDaBaseMm, espessuraDoPapelMm, tamanhoDaAbaMm });
  if (!base) return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Não foi possível montar a base com essas medidas.' };

  const tampa = construirPeça({
    comprimentoInternoMm: comprimentoInternoDaTampaMm,
    larguraInternoMm: larguraInternaDaTampaMm,
    alturaInternoMm: alturaDaTampaMm,
    espessuraDoPapelMm,
    tamanhoDaAbaMm,
  });
  if (!tampa) return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Não foi possível montar a tampa com essas medidas.' };

  return {
    válido: true,
    folgaMm,
    espessuraDoPapelMm,
    tipoDePapel,
    textoOpcional,
    base,
    tampa,
    resumoDaFolga: {
      larguraInternaDaBaseMm: larguraInternoMm,
      larguraInternaDaTampaMm,
      comprimentoInternoDaBaseMm: comprimentoInternoMm,
      comprimentoInternoDaTampaMm,
    },
  };
}

// Calcula o molde de uma caixa retangular simples (bandeja de base + 4 paredes + abas de
// emenda nos cantos, sem tampa), a partir das medidas INTERNAS desejadas. Função pura, em
// milímetros. Considera a espessura do papel somando-a ao comprimento e à largura da base
// antes de montar a rede: como o papel dobra no seu eixo médio, cada aresta dobrada "come"
// aproximadamente a espessura declarada da medida interna nominal; somar a espessura à base
// compensa essa perda e mantém o espaço interno realmente utilizável próximo do pedido.
// Retorna { válido: true, ... } ou { válido: false, erro, campo }.
import { construirRedeDeCaixa } from './construir-rede-de-caixa.js';

const MÍNIMO_MM = 10;
const MÁXIMO_MM = 1000;
const ESPESSURA_MÁXIMA_MM = 3;

export function calcularCaixaRetangular({ comprimentoInternoMm, larguraInternoMm, alturaInternoMm, espessuraDoPapelMm = 0, tamanhoDaAbaMm, tipoDePapel = '', textoOpcional = '' }) {
  for (const [campo, rótulo, valor] of [
    ['comprimentoInternoMm', 'Comprimento interno', comprimentoInternoMm],
    ['larguraInternoMm', 'Largura interna', larguraInternoMm],
    ['alturaInternoMm', 'Altura interna', alturaInternoMm],
  ]) {
    if (!Number.isFinite(valor) || valor < MÍNIMO_MM || valor > MÁXIMO_MM) {
      return { válido: false, campo, erro: `${rótulo} precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_MM} mm.` };
    }
  }
  if (!Number.isFinite(espessuraDoPapelMm) || espessuraDoPapelMm < 0 || espessuraDoPapelMm > ESPESSURA_MÁXIMA_MM) {
    return { válido: false, campo: 'espessuraDoPapelMm', erro: `A espessura do papel precisa estar entre 0 mm e ${ESPESSURA_MÁXIMA_MM} mm.` };
  }
  if (!Number.isFinite(tamanhoDaAbaMm) || tamanhoDaAbaMm <= 0) {
    return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Informe um tamanho de aba maior que zero.' };
  }
  if (tamanhoDaAbaMm > alturaInternoMm) {
    return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'A aba não pode ser maior que a altura da caixa (ela dobra a partir das paredes de topo e de baixo).' };
  }

  const comprimentoDoMoldeMm = comprimentoInternoMm + espessuraDoPapelMm;
  const larguraDoMoldeMm = larguraInternoMm + espessuraDoPapelMm;

  const rede = construirRedeDeCaixa({ comprimentoMm: comprimentoDoMoldeMm, larguraMm: larguraDoMoldeMm, alturaMm: alturaInternoMm, abaMm: tamanhoDaAbaMm });
  if (!rede) return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Não foi possível montar esse molde com essas medidas. Revise altura e tamanho da aba.' };

  return {
    válido: true,
    medidasInternasMm: { comprimento: comprimentoInternoMm, largura: larguraInternoMm, altura: alturaInternoMm },
    medidasExternasAproximadasMm: {
      comprimento: comprimentoDoMoldeMm + 2 * espessuraDoPapelMm,
      largura: larguraDoMoldeMm + 2 * espessuraDoPapelMm,
      altura: alturaInternoMm + espessuraDoPapelMm,
    },
    espessuraDoPapelMm,
    tamanhoDaAbaMm,
    tipoDePapel,
    textoOpcional,
    ...rede,
  };
}

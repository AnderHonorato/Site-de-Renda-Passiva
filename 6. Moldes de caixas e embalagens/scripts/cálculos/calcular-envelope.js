// Calcula o molde de um envelope para um cartão/conteúdo retangular: o bolso interno mede
// o conteúdo mais a folga (dos dois lados, em cada direção), e as quatro abas trapezoidais
// têm o tamanho informado. Função pura, em milímetros.
// Retorna { válido: true, ... } ou { válido: false, erro, campo }.
import { construirRedeDeEnvelope } from './construir-rede-de-envelope.js';

const MÍNIMO_MM = 20;
const MÁXIMO_MM = 500;
const FOLGA_MÁXIMA_MM = 15;

export function calcularEnvelope({ larguraDoConteúdoMm, alturaDoConteúdoMm, folgaMm, tamanhoDaAbaMm, tipoDePapel = '', textoOpcional = '' }) {
  for (const [campo, rótulo, valor] of [
    ['larguraDoConteúdoMm', 'Largura do conteúdo', larguraDoConteúdoMm],
    ['alturaDoConteúdoMm', 'Altura do conteúdo', alturaDoConteúdoMm],
  ]) {
    if (!Number.isFinite(valor) || valor < MÍNIMO_MM || valor > MÁXIMO_MM) {
      return { válido: false, campo, erro: `${rótulo} precisa estar entre ${MÍNIMO_MM} mm e ${MÁXIMO_MM} mm.` };
    }
  }
  if (!Number.isFinite(folgaMm) || folgaMm < 0 || folgaMm > FOLGA_MÁXIMA_MM) {
    return { válido: false, campo: 'folgaMm', erro: `A folga precisa estar entre 0 mm e ${FOLGA_MÁXIMA_MM} mm.` };
  }
  const larguraDoBolsoMm = larguraDoConteúdoMm + 2 * folgaMm;
  const alturaDoBolsoMm = alturaDoConteúdoMm + 2 * folgaMm;

  if (!Number.isFinite(tamanhoDaAbaMm) || tamanhoDaAbaMm <= 0) {
    return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Informe um tamanho de aba maior que zero.' };
  }
  if (tamanhoDaAbaMm >= larguraDoBolsoMm / 2 || tamanhoDaAbaMm >= alturaDoBolsoMm / 2) {
    return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'A aba não pode ser maior do que a metade da largura ou da altura do bolso do envelope.' };
  }

  const rede = construirRedeDeEnvelope({ larguraMm: larguraDoBolsoMm, alturaMm: alturaDoBolsoMm, abaMm: tamanhoDaAbaMm });
  if (!rede) return { válido: false, campo: 'tamanhoDaAbaMm', erro: 'Não foi possível montar esse envelope com essas medidas.' };

  return {
    válido: true,
    larguraDoConteúdoMm,
    alturaDoConteúdoMm,
    folgaMm,
    larguraDoBolsoMm,
    alturaDoBolsoMm,
    tamanhoDaAbaMm,
    tipoDePapel,
    textoOpcional,
    ...rede,
  };
}

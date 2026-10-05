/**
 * Índice de massa corporal (IMC) e faixa de peso.
 *
 * É uma referência, não um diagnóstico: o cálculo é só peso ÷ altura², e as faixas
 * são as da OMS para adultos (os mesmos cortes que o Ministério da Saúde usa).
 * Nada aqui toca em tela, em data ou em sorteio.
 */

/** Intervalos aceitos. Fora deles quase certamente houve erro de digitação (ou unidade trocada). */
export const LIMITES = { pesoMínKg: 1, pesoMáxKg: 500, alturaMínCm: 30, alturaMáxCm: 250 };

/**
 * Faixas da OMS para adultos. `até` é o corte de cima, que NÃO pertence à faixa:
 * 25,0 já é sobrepeso. A comparação é feita com o IMC de uma casa decimal, o mesmo
 * que a pessoa vê na tela, para a faixa nunca contradizer o número mostrado.
 */
export const FAIXAS = [
  { id: 'abaixo', faixa: 'abaixo do peso', até: 18.5, intervalo: 'menos de 18,5' },
  { id: 'normal', faixa: 'peso normal', até: 25, intervalo: '18,5 a 24,9' },
  { id: 'sobrepeso', faixa: 'sobrepeso', até: 30, intervalo: '25,0 a 29,9' },
  { id: 'obesidade1', faixa: 'obesidade grau I', até: 35, intervalo: '30,0 a 34,9' },
  { id: 'obesidade2', faixa: 'obesidade grau II', até: 40, intervalo: '35,0 a 39,9' },
  { id: 'obesidade3', faixa: 'obesidade grau III', até: Infinity, intervalo: '40,0 ou mais' },
];

/** IMC de início e de fim da faixa "peso normal", usados no intervalo de peso. */
export const IMC_NORMAL_MÍNIMO = 18.5;
export const IMC_NORMAL_MÁXIMO = 24.9;

/**
 * Recusa de entrada com o campo culpado e o código da especificação.
 * O módulo da tela troca isto por `ErroDeEntrada`, que o cálculo não conhece.
 */
export class ErroDeImc extends Error {
  /** @param {string} mensagem @param {'peso_invalido'|'altura_invalida'} código @param {'pesoKg'|'alturaCm'} campo */
  constructor(mensagem, código, campo) {
    super(mensagem);
    this.name = 'ErroDeImc';
    this.código = código;
    this.campo = campo;
  }
}

/**
 * Arredonda para uma casa decimal, com meio para cima.
 * O `toPrecision` tira o ruído binário antes: sem ele, 18,45 (que é exato em
 * decimal) virava 18,4 só porque 184,5 é guardado como 184,49999999999997.
 * @param {number} valor
 */
export function umaCasa(valor) {
  return Math.round(Number((valor * 10).toPrecision(12))) / 10;
}

/** Faixa da OMS para um IMC já arredondado em uma casa. */
export function classificarImc(imcArredondado) {
  return FAIXAS.find((f) => imcArredondado < f.até);
}

/**
 * Peso que corresponde a um IMC numa altura: IMC × altura² (altura em metros).
 * Feito com a altura em centímetros para não arredondar `cm ÷ 100` antes da hora.
 */
function pesoParaImc(imc, alturaCm) {
  return (imc * alturaCm * alturaCm) / 10000;
}

/**
 * Valida peso e altura e devolve o IMC, a faixa e o intervalo de peso da faixa normal.
 * @param {{pesoKg: number, alturaCm: number}} entrada altura em centímetros
 * @returns {{
 *   pesoKg: number, alturaCm: number, imc: number, imcExato: number,
 *   faixa: string, faixaId: string,
 *   pesoMínimoNormal: number, pesoMáximoNormal: number,
 * }}
 */
export function calcularImc({ pesoKg, alturaCm }) {
  const { pesoMínKg, pesoMáxKg, alturaMínCm, alturaMáxCm } = LIMITES;
  if (typeof pesoKg !== 'number' || !Number.isFinite(pesoKg) || pesoKg < pesoMínKg || pesoKg > pesoMáxKg) {
    throw new ErroDeImc(`Informe um peso entre ${pesoMínKg} e ${pesoMáxKg} kg.`, 'peso_invalido', 'pesoKg');
  }
  if (typeof alturaCm !== 'number' || !Number.isFinite(alturaCm) || alturaCm < alturaMínCm || alturaCm > alturaMáxCm) {
    // Quem digita 1,75 está pensando em metros; dizer isso poupa uma ida ao manual.
    const emMetros = typeof alturaCm === 'number' && alturaCm > 0 && alturaCm < 3;
    throw new ErroDeImc(
      emMetros
        ? 'A altura vai em centímetros: digite 175 em vez de 1,75.'
        : `Informe uma altura entre ${alturaMínCm} e ${alturaMáxCm} cm.`,
      'altura_invalida',
      'alturaCm',
    );
  }

  const alturaM = alturaCm / 100;
  const imcExato = pesoKg / (alturaM * alturaM);
  const imc = umaCasa(imcExato);
  const { faixa, id } = classificarImc(imc);
  return {
    pesoKg,
    alturaCm,
    imc,
    imcExato,
    faixa,
    faixaId: id,
    pesoMínimoNormal: umaCasa(pesoParaImc(IMC_NORMAL_MÍNIMO, alturaCm)),
    pesoMáximoNormal: umaCasa(pesoParaImc(IMC_NORMAL_MÁXIMO, alturaCm)),
  };
}

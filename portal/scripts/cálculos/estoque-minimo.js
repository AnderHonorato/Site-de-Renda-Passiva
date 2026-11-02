/**
 * Estoque mínimo e de segurança.
 *
 * Estoque de segurança é o colchão que cobre o que foge da média: o dia em que
 * se vende mais e o pedido que demora mais. Há dois jeitos honestos de
 * dimensioná-lo, e a ferramenta oferece os dois:
 *
 * 1. Pior caso (fórmula clássica), a da especificação:
 *      segurança = (consumo máximo × prazo máximo) − (consumo médio × prazo médio)
 *    Protege contra o consumo máximo e o prazo máximo acontecendo juntos. Não
 *    usa percentual de serviço: o "nível de serviço" é o do pior caso informado.
 *
 * 2. Nível de serviço (estatístico):
 *      segurança = z × raiz( prazo médio × desvio do consumo² + consumo médio² × desvio do prazo² )
 *    em que z vem do nível de serviço escolhido (95% → z = 1,645). Supõe consumo
 *    parecido com uma curva normal e consumo independente do prazo.
 *
 * Estoque mínimo, aqui, é o mesmo número do estoque de segurança (o nível abaixo
 * do qual o estoque não deveria cair). O ponto de reposição é o consumo durante
 * o prazo médio mais o estoque de segurança; quem quiser só essa conta tem a
 * ferramenta própria.
 *
 * Nada aqui toca o DOM. Quantidades são números reais (consumo por dia raramente
 * é inteiro); o ruído do ponto flutuante é limpo antes de arredondar, para que
 * 503,2 não vire 503,20000000000005 nem um "arredondar para cima" de 504.
 */
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/** Maior consumo por dia aceito (e maior desvio dele): mais que isso é erro de digitação. */
export const LIMITE_DE_CONSUMO = 1_000_000;
/** Maior prazo de reposição aceito, em dias (e maior desvio dele). */
export const LIMITE_DE_PRAZO = 365;
/** Menor valor aceito para consumo e prazo médios. */
export const MÍNIMO_POSITIVO = 0.01;
/** Nível de serviço aceito: acima de 50% (abaixo, z seria zero ou negativo) até 99,99%. */
export const NÍVEL_MÍNIMO = 50;
export const NÍVEL_MÁXIMO = 99.99;
/** Quantas vezes acima da média o máximo vira suspeita de pico isolado. */
export const FATOR_DE_PICO = 3;

const fmt = (valor) => formatarNúmero(valor, { casas: 6 });

/**
 * Cria a recusa de uma regra de negócio apontando o campo culpado.
 * O `código` é o identificador estável da especificação; a `message` é para a pessoa.
 * @param {string} mensagem
 * @param {string} campo nome do campo da tela (e da entrada)
 * @param {string} código
 */
function recusa(mensagem, campo, código) {
  const erro = new Error(mensagem);
  erro.campo = campo;
  erro.código = código;
  return erro;
}

/** Tira o ruído de ponto flutuante: 805 − 301,8 sai 503,20000000000005. */
function limpar(valor) {
  return Math.round(valor * 1e6) / 1e6;
}

/** Duas casas, metade para longe do zero. Recebe valor já limpo. */
function duasCasas(valor) {
  return Math.round(valor * 100) / 100;
}

/** Unidades inteiras que cobrem o valor (o físico não vem em fração). Recebe valor já limpo, para não subir por ruído. */
function paraCima(valor) {
  return Math.ceil(valor);
}

/**
 * Valida um número da entrada.
 * @param {unknown} valor
 * @param {string} campo
 * @param {string} rótulo ex.: "O consumo médio por dia"
 * @param {{mín: number, máx: number}} faixa
 */
function exigir(valor, campo, rótulo, { mín, máx }) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw recusa(`${rótulo} precisa ser um número.`, campo, 'numero_invalido');
  }
  if (valor < mín) {
    const texto = mín === 0
      ? `${rótulo} não pode ser negativo.`
      : `${rótulo} precisa ser pelo menos ${fmt(mín)}.`;
    throw recusa(texto, campo, 'abaixo_do_minimo');
  }
  if (valor > máx) {
    throw recusa(`${rótulo} não pode passar de ${fmt(máx)}. Confira se não digitou a mais.`, campo, 'acima_do_maximo');
  }
}

/**
 * Z do nível de serviço: o valor z tal que a probabilidade de uma curva normal
 * padrão ficar abaixo dele é `p`. Aproximação racional de Acklam (erro relativo
 * menor que 1,2e-9), suficiente para estoque: a entrada tem duas casas no melhor caso.
 * @param {number} p probabilidade, entre 0 e 1 (exclusivo)
 * @returns {number}
 */
export function fatorZ(p) {
  if (!(p > 0 && p < 1)) throw new RangeError('A probabilidade precisa estar entre 0 e 1.');
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const limiteInferior = 0.02425;

  if (p < limiteInferior) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - limiteInferior) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
    / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Estoque de segurança pelo pior caso (fórmula clássica).
 *
 * @param {{consumoMedioDiario: number, consumoMaximoDiario: number, tempoRepMedioDias: number, tempoRepMaximoDias: number}} entrada
 * @returns {{
 *   método: 'pior-caso',
 *   estoqueSeguranca: number, estoqueSegurancaExato: number, estoqueMinimo: number, unidadesInteiras: number,
 *   consumoNoPrazoMedio: number, consumoNoPiorCaso: number, pontoDeReposicao: number,
 *   diasDeCobertura: number, alertas: string[]
 * }}
 */
export function estoqueDeSegurança(entrada) {
  const { consumoMedioDiario: médio, consumoMaximoDiario: máximo, tempoRepMedioDias: prazo, tempoRepMaximoDias: prazoMáximo } = entrada;
  exigir(médio, 'consumoMedioDiario', 'O consumo médio por dia', { mín: MÍNIMO_POSITIVO, máx: LIMITE_DE_CONSUMO });
  exigir(máximo, 'consumoMaximoDiario', 'O maior consumo por dia', { mín: MÍNIMO_POSITIVO, máx: LIMITE_DE_CONSUMO });
  exigir(prazo, 'tempoRepMedioDias', 'O prazo médio de reposição', { mín: MÍNIMO_POSITIVO, máx: LIMITE_DE_PRAZO });
  exigir(prazoMáximo, 'tempoRepMaximoDias', 'O maior prazo de reposição', { mín: MÍNIMO_POSITIVO, máx: LIMITE_DE_PRAZO });
  if (máximo < médio) {
    throw recusa(
      `O maior consumo por dia (${fmt(máximo)}) não pode ser menor que o consumo médio (${fmt(médio)}). Confira os dois números.`,
      'consumoMaximoDiario', 'consumo_maximo_menor_que_medio',
    );
  }
  if (prazoMáximo < prazo) {
    throw recusa(
      `O maior prazo de reposição (${fmt(prazoMáximo)} dias) não pode ser menor que o prazo médio (${fmt(prazo)} dias). Confira os dois números.`,
      'tempoRepMaximoDias', 'prazo_maximo_menor_que_medio',
    );
  }

  const consumoNoPiorCaso = limpar(máximo * prazoMáximo);
  const consumoNoPrazoMedio = limpar(médio * prazo);
  const exato = limpar(consumoNoPiorCaso - consumoNoPrazoMedio);

  const alertas = [];
  if (máximo === médio && prazoMáximo === prazo) alertas.push('sem_variacao');
  if (máximo > médio * FATOR_DE_PICO) alertas.push('consumo_muito_acima_da_media');
  if (prazoMáximo > prazo * FATOR_DE_PICO) alertas.push('prazo_muito_acima_do_medio');

  return {
    método: 'pior-caso',
    estoqueSeguranca: duasCasas(exato),
    estoqueSegurancaExato: exato,
    estoqueMinimo: duasCasas(exato),
    unidadesInteiras: paraCima(exato),
    consumoNoPrazoMedio,
    consumoNoPiorCaso,
    pontoDeReposicao: duasCasas(limpar(consumoNoPrazoMedio + exato)),
    diasDeCobertura: limpar(exato / médio),
    alertas,
  };
}

/**
 * Estoque de segurança por nível de serviço (estatístico).
 *
 * `desvioTempoRepDias` pode ser zero (fornecedor que nunca varia o prazo).
 *
 * @param {{consumoMedioDiario: number, desvioConsumoDiario: number, tempoRepMedioDias: number, desvioTempoRepDias: number, nivelDeServico: number}} entrada
 *   `nivelDeServico` em percentual escrito como na tela (95 = 95%)
 * @returns {{
 *   método: 'nivel-de-servico',
 *   estoqueSeguranca: number, estoqueSegurancaExato: number, estoqueMinimo: number, unidadesInteiras: number,
 *   fatorZ: number, variaçãoDoConsumo: number, variaçãoDoPrazo: number, raiz: number,
 *   consumoNoPrazoMedio: number, pontoDeReposicao: number, diasDeCobertura: number, alertas: string[]
 * }}
 */
export function estoqueDeSegurançaPorNívelDeServiço(entrada) {
  const {
    consumoMedioDiario: médio, desvioConsumoDiario: desvioDoConsumo,
    tempoRepMedioDias: prazo, desvioTempoRepDias: desvioDoPrazo, nivelDeServico: nível,
  } = entrada;
  exigir(médio, 'consumoMedioDiario', 'O consumo médio por dia', { mín: MÍNIMO_POSITIVO, máx: LIMITE_DE_CONSUMO });
  exigir(desvioDoConsumo, 'desvioConsumoDiario', 'O desvio padrão do consumo por dia', { mín: 0, máx: LIMITE_DE_CONSUMO });
  exigir(prazo, 'tempoRepMedioDias', 'O prazo médio de reposição', { mín: MÍNIMO_POSITIVO, máx: LIMITE_DE_PRAZO });
  exigir(desvioDoPrazo, 'desvioTempoRepDias', 'O desvio padrão do prazo de reposição', { mín: 0, máx: LIMITE_DE_PRAZO });
  if (typeof nível !== 'number' || !Number.isFinite(nível)) {
    throw recusa('O nível de serviço precisa ser um número.', 'nivelDeServico', 'numero_invalido');
  }
  if (!(nível > NÍVEL_MÍNIMO) || nível > NÍVEL_MÁXIMO) {
    throw recusa(
      `O nível de serviço precisa ficar acima de ${NÍVEL_MÍNIMO}% e ir até ${fmt(NÍVEL_MÁXIMO)}%. O mais comum é entre 90% e 99%.`,
      'nivelDeServico', 'nivel_de_servico_fora_da_faixa',
    );
  }

  const z = fatorZ(nível / 100);
  const variaçãoDoConsumo = limpar(prazo * desvioDoConsumo ** 2);
  const variaçãoDoPrazo = limpar(médio ** 2 * desvioDoPrazo ** 2);
  const raiz = Math.sqrt(variaçãoDoConsumo + variaçãoDoPrazo);
  const exato = limpar(z * raiz);
  const consumoNoPrazoMedio = limpar(médio * prazo);

  const alertas = [];
  if (desvioDoConsumo === 0 && desvioDoPrazo === 0) alertas.push('sem_variacao');
  if (desvioDoConsumo > médio) alertas.push('demanda_irregular');
  if (desvioDoPrazo > prazo) alertas.push('prazo_irregular');

  return {
    método: 'nivel-de-servico',
    estoqueSeguranca: duasCasas(exato),
    estoqueSegurancaExato: exato,
    estoqueMinimo: duasCasas(exato),
    unidadesInteiras: paraCima(exato),
    fatorZ: z,
    variaçãoDoConsumo,
    variaçãoDoPrazo,
    raiz,
    consumoNoPrazoMedio,
    pontoDeReposicao: duasCasas(limpar(consumoNoPrazoMedio + exato)),
    diasDeCobertura: limpar(exato / médio),
    alertas,
  };
}

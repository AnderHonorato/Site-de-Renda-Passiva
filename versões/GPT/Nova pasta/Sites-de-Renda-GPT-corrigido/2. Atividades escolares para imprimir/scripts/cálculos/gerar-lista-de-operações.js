// Gera uma lista determinística de operações (+ − × ÷) a partir de uma semente:
// a mesma semente e as mesmas opções sempre produzem a mesma folha. As respostas
// vêm de resolverOperaçãoMatemática (função independente do gerador), nunca de um
// arredondamento aproximado. A divisão exata monta o dividendo a partir de
// quociente × divisor, então nunca sobra resto por engano.
import { criarGeradorPseudoaleatório } from '../geração/criar-gerador-pseudoaleatório.js';
import { resolverOperaçãoMatemática } from './resolver-operação-matemática.js';

const OPERADORES_VÁLIDOS = ['+', '−', '×', '÷'];
const RESERVAS_VÁLIDAS = ['indiferente', 'exigir', 'evitar'];
const DIVISÕES_VÁLIDAS = ['exata', 'comResto'];
const TENTATIVAS_MÁXIMAS_POR_ITEM = 200;
const QUANTIDADE_MÁXIMA = 200;
const OPERANDO_MÁXIMO = 1_000_000;

// Reserva ("vai um"): soma coluna a coluna, sem considerar o carregamento vindo da
// coluna anterior — suficiente para sinalizar que a conta exige reagrupamento.
function precisaDeReservaNaSoma(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  if (x === 0 && y === 0) return false;
  while (x > 0 || y > 0) {
    if (x % 10 + (y % 10) >= 10) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

// Empréstimo: existe alguma coluna em que o dígito do subtraendo é maior que o do
// minuendo na mesma posição (definição escolar usual de "subtração com reagrupamento").
function precisaDeEmpréstimoNaSubtração(maior, menor) {
  let x = Math.abs(maior);
  let y = Math.abs(menor);
  while (x > 0 || y > 0) {
    if (y % 10 > x % 10) return true;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return false;
}

function satisfazReserva(operador, a, b, reserva) {
  if (reserva === 'indiferente') return true;
  const precisa = operador === '+' ? precisaDeReservaNaSoma(a, b) : precisaDeEmpréstimoNaSubtração(Math.max(a, b), Math.min(a, b));
  return reserva === 'exigir' ? precisa : !precisa;
}

function gerarSomaOuSubtração(operador, rng, { mínimo, máximo, permitirNegativos, reserva }) {
  let a = mínimo;
  let b = mínimo;
  let relaxada = true;
  for (let tentativa = 0; tentativa < TENTATIVAS_MÁXIMAS_POR_ITEM; tentativa += 1) {
    a = rng.inteiroEntre(mínimo, máximo);
    b = rng.inteiroEntre(mínimo, máximo);
    if (operador === '−' && !permitirNegativos && a < b) [a, b] = [b, a];
    if (satisfazReserva(operador, a, b, reserva)) {
      relaxada = false;
      break;
    }
  }
  return { operandoA: a, operandoB: b, restriçãoRelaxada: relaxada && reserva !== 'indiferente' };
}

function gerarMultiplicação(rng, { mínimo, máximo }) {
  return { operandoA: rng.inteiroEntre(mínimo, máximo), operandoB: rng.inteiroEntre(mínimo, máximo), restriçãoRelaxada: false };
}

function gerarDivisão(rng, { mínimo, máximo, divisão }) {
  const divisorMínimo = Math.max(mínimo, 1);
  const divisorMáximo = Math.max(divisorMínimo, máximo);
  const divisor = rng.inteiroEntre(divisorMínimo, divisorMáximo);
  if (divisão === 'exata') {
    const quociente = rng.inteiroEntre(mínimo, máximo);
    return { operandoA: divisor * quociente, operandoB: divisor, restriçãoRelaxada: false };
  }
  const dividendo = rng.inteiroEntre(mínimo, máximo);
  return { operandoA: dividendo, operandoB: divisor, restriçãoRelaxada: false };
}

export function gerarListaDeOperações({
  operadores = ['+'],
  quantidade = 10,
  mínimo = 0,
  máximo = 20,
  permitirNegativos = false,
  reserva = 'indiferente',
  divisão = 'exata',
  semente = 1,
} = {}) {
  const operadoresEscolhidos = Array.isArray(operadores) ? operadores.filter((operador) => OPERADORES_VÁLIDOS.includes(operador)) : [];
  if (operadoresEscolhidos.length === 0) return { válido: false, erro: 'Escolha ao menos uma operação (adição, subtração, multiplicação ou divisão).' };
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MÁXIMA) {
    return { válido: false, erro: `A quantidade de exercícios precisa ser um número inteiro entre 1 e ${QUANTIDADE_MÁXIMA}.` };
  }
  if (!Number.isInteger(mínimo) || !Number.isInteger(máximo) || mínimo < 0 || máximo > OPERANDO_MÁXIMO || mínimo > máximo) {
    return { válido: false, erro: 'O intervalo dos números precisa ser dois inteiros não negativos, do menor ao maior.' };
  }
  if (!RESERVAS_VÁLIDAS.includes(reserva)) return { válido: false, erro: 'Opção de reserva/empréstimo desconhecida.' };
  if (!DIVISÕES_VÁLIDAS.includes(divisão)) return { válido: false, erro: 'Opção de divisão desconhecida.' };
  if (!Number.isFinite(semente)) return { válido: false, erro: 'A semente precisa ser um número.' };

  const rng = criarGeradorPseudoaleatório(semente);
  const operações = [];
  let restriçõesRelaxadas = 0;

  for (let índice = 0; índice < quantidade; índice += 1) {
    const operador = rng.elementoDe(operadoresEscolhidos);
    const opções = { mínimo, máximo, permitirNegativos, reserva, divisão };
    const gerado =
      operador === '+' || operador === '−'
        ? gerarSomaOuSubtração(operador, rng, opções)
        : operador === '×'
          ? gerarMultiplicação(rng, opções)
          : gerarDivisão(rng, opções);

    const resolução = resolverOperaçãoMatemática({ operandoA: gerado.operandoA, operandoB: gerado.operandoB, operador });
    if (gerado.restriçãoRelaxada) restriçõesRelaxadas += 1;
    operações.push({
      id: índice + 1,
      operador,
      operandoA: gerado.operandoA,
      operandoB: gerado.operandoB,
      resposta: resolução.resposta,
      resto: resolução.resto ?? null,
      restriçãoRelaxada: gerado.restriçãoRelaxada,
    });
  }

  return { válido: true, operações, sementeUsada: semente, restriçõesRelaxadas };
}

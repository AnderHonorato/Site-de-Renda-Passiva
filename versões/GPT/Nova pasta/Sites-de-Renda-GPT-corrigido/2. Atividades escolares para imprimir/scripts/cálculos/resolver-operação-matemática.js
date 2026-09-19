// Resolve uma única operação (+ − × ÷) de forma independente do gerador de folhas
// e do renderizador: usada tanto por gerar-lista-de-operações.js quanto pelos testes,
// para garantir que a resposta impressa no gabarito é sempre a resposta matematicamente
// correta. Na divisão, quociente e resto vêm separados; nunca arredonda.
const OPERADORES_VÁLIDOS = ['+', '−', '×', '÷'];

export function resolverOperaçãoMatemática({ operandoA, operandoB, operador }) {
  if (!OPERADORES_VÁLIDOS.includes(operador)) {
    throw new Error(`Operador desconhecido: ${operador}`);
  }
  if (!Number.isInteger(operandoA) || !Number.isInteger(operandoB)) {
    throw new Error('Os operandos precisam ser números inteiros.');
  }

  switch (operador) {
    case '+':
      return { resposta: operandoA + operandoB };
    case '−':
      return { resposta: operandoA - operandoB };
    case '×':
      return { resposta: operandoA * operandoB };
    case '÷': {
      if (operandoB === 0) throw new Error('Divisão por zero.');
      const quociente = Math.trunc(operandoA / operandoB);
      const resto = operandoA - quociente * operandoB;
      return { resposta: quociente, resto };
    }
    default:
      throw new Error(`Operador desconhecido: ${operador}`);
  }
}

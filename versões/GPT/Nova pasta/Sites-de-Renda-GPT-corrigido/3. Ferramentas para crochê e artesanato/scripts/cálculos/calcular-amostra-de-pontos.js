// Conversor de amostra de pontos: a partir de uma amostra tricotada/crocheada (pontos por
// uma largura conhecida), calcula quantos pontos são necessários para uma largura desejada.
// Quando a pessoa informa o múltiplo do padrão de pontos (repetição do ponto, com pontos de
// borda opcionais), avisa se o número calculado não é um múltiplo válido e sugere os dois
// múltiplos mais próximos — nunca aplica o ajuste silenciosamente.
function arredondarInteiro(valor) {
  const tolerância = 1e-9 * Math.max(1, Math.abs(valor));
  return Math.round(valor + Math.sign(valor) * tolerância);
}

export function calcularAmostraDePontos({ pontosDaAmostra, larguraDaAmostraCm, larguraDesejadaCm, múltiploDoPadrão = null, pontosDeBorda = 0 }) {
  if (!Number.isFinite(pontosDaAmostra) || pontosDaAmostra <= 0) return { válido: false, erro: 'Os pontos da amostra precisam ser maiores que zero.' };
  if (!Number.isFinite(larguraDaAmostraCm) || larguraDaAmostraCm <= 0) return { válido: false, erro: 'A largura da amostra precisa ser maior que zero.' };
  if (!Number.isFinite(larguraDesejadaCm) || larguraDesejadaCm <= 0) return { válido: false, erro: 'A largura desejada precisa ser maior que zero.' };
  if (!Number.isFinite(pontosDeBorda) || pontosDeBorda < 0) return { válido: false, erro: 'Os pontos de borda precisam ser zero ou mais.' };
  const usaMúltiplo = múltiploDoPadrão !== null && múltiploDoPadrão !== undefined;
  if (usaMúltiplo && (!Number.isInteger(múltiploDoPadrão) || múltiploDoPadrão < 1)) {
    return { válido: false, erro: 'O múltiplo do padrão precisa ser um número inteiro de pelo menos 1.' };
  }

  const pontosPorCm = pontosDaAmostra / larguraDaAmostraCm;
  const pontosCalculadosExatos = pontosPorCm * larguraDesejadaCm;
  const pontosFinais = arredondarInteiro(pontosCalculadosExatos);

  let precisaAjuste = false;
  let ajustadoParaBaixo = null;
  let ajustadoParaCima = null;
  if (usaMúltiplo) {
    const base = pontosFinais - pontosDeBorda;
    const resto = ((base % múltiploDoPadrão) + múltiploDoPadrão) % múltiploDoPadrão;
    precisaAjuste = resto !== 0;
    ajustadoParaBaixo = precisaAjuste ? base - resto + pontosDeBorda : pontosFinais;
    ajustadoParaCima = precisaAjuste ? base - resto + múltiploDoPadrão + pontosDeBorda : pontosFinais;
  }

  return {
    válido: true,
    pontosPorCm,
    pontosCalculadosExatos,
    pontosFinais,
    precisaAjuste,
    ajustadoParaBaixo,
    ajustadoParaCima,
  };
}

/**
 * Aleatoriedade para senhas e sorteios.
 *
 * Sempre `crypto.getRandomValues`, nunca `Math.random`: senha e sorteio
 * precisam ser imprevisíveis, e a amostragem descarta valores que causariam
 * viés de módulo, para que todas as opções tenham a mesma chance.
 */

const CONJUNTOS = Object.freeze({
  minúsculas: 'abcdefghijkmnopqrstuvwxyz',
  maiúsculas: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  números: '23456789',
  símbolos: '!@#$%&*+-=?',
  // Sem "l", "I", "O", "0" e "1": confundem na hora de ditar a senha.
});

export const CONJUNTOS_DE_SENHA = CONJUNTOS;

/**
 * Sorteia um inteiro de 0 (inclusive) até `limite` (exclusive), sem viés.
 * @param {number} limite
 * @returns {number}
 */
export function inteiroAleatório(limite) {
  if (!Number.isInteger(limite) || limite < 1) throw new Error('Limite inválido.');
  const máximo = Math.floor(0xffffffff / limite) * limite;
  const buffer = new Uint32Array(1);
  let valor;
  do {
    crypto.getRandomValues(buffer);
    [valor] = buffer;
  } while (valor >= máximo);
  return valor % limite;
}

/**
 * Embaralha uma cópia da lista (Fisher-Yates).
 * @template T
 * @param {readonly T[]} lista
 * @returns {T[]}
 */
export function embaralhar(lista) {
  const cópia = [...lista];
  for (let i = cópia.length - 1; i > 0; i -= 1) {
    const j = inteiroAleatório(i + 1);
    [cópia[i], cópia[j]] = [cópia[j], cópia[i]];
  }
  return cópia;
}

/**
 * Gera uma senha.
 * @param {{tamanho: number, conjuntos: (keyof CONJUNTOS)[]}} opções
 * @returns {string}
 */
export function gerarSenha({ tamanho, conjuntos }) {
  if (!Number.isInteger(tamanho) || tamanho < 4 || tamanho > 128) {
    throw new Error('O tamanho precisa ficar entre 4 e 128 caracteres.');
  }
  if (!conjuntos?.length) throw new Error('Escolha pelo menos um tipo de caractere.');
  if (conjuntos.length > tamanho) {
    throw new Error('A senha é curta demais para conter todos os tipos escolhidos.');
  }

  const alfabetos = conjuntos.map((c) => {
    const alfabeto = CONJUNTOS[c];
    if (!alfabeto) throw new Error(`Conjunto desconhecido: ${c}`);
    return alfabeto;
  });

  // Garante pelo menos um caractere de cada conjunto pedido e embaralha depois,
  // para que a posição obrigatória não seja previsível.
  const caracteres = alfabetos.map((a) => a[inteiroAleatório(a.length)]);
  const todos = alfabetos.join('');
  while (caracteres.length < tamanho) {
    caracteres.push(todos[inteiroAleatório(todos.length)]);
  }
  return embaralhar(caracteres).join('');
}

/**
 * Estima a entropia de uma senha gerada com estes conjuntos.
 * @param {number} tamanho
 * @param {(keyof CONJUNTOS)[]} conjuntos
 * @returns {{bits: number, classificação: string}}
 */
export function entropiaDaSenha(tamanho, conjuntos) {
  const alfabeto = conjuntos.reduce((total, c) => total + (CONJUNTOS[c]?.length ?? 0), 0);
  if (alfabeto === 0) return { bits: 0, classificação: 'inutilizável' };
  const bits = tamanho * Math.log2(alfabeto);
  let classificação = 'fraca';
  if (bits >= 128) classificação = 'excelente';
  else if (bits >= 80) classificação = 'forte';
  else if (bits >= 60) classificação = 'razoável';
  return { bits: Math.round(bits), classificação };
}

/**
 * Sorteia itens de uma lista.
 * @param {readonly string[]} itens
 * @param {{quantidade: number, repetir?: boolean}} opções
 * @returns {string[]}
 */
export function sortear(itens, { quantidade, repetir = false }) {
  if (!itens.length) throw new Error('Informe pelo menos um item.');
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error('Quantidade inválida.');
  if (!repetir && quantidade > itens.length) {
    throw new Error(`Você pediu ${quantidade} resultados, mas só existem ${itens.length} itens. Marque "permitir repetição" ou reduza a quantidade.`);
  }
  if (repetir) {
    return Array.from({ length: quantidade }, () => itens[inteiroAleatório(itens.length)]);
  }
  return embaralhar(itens).slice(0, quantidade);
}

/**
 * Divide participantes em times equilibrados em tamanho.
 * @param {readonly string[]} participantes
 * @param {number} quantidadeDeTimes
 * @returns {string[][]}
 */
export function dividirEmTimes(participantes, quantidadeDeTimes) {
  if (!Number.isInteger(quantidadeDeTimes) || quantidadeDeTimes < 2) {
    throw new Error('Informe pelo menos dois times.');
  }
  if (quantidadeDeTimes > participantes.length) {
    throw new Error('Há mais times do que participantes.');
  }
  const sorteados = embaralhar(participantes);
  const times = Array.from({ length: quantidadeDeTimes }, () => []);
  sorteados.forEach((pessoa, i) => times[i % quantidadeDeTimes].push(pessoa));
  return times;
}

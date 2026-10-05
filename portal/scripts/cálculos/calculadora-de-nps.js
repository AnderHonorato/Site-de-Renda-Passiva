/**
 * Net Promoter Score (NPS) a partir das notas de 0 a 10 dadas pelos clientes.
 *
 * A pergunta é "de 0 a 10, o quanto você recomendaria?". As respostas formam
 * três grupos, e só os extremos entram na diferença:
 *
 *   detratores  0 a 6     promotores  9 e 10     neutros  7 e 8
 *   NPS = (promotores − detratores) ÷ total × 100
 *
 * Os neutros não entram no numerador, mas contam no total, por isso puxam o
 * índice para perto de zero. O NPS vai de −100 (só detratores) a +100 (só
 * promotores) e é mostrado como inteiro.
 *
 * Tudo aqui é contagem de inteiros. A conta e os arredondamentos usam só
 * aritmética inteira, para que o número da tela seja o que se obtém refazendo
 * a conta à mão, sem erro de ponto flutuante nos casos de meio exato (12,5).
 *
 * As recusas são `Error` comum com `campo`, `código` e `extras`: a interface
 * leva a mensagem ao campo certo (um `Error` de subclasse seria tratado como
 * defeito de programação).
 */

export const NOTA_MÍNIMA = 0;
export const NOTA_MÁXIMA = 10;
/** Quantidade de notas possíveis (0 a 10). */
export const QUANTIDADE_DE_NOTAS = 11;
/** Notas coladas uma a uma. Acima disso a contagem por nota atende, sem limite prático. */
export const MÁXIMO_DE_NOTAS = 1000;
/** Tamanho do texto colado: segura entrada hostil antes de dividir em pedaços. */
export const MÁXIMO_DE_CARACTERES = 100000;
/** Respostas por nota na contagem; mantém todas as somas em inteiros seguros. */
export const MÁXIMO_POR_NOTA = 100000000;
/** Abaixo disto, um único cliente pesa demais e nem se calcula margem de erro. */
export const LIMITE_DE_POUCAS_RESPOSTAS = 30;
/** Abaixo disto a margem de erro ainda é grande; a partir daqui é razoável. */
export const LIMITE_DE_AMOSTRA_RAZOÁVEL = 100;
/** Confiança de 95% na margem de erro: 1,96 desvios-padrão. */
const Z_95 = 1.96;

/** Faixas usuais de leitura do índice, sobre o NPS já arredondado. */
export const ZONAS = [
  { id: 'crítica', nome: 'Zona crítica', faixa: '-100 a 0', mínimo: -100 },
  { id: 'aperfeiçoamento', nome: 'Zona de aperfeiçoamento', faixa: '1 a 49', mínimo: 1 },
  { id: 'qualidade', nome: 'Zona de qualidade', faixa: '50 a 74', mínimo: 50 },
  { id: 'excelência', nome: 'Zona de excelência', faixa: '75 a 100', mínimo: 75 },
];

/** Como a pessoa colou as respostas. */
export const FORMAS = ['notas', 'pares', 'onze'];

/**
 * Cria a recusa de uma regra de negócio apontando o campo culpado.
 * @param {string} mensagem
 * @param {string} código identifica o motivo para quem testa ou trata
 * @param {Record<string, unknown>} [extras] valor e posição do que falhou
 */
function recusa(mensagem, código, extras) {
  const erro = new Error(mensagem);
  erro.campo = 'notas';
  erro.código = código;
  if (extras) erro.extras = extras;
  return erro;
}

/** Encurta um pedaço de texto de terceiro antes de pô-lo numa mensagem. */
function abreviar(texto, limite = 24) {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

/** Quociente inteiro arredondado para o inteiro mais próximo; metade vai para longe do zero. */
export function arredondarQuociente(numerador, divisor) {
  const sinal = numerador < 0 ? -1 : 1;
  return sinal * Math.floor((2 * Math.abs(numerador) + divisor) / (2 * divisor)) || 0;
}

function conferirTamanho(texto) {
  if (typeof texto !== 'string') {
    throw recusa('Cole as respostas da pesquisa.', 'lista_vazia');
  }
  if (texto.length > MÁXIMO_DE_CARACTERES) {
    throw recusa(
      `O texto passou de ${MÁXIMO_DE_CARACTERES.toLocaleString('pt-BR')} caracteres. `
      + 'Para muitas respostas, use a contagem por nota.',
      'texto_longo',
      { limite: MÁXIMO_DE_CARACTERES },
    );
  }
}

/** Tira aspas que o CSV de uma planilha põe em volta de cada célula. */
function semAspas(pedaço) {
  return pedaço.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
}

/** Dica de saída para quem colou "10: 25" no modo de uma nota por resposta. */
function dicaDeContagem(pedaço) {
  return /[:=]/.test(pedaço)
    ? ' Se cada linha traz a nota e a quantidade, escolha "Contagem por nota" em "Como as respostas estão".'
    : '';
}

/**
 * Lê notas separadas por vírgula, ponto e vírgula, espaço, tabulação ou linha.
 * Devolve uma nota inteira de 0 a 10 por resposta, na ordem em que vieram.
 * @param {string} texto
 * @returns {number[]}
 */
export function lerNotas(texto) {
  conferirTamanho(texto);
  const pedaços = texto.split(/[\s,;]+/).map(semAspas).filter(Boolean);
  if (pedaços.length === 0) {
    throw recusa('Cole ao menos uma nota de 0 a 10.', 'lista_vazia');
  }
  if (pedaços.length > MÁXIMO_DE_NOTAS) {
    throw recusa(
      `Foram coladas ${pedaços.length.toLocaleString('pt-BR')} notas, e o limite é ${MÁXIMO_DE_NOTAS.toLocaleString('pt-BR')}. `
      + 'Para mais respostas, use a contagem por nota.',
      'notas_demais',
      { total: pedaços.length, limite: MÁXIMO_DE_NOTAS },
    );
  }

  return pedaços.map((pedaço, índice) => {
    const posição = índice + 1;
    // Só dígitos, com sinal e casas opcionais: "9", "9.0", "-1", "7.5". Tudo o
    // mais ("dez", "9/10", "10%") não é nota. "0x9" e "1e1" não passam aqui.
    if (!/^[+-]?\d+(\.\d+)?$/.test(pedaço)) {
      throw recusa(
        `A ${posição}ª nota, "${abreviar(pedaço)}", não é um número. Use inteiros de 0 a 10.${dicaDeContagem(pedaço)}`,
        'nota_invalida',
        { valor: abreviar(pedaço), posição },
      );
    }
    const valor = Number(pedaço);
    // Dígitos demais viram Infinity: seguem como "fora do intervalo", com o texto em vez do número.
    const mostrado = Number.isFinite(valor) ? valor : abreviar(pedaço);
    if (valor < NOTA_MÍNIMA || valor > NOTA_MÁXIMA) {
      throw recusa(
        `A ${posição}ª nota, ${abreviar(pedaço)}, está fora do intervalo. Use inteiros de 0 a 10.`,
        'nota_invalida',
        { valor: mostrado, posição },
      );
    }
    if (!Number.isInteger(valor)) {
      throw recusa(
        `A ${posição}ª nota, ${abreviar(pedaço)}, não é um número inteiro. As notas do NPS vão de 0 a 10, sem casas decimais.`,
        'nota_invalida',
        { valor, posição },
      );
    }
    return valor + 0; // "-0" vira 0
  });
}

/**
 * Conta quantas respostas houve em cada nota.
 * @param {readonly number[]} notas inteiros de 0 a 10
 * @returns {number[]} onze posições: a de índice n guarda quantos deram a nota n
 */
export function contarNotas(notas) {
  const contagens = new Array(QUANTIDADE_DE_NOTAS).fill(0);
  for (const nota of notas) contagens[nota] += 1;
  return contagens;
}

/** Quantidade de respostas escrita por pessoa: "25", "1.250". Devolve NaN se não for. */
function lerQuantidade(pedaço) {
  if (/^\d+$/.test(pedaço)) return Number(pedaço);
  if (/^\d{1,3}(\.\d{3})+$/.test(pedaço)) return Number(pedaço.replace(/\./g, ''));
  return NaN;
}

function conferirQuantidade(pedaço, quantidade, descrição, onde) {
  if (!Number.isFinite(quantidade)) {
    throw recusa(
      `${descrição}: "${abreviar(pedaço)}" não é uma quantidade de respostas. Use números inteiros, como 25.`,
      'contagem_invalida',
      { valor: abreviar(pedaço), ...onde },
    );
  }
  if (quantidade > MÁXIMO_POR_NOTA) {
    throw recusa(
      `${descrição}: ${abreviar(pedaço)} passa do limite de ${MÁXIMO_POR_NOTA.toLocaleString('pt-BR')} respostas por nota.`,
      'contagem_grande',
      { valor: quantidade, limite: MÁXIMO_POR_NOTA, ...onde },
    );
  }
}

/**
 * Lê uma linha por nota, no formato "nota quantidade" ("10: 25", "9 = 18",
 * "8;12", "7<tab>9"), como sai de uma tabela copiada da planilha. Notas que não
 * aparecem valem zero. Uma primeira linha sem número é tratada como cabeçalho.
 * @param {string} texto
 * @returns {number[]} onze posições, como `contarNotas`
 */
export function lerContagensPorNota(texto) {
  conferirTamanho(texto);
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length && !/\d/.test(linhas[0])) linhas.shift();
  if (linhas.length === 0) {
    throw recusa('Cole uma linha por nota, como "10: 25".', 'lista_vazia');
  }

  const contagens = new Array(QUANTIDADE_DE_NOTAS).fill(0);
  const vistas = new Set();
  linhas.forEach((linha, índice) => {
    const posição = índice + 1;
    const pedaços = linha.split(/[\s:;=,]+/).map(semAspas).filter(Boolean);
    if (pedaços.length !== 2) {
      throw recusa(
        `Linha ${posição} ("${abreviar(linha, 32)}"): escreva a nota e a quantidade de respostas, como "10: 25".`,
        'contagem_invalida',
        { valor: abreviar(linha, 32), posição },
      );
    }
    const [textoDaNota, textoDaQuantidade] = pedaços;
    const nota = /^\d+$/.test(textoDaNota) ? Number(textoDaNota) : NaN;
    if (!(nota >= NOTA_MÍNIMA && nota <= NOTA_MÁXIMA)) {
      throw recusa(
        `Linha ${posição}: a nota "${abreviar(textoDaNota)}" é inválida. Use inteiros de 0 a 10.`,
        'nota_invalida',
        { valor: abreviar(textoDaNota), posição },
      );
    }
    if (vistas.has(nota)) {
      throw recusa(
        `Linha ${posição}: a nota ${nota} já apareceu antes. Junte as quantidades numa linha só.`,
        'nota_repetida',
        { valor: nota, posição },
      );
    }
    vistas.add(nota);
    const quantidade = lerQuantidade(textoDaQuantidade);
    conferirQuantidade(textoDaQuantidade, quantidade, `Linha ${posição}`, { posição });
    contagens[nota] = quantidade;
  });
  return contagens;
}

/**
 * Lê onze quantidades seguidas, da nota 0 à nota 10, como numa coluna de
 * planilha que traz só as contagens.
 * @param {string} texto
 * @returns {number[]}
 */
export function lerOnzeQuantidades(texto) {
  conferirTamanho(texto);
  const pedaços = texto.split(/[\s,;]+/).map(semAspas).filter(Boolean);
  if (pedaços.length === 0) {
    throw recusa('Cole as onze quantidades, da nota 0 à nota 10.', 'lista_vazia');
  }
  if (pedaços.length !== QUANTIDADE_DE_NOTAS) {
    throw recusa(
      `Foram coladas ${pedaços.length.toLocaleString('pt-BR')} quantidades, e são esperadas ${QUANTIDADE_DE_NOTAS}: `
      + 'uma para cada nota, da 0 à 10, nessa ordem.',
      'contagem_invalida',
      { total: pedaços.length },
    );
  }
  return pedaços.map((pedaço, índice) => {
    const quantidade = lerQuantidade(pedaço);
    conferirQuantidade(pedaço, quantidade, `Nota ${índice}`, { nota: índice });
    return quantidade;
  });
}

/**
 * Lê as respostas na forma escolhida e devolve a contagem por nota.
 * @param {string} texto
 * @param {'notas' | 'pares' | 'onze'} [forma]
 * @returns {number[]}
 */
export function lerRespostas(texto, forma = 'notas') {
  if (!FORMAS.includes(forma)) throw new RangeError(`Forma desconhecida: ${forma}`);
  const contagens = forma === 'pares' ? lerContagensPorNota(texto)
    : forma === 'onze' ? lerOnzeQuantidades(texto)
      : contarNotas(lerNotas(texto));
  if (contagens.reduce((a, b) => a + b, 0) === 0) {
    throw recusa('Todas as quantidades estão zeradas. Informe ao menos uma resposta.', 'lista_vazia');
  }
  return contagens;
}

/** Zona do índice, a partir do NPS inteiro. */
export function zonaDoNps(nps) {
  let zona = ZONAS[0];
  for (const candidata of ZONAS) if (nps >= candidata.mínimo) zona = candidata;
  return zona;
}

/**
 * Calcula o NPS e tudo o que a tela mostra a partir da contagem por nota.
 * @param {readonly number[]} contagens onze inteiros não negativos
 */
export function calcularNps(contagens) {
  if (!Array.isArray(contagens) || contagens.length !== QUANTIDADE_DE_NOTAS
    || !contagens.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= MÁXIMO_POR_NOTA)) {
    throw new RangeError('A contagem precisa ter onze inteiros entre 0 e o limite por nota.');
  }
  const soma = (de, até) => contagens.slice(de, até + 1).reduce((a, b) => a + b, 0);
  const detratores = soma(0, 6);
  const neutros = soma(7, 8);
  const promotores = soma(9, 10);
  const total = detratores + neutros + promotores;
  if (total === 0) throw recusa('Informe ao menos uma resposta.', 'lista_vazia');

  const diferença = promotores - detratores;
  const nps = arredondarQuociente(diferença * 100, total);
  /** Percentual com uma casa, em inteiros: 1 em 8 vale 12,5. */
  const percentual = (quantidade) => arredondarQuociente(quantidade * 1000, total) / 10;

  // Margem de erro do NPS como diferença de duas proporções do mesmo conjunto:
  // variância = (P + D − (P − D)²) ÷ n. Com poucas respostas ou todas no mesmo
  // grupo a fórmula engana (dá zero), então nesses casos não se calcula.
  const proporçãoP = promotores / total;
  const proporçãoD = detratores / total;
  const variância = (proporçãoP + proporçãoD - (proporçãoP - proporçãoD) ** 2) / total;
  const margemCalculável = total >= LIMITE_DE_POUCAS_RESPOSTAS && variância > 0;
  const margemDeErro = margemCalculável ? Z_95 * Math.sqrt(variância) * 100 : null;

  return {
    total,
    contagens: [...contagens],
    promotores,
    neutros,
    detratores,
    diferença,
    npsExato: (diferença * 100) / total,
    nps,
    /** Uma linha por nota, de 0 a 10, para a tabela e a planilha. */
    porNota: contagens.map((respostas, nota) => ({
      nota, respostas, percentual: percentual(respostas), grupo: grupoDaNota(nota),
    })),
    percentuais: {
      promotores: percentual(promotores),
      neutros: percentual(neutros),
      detratores: percentual(detratores),
    },
    zona: zonaDoNps(nps),
    margemDeErro,
    /** Quanto o NPS anda se uma resposta passar de detratora a promotora (ou o contrário). */
    pesoDeUmaResposta: 200 / total,
    amostra: total < LIMITE_DE_POUCAS_RESPOSTAS ? 'muito pequena'
      : total < LIMITE_DE_AMOSTRA_RAZOÁVEL ? 'pequena' : 'razoável',
  };
}

/** Grupo de uma nota: 'detratores', 'neutros' ou 'promotores'. */
export function grupoDaNota(nota) {
  if (nota <= 6) return 'detratores';
  if (nota <= 8) return 'neutros';
  return 'promotores';
}

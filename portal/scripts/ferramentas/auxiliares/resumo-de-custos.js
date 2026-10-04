/**
 * Apoio comum a Margem de contribuição e Ponto de equilíbrio.
 *
 * As duas ferramentas leem os mesmos dados de venda, recusam as mesmas
 * entradas e entregam o mesmo tipo de resumo (texto para copiar e PDF). Manter
 * isso num lugar só evita que uma delas formate o índice de um jeito e a outra
 * de outro, ou que uma recusa vá parar no campo errado em só uma das telas.
 */
import { ErroDeEntrada } from '../../núcleo/montador.js';
import { emCentavos } from '../../cálculos/dinheiro.js';
import { montarDocumentoPdf } from '../../comum/documentos/montar-documento-pdf.js';
import { formatarNúmero } from '../../comum/formatação/formatar-número.js';
import { plural } from '../../núcleo/texto.js';

/** Nome da entrada do cálculo → nome do campo na tela. */
const CAMPO_NA_TELA = {
  preçoCentavos: 'preço',
  custoVariávelCentavos: 'custoVariável',
  percentual: 'percentual',
  quantidade: 'quantidade',
  custosFixosCentavos: 'custosFixos',
  lucroDesejadoCentavos: 'lucro',
};

/**
 * Executa o cálculo e leva a recusa dele para o campo que a pessoa precisa
 * corrigir. O módulo de cálculo diz qual entrada recusou; aqui ela vira o
 * campo correspondente da tela.
 * @template T
 * @param {() => T} executar
 * @returns {T}
 */
export function noCampoCerto(executar) {
  try {
    return executar();
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) throw erro;
    if (erro instanceof Error && erro.constructor === Error) {
      throw new ErroDeEntrada(erro.message, CAMPO_NA_TELA[erro.campo] ?? 'preço');
    }
    throw erro;
  }
}

/**
 * Valor de um campo em reais convertido para centavos inteiros. Um valor
 * positivo que arredonda para zero (0,004) seria tratado como "não informado"
 * ou sumiria calado; aqui ele vira recusa no próprio campo.
 * @param {number} reais como lido do formulário
 * @param {string} campo nome do campo na tela
 * @param {string} rótulo nome do campo para a mensagem
 */
export function centavosDoCampo(reais, campo, rótulo) {
  const centavos = emCentavos(reais);
  if (reais > 0 && centavos === 0) {
    throw new ErroDeEntrada(`${rótulo}: o menor valor acima de zero é R$ 0,01.`, campo);
  }
  return centavos;
}

/**
 * Percentual no padrão brasileiro com ao menos uma casa: 0,48 → "48,0%",
 * 0,0001 → "0,01%". Um índice diferente de zero que nem chega a 0,01% é dito
 * assim, em vez de aparecer como "0,0%" ao lado de uma margem que existe.
 * @param {number} fração valor entre 0 e 1 (pode ser negativo)
 */
export function formatarÍndice(fração) {
  const percentual = fração * 100;
  if (percentual > 0 && percentual < 0.005) return 'menos de 0,01%';
  if (percentual < 0 && percentual > -0.005) return 'entre -0,01% e 0%';
  return `${formatarNúmero(percentual, { casas: 2, casasMínimas: 1 })}%`;
}

/**
 * Percentual como a pessoa digitou, sem casas sobrando: 12 → "12%",
 * 4,99 → "4,99%", 99,9999 → "99,9999%". Arredondar aqui mostraria na conta
 * um número diferente do que entrou nela (e até 100%, que a ferramenta recusa).
 * @param {number} percentual como escrito na tela (10 = 10%)
 */
export function formatarPercentual(percentual) {
  return `${formatarNúmero(percentual, { casas: 6 })}%`;
}

const MOEDA_EXATA = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 6,
});

/**
 * Dinheiro com as casas que a conta realmente usou: 1890,7 centavos →
 * "R$ 18,907". Serve para a conta escrita reproduzir o resultado mostrado
 * quando a margem tem fração de centavo; valores redondos saem como sempre.
 * @param {number} centavos pode ter fração
 */
export function reaisExatos(centavos) {
  if (!Number.isFinite(centavos)) return '—';
  return MOEDA_EXATA.format(centavos === 0 ? 0 : centavos / 100);
}

/**
 * Observação para quando a tela arredonda a margem: diz o valor exato que as
 * contas usaram. Sem ela, refazer a conta com o número da tela dá outro valor.
 * @param {number} exataCentavos
 * @param {string} mostrada margem como aparece nos resultados
 * @returns {string[]} vazio quando não há diferença
 */
export function avisoDeMargemArredondada(exataCentavos, mostrada) {
  const exata = reaisExatos(exataCentavos);
  if (exata === mostrada) return [];
  return [`A sobra exata de cada venda é ${exata}; os resultados mostram ${mostrada}, arredondado ao centavo. As contas usam o valor exato.`];
}

/**
 * "1 unidade", "200 unidades".
 * @param {number} quantidade inteira
 */
export function unidades(quantidade) {
  return `${formatarNúmero(quantidade, { casas: 0 })} ${plural(quantidade, 'unidade', 'unidades')}`;
}

/**
 * @typedef {object} Resumo
 * @property {string} título nome da ferramenta
 * @property {[string, string]} destaque rótulo e valor principal
 * @property {[string, string][]} resultados demais números do resultado
 * @property {[string, string][]} dados o que a pessoa informou
 * @property {string[]} conta fórmula e observações que explicam o número
 */

/**
 * Texto para copiar: resultado primeiro, dados usados depois.
 * @param {Resumo} resumo
 * @returns {string}
 */
export function textoDoResumo({ título, destaque, resultados, dados, conta }) {
  return [
    título,
    `${destaque[0]}: ${destaque[1]}`,
    ...resultados.map(([r, v]) => `${r}: ${v}`),
    '',
    'Dados usados',
    ...dados.map(([r, v]) => `${r}: ${v}`),
    '',
    ...conta,
  ].join('\n');
}

/**
 * A fonte padrão do PDF (Helvetica, WinAnsi) não tem o sinal de menos
 * tipográfico nem a seta; sem esta troca eles sairiam como "?" justamente na
 * conta. O travessão curto (–) existe no WinAnsi e lê como menos.
 * @param {string} texto
 */
export function textoParaPdf(texto) {
  return String(texto).replace(/−/g, '–').replace(/→/g, '->');
}

/**
 * Documento PDF do resumo, em bytes. Separado do download para poder ser
 * conferido em teste sem navegador.
 * @param {Resumo & {subtítulo?: string}} resumo
 * @returns {Uint8Array}
 */
export function pdfDoResumo({ título, subtítulo = '', destaque, resultados, dados, conta }) {
  const pdf = textoParaPdf;
  const pares = (linhas) => linhas.map(([rótulo, valor]) => [pdf(rótulo), pdf(valor)]);
  const documento = montarDocumentoPdf({ título: pdf(título), subtítulo: pdf(subtítulo) });
  documento.destaque(pdf(destaque[0]), pdf(destaque[1]));
  documento.seção('Resultado');
  documento.tabela(['Item', 'Valor'], pares(resultados), [68, 32]);
  documento.seção('Dados informados');
  documento.tabela(['Item', 'Valor'], pares(dados), [68, 32]);
  documento.seção('A conta');
  for (const linha of conta) documento.parágrafo(pdf(linha), { tamanho: 9.5 });
  documento.espaço(4);
  documento.parágrafo('Calculado no seu navegador. Nenhum dado foi enviado.', { tamanho: 8, cor: '#6d5d55' });
  return documento.gerarBytes();
}

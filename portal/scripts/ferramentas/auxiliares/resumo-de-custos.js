/**
 * Apoio comum a Margem de contribuição e Ponto de equilíbrio.
 *
 * As duas ferramentas leem os mesmos dados de venda, recusam as mesmas
 * entradas e entregam o mesmo tipo de resumo (texto para copiar e PDF). Manter
 * isso num lugar só evita que uma delas formate o índice de um jeito e a outra
 * de outro, ou que uma recusa vá parar no campo errado em só uma das telas.
 */
import { ErroDeEntrada } from '../../núcleo/montador.js';
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
 * Percentual no padrão brasileiro com uma casa: 0,48 → "48,0%".
 * @param {number} fração valor entre 0 e 1 (pode ser negativo)
 */
export function formatarÍndice(fração) {
  return `${formatarNúmero(fração * 100, { casas: 1, casasMínimas: 1 })}%`;
}

/**
 * Percentual digitado pela pessoa, sem casas desnecessárias: 12 → "12%", 4,99 → "4,99%".
 * @param {number} percentual como escrito na tela (10 = 10%)
 */
export function formatarPercentual(percentual) {
  return `${formatarNúmero(percentual, { casas: 2 })}%`;
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
 * Documento PDF do resumo, em bytes. Separado do download para poder ser
 * conferido em teste sem navegador.
 * @param {Resumo & {subtítulo?: string}} resumo
 * @returns {Uint8Array}
 */
export function pdfDoResumo({ título, subtítulo = '', destaque, resultados, dados, conta }) {
  const documento = montarDocumentoPdf({ título, subtítulo });
  documento.destaque(destaque[0], destaque[1]);
  documento.seção('Resultado');
  documento.tabela(['Item', 'Valor'], resultados, [68, 32]);
  documento.seção('Dados informados');
  documento.tabela(['Item', 'Valor'], dados, [68, 32]);
  documento.seção('A conta');
  for (const linha of conta) documento.parágrafo(linha, { tamanho: 9.5 });
  documento.espaço(4);
  documento.parágrafo('Calculado no seu navegador. Nenhum dado foi enviado.', { tamanho: 8, cor: '#6d5d55' });
  return documento.gerarBytes();
}

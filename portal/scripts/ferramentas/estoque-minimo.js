/** Estoque mínimo e de segurança: o colchão que impede de faltar produto quando o consumo sobe ou o pedido atrasa. */
import { montarFerramenta, número, baixar, nomeDeArquivo, ErroDeEntrada } from '../núcleo/montador.js';
import { limparErros } from '../núcleo/interface.js';
import { plural } from '../núcleo/texto.js';
import {
  estoqueDeSegurança, estoqueDeSegurançaPorNívelDeServiço, FATOR_DE_PICO,
  LIMITE_DE_CONSUMO, LIMITE_DE_PRAZO, NÍVEL_MÍNIMO, NÍVEL_MÁXIMO,
} from '../cálculos/estoque-minimo.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { textoDoResumo, pdfDoResumo } from './auxiliares/resumo-de-custos.js';

const TÍTULO = 'Estoque mínimo e de segurança';

export const MÉTODO_PIOR_CASO = 'pior-caso';
export const MÉTODO_NÍVEL_DE_SERVIÇO = 'nivel-de-servico';

/** Campos que só existem em cada método; a tela esconde os do outro. */
const CAMPOS_DO_PIOR_CASO = ['consumoMaximoDiario', 'tempoRepMaximoDias'];
const CAMPOS_DO_NÍVEL_DE_SERVIÇO = ['nivelDeServico', 'desvioConsumoDiario', 'desvioTempoRepDias'];

/** Número como foi digitado: sem arredondar para duas casas e sem milhar quebrado. */
const nº = (valor) => formatarNúmero(valor, { casas: 6 });
/** Resultado: até duas casas, como a especificação pede. */
const quantidade = (valor) => `${formatarNúmero(valor, { casas: 2 })} ${plural(valor, 'unidade', 'unidades')}`;
const dias = (valor) => `${formatarNúmero(valor, { casas: 2 })} ${plural(valor, 'dia', 'dias')}`;

/** Leva a recusa do cálculo (que sabe o campo) para o campo certo da tela. */
function noCampoCerto(executar) {
  try {
    return executar();
  } catch (erro) {
    if (erro instanceof Error && erro.constructor === Error && erro.campo) {
      throw new ErroDeEntrada(erro.message, erro.campo);
    }
    throw erro;
  }
}

/** Avisos de entrada que dá para calcular, mas não para confiar sem olhar. */
function textoDoAlerta(código, e) {
  switch (código) {
    case 'sem_variacao':
      return e.método === MÉTODO_PIOR_CASO
        ? 'Atenção: você informou que o consumo e o prazo nunca passam da média, então o estoque de segurança deu zero. '
          + 'Isso só vale se for verdade: confira o histórico de vendas e os atrasos do fornecedor antes de confiar neste zero.'
        : 'Atenção: com desvio padrão zero no consumo e no prazo, o estoque de segurança dá zero. '
          + 'Isso só vale se nada varia de verdade: confira o histórico de vendas e os atrasos do fornecedor antes de confiar neste zero.';
    case 'consumo_muito_acima_da_media':
      return `Atenção: o maior consumo por dia (${nº(e.entrada.consumoMaximoDiario)}) é mais que ${FATOR_DE_PICO} vezes a média (${nº(e.entrada.consumoMedioDiario)}). `
        + 'Se foi um dia isolado, como uma promoção ou a compra grande de um único cliente, o estoque de segurança sai exagerado. '
        + 'Use o maior consumo que se repete, não o pico mais raro.';
    case 'prazo_muito_acima_do_medio':
      return `Atenção: o maior prazo de reposição (${nº(e.entrada.tempoRepMaximoDias)} dias) é mais que ${FATOR_DE_PICO} vezes o prazo médio (${nº(e.entrada.tempoRepMedioDias)} dias). `
        + 'Se foi um atraso excepcional, como greve ou falta de matéria-prima, o estoque de segurança sai exagerado. '
        + 'Considere o atraso que costuma se repetir.';
    case 'demanda_irregular':
      return `Atenção: o desvio padrão do consumo (${nº(e.entrada.desvioConsumoDiario)}) passou da média (${nº(e.entrada.consumoMedioDiario)}). `
        + 'Com consumo tão irregular, a conta estatística perde confiança: ela supõe dias parecidos com uma curva normal, sem grandes picos nem longas paradas. '
        + 'Prefira o método do pior caso ou revise os números de entrada.';
    case 'prazo_irregular':
      return `Atenção: o desvio padrão do prazo (${nº(e.entrada.desvioTempoRepDias)} dias) passou do prazo médio (${nº(e.entrada.tempoRepMedioDias)} dias). `
        + 'Um fornecedor tão imprevisível não cabe na conta estatística: ela supõe atrasos parecidos com uma curva normal. '
        + 'Prefira o método do pior caso ou revise os números de entrada.';
    default:
      return '';
  }
}

/**
 * Lê o formulário, calcula e monta o que a tela, o texto copiado e o PDF mostram.
 * Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function calcularEstoqueNaTela(dados) {
  const método = String(dados.metodo ?? MÉTODO_PIOR_CASO) === MÉTODO_NÍVEL_DE_SERVIÇO
    ? MÉTODO_NÍVEL_DE_SERVIÇO : MÉTODO_PIOR_CASO;
  const porNível = método === MÉTODO_NÍVEL_DE_SERVIÇO;

  // A leitura segue a ordem dos campos na tela: o primeiro erro é o primeiro campo que a pessoa vê.
  const consumoMedioDiario = número(dados, 'consumoMedioDiario', { rótulo: 'Consumo médio por dia' });
  let entrada;
  let r;
  if (porNível) {
    const desvioConsumoDiario = número(dados, 'desvioConsumoDiario', { rótulo: 'Desvio padrão do consumo por dia' });
    const tempoRepMedioDias = número(dados, 'tempoRepMedioDias', { rótulo: 'Prazo médio de reposição' });
    const desvioTempoRepDias = número(dados, 'desvioTempoRepDias', {
      rótulo: 'Desvio padrão do prazo', obrigatório: false, padrão: 0,
    });
    const nivelDeServico = número(dados, 'nivelDeServico', { rótulo: 'Nível de serviço desejado' });
    entrada = { consumoMedioDiario, desvioConsumoDiario, tempoRepMedioDias, desvioTempoRepDias, nivelDeServico };
    r = noCampoCerto(() => estoqueDeSegurançaPorNívelDeServiço(entrada));
  } else {
    const consumoMaximoDiario = número(dados, 'consumoMaximoDiario', { rótulo: 'Maior consumo por dia' });
    const tempoRepMedioDias = número(dados, 'tempoRepMedioDias', { rótulo: 'Prazo médio de reposição' });
    const tempoRepMaximoDias = número(dados, 'tempoRepMaximoDias', { rótulo: 'Maior prazo de reposição' });
    entrada = { consumoMedioDiario, consumoMaximoDiario, tempoRepMedioDias, tempoRepMaximoDias };
    r = noCampoCerto(() => estoqueDeSegurança(entrada));
  }

  const seguranca = quantidade(r.estoqueSeguranca);
  const fracionado = r.unidadesInteiras !== r.estoqueSeguranca;
  const destaque = ['Estoque de segurança', seguranca];
  const resultados = [
    destaque,
    ['Estoque mínimo (igual ao de segurança)', seguranca],
    ['Consumo durante o prazo médio', quantidade(r.consumoNoPrazoMedio)],
    ['Ponto de reposição (hora de pedir)', quantidade(r.pontoDeReposicao)],
    ['Cobertura do estoque de segurança', `${dias(r.diasDeCobertura)} de consumo médio`],
  ];
  if (fracionado) resultados.push(['Em unidades inteiras (para cima)', quantidade(r.unidadesInteiras)]);
  if (porNível) resultados.push(['Fator do nível de serviço (z)', formatarNúmero(r.fatorZ, { casas: 4 })]);

  const dadosUsados = porNível
    ? [
      ['Consumo médio por dia', quantidade(entrada.consumoMedioDiario)],
      ['Desvio padrão do consumo por dia', quantidade(entrada.desvioConsumoDiario)],
      ['Prazo médio de reposição', dias(entrada.tempoRepMedioDias)],
      ['Desvio padrão do prazo', dias(entrada.desvioTempoRepDias)],
      ['Nível de serviço desejado', `${nº(entrada.nivelDeServico)}%`],
    ]
    : [
      ['Consumo médio por dia', quantidade(entrada.consumoMedioDiario)],
      ['Maior consumo por dia', quantidade(entrada.consumoMaximoDiario)],
      ['Prazo médio de reposição', dias(entrada.tempoRepMedioDias)],
      ['Maior prazo de reposição', dias(entrada.tempoRepMaximoDias)],
    ];

  const alertas = r.alertas.map((código) => textoDoAlerta(código, { método, entrada })).filter(Boolean);

  // A conta escrita usa os números como digitados e termina no valor exato do cálculo.
  const conta = [];
  if (porNível) {
    conta.push(
      'A conta: estoque de segurança = z × raiz de (prazo médio × desvio do consumo² + consumo médio² × desvio do prazo²) = '
      + `${formatarNúmero(r.fatorZ, { casas: 4 })} × raiz de (${nº(entrada.tempoRepMedioDias)} × ${nº(entrada.desvioConsumoDiario)}² `
      + `+ ${nº(entrada.consumoMedioDiario)}² × ${nº(entrada.desvioTempoRepDias)}²) `
      + `= ${formatarNúmero(r.fatorZ, { casas: 4 })} × raiz de ${nº(r.variaçãoDoConsumo + r.variaçãoDoPrazo)} `
      + `= ${nº(r.estoqueSegurancaExato)}.`,
      `O z de ${nº(entrada.nivelDeServico)}% é ${formatarNúmero(r.fatorZ, { casas: 4 })}: é o quanto, em desvios, o estoque precisa subir `
      + `para que em ${nº(entrada.nivelDeServico)}% dos ciclos de reposição o produto não falte.`,
    );
  } else {
    conta.push(
      'A conta: estoque de segurança = (consumo máximo × prazo máximo) − (consumo médio × prazo médio) = '
      + `(${nº(entrada.consumoMaximoDiario)} × ${nº(entrada.tempoRepMaximoDias)}) − (${nº(entrada.consumoMedioDiario)} × ${nº(entrada.tempoRepMedioDias)}) `
      + `= ${nº(r.consumoNoPiorCaso)} − ${nº(r.consumoNoPrazoMedio)} = ${nº(r.estoqueSegurancaExato)}.`,
    );
  }
  if (nº(r.estoqueSegurancaExato) !== formatarNúmero(r.estoqueSeguranca, { casas: 2 })) {
    conta.push(`O valor exato é ${nº(r.estoqueSegurancaExato)}; os resultados mostram ${formatarNúmero(r.estoqueSeguranca, { casas: 2 })}, arredondado a duas casas.`);
  }
  conta.push(
    'O estoque mínimo é o mesmo número do estoque de segurança: o nível abaixo do qual o estoque não deveria cair.',
    `O ponto de reposição é o consumo durante o prazo médio mais o estoque de segurança: ${nº(entrada.consumoMedioDiario)} × ${nº(entrada.tempoRepMedioDias)} `
    + `+ ${nº(r.estoqueSegurancaExato)} = ${nº(r.pontoDeReposicao)}. Quando o estoque chegar a esse nível, faça o pedido.`,
  );
  if (porNível) {
    conta.push(
      `Premissas: nível de serviço de ${nº(entrada.nivelDeServico)}% quer dizer que, a cada 100 ciclos de reposição, cerca de ${nº(100 - entrada.nivelDeServico)} podem acabar com falta. `
      + 'O consumo diário segue aproximadamente uma curva normal, e o consumo não depende do prazo do fornecedor. '
      + 'Média e desvio vêm do mesmo período e na mesma unidade; com poucos dias de histórico, o resultado perde confiança.',
    );
  } else {
    conta.push(
      'Premissas: o consumo máximo e o prazo máximo acontecem juntos, no mesmo ciclo, o que é raro; por isso a conta é conservadora. '
      + 'O nível de serviço fica implícito: ela cobre o pior caso informado, em vez de um percentual escolhido. '
      + 'Média e máximo vêm do mesmo período e na mesma unidade; com poucos dias de histórico, o resultado perde confiança. '
      + 'Para escolher um nível de serviço como 95%, use o método "Nível de serviço".',
    );
  }
  if (fracionado) {
    conta.push(`Como o estoque físico vem em unidades inteiras, na prática arredonde para cima: ${quantidade(r.unidadesInteiras)}.`);
  }

  let frase;
  if (r.estoqueSeguranca === 0) {
    frase = 'Com os números informados, o estoque de segurança é zero: não há variação a cobrir. Confira se isso é real.';
  } else if (porNível) {
    frase = `Para o produto não faltar em ${nº(entrada.nivelDeServico)}% dos ciclos de reposição, mantenha cerca de ${seguranca} como estoque de segurança.`;
  } else {
    frase = `Mantenha pelo menos ${seguranca} como estoque de segurança. Com esse colchão, o estoque aguenta o pior caso informado: `
      + `consumo de ${nº(entrada.consumoMaximoDiario)} por dia durante ${nº(entrada.tempoRepMaximoDias)} dias.`;
  }

  const observações = [...alertas, ...conta];
  const resumo = {
    título: TÍTULO, destaque, resultados: resultados.slice(1), dados: dadosUsados, conta: [frase, ...observações],
  };

  return {
    valor: `${seguranca} de segurança`,
    resumo: frase,
    linhas: resultados,
    observações,
    texto: textoDoResumo(resumo),
    arquivos: [{
      rótulo: 'Baixar resumo em PDF',
      ícone: 'documento',
      gerar: () => baixar(
        pdfDoResumo({ ...resumo, subtítulo: `Segurança: ${seguranca}` }),
        `${nomeDeArquivo('estoque-minimo')}.pdf`,
        'application/pdf',
      ),
    }],
  };
}

export default {
  instruções: {
    passos: [
      'Escolha como quer dimensionar: pelo pior caso (você informa o maior consumo e o maior prazo) ou por nível de serviço (você informa o desvio padrão e o percentual de segurança).',
      'Informe o consumo médio por dia e o prazo médio de reposição, em dias, do mesmo período de histórico e na mesma unidade do estoque.',
      'Preencha o restante do método escolhido e calcule. O estoque de segurança aparece com a conta feita e os avisos sobre a confiança dos números.',
      'Use o ponto de reposição para saber quando pedir. Copie o resultado ou baixe o resumo em PDF.',
    ],
    exemplo: {
      texto: 'Consumo médio de 50 unidades por dia, pico de 80; prazo médio de 6 dias, pior atraso de 10. '
        + 'Pelo pior caso: 80 × 10 − 50 × 6 = 800 − 300 = 500 unidades de estoque de segurança, o que cobre 10 dias de consumo médio. '
        + 'O ponto de reposição é 50 × 6 + 500 = 800: ao chegar a 800 unidades, faça o pedido. '
        + 'Pelo nível de serviço, com desvio de 15 unidades por dia no consumo, desvio de 1 dia no prazo e 95%, o estoque de segurança fica em 102,06 unidades.',
    },
    limites: 'Consumo e prazo precisam ser maiores que zero; consumo até '
      + `${formatarNúmero(LIMITE_DE_CONSUMO, { casas: 0 })} por dia e prazo até ${LIMITE_DE_PRAZO} dias. `
      + 'Método do pior caso: parte de que o maior consumo e o maior prazo acontecem juntos, então é conservador, e não usa percentual de serviço. '
      + `Método do nível de serviço: aceita de mais de ${NÍVEL_MÍNIMO}% até ${formatarNúmero(NÍVEL_MÁXIMO, { casas: 2 })}%, `
      + 'supõe consumo aproximadamente normal e independente do prazo, e perde confiança quando o desvio passa da média. '
      + 'Os dois dependem de números reais do seu histórico: com poucos dias de dados, ou com um pico isolado como máximo, o resultado engana. '
      + 'A ferramenta mostra um aviso quando vê esses sinais, mas não consegue saber de onde vieram os seus números. '
      + 'Tudo é calculado no seu navegador.',
    perguntas: [
      { p: 'Qual a diferença entre estoque mínimo e estoque de segurança?', r: 'Aqui são o mesmo número: o colchão que cobre o que foge da média. Alguns livros chamam de estoque mínimo o ponto de reposição, que é o consumo do prazo médio mais esse colchão; ele aparece no resultado como ponto de reposição.' },
      { p: 'Qual método devo usar?', r: 'Se você conhece o pior consumo e o pior atraso que se repetem, o pior caso é simples e seguro. Se tem o histórico em planilha e quer aceitar uma falta ocasional para não imobilizar dinheiro, use o nível de serviço.' },
      { p: 'Como obtenho o desvio padrão?', r: 'Em uma planilha, coloque o consumo de cada dia (ou semana, ajustando o período) numa coluna e use a função DESVPAD. Faça o mesmo com os prazos de entrega dos últimos pedidos. Use o mesmo período da média.' },
      { p: 'O resultado deu com fração. E agora?', r: 'O estoque físico vem em unidades inteiras: arredonde para cima. A ferramenta mostra o valor com duas casas e, abaixo, o valor em unidades inteiras.' },
      { p: 'O resultado deu zero. Posso confiar?', r: 'Só se o consumo e o prazo realmente nunca variam, o que é raro. Zero costuma indicar que o máximo informado é igual à média. Revise com o histórico.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular estoque',
      campos: [
        {
          nome: 'metodo', rótulo: 'Como calcular', tipo: 'seleção', padrão: MÉTODO_PIOR_CASO,
          opções: [
            { valor: MÉTODO_PIOR_CASO, rótulo: 'Pior caso (maior consumo e maior prazo)' },
            { valor: MÉTODO_NÍVEL_DE_SERVIÇO, rótulo: 'Nível de serviço (desvio padrão)' },
          ],
          dica: 'O pior caso é a conta clássica e simples. O nível de serviço deixa você escolher quantos ciclos aceita ficar sem estoque.',
        },
        {
          nome: 'consumoMedioDiario', rótulo: 'Consumo médio por dia (unidades)', tipo: 'número', exemplo: '50',
          dica: 'Quanto sai do estoque em um dia comum. Aceita fração.',
        },
        {
          nome: 'consumoMaximoDiario', rótulo: 'Maior consumo por dia (unidades)', tipo: 'número', exemplo: '80',
          dica: 'O maior consumo diário que se repete. Não pode ser menor que o médio.',
        },
        {
          nome: 'desvioConsumoDiario', rótulo: 'Desvio padrão do consumo por dia (unidades)', tipo: 'número', exemplo: '15',
          dica: 'O quanto o consumo diário varia em torno da média. Em planilha: função DESVPAD.',
        },
        {
          nome: 'tempoRepMedioDias', rótulo: 'Prazo médio de reposição (dias)', tipo: 'número', exemplo: '6',
          dica: 'Dias entre fazer o pedido e o produto chegar, em média.',
        },
        {
          nome: 'tempoRepMaximoDias', rótulo: 'Maior prazo de reposição (dias)', tipo: 'número', exemplo: '10',
          dica: 'O maior atraso que costuma acontecer. Não pode ser menor que o médio.',
        },
        {
          nome: 'desvioTempoRepDias', rótulo: 'Desvio padrão do prazo (dias)', tipo: 'número', padrão: '0',
          dica: 'Opcional. Se o fornecedor sempre entrega no mesmo prazo, deixe 0.',
        },
        {
          nome: 'nivelDeServico', rótulo: 'Nível de serviço desejado (%)', tipo: 'número', padrão: '95',
          dica: 'Em quantos de cada 100 ciclos de reposição o produto não pode faltar. O mais comum é entre 90 e 99.',
        },
      ],
      calcular: calcularEstoqueNaTela,
      aoMontar(raizDaFerramenta) {
        const formulário = raizDaFerramenta.querySelector('#formulário');
        const seletor = raizDaFerramenta.querySelector('#campo-metodo');
        const caixaDeResultado = raizDaFerramenta.querySelector('#resultado');
        const alternar = (nomes, mostrar) => {
          for (const nome of nomes) {
            raizDaFerramenta.querySelector(`[data-campo="${nome}"]`).hidden = !mostrar;
          }
        };
        const atualizar = () => {
          const porNível = seletor.value === MÉTODO_NÍVEL_DE_SERVIÇO;
          alternar(CAMPOS_DO_PIOR_CASO, !porNível);
          alternar(CAMPOS_DO_NÍVEL_DE_SERVIÇO, porNível);
        };
        seletor.addEventListener('change', () => {
          // O resultado e os erros eram do outro método: deixá-los daria um número sem conta que o explique.
          limparErros(formulário);
          caixaDeResultado.hidden = true;
          atualizar();
        });
        // O reset do navegador devolve o método ao padrão depois do evento, então esperamos ele terminar.
        formulário.addEventListener('reset', () => setTimeout(atualizar, 0));
        atualizar();
      },
    });
  },
};

/** Calculadora de comissão: percentual único ou escalonada por faixa, com desconto opcional. */
import { montarFerramenta, número, baixar, nomeDeArquivo, ErroDeEntrada } from '../núcleo/montador.js';
import {
  calcularComissão, MÁXIMO_DE_FAIXAS, LIMITE_DE_VENDAS_CENTAVOS, UNIDADES_POR_CENTAVO,
} from '../cálculos/comissao.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { formatarPercentual, textoDoResumo, textoParaPdf } from './auxiliares/resumo-de-custos.js';

const TÍTULO = 'Calculadora de comissão';
const NÚMEROS_DAS_FAIXAS = Array.from({ length: MÁXIMO_DE_FAIXAS }, (_, i) => i + 1);
const ESPAÇO_FIXO = '\u00a0';

const reais = (centavos) => formatarMoeda(centavos / 100);
const percentualDe = (pontosBase) => formatarPercentual(pontosBase / 100);

/**
 * Dinheiro com as casas que a conta realmente usou, a partir de unidades
 * internas (1/10.000 de centavo): 350,035 centavos → "R$ 3,50035". Só usa
 * inteiros, então a conta escrita na tela reproduz o resultado sem ruído.
 * @param {number} unidades inteiro não negativo
 */
export function reaisExatos(unidades) {
  const porReal = UNIDADES_POR_CENTAVO * 100;
  const resto = unidades % porReal;
  const inteiro = (unidades - resto) / porReal;
  const fração = String(resto).padStart(6, '0').replace(/0+$/, '').padEnd(2, '0');
  return `R$${ESPAÇO_FIXO}${formatarNúmero(inteiro, { casas: 0 })},${fração}`;
}

/** O que cada nome de campo do cálculo é na tela. */
function campoNaTela(campo) {
  const faixa = /^faixa(\d+)\.(ateCentavos|percentual)$/.exec(campo ?? '');
  if (faixa) return `faixa${faixa[1]}${faixa[2] === 'percentual' ? 'Percentual' : 'Ate'}`;
  if (campo === 'faixas') return 'faixa1Ate';
  if (campo === 'vendasCentavos') return 'vendas';
  return campo ?? 'vendas';
}

/** Executa o cálculo e leva a recusa dele para o campo que a pessoa precisa corrigir. */
function noCampoCerto(executar) {
  try {
    return executar();
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) throw erro;
    if (erro instanceof Error && erro.constructor === Error) throw new ErroDeEntrada(erro.message, campoNaTela(erro.campo));
    throw erro;
  }
}

/**
 * Reais digitados → centavos inteiros. Fração de centavo ("1,005") é recusada:
 * arredondá-la calada mudaria o número que a pessoa escreveu.
 */
function centavosDoCampo(valor, campo, rótulo) {
  if (valor * 100 > LIMITE_DE_VENDAS_CENTAVOS) {
    throw new ErroDeEntrada(`${rótulo}: o limite é ${reais(LIMITE_DE_VENDAS_CENTAVOS)}.`, campo);
  }
  const centavos = valor * 100;
  const inteiro = Math.round(centavos);
  if (Math.abs(centavos - inteiro) > 1e-3) {
    throw new ErroDeEntrada(`${rótulo}: use no máximo duas casas decimais (centavos), por exemplo 1.234,56.`, campo);
  }
  return inteiro || 0;
}

const vazio = (dados, nome) => String(dados[nome] ?? '').trim() === '';

/**
 * Lê as faixas preenchidas, de cima para baixo. Linha em branco no meio é
 * recusada: aceitar e pular mudaria a numeração das faixas que a pessoa vê.
 */
function lerFaixas(dados) {
  const faixas = [];
  for (const n of NÚMEROS_DAS_FAIXAS) {
    const semFim = vazio(dados, `faixa${n}Ate`);
    const semPercentual = vazio(dados, `faixa${n}Percentual`);
    if (semFim && semPercentual) {
      const maisAdiante = NÚMEROS_DAS_FAIXAS.filter((m) => m > n)
        .some((m) => !vazio(dados, `faixa${m}Ate`) || !vazio(dados, `faixa${m}Percentual`));
      if (maisAdiante) {
        throw new ErroDeEntrada(`Preencha a faixa ${n} antes das seguintes, ou apague as faixas de baixo.`, `faixa${n}Percentual`);
      }
      break;
    }
    if (semPercentual) {
      throw new ErroDeEntrada(`Informe a comissão da faixa ${n}, em percentual (use 0 se ela não paga comissão).`, `faixa${n}Percentual`);
    }
    const percentual = número(dados, `faixa${n}Percentual`, { rótulo: `Comissão da faixa ${n}`, mín: 0, máx: 100 });
    const ateCentavos = semFim
      ? null
      : centavosDoCampo(
        número(dados, `faixa${n}Ate`, { rótulo: `Fim da faixa ${n}`, mín: 0 }),
        `faixa${n}Ate`,
        `Fim da faixa ${n}`,
      );
    faixas.push({ ateCentavos, percentual });
  }
  if (faixas.length === 0) {
    throw new ErroDeEntrada('Informe pelo menos a faixa 1: até quanto ela vai e qual o percentual de comissão.', 'faixa1Percentual');
  }
  return faixas;
}

/** "Faixa 2 (de R$ 10.000,00 a R$ 20.000,00)": a descrição da faixa, como a pessoa a configurou. */
function descriçãoDaFaixa(parte, total) {
  if (total === 1 && parte.ateCentavos === null) return 'Todas as vendas';
  const intervalo = parte.ateCentavos === null
    ? `acima de ${reais(parte.deCentavos)}`
    : parte.ordem === 1 ? `até ${reais(parte.ateCentavos)}` : `de ${reais(parte.deCentavos)} a ${reais(parte.ateCentavos)}`;
  return `Faixa ${parte.ordem} (${intervalo})`;
}

/** Nome curto da faixa, para a tabela do PDF (as células do PDF não quebram linha). */
function nomeCurtoDaFaixa(parte, total) {
  return total === 1 && parte.ateCentavos === null ? 'Todas as vendas' : `Faixa ${parte.ordem}`;
}

/**
 * Documento PDF do resumo, em bytes. Separado do download para poder ser
 * conferido em teste sem navegador.
 */
export function pdfDaComissão({ subtítulo, destaque, resultados, tabelaDasFaixas, dados, conta }) {
  const pdf = textoParaPdf;
  const pares = (linhas) => linhas.map(([rótulo, valor]) => [pdf(rótulo), pdf(valor)]);
  const documento = montarDocumentoPdf({ título: pdf(TÍTULO), subtítulo: pdf(subtítulo) });
  documento.destaque(pdf(destaque[0]), pdf(destaque[1]));
  documento.seção('Resultado');
  documento.tabela(['Item', 'Valor'], pares(resultados), [68, 32]);
  documento.seção('Comissão por faixa');
  documento.tabela(
    ['Faixa', 'Vendas na faixa', 'Percentual', 'Comissão'],
    tabelaDasFaixas.map((linha) => linha.map(pdf)),
    [34, 26, 16, 24],
  );
  documento.seção('Dados informados');
  documento.tabela(['Item', 'Valor'], pares(dados), [46, 54]);
  documento.seção('A conta');
  for (const linha of conta) documento.parágrafo(pdf(linha), { tamanho: 9.5 });
  documento.espaço(4);
  documento.parágrafo('Calculado no seu navegador. Nenhum dado foi enviado.', { tamanho: 8, cor: '#5c6270' });
  return documento.gerarBytes();
}

/**
 * Lê o formulário, calcula e monta o que a tela, o texto copiado, a planilha e o PDF mostram.
 * Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function calcularComissãoNaTela(dados) {
  const modo = String(dados.modo ?? 'simples');
  if (modo !== 'simples' && modo !== 'escalonada') {
    throw new ErroDeEntrada('Escolha comissão com percentual único ou escalonada por faixa.', 'modo');
  }
  const vendasCentavos = centavosDoCampo(
    número(dados, 'vendas', { rótulo: 'Vendas do período', mín: 0 }),
    'vendas',
    'Vendas do período',
  );
  const entrada = {
    vendasCentavos,
    modo,
    descontoPercentual: número(dados, 'descontoPercentual', {
      rótulo: 'Desconto sobre a comissão', mín: 0, máx: 100, obrigatório: false, padrão: 0,
    }),
  };
  if (modo === 'simples') {
    entrada.percentual = número(dados, 'percentual', { rótulo: 'Percentual de comissão', mín: 0, máx: 100 });
  } else {
    entrada.faixas = lerFaixas(dados);
  }

  const r = noCampoCerto(() => calcularComissão(entrada));
  const comDesconto = r.descontoPontosBase > 0;
  const total = r.partes.length;
  const escalonada = modo === 'escalonada';
  const alcançadas = r.partes.filter((p) => p.baseCentavos > 0);
  const últimaParte = r.partes.at(-1);

  const frase = vendasCentavos === 0
    ? 'Sem vendas no período, não há comissão.'
    : `Sobre ${reais(vendasCentavos)} em vendas, a comissão bruta é ${reais(r.brutaCentavos)}`
      + (comDesconto
        ? `; descontados ${percentualDe(r.descontoPontosBase)}, a comissão líquida é ${reais(r.líquidaCentavos)}.`
        : '.');

  // ---- a conta, escrita para ser refeita à mão ----
  const conta = [];
  if (!escalonada) {
    conta.push(`A conta: comissão = vendas × percentual = ${reais(vendasCentavos)} × ${percentualDe(r.partes[0].pontosBase)} = ${reaisExatos(r.somaExataEmUnidades)}.`);
  } else {
    conta.push('Comissão escalonada: cada faixa paga o seu percentual só sobre a parte das vendas que cai dentro dela. '
      + 'As vendas inteiras não passam para o percentual da faixa mais alta.');
    for (const parte of r.partes) {
      conta.push(parte.baseCentavos > 0
        ? `${descriçãoDaFaixa(parte, total)}: ${reais(parte.baseCentavos)} × ${percentualDe(parte.pontosBase)} = ${reaisExatos(parte.exatoEmUnidades)}.`
        : `${descriçãoDaFaixa(parte, total)}: as vendas não chegaram a esta faixa.`);
    }
    if (alcançadas.length > 1) {
      conta.push(`Soma das faixas: ${alcançadas.map((p) => reaisExatos(p.exatoEmUnidades)).join(' + ')} = ${reaisExatos(r.somaExataEmUnidades)}.`);
    }
  }
  conta.push(r.somaExataEmUnidades % UNIDADES_POR_CENTAVO === 0
    ? 'Arredondamento: a soma já cai em centavos exatos, então nada foi arredondado.'
    : `Arredondamento: a soma exata é ${reaisExatos(r.somaExataEmUnidades)} e foi arredondada ao centavo (a metade sobe): ${reais(r.brutaCentavos)}. `
      + 'As faixas são somadas com todas as casas e só a soma é arredondada.');
  if (comDesconto) {
    const descontoExato = r.brutaCentavos * r.descontoPontosBase;
    const arredondou = descontoExato % UNIDADES_POR_CENTAVO !== 0;
    conta.push(`Desconto: ${percentualDe(r.descontoPontosBase)} de ${reais(r.brutaCentavos)} = ${reaisExatos(descontoExato)}`
      + (arredondou ? `, arredondado ao centavo (a metade sobe): ${reais(r.descontoCentavos)}. ` : '. ')
      + `Comissão líquida = ${reais(r.brutaCentavos)} − ${reais(r.descontoCentavos)} = ${reais(r.líquidaCentavos)}.`);
  }
  if (escalonada && vendasCentavos > 0) {
    conta.push(`Na média, a comissão bruta equivale a ${formatarNúmero((r.brutaCentavos / vendasCentavos) * 100, { casas: 2, casasMínimas: 2 })}% das vendas.`);
  }
  if (r.foraDeFaixaCentavos > 0) {
    conta.push(`Atenção: ${reais(r.foraDeFaixaCentavos)} das vendas passam do fim da última faixa (${reais(últimaParte.ateCentavos)}) e não rendem comissão. `
      + 'Se a última faixa deve valer para tudo o que passar, deixe o campo "vendas até" dela em branco.');
  }

  // ---- tabela por faixa (tela, CSV e planilha) ----
  const linhasDaTabela = r.partes.map((p) => [
    descriçãoDaFaixa(p, total), reais(p.baseCentavos), percentualDe(p.pontosBase), reaisExatos(p.exatoEmUnidades),
  ]);
  if (r.foraDeFaixaCentavos > 0) {
    linhasDaTabela.push(['Acima da última faixa (sem comissão)', reais(r.foraDeFaixaCentavos), '0%', reaisExatos(0)]);
  }
  // Com uma só linha, ela já é o total: repetir a soma só poluiria a tabela.
  if (linhasDaTabela.length > 1) linhasDaTabela.push(['Soma das faixas', reais(vendasCentavos), '', reaisExatos(r.somaExataEmUnidades)]);

  const linhasDoPdf = r.partes.map((p) => [
    nomeCurtoDaFaixa(p, total), reais(p.baseCentavos), percentualDe(p.pontosBase), reaisExatos(p.exatoEmUnidades),
  ]);
  if (r.foraDeFaixaCentavos > 0) {
    linhasDoPdf.push(['Acima da última faixa', reais(r.foraDeFaixaCentavos), '0%', reaisExatos(0)]);
  }
  if (linhasDoPdf.length > 1) linhasDoPdf.push(['Soma das faixas', reais(vendasCentavos), '', reaisExatos(r.somaExataEmUnidades)]);

  // ---- resumo para o texto copiado e o PDF ----
  const resultados = [['Comissão bruta', reais(r.brutaCentavos)]];
  if (comDesconto) resultados.push([`Desconto (${percentualDe(r.descontoPontosBase)})`, reais(r.descontoCentavos)]);
  resultados.push(['Comissão líquida', reais(r.líquidaCentavos)]);

  const dadosUsados = [
    ['Tipo de comissão', escalonada ? 'Escalonada por faixa' : 'Percentual único'],
    ['Vendas do período', reais(vendasCentavos)],
  ];
  if (!escalonada) {
    dadosUsados.push(['Percentual de comissão', percentualDe(r.partes[0].pontosBase)]);
  } else {
    for (const p of r.partes) {
      const limite = p.ateCentavos === null ? 'sem limite' : `até ${reais(p.ateCentavos)}`;
      dadosUsados.push([`Faixa ${p.ordem}`, `${limite}, ${percentualDe(p.pontosBase)}`]);
    }
  }
  dadosUsados.push(['Desconto sobre a comissão', percentualDe(r.descontoPontosBase)]);

  const resumo = {
    título: TÍTULO,
    destaque: ['Comissão líquida', reais(r.líquidaCentavos)],
    resultados: resultados.slice(0, -1),
    dados: dadosUsados,
    conta: [frase, ...conta],
  };

  const linhas = [['Vendas do período', reais(vendasCentavos)], ['Comissão bruta', reais(r.brutaCentavos)]];
  if (comDesconto) linhas.push([`Desconto (${percentualDe(r.descontoPontosBase)})`, reais(r.descontoCentavos)]);
  linhas.push(['Comissão líquida', reais(r.líquidaCentavos)]);

  return {
    valor: `${reais(r.líquidaCentavos)} de comissão${comDesconto ? ' líquida' : ''}`,
    resumo: frase,
    linhas,
    tabela: {
      cabeçalho: ['Faixa', 'Vendas na faixa', 'Percentual', 'Comissão'],
      linhas: linhasDaTabela,
    },
    observações: conta,
    texto: textoDoResumo(resumo),
    arquivos: [{
      rótulo: 'Baixar resumo em PDF',
      ícone: 'documento',
      gerar: () => baixar(
        pdfDaComissão({
          subtítulo: `Vendas de ${reais(vendasCentavos)}`,
          destaque: resumo.destaque,
          resultados,
          tabelaDasFaixas: linhasDoPdf,
          dados: dadosUsados,
          conta: resumo.conta,
        }),
        `${nomeDeArquivo('comissao')}.pdf`,
        'application/pdf',
      ),
    }],
  };
}

/** Campos das cinco faixas, em pares (até quanto, percentual) que a grade da tela alinha lado a lado. */
const EXEMPLOS_DAS_FAIXAS = { 1: ['10.000,00', '3'], 2: ['20.000,00', '5'], 3: ['', '8'] };

function camposDasFaixas() {
  return NÚMEROS_DAS_FAIXAS.flatMap((n) => {
    const [exemploAte = '', exemploPercentual = ''] = EXEMPLOS_DAS_FAIXAS[n] ?? [];
    return [
      {
        nome: `faixa${n}Ate`, rótulo: `Faixa ${n}: vendas até (R$)`, tipo: 'número', exemplo: exemploAte,
        dica: n === 1 ? 'Até onde vão as vendas acumuladas nesta faixa. Na última faixa, deixe em branco: sem limite.' : undefined,
      },
      {
        nome: `faixa${n}Percentual`, rótulo: `Faixa ${n}: comissão (%)`, tipo: 'número', exemplo: exemploPercentual,
        dica: n === 1 ? 'Percentual pago só sobre a parte das vendas que cai nesta faixa.' : undefined,
      },
    ];
  });
}

export default {
  instruções: {
    passos: [
      'Escolha o tipo: percentual único (um só percentual sobre todas as vendas) ou escalonada (percentuais diferentes por faixa de vendas).',
      'Informe as vendas do período em reais.',
      'No percentual único, escreva o percentual. Na escalonada, preencha as faixas de cima para baixo: até quanto vão as vendas em cada uma e o percentual dela. Deixe o "até" da última faixa em branco para valer sem limite.',
      'Se algum valor sai da comissão (um imposto, por exemplo), informe o desconto em percentual.',
      'Toque em Calcular. A tela mostra a conta de cada faixa, o arredondamento e a comissão líquida. Copie, baixe o PDF ou a planilha.',
    ],
    exemplo: {
      texto: 'Vendas de R$ 25.000,00 com três faixas: até R$ 10.000,00 a 3%, até R$ 20.000,00 a 5% e acima disso a 8%. '
        + 'A faixa 1 paga 3% sobre R$ 10.000,00 (R$ 300,00); a faixa 2, 5% sobre os R$ 10.000,00 seguintes (R$ 500,00); '
        + 'a faixa 3, 8% só sobre os R$ 5.000,00 que passaram de R$ 20.000,00 (R$ 400,00). A comissão bruta é R$ 1.200,00. '
        + 'Com 10% de desconto, saem R$ 120,00 e a comissão líquida fica em R$ 1.080,00.',
    },
    limites: `Vendas até ${formatarMoeda(LIMITE_DE_VENDAS_CENTAVOS / 100)}, no máximo ${MÁXIMO_DE_FAIXAS} faixas e percentuais com até duas casas decimais `
      + '(3,25% vale; 3,255% é recusado para não mudar o que você escreveu). Cada faixa paga só sobre a parte das vendas que cai nela. '
      + 'As faixas são somadas com todas as casas e só a soma é arredondada ao centavo (a metade sobe); o desconto incide sobre a comissão bruta já arredondada, '
      + 'e a líquida é a bruta menos o desconto. Se a última faixa tiver limite, o que passar dele não rende comissão e a tela avisa. '
      + 'A ferramenta calcula um vendedor por vez e não considera devoluções nem metas por equipe.',
    perguntas: [
      { p: 'A faixa mais alta vale para todas as vendas?', r: 'Não. Cada faixa vale só para a parte das vendas que cai dentro dela, como o imposto de renda progressivo. Quem passa para a faixa de 8% recebe 8% apenas sobre o que passou da faixa anterior. Se o seu plano paga o percentual maior sobre tudo quando a meta é batida, use o percentual único com o percentual da meta.' },
      { p: 'O que fazer com a última faixa?', r: 'Deixe o campo "vendas até" dela em branco. Assim ela vale para tudo o que passar da faixa anterior. Se você escrever um valor, o que passar dele não rende comissão, e a tela mostra esse valor.' },
      { p: 'Como o centavo é arredondado?', r: 'As faixas são somadas com todas as casas decimais e só a soma é arredondada ao centavo, com a metade subindo. O desconto é calculado sobre a comissão bruta já arredondada e também arredondado. Assim bruta menos desconto é sempre igual à líquida que aparece na tela.' },
      { p: 'Para que serve o desconto?', r: 'Para o que sai da comissão antes de chegar ao vendedor, como um imposto retido. Deixe 0 se não houver.' },
      { p: 'Posso calcular vários vendedores de uma vez?', r: 'Não. Calcule um por vez, trocando as vendas. As faixas continuam preenchidas enquanto você não tocar em Limpar.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular comissão',
      campos: [
        {
          nome: 'modo', rótulo: 'Tipo de comissão', tipo: 'seleção', padrão: 'simples',
          opções: [
            { valor: 'simples', rótulo: 'Percentual único' },
            { valor: 'escalonada', rótulo: 'Escalonada por faixa' },
          ],
        },
        { nome: 'vendas', rótulo: 'Vendas do período (R$)', tipo: 'número', exemplo: '25.000,00' },
        { nome: 'percentual', rótulo: 'Percentual de comissão (%)', tipo: 'número', exemplo: '5' },
        ...camposDasFaixas(),
        {
          nome: 'descontoPercentual', rótulo: 'Desconto sobre a comissão (%)', tipo: 'número', padrão: '0',
          dica: 'Opcional. Por exemplo, um imposto que sai da comissão.',
        },
      ],
      calcular: calcularComissãoNaTela,
      aoMontar(raizDaFerramenta) {
        const formulário = raizDaFerramenta.querySelector('#formulário');
        const resultado = raizDaFerramenta.querySelector('#resultado');
        const seletor = formulário.elements.modo;

        // Cada tipo mostra só os campos que usa; o outro grupo fica escondido e é ignorado no cálculo.
        const sincronizar = () => {
          const escalonada = seletor.value === 'escalonada';
          for (const campo of formulário.querySelectorAll('[data-campo]')) {
            const nome = campo.dataset.campo;
            if (nome === 'percentual') campo.hidden = escalonada;
            else if (/^faixa\d/.test(nome)) campo.hidden = !escalonada;
          }
        };
        seletor.addEventListener('change', () => {
          // O resultado de um tipo não vale para o outro: escondê-lo evita ler a conta errada.
          resultado.hidden = true;
          sincronizar();
        });
        // O navegador só restaura o seletor depois do evento reset.
        formulário.addEventListener('reset', () => setTimeout(sincronizar, 0));
        sincronizar();
      },
    });
  },
};

/** Fluxo de caixa: lançamentos locais, conciliação e projeção por data de corte. */
import { montarFerramenta, número, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { pdfDoResumo } from './auxiliares/resumo-de-custos.js';

const dinheiro = (centavos) => formatarMoeda(centavos / 100);

function dataValida(bruto, campo) {
  const texto = String(bruto ?? '').trim();
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!brasileira && !iso) throw new ErroDeEntrada('Informe uma data válida, como 02/11/2026.', campo);
  const ano = Number(brasileira ? brasileira[3] : iso[1]);
  const mes = Number(brasileira ? brasileira[2] : iso[2]);
  const dia = Number(brasileira ? brasileira[1] : iso[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (ano < 2000 || ano > 2100 || data.getUTCFullYear() !== ano ||
      data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new ErroDeEntrada('Data inexistente ou fora do período de 2000 a 2100.', campo);
  }
  return [String(ano).padStart(4, '0'), String(mes).padStart(2, '0'), String(dia).padStart(2, '0')].join('-');
}
const diaBR = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

function centavosPositivos(texto, linha) {
  const valor = paraNúmero(texto);
  if (!Number.isFinite(valor) || valor <= 0 || valor > 100_000_000) {
    throw new ErroDeEntrada('Linha ' + linha + ': valor precisa ser maior que zero e até R$ 100 milhões.', 'lancamentos');
  }
  const centavos = Math.round(valor * 100);
  if (centavos === 0) throw new ErroDeEntrada('Linha ' + linha + ': valor abaixo de um centavo.', 'lancamentos');
  return centavos;
}

export function analisarFluxoDeCaixa({ saldoInicialCentavos, dataCorte, lançamentos }) {
  if (!Number.isSafeInteger(saldoInicialCentavos) || Math.abs(saldoInicialCentavos) > 1e13) {
    throw new ErroDeEntrada('Saldo inicial fora do limite.', 'saldoInicial');
  }
  const corte = dataValida(dataCorte, 'dataCorte');
  if (!Array.isArray(lançamentos) || lançamentos.length < 1 || lançamentos.length > 100) {
    throw new ErroDeEntrada('Informe de 1 a 100 lançamentos.', 'lancamentos');
  }
  const ordenados = lançamentos.map((l, i) => ({ ...l, índice: i }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.índice - b.índice);
  let saldo = saldoInicialCentavos;
  let saldoAtual = saldoInicialCentavos;
  let entradas = 0, saídas = 0, entradasFuturas = 0, saídasFuturas = 0;
  let primeiraNegativa = null;
  const evolução = ordenados.map((l) => {
    if (!Number.isSafeInteger(l.valorCentavos) || l.valorCentavos <= 0) {
      throw new ErroDeEntrada('Há lançamento com valor inválido.', 'lancamentos');
    }
    const valor = l.tipo === 'entrada' ? l.valorCentavos : l.tipo === 'saida' ? -l.valorCentavos : null;
    if (valor === null) throw new ErroDeEntrada('Tipo de lançamento inválido.', 'lancamentos');
    saldo += valor;
    if (!Number.isSafeInteger(saldo)) throw new ErroDeEntrada('Total de valores ultrapassa o limite de precisão.', 'lancamentos');
    const futuro = l.data > corte;
    if (valor > 0) {
      entradas += valor;
      if (futuro) entradasFuturas += valor;
    } else {
      saídas -= valor;
      if (futuro) saídasFuturas -= valor;
    }
    if (!futuro) saldoAtual = saldo;
    if (saldo < 0 && !primeiraNegativa) primeiraNegativa = { data: l.data, saldoCentavos: saldo, futuro };
    return { ...l, saldoCentavos: saldo, futuro };
  });
  return {
    saldoAtualCentavos: saldoAtual, saldoProjetadoCentavos: saldo, entradasCentavos: entradas,
    saidasCentavos: saídas, entradasFuturasCentavos: entradasFuturas, saidasFuturasCentavos: saídasFuturas,
    primeiraNegativa, evolução, corte,
  };
}

/** Leitura + saída da ferramenta; exportada para testes sem DOM. */
export function calcularFluxoNaTela(dados) {
  const inicial = número(dados, 'saldoInicial', { rótulo: 'Saldo inicial (R$)', obrigatório: false, padrão: 0 });
  if (Math.abs(inicial) > 100_000_000_000) throw new ErroDeEntrada('Saldo inicial muito alto.', 'saldoInicial');
  const texto = String(dados.lancamentos ?? '').trim();
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length < 1 || linhas.length > 100) throw new ErroDeEntrada('Informe de 1 a 100 lançamentos.', 'lancamentos');
  const lançamentos = linhas.map((linha, indice) => {
    const partes = linha.split(';').map((p) => p.trim());
    const númeroDaLinha = indice + 1;
    if (partes.length !== 4) {
      throw new ErroDeEntrada('Linha ' + númeroDaLinha + ': use data; descrição; entrada/saída; valor.', 'lancamentos');
    }
    const [data, descrição, tipoTexto, valor] = partes;
    if (!descrição || descrição.length > 100) {
      throw new ErroDeEntrada('Linha ' + númeroDaLinha + ': descrição de 1 a 100 caracteres.', 'lancamentos');
    }
    const tipo = tipoTexto.toLocaleLowerCase('pt-BR');
    if (!['entrada', 'saida', 'saída'].includes(tipo)) {
      throw new ErroDeEntrada('Linha ' + númeroDaLinha + ': tipo deve ser entrada ou saída.', 'lancamentos');
    }
    return { data: dataValida(data, 'lancamentos'), descrição,
      tipo: tipo === 'entrada' ? 'entrada' : 'saida', valorCentavos: centavosPositivos(valor, númeroDaLinha) };
  });
  const r = analisarFluxoDeCaixa({
    saldoInicialCentavos: Math.round(inicial * 100),
    dataCorte: dados.dataCorte, lançamentos,
  });
  const linhasResultado = [
    ['Saldo na data de corte (' + diaBR(r.corte) + ')', dinheiro(r.saldoAtualCentavos)],
    ['Saldo projetado (todos os lançamentos)', dinheiro(r.saldoProjetadoCentavos)],
    ['Total de entradas', dinheiro(r.entradasCentavos)],
    ['Total de saídas', dinheiro(r.saidasCentavos)],
    ['Entradas futuras', dinheiro(r.entradasFuturasCentavos)],
    ['Saídas futuras', dinheiro(r.saidasFuturasCentavos)],
  ];
  const observações = [
    r.primeiraNegativa
      ? 'Atenção: o saldo fica negativo em ' + diaBR(r.primeiraNegativa.data) + ' (' +
        dinheiro(r.primeiraNegativa.saldoCentavos) + ').'
      : 'Nenhum saldo negativo nos lançamentos informados.',
    'Lançamentos após a data de corte são uma previsão: não representam pagamentos já realizados.',
    'Informe todos os pagamentos e recebimentos esperados; itens não informados não entram na previsão.',
  ];
  const tabela = { cabeçalho: ['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo acumulado'],
    linhas: r.evolução.map((l) => [diaBR(l.data), l.descrição,
      l.futuro ? (l.tipo === 'entrada' ? 'Entrada prevista' : 'Saída prevista') :
        (l.tipo === 'entrada' ? 'Entrada' : 'Saída'),
      dinheiro(l.tipo === 'entrada' ? l.valorCentavos : -l.valorCentavos), dinheiro(l.saldoCentavos)]) };
  const textoCopiado = [
    'Fluxo de caixa', ...linhasResultado.map(([chave, valor]) => chave + ': ' + valor),
    ...observações, '', tabela.cabeçalho.join('; '),
    ...tabela.linhas.map((linha) => linha.join('; ')),
  ].join('\n');
  const resumoPdf = {
    título: 'Fluxo de caixa', subtítulo: 'Lançamentos e projeção',
    destaque: ['Saldo na data de corte', dinheiro(r.saldoAtualCentavos)],
    resultados: linhasResultado.slice(1),
    dados: [['Saldo inicial', dinheiro(Math.round(inicial * 100))],
      ['Data de corte', diaBR(r.corte)],
      ...r.evolução.map((l) => [diaBR(l.data) + ' · ' + l.descrição,
        (l.tipo === 'entrada' ? '+' : '-') + dinheiro(l.valorCentavos)])],
    conta: observações,
  };
  return {
    valor: dinheiro(r.saldoAtualCentavos),
    resumo: 'Saldo até ' + diaBR(r.corte) + '. Projeção: ' + dinheiro(r.saldoProjetadoCentavos) + '.',
    linhas: linhasResultado, tabela, observações, texto: textoCopiado,
    arquivos: [{ rótulo: 'Resumo em PDF', ícone: 'documento',
      gerar: () => baixar(pdfDoResumo(resumoPdf), nomeDeArquivo('fluxo-de-caixa') + '.pdf', 'application/pdf') }],
  };
}

export default {
  instruções: {
    passos: [
      'Informe o saldo inicial e a data de corte para separar valores atuais de previsões.',
      'Escreva uma linha por lançamento: data; descrição; entrada ou saída; valor.',
      'Calcule para acompanhar saldo, totais e o primeiro dia em que o caixa fica negativo.',
      'Copie o resumo ou baixe PDF, CSV e planilha Excel com todos os lançamentos.',
    ],
    exemplo: { texto: '02/11/2026; Venda; entrada; 1.200,00 e 05/11/2026; Aluguel; saída; 900,00. '
      + 'Com saldo inicial de R$ 100,00, a projeção depois dos dois movimentos é R$ 400,00.' },
    limites: 'Até 100 lançamentos; valores individuais até R$ 100 milhões; datas entre 2000 e 2100. '
      + 'Os dados são processados no navegador. Lançamentos futuros são projeções, não uma integração bancária. '
      + 'A data de corte é inclusiva; entradas e saídas no mesmo dia seguem a ordem escrita.',
    perguntas: [
      { p: 'Consigo prever falta de dinheiro?', r: 'Sim, quando você inclui os compromissos futuros. O primeiro saldo negativo é sinalizado.' },
      { p: 'Preciso me cadastrar?', r: 'Não. O cálculo e as exportações funcionam sem conta.' },
    ],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Analisar fluxo',
      campos: [
        { nome: 'saldoInicial', rótulo: 'Saldo inicial (R$)', tipo: 'número', padrão: '0' },
        { nome: 'dataCorte', rótulo: 'Data de corte (AAAA-MM-DD)', padrão: new Date().toLocaleDateString('sv-SE'),
          dica: 'Movimentos posteriores a esta data entram como previsão.' },
        { nome: 'lancamentos', rótulo: 'Lançamentos', tipo: 'área', linhas: 9,
          padrão: '02/11/2026; Venda; entrada; 1.200,00\n05/11/2026; Aluguel; saída; 900,00',
          dica: 'Uma linha por movimento: data; descrição; entrada/saída; valor (até 100 linhas).' },
      ], calcular: calcularFluxoNaTela,
    });
  },
};

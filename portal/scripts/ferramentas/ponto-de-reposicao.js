/** Ponto de reposição pela demanda média durante a entrega + segurança. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const num = (valor, casas = 2) => formatarNúmero(valor, { casas });
function limitado(valor, campo, máximo, mínimo = 0) {
  if (!Number.isFinite(valor) || valor < mínimo || valor > máximo) {
    throw new ErroDeEntrada('Informe um valor entre ' + mínimo + ' e ' + máximo + '.', campo);
  }
}

export function calcularReposicao({ consumoDiario, prazoDias, seguranca, emEstoque, aReceber = 0 }) {
  limitado(consumoDiario, 'consumoDiario', 1_000_000, 0);
  limitado(prazoDias, 'prazoDias', 365, 0);
  limitado(seguranca, 'seguranca', 100_000_000, 0);
  limitado(emEstoque, 'emEstoque', 100_000_000, 0);
  limitado(aReceber, 'aReceber', 100_000_000, 0);
  if (![seguranca, emEstoque, aReceber].every(Number.isInteger)) {
    throw new ErroDeEntrada('Estoque, segurança e encomendas devem estar em unidades inteiras.', 'emEstoque');
  }
  const consumoNoPrazo = consumoDiario * prazoDias;
  const ponto = Math.ceil(consumoNoPrazo + seguranca - 1e-9);
  const posicao = emEstoque + aReceber;
  const precisaPedir = posicao <= ponto;
  const quantidadeParaPonto = Math.max(0, ponto - posicao);
  const coberturaDias = consumoDiario > 0 ? emEstoque / consumoDiario : null;
  return { consumoNoPrazo, ponto, posicao, precisaPedir, quantidadeParaPonto, coberturaDias };
}

export function calcularReposicaoNaTela(dados) {
  const r = calcularReposicao({
    consumoDiario: número(dados, 'consumoDiario', { rótulo: 'Consumo médio diário', mín: 0, máx: 1_000_000 }),
    prazoDias: número(dados, 'prazoDias', { rótulo: 'Prazo de reposição em dias', mín: 0, máx: 365 }),
    seguranca: número(dados, 'seguranca', { rótulo: 'Estoque de segurança', mín: 0, máx: 100_000_000, inteiro: true }),
    emEstoque: número(dados, 'emEstoque', { rótulo: 'Estoque atual', mín: 0, máx: 100_000_000, inteiro: true }),
    aReceber: número(dados, 'aReceber', { rótulo: 'Pedidos confirmados a receber no prazo', mín: 0, máx: 100_000_000, inteiro: true, obrigatório: false, padrão: 0 }),
  });
  const linhas = [
    ['Demanda esperada durante a entrega', num(r.consumoNoPrazo) + ' unidades'],
    ['Ponto de reposição', num(r.ponto, 0) + ' unidades'],
    ['Posição de estoque (disponível + a receber)', num(r.posicao, 0) + ' unidades'],
    ['Diferença até o ponto', num(r.quantidadeParaPonto, 0) + ' unidades'],
    ['Cobertura pelo estoque atual', r.coberturaDias === null ? 'Sem consumo informado' : num(r.coberturaDias) + ' dias'],
    ['Situação', r.precisaPedir ? 'Atingiu o ponto: reavaliar compra' : 'Acima do ponto'],
  ];
  const observações = [
    'Ponto de reposição = teto(consumo médio diário × prazo de reposição + estoque de segurança).',
    'A diferença até o ponto NÃO é o lote ideal de compra: quantidade econômica e pedidos mínimos do fornecedor não são calculados.',
    'Só inclua em “a receber” encomendas confirmadas que chegarão dentro do prazo considerado. Esta ferramenta não consulta estoque ou fornecedores.',
    r.precisaPedir ? 'A posição informada está no ponto ou abaixo dele. Confira a demanda real antes de comprar.' : 'A posição informada está acima do ponto definido.',
  ];
  return {
    valor: num(r.ponto, 0) + ' unidades',
    resumo: r.precisaPedir ? 'Ponto atingido: confira a necessidade de reposição.' : 'Estoque acima do ponto informado.',
    linhas, observações, texto: ['Ponto de reposição', ...linhas.map(([a,b]) => a + ': ' + b), ...observações].join('\n'),
  };
}

export default {
  instruções: {
    passos: [
      'Informe o consumo médio de unidades por dia e o prazo esperado de entrega do fornecedor.',
      'Defina as unidades de estoque de segurança para proteger contra atrasos e oscilações.',
      'Informe a quantidade em estoque e as encomendas confirmadas que chegarão dentro desse prazo.',
      'Calcule o ponto de reposição e verifique se a posição de estoque já chegou a ele.',
    ],
    exemplo: { texto: 'Com 10 unidades vendidas por dia, entrega em 5 dias e segurança de 20, o ponto é 70 unidades. Com 40 em estoque e 10 a receber, a posição é 50: faltam 20 para atingir o ponto.' },
    limites: 'O resultado identifica o momento de avaliar novo pedido, não determina o tamanho ótimo de compra. Considera uma demanda diária constante e recebimentos dentro do prazo. Quantidades inteiras; sem integração com ERP.',
    perguntas: [
      { p: 'Estoque de segurança e ponto de reposição são a mesma coisa?', r: 'Não. O ponto também precisa cobrir o consumo durante a espera do fornecedor.' },
      { p: 'A diferença até o ponto é o que devo comprar?', r: 'Não necessariamente. O lote depende do período que a compra deve atender, pedidos mínimos e custos.' },
    ],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular reposição',
      campos: [
        { nome: 'consumoDiario', rótulo: 'Consumo médio por dia (un.)', tipo: 'número', padrão: '10' },
        { nome: 'prazoDias', rótulo: 'Entrega do fornecedor (dias)', tipo: 'número', padrão: '5' },
        { nome: 'seguranca', rótulo: 'Estoque de segurança (un.)', tipo: 'número', padrão: '20' },
        { nome: 'emEstoque', rótulo: 'Estoque atual (un.)', tipo: 'número', padrão: '40' },
        { nome: 'aReceber', rótulo: 'A receber dentro do prazo (un.)', tipo: 'número', padrão: '10' },
      ],
      calcular: calcularReposicaoNaTela,
    });
  },
};

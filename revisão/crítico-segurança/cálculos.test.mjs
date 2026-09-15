// Recalculo independente dos casos de conferência e de casos extremos dos seis produtos.
// Os valores esperados foram calculados à mão / por aritmética exata, não copiados dos testes
// dos executores. Testes marcados "ACHADO" afirmam o comportamento defeituoso observado
// (passam enquanto o defeito existir) e documentam a reprodução.
import test from 'node:test';
import assert from 'node:assert/strict';
import { importar, tetoExato } from './_util.mjs';

const perto = (obtido, esperado, eps = 1e-9) =>
  assert.ok(Math.abs(obtido - esperado) <= eps * Math.max(1, Math.abs(esperado)), `obtido ${obtido}, esperado ${esperado}`);

// ───────────────────────────── Produto 1 — confeitaria
const { calcularPreçoDeVenda } = await importar(1, 'scripts/cálculos/calcular-preço-de-venda.js');
const { calcularCustoDoIngrediente } = await importar(1, 'scripts/cálculos/calcular-custo-do-ingrediente.js');
const { calcularCustoDaReceita } = await importar(1, 'scripts/cálculos/calcular-custo-da-receita.js');
const { calcularRendimentoComPerdas } = await importar(1, 'scripts/cálculos/calcular-rendimento-com-perdas.js');
const { calcularAjusteDeQuantidade } = await importar(1, 'scripts/cálculos/calcular-ajuste-de-quantidade.js');
const { agregarItensDeProdução } = await importar(1, 'scripts/cálculos/agregar-itens-de-produção.js');
const { calcularListaDeCompras } = await importar(1, 'scripts/cálculos/calcular-lista-de-compras.js');
const { converterUnidade } = await importar(1, 'scripts/cálculos/converter-unidade.js');
const { calcularPreçoPorUnidade } = await importar(1, 'scripts/cálculos/calcular-preço-por-unidade.js');
const { calcularConversorDeFormas } = await importar(1, 'scripts/cálculos/calcular-conversor-de-formas.js');

test('P1 caso de conferência: R$ 80, 50 un., margem 30% → 114,2857 / 2,29 / 114,50', () => {
  const r = calcularPreçoDeVenda({ custoTotal: 80, quantidade: 50, margemPercentual: 30 });
  assert.equal(r.válido, true);
  perto(r.preçoDoLoteMatemático, 80 / 0.7);
  assert.equal(Math.round(r.preçoDoLoteMatemático * 1e4) / 1e4, 114.2857);
  assert.equal(r.preçoUnitárioEmCentavos, 229);
  assert.equal(r.preçoDoLoteEmCentavos, 11450);
  perto(r.margemEmReais, 34.5);
  perto(r.acréscimoSobreCustoPercentual, (114.5 / 80 - 1) * 100);
});

test('P1 margem sobre venda é diferente de acréscimo sobre custo (custo 100, margem 50% → 200)', () => {
  const r = calcularPreçoDeVenda({ custoTotal: 100, quantidade: 1, margemPercentual: 50 });
  assert.equal(r.preçoUnitárioEmCentavos, 20000);
  perto(r.acréscimoSobreCustoPercentual, 100);
});

test('P1 denominador zero ou negativo é bloqueado; entradas inválidas recusadas', () => {
  for (const [margem, taxas] of [[60, 40], [70, 40], [99.99, 0.01]]) {
    assert.equal(calcularPreçoDeVenda({ custoTotal: 10, quantidade: 1, margemPercentual: margem, taxasPercentuais: taxas }).válido, false, `${margem}+${taxas}`);
  }
  for (const entrada of [
    { custoTotal: 0, quantidade: 1, margemPercentual: 10 },
    { custoTotal: -5, quantidade: 1, margemPercentual: 10 },
    { custoTotal: NaN, quantidade: 1, margemPercentual: 10 },
    { custoTotal: Infinity, quantidade: 1, margemPercentual: 10 },
    { custoTotal: 10, quantidade: 0, margemPercentual: 10 },
    { custoTotal: 10, quantidade: 1.5, margemPercentual: 10 },
    { custoTotal: 10, quantidade: 1, margemPercentual: 100 },
    { custoTotal: 10, quantidade: 1, margemPercentual: -1 },
  ]) {
    assert.equal(calcularPreçoDeVenda(entrada).válido, false, JSON.stringify(entrada));
  }
});

test('P1 arredondamento acima × próximo acontece uma vez, na unidade', () => {
  const acima = calcularPreçoDeVenda({ custoTotal: 100, quantidade: 3, margemPercentual: 0 });
  const próximo = calcularPreçoDeVenda({ custoTotal: 100, quantidade: 3, margemPercentual: 0, modoDeArredondamento: 'próximo' });
  assert.deepEqual([acima.preçoUnitárioEmCentavos, acima.preçoDoLoteEmCentavos], [3334, 10002]);
  assert.deepEqual([próximo.preçoUnitárioEmCentavos, próximo.preçoDoLoteEmCentavos], [3333, 9999]);
});

test('ACHADO S-03: "arredondar para cima" devolve preço ABAIXO do custo em valores grandes', () => {
  // custo R$ 10.000.000,00, 1 unidade, margem 0 → o preço mínimo correto é 1.000.000.000 centavos.
  const r = calcularPreçoDeVenda({ custoTotal: 1e7, quantidade: 1, margemPercentual: 0 });
  assert.equal(r.preçoUnitárioEmCentavos, 999_999_999); // observado: 1 centavo abaixo do custo
  assert.ok(r.margemEmReais < 0);
  // custo R$ 1.000.000.000,00 (máximo aceito pelo formulário) → R$ 1,00 abaixo do custo.
  const r2 = calcularPreçoDeVenda({ custoTotal: 1e9, quantidade: 1, margemPercentual: 0 });
  assert.equal(r2.preçoUnitárioEmCentavos, 99_999_999_900);
});

test('P1 custo proporcional do ingrediente, conversão g/kg e pacotes inteiros', () => {
  const lata = calcularCustoDoIngrediente({ preçoComprado: 7.5, quantidadeComprada: 395, unidadeComprada: 'g', quantidadeUsada: 0.79, unidadeUsada: 'kg' });
  perto(lata.custoConsumido, 15);
  assert.equal(lata.pacotesNecessários, 2);
  perto(lata.custoDeEstoque, 0, 1e-9);
  const açúcar = calcularCustoDoIngrediente({ preçoComprado: 10, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 250, unidadeUsada: 'g' });
  perto(açúcar.custoConsumido, 2.5);
  assert.equal(açúcar.pacotesNecessários, 1);
  perto(açúcar.custoDeEstoque, 7.5);
  assert.equal(calcularCustoDoIngrediente({ preçoComprado: 5, quantidadeComprada: 1, unidadeComprada: 'L', quantidadeUsada: 100, unidadeUsada: 'g' }).válido, false);
  assert.equal(calcularCustoDoIngrediente({ preçoComprado: 5, quantidadeComprada: 0, unidadeComprada: 'g', quantidadeUsada: 100, unidadeUsada: 'g' }).válido, false);
  assert.equal(converterUnidade(100, 'g', 'ml').válido, false);
  assert.equal(converterUnidade(1, 'unidade', 'g').válido, false);
  perto(converterUnidade(1.5, 'L', 'ml').valor, 1500);
});

test('P1 custo da receita separa consumido, estoque e dinheiro necessário', () => {
  const r = calcularCustoDaReceita({
    ingredientes: [
      { nome: 'Açúcar', preçoComprado: 10, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 250, unidadeUsada: 'g' },
      { nome: 'Leite condensado', preçoComprado: 7.5, quantidadeComprada: 395, unidadeComprada: 'g', quantidadeUsada: 790, unidadeUsada: 'g' },
    ],
    rendimentoAproveitável: 50,
    embalagemDeVendaPorUnidade: 0.2,
    tempoDePreparoEmMinutos: 90,
    valorDaHora: 20,
    custosAdicionais: 5,
  });
  perto(r.custoConsumidoTotal, 2.5 + 15 + 10 + 30 + 5);
  perto(r.custoPorUnidade, 62.5 / 50);
  perto(r.dinheiroNecessárioTotal, 10 + 15 + 10 + 30 + 5);
  perto(r.custoDeEstoqueTotal, 7.5);
});

test('P1 rendimento com perdas, ajuste de quantidade e lotes sem erro de ponto flutuante', () => {
  const perdas = calcularRendimentoComPerdas({ unidadesProduzidas: 50, percentualDePerda: 5, custoTotal: 94 });
  assert.equal(perdas.unidadesAproveitáveis, 47);
  perto(perdas.custoPorUnidadeAproveitável, 2);
  const ajuste = calcularAjusteDeQuantidade({ rendimentoOriginal: 25, quantidadeDesejada: 30 });
  perto(ajuste.fatorDeEscala, 1.2);
  assert.equal(ajuste.lotesInteiros, 2);
  assert.equal(calcularAjusteDeQuantidade({ rendimentoOriginal: 0.1, quantidadeDesejada: 0.7 }).lotesInteiros, 7); // 6,999999999999999
  assert.equal(calcularAjusteDeQuantidade({ rendimentoOriginal: 0.1, quantidadeDesejada: 0.3 }).lotesInteiros, 3); // 2,9999999999999996
});

test('P1 lista de compras soma receitas × lotes e arredonda embalagens', () => {
  const agregado = agregarItensDeProdução({
    linhas: [
      { nomeDaReceita: 'A', lotes: 1, ingredientes: [{ nome: 'Leite condensado', quantidadeUsada: 790, unidadeUsada: 'g', quantidadeComprada: 395, unidadeComprada: 'g', preçoComprado: 7.5 }] },
      { nomeDaReceita: 'B', lotes: 2, ingredientes: [{ nome: 'leite condensado', quantidadeUsada: 0.395, unidadeUsada: 'kg', quantidadeComprada: 395, unidadeComprada: 'g', preçoComprado: 7.5 }] },
    ],
  });
  assert.equal(agregado.itens.length, 1);
  perto(agregado.itens[0].quantidadeNecessária, 1580);
  const lista = calcularListaDeCompras({ itens: agregado.itens });
  assert.equal(lista.itens[0].pacotes, 4);
  perto(lista.custoTotal, 30);
});

test('ACHADO S-10: mesmo ingrediente com embalagens diferentes — a lista usa só a da primeira receita', () => {
  const agregado = agregarItensDeProdução({
    linhas: [
      { nomeDaReceita: 'A', lotes: 1, ingredientes: [{ nome: 'Açúcar', quantidadeUsada: 800, unidadeUsada: 'g', quantidadeComprada: 1, unidadeComprada: 'kg', preçoComprado: 5 }] },
      { nomeDaReceita: 'B', lotes: 1, ingredientes: [{ nome: 'açúcar', quantidadeUsada: 4, unidadeUsada: 'kg', quantidadeComprada: 5, unidadeComprada: 'kg', preçoComprado: 20 }] },
    ],
  });
  const lista = calcularListaDeCompras({ itens: agregado.itens });
  // 4,8 kg comprados em pacotes de 1 kg a R$ 5 (5 pacotes, R$ 25), sem aviso; a embalagem de 5 kg da receita B é ignorada.
  assert.equal(lista.itens[0].pacotes, 5);
  perto(lista.custoTotal, 25);
  assert.equal(lista.itens[0].quantidadeComprada, 1);
});

test('P1 preço por unidade e conversor de formas', () => {
  const r = calcularPreçoPorUnidade({ embalagens: [{ nome: 'A', quantidade: 1, unidade: 'kg', preço: 10 }, { nome: 'B', quantidade: 500, unidade: 'g', preço: 6 }] });
  perto(r.embalagens[1].preçoPorUnidadeDeReferência, 12);
  assert.equal(r.maisEconômicaNome, 'A');
  assert.equal(calcularPreçoPorUnidade({ embalagens: [{ quantidade: 1, unidade: 'kg', preço: 1 }, { quantidade: 1, unidade: 'L', preço: 1 }] }).válido, false);
  const formas = calcularConversorDeFormas({ origem: { tipo: 'redonda', diâmetro: 20 }, destino: { tipo: 'retangular', largura: 20, comprimento: 30 }, quantidadeOriginal: 1000 });
  perto(formas.fatorDeConversão, 600 / (Math.PI * 100));
});

// ───────────────────────────── Produto 3 — artesanato
const { calcularCustoDoMaterial } = await importar(3, 'scripts/cálculos/calcular-custo-do-material.js');
const { calcularPreçoDaPeça } = await importar(3, 'scripts/cálculos/calcular-preço-da-peça.js');
const { calcularEfeitoDeDesconto } = await importar(3, 'scripts/cálculos/calcular-efeito-de-desconto.js');
const { calcularValorDaHora } = await importar(3, 'scripts/cálculos/calcular-valor-da-hora.js');
const { calcularAmostraDePontos } = await importar(3, 'scripts/cálculos/calcular-amostra-de-pontos.js');
const { calcularPlanejadorDeEncomendas } = await importar(3, 'scripts/cálculos/calcular-planejador-de-encomendas.js');

test('P3 caso de conferência: novelo R$ 20 / 100 g, consumo 25 g = R$ 5', () => {
  perto(calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 25, unidadeConsumo: 'g' }).custoProporcional, 5);
  perto(calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 0.1, unidadeComprada: 'kg', consumo: 25, unidadeConsumo: 'g' }).custoProporcional, 5);
  perto(calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 50, unidadeConsumo: 'm', metrosPor100g: 200 }).custoProporcional, 5);
  assert.equal(calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 50, unidadeConsumo: 'm' }).válido, false);
  assert.equal(calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 0, unidadeComprada: 'g', consumo: 25, unidadeConsumo: 'g' }).válido, false);
  assert.equal(calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 10, unidadeComprada: 'un', consumo: 25, unidadeConsumo: 'g' }).válido, false);
});

test('P3 soma com mão de obra e embalagem antes da margem; desconto com prejuízo sinalizado', () => {
  const r = calcularPreçoDaPeça({ custoDeMateriais: 5, horas: 2, valorHora: 15, embalagem: 2, margemPercentual: 30, quantidadeDoConjunto: 3 });
  perto(r.custoDoArtesanato, 37);
  perto(r.preçoPorPeçaMatemático, 37 / 0.7);
  assert.equal(r.preçoPorPeçaEmCentavos, 5286);
  assert.equal(r.preçoDoConjuntoEmCentavos, 15858);
  const desconto = calcularEfeitoDeDesconto({ preço: 52.86, custo: 37, descontoPercentual: 40 });
  assert.equal(desconto.prejuízo, true);
  perto(desconto.preçoComDesconto, 31.716);
  assert.equal(calcularEfeitoDeDesconto({ preço: 52.86, custo: 37, descontoPercentual: 20 }).prejuízo, false);
  perto(calcularValorDaHora({ metaMensal: 3000, custosFixosMensais: 500, horasProdutivasPorMês: 100 }).valorPorHora, 35);
});

test('P3 amostra de pontos e planejador de encomendas', () => {
  const a = calcularAmostraDePontos({ pontosDaAmostra: 20, larguraDaAmostraCm: 10, larguraDesejadaCm: 50, múltiploDoPadrão: 6, pontosDeBorda: 2 });
  assert.deepEqual([a.pontosFinais, a.ajustadoParaBaixo, a.ajustadoParaCima], [100, 98, 104]);
  const p = calcularPlanejadorDeEncomendas({ quantidadeDePeças: 10, horasPorPeça: 3, capacidadeHorasPorDia: 4, diasDaSemanaTrabalhados: [false, true, true, true, true, true, false], dataDeInício: '2026-09-14' });
  assert.equal(p.diasProdutivosNecessários, 8);
  assert.equal(p.dataEstimadaDeEntrega, '2026-09-23');
  assert.equal(calcularPlanejadorDeEncomendas({ quantidadeDePeças: 1_000_000, horasPorPeça: 1000, capacidadeHorasPorDia: 0.01, diasDaSemanaTrabalhados: [true, true, true, true, true, true, true], dataDeInício: '2026-09-14' }).válido, false);
});

// ───────────────────────────── Produto 4 — festas
const { calcularPlanoDeConsumo } = await importar(4, 'scripts/cálculos/calcular-plano-de-consumo.js');
const { montarCatálogoDeItensPadrão } = await importar(4, 'scripts/cálculos/montar-catálogo-de-itens-padrão.js');
const { calcularDivisãoDeDespesas } = await importar(4, 'scripts/cálculos/calcular-divisao-de-despesas.js');
const { calcularOrçamentoDoEvento } = await importar(4, 'scripts/cálculos/calcular-orçamento-do-evento.js');

const churrasco = (extra = {}) => calcularPlanoDeConsumo({ adultos: 10, crianças: 0, duraçãoEmHoras: 4, apetite: 'médio', itens: montarCatálogoDeItensPadrão('churrasco'), ...extra });
const item = (plano, chave) => plano.itens.find((i) => i.chave === chave);

test('P4 churrasco 10 adultos, 4 h: quantidades recalculadas à mão, perdas uma vez', () => {
  const p = churrasco();
  assert.equal(p.reduzCarnePorAcompanhamentos, true); // 4 acompanhamentos
  perto(item(p, 'carne-sem-osso').quantidadeLíquida, 450 * 10 * 0.9);
  assert.equal(item(p, 'carne-sem-osso').quantidadeParaComprar, 5000);
  assert.equal(item(p, 'costela-com-osso').quantidadeParaComprar, 8000); // 4950 / 0,65 = 7615 → 8 kg
  assert.equal(item(p, 'linguiça').quantidadeParaComprar, 1500);
  assert.equal(item(p, 'pão-de-alho').quantidadeParaComprar, 8);
  assert.equal(item(p, 'refrigerante-suco').quantidadeParaComprar, 8000);
  assert.equal(item(p, 'cerveja').quantidadeParaComprar, 0); // 0 adultos com álcool
  assert.equal(churrasco({ adultosComConsumoDeÁlcool: 6 }).itens.find((i) => i.chave === 'cerveja').quantidadeParaComprar, 8400);
});

test('P4 zero convidados, só crianças, álcool > adultos, duração extrema, embalagem indivisível', () => {
  assert.equal(churrasco({ adultos: 0 }).válido, false);
  const sóCrianças = churrasco({ adultos: 0, crianças: 10 });
  assert.equal(item(sóCrianças, 'cerveja').quantidadeParaComprar, 0);
  assert.equal(item(sóCrianças, 'carne-sem-osso').quantidadeParaComprar, 3000); // 450×5×0,9 = 2025 → 3 kg
  assert.equal(churrasco({ adultosComConsumoDeÁlcool: 11 }).válido, false);
  assert.equal(churrasco({ duraçãoEmHoras: 0 }).válido, false);
  assert.equal(churrasco({ duraçãoEmHoras: 73 }).válido, false);
  perto(churrasco({ duraçãoEmHoras: 72 }).fatorDuração, 1 + 68 * 0.08);
});

test('P4 total dos itens coincide com o orçamento; preço em centavos não é inflado', () => {
  const itens = montarCatálogoDeItensPadrão('churrasco').map((i) => (i.chave === 'carne-sem-osso' ? { ...i, preçoPorUnidadeDeCompraEmCentavos: 6000 } : i.chave === 'pão-de-alho' ? { ...i, preçoPorUnidadeDeCompraEmCentavos: 1200 } : i));
  const p = calcularPlanoDeConsumo({ adultos: 10, crianças: 0, duraçãoEmHoras: 4, apetite: 'médio', itens });
  assert.equal(item(p, 'carne-sem-osso').custoEmCentavos, 30000); // 5 kg × R$ 60
  assert.equal(item(p, 'pão-de-alho').custoEmCentavos, 2400); // 2 pacotes × R$ 12
  assert.equal(p.totalEmCentavos, p.itens.reduce((s, i) => s + (i.custoEmCentavos ?? 0), 0));
});

test('ACHADO S-07: vegetarianos são descontados como adultos inteiros da conta de carne', () => {
  // 10 adultos + 10 crianças (fração 0,5) = 15 equivalentes. Se os 10 vegetarianos forem as crianças,
  // quem come carne são os 10 adultos (10 equivalentes). O cálculo desconta 10 inteiros → 5.
  const p = churrasco({ crianças: 10, vegetarianos: 10 });
  assert.equal(item(p, 'carne-sem-osso').públicoEquivalente, 5);
  const sóCrianças = churrasco({ adultos: 0, crianças: 10, vegetarianos: 4 });
  // 6 crianças comem carne = 3 equivalentes; o cálculo usa 5 − 4 = 1 (um terço do necessário).
  assert.equal(item(sóCrianças, 'carne-sem-osso').públicoEquivalente, 1);
});

test('P4 divisão por pagantes fecha no centavo; nenhum pagante recusado; reserva do evento', () => {
  const d = calcularDivisãoDeDespesas({ itens: [{ descrição: 'x', valor: 100 }], pagantes: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }] });
  assert.deepEqual(d.partes.map((p) => p.valorEmCentavos).sort(), [3333, 3333, 3334]);
  const pesos = calcularDivisãoDeDespesas({ itens: [{ descrição: 'x', valor: 100 }], pagantes: [{ nome: 'A', peso: 2 }, { nome: 'B', peso: 1 }, { nome: 'C', peso: 1 }], modo: 'pesos' });
  assert.deepEqual(pesos.partes.map((p) => p.valorEmCentavos), [5000, 2500, 2500]);
  assert.equal(calcularDivisãoDeDespesas({ itens: [{ descrição: 'x', valor: 100 }], pagantes: [] }).válido, false);
  const o = calcularOrçamentoDoEvento({ itens: [{ descrição: 'Carne', valor: 400 }], reservaPercentual: 10 });
  assert.equal(o.totalEmCentavos, 44000);
});

// ───────────────────────────── Produto 5 — reforma
const { calcularPisoPorCaixa } = await importar(5, 'scripts/cálculos/calcular-piso-por-caixa.js');
const { calcularQuantidadeDeTinta } = await importar(5, 'scripts/cálculos/calcular-quantidade-de-tinta.js');
const { calcularÁreaDeParedes } = await importar(5, 'scripts/cálculos/calcular-área-de-paredes.js');
const { calcularRodapé } = await importar(5, 'scripts/cálculos/calcular-rodapé.js');
const { calcularPapelDeParede } = await importar(5, 'scripts/cálculos/calcular-papel-de-parede.js');
const { calcularÁreaDeRejunte } = await importar(5, 'scripts/cálculos/calcular-área-de-rejunte.js');

test('P5 caso de conferência: 20 m², 10%, 2,2 m²/caixa = 10 caixas', () => {
  assert.equal(calcularPisoPorCaixa({ área: 20, margemPercentual: 10, coberturaPorCaixa: 2.2 }).caixas, 10);
});

test('P5 piso: varredura contra aritmética exata (2 casas, margens inteiras) — 0 divergências', () => {
  let semente = 12345;
  const aleatório = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
  const divergências = [];
  for (let n = 0; n < 200_000; n += 1) {
    const A = 1 + Math.floor(aleatório() * 50_000); // 0,01 a 500,00 m²
    const M = Math.floor(aleatório() * 31); // 0 a 30 %
    const C = 10 + Math.floor(aleatório() * 490); // 0,10 a 4,99 m²
    const esperado = Number(tetoExato(BigInt(A) * BigInt(100 + M), 100n * BigInt(C)));
    const obtido = calcularPisoPorCaixa({ área: A / 100, margemPercentual: M, coberturaPorCaixa: C / 100 }).caixas;
    if (obtido !== esperado) divergências.push({ A, M, C, esperado, obtido });
  }
  assert.deepEqual(divergências.slice(0, 5), []);
});

test('P5 tinta por demão × acabado, reserva e embalagens', () => {
  const porDemão = calcularQuantidadeDeTinta({ área: 50, demãos: 2, rendimento: 10, tipoDeRendimento: 'porDemão', embalagens: [{ litros: 3.6 }, { litros: 18 }] });
  perto(porDemão.litrosNecessários, 10);
  assert.deepEqual(porDemão.porEmbalagem.map((e) => e.quantidade), [3, 1]);
  const acabado = calcularQuantidadeDeTinta({ área: 50, demãos: 2, rendimento: 5, tipoDeRendimento: 'acabado', reservaPercentual: 10, embalagens: [{ litros: 3.6 }] });
  perto(acabado.litrosNecessários, 10); // não multiplica pelas demãos
  assert.equal(acabado.porEmbalagem[0].quantidade, 4); // 11 L / 3,6
});

test('P5 paredes com aberturas, rodapé, papel de parede e rejunte', () => {
  const superfícies = [{ id: 'a', largura: 4, altura: 2.7 }, { id: 'b', largura: 3, altura: 2.7 }, { id: 'c', largura: 4, altura: 2.7 }, { id: 'd', largura: 3, altura: 2.7 }];
  const p = calcularÁreaDeParedes({ superfícies, aberturas: [{ superfícieId: 'a', largura: 0.8, altura: 2.1, descontar: true }, { superfícieId: 'b', largura: 1.2, altura: 1, descontar: false }] });
  perto(p.áreaÚtil, 37.8 - 1.68);
  assert.equal(calcularÁreaDeParedes({ superfícies, aberturas: [{ superfícieId: 'a', largura: 5, altura: 3, descontar: true }] }).válido, false);
  assert.equal(calcularÁreaDeParedes({ superfícies, aberturas: [{ superfícieId: 'a', largura: 3, altura: 2, descontar: true }, { superfícieId: 'a', largura: 3, altura: 2, descontar: true }] }).válido, false);
  const r = calcularRodapé({ lados: [4, 3, 4, 3], trechosSemInstalação: [0.8], perdaPercentual: 10, comprimentoDaBarra: 2.4 });
  assert.equal(r.barras, 7);
  assert.equal(calcularRodapé({ lados: [1], trechosSemInstalação: [2], comprimentoDaBarra: 2.4 }).válido, false);
  const papel = calcularPapelDeParede({ larguraDaParede: 4, alturaDoAmbiente: 2.6, larguraDoRolo: 0.53, comprimentoDoRolo: 10, repetiçãoDoPadrão: 0.64, folgaPorFaixa: 0.1 });
  assert.deepEqual([papel.faixas, papel.faixasPorRolo, papel.rolos], [8, 3, 3]);
  const rejunte = calcularÁreaDeRejunte({ área: 10, comprimentoDaPeçaEmMm: 600, larguraDaPeçaEmMm: 600, larguraDaJuntaEmMm: 3, profundidadeDaJuntaEmMm: 8, densidadeEmKgPorLitro: 1.8 });
  perto(rejunte.massaEmKg, 1.44);
});

// ───────────────────────────── Produto 6 — moldes
const { calcularCaixaRetangular } = await importar(6, 'scripts/cálculos/calcular-caixa-retangular.js');
const { calcularCaixaComTampa } = await importar(6, 'scripts/cálculos/calcular-caixa-com-tampa.js');
const { calcularEnvelope } = await importar(6, 'scripts/cálculos/calcular-envelope.js');
const { calcularGradeDeEtiquetas } = await importar(6, 'scripts/cálculos/calcular-grade-de-etiquetas.js');
const { dividirMoldeEmFolhas } = await importar(6, 'scripts/geração/dividir-molde-em-folhas.js');
const { converterParaMilímetros } = await importar(6, 'scripts/cálculos/converter-para-milímetros.js');

test('P6 caixa retangular: retângulo envolvente e validação de limites', () => {
  const r = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 0.5, tamanhoDaAbaMm: 15 });
  assert.deepEqual(r.retânguloEnvolvente, { larguraMm: 40 + 100.5 + 40, alturaMm: 40 + 60.5 + 40 });
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 5, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 }).válido, false);
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 41 }).válido, false);
  assert.equal(converterParaMilímetros(10.5, 'cm'), 105);
});

test('P6 tampa = base + 2 × folga', () => {
  const t = calcularCaixaComTampa({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaDaBaseMm: 40, alturaDaTampaMm: 20, folgaMm: 1, espessuraDoPapelMm: 0.3, tamanhoDaAbaMm: 10 });
  assert.deepEqual([t.resumoDaFolga.comprimentoInternoDaTampaMm, t.resumoDaFolga.larguraInternaDaTampaMm], [102, 62]);
});

test('ACHADO S-06: tampa aceita folga menor que a espessura do papel (não encaixa) sem aviso', () => {
  // Base interna 100 mm com papel de 1 mm fica com ~102 mm por fora; tampa sai com 100 mm por dentro.
  const t = calcularCaixaComTampa({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaDaBaseMm: 40, alturaDaTampaMm: 20, folgaMm: 0, espessuraDoPapelMm: 1, tamanhoDaAbaMm: 10 });
  assert.equal(t.válido, true);
  assert.equal(t.resumoDaFolga.comprimentoInternoDaTampaMm, 100);
  const base = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 1, tamanhoDaAbaMm: 10 });
  assert.ok(base.medidasExternasAproximadasMm.comprimento > t.resumoDaFolga.comprimentoInternoDaTampaMm); // 103 > 100
  // Mesmo no máximo de espessura (3 mm) com a folga padrão de 1 mm, nenhum aviso.
  assert.equal(calcularCaixaComTampa({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaDaBaseMm: 40, alturaDaTampaMm: 20, folgaMm: 1, espessuraDoPapelMm: 3, tamanhoDaAbaMm: 10 }).válido, true);
});

test('P6 envelope, etiquetas e divisão em folhas sem reduzir escala', () => {
  const e = calcularEnvelope({ larguraDoConteúdoMm: 150, alturaDoConteúdoMm: 100, folgaMm: 2, tamanhoDaAbaMm: 40 });
  assert.deepEqual([e.larguraDoBolsoMm, e.alturaDoBolsoMm], [154, 104]);
  assert.equal(calcularEnvelope({ larguraDoConteúdoMm: 150, alturaDoConteúdoMm: 100, folgaMm: 2, tamanhoDaAbaMm: 52 }).válido, false);
  const g = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 50, alturaDaEtiquetaMm: 30, espaçamentoMm: 5, margemMm: 10 });
  assert.deepEqual([g.colunas, g.linhas, g.total], [3, 8, 24]);
  const plano = dividirMoldeEmFolhas({ retânguloEnvolvente: { larguraMm: 300, alturaMm: 400 }, larguraÚtilMm: 190, alturaÚtilMm: 277 });
  assert.ok(plano.folhas.length > 1);
  const maxX = Math.max(...plano.folhas.map((f) => f.x + f.larguraMm));
  const maxY = Math.max(...plano.folhas.map((f) => f.y + f.alturaMm));
  assert.deepEqual([maxX, maxY], [300, 400]);
  assert.ok(plano.folhas.every((f) => f.larguraMm <= 190 && f.alturaMm <= 277));
});

// ───────────────────────────── Produto 2 — atividades
const { gerarListaDeOperações } = await importar(2, 'scripts/cálculos/gerar-lista-de-operações.js');
const { gerarTabuada } = await importar(2, 'scripts/cálculos/gerar-tabuada.js');
const { gerarCaçaPalavras } = await importar(2, 'scripts/geração/gerar-caça-palavras.js');

test('P2 operações: respostas verificadas de forma independente (exata, com resto, sem negativos, sem reserva)', () => {
  for (const divisão of ['exata', 'comResto']) {
    for (const semente of [1, 7, 42, 2026]) {
      const { operações } = gerarListaDeOperações({ operadores: ['+', '−', '×', '÷'], quantidade: 200, mínimo: 0, máximo: 1000, divisão, semente });
      for (const o of operações) {
        const { operandoA: a, operandoB: b } = o;
        if (o.operador === '+') assert.equal(o.resposta, a + b);
        if (o.operador === '−') { assert.equal(o.resposta, a - b); assert.ok(o.resposta >= 0); }
        if (o.operador === '×') assert.equal(o.resposta, a * b);
        if (o.operador === '÷') {
          assert.ok(b > 0);
          assert.equal(o.resposta * b + o.resto, a);
          assert.ok(o.resto >= 0 && o.resto < b);
          if (divisão === 'exata') assert.equal(o.resto, 0);
        }
      }
    }
  }
  const semReserva = gerarListaDeOperações({ operadores: ['+'], quantidade: 200, mínimo: 0, máximo: 999, reserva: 'evitar', semente: 3 });
  for (const o of semReserva.operações.filter((x) => !x.restriçãoRelaxada)) {
    const da = String(o.operandoA).padStart(4, '0');
    const db = String(o.operandoB).padStart(4, '0');
    for (let i = 0; i < 4; i += 1) assert.ok(Number(da[i]) + Number(db[i]) < 10, `${o.operandoA}+${o.operandoB}`);
  }
  const t = gerarTabuada({ fatores: [7, 9], multiplicadorMínimo: 0, multiplicadorMáximo: 10, ordem: 'embaralhada', semente: 5 });
  assert.ok(t.itens.every((i) => i.resposta === i.fator * i.multiplicador));
});

test('P2 caça-palavras: todas as palavras colocadas estão na grade; as que não cabem são listadas', () => {
  const vetores = { horizontal: [0, 1], vertical: [1, 0], 'diagonal-desce': [1, 1], 'diagonal-sobe': [-1, 1] };
  const palavras = ['Maçã', 'Pêssego', 'Coração', 'Árvore', 'Pão', 'Céu', 'Ônibus', 'Borboleta', 'Paralelepípedo', 'X'];
  for (const modoDeAcentos of ['manter', 'remover']) {
    const r = gerarCaçaPalavras({ palavras, direções: Object.keys(vetores), permitirInvertidas: true, linhas: 12, colunas: 12, modoDeAcentos, semente: 9 });
    assert.equal(r.colocadas.length + r.nãoColocadas.length, palavras.length);
    for (const c of r.colocadas) {
      const [dl0, dc0] = vetores[c.direção];
      const [dl, dc] = c.invertida ? [-dl0, -dc0] : [dl0, dc0];
      for (let i = 0; i < c.palavraNaGrade.length; i += 1) assert.equal(r.grade[c.linha + dl * i][c.coluna + dc * i], c.palavraNaGrade[i]);
    }
    assert.ok(r.nãoColocadas.some((n) => n.palavra === 'Paralelepípedo')); // 14 letras > 12
  }
  const impossível = gerarCaçaPalavras({ palavras: Array.from({ length: 30 }, (_, i) => `PALAVRA${String.fromCharCode(65 + (i % 26))}${i}`.replace(/\d/g, 'Z')), linhas: 4, colunas: 4, semente: 1 });
  assert.equal(impossível.colocadas.length, 0);
  assert.ok(impossível.nãoColocadas.length > 0);
});

/** Testes dos cálculos de obra, acabamento e produção. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  áreaDeSuperfícies, litrosDeTinta, combinaçõesDeEmbalagem,
  caixasDePiso, barrasDeRodapé, rolosDePapelDeParede, rejunteNecessário,
} from '../scripts/cálculos/obra.js';
import { custoDeInsumos, valorDaHora, quantidadesDoEvento } from '../scripts/cálculos/produção.js';

const perto = (a, b, tolerância = 0.005) => Math.abs(a - b) < tolerância;

/* ------------------------------------------------------------------ obra */

test('área de superfícies soma paredes e desconta aberturas', () => {
  const r = áreaDeSuperfícies(
    [
      { nome: 'Norte', largura: 4, altura: 2.7 },
      { nome: 'Sul', largura: 4, altura: 2.7 },
      { nome: 'Leste', largura: 3, altura: 2.7 },
      { nome: 'Oeste', largura: 3, altura: 2.7 },
    ],
    [{ nome: 'Porta', largura: 0.8, altura: 2.1 }, { nome: 'Janela', largura: 1.2, altura: 1 }],
  );
  assert.ok(perto(r.áreaBruta, 37.8));
  assert.ok(perto(r.áreaDeAberturas, 2.88));
  assert.ok(perto(r.áreaLíquida, 34.92));
  assert.equal(r.detalhe.length, 4);
});

test('área respeita a quantidade repetida e recusa o impossível', () => {
  const r = áreaDeSuperfícies([{ nome: 'Paredes iguais', largura: 4, altura: 2.7, quantidade: 2 }]);
  assert.ok(perto(r.áreaBruta, 21.6));
  assert.throws(() => áreaDeSuperfícies([]), /ao menos uma/);
  assert.throws(
    () => áreaDeSuperfícies([{ nome: 'P', largura: 1, altura: 1 }], [{ nome: 'J', largura: 2, altura: 2 }]),
    /somam mais/,
  );
  assert.throws(() => áreaDeSuperfícies([{ nome: 'P', largura: 0, altura: 1 }]), /Medidas inválidas/);
});

test('litros de tinta consideram demãos, rendimento e perda', () => {
  const r = litrosDeTinta({ área: 35, demãos: 2, rendimentoPorLitro: 10, perda: 10 });
  assert.ok(perto(r.litros, 7));
  assert.ok(perto(r.litrosComPerda, 7.7));
  assert.throws(() => litrosDeTinta({ área: 35, demãos: 0, rendimentoPorLitro: 10 }), /1 a 6 demãos/);
  assert.throws(() => litrosDeTinta({ área: 0, demãos: 2, rendimentoPorLitro: 10 }), /maior que zero/);
});

test('combinação de embalagens acha a mais barata, inclusive misturando tamanhos', () => {
  const embalagens = [
    { nome: 'Lata 18 L', litros: 18, preçoCentavos: 28990 },
    { nome: 'Galão 3,6 L', litros: 3.6, preçoCentavos: 7990 },
    { nome: 'Quarto 0,9 L', litros: 0.9, preçoCentavos: 2790 },
  ];
  const opções = combinaçõesDeEmbalagem(7.7, embalagens);
  assert.ok(opções.length > 3);
  // Toda opção precisa cobrir o necessário.
  for (const o of opções) assert.ok(o.litros >= 7.7 - 1e-9, `${o.nome} não cobre os litros`);
  // A primeira é a mais barata.
  assert.equal(opções[0].custoCentavos, Math.min(...opções.map((o) => o.custoCentavos)));
  // Para 7,7 L o melhor negócio é misturar: dois galões (7,2 L) mais um quarto
  // (0,9 L) dão 8,1 L por R$ 187,70, contra R$ 239,70 de três galões e
  // R$ 289,90 da lata de 18 L. É exatamente o que a pessoa faz na loja.
  assert.equal(opções[0].nome, '2× Galão 3,6 L + 1× Quarto 0,9 L');
  assert.equal(opções[0].custoCentavos, 2 * 7990 + 2790);
  assert.ok(opções[0].litros >= 7.7);
  assert.throws(() => combinaçõesDeEmbalagem(0, embalagens), /litros necessários/);
});

test('caixas de piso arredondam para cima com a margem de recorte', () => {
  const r = caixasDePiso({ área: 20, coberturaPorCaixa: 2.2, perda: 10 });
  assert.ok(perto(r.áreaComPerda, 22));
  assert.equal(r.caixas, 10);
  assert.ok(perto(r.áreaCoberta, 22));
  // Sem margem, 20 m² ainda precisam de 10 caixas (9,09 arredondado para cima).
  assert.equal(caixasDePiso({ área: 20, coberturaPorCaixa: 2.2, perda: 0 }).caixas, 10);
  assert.throws(() => caixasDePiso({ área: 20, coberturaPorCaixa: 0 }), /maior que zero/);
});

test('rodapé desconta vãos antes de aplicar a perda', () => {
  const r = barrasDeRodapé({ lados: [4, 3, 4, 3], vãos: [0.8], comprimentoDaBarra: 2.4, perda: 10 });
  assert.equal(r.perímetro, 14);
  assert.ok(perto(r.metrosÚteis, 13.2));
  assert.ok(perto(r.metrosComPerda, 14.52));
  assert.equal(r.barras, 7);
  assert.throws(() => barrasDeRodapé({ lados: [4, 3], comprimentoDaBarra: 2.4 }), /três lados/);
  assert.throws(
    () => barrasDeRodapé({ lados: [1, 1, 1], vãos: [5], comprimentoDaBarra: 2.4 }),
    /somam mais que o perímetro/,
  );
});

test('papel de parede aumenta o corte por causa da repetição', () => {
  const liso = rolosDePapelDeParede({
    larguraDaParede: 4, alturaDaParede: 2.7, larguraDoRolo: 0.53, comprimentoDoRolo: 10,
  });
  assert.equal(liso.faixas, 8);
  assert.ok(perto(liso.alturaDaFaixa, 2.7));
  assert.equal(liso.faixasPorRolo, 3);
  assert.equal(liso.rolos, 3);
  assert.ok(perto(liso.desperdício, 0));

  const comEstampa = rolosDePapelDeParede({
    larguraDaParede: 4, alturaDaParede: 2.7, larguraDoRolo: 0.53, comprimentoDoRolo: 10, repetição: 0.32,
  });
  // 2,7 sobe para o próximo múltiplo de 0,32, que é 2,88.
  assert.ok(perto(comEstampa.alturaDaFaixa, 2.88));
  assert.ok(comEstampa.desperdício > 0);
  assert.equal(comEstampa.faixasPorRolo, 3);

  assert.throws(
    () => rolosDePapelDeParede({ larguraDaParede: 4, alturaDaParede: 12, larguraDoRolo: 0.53, comprimentoDoRolo: 10 }),
    /mais alta que o rolo/,
  );
});

test('rejunte cresce quando a peça é menor', () => {
  const grande = rejunteNecessário({
    área: 20, larguraDaPeça: 600, alturaDaPeça: 600, larguraDaJunta: 3, profundidade: 8,
  });
  const pequena = rejunteNecessário({
    área: 20, larguraDaPeça: 100, alturaDaPeça: 100, larguraDaJunta: 3, profundidade: 8,
  });
  assert.ok(perto(grande.massaKg, 2.56, 0.01));
  assert.ok(pequena.massaKg > grande.massaKg * 5, 'peça pequena tem muito mais junta por m²');
  assert.ok(perto(grande.volumeLitros, grande.massaKg / 1.6, 0.001));
  assert.throws(() => rejunteNecessário({ área: 0, larguraDaPeça: 600, alturaDaPeça: 600, larguraDaJunta: 3, profundidade: 8 }), /maior que zero/);
});

/* -------------------------------------------------------------- produção */

test('custo de insumos é proporcional ao consumo e fecha o total', () => {
  const r = custoDeInsumos([
    { nome: 'Farinha', quantidadeDoPacote: 1000, preçoDoPacoteCentavos: 590, quantidadeUsada: 500 },
    { nome: 'Açúcar', quantidadeDoPacote: 1000, preçoDoPacoteCentavos: 450, quantidadeUsada: 300 },
    { nome: 'Ovos', quantidadeDoPacote: 12, preçoDoPacoteCentavos: 1200, quantidadeUsada: 4 },
  ], { rendimento: 12 });

  // 295 + 135 + 400 = 830 centavos
  assert.equal(r.totalCentavos, 830);
  assert.equal(r.porUnidadeCentavos, 70); // 830 / 12 = 69,17 → arredonda para cima
  assert.equal(r.detalhe.length, 3);
  assert.ok(perto(r.detalhe.reduce((s, d) => s + d.parteDoTotal, 0), 100, 0.01));
  assert.throws(() => custoDeInsumos([]), /ao menos um insumo/);
  assert.throws(
    () => custoDeInsumos([{ nome: 'X', quantidadeDoPacote: 1, preçoDoPacoteCentavos: 100, quantidadeUsada: 5000 }]),
    /mil pacotes/,
  );
});

test('valor da hora considera que nem toda hora é cobrada', () => {
  const r = valorDaHora({
    rendaDesejadaCentavos: 300000, despesasFixasCentavos: 80000, horasPorMês: 160, aproveitamento: 70,
  });
  assert.equal(r.faturamentoNecessárioCentavos, 380000);
  assert.ok(perto(r.horasVendáveis, 112));
  assert.equal(r.valorDaHoraCentavos, 3393); // 3800 / 112 = 33,928 → arredonda para cima
  // Com 100% de aproveitamento o valor cai: é o erro que a ferramenta previne.
  const ingênuo = valorDaHora({
    rendaDesejadaCentavos: 300000, despesasFixasCentavos: 80000, horasPorMês: 160, aproveitamento: 100,
  });
  assert.ok(ingênuo.valorDaHoraCentavos < r.valorDaHoraCentavos);
  assert.throws(() => valorDaHora({ rendaDesejadaCentavos: 0, despesasFixasCentavos: 0, horasPorMês: 0 }), /1 a 744/);
});

test('evento calcula comida por pessoa e bebida por hora', () => {
  const r = quantidadesDoEvento({ adultos: 10, crianças: 4, horas: 5, adultosQueBebem: 6 });
  const carne = r.comida.find((i) => i.nome === 'Carne bovina');
  assert.equal(carne.quantidade, 300 * 10 + 120 * 4); // 3480 g
  const cerveja = r.bebidas.find((i) => i.nome === 'Cerveja');
  assert.equal(cerveja.quantidade, 500 * 6 * 5); // 15 000 ml
  assert.ok(r.premissas.length >= 3);
});

test('apetite escala a comida mas não a bebida alcoólica', () => {
  const base = quantidadesDoEvento({ adultos: 10, horas: 4, adultosQueBebem: 10 });
  const faminto = quantidadesDoEvento({ adultos: 10, horas: 4, adultosQueBebem: 10, apetite: 150 });
  const carneBase = base.comida.find((i) => i.nome === 'Carne bovina').quantidade;
  const carneFaminta = faminto.comida.find((i) => i.nome === 'Carne bovina').quantidade;
  assert.ok(perto(carneFaminta, carneBase * 1.5));
  assert.equal(
    base.bebidas.find((i) => i.nome === 'Cerveja').quantidade,
    faminto.bebidas.find((i) => i.nome === 'Cerveja').quantidade,
  );
});

test('sem ninguém bebendo, não sai cerveja na lista', () => {
  const r = quantidadesDoEvento({ adultos: 8, crianças: 5, horas: 3, adultosQueBebem: 0 });
  assert.equal(r.bebidas.some((b) => b.nome === 'Cerveja'), false);
  assert.ok(r.premissas.some((p) => p.includes('Nenhuma bebida alcoólica')));
});

test('evento recusa entradas impossíveis', () => {
  assert.throws(() => quantidadesDoEvento({ adultos: 0, crianças: 0, horas: 4 }), /pelo menos uma pessoa/);
  assert.throws(() => quantidadesDoEvento({ adultos: 5, horas: 4, adultosQueBebem: 9 }), /mais pessoas bebendo/);
  assert.throws(() => quantidadesDoEvento({ adultos: 5, horas: 0 }), /1 e 24 horas/);
  assert.throws(() => quantidadesDoEvento({ adultos: 5, horas: 4, tipo: 'banquete' }), /desconhecido/);
});

test('almoço usa cardápio diferente do churrasco', () => {
  const almoço = quantidadesDoEvento({ adultos: 10, horas: 3, tipo: 'almoço' });
  assert.equal(almoço.comida.some((i) => i.nome === 'Carvão'), false);
  assert.ok(almoço.comida.some((i) => i.nome === 'Prato principal'));
});

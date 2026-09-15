import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPlanoDeConsumo, DURAÇÃO_DE_REFERÊNCIA_EM_HORAS } from '../scripts/cálculos/calcular-plano-de-consumo.js';
import { montarCatálogoDeItensPadrão } from '../scripts/cálculos/montar-catálogo-de-itens-padrão.js';

const próximo = (atual, esperado, tolerância = 1e-6) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

const carne = (extra = {}) => ({
  chave: 'carne', descrição: 'Carne', grupo: 'carne', categoriaDePúblico: 'carne', unidadeBase: 'g',
  quantidadePorAdulto: 400, fraçãoPorCriança: 0.5, éCarneVermelha: true, incluído: true, ...extra,
});
const vegetariano = (extra = {}) => ({
  chave: 'veg', descrição: 'Opção vegetariana', grupo: 'vegetariano', categoriaDePúblico: 'vegetariano', unidadeBase: 'g',
  quantidadePorAdulto: 300, fraçãoPorCriança: 0.5, incluído: true, ...extra,
});
const cerveja = (extra = {}) => ({
  chave: 'cerveja', descrição: 'Cerveja', grupo: 'bebidaAlcoólica', categoriaDePúblico: 'álcool', unidadeBase: 'ml',
  quantidadePorAdulto: 1000, fraçãoPorCriança: 0, incluído: true, ...extra,
});
const água = (extra = {}) => ({
  chave: 'agua', descrição: 'Água', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml',
  quantidadePorAdulto: 700, fraçãoPorCriança: 0.5, incluído: true, ...extra,
});
const acompanhamento = (chave) => ({
  chave, descrição: chave, grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g',
  quantidadePorAdulto: 50, fraçãoPorCriança: 0.5, incluído: true,
});

test('caso básico na duração de referência: quantidades batem com o público equivalente', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 10, crianças: 0, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    vegetarianos: 0, semCarneVermelha: 0, adultosComConsumoDeÁlcool: 4,
    itens: [carne(), água(), cerveja()],
  });
  assert.equal(resultado.válido, true);
  const porChave = Object.fromEntries(resultado.itens.map((item) => [item.chave, item]));
  próximo(porChave.carne.quantidadeParaComprar, 4000);
  próximo(porChave.agua.quantidadeParaComprar, 7000);
  próximo(porChave.cerveja.quantidadeParaComprar, 4000);
});

test('zero convidados: recusa com mensagem clara', () => {
  const resultado = calcularPlanoDeConsumo({ adultos: 0, crianças: 0, duraçãoEmHoras: 4, apetite: 'médio', itens: [carne()] });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /adulto|criança/);
});

test('somente crianças: carne calculada pela fração infantil e álcool sempre zero', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 0, crianças: 8, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    adultosComConsumoDeÁlcool: 0, itens: [carne(), cerveja()],
  });
  assert.equal(resultado.válido, true);
  const porChave = Object.fromEntries(resultado.itens.map((item) => [item.chave, item]));
  próximo(porChave.carne.quantidadeParaComprar, 1600); // 400 × (8 × 0,5)
  assert.equal(porChave.cerveja.quantidadeParaComprar, 0);
});

test('vegetarianos: prato de carne zera e prato vegetariano assume o público', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 10, crianças: 0, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    vegetarianos: 10, semCarneVermelha: 0, adultosComConsumoDeÁlcool: 0,
    itens: [carne(), vegetariano()],
  });
  assert.equal(resultado.válido, true);
  const porChave = Object.fromEntries(resultado.itens.map((item) => [item.chave, item]));
  assert.equal(porChave.carne.quantidadeParaComprar, 0);
  próximo(porChave.veg.quantidadeParaComprar, 3000);
});

test('zero consumidores de álcool: bebida alcoólica não é comprada mesmo com adultos suficientes', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 20, crianças: 0, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'alto',
    adultosComConsumoDeÁlcool: 0, itens: [cerveja()],
  });
  assert.equal(resultado.itens[0].quantidadeParaComprar, 0);
});

test('duração extrema: continua um número finito, sem estourar', () => {
  const resultado = calcularPlanoDeConsumo({ adultos: 5, duraçãoEmHoras: 72, apetite: 'médio', itens: [água()] });
  assert.equal(resultado.válido, true);
  assert.ok(Number.isFinite(resultado.itens[0].quantidadeParaComprar));
  assert.ok(resultado.itens[0].quantidadeParaComprar > 700 * 5); // mais que a referência de 4h
  assert.equal(calcularPlanoDeConsumo({ adultos: 5, duraçãoEmHoras: 200, apetite: 'médio', itens: [água()] }).válido, false);
});

test('embalagem indivisível: arredonda a compra para cima em pacotes inteiros', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 3, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    itens: [carne({ quantidadePorAdulto: 450, embalagemNaUnidadeBase: 500 })],
  });
  const item = resultado.itens[0];
  assert.equal(item.unidadesDeEmbalagem, 3);
  assert.equal(item.quantidadeParaComprar, 1500);
});

test('com osso: a perda é aplicada uma única vez na quantidade a comprar', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 2, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    itens: [carne({ chave: 'costela', quantidadePorAdulto: 550, comOsso: true, perdaDoOssoPercentual: 35 })],
  });
  próximo(resultado.itens[0].quantidadeParaComprar, 1100 / 0.65);
  assert.ok(resultado.itens[0].notas.some((nota) => nota.includes('35%')));
});

test('cru e cozido: exemplo do catálogo — 12 porções × 100 g de arroz cru → 1,2 kg, sem dobrar a conversão', () => {
  const arroz = { chave: 'arroz', descrição: 'Arroz', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 100, fraçãoPorCriança: 0, cru: true, fatorCruParaCozido: 2.5, incluído: true };
  const resultado = calcularPlanoDeConsumo({ adultos: 12, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio', itens: [arroz] });
  const item = resultado.itens[0];
  próximo(item.quantidadeParaComprar, 1200); // continua cru: a conversão para cozido é só informativa
  próximo(item.rendimentoCozidoInformativo, 3000);
});

test('três ou mais acompanhamentos incluídos reduzem a carne em 10%', () => {
  const base = { adultos: 10, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio' };
  const semAcompanhamento = calcularPlanoDeConsumo({ ...base, itens: [carne()] });
  const comTrêsAcompanhamentos = calcularPlanoDeConsumo({ ...base, itens: [carne(), acompanhamento('a'), acompanhamento('b'), acompanhamento('c')] });
  próximo(comTrêsAcompanhamentos.itens.find((item) => item.chave === 'carne').quantidadeParaComprar, semAcompanhamento.itens[0].quantidadeParaComprar * 0.9);
});

test('todos os itens excluídos: recusa com mensagem clara', () => {
  const resultado = calcularPlanoDeConsumo({ adultos: 5, duraçãoEmHoras: 4, apetite: 'médio', itens: [carne({ incluído: false })] });
  assert.equal(resultado.válido, false);
});

test('soma dos custos dos itens é sempre igual ao total (sem perder nem sobrar centavo)', () => {
  const itens = [
    carne({ preçoPorUnidadeDeCompraEmCentavos: 3333 }),
    água({ preçoPorUnidadeDeCompraEmCentavos: 999 }),
    cerveja({ preçoPorUnidadeDeCompraEmCentavos: 1250 }),
  ];
  const resultado = calcularPlanoDeConsumo({ adultos: 7, crianças: 3, duraçãoEmHoras: 5, apetite: 'alto', adultosComConsumoDeÁlcool: 5, itens });
  const soma = resultado.itens.reduce((total, item) => total + (item.custoEmCentavos ?? 0), 0);
  assert.equal(soma, resultado.totalEmCentavos);
});

test('regressão relatada pelo orquestrador: catálogo real do churrasco, 4 adultos a R$ 40,00 por unidade de compra em cada item', () => {
  const catálogo = montarCatálogoDeItensPadrão('churrasco').map((item) => ({ ...item, preçoPorUnidadeDeCompraEmCentavos: 4000 }));
  const resultado = calcularPlanoDeConsumo({
    adultos: 4, crianças: 0, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    vegetarianos: 0, semCarneVermelha: 0, adultosComConsumoDeÁlcool: 2, itens: catálogo,
  });
  assert.equal(resultado.válido, true);
  const porChave = Object.fromEntries(resultado.itens.map((item) => [item.chave, item]));

  próximo(porChave['carne-sem-osso'].quantidadeParaComprar, 2000); // 2 kg
  assert.equal(porChave['carne-sem-osso'].custoEmCentavos, 8000); // R$ 80,00, não R$ 8.000,00

  próximo(porChave['pão-de-alho'].quantidadeParaComprar, 4); // 1 pacote de 4 unidades
  assert.equal(porChave['pão-de-alho'].custoEmCentavos, 4000); // R$ 40,00 o pacote, não R$ 16.000,00

  // O total é a soma exata das linhas, nunca 100× maior por confundir centavos com reais.
  const soma = resultado.itens.reduce((total, item) => total + (item.custoEmCentavos ?? 0), 0);
  assert.equal(soma, resultado.totalEmCentavos);
  assert.ok(resultado.totalEmCentavos < 1_000_000, `total inflado: ${resultado.totalEmCentavos} centavos`);
});

test('item de álcool com zero consumidores fica com quantidade zero e nota explicativa, não "0 ml —"', () => {
  const resultado = calcularPlanoDeConsumo({
    adultos: 10, crianças: 0, duraçãoEmHoras: DURAÇÃO_DE_REFERÊNCIA_EM_HORAS, apetite: 'médio',
    adultosComConsumoDeÁlcool: 0, itens: [cerveja()],
  });
  const item = resultado.itens[0];
  assert.equal(item.quantidadeParaComprar, 0);
  assert.ok(item.notas.some((nota) => nota.includes('Não incluído') && nota.includes('álcool')));
});

test('valida limites de entrada: apetite inválido, álcool maior que adultos, preferências maiores que o total', () => {
  assert.equal(calcularPlanoDeConsumo({ adultos: 5, duraçãoEmHoras: 4, apetite: 'extremo', itens: [carne()] }).válido, false);
  assert.equal(calcularPlanoDeConsumo({ adultos: 5, duraçãoEmHoras: 4, apetite: 'médio', adultosComConsumoDeÁlcool: 6, itens: [carne()] }).válido, false);
  assert.equal(calcularPlanoDeConsumo({ adultos: 5, crianças: 0, duraçãoEmHoras: 4, apetite: 'médio', vegetarianos: 3, semCarneVermelha: 4, itens: [carne()] }).válido, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCustoDaReceita } from '../scripts/cálculos/calcular-custo-da-receita.js';

const próximo = (atual, esperado, tolerância = 1e-6) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência: custo de R$ 80 para 50 unidades → R$ 1,60 por unidade', () => {
  const resultado = calcularCustoDaReceita({
    ingredientes: [
      { nome: 'Leite condensado', preçoComprado: 50, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 1, unidadeUsada: 'kg' },
      { nome: 'Chocolate em pó', preçoComprado: 30, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 1, unidadeUsada: 'kg' },
    ],
    rendimentoAproveitável: 50,
  });
  assert.equal(resultado.válido, true);
  próximo(resultado.custoConsumidoTotal, 80);
  próximo(resultado.custoPorUnidade, 1.6);
});

test('soma mão de obra, embalagem de venda e custos adicionais ao custo consumido', () => {
  const resultado = calcularCustoDaReceita({
    ingredientes: [{ nome: 'Farinha', preçoComprado: 6, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 500, unidadeUsada: 'g' }],
    rendimentoAproveitável: 10,
    embalagemDeVendaPorUnidade: 0.2,
    tempoDePreparoEmMinutos: 60,
    valorDaHora: 20,
    custosAdicionais: 5,
  });
  // ingredientes: 3; mão de obra: 1h × 20 = 20; embalagens: 0,2 × 10 = 2; adicionais: 5 → total 30
  próximo(resultado.custoConsumidoTotal, 30);
  próximo(resultado.custoPorUnidade, 3);
  próximo(resultado.custoDaMãoDeObra, 20);
  próximo(resultado.custoDasEmbalagensDeVenda, 2);
});

test('separa custo consumido, custo de estoque e dinheiro necessário', () => {
  const resultado = calcularCustoDaReceita({
    ingredientes: [{ nome: 'Chocolate', preçoComprado: 10, quantidadeComprada: 100, unidadeComprada: 'g', quantidadeUsada: 40, unidadeUsada: 'g' }],
    rendimentoAproveitável: 5,
  });
  próximo(resultado.custoIngredientesConsumido, 4);
  próximo(resultado.custoDeEstoqueTotal, 6);
  próximo(resultado.dinheiroNecessárioTotal, 10);
});

test('rejeita receita sem ingredientes, rendimento inválido e unidades incompatíveis', () => {
  assert.equal(calcularCustoDaReceita({ ingredientes: [], rendimentoAproveitável: 10 }).válido, false);
  assert.equal(
    calcularCustoDaReceita({
      ingredientes: [{ nome: 'X', preçoComprado: 5, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 1, unidadeUsada: 'kg' }],
      rendimentoAproveitável: 0,
    }).válido,
    false,
  );
  assert.equal(
    calcularCustoDaReceita({
      ingredientes: [{ nome: 'X', preçoComprado: 5, quantidadeComprada: 1, unidadeComprada: 'L', quantidadeUsada: 100, unidadeUsada: 'g' }],
      rendimentoAproveitável: 10,
    }).válido,
    false,
  );
  assert.equal(
    calcularCustoDaReceita({
      ingredientes: [{ nome: 'X', preçoComprado: 5, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 1, unidadeUsada: 'kg' }],
      rendimentoAproveitável: 10,
      custosAdicionais: -1,
    }).válido,
    false,
  );
});

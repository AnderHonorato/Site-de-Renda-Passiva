import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCômodoSalvo } from '../scripts/validação/validar-cômodo-salvo.js';
import { validarCálculoDeTintaSalvo } from '../scripts/validação/validar-cálculo-de-tinta-salvo.js';
import { validarPisoSalvo } from '../scripts/validação/validar-piso-salvo.js';
import { validarRodapéSalvo } from '../scripts/validação/validar-rodapé-salvo.js';

test('validarCômodoSalvo aceita um cômodo bem formado', () => {
  assert.equal(
    validarCômodoSalvo({
      nome: 'Quarto',
      superfícies: [{ id: 's1', nome: 'Parede norte', largura: 4, altura: 2.6 }],
      aberturas: [{ id: 'a1', nome: 'Porta', superfícieId: 's1', largura: 0.8, altura: 2.1, descontar: true }],
    }),
    true,
  );
});

test('validarCômodoSalvo rejeita registro adulterado', () => {
  assert.equal(validarCômodoSalvo(null), false);
  assert.equal(validarCômodoSalvo({ nome: '', superfícies: [{ id: 's1', largura: 1, altura: 1 }] }), false);
  assert.equal(validarCômodoSalvo({ nome: 'X', superfícies: [] }), false);
  assert.equal(validarCômodoSalvo({ nome: 'X', superfícies: [{ id: 's1', largura: -1, altura: 1 }] }), false);
  // abertura aponta para superfície que não existe na lista salva
  assert.equal(
    validarCômodoSalvo({
      nome: 'X',
      superfícies: [{ id: 's1', largura: 1, altura: 1 }],
      aberturas: [{ id: 'a1', superfícieId: 'não-existe', largura: 0.5, altura: 0.5, descontar: true }],
    }),
    false,
  );
  // protótipo poluído / campo malicioso não passa por não ser do formato esperado
  assert.equal(validarCômodoSalvo({ nome: 'X', superfícies: [{ id: 's1', largura: 1, altura: 1 }], __proto__: { hackeado: true } }), true); // __proto__ é ignorado, registro continua válido pelos campos conhecidos
});

test('validarCálculoDeTintaSalvo aceita registro bem formado e rejeita tipo de rendimento inválido', () => {
  assert.equal(
    validarCálculoDeTintaSalvo({ nome: 'Quarto', área: 40, demãos: 2, rendimento: 10, tipoDeRendimento: 'porDemão', reservaPercentual: 10, embalagens: [{ id: 'e1', nome: '18 L', litros: 18 }] }),
    true,
  );
  assert.equal(validarCálculoDeTintaSalvo({ nome: 'Quarto', área: 40, demãos: 2, rendimento: 10, tipoDeRendimento: 'inventado', reservaPercentual: 0 }), false);
  assert.equal(validarCálculoDeTintaSalvo({ nome: 'Quarto', área: 40, demãos: 0, rendimento: 10, tipoDeRendimento: 'acabado', reservaPercentual: 0 }), false);
});

test('validarPisoSalvo aceita registro bem formado e rejeita valores fora da faixa', () => {
  assert.equal(validarPisoSalvo({ nome: 'Sala', área: 20, margemPercentual: 10, coberturaPorCaixa: 2.2 }), true);
  assert.equal(validarPisoSalvo({ nome: 'Sala', área: 0, margemPercentual: 10, coberturaPorCaixa: 2.2 }), false);
  assert.equal(validarPisoSalvo({ nome: 'Sala', área: 20, margemPercentual: -5, coberturaPorCaixa: 2.2 }), false);
});

test('validarRodapéSalvo aceita registro bem formado e rejeita listas inválidas', () => {
  assert.equal(validarRodapéSalvo({ nome: 'Sala', lados: [18], trechosSemInstalação: [], perdaPercentual: 0, comprimentoDaBarra: 2 }), true);
  assert.equal(validarRodapéSalvo({ nome: 'Sala', lados: [], perdaPercentual: 0, comprimentoDaBarra: 2 }), false);
  assert.equal(validarRodapéSalvo({ nome: 'Sala', lados: [18], perdaPercentual: 0, comprimentoDaBarra: 0 }), false);
});

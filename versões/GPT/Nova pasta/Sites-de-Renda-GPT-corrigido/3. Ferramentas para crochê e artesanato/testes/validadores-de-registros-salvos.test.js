import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarMaterialSalvo } from '../scripts/validação/validar-material-salvo.js';
import { validarPeçaSalva } from '../scripts/validação/validar-peça-salva.js';
import { validarEstoqueDeMaterialSalvo } from '../scripts/validação/validar-estoque-de-material-salvo.js';

test('validarMaterialSalvo aceita registro correto e recusa dados adulterados', () => {
  const válido = { nome: 'Novelo Alegria rosa', precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 25, unidadeConsumo: 'g', metrosPor100g: null };
  assert.equal(validarMaterialSalvo(válido), true);
  assert.equal(validarMaterialSalvo({ ...válido, nome: '' }), false);
  assert.equal(validarMaterialSalvo({ ...válido, precoDeCompra: '20' }), false);
  assert.equal(validarMaterialSalvo({ ...válido, quantidadeComprada: 0 }), false);
  assert.equal(validarMaterialSalvo({ ...válido, unidadeComprada: '<script>' }), false);
  assert.equal(validarMaterialSalvo({ ...válido, metrosPor100g: -1 }), false);
  assert.equal(validarMaterialSalvo(null), false);
  assert.equal(validarMaterialSalvo('string'), false);
});

test('validarPeçaSalva aceita registro correto e recusa dados adulterados', () => {
  const válido = {
    nome: 'Amigurumi coelho',
    perfil: 'amigurumi',
    materiais: [{ nome: 'Fio', custo: 20 }],
    horas: 2,
    valorHora: 15,
    embalagem: 0,
    custosAdicionais: 0,
    quantidadeDoConjunto: 1,
    margemPercentual: 30,
    taxasPercentuais: 0,
    modoDeArredondamento: 'acima',
    precoInformado: null,
  };
  assert.equal(validarPeçaSalva(válido), true);
  assert.equal(validarPeçaSalva({ ...válido, perfil: 'inventado' }), false);
  assert.equal(validarPeçaSalva({ ...válido, materiais: [{ nome: 'x', custo: -1 }] }), false);
  assert.equal(validarPeçaSalva({ ...válido, quantidadeDoConjunto: 1.5 }), false);
  assert.equal(validarPeçaSalva({ ...válido, margemPercentual: 100 }), false);
  assert.equal(validarPeçaSalva({ ...válido, modoDeArredondamento: 'baixo' }), false);
  assert.equal(validarPeçaSalva(null), false);
});

test('validarEstoqueDeMaterialSalvo aceita registro correto e recusa dados adulterados', () => {
  const válido = { nome: 'Fio Alegria', unidade: 'g', saldoInicial: 100, lançamentos: [{ tipo: 'consumo', quantidade: 25 }] };
  assert.equal(validarEstoqueDeMaterialSalvo(válido), true);
  assert.equal(validarEstoqueDeMaterialSalvo({ ...válido, unidade: 'litro' }), false);
  assert.equal(validarEstoqueDeMaterialSalvo({ ...válido, saldoInicial: -1 }), false);
  assert.equal(validarEstoqueDeMaterialSalvo({ ...válido, lançamentos: [] }), false);
  assert.equal(validarEstoqueDeMaterialSalvo({ ...válido, lançamentos: [{ tipo: 'x', quantidade: 1 }] }), false);
  assert.equal(validarEstoqueDeMaterialSalvo(null), false);
});

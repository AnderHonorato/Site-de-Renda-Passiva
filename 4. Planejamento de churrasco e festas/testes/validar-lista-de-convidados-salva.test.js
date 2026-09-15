import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarListaDeConvidadosSalva } from '../scripts/validação/validar-lista-de-convidados-salva.js';

const válido = { nome: 'Convidados do churrasco', convidados: [{ nome: 'Ana', estado: 'confirmado', éCriança: false }, { nome: 'Théo', estado: 'pendente', éCriança: true }] };

test('registro bem formado é aceito', () => {
  assert.equal(validarListaDeConvidadosSalva(válido), true);
});

test('lista vazia de convidados ainda é um registro válido', () => {
  assert.equal(validarListaDeConvidadosSalva({ nome: 'Lista nova', convidados: [] }), true);
});

test('registros adulterados são recusados', () => {
  assert.equal(validarListaDeConvidadosSalva(null), false);
  assert.equal(validarListaDeConvidadosSalva({ ...válido, convidados: [{ nome: 'Ana', estado: 'talvez', éCriança: false }] }), false);
  assert.equal(validarListaDeConvidadosSalva({ ...válido, convidados: [{ nome: '', estado: 'confirmado', éCriança: false }] }), false);
  assert.equal(validarListaDeConvidadosSalva({ ...válido, convidados: [{ nome: 'Ana', estado: 'confirmado', éCriança: 'não' }] }), false);
  assert.equal(validarListaDeConvidadosSalva({ ...válido, nome: '' }), false);
});

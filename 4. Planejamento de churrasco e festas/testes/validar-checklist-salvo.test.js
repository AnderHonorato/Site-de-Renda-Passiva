import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarChecklistSalvo } from '../scripts/validação/validar-checklist-salvo.js';

const válido = { nome: 'Checklist do churrasco', tarefas: [{ texto: 'Comprar carvão', concluída: false }, { texto: 'Gelar as bebidas', concluída: true }] };

test('registro bem formado é aceito', () => {
  assert.equal(validarChecklistSalvo(válido), true);
});

test('registros adulterados são recusados', () => {
  assert.equal(validarChecklistSalvo(null), false);
  assert.equal(validarChecklistSalvo({ ...válido, tarefas: [] }), false);
  assert.equal(validarChecklistSalvo({ ...válido, tarefas: [{ texto: '', concluída: false }] }), false);
  assert.equal(validarChecklistSalvo({ ...válido, tarefas: [{ texto: 'Ok', concluída: 'sim' }] }), false);
  assert.equal(validarChecklistSalvo({ ...válido, nome: '' }), false);
  assert.equal(validarChecklistSalvo(42), false);
});

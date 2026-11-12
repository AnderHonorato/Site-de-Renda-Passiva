import test from 'node:test';
import assert from 'node:assert/strict';
import { validarConteudoImportado, validarTraducao, exportarComparacaoCsv, exportarComparacaoJson } from '../scripts/ferramentas/traduzir-texto.js';

test('importação remove BOM antes de aplicar limite', () => {
  assert.equal(validarConteudoImportado('\uFEFFOlá'), 'Olá');
  assert.equal(validarConteudoImportado('\uFEFF' + 'a'.repeat(10000)).length, 10000);
  assert.throws(() => validarConteudoImportado('\uFEFF' + 'a'.repeat(10001)), /10.000/);
  assert.throws(() => validarConteudoImportado('\uFEFF   '), /vazio/);
});

test('tradução valida idiomas e texto', () => {
  assert.equal(validarTraducao(' Olá ', 'pt', 'en'), 'Olá');
  assert.throws(() => validarTraducao('Olá', 'pt', 'pt'), /diferentes/);
  assert.throws(() => validarTraducao('Olá', 'xx', 'en'), /válido/);
});

test('exportações preservam texto e neutralizam fórmulas CSV', () => {
  const csv = exportarComparacaoCsv('=1+1', 'Olá;"mundo"', 'pt', 'en');
  assert.match(csv, /"'=1\+1"/);
  assert.match(csv, /"Olá;""mundo"""/);
  const json = JSON.parse(exportarComparacaoJson('Olá', 'Hello', 'pt', 'en'));
  assert.equal(json.texto_traduzido, 'Hello');
});

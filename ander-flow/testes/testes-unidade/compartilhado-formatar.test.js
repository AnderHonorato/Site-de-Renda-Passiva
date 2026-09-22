import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  formatarDataLonga,
  lerNumero,
} from '../../frontend/compartilhado/compartilhado-formatar.js';

test('formatarMoeda em pt-BR usa vírgula decimal e espaço normal', () => {
  assert.equal(formatarMoeda(74.4147, 'pt-BR'), 'R$ 74,41');
});

test('formatarMoeda em en usa ponto decimal e sem espaço', () => {
  assert.equal(formatarMoeda(74.41, 'en'), 'R$74.41');
});

test('formatarMoeda com valor inválido devolve string vazia', () => {
  assert.equal(formatarMoeda(NaN, 'pt-BR'), '');
});

test('formatarNumero agrupa milhares conforme o idioma', () => {
  assert.equal(formatarNumero(1234.5, 2, 'pt-BR'), '1.234,50');
  assert.equal(formatarNumero(1234.5, 2, 'en'), '1,234.50');
});

test('formatarPercentual converte fração em percentual', () => {
  assert.equal(formatarPercentual(0.3, 0, 'pt-BR'), '30%');
});

test('formatarDataLonga em pt-BR tira o "-feira" do dia da semana', () => {
  assert.equal(formatarDataLonga('2026-09-22T12:00:00Z', 'pt-BR'), 'terça, 22 de setembro');
});

test('formatarDataLonga em en mantém o nome completo do dia', () => {
  assert.equal(formatarDataLonga('2026-09-22T12:00:00Z', 'en'), 'Tuesday, September 22');
});

test('lerNumero aceita "1.234,56" em pt-BR', () => {
  assert.equal(lerNumero('1.234,56', 'pt-BR'), 1234.56);
});

test('lerNumero aceita "1234.56" em en', () => {
  assert.equal(lerNumero('1234.56', 'en'), 1234.56);
});

test('lerNumero aceita "1,234.56" em en (separador de milhar)', () => {
  assert.equal(lerNumero('1,234.56', 'en'), 1234.56);
});

test('lerNumero devolve NaN para texto inválido', () => {
  assert.ok(Number.isNaN(lerNumero('abc', 'pt-BR')));
  assert.ok(Number.isNaN(lerNumero('', 'pt-BR')));
});

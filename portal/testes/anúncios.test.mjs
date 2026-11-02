import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anúncios, anúnciosAtivos, FORMATO_DO_EDITOR, FORMATO_DO_BLOCO, proteções } from '../dados/anúncios.js';

test('o estado de fábrica não carrega anúncio nenhum', () => {
  assert.equal(anúnciosAtivos(), false);
  assert.equal(anúncios.ligado, false);
  assert.equal(anúncios.modoTeste, true, 'começa em modo de teste');
});

test('anúncios só ficam ativos com chave ligada, editor válido e ao menos um bloco válido', () => {
  const base = { ligado: true, editor: 'ca-pub-1234567890123456', blocos: { topo: '1234567890', resultado: '', fim: '' } };
  assert.equal(anúnciosAtivos(base), true);
  assert.equal(anúnciosAtivos({ ...base, ligado: false }), false);
  assert.equal(anúnciosAtivos({ ...base, editor: '' }), false);
  assert.equal(anúnciosAtivos({ ...base, editor: 'ca-pub-123' }), false);
  assert.equal(anúnciosAtivos({ ...base, editor: 'ca-pub-1234567890123456<script>' }), false);
  assert.equal(anúnciosAtivos({ ...base, blocos: { topo: '', resultado: '', fim: '' } }), false);
  assert.equal(anúnciosAtivos({ ...base, blocos: { topo: 'abc' } }), false, 'bloco precisa ser numérico');
  assert.equal(anúnciosAtivos({ ligado: true }), false);
});

test('os formatos aceitam só o que o Google emite', () => {
  assert.ok(FORMATO_DO_EDITOR.test('ca-pub-0000000000000000'));
  assert.ok(!FORMATO_DO_EDITOR.test('pub-0000000000000000'));
  assert.ok(FORMATO_DO_BLOCO.test('1234567'));
  assert.ok(!FORMATO_DO_BLOCO.test('12345'));
  assert.ok(!FORMATO_DO_BLOCO.test('12345a7'));
});

test('a proteção contra cópia vem ligada', () => {
  assert.equal(proteções.antiCópia, true);
});

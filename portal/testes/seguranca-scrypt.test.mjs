import test from 'node:test';
import assert from 'node:assert/strict';
import { senhaHash, comparar } from '../servidor/seguranca.mjs';

test('hash scrypt gerado autentica senha correta e rejeita incorreta', async () => {
  const hash = await senhaHash('senha-forte-123');
  assert.equal(await comparar('senha-forte-123', hash), true);
  assert.equal(await comparar('senha-errada', hash), false);
});

test('hashes scrypt adulterados ou com tamanhos excessivos falham fechados', async () => {
  const valido = await senhaHash('senha-forte-123');
  const partes = valido.split('$');
  const alterar = (indice, valor) => partes.map((item, i) => i === indice ? valor : item).join('$');
  for (const hash of [
    alterar(1, '0'), alterar(1, '999999999'), alterar(2, '0'),
    alterar(3, '999999'), alterar(4, '%%%'),
    alterar(5, 'A'.repeat(200000)), alterar(5, 'abc'),
    'scrypt$32768$8$3$sal$hash'
  ]) {
    assert.equal(await comparar('senha-forte-123', hash), false);
  }
});

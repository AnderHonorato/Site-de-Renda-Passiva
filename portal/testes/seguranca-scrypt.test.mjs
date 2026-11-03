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

test('comparador rejeita prefixos, campos extras e base64 com bits de preenchimento adulterados', async () => {
  const valido = await senhaHash('senha-forte-123');
  const partes = valido.split('$');
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const base64NaoCanonico = valor => {
    const posicao = valor.length - 3; // último caractere útil antes de ==
    const indice = alfabeto.indexOf(valor[posicao]);
    return valor.slice(0, posicao) + alfabeto[indice ^ 1] + valor.slice(posicao + 1);
  };
  const alterar = (indice, valor) => partes.map((item, i) => i === indice ? valor : item).join('$');
  for (const adulterado of [
    alterar(0, 'outro'),
    valido + '$campo-extra',
    alterar(4, base64NaoCanonico(partes[4])),
    alterar(5, base64NaoCanonico(partes[5])),
  ]) {
    assert.equal(await comparar('senha-forte-123', adulterado), false);
  }
  assert.equal(await comparar('senha-forte-123', valido), true);
});

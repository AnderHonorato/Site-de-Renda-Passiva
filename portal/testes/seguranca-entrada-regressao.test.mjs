import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { corpo, cookies } from '../servidor/seguranca.mjs';

function requisicao(partes, cookie = '') {
  const req = Readable.from(partes.map(parte => Buffer.from(parte)));
  req.headers = { cookie };
  return req;
}

test('leitor JSON aceita corpo fragmentado e objeto vazio', async () => {
  assert.deepEqual(await corpo(requisicao(['{"pedido":', '"123"}'])), { pedido: '123' });
  assert.deepEqual(await corpo(requisicao([])), {});
});

test('leitor JSON rejeita limite excedido mesmo com fragmentos pequenos', async () => {
  await assert.rejects(corpo(requisicao(['{"a":', '"123456"}']), 8), { status: 413, codigo: 'corpo_grande' });
});

test('leitor JSON rejeita arrays, nulos e documentos invalidos', async () => {
  for (const entrada of ['[]', 'null', '{', '"texto"', '42']) {
    await assert.rejects(corpo(requisicao([entrada])), { status: 400, codigo: 'json_invalido' });
  }
});

test('cookies preserva primeiro valor valido, sinal de igual e isolamento de prototipo', () => {
  const resultado = cookies(requisicao([], 'sessao=abc%3Ddef; sessao=outro; quebrado=%ZZ; __proto__=perigo; csrf=ok'));
  assert.equal(resultado.sessao, 'abc=def');
  assert.equal(resultado.csrf, 'ok');
  assert.equal(Object.getPrototypeOf(resultado), null);
  assert.equal(Object.hasOwn(resultado, '__proto__'), false);
});

test('leitor JSON rejeita UTF-8 corrompido e aceita caractere multibyte fragmentado', async () => {
  const valido = Buffer.from('{"nome":"ação"}', 'utf8');
  const indice = valido.indexOf(Buffer.from('ç', 'utf8'));
  assert.deepEqual(await corpo(requisicao([valido.subarray(0, indice + 1), valido.subarray(indice + 1)])), { nome: 'ação' });
  const invalido = Buffer.from('{"nome":"ação"}', 'utf8');
  invalido[indice + 1] = 0x20;
  await assert.rejects(corpo(requisicao([invalido])), { status: 400, codigo: 'json_invalido' });
});

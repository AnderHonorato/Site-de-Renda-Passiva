// seguranca-senha.test.js — hash e verificação de senha (scrypt).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gerarHashSenha, verificarSenha } from '../../servidor/seguranca/seguranca-senha.js';

describe('seguranca-senha', () => {
  test('gera hash no formato esperado e verifica a senha certa', async () => {
    const hash = await gerarHashSenha('uma-senha-bem-forte-123');
    assert.match(hash, /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    assert.equal(await verificarSenha('uma-senha-bem-forte-123', hash), true);
  });

  test('recusa a senha errada', async () => {
    const hash = await gerarHashSenha('senha-correta-000');
    assert.equal(await verificarSenha('senha-errada-999', hash), false);
  });

  test('duas chamadas geram sais diferentes (hashes diferentes para a mesma senha)', async () => {
    const hash1 = await gerarHashSenha('mesma-senha-aqui');
    const hash2 = await gerarHashSenha('mesma-senha-aqui');
    assert.notEqual(hash1, hash2);
    assert.equal(await verificarSenha('mesma-senha-aqui', hash1), true);
    assert.equal(await verificarSenha('mesma-senha-aqui', hash2), true);
  });

  test('recusa formatos inválidos sem lançar', async () => {
    const formatosInvalidos = [
      '',
      'texto-qualquer',
      'scrypt$16384$8$1$semhashsegundo',
      'bcrypt$16384$8$1$c2Fs$aGFzaA==',
      'scrypt$abc$8$1$c2Fs$aGFzaA==',
      'scrypt$0$8$1$c2Fs$aGFzaA==',
      'scrypt$16384$8$1$$aGFzaA==',
      'scrypt$16384$8$1$c2Fs$',
      'scrypt$99999999$8$1$c2Fs$aGFzaA==', // custo absurdo — deve recusar sem gastar memória
    ];
    for (const hashInvalido of formatosInvalidos) {
      assert.equal(await verificarSenha('qualquer-senha', hashInvalido), false, `deveria recusar: ${hashInvalido}`);
    }
  });

  test('recusa entradas que não são string', async () => {
    assert.equal(await verificarSenha(123, 'scrypt$16384$8$1$c2Fs$aGFzaA=='), false);
    assert.equal(await verificarSenha('senha', null), false);
    assert.equal(await verificarSenha('senha', undefined), false);
  });

  test('gerarHashSenha rejeita senha vazia ou não string', async () => {
    await assert.rejects(() => gerarHashSenha(''));
    await assert.rejects(() => gerarHashSenha(undefined));
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { api, ErroApi } from '../ferramentas/api-previa-pages.mjs';

test('prévia estática permite visitar ferramentas sem consultar servidor ou criar sessão', async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('A prévia não deve consultar a API'); };
  try {
    assert.deepEqual(await api('/api/autenticacao/sessao'), {
      usuario: null, chat_habilitado: false, chat_aceito: false,
    });
    assert.deepEqual(await api('/api/anuncios'), { permitido: false });
    await assert.rejects(api('/api/autenticacao/entrar', { metodo: 'POST', dados: {} }),
      erro => erro instanceof ErroApi && erro.status === 503 && /prévia/.test(erro.message));
    await assert.rejects(api('/api/trabalhos'), ErroApi);
  } finally { globalThis.fetch = anterior; }
});

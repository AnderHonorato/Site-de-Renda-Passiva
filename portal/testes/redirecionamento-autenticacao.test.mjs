import test from 'node:test';
import assert from 'node:assert/strict';
import { redirecionarAutenticacaoPages } from '../ferramentas/redirecionar-autenticacao-pages.mjs';

test('Pages envia a autenticação para a página fixa do servidor, em ambos idiomas', () => {
  const base = '<!doctype html><html><head><title>Entrar</title></head><body>Conta</body></html>';
  const pt = redirecionarAutenticacaoPages(base, 'entrar');
  const en = redirecionarAutenticacaoPages(base, 'cadastro', true);
  assert.match(pt, /http-equiv="refresh" content="0; url=servidor-teste\.html\?abrir=entrar"/);
  assert.match(en, /http-equiv="refresh" content="0; url=\.\.\/servidor-teste\.html\?abrir=cadastro"/);
  assert.match(pt, /Conta<\/body>/);
  assert.equal(redirecionarAutenticacaoPages(base, 'entrar'), pt);
  assert.throws(() => redirecionarAutenticacaoPages(base, '../invalid'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  substituirVariaveis,
  traduzirComDicionario,
  montarCookieIdioma,
  segmentarNegrito,
} from '../../frontend/compartilhado/compartilhado-idioma.js';

test('substituirVariaveis troca {nome} pelo valor', () => {
  assert.equal(substituirVariaveis('Olá, {nome}!', { nome: 'Ander' }), 'Olá, Ander!');
});

test('substituirVariaveis deixa {nome} como está quando falta a variável', () => {
  assert.equal(substituirVariaveis('Olá, {nome}!', {}), 'Olá, {nome}!');
});

test('traduzirComDicionario aplica variável numa chave aninhada', () => {
  const dicionario = { compartilhado: { rodape: { direitos: '© {ano} Ander Flow.' } } };
  assert.equal(traduzirComDicionario(dicionario, 'compartilhado.rodape.direitos', { ano: 2026 }), '© 2026 Ander Flow.');
});

test('traduzirComDicionario resolve variável dentro da própria chave, como o montador faz', () => {
  const dicionario = { erro: { 404: { titulo: 'Essa não existe.' }, 429: { titulo: 'Rápido demais.' } } };
  assert.equal(traduzirComDicionario(dicionario, 'erro.{codigo}.titulo', { codigo: 404 }), 'Essa não existe.');
  assert.equal(traduzirComDicionario(dicionario, 'erro.{codigo}.titulo', { codigo: 429 }), 'Rápido demais.');
});

test('traduzirComDicionario cai para a própria chave quando ela não existe', () => {
  const dicionario = { compartilhado: { rodape: {} } };
  assert.equal(traduzirComDicionario(dicionario, 'compartilhado.rodape.chave_inexistente'), 'compartilhado.rodape.chave_inexistente');
});

test('traduzirComDicionario cai para a própria chave quando o dicionário está vazio', () => {
  assert.equal(traduzirComDicionario({}, 'principal.titulo'), 'principal.titulo');
});

test('montarCookieIdioma monta cookie de 1 ano, SameSite=Lax, path=/', () => {
  const cookie = montarCookieIdioma('en');
  assert.match(cookie, /^idioma=en;/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
});

test('montarCookieIdioma inclui Secure em produção', () => {
  assert.match(montarCookieIdioma('pt-BR', { emProducao: true }), /Secure/);
});

test('segmentarNegrito separa **trecho** em segmentos com negrito', () => {
  const segmentos = segmentarNegrito('Preço **mínimo** aqui');
  assert.deepEqual(segmentos, [
    { negrito: false, texto: 'Preço ' },
    { negrito: true, texto: 'mínimo' },
    { negrito: false, texto: ' aqui' },
  ]);
});

test('segmentarNegrito sem marcação devolve um único segmento', () => {
  assert.deepEqual(segmentarNegrito('sem marcação'), [{ negrito: false, texto: 'sem marcação' }]);
});

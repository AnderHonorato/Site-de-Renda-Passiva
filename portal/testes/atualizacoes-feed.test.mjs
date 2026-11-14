import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarFeedAtualizacoes, carregarAtualizacoes } from '../scripts/núcleo/atualizacoes.js';

const post = { id: 'pdfs-profissionais', slug: 'pdfs-profissionais', categoria: 'melhoria', versao: '1.4',
  publicado_em: '2026-11-13T10:00:00Z', atualizado_em: '2026-11-13T10:00:00Z',
  pt: { titulo: 'PDFs melhores', resumo: 'Prévia e identidade visual.', conteudo: 'Uma melhoria publicada.' } };
const agora = Date.parse('2026-11-14T10:00:00Z');

test('feed público descarta rascunhos, agendamentos, identificadores e conteúdo inválidos', () => {
  const itens = [post, { ...post, id: 'rascunho', slug: 'rascunho', estado: 'rascunho' },
    { ...post, id: 'futuro', slug: 'futuro', publicado_em: '2027-01-01T00:00:00Z' },
    { ...post, id: 'invalido', slug: '../admin' }, { ...post, id: 'sem-texto', slug: 'sem-texto', pt: {} }, post];
  assert.deepEqual(validarFeedAtualizacoes({ itens }, agora).itens.map(i => i.id), ['pdfs-profissionais']);
});

test('feed preserva texto literal e ignora inglês incompleto sem expor campos administrativos', () => {
  const [item] = validarFeedAtualizacoes({ itens: [{ ...post, revisao: 5, en: { titulo: 'Incomplete' },
    pt: { ...post.pt, conteudo: '<script>alert(1)</script>\nTexto comum.' } }] }, agora).itens;
  assert.equal(item.pt.conteudo, '<script>alert(1)</script>\nTexto comum.');
  assert.equal(item.en, undefined);
  assert.equal(item.revisao, undefined);
  assert.throws(() => validarFeedAtualizacoes({}), /inválido/);
});

test('API vazia é respeitada: posts removidos não reaparecem pelo fallback estático', async contexto => {
  const requisicoes = [];
  contexto.mock.method(globalThis, 'fetch', async url => {
    requisicoes.push(String(url));
    return Response.json({ itens: [] });
  });
  assert.deepEqual(await carregarAtualizacoes({ atualizar: true }), { itens: [] });
  assert.deepEqual(requisicoes, ['/api/atualizacoes']);
});

test('hospedagem estática usa o JSON local quando a API está indisponível', async contexto => {
  const requisicoes = [];
  contexto.mock.method(globalThis, 'fetch', async url => {
    requisicoes.push(String(url));
    return requisicoes.length === 1 ? new Response('', { status: 404 }) : Response.json({ itens: [post] });
  });
  const resultado = await carregarAtualizacoes({ atualizar: true });
  assert.equal(resultado.itens[0].slug, post.slug);
  assert.equal(requisicoes.length, 2);
  assert.match(requisicoes[1], /\/dados\/atualizacoes\.json$/);
});

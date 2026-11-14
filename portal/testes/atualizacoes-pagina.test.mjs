import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarPaginaAtualizacoes } from '../ferramentas/pagina-atualizacoes.mjs';
import { deveSerPublicado } from '../ferramentas/política-de-segurança.mjs';

const item = { id: 'uma-melhoria', slug: 'uma-melhoria', categoria: 'melhoria', versao: '2026.11',
  publicado_em: '2026-01-01T00:00:00.000Z', atualizado_em: '2026-01-01T00:00:00.000Z',
  pt: { titulo: 'Uma melhoria', resumo: 'Conheça os detalhes.', conteudo: 'Texto com <script>exemplo</script>.\n\nOutro parágrafo.' } };

test('blog estático já inclui posts públicos, permalinks e texto escapado sem executar HTML', () => {
  const pagina = gerarPaginaAtualizacoes({ código: 'pt-BR' }, { itens: [item,
    { ...item, slug: 'um-rascunho', estado: 'rascunho' },
    { ...item, slug: 'um-agendamento', publicado_em: '2999-01-01T00:00:00.000Z' }] });
  assert.match(pagina.conteúdo, /id="uma-melhoria"/);
  assert.match(pagina.conteúdo, /Texto com &lt;script&gt;exemplo&lt;\/script&gt;/);
  assert.doesNotMatch(pagina.conteúdo, /<script>|id="um-rascunho"|id="um-agendamento"|<main\b/);
  assert.deepEqual(pagina.scripts, ['páginas/atualizacoes.js']);
});

test('inglês usa português quando o post não foi traduzido e publicação inclui apenas arquivos públicos', () => {
  assert.match(gerarPaginaAtualizacoes({ código: 'en' }, { itens: [item] }).conteúdo, /Uma melhoria/);
  for (const arquivo of ['atualizacoes.html', 'en/atualizacoes.html', 'dados/atualizacoes.json', 'admin/atualizacoes/index.html']) {
    assert.equal(deveSerPublicado(arquivo), true, arquivo);
  }
  assert.equal(deveSerPublicado('servidor/atualizacoes.mjs'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco } from '../servidor/banco.mjs';
import { criarAtualizacao, editarAtualizacao, excluirAtualizacao, feedAtualizacoes, inicializarAtualizacoes } from '../servidor/atualizacoes.mjs';

const sementes = JSON.parse(readFileSync(new URL('../dados/atualizacoes.json', import.meta.url), 'utf8')).itens.length;

const base = (sobrescritas = {}) => ({
  slug: 'analise-de-cenario', categoria: 'novo', versao: '2026.11',
  publicado_em: '2026-11-14T09:00:00.000Z', estado: 'rascunho',
  pt: { titulo: 'Análise de cenário', resumo: 'Compare os resultados calculados.', conteudo: 'Texto em dois parágrafos.\n\nSegundo parágrafo.' },
  ...sobrescritas
});

test('CMS de atualizações valida conteúdo, IDs, duplicatas e revisão otimista', () => {
  const db = abrirBanco(':memory:');
  try {
    const item = criarAtualizacao(db, base({ id: 'analise-de-cenario' }));
    assert.equal(item.id, 'analise-de-cenario');
    assert.equal(item.revisao, 1);
    assert.equal(feedAtualizacoes(db, '2026-11-15T00:00:00.000Z').itens.length, 0);

    assert.throws(() => criarAtualizacao(db, base({ slug: '-slug-invalido' })), erro => erro.status === 400);
    assert.throws(() => criarAtualizacao(db, base({ id: 'id-invalido--duplo' })), erro => erro.status === 400);
    assert.throws(() => criarAtualizacao(db, base({ slug: 'analise-de-cenario', id: 'outro-id' })), erro => erro.status === 409);
    assert.throws(() => criarAtualizacao(db, base({ id: 'id-valido', pt: { ...base().pt, titulo: 'T'.repeat(121) } })), erro => erro.status === 400);
    assert.throws(() => criarAtualizacao(db, base({ id: 'id-valido', pt: { ...base().pt, resumo: 'R'.repeat(301) } })), erro => erro.status === 400);
    assert.throws(() => criarAtualizacao(db, base({ id: 'id-valido', pt: { ...base().pt, conteudo: 'C'.repeat(12001) } })), erro => erro.status === 400);
    // Conteúdo é armazenado como texto simples e pode conter sinais de marcação; a interface o renderiza via textContent.
    const literal = criarAtualizacao(db, base({ id: 'literal-editorial', slug: 'literal-editorial', en: { titulo: 'Editorial literal', resumo: 'Plain text body.', conteudo: 'Use <strong> para explain markup.' }, pt: { ...base().pt, conteudo: 'Use <strong> para explicar a marcação.' } }));
    assert.match(literal.pt.conteudo, /<strong>/u);

    const atualizado = editarAtualizacao(db, item.id, { ...base(), revisao: item.revisao, estado: 'publicado', en: null });
    assert.equal(atualizado.revisao, 2);
    assert.equal('en' in atualizado, false);
    assert.throws(() => editarAtualizacao(db, item.id, { ...base(), revisao: item.revisao }), erro => erro.status === 409);
    assert.throws(() => excluirAtualizacao(db, item.id, 1), erro => erro.status === 409);
    excluirAtualizacao(db, item.id, atualizado.revisao);
    assert.throws(() => excluirAtualizacao(db, item.id, atualizado.revisao), erro => erro.status === 404);
  } finally { db.close(); }
});

test('seed de atualizações é de primeira instalação e não recria posts apagados após reinício', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'portal-cms-seed-'));
  const caminho = join(pasta, 'portal.sqlite');
  try {
    let db = abrirBanco(caminho);
    inicializarAtualizacoes(db);
    assert.equal(db.prepare('SELECT COUNT(*) total FROM atualizacoes').get().total, sementes);
    assert.equal(db.prepare('SELECT COUNT(*) total FROM atualizacoes_migracoes').get().total, 1);
    db.prepare('DELETE FROM atualizacoes').run();
    inicializarAtualizacoes(db);
    assert.equal(db.prepare('SELECT COUNT(*) total FROM atualizacoes').get().total, 0);
    db.close();

    db = abrirBanco(caminho);
    inicializarAtualizacoes(db);
    assert.equal(db.prepare('SELECT COUNT(*) total FROM atualizacoes').get().total, 0);
    assert.equal(db.prepare('SELECT COUNT(*) total FROM atualizacoes_migracoes').get().total, 1);
    db.close();
  } finally { rmSync(pasta, { recursive: true, force: true }); }
});

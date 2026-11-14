import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { erro } from './seguranca.mjs';

const arquivoSementes = resolve(import.meta.dirname, '../dados/atualizacoes.json');
const categorias = new Set(['novo', 'melhoria', 'correcao']);
const slugValido = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const idsValidos = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const transacao = (db, acao) => {
  db.exec('BEGIN IMMEDIATE');
  try { const valor = acao(); db.exec('COMMIT'); return valor; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
};

function validarTexto(valor, min, max) {
  if (typeof valor !== 'string') throw erro(400, 'dados_invalidos');
  const texto = valor.trim();
  if (texto.length < min || texto.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(texto)) throw erro(400, 'dados_invalidos');
  return texto;
}

function iso(valor, obrigatorio = true) {
  if (valor == null && !obrigatorio) return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(valor) || !Number.isFinite(Date.parse(valor))) throw erro(400, 'data_invalida');
  const normalizada = new Date(valor).toISOString();
  if (normalizada.slice(0, 19) !== valor.slice(0, 19)) throw erro(400, 'data_invalida');
  return normalizada;
}

function validarIdioma(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw erro(400, 'dados_invalidos');
  return {
    titulo: validarTexto(valor.titulo, 1, 120),
    resumo: validarTexto(valor.resumo, 1, 300),
    conteudo: validarTexto(valor.conteudo, 1, 12000)
  };
}

function validarItem(valor, { parcial = false } = {}) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw erro(400, 'dados_invalidos');
  const campos = {};
  if (!parcial || valor.slug !== undefined) {
    if (typeof valor.slug !== 'string' || !slugValido.test(valor.slug) || valor.slug.length > 80) throw erro(400, 'slug_invalido');
    campos.slug = valor.slug;
  }
  if (!parcial || valor.categoria !== undefined) {
    if (!categorias.has(valor.categoria)) throw erro(400, 'dados_invalidos');
    campos.categoria = valor.categoria;
  }
  if (!parcial || valor.versao !== undefined) campos.versao = validarTexto(valor.versao, 1, 40);
  if (!parcial || valor.publicado_em !== undefined) campos.publicado_em = iso(valor.publicado_em);
  if (!parcial || valor.pt !== undefined) campos.pt = validarIdioma(valor.pt);
  if (valor.en != null) campos.en = validarIdioma(valor.en);
  else if (!parcial || valor.en === null) campos.en = null;
  if (!parcial && !campos.pt) throw erro(400, 'dados_invalidos');
  if (valor.estado !== undefined || !parcial) {
    if (!['rascunho', 'publicado'].includes(valor.estado)) throw erro(400, 'dados_invalidos');
    campos.estado = valor.estado;
  }
  if (parcial && (!Number.isInteger(valor.revisao) || valor.revisao < 1)) throw erro(400, 'revisao_invalida');
  return campos;
}

function formatar(row, admin = false) {
  const item = {
    id: row.id, slug: row.slug, categoria: row.categoria, versao: row.versao,
    publicado_em: row.publicado_em, atualizado_em: row.atualizado_em,
    pt: JSON.parse(row.pt), ...(row.en ? { en: JSON.parse(row.en) } : {})
  };
  if (admin) { item.estado = row.estado; item.revisao = row.revisao; }
  return item;
}

export function inicializarAtualizacoes(db) {
  const sementes = JSON.parse(readFileSync(arquivoSementes, 'utf8')).itens;
  transacao(db, () => {
    const migracao = 'seed-atualizacoes-2026.11';
    if (db.prepare('SELECT 1 FROM atualizacoes_migracoes WHERE chave=?').get(migracao)) return;
    const inserir = db.prepare(`INSERT OR IGNORE INTO atualizacoes
      (id,slug,categoria,versao,publicado_em,atualizado_em,pt,en,estado,revisao)
      VALUES(?,?,?,?,?,?,?,?, 'publicado',1)`);
    for (const semente of sementes) inserir.run(semente.id, semente.slug, semente.categoria, semente.versao,
      semente.publicado_em, semente.atualizado_em, JSON.stringify(semente.pt), semente.en ? JSON.stringify(semente.en) : null);
    db.prepare('INSERT INTO atualizacoes_migracoes(chave) VALUES(?)').run(migracao);
  });
}

export function feedAtualizacoes(db, agora = new Date().toISOString()) {
  return { itens: db.prepare(`SELECT id,slug,categoria,versao,publicado_em,atualizado_em,pt,en,estado,revisao
    FROM atualizacoes WHERE estado='publicado' AND publicado_em<=? ORDER BY publicado_em DESC,id DESC`).all(agora).map(row => formatar(row)) };
}

export function listarAtualizacoesAdmin(db) {
  return { itens: db.prepare(`SELECT id,slug,categoria,versao,publicado_em,atualizado_em,pt,en,estado,revisao
    FROM atualizacoes ORDER BY publicado_em DESC,id DESC`).all().map(row => formatar(row, true)) };
}

export function criarAtualizacao(db, body, agora = new Date().toISOString()) {
  const item = validarItem(body);
  const id = body.id === undefined ? randomUUID() : body.id;
  if (typeof id !== 'string' || id.length > 80 || !idsValidos.test(id)) throw erro(400, 'id_invalido');
  const tempo = new Date(agora).toISOString();
  try {
    db.prepare(`INSERT INTO atualizacoes(id,slug,categoria,versao,publicado_em,atualizado_em,pt,en,estado,revisao)
      VALUES(?,?,?,?,?,?,?,?,?,1)`).run(id,item.slug,item.categoria,item.versao,item.publicado_em,tempo,JSON.stringify(item.pt),item.en ? JSON.stringify(item.en) : null,item.estado);
  } catch (e) {
    if (String(e.code || '').startsWith('SQLITE_CONSTRAINT') || (Number(e.errcode) & 255) === 19) throw erro(409, 'atualizacao_duplicada');
    throw e;
  }
  return formatar(db.prepare('SELECT * FROM atualizacoes WHERE id=?').get(id), true);
}

export function editarAtualizacao(db, id, body, agora = new Date().toISOString()) {
  if (typeof id !== 'string' || !idsValidos.test(id)) throw erro(404, 'atualizacao_nao_localizada');
  const item = validarItem(body);
  if (!Number.isInteger(body.revisao) || body.revisao < 1) throw erro(400, 'revisao_invalida');
  try {
    const resultado = db.prepare(`UPDATE atualizacoes SET slug=?,categoria=?,versao=?,publicado_em=?,atualizado_em=?,pt=?,en=?,estado=?,revisao=revisao+1
      WHERE id=? AND revisao=?`).run(item.slug,item.categoria,item.versao,item.publicado_em,new Date(agora).toISOString(),JSON.stringify(item.pt),item.en ? JSON.stringify(item.en) : null,item.estado,id,body.revisao);
    if (!resultado.changes) {
      if (!db.prepare('SELECT 1 FROM atualizacoes WHERE id=?').get(id)) throw erro(404, 'atualizacao_nao_localizada');
      throw erro(409, 'atualizacao_desatualizada');
    }
  } catch (e) {
    if (String(e.code || '').startsWith('SQLITE_CONSTRAINT') || (Number(e.errcode) & 255) === 19) throw erro(409, 'atualizacao_duplicada');
    throw e;
  }
  return formatar(db.prepare('SELECT * FROM atualizacoes WHERE id=?').get(id), true);
}

export function excluirAtualizacao(db, id, revisao) {
  if (typeof id !== 'string' || !idsValidos.test(id)) throw erro(404, 'atualizacao_nao_localizada');
  if (!Number.isInteger(revisao) || revisao < 1) throw erro(400, 'revisao_invalida');
  const resultado = db.prepare('DELETE FROM atualizacoes WHERE id=? AND revisao=?').run(id,revisao);
  if (!resultado.changes) {
    if (!db.prepare('SELECT 1 FROM atualizacoes WHERE id=?').get(id)) throw erro(404, 'atualizacao_nao_localizada');
    throw erro(409, 'atualizacao_desatualizada');
  }
}

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function abrirBanco(caminho = process.env.PORTAL_BANCO || resolve(import.meta.dirname, '.execucao', 'portal.sqlite')) {
  mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      usuario TEXT NOT NULL UNIQUE COLLATE NOCASE, nome TEXT NOT NULL,
      senha_hash TEXT NOT NULL, idade INTEGER NOT NULL CHECK(idade>=13),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      papel TEXT NOT NULL DEFAULT 'usuario' CHECK(papel IN ('usuario','admin')),
      plano TEXT NOT NULL DEFAULT 'gratuito', situacao TEXT NOT NULL DEFAULT 'ativo',
      bio TEXT NOT NULL DEFAULT '', local TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT 'sol',
      visibilidade TEXT NOT NULL DEFAULT '{}', chat_aceito_em TEXT,
      silenciado_ate TEXT, banido_em TEXT, pontos INTEGER NOT NULL DEFAULT 0,
      pontos_dia TEXT, pontos_hoje INTEGER NOT NULL DEFAULT 0,
      idioma TEXT NOT NULL DEFAULT 'pt-BR', tema TEXT NOT NULL DEFAULT 'sistema',
      recomendadas TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, expira_em INTEGER NOT NULL,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS redefinicoes (
      id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, expira_em INTEGER NOT NULL, usado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS amizades (
      origem INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      destino INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      estado TEXT NOT NULL CHECK(estado IN ('pendente','aceita')),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(origem,destino), CHECK(origem<>destino)
    );
    CREATE TABLE IF NOT EXISTS bloqueios (
      origem INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      destino INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(origem,destino), CHECK(origem<>destino)
    );
    CREATE TABLE IF NOT EXISTS salas (
      id TEXT PRIMARY KEY, tipo TEXT NOT NULL CHECK(tipo IN ('global','categoria','ferramenta','direta')),
      nome TEXT NOT NULL, criador_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      participante_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY, sala_id TEXT NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
      autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      texto TEXT NOT NULL CHECK(length(texto)<=500),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      removida_em TEXT
    );
    CREATE INDEX IF NOT EXISTS mensagens_sala ON mensagens(sala_id,id DESC);
    CREATE TABLE IF NOT EXISTS denuncias (
      id INTEGER PRIMARY KEY, denunciante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      alvo_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      mensagem_id INTEGER REFERENCES mensagens(id) ON DELETE SET NULL,
      motivo TEXT NOT NULL, situacao TEXT NOT NULL DEFAULT 'aberta',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS auditoria_admin (
      id INTEGER PRIMARY KEY, admin_id INTEGER NOT NULL,
      acao TEXT NOT NULL, alvo_id INTEGER, detalhe TEXT NOT NULL DEFAULT '{}',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS trabalhos (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      ferramenta_slug TEXT NOT NULL,
      titulo TEXT NOT NULL,
      dados TEXT NOT NULL DEFAULT '{}',
      situacao TEXT NOT NULL DEFAULT 'salvo' CHECK(situacao IN ('em_aberto','salvo')),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS trabalhos_usuario ON trabalhos(usuario_id,situacao,atualizado_em DESC);
    CREATE TABLE IF NOT EXISTS favoritos (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      slug TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(usuario_id,slug)
    );
    CREATE TABLE IF NOT EXISTS uso_ferramentas (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      slug TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0,
      ultimo_uso_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(usuario_id,slug)
    );
    CREATE TABLE IF NOT EXISTS suporte (
      id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      assunto TEXT NOT NULL, texto TEXT NOT NULL,
      resposta TEXT, status TEXT NOT NULL DEFAULT 'aberta',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      respondido_em TEXT
    );
    INSERT OR IGNORE INTO salas(id,tipo,nome) VALUES('global','global','Conversa geral');
  `);
  const colunas=db.prepare('PRAGMA table_info(usuarios)').all().map(c=>c.name);
  if(!colunas.includes('idioma'))db.exec("ALTER TABLE usuarios ADD COLUMN idioma TEXT NOT NULL DEFAULT 'pt-BR'");
  if(!colunas.includes('tema'))db.exec("ALTER TABLE usuarios ADD COLUMN tema TEXT NOT NULL DEFAULT 'sistema'");
  if(!colunas.includes('recomendadas'))db.exec("ALTER TABLE usuarios ADD COLUMN recomendadas TEXT NOT NULL DEFAULT '[]'");
  db.prepare("DELETE FROM mensagens WHERE criado_em < datetime('now','-90 days')").run();
  db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(Date.now());
  return db;
}

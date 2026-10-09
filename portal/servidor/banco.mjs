import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { iniciarRecompensas } from './recompensas.mjs';

export function abrirBanco(caminho = process.env.PORTAL_BANCO || resolve(import.meta.dirname, '.execucao', 'portal.sqlite')) {
  mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS perfil_conquistas_destaque (
      usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      selecionadas TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS conquistas_ganhas (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL, patamar INTEGER NOT NULL, criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(usuario_id,tipo)
    );
    CREATE TABLE IF NOT EXISTS novidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo_pt TEXT NOT NULL, texto_pt TEXT NOT NULL,
      titulo_en TEXT NOT NULL, texto_en TEXT NOT NULL,
      botao_pt TEXT NOT NULL DEFAULT '', botao_en TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '', alt_pt TEXT NOT NULL DEFAULT '', alt_en TEXT NOT NULL DEFAULT '',
      publicar_em TEXT, retirar_em TEXT, ordem INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 0, versao INTEGER NOT NULL DEFAULT 1,
      revisao INTEGER NOT NULL DEFAULT 0, imagem BLOB, imagem_mime TEXT
    );
    CREATE TABLE IF NOT EXISTS novidades_publicacoes (id INTEGER PRIMARY KEY AUTOINCREMENT);
    INSERT OR IGNORE INTO novidades_publicacoes(id) VALUES(1);
    CREATE TABLE IF NOT EXISTS publicidade_config (id INTEGER PRIMARY KEY CHECK(id=1),dados TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      usuario TEXT NOT NULL UNIQUE COLLATE NOCASE, nome TEXT NOT NULL,
      senha_hash TEXT NOT NULL, idade INTEGER NOT NULL CHECK(idade>=13),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      papel TEXT NOT NULL DEFAULT 'usuario' CHECK(papel IN ('usuario','admin')),
      plano TEXT NOT NULL DEFAULT 'gratuito', situacao TEXT NOT NULL DEFAULT 'ativo',
      bio TEXT NOT NULL DEFAULT '', local TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT 'sol',
      avatar_foto BLOB, avatar_foto_mime TEXT,
      banner TEXT NOT NULL DEFAULT 'brisa', moldura TEXT NOT NULL DEFAULT 'basica',
      sociais TEXT NOT NULL DEFAULT '{}',
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
      resposta_a INTEGER REFERENCES mensagens(id) ON DELETE SET NULL,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      removida_em TEXT
    );
    CREATE INDEX IF NOT EXISTS mensagens_sala ON mensagens(sala_id,id DESC);
    CREATE TABLE IF NOT EXISTS chat_leituras (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      sala_id TEXT NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
      ultimo_id INTEGER NOT NULL DEFAULT 0,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(usuario_id,sala_id)
    );
    CREATE TABLE IF NOT EXISTS chat_midias (
      id INTEGER PRIMARY KEY,
      mensagem_id INTEGER NOT NULL REFERENCES mensagens(id) ON DELETE CASCADE,
      autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      mime TEXT NOT NULL,
      tamanho INTEGER NOT NULL,
      dados BLOB NOT NULL,
      duracao REAL,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS chat_midias_mensagem ON chat_midias(mensagem_id);
    CREATE TABLE IF NOT EXISTS chat_reproducao (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      midia_id INTEGER NOT NULL REFERENCES chat_midias(id) ON DELETE CASCADE,
      posicao REAL NOT NULL DEFAULT 0,
      duracao REAL,
      concluida INTEGER NOT NULL DEFAULT 0,
      aberto_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(usuario_id,midia_id)
    );
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
  db.exec(`CREATE TABLE IF NOT EXISTS conquistas_vistas (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, patamar INTEGER NOT NULL, visto_em TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(usuario_id,tipo)
  )`);
  const colunas=db.prepare('PRAGMA table_info(usuarios)').all().map(c=>c.name);
  if(!colunas.includes('idioma'))db.exec("ALTER TABLE usuarios ADD COLUMN idioma TEXT NOT NULL DEFAULT 'pt-BR'");
  if(!colunas.includes('tema'))db.exec("ALTER TABLE usuarios ADD COLUMN tema TEXT NOT NULL DEFAULT 'sistema'");
  if(!colunas.includes('recomendadas'))db.exec("ALTER TABLE usuarios ADD COLUMN recomendadas TEXT NOT NULL DEFAULT '[]'");
  if(!colunas.includes('avatar_foto'))db.exec("ALTER TABLE usuarios ADD COLUMN avatar_foto BLOB");
  if(!colunas.includes('avatar_foto_mime'))db.exec("ALTER TABLE usuarios ADD COLUMN avatar_foto_mime TEXT");
  if(!colunas.includes('banner'))db.exec("ALTER TABLE usuarios ADD COLUMN banner TEXT NOT NULL DEFAULT 'brisa'");
  if(!colunas.includes('moldura'))db.exec("ALTER TABLE usuarios ADD COLUMN moldura TEXT NOT NULL DEFAULT 'basica'");
  if(!colunas.includes('sociais'))db.exec("ALTER TABLE usuarios ADD COLUMN sociais TEXT NOT NULL DEFAULT '{}'");
  const colunasMensagens=db.prepare('PRAGMA table_info(mensagens)').all().map(c=>c.name);
  if(!colunasMensagens.includes('resposta_a'))db.exec("ALTER TABLE mensagens ADD COLUMN resposta_a INTEGER REFERENCES mensagens(id) ON DELETE SET NULL");
  db.prepare("DELETE FROM mensagens WHERE criado_em < datetime('now','-90 days') AND sala_id NOT IN (SELECT id FROM salas WHERE tipo='direta')").run();
  db.prepare("DELETE FROM mensagens WHERE criado_em < datetime('now','-48 hours') AND sala_id IN (SELECT id FROM salas WHERE tipo='direta')").run();
  db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(Date.now());
  iniciarRecompensas(db);
  return db;
}

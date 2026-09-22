-- banco-migracao-001-inicial.sql
-- Esquema inicial do Ander Flow. Escrito pelo orquestrador na Onda 0 (fonte: docs/contratos.md §7).
-- Datas em texto ISO 8601 UTC com milissegundos: 2026-09-22T14:03:11.123Z

PRAGMA foreign_keys = ON;

CREATE TABLE usuarios (
  id               INTEGER PRIMARY KEY,
  email            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  nome             TEXT    NOT NULL,
  senha_hash       TEXT    NOT NULL,
  plano            TEXT    NOT NULL DEFAULT 'gratis'  CHECK (plano IN ('gratis', 'plus')),
  papel            TEXT    NOT NULL DEFAULT 'usuario' CHECK (papel IN ('usuario', 'admin')),
  idioma           TEXT    NOT NULL DEFAULT 'pt-BR'   CHECK (idioma IN ('pt-BR', 'en')),
  tema             TEXT    NOT NULL DEFAULT 'sistema' CHECK (tema IN ('sistema', 'claro', 'escuro')),
  situacao         TEXT    NOT NULL DEFAULT 'ativo'   CHECK (situacao IN ('ativo', 'suspenso')),
  criado_em        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  atualizado_em    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ultimo_acesso_em TEXT
);

CREATE TABLE sessoes (
  id            INTEGER PRIMARY KEY,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash    TEXT    NOT NULL UNIQUE,
  criado_em     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expira_em     TEXT    NOT NULL,
  ultimo_uso_em TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip            TEXT,
  agente        TEXT
);
CREATE INDEX sessoes_por_usuario ON sessoes (usuario_id);
CREATE INDEX sessoes_por_expiracao ON sessoes (expira_em);

CREATE TABLE recuperacoes_senha (
  id         INTEGER PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  criado_em  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expira_em  TEXT    NOT NULL,
  usado_em   TEXT
);
CREATE INDEX recuperacoes_por_usuario ON recuperacoes_senha (usuario_id);

CREATE TABLE favoritos (
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ferramenta_slug TEXT    NOT NULL,
  criado_em       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (usuario_id, ferramenta_slug)
);

CREATE TABLE trabalhos (
  id              INTEGER PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ferramenta_slug TEXT    NOT NULL,
  titulo          TEXT    NOT NULL,
  dados           TEXT    NOT NULL DEFAULT '{}',
  situacao        TEXT    NOT NULL DEFAULT 'em_aberto' CHECK (situacao IN ('em_aberto', 'salvo')),
  criado_em       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  atualizado_em   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX trabalhos_por_usuario ON trabalhos (usuario_id, situacao, atualizado_em);

CREATE TABLE avisos (
  id                INTEGER PRIMARY KEY,
  tipo              TEXT    NOT NULL CHECK (tipo IN ('sistema', 'popup')),
  publico           TEXT    NOT NULL DEFAULT 'todos' CHECK (publico IN ('todos', 'gratis', 'plus', 'anonimos')),
  titulo_pt_br      TEXT    NOT NULL,
  titulo_en         TEXT    NOT NULL,
  corpo_pt_br       TEXT    NOT NULL,
  corpo_en          TEXT    NOT NULL,
  link_url          TEXT,
  link_rotulo_pt_br TEXT,
  link_rotulo_en    TEXT,
  inicio_em         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  fim_em            TEXT,
  ativo             INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_por        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  atualizado_em     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX avisos_vigentes ON avisos (ativo, tipo, inicio_em);

CREATE TABLE avisos_lidos (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aviso_id   INTEGER NOT NULL REFERENCES avisos(id) ON DELETE CASCADE,
  lido_em    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (usuario_id, aviso_id)
);

CREATE TABLE mensagens (
  id         INTEGER PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  autor      TEXT    NOT NULL CHECK (autor IN ('usuario', 'admin')),
  admin_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  corpo      TEXT    NOT NULL,
  criado_em  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  lida_em    TEXT
);
CREATE INDEX mensagens_por_usuario ON mensagens (usuario_id, criado_em);

CREATE TABLE ferramentas_ajustes (
  ferramenta_slug TEXT    PRIMARY KEY,
  ativa           INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  plano           TEXT             CHECK (plano IS NULL OR plano IN ('gratis', 'plus')),
  destaque        INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)),
  atualizado_em   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  atualizado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE usos_ferramentas (
  ferramenta_slug TEXT    NOT NULL,
  dia             TEXT    NOT NULL,
  tipo            TEXT    NOT NULL CHECK (tipo IN ('uso', 'documento')),
  contagem        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ferramenta_slug, dia, tipo)
);

CREATE TABLE usos_usuarios (
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ferramenta_slug TEXT    NOT NULL,
  mes             TEXT    NOT NULL,
  tipo            TEXT    NOT NULL CHECK (tipo IN ('uso', 'documento')),
  contagem        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, ferramenta_slug, mes, tipo)
);

CREATE TABLE limites_trafego (
  grupo              TEXT    NOT NULL,
  chave              TEXT    NOT NULL,
  reincidencias      INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate      TEXT,
  ultima_infracao_em TEXT,
  PRIMARY KEY (grupo, chave)
);
CREATE INDEX limites_bloqueados ON limites_trafego (bloqueado_ate);

CREATE TABLE registros_admin (
  id         INTEGER PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  acao       TEXT    NOT NULL,
  alvo       TEXT,
  detalhes   TEXT,
  criado_em  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

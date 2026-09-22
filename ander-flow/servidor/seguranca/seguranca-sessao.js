// seguranca-sessao.js — sessão por cookie opaco, com só o hash gravado no banco (§9.4).
import { createHash, randomBytes } from 'node:crypto';
import { criarErro } from '../servidor-erros.js';

const NOME_COOKIE = 'af_sessao';
const RENOVACAO_MINIMA_MS = 10 * 60 * 1000;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('base64');
}

function paraUsuarioPublico(linha) {
  if (!linha) return null;
  return {
    id: linha.usuario_id,
    nome: linha.nome,
    email: linha.email,
    plano: linha.plano,
    papel: linha.papel,
    idioma: linha.idioma,
    tema: linha.tema,
    criado_em: linha.criado_em,
  };
}

export function criarGerenciadorSessao({ banco, configuracao = {} }) {
  const sessaoDias = configuracao.sessaoDias ?? 30;
  const emProducao = Boolean(configuracao.emProducao);
  const maxAgeMs = sessaoDias * UM_DIA_MS;

  const buscarSessaoValida = banco.prepare(`
    SELECT s.id AS sessao_id, s.ultimo_uso_em,
           u.id AS usuario_id, u.nome, u.email, u.plano, u.papel, u.idioma, u.tema,
           u.criado_em, u.situacao
    FROM sessoes s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ? AND s.expira_em > ?
  `);
  const inserirSessao = banco.prepare(`
    INSERT INTO sessoes (usuario_id, token_hash, expira_em, ip, agente)
    VALUES (?, ?, ?, ?, ?)
  `);
  const renovarUltimoUso = banco.prepare('UPDATE sessoes SET ultimo_uso_em = ? WHERE id = ?');
  const apagarPorHash = banco.prepare('DELETE FROM sessoes WHERE token_hash = ?');
  const apagarTodasDoUsuario = banco.prepare('DELETE FROM sessoes WHERE usuario_id = ?');
  const apagarTodasExceto = banco.prepare('DELETE FROM sessoes WHERE usuario_id = ? AND id != ?');

  function middleware(req, res, next) {
    req.usuario = null;
    req.sessaoId = null;

    const token = req.cookies?.[NOME_COOKIE];
    if (!token) return next();

    const linha = buscarSessaoValida.get(hashToken(token), new Date().toISOString());
    if (!linha || linha.situacao === 'suspenso') return next();

    req.usuario = paraUsuarioPublico(linha);
    req.sessaoId = linha.sessao_id;

    const ultimoUsoMs = Date.parse(linha.ultimo_uso_em);
    if (Number.isNaN(ultimoUsoMs) || Date.now() - ultimoUsoMs >= RENOVACAO_MINIMA_MS) {
      renovarUltimoUso.run(new Date().toISOString(), linha.sessao_id);
    }
    next();
  }

  function criarSessao(req, res, usuarioId) {
    const token = randomBytes(32).toString('base64url');
    const expiraEm = new Date(Date.now() + maxAgeMs).toISOString();
    inserirSessao.run(usuarioId, hashToken(token), expiraEm, req?.ip ?? null, req?.get?.('user-agent') ?? null);
    res.cookie(NOME_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: emProducao,
      path: '/',
      maxAge: maxAgeMs,
    });
    return token;
  }

  function encerrarSessao(req, res) {
    const token = req.cookies?.[NOME_COOKIE];
    if (token) apagarPorHash.run(hashToken(token));
    res.clearCookie(NOME_COOKIE, { path: '/' });
    req.usuario = null;
    req.sessaoId = null;
  }

  function encerrarTodas(usuarioId, { excetoAtual } = {}) {
    if (excetoAtual?.sessaoId != null) {
      apagarTodasExceto.run(usuarioId, excetoAtual.sessaoId);
    } else {
      apagarTodasDoUsuario.run(usuarioId);
    }
  }

  function exigirSessao(req, res, next) {
    if (!req.usuario) return next(criarErro(401, 'sessao_necessaria'));
    next();
  }

  function exigirAdmin(req, res, next) {
    if (!req.usuario) return next(criarErro(401, 'sessao_necessaria'));
    if (req.usuario.papel !== 'admin') return next(criarErro(403, 'acesso_negado'));
    next();
  }

  function exigirPlano(plano) {
    return function verificarPlano(req, res, next) {
      if (!req.usuario) return next(criarErro(401, 'sessao_necessaria'));
      if (req.usuario.plano !== plano) {
        return next(criarErro(403, 'plano_insuficiente', { plano_necessario: plano }));
      }
      next();
    };
  }

  return {
    middleware,
    criarSessao,
    encerrarSessao,
    encerrarTodas,
    exigirSessao,
    exigirAdmin,
    exigirPlano,
  };
}

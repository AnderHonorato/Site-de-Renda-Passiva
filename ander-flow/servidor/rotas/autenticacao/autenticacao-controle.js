// autenticacao-controle.js — regras de negócio de autenticação sobre o banco (docs/contratos.md
// §7, §9.4, §11 "Autenticação"). Sem Express: recebe `banco` e valores já validados.
import { createHash, randomBytes } from 'node:crypto';
import { gerarHashSenha, verificarSenha } from '../../seguranca/seguranca-senha.js';

const UMA_HORA_MS = 60 * 60 * 1000;

// Hash de formato válido, nunca correspondente a nenhuma senha real: usado quando o e-mail não
// existe, para que `entrar` gaste o mesmo tempo verificando senha exista ou não a conta (evita
// que o tempo de resposta revele se o e-mail está cadastrado).
const hashFicticioPromise = gerarHashSenha('senha-de-preenchimento-para-tempo-constante-0000');

function hashToken(token) {
  return createHash('sha256').update(token).digest('base64');
}

/** Usuário público (docs/contratos.md §10.2) — nunca inclui `senha_hash`. */
export function paraUsuarioPublico(linha) {
  if (!linha) return null;
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    plano: linha.plano,
    papel: linha.papel,
    idioma: linha.idioma,
    tema: linha.tema,
    criado_em: linha.criado_em,
  };
}

export function buscarUsuarioPorEmail(banco, email) {
  return banco.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) ?? null;
}

export function buscarUsuarioPorId(banco, id) {
  return banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) ?? null;
}

/** Cria a conta e devolve o usuário (linha completa, incl. `senha_hash`) — chamador decide o que expor. */
export async function criarConta({ banco, nome, email, senha, agora = () => new Date() }) {
  const senhaHash = await gerarHashSenha(senha);
  const agoraIso = agora().toISOString();
  const resultado = banco
    .prepare(
      `INSERT INTO usuarios (email, nome, senha_hash, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(email, nome, senhaHash, agoraIso, agoraIso);
  return buscarUsuarioPorId(banco, resultado.lastInsertRowid);
}

/**
 * Confere e-mail e senha em tempo constante em relação à existência do e-mail: quando não há
 * usuário com esse e-mail, ainda assim verifica a senha contra um hash fictício.
 * Devolve `{ ok: true, usuario }`, `{ ok: false }` (credenciais inválidas) ou
 * `{ ok: false, suspenso: true }` (conta existe, senha certa, mas está suspensa).
 */
export async function autenticar({ banco, email, senha }) {
  const usuario = buscarUsuarioPorEmail(banco, email);
  const hashParaConferir = usuario ? usuario.senha_hash : await hashFicticioPromise;
  const senhaCorreta = await verificarSenha(senha, hashParaConferir);

  if (!usuario || !senhaCorreta) return { ok: false };
  if (usuario.situacao === 'suspenso') return { ok: false, suspenso: true };
  return { ok: true, usuario };
}

/** Token de recuperação de senha (1 h, uso único): só o hash é gravado no banco. */
export function criarTokenRecuperacao({ banco, usuarioId, agora = () => new Date() }) {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(agora().getTime() + UMA_HORA_MS).toISOString();
  banco
    .prepare('INSERT INTO recuperacoes_senha (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)')
    .run(usuarioId, hashToken(token), expiraEm);
  return { token, expiraEm };
}

/**
 * Aplica a nova senha se o token existir, não tiver sido usado e não estiver expirado.
 * Marca o token como usado na mesma operação (uso único).
 */
export async function redefinirSenhaComToken({ banco, token, senhaNova, agora = () => new Date() }) {
  const linha = banco
    .prepare('SELECT id, usuario_id, expira_em, usado_em FROM recuperacoes_senha WHERE token_hash = ?')
    .get(hashToken(token));

  const agoraIso = agora().toISOString();
  if (!linha || linha.usado_em || Date.parse(linha.expira_em) <= Date.parse(agoraIso)) {
    return { ok: false };
  }

  const senhaHash = await gerarHashSenha(senhaNova);
  banco.prepare('UPDATE usuarios SET senha_hash = ?, atualizado_em = ? WHERE id = ?').run(senhaHash, agoraIso, linha.usuario_id);
  banco.prepare('UPDATE recuperacoes_senha SET usado_em = ? WHERE id = ?').run(agoraIso, linha.id);

  return { ok: true, usuarioId: linha.usuario_id };
}

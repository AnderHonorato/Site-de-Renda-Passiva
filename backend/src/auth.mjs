import crypto from "node:crypto";
import { prisma } from "./db.mjs";

export async function criarSessao(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 1000*60*60*24*30) } });
  return token;
}

export async function usuarioDaRequisicao(req) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sessao = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!sessao || sessao.expiresAt < new Date()) return null;
  return sessao.user;
}
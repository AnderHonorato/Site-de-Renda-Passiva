import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ambiente = { ...process.env, NODE_ENV: 'development', PORTAL_CHAT_LOCAL: process.env.PORTAL_CHAT_LOCAL || '1' };
const api = spawn(process.execPath, ['servidor/iniciar.mjs'], { cwd: raiz, env: ambiente, stdio: 'inherit', windowsHide: true });
const site = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', '4400'], { cwd: raiz, env: ambiente, stdio: 'inherit', windowsHide: true });
let encerrando = false;
function encerrar(codigo = 0) {
  if (encerrando) return; encerrando = true;
  api.kill(); site.kill(); process.exitCode = codigo;
}
for (const filho of [api, site]) {
  filho.on('error', erro => { process.stderr.write(`${erro.message}\n`); encerrar(1); });
  filho.on('exit', codigo => encerrar(codigo || 0));
}
process.on('SIGINT', () => encerrar());
process.on('SIGTERM', () => encerrar());

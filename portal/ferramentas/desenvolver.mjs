import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentos = process.argv.slice(2);
const indicePorta = argumentos.indexOf('--porta');
const porta = indicePorta < 0 ? 4400 : Number(argumentos[indicePorta + 1]);
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error('Porta inválida: use um número entre 1024 e 65535.');
const ambiente = { ...process.env, NODE_ENV: 'development', PORTAL_CHAT_LOCAL: process.env.PORTAL_CHAT_LOCAL || '1' };
const api = spawn(process.execPath, [resolve(raiz, 'servidor/iniciar.mjs')], { cwd: raiz, env: ambiente, stdio: 'inherit', windowsHide: true });
const site = spawn(process.execPath, [resolve(raiz, 'ferramentas/servir.mjs'), raiz, '--porta', String(porta)], { cwd: raiz, env: ambiente, stdio: 'inherit', windowsHide: true });
process.send?.({ tipo: 'processos-portal', apiPid: api.pid, sitePid: site.pid });
let encerrando = false;
function encerrar(codigo = 0) {
  if (encerrando) return; encerrando = true;
  api.kill(); site.kill(); process.exitCode = codigo;
  if (process.connected) process.disconnect();
}
for (const filho of [api, site]) {
  filho.on('error', erro => { process.stderr.write(`${erro.message}\n`); encerrar(1); });
  filho.on('exit', codigo => encerrar(codigo || 0));
}
process.on('SIGINT', () => encerrar());
process.on('SIGTERM', () => encerrar());
process.on('message', mensagem => { if (mensagem?.tipo === 'encerrar') encerrar(); });
process.on('disconnect', () => encerrar());

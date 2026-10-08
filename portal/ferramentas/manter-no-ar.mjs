/**
 * Mantém site e API do portal no ar: se um deles cair, reinicia o conjunto em 1 segundo.
 * Serve para ver as mudanças em tempo real no celular enquanto se trabalha (a cada requisição o
 * servidor lê os arquivos do disco, então não precisa reiniciar para ver uma edição).
 *
 * Uso (dentro de portal/):  npm run no-ar            (porta 4400)
 *                           node ferramentas/manter-no-ar.mjs --porta 4400
 * Para parar: encerre este processo (Ctrl+C no terminal, ou Stop-Process no Windows).
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const argumentos = process.argv.slice(2);
const índice = argumentos.indexOf('--porta');
const porta = índice >= 0 ? Number(argumentos[índice + 1]) : 4400;
if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) throw new Error('Porta inválida: use um número entre 1024 e 65535.');

let encerrando = false;
let filho;
let reiniciar;

function subir() {
  filho = spawn(process.execPath, ['--env-file-if-exists=.env', join(RAIZ, 'ferramentas', 'desenvolver.mjs'), '--porta', String(porta)], { cwd: RAIZ, stdio: ['inherit','inherit','inherit','ipc'], windowsHide: true });
  filho.on('message', mensagem => { if (mensagem?.tipo === 'processos-portal') process.send?.(mensagem); });
  filho.on('error', erro => { process.stderr.write(`${erro.message}\n`); });
  filho.on('close', (código, sinal) => {
    if (encerrando) { process.exit(0); return; }
    console.error(`[no-ar] o servidor saiu (${sinal ?? código}); subindo de novo em 1 s…`);
    reiniciar = setTimeout(subir, 1000);
  });
}

function encerrar() {
  if (encerrando) return; encerrando = true; clearTimeout(reiniciar);
  if (filho?.connected) filho.send({ tipo: 'encerrar' });
  else { filho?.kill(); process.exit(0); }
}
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, encerrar);
process.on('message', mensagem => { if (mensagem?.tipo === 'encerrar') encerrar(); });
process.on('disconnect', encerrar);

subir();

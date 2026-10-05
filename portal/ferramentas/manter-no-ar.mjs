/**
 * Mantém o servidor do portal no ar: se ele cair por qualquer motivo, sobe de novo em 1 segundo.
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
const porta = índice >= 0 ? argumentos[índice + 1] : '4400';

let encerrando = false;
let filho;

function subir() {
  filho = spawn(process.execPath, [join(RAIZ, 'ferramentas', 'servir.mjs'), RAIZ, '--porta', porta], { stdio: 'inherit' });
  filho.on('exit', (código, sinal) => {
    if (encerrando) return;
    console.error(`[no-ar] o servidor saiu (${sinal ?? código}); subindo de novo em 1 s…`);
    setTimeout(subir, 1000);
  });
}

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => { encerrando = true; filho?.kill(); process.exit(0); });
}

subir();

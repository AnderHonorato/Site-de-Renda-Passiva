// scripts-parar.js — para o servidor deste projeto, sem nunca matar por porta.
// Uso: node scripts/scripts-parar.js
// Ver docs/contratos.md §8.5.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pastaExecucao = join(raizProjeto, '.execucao');
const caminhoEstado = join(pastaExecucao, 'servidor.json');

function aguardar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function aguardarDesaparecer(caminho, tempoLimiteMs, intervaloMs = 100) {
  const inicio = Date.now();
  while (Date.now() - inicio < tempoLimiteMs) {
    if (!existsSync(caminho)) return true;
    await aguardar(intervaloMs);
  }
  return !existsSync(caminho);
}

/** Confere, sem depender da porta, se o PID ainda é o processo deste projeto. */
export function comandoContemProjeto(pid, raiz) {
  try {
    if (process.platform === 'win32') {
      const saida = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
        ],
        { encoding: 'utf8' },
      );
      return saida.includes(raiz);
    }
    const saida = execFileSync('ps', ['-o', 'args=', '-p', String(pid)], { encoding: 'utf8' });
    return saida.includes(raiz);
  } catch {
    return false;
  }
}

function encerrarPid(pid) {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F']);
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // Processo já pode ter saído — segue com a limpeza.
  }
}

function limparArquivosDeEstado() {
  for (const nome of ['servidor.json', 'servidor.pid', 'servidor.porta']) {
    const caminho = join(pastaExecucao, nome);
    try {
      if (existsSync(caminho)) rmSync(caminho);
    } catch {
      // limpeza best-effort.
    }
  }
}

export async function parar() {
  if (!existsSync(caminhoEstado)) {
    console.log('Nenhum servidor em execução (.execucao/servidor.json não existe).');
    return { encontrado: false, forcado: false };
  }

  const estado = JSON.parse(readFileSync(caminhoEstado, 'utf8'));

  try {
    await fetch(`http://127.0.0.1:${estado.porta}/__controle/desligar`, {
      method: 'POST',
      headers: { 'X-Token-Controle': estado.token },
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Sem resposta — pode já estar caído; a verificação de PID abaixo decide.
  }

  const desceuLimpo = await aguardarDesaparecer(caminhoEstado, 5000);
  if (desceuLimpo) {
    console.log('Servidor desligado.');
    return { encontrado: true, forcado: false };
  }

  const pidFilho = estado.pidFilho;
  const raizDoEstado = estado.projeto ?? raizProjeto;
  if (pidFilho && comandoContemProjeto(pidFilho, raizDoEstado)) {
    encerrarPid(pidFilho);
  }
  await aguardar(500);
  limparArquivosDeEstado();
  console.log('Servidor encerrado (desligamento forçado).');
  return { encontrado: true, forcado: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  parar().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
  });
}

// scripts-parar.js — para o servidor deste projeto, sem nunca matar por porta.
// Uso: node scripts/scripts-parar.js
// Ver docs/contratos.md §8.5.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// AF_PASTA_EXECUCAO existe só para os testes rodarem numa pasta temporária sem apagar o estado de
// um servidor de verdade que esteja ligado. Lida na hora do uso, não no carregamento do módulo.
function obterPastaExecucao() {
  return process.env.AF_PASTA_EXECUCAO || join(raizProjeto, '.execucao');
}

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

/** true se existe um processo com esse PID (sinal 0 só consulta; funciona no Windows também). */
export function processoVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (erro) {
    return erro.code === 'EPERM';
  }
}

function encerrarPid(pid, sinal = 'SIGTERM') {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, sinal);
    }
  } catch {
    // Processo já pode ter saído — quem decide é a conferência depois.
  }
}

async function aguardarMorte(pid, tempoLimiteMs, intervaloMs = 100) {
  const inicio = Date.now();
  while (Date.now() - inicio < tempoLimiteMs) {
    if (!processoVivo(pid)) return true;
    await aguardar(intervaloMs);
  }
  return !processoVivo(pid);
}

function limparArquivosDeEstado() {
  for (const nome of ['servidor.json', 'servidor.pid', 'servidor.porta']) {
    const caminho = join(obterPastaExecucao(), nome);
    try {
      if (existsSync(caminho)) rmSync(caminho);
    } catch {
      // limpeza best-effort.
    }
  }
}

export async function parar() {
  const caminhoEstado = join(obterPastaExecucao(), 'servidor.json');
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

  // A rota de controle não respondeu a tempo. Só encerra à força o processo que este projeto
  // disparou, e só declara sucesso depois de conferir que ele morreu: um estado apagado com o
  // servidor ainda de pé deixaria um órfão que nenhum `parar` alcança mais.
  const pidFilho = estado.pidFilho;
  const raizDoEstado = estado.projeto ?? raizProjeto;

  if (!pidFilho || !processoVivo(pidFilho)) {
    limparArquivosDeEstado();
    console.log('O servidor já não estava rodando; arquivos de .execucao/ antigos removidos.');
    return { encontrado: true, forcado: false };
  }

  if (!comandoContemProjeto(pidFilho, raizDoEstado)) {
    console.error(
      `Nada foi encerrado: o PID ${pidFilho} não é mais um processo deste projeto. ` +
        `Confira a porta ${estado.porta}; os arquivos de .execucao/ foram mantidos.`,
    );
    return { encontrado: true, forcado: false, falhou: true };
  }

  encerrarPid(pidFilho);
  if (!(await aguardarMorte(pidFilho, 3000)) && process.platform !== 'win32') {
    encerrarPid(pidFilho, 'SIGKILL');
    await aguardarMorte(pidFilho, 2000);
  }

  if (processoVivo(pidFilho)) {
    console.error(
      `Não consegui encerrar o servidor (PID ${pidFilho}, porta ${estado.porta}). ` +
        'Os arquivos de .execucao/ foram mantidos para uma nova tentativa.',
    );
    return { encontrado: true, forcado: true, falhou: true };
  }

  limparArquivosDeEstado();
  console.log('Servidor encerrado (desligamento forçado).');
  return { encontrado: true, forcado: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  parar()
    .then((resultado) => {
      if (resultado.falhou) process.exitCode = 1;
    })
    .catch((erro) => {
      console.error(erro.message);
      process.exit(1);
    });
}

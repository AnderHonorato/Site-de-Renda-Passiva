// scripts-iniciar.js — supervisor que sobe o servidor num processo filho e grava o estado de execução.
// Uso: node scripts/scripts-iniciar.js [--desenvolver] [--script <arquivo>]
// Ver docs/contratos.md §8.5.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parar } from './scripts-parar.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// AF_PASTA_EXECUCAO existe só para os testes rodarem numa pasta temporária sem apagar o estado de
// um servidor de verdade que esteja ligado. Lida na hora do uso, não no carregamento do módulo.
function obterPastaExecucao() {
  return process.env.AF_PASTA_EXECUCAO || join(raizProjeto, '.execucao');
}

function caminhoExecucao(nome) {
  return join(obterPastaExecucao(), nome);
}

async function esperarArquivoPorta(tempoLimiteMs = 15000, intervaloMs = 50) {
  const caminho = caminhoExecucao('servidor.porta');
  const inicio = Date.now();
  while (Date.now() - inicio < tempoLimiteMs) {
    if (existsSync(caminho)) {
      const conteudo = readFileSync(caminho, 'utf8').trim();
      const porta = Number(conteudo);
      if (Number.isInteger(porta) && porta > 0) return porta;
    }
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  throw new Error('O servidor não escreveu .execucao/servidor.porta a tempo.');
}

/**
 * Sobe `script` (padrão servidor/servidor.js) num processo filho e grava o estado de execução.
 * Não chama `process.exit` — quem roda isto como CLI (guarda no fim do arquivo) decide o
 * código de saída; assim a função também serve para os testes de integração.
 *
 * @param {{ desenvolver?: boolean, script?: string }} opcoes
 * @returns {Promise<{ pid: number, pidFilho: number, porta: number, token: string, filho: import('node:child_process').ChildProcess, aoEncerrar: Promise<number> }>}
 */
export async function iniciar({ desenvolver = false, script = join('servidor', 'servidor.js') } = {}) {
  mkdirSync(obterPastaExecucao(), { recursive: true });

  const token = randomBytes(32).toString('base64url');
  const caminhoServidorPorta = caminhoExecucao('servidor.porta');
  if (existsSync(caminhoServidorPorta)) rmSync(caminhoServidorPorta);

  // Caminho absoluto de propósito: é por ele que `npm run parar` reconhece, na linha de comando,
  // que o processo é deste projeto antes de encerrá-lo à força (comandoContemProjeto).
  const scriptAbsoluto = resolve(raizProjeto, script);
  const argumentosNode = desenvolver ? ['--watch', scriptAbsoluto] : [scriptAbsoluto];
  const filho = spawn(process.execPath, argumentosNode, {
    cwd: raizProjeto,
    stdio: 'inherit',
    env: {
      ...process.env,
      TOKEN_CONTROLE: token,
      // Avisa servidor.js que, sob `--watch`, o processo real do servidor é filho de um
      // supervisor de watch que não cai sozinho — ele precisa avisar esse pai ao desligar
      // de forma limpa (ver avisarSupervisorDeWatch() em servidor/servidor.js, T1).
      ...(desenvolver ? { AF_SOB_NODE_WATCH: '1' } : {}),
    },
  });

  let encerrandoPeloSupervisor = false;

  const limpar = () => {
    for (const nome of ['servidor.pid', 'servidor.json']) {
      const caminho = caminhoExecucao(nome);
      try {
        if (existsSync(caminho)) rmSync(caminho);
      } catch {
        // limpeza best-effort.
      }
    }
  };

  // Ctrl+C (ou outro SIGINT/SIGTERM recebido pelo supervisor): pede o mesmo desligamento limpo
  // que `npm run parar` usa (rota de controle com token; só recorre a matar o processo — nunca
  // por porta — se a rota não responder a tempo). Reaproveita parar() em vez de duplicar essa
  // lógica (T1).
  const encerrarFilho = async (sinal) => {
    if (encerrandoPeloSupervisor) return;
    encerrandoPeloSupervisor = true;

    await parar().catch(() => {
      // parar() não deveria lançar, mas se lançar seguimos para a rede de segurança abaixo.
    });

    // Rede de segurança: se por algum motivo o filho ainda estiver vivo (ex.: o supervisor
    // recebeu o sinal antes de .execucao/servidor.json existir), força por PID mesmo assim.
    if (filho.exitCode === null && filho.signalCode === null && !filho.killed) {
      limpar();
      filho.kill(sinal);
    }
  };

  const aoEncerrar = new Promise((resolver) => {
    filho.on('exit', (codigo) => {
      if (!encerrandoPeloSupervisor) limpar();
      resolver(codigo ?? 0);
    });
    filho.on('error', (erro) => {
      console.error('Falha ao iniciar o servidor:', erro.message);
      limpar();
      resolver(1);
    });
  });

  const controladorSinal = {
    SIGINT: () => encerrarFilho('SIGINT'),
    SIGTERM: () => encerrarFilho('SIGTERM'),
  };
  process.on('SIGINT', controladorSinal.SIGINT);
  process.on('SIGTERM', controladorSinal.SIGTERM);
  // Remove os ouvintes quando o filho já encerrou, para não acumular em uso programático (testes).
  aoEncerrar.then(() => {
    process.removeListener('SIGINT', controladorSinal.SIGINT);
    process.removeListener('SIGTERM', controladorSinal.SIGTERM);
  });

  const porta = await esperarArquivoPorta();

  writeFileSync(caminhoExecucao('servidor.pid'), String(process.pid));
  writeFileSync(
    caminhoExecucao('servidor.json'),
    JSON.stringify(
      {
        pid: process.pid,
        pidFilho: filho.pid,
        porta,
        projeto: raizProjeto,
        token,
        iniciado_em: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return { pid: process.pid, pidFilho: filho.pid, porta, token, filho, aoEncerrar };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argumentos = process.argv.slice(2);
  const desenvolver = argumentos.includes('--desenvolver');
  const indiceScript = argumentos.indexOf('--script');
  const script = indiceScript >= 0 ? argumentos[indiceScript + 1] : undefined;

  iniciar({ desenvolver, script })
    .then(({ aoEncerrar }) => aoEncerrar)
    .then((codigo) => process.exit(codigo))
    .catch((erro) => {
      console.error(erro.message);
      process.exit(1);
    });
}

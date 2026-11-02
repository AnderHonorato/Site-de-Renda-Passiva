import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function portaLivre() {
  const servidor = createServer();
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  const porta = servidor.address().port;
  await new Promise(resolve => servidor.close(resolve));
  return porta;
}

async function aguardar(condição, mensagem, limite = 20_000) {
  const fim = Date.now() + limite;
  do {
    try { if (await condição()) return; } catch {}
    await esperar(100);
  } while (Date.now() < fim);
  assert.fail(mensagem);
}

async function responde(porta, caminho = '/') {
  try { return (await fetch(`http://127.0.0.1:${porta}${caminho}`, { signal: AbortSignal.timeout(700) })).ok; }
  catch { return false; }
}

test('no-ar recupera API e site juntos e encerra seus processos', { timeout: 60_000 }, async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'portal-recuperacao-'));
  const portaSite = await portaLivre(), portaApi = await portaLivre();
  let geração, erros = '';
  const processo = spawn(process.execPath, ['ferramentas/manter-no-ar.mjs', '--porta', String(portaSite)], {
    cwd: raiz, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: { ...process.env, PORTAL_BANCO: join(pasta, 'teste.sqlite'), PORTAL_API_PORTA: String(portaApi) },
  });
  processo.stderr.on('data', dados => { erros = (erros + dados).slice(-4000); });
  processo.on('message', mensagem => { if (mensagem.tipo === 'processos-portal') geração = mensagem; });
  const pronto = () => responde(portaSite).then(async site => site && await responde(portaSite, '/api/autenticacao/sessao'));
  try {
    await aguardar(() => geração && pronto(), `portal inicial indisponível: ${erros}`);
    const anterior = geração;
    // Somente o PID que este teste recebeu do seu próprio processo filho.
    process.kill(anterior.apiPid);
    await aguardar(() => geração.apiPid !== anterior.apiPid && geração.sitePid !== anterior.sitePid && pronto(), `não recuperou após queda da API: ${erros}`);
    const segunda = geração;
    process.kill(segunda.sitePid);
    await aguardar(() => geração.apiPid !== segunda.apiPid && geração.sitePid !== segunda.sitePid && pronto(), `não recuperou após queda do site: ${erros}`);
    processo.send({ tipo: 'encerrar' });
    await aguardar(() => processo.exitCode !== null, 'supervisor não encerrou');
    await aguardar(async () => !await responde(portaSite) && !await responde(portaApi, '/api/autenticacao/sessao'), 'filhos ficaram no ar após encerrar');
    assert.equal(processo.exitCode, 0);
  } finally {
    if (processo.exitCode === null && processo.connected) processo.send({ tipo: 'encerrar' });
    await aguardar(() => processo.exitCode !== null, 'limpeza do processo de teste falhou');
    // A pasta foi criada pelo próprio teste e fica exclusivamente dentro do temporário.
    assert.ok(resolve(pasta).startsWith(resolve(tmpdir()) + sep));
    await rm(pasta, { recursive: true, force: true });
  }
});

test('no-ar rejeita porta inválida sem entrar em ciclo de reinício', async () => {
  const processo = spawn(process.execPath, ['ferramentas/manter-no-ar.mjs', '--porta', 'inválida'], { cwd: raiz, stdio: 'ignore', windowsHide: true });
  const código = await new Promise(resolve => processo.on('exit', resolve));
  assert.notEqual(código, 0);
});

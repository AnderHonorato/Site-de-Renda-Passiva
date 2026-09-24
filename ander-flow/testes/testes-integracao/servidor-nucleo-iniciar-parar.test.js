// Testa scripts-iniciar.js + scripts-parar.js de ponta a ponta, usando o servidor de mentira
// (fixture desta pasta) no lugar do servidor.js completo — que ainda depende de módulos que
// outros agentes vão escrever em paralelo.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { iniciar } from '../../scripts/scripts-iniciar.js';
import { parar } from '../../scripts/scripts-parar.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const scriptDeMentira = join('testes', 'testes-integracao', 'testes-integracao-servidor-de-mentira.js');
const caminhoEstado = join(raizProjeto, '.execucao', 'servidor.json');
const caminhoPid = join(raizProjeto, '.execucao', 'servidor.pid');
const caminhoPorta = join(raizProjeto, '.execucao', 'servidor.porta');

function subirProcessoIndependente() {
  return new Promise((resolver, rejeitar) => {
    const codigo = `
      const http = require('node:http');
      const servidor = http.createServer((req, res) => res.end('vivo'));
      servidor.listen(0, () => console.log('PRONTO:' + servidor.address().port));
    `;
    const processo = spawn(process.execPath, ['-e', codigo], { stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    processo.stdout.on('data', (dado) => {
      saida += dado.toString();
      const casamento = saida.match(/PRONTO:(\d+)/);
      if (casamento) resolver({ processo, porta: Number(casamento[1]) });
    });
    processo.on('error', rejeitar);
    setTimeout(() => rejeitar(new Error('processo independente não avisou a porta a tempo')), 5000);
  });
}

test('iniciar(): grava servidor.pid e servidor.json com o formato esperado', async () => {
  const resultado = await iniciar({ script: scriptDeMentira });
  try {
    assert.equal(existsSync(caminhoPid), true);
    assert.equal(readFileSync(caminhoPid, 'utf8').trim(), String(process.pid));

    assert.equal(existsSync(caminhoEstado), true);
    const estado = JSON.parse(readFileSync(caminhoEstado, 'utf8'));
    assert.equal(estado.pid, process.pid);
    assert.equal(estado.pidFilho, resultado.pidFilho);
    assert.equal(estado.porta, resultado.porta);
    assert.equal(estado.projeto, raizProjeto);
    assert.equal(typeof estado.token, 'string');
    assert.ok(estado.token.length > 10);
    assert.equal(typeof estado.iniciado_em, 'string');

    const resposta = await fetch(`http://127.0.0.1:${resultado.porta}/oi`);
    assert.equal(await resposta.text(), 'oi');
  } finally {
    await parar();
    await resultado.aoEncerrar;
  }
});

test('parar(): desliga o servidor pela rota de controle e limpa os arquivos de execução', async () => {
  const resultado = await iniciar({ script: scriptDeMentira });

  const respostaAntes = await fetch(`http://127.0.0.1:${resultado.porta}/oi`);
  assert.equal(respostaAntes.status, 200);

  const retorno = await parar();
  assert.equal(retorno.encontrado, true);
  assert.equal(retorno.forcado, false);

  await resultado.aoEncerrar;

  assert.equal(existsSync(caminhoEstado), false);
  assert.equal(existsSync(caminhoPid), false);
  assert.equal(existsSync(caminhoPorta), false);

  await assert.rejects(() => fetch(`http://127.0.0.1:${resultado.porta}/oi`, { signal: AbortSignal.timeout(500) }));
});

test('parar(): sem servidor em execução, não lança e avisa', async () => {
  assert.equal(existsSync(caminhoEstado), false);
  const retorno = await parar();
  assert.deepEqual(retorno, { encontrado: false, forcado: false });
});

test(
  'modo --desenvolver (node --watch): parar() desliga limpo, sem cair no "forçado" (T1)',
  { timeout: 20000 },
  async () => {
    // Usa o servidor.js real (não o de mentira): é o wrapper `node --watch` dele — e só dele —
    // que fica pendurado depois de um process.exit() interno, e é isso que este teste prova
    // que não acontece mais. Porta e banco isolados para não colidir com outra execução real.
    const bancoTemp = join(raizProjeto, '.execucao', 'teste-t1-desenvolver.sqlite');
    for (const sufixo of ['', '-wal', '-shm']) {
      const caminho = bancoTemp + sufixo;
      if (existsSync(caminho)) rmSync(caminho);
    }

    process.env.BANCO_CAMINHO = bancoTemp;
    process.env.PORTA = '4990';
    process.env.PORTA_FINAL = '4999';

    let resultado;
    try {
      resultado = await iniciar({ desenvolver: true, script: join('servidor', 'servidor.js') });

      const respostaAntes = await fetch(`http://127.0.0.1:${resultado.porta}/api/ferramentas`);
      assert.equal(respostaAntes.status, 200);

      const retorno = await parar();
      assert.equal(retorno.encontrado, true);
      assert.equal(retorno.forcado, false, 'deveria desligar limpo, sem cair no caminho de força');

      await resultado.aoEncerrar;

      assert.equal(existsSync(caminhoEstado), false);
      assert.equal(existsSync(caminhoPid), false);
      assert.equal(existsSync(caminhoPorta), false);

      // O processo real (o "node --watch" e o servidor.js dentro dele) não fica pendurado:
      // a porta para de responder.
      await assert.rejects(() =>
        fetch(`http://127.0.0.1:${resultado.porta}/api/ferramentas`, { signal: AbortSignal.timeout(500) }),
      );
    } finally {
      delete process.env.BANCO_CAMINHO;
      delete process.env.PORTA;
      delete process.env.PORTA_FINAL;
      for (const sufixo of ['', '-wal', '-shm']) {
        const caminho = bancoTemp + sufixo;
        if (existsSync(caminho)) rmSync(caminho);
      }
    }
  },
);

test('parar(): derruba só o processo gerenciado — outro node escutando continua vivo', async () => {
  const independente = await subirProcessoIndependente();
  const gerenciado = await iniciar({ script: scriptDeMentira });

  try {
    const retorno = await parar();
    assert.equal(retorno.encontrado, true);
    await gerenciado.aoEncerrar;

    // O gerenciado caiu.
    await assert.rejects(() =>
      fetch(`http://127.0.0.1:${gerenciado.porta}/oi`, { signal: AbortSignal.timeout(500) }),
    );

    // O processo independente (outro "node" escutando) continua vivo.
    const respostaIndependente = await fetch(`http://127.0.0.1:${independente.porta}/`);
    assert.equal(await respostaIndependente.text(), 'vivo');
  } finally {
    independente.processo.kill();
  }
});

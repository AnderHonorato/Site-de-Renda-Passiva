// testes-integracao-servidor-de-mentira.js — servidor mínimo usado por
// servidor-nucleo-iniciar-parar.test.js para testar scripts-iniciar.js/scripts-parar.js sem
// depender do servidor.js completo (que ainda tem módulos de outros agentes em falta).
// Reaproveita o servidor-controle.js real: é exatamente essa rota que estamos testando.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { registrarControle } from '../../servidor/servidor-controle.js';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pastaExecucao = process.env.AF_PASTA_EXECUCAO || join(raizProjeto, '.execucao');
const caminhoPorta = join(pastaExecucao, 'servidor.porta');

mkdirSync(pastaExecucao, { recursive: true });

const app = express();
app.get('/oi', (req, res) => res.status(200).send('oi'));

const servidorHttp = http.createServer(app);

function limparArquivoPorta() {
  try {
    if (existsSync(caminhoPorta)) rmSync(caminhoPorta);
  } catch {
    // limpeza best-effort.
  }
}

// Com AF_MENTIRA_IGNORA_DESLIGAR=1 o servidor finge estar travado: ignora a rota de controle e o
// SIGTERM, para o teste exercitar o caminho de força de scripts-parar.js.
const ignoraDesligar = process.env.AF_MENTIRA_IGNORA_DESLIGAR === '1';

function desligar() {
  if (ignoraDesligar) return;
  servidorHttp.close(() => {
    limparArquivoPorta();
    process.exit(0);
  });
}

registrarControle(app, {
  token: process.env.TOKEN_CONTROLE ?? 'sem-token',
  desligar,
});

process.on('SIGINT', desligar);
process.on('SIGTERM', desligar);

servidorHttp.listen(0, () => {
  const { port } = servidorHttp.address();
  writeFileSync(caminhoPorta, String(port));
  console.log(`servidor de mentira rodando em http://localhost:${port}`);
});

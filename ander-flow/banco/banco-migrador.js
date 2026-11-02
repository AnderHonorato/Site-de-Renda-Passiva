// banco/banco-migrador.js — aplica em ordem as migrações ainda não registradas (contratos.md §7).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { obterBanco, fecharBanco } from './banco.js';

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pastaMigracoesPadrao = path.join(raizProjeto, 'banco', 'migracoes');

function garantirTabelaControle(banco) {
  banco.exec(`
    CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
      nome        TEXT PRIMARY KEY,
      aplicada_em TEXT NOT NULL
    )
  `);
}

function listarArquivosMigracao(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((nome) => nome.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

/**
 * Aplica, em ordem numérica e cada um em sua própria transação, os arquivos
 * .sql de `pastaMigracoes` ainda não registrados em `migracoes_aplicadas`.
 * Idempotente: rodar de novo não reaplica o que já foi aplicado.
 * Retorna a lista (nomes de arquivo) do que foi aplicado nesta chamada.
 */
export function migrar(banco, { pastaMigracoes = pastaMigracoesPadrao } = {}) {
  garantirTabelaControle(banco);

  const aplicadasExistentes = new Set(
    banco.prepare('SELECT nome FROM migracoes_aplicadas').all().map((linha) => linha.nome)
  );

  const arquivos = listarArquivosMigracao(pastaMigracoes);
  const aplicadasAgora = [];

  for (const nomeArquivo of arquivos) {
    if (aplicadasExistentes.has(nomeArquivo)) continue;

    const caminhoArquivo = path.join(pastaMigracoes, nomeArquivo);
    const sql = fs.readFileSync(caminhoArquivo, 'utf8');

    const executar = banco.transaction(() => {
      banco.exec(sql);
      banco
        .prepare('INSERT INTO migracoes_aplicadas (nome, aplicada_em) VALUES (?, ?)')
        .run(nomeArquivo, new Date().toISOString());
    });

    try {
      executar();
    } catch (erro) {
      throw new Error(`Falha ao aplicar a migração "${nomeArquivo}": ${erro.message}`, { cause: erro });
    }

    aplicadasAgora.push(nomeArquivo);
  }

  return aplicadasAgora;
}

const ehExecucaoDireta = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ehExecucaoDireta) {
  const banco = obterBanco();
  try {
    const aplicadas = migrar(banco);
    if (aplicadas.length === 0) {
      console.log('Nenhuma migração pendente.');
    } else {
      console.log('Migrações aplicadas:');
      for (const nome of aplicadas) console.log(`  - ${nome}`);
    }
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  } finally {
    fecharBanco();
  }
}

import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { limitesPdf, validarOpcoesPdf } from './central-pdf-motor.mjs';

const base = '/api/central-pdf/trabalhos';
const retencao = 15 * 60_000;
const prefixo = 'portal-central-pdf-';
const portal = fileURLToPath(new URL('..', import.meta.url)).replace(/[/\\]$/, '');
const falha = (status, mensagem) => Object.assign(new Error(mensagem), { status, publica: true });

async function pastaPrivada() {
  const raiz = await realpath(tmpdir());
  if (raiz === portal || raiz.startsWith(portal + sep)) throw new Error('Diretório temporário inválido.');
  return raiz;
}

async function limparOrfaos(protegidas = new Set()) {
  const raiz = await pastaPrivada();
  for (const entrada of await readdir(raiz, { withFileTypes: true })) {
    if (!entrada.isDirectory() || !/^portal-central-pdf-[a-zA-Z0-9]{6}$/.test(entrada.name)) continue;
    const pasta = join(raiz, entrada.name);
    if (protegidas.has(pasta)) continue;
    const info = await lstat(pasta).catch(e => { if (e.code !== 'ENOENT') throw e; });
    if (!info) continue;
    if (info.uid === process.getuid?.() && info.mtimeMs < Date.now() - retencao) {
      await rm(pasta, { recursive: true, force: true });
    }
  }
}

function entradasValidas(itens) {
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > limitesPdf.arquivos) {
    throw falha(400, 'Selecione de um a seis PDFs.');
  }
  let total = 0;
  return itens.map(item => {
    const nome = item?.nome;
    if (typeof nome !== 'string' || !nome.trim() || nome.length > 180 || /[\u0000-\u001f\u007f/\\]/u.test(nome)) {
      throw falha(400, 'Um dos nomes de arquivo é inválido.');
    }
    const tamanho = item.tamanho;
    if (!Number.isSafeInteger(tamanho) || tamanho < 5 || tamanho > limitesPdf.arquivo || (total += tamanho) > limitesPdf.lote) {
      throw falha(413, 'Use até 10 MB por PDF e 40 MB no lote.');
    }
    return { nome, tamanho, pronto: false, enviando: false };
  });
}

function publico(j) {
  return {
    id: j.id, estado: j.estado, etapa: j.etapa, progresso: j.progresso,
    expiraEm: j.expiraEm, mensagem: j.mensagem, relatorio: j.relatorio,
    entradas: j.entradas.map(({ nome, tamanho, pronto }) => ({ nome, tamanho, pronto })),
    arquivos: j.arquivos.map(({ nome, tamanho, mime }, indice) => ({ indice, nome, tamanho, mime })),
  };
}

export function criarCentralPdf({ premiumAtivo }) {
  const trabalhos = new Map();
  let ocupado = false, encerrado = false, uploads = 0;
  const pronto = limparOrfaos();
  const orfaos = setInterval(() => {
    const ativas = new Set([...trabalhos.values()].map(j => j.pasta));
    limparOrfaos(ativas).catch(() => {});
  }, retencao);
  orfaos.unref();
  pronto.catch(() => {});

  function localizar(dono, id) {
    const j = trabalhos.get(id);
    if (!j || j.dono !== dono || j.expiraEm <= Date.now() || j.excluido) throw falha(404, 'Este lote expirou ou foi excluído.');
    return j;
  }

  function parar(j) {
    if (!j.proc?.pid) return;
    try {
      if (process.platform === 'win32') j.proc.kill('SIGKILL');
      else process.kill(-j.proc.pid, 'SIGKILL');
    } catch (e) { if (e.code !== 'ESRCH') throw e; }
  }
  async function excluir(j) {
    j.excluido = true;
    if (!j.limpeza) j.limpeza = (async () => {
      parar(j);
      await Promise.allSettled([j.preparo, j.execucao, ...j.envios]);
      if (j.pasta) await rm(j.pasta, { recursive: true, force: true });
      trabalhos.delete(j.id);
    })();
    return j.limpeza;
  }
  const limpeza = setInterval(() => {
    for (const j of trabalhos.values()) {
      if (j.expiraEm <= Date.now() || !premiumAtivo(j.dono)) excluir(j).catch(() => {});
    }
  }, 5000);
  limpeza.unref();

  async function criar(dono, dados) {
    const entradas = entradasValidas(dados?.arquivos);
    let opcoes;
    try { opcoes = validarOpcoesPdf(dados.opcoes); }
    catch (e) { throw falha(400, e.message); }
    if (encerrado || trabalhos.size >= 3 || [...trabalhos.values()].filter(j => j.dono === dono).length >= 2) {
      throw falha(429, 'O limite de lotes foi atingido. Exclua um lote anterior ou aguarde alguns minutos.');
    }
    const j = { id: randomUUID(), dono, entradas, opcoes, arquivos: [], envios: new Set(),
      estado: 'recebendo', etapa: 'Aguardando PDFs', progresso: 0, expiraEm: Date.now() + retencao };
    trabalhos.set(j.id, j);
    j.preparo = (async () => {
      await pronto;
      j.pasta = await mkdtemp(join(await pastaPrivada(), prefixo));
      j.saidas = join(j.pasta, 'saidas');
      await mkdir(j.saidas, { mode: 0o700 });
    })();
    try { await j.preparo; localizar(dono, j.id); return j; }
    catch (e) { await excluir(j); throw e; }
  }

  function enviar(j, indice, req, revalidar, corpoBinario) {
    const entrada = j.entradas[indice];
    if (!entrada || j.estado !== 'recebendo' || entrada.enviando) throw falha(409, 'Este PDF não está disponível para envio.');
    if (uploads >= 2) throw falha(429, 'Há outros PDFs em envio. Aguarde alguns segundos.');
    const tipo = req.headers['content-type']?.split(';')[0];
    if (!['application/pdf','application/octet-stream'].includes(tipo)) throw falha(415, 'Envie um arquivo PDF.');
    if (req.headers['content-length'] !== undefined && Number(req.headers['content-length']) !== entrada.tamanho) throw falha(400, 'O tamanho do arquivo mudou.');
    entrada.enviando = true;
    uploads++;
    const envio = (async () => {
      const bytes = await corpoBinario(req, entrada.tamanho);
      revalidar();
      localizar(j.dono, j.id);
      if (bytes.length !== entrada.tamanho || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw falha(400, 'O arquivo enviado não foi reconhecido como PDF.');
      if (entrada.pronto) throw falha(409, 'Este PDF já foi enviado.');
      entrada.caminho = join(j.pasta, 'entrada-' + indice + '.pdf');
      await writeFile(entrada.caminho, bytes, { mode: 0o600 });
      entrada.pronto = true;
    })().finally(() => { entrada.enviando = false; uploads--; j.envios.delete(envio); });
    j.envios.add(envio);
    return envio;
  }

  function iniciar(j) {
    if (['processando','concluido'].includes(j.estado)) return;
    if (j.estado !== 'recebendo' || j.entradas.some(e => !e.pronto || e.enviando)) throw falha(409, 'Conclua o envio dos PDFs primeiro.');
    if (ocupado) throw falha(429, 'Outro lote está em processamento. Aguarde alguns instantes para iniciar.');
    const proc = fork(new URL('./central-pdf-processo.mjs', import.meta.url), [], {
      env: { PATH: process.env.PATH, TMPDIR: j.saidas, ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot, TEMP: j.saidas } : {}) },
      cwd: j.pasta, detached: process.platform !== 'win32', stdio: ['ignore','ignore','ignore','ipc'], execArgv: ['--max-old-space-size=256'],
    });
    j.proc = proc;
    ocupado = true;
    j.estado = 'processando';
    j.etapa = 'Preparando PDFs';
    j.execucao = (async () => {
      const resultado = await new Promise((aceitar, rejeitar) => {
        let resultado, mensagem;
        const timer = setTimeout(() => { mensagem = 'O lote excedeu o tempo de processamento.'; parar(j); }, 180_000);
        timer.unref();
        proc.on('message', m => {
          if (m.resultado) resultado = m.resultado;
          else if (m.mensagem) mensagem = m.mensagem;
          else if (Number.isFinite(m.percentual) && typeof m.etapa === 'string') {
            j.progresso = Math.max(0, Math.min(99, m.percentual)); j.etapa = m.etapa;
          }
        });
        proc.once('error', () => { mensagem = 'O processador de PDFs está indisponível.'; });
        proc.once('close', codigo => {
          clearTimeout(timer); parar(j);
          if (codigo === 0 && resultado && !mensagem) aceitar(resultado);
          else rejeitar(falha(422, mensagem || 'Não foi possível concluir o lote de PDFs.'));
        });
        proc.send({ arquivos: j.entradas.map(({ nome, caminho }) => ({ nome, caminho })), opcoes: j.opcoes, pastaSaida: j.saidas });
      });
      if (j.excluido || !premiumAtivo(j.dono)) throw falha(403, 'O acesso Premium foi encerrado.');
      for (const a of resultado.arquivos) {
        if (dirname(a.caminho) !== j.saidas || !a.nome || !(await lstat(a.caminho)).isFile()) throw Error('Arquivo inválido');
      }
      j.arquivos = resultado.arquivos;
      j.relatorio = resultado.relatorio;
      j.estado = 'concluido'; j.progresso = 100; j.etapa = 'Lote concluído';
    })().catch(async e => {
      j.estado = 'erro'; j.etapa = 'Processamento interrompido';
      j.mensagem = e.publica ? e.message : 'Não foi possível concluir o lote de PDFs.';
      await rm(j.saidas, { recursive: true, force: true });
    }).finally(async () => {
      try { await Promise.all(j.entradas.map(e => rm(e.caminho, { force: true }))); }
      finally { j.proc = null; ocupado = false; }
    });
    j.execucao.catch(() => {});
  }

  return {
    async tratar(req, res, caminho, { exigir, revalidarPremium, conferirLimite, json, corpo, corpoBinario }) {
      const dono = exigir(req).id;
      const revalidar = () => revalidarPremium(req, dono);
      revalidar();
      try {
        if (caminho === base && req.method === 'POST') {
          conferirLimite('central-pdf:criar:' + dono, 12, 3600000);
          const dados = await corpo(req, 8192);
          revalidar();
          const j = await criar(dono, dados);
          revalidar();
          return json(res, 201, { trabalho: publico(j) });
        }
        const rota = caminho.match(/^\/api\/central-pdf\/trabalhos\/([a-f0-9-]{36})(?:\/(iniciar|entradas|arquivos)(?:\/(\d{1,2}))?)?$/);
        if (!rota) throw falha(404, 'Lote não encontrado.');
        const [,id,acao,indice] = rota;
        const j = localizar(dono, id);
        if (!acao && req.method === 'DELETE') { await excluir(j); return json(res, 200, { ok: true }); }
        if (!acao && req.method === 'GET') return json(res, 200, { trabalho: publico(j) });
        if (acao === 'entradas' && indice !== undefined && req.method === 'PUT') {
          await enviar(j, Number(indice), req, revalidar, corpoBinario);
          return json(res, 200, { trabalho: publico(j) });
        }
        if (acao === 'iniciar' && indice === undefined && req.method === 'POST') {
          iniciar(j);
          return json(res, 202, { trabalho: publico(j) });
        }
        if (acao === 'arquivos' && indice !== undefined && req.method === 'GET') {
          const a = j.arquivos[Number(indice)];
          if (!a || j.estado !== 'concluido') throw falha(404, 'Arquivo indisponível.');
          const nome = encodeURIComponent(basename(a.nome)).replace(/'/g,'%27');
          res.writeHead(200, { 'Content-Type': a.mime, 'Content-Length': a.tamanho, 'Cache-Control': 'private, no-store',
            'Content-Disposition': "attachment; filename*=UTF-8''" + nome, 'X-Content-Type-Options': 'nosniff' });
          await pipeline(createReadStream(a.caminho), res);
          return;
        }
        throw falha(404, 'Recurso não encontrado.');
      } catch (e) {
        if (!e.publica) throw e;
        return json(res, e.status, { erro: e.message, mensagem: e.message });
      }
    },
    async fechar() {
      encerrado = true;
      clearInterval(limpeza);
      clearInterval(orfaos);
      await Promise.allSettled([...trabalhos.values()].map(excluir));
    },
  };
}

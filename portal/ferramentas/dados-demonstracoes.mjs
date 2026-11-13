/**
 * Dados de demonstração exclusivamente para o build público.
 * Os motores privados são executados em workers; só o relatório reduzido é
 * devolvido ao gerador HTML. Esta rotina nunca chama a API nem persiste dados.
 */
import { Worker } from 'node:worker_threads';
import { especificacoes } from '../dados/profissionais.js';
import { ferramentasProntas } from '../dados/catálogo.js';
import { demonstracoesLegadas } from './demos/legadas.mjs';

const MAX = { inRows: 3, inCols: 4, outRows: 5, outCols: 4, indicators: 3, series: 6 };
const str = valor => String(valor ?? '');
const pequeno = (valor, n) => str(valor).slice(0, n);

function lerAmostra(texto, limite = MAX.inRows) {
  if (!texto) return [];
  const delim = texto.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ';';
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length && linhas.length <= limite; i++) {
    const c = texto[i];
    if (c === '"' && aspas && texto[i + 1] === '"') { campo += '"'; i++; }
    else if (c === '"') aspas = !aspas;
    else if (c === delim && !aspas) { linha.push(campo); campo = ''; }
    else if ((c === '\n' || c === '\r') && !aspas) {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    } else campo += c;
  }
  if (linhas.length <= limite && (campo || linha.length)) { linha.push(campo); linhas.push(linha); }
  return linhas.slice(0, limite + 1).map(row => row.slice(0, MAX.inCols));
}

function rodarWorker(slug, dados) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../servidor/profissionais/trabalhador.mjs', import.meta.url), {
      workerData: { slug, dados }, execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
    });
    let terminou = false;
    let timer;
    const fim = async (erro, resultado) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(timer);
      try { await worker.terminate(); } catch { /* worker já encerrou */ }
      erro ? reject(erro) : resolve(resultado);
    };
    timer = setTimeout(() => fim(new Error('O exemplo excedeu 15 segundos.')), 15000);
    worker.once('message', msg => msg.relatorio
      ? fim(null, msg.relatorio)
      : fim(new Error(msg.mensagem || 'Motor não gerou relatório.')));
    worker.once('error', e => fim(e));
    worker.once('exit', code => { if (!terminou) fim(new Error(`Worker encerrou (${code}).`)); });
  });
}

function serieDerivada(relatorio) {
  if (Array.isArray(relatorio.series) && relatorio.series.length) {
    return { series: relatorio.series.slice(0, MAX.series).map(x => ({ rotulo: pequeno(x.nome, 70), valor: x.valor })) };
  }
  const linhas = (relatorio.linhas || []).slice(0, MAX.series);
  if (!linhas.length) return { series: [] };
  const indices = relatorio.colunas.map((_, i) => i).filter(i =>
    linhas.every(row => typeof row[i] === 'number' && Number.isFinite(row[i])));
  const indice = indices.at(-1);
  if (indice === undefined) return { series: [] };
  return {
    medida: pequeno(relatorio.colunas[indice], 70),
    series: linhas.map((row, i) => ({ rotulo: pequeno(`${row[0] ?? `Linha ${i + 1}`}`, 70), valor: row[indice] })),
  };
}

function converterResultado(spec, ferramenta, relatorio) {
  const exemplo = spec.exemplo || '';
  const entradaTabela = spec.entrada !== 'documento';
  const input = entradaTabela ? lerAmostra(exemplo) : null;
  let extensao = 'txt';
  if (!entradaTabela) {
    try { JSON.parse(exemplo); extensao = 'json'; } catch { if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(exemplo)) extensao = 'srt'; }
  }
  const gráfico = serieDerivada(relatorio);
  const destaques = spec.slug === 'regressao-linear-influencia'
    ? ['Inclinação','Intercepto','R²'].map(nome=>relatorio.indicadores.find(([n])=>n===nome)).filter(Boolean)
    : relatorio.indicadores;
  return {
    slug: spec.slug,
    nome: spec.nome,
    plano: spec.plano,
    entrada: entradaTabela
      ? { rotulo: 'Amostra de entrada', arquivo: `${spec.slug}.csv`, colunas: (input?.[0] || []).map(x => pequeno(x, 64)), linhas: (input || []).slice(1, MAX.inRows + 1).map(row => row.map(x => pequeno(x, 120))) }
      : { rotulo: 'Texto de entrada', arquivo: `${spec.slug}.${extensao}`, texto: pequeno(exemplo, 300) },
    indicadores: (destaques || []).slice(0, MAX.indicators).map(([label, valor]) => [pequeno(label, 80), typeof valor === 'number' ? valor : pequeno(valor, 90)]),
    tabela: {
      colunas: (relatorio.colunas || []).slice(0, MAX.outCols).map(x => pequeno(x, 70)),
      linhas: (relatorio.linhas || []).slice(0, MAX.outRows).map(row => row.slice(0, MAX.outCols).map(v => typeof v === 'string' ? pequeno(v, 100) : v)),
    },
    ...gráfico,
    metodo: pequeno(relatorio.metodo || spec.processa, 180),
    notas: (relatorio.notas || []).slice(0, 4).map(x => pequeno(x, 180)),
    exporta: ferramenta.exporta || [],
    tipo: 'calculado',
  };
}

function sanitizarDemo(demo) {
  const scalar = value => typeof value === 'number'
    ? (Number.isFinite(value) ? value : '')
    : typeof value === 'boolean' || value === null ? value : pequeno(value, 120);
  const entrada = demo.entrada?.texto !== undefined
    ? { rotulo: pequeno(demo.entrada.rotulo, 80), texto: pequeno(demo.entrada.texto, 300) }
    : {
      rotulo: pequeno(demo.entrada?.rotulo, 80),
      ...(demo.entrada?.arquivo ? { arquivo: pequeno(demo.entrada.arquivo, 80) } : {}),
      colunas: (demo.entrada?.colunas || []).slice(0, MAX.inCols).map(x => pequeno(x, 64)),
      linhas: (demo.entrada?.linhas || []).slice(0, MAX.inRows).map(row => row.slice(0, MAX.inCols).map(scalar)),
    };
  return {
    slug: pequeno(demo.slug, 100), nome: pequeno(demo.nome, 100), plano: demo.plano,
    entrada,
    indicadores: (demo.indicadores || []).slice(0, MAX.indicators).map(([a, b]) => [pequeno(a, 80), scalar(b)]),
    tabela: {
      colunas: (demo.tabela?.colunas || []).slice(0, MAX.outCols).map(x => pequeno(x, 70)),
      linhas: (demo.tabela?.linhas || []).slice(0, MAX.outRows).map(row => row.slice(0, MAX.outCols).map(scalar)),
    },
    series: (demo.series || []).filter(x => Number.isFinite(x.valor)).slice(0, MAX.series)
      .map(x => ({ rotulo: pequeno(x.rotulo, 70), valor: x.valor })),
    ...(demo.medida ? { medida: pequeno(demo.medida, 70) } : {}),
    metodo: pequeno(demo.metodo, 180),
    notas: (demo.notas || []).slice(0, 4).map(x => pequeno(x, 180)),
    exporta: (demo.exporta || []).slice(0, 6).map(x => pequeno(x, 30)),
    tipo: demo.tipo === 'calculado' ? 'calculado' : 'ilustrativo',
  };
}

export async function gerarDemonstracoes() {
  const demos = new Map();
  for (const [slug, demo] of await demonstracoesLegadas()) demos.set(slug, sanitizarDemo(demo));
  for (const spec of especificacoes) {
    const ferramenta = ferramentasProntas.find(f => f.slug === spec.slug) || { ...spec, exporta: ['csv'] };
    try {
      const dados = spec.entrada === 'documento' ? { texto: spec.exemplo } : { csv: spec.exemplo };
      const relatorio = await rodarWorker(spec.slug, dados);
      demos.set(spec.slug, sanitizarDemo(converterResultado(spec, ferramenta, relatorio)));
    } catch (erro) {
      throw new Error(`Exemplo profissional inválido em ${spec.slug}: ${erro.message}`, { cause: erro });
    }
  }
  return demos;
}


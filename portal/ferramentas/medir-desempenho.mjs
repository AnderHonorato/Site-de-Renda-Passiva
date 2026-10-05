/**
 * Medição de desempenho do portal em celular emulado.
 *
 * O que mede (por página, com animações ligadas e com "reduzir movimento"):
 *   - carga: primeira pintura (FCP), maior pintura (LCP), mudança de layout (CLS), tarefas
 *     longas e TBT, requisições e bytes (total e só de imagens);
 *   - animações: quantas animações o documento tem rodando (`document.getAnimations()`) e
 *     quantas imagens SVG estão desenhadas, e quantas delas aparecem na tela;
 *   - parado (CPU 4×): tempo de tarefa, script, layout e estilo (`Performance.getMetrics`), quadros
 *     por segundo (requestAnimationFrame), tarefas longas e TBT, com a página parada no topo e no fim;
 *   - CPU real (sem estrangulamento, ver abaixo): CPU de cada processo do navegador (renderizador
 *     e GPU) com a página parada, em cada posição de rolagem (uma tela por vez, do topo ao fim);
 *   - interação: INP aproximado ao digitar num campo e enviar o formulário;
 *   - troca de tema: quadros durante a transição de tela inteira.
 *
 * Emulação: 390×844, `isMobile`, devicePixelRatio 3, CPU 4× mais lenta e rede 4G rápida.
 *
 * Por que a CPU de processo é medida em outra passada, sem estrangulamento: o estrangulador de CPU
 * do Chromium (`Emulation.setCPUThrottlingRate`) mantém o renderizador a ~100% mesmo numa página
 * em branco (medido: about:blank = 99,7%), o que esconde qualquer custo real. Então: tempos de
 * tarefa, quadros, LCP, TBT e INP vêm da passada com 4×; a CPU por processo vem de uma passada
 * sem estrangulamento (100% = um núcleo inteiro). O navegador roda sem tela e com renderização por
 * software: o custo absoluto de GPU é maior que o de um celular real; a comparação antes × depois,
 * com o mesmo roteiro, é o que vale.
 *
 * Uso:
 *   node ferramentas/medir-desempenho.mjs --saída medidas/antes.json [--rodadas 3] [--porta 4461]
 *   node ferramentas/medir-desempenho.mjs --comparar medidas/antes.json medidas/depois.json
 *   (npm run medir -- ...)
 * Opções: --páginas "/,/ferramentas.html"  --cenários animado,reduzido  --sem-tema  --rápido
 * Precisa do Playwright (no monorrepo ele vive em ander-flow/; veja achar-playwright.mjs) e do Edge ou Chromium.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharChromium, abrirNavegador } from './achar-playwright.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ argumentos */
const argv = process.argv.slice(2);
const opção = (nome, padrão) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : padrão;
};
const tem = (nome) => argv.includes(`--${nome}`);

export const PÁGINAS_PADRÃO = ['/', '/ferramentas.html', '/f/preco-de-venda/', '/f/calculadora-de-tinta/', '/f/orcamento/'];
const JANELA_PARADO = tem('rápido') ? 2500 : 5000;
const JANELA_FIM = tem('rápido') ? 1500 : 3000;
const JANELA_QUADROS = 2000;
const JANELA_CPU = tem('rápido') ? 1500 : 2500;
const TELA = 844;

/* --------------------------------------------------------------- estatística */
export const mediana = (lista) => {
  const v = lista.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const arredondar = (n, casas = 1) => (n == null ? null : Math.round(n * 10 ** casas) / 10 ** casas);

/** Mediana de cada número de uma lista de objetos de mesma forma (recursivo). */
export function medianaDeObjetos(lista) {
  const base = lista.find((x) => x != null);
  if (base == null) return null;
  if (typeof base === 'number') return arredondar(mediana(lista), 2);
  if (Array.isArray(base)) return base; // listas (nomes) ficam como vieram da primeira rodada
  if (typeof base === 'object') {
    const saída = {};
    for (const chave of Object.keys(base)) saída[chave] = medianaDeObjetos(lista.map((x) => x?.[chave]));
    return saída;
  }
  return base;
}

/* ------------------------------------------------------------------ comparação */
const LINHAS = [
  ['Primeira pintura, FCP (ms)', 'carga.fcp'],
  ['LCP (ms)', 'carga.lcp'],
  ['CLS', 'carga.cls'],
  ['TBT na carga (ms)', 'carga.tbt'],
  ['Tarefas longas na carga (n)', 'carga.longas'],
  ['Requisições na carga (n)', 'carga.requisições'],
  ['Imagens SVG animadas baixadas na carga (n)', 'carga.svgBaixados'],
  ['Imagens SVG animadas baixadas após rolar tudo (n)', 'cpu.svgBaixadosTotal'],
  ['Bytes de imagem na carga (KB)', 'carga.kbImagens'],
  ['Imagens SVG desenhadas (n)', 'carga.svgDesenhados'],
  ['Animações do documento rodando (n)', 'carga.animaçõesDoDocumento'],
  ['Parado no topo (4x): tarefa da página (ms por segundo)', 'parado.tarefaMs'],
  ['Parado no topo (4x): script (ms por segundo)', 'parado.scriptMs'],
  ['Parado no topo (4x): layout + estilo (ms por segundo)', 'parado.layoutEstiloMs'],
  ['Parado no topo (4x): quadros por segundo', 'parado.fps'],
  ['Parado no topo (4x): quadro mais lento, p95 (ms)', 'parado.p95'],
  ['Parado (4x): tarefas longas (n)', 'parado.longas'],
  ['Fim da página (4x): tarefa da página (ms por segundo)', 'fim.tarefaMs'],
  ['Fim da página (4x): quadros por segundo', 'fim.fps'],
  ['CPU real no topo: renderizador + GPU (% de um núcleo)', 'cpu.topoTotal'],
  ['CPU real, pior posição de rolagem: renderizador + GPU (%)', 'cpu.piorTotal'],
  ['CPU real, média das posições: renderizador + GPU (%)', 'cpu.médiaTotal'],
  ['Imagens SVG na tela na pior posição (n)', 'cpu.piorSvgNaTela'],
  ['INP aproximado (ms)', 'interação.inp'],
  ['Troca de tema: quadros por segundo', 'tema.fps'],
  ['Troca de tema: quadro mais lento (ms)', 'tema.máximo'],
];
const buscar = (objeto, caminho) => caminho.split('.').reduce((o, c) => (o == null ? null : o[c]), objeto);

/** Devolve a tabela antes × depois em Markdown, uma por página e cenário. */
export function compararRelatórios(antes, depois) {
  const saída = [];
  for (const página of Object.keys(depois.resultados)) {
    for (const cenário of Object.keys(depois.resultados[página])) {
      const a = antes.resultados[página]?.[cenário];
      const d = depois.resultados[página][cenário];
      if (!a || !d) continue;
      saída.push(`\n#### ${página} (${cenário})\n`, '| Métrica | Antes | Depois | Variação |', '|---|---:|---:|---:|');
      for (const [rótulo, caminho] of LINHAS) {
        const x = buscar(a, caminho);
        const y = buscar(d, caminho);
        if (x == null && y == null) continue;
        const variação = x && y != null ? `${y - x > 0 ? '+' : ''}${arredondar(((y - x) / x) * 100, 0)}%` : '';
        saída.push(`| ${rótulo} | ${x ?? '-'} | ${y ?? '-'} | ${variação} |`);
      }
    }
  }
  return saída.join('\n');
}

if (tem('comparar')) {
  const i = argv.indexOf('--comparar');
  console.log(compararRelatórios(JSON.parse(readFileSync(argv[i + 1], 'utf8')), JSON.parse(readFileSync(argv[i + 2], 'utf8'))));
  process.exit(0);
}

/* ------------------------------------------------------- scripts dentro da página */

/* Roda antes de qualquer outro script: observadores de desempenho e o contador de quadros. */
const OBSERVADORES = `(() => {
  const m = window.__medidas = { fcp: null, lcp: null, cls: 0, longas: [], eventos: [] };
  const observar = (tipo, f, extra = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(f)).observe({ type: tipo, buffered: true, ...extra }); } catch {} };
  observar('paint', (e) => { if (e.name === 'first-contentful-paint') m.fcp = e.startTime; });
  observar('largest-contentful-paint', (e) => { m.lcp = e.startTime; });
  observar('layout-shift', (e) => { if (!e.hadRecentInput) m.cls += e.value; });
  observar('longtask', (e) => { m.longas.push({ início: e.startTime, duração: e.duration }); });
  observar('event', (e) => { m.eventos.push({ nome: e.name, duração: e.duration, id: e.interactionId || 0 }); }, { durationThreshold: 16 });
  window.__quadros = (ms) => new Promise((resolver) => {
    const marcas = [];
    const primeira = performance.now();
    const passo = (t) => { marcas.push(t); if (t - primeira < ms) requestAnimationFrame(passo); else resolver(marcas); };
    requestAnimationFrame(passo);
  });
})();`;

/* Conta o que há na página: animações do documento e imagens SVG (desenhadas e na tela). */
const CONTAGEM = `(() => {
  const animações = document.getAnimations();
  const imagens = [...document.images].filter((i) => /\\.svg(\\?|$)/.test(i.currentSrc || i.src));
  const desenhadas = imagens.filter((i) => { const e = getComputedStyle(i); return e.display !== 'none' && e.visibility !== 'hidden' && i.getClientRects().length > 0; });
  const naTela = desenhadas.filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0; });
  return { animaçõesDoDocumento: animações.filter((a) => a.playState === 'running').length, svgNoHtml: imagens.length, svgDesenhados: desenhadas.length, svgNaTela: naTela.length };
})()`;

/* Recursos carregados até agora (nome decodificado, tipo e bytes). */
const RECURSOS = `performance.getEntriesByType('resource').map((r) => ({ nome: decodeURIComponent(new URL(r.name).pathname), tipo: r.initiatorType, bytes: r.transferSize || r.encodedBodySize || 0 }))`;

/* ------------------------------------------------------------------- utilidades */
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const soma = (lista, f) => lista.reduce((t, x) => t + f(x), 0);
const éSvgAnimado = (r) => r.nome.endsWith('.svg') && /ilustra|ícones-animados/.test(r.nome);
const éImagem = (r) => /\.(svg|png|webp|jpg)$/.test(r.nome);

function resumirQuadros(marcas) {
  const intervalos = marcas.slice(1).map((t, i) => t - marcas[i]);
  if (!intervalos.length) return { fps: null, p95: null, máximo: null, longos: null };
  const ordenados = [...intervalos].sort((a, b) => a - b);
  const total = marcas.at(-1) - marcas[0];
  return {
    fps: arredondar((intervalos.length / total) * 1000, 1),
    p95: arredondar(ordenados[Math.floor(ordenados.length * 0.95)], 1),
    máximo: arredondar(ordenados.at(-1), 1),
    longos: intervalos.filter((x) => x > 33.4).length,
  };
}

/** CPU acumulada (s) de cada processo, por id, com o tipo. */
async function tempoDeProcessos(sessãoDoNavegador) {
  const { processInfo } = await sessãoDoNavegador.send('SystemInfo.getProcessInfo');
  return new Map(processInfo.map((p) => [p.id, { tipo: p.type, cpu: p.cpuTime }]));
}

/** Diferença de CPU (em % de um núcleo) por tipo de processo, só dos processos presentes nas duas leituras. */
function porcentoPorTipo(antes, depois, segundos) {
  const saída = { renderer: 0, GPU: 0, browser: 0 };
  for (const [id, x] of depois) {
    const y = antes.get(id);
    if (y && x.tipo in saída) saída[x.tipo] += ((x.cpu - y.cpu) / segundos) * 100;
  }
  return saída;
}

async function métricas(sessão) {
  const { metrics } = await sessão.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((x) => [x.name, x.value]));
}

/**
 * Mede uma janela parada (passada com estrangulamento): primeiro só espera (métricas da página,
 * tarefas longas), depois conta quadros com requestAnimationFrame. Contar quadros força um quadro
 * a cada 16 ms mesmo numa página parada; por isso as duas coisas não são medidas juntas.
 */
async function medirJanela(página, sessão, ms) {
  const m0 = await métricas(sessão);
  const longas0 = await página.evaluate(() => window.__medidas.longas.length);
  const t0 = Date.now();
  await esperar(ms);
  const decorrido = (Date.now() - t0) / 1000;
  const m1 = await métricas(sessão);
  const longas = await página.evaluate((n) => window.__medidas.longas.slice(n), longas0);
  const marcas = await página.evaluate((j) => window.__quadros(j), JANELA_QUADROS);
  const porSegundo = (nome) => arredondar(((m1[nome] - m0[nome]) * 1000) / decorrido, 0);
  return {
    tarefaMs: porSegundo('TaskDuration'),
    scriptMs: porSegundo('ScriptDuration'),
    layoutEstiloMs: arredondar(porSegundo('LayoutDuration') + porSegundo('RecalcStyleDuration'), 0),
    ...resumirQuadros(marcas),
    longas: longas.length,
    tbt: arredondar(soma(longas, (x) => Math.max(0, x.duração - 50)), 0),
  };
}

/**
 * CPU real por posição de rolagem (passada sem estrangulamento): uma tela por vez, do topo ao fim
 * (no máximo 8 posições), esperando JANELA_CPU em cada uma, sem nenhum rAF da medição.
 */
async function medirCpu(página, sessãoDoNavegador) {
  const altura = await página.evaluate(() => document.documentElement.scrollHeight);
  const posições = [0];
  for (let y = TELA; y < altura - TELA / 2 && posições.length < 8; y += TELA) posições.push(y);
  if (altura > TELA * 1.5) posições.push(altura);
  const lista = [];
  for (const y of posições) {
    await página.evaluate((alvo) => window.scrollTo(0, alvo), y);
    await esperar(500);
    const p0 = await tempoDeProcessos(sessãoDoNavegador);
    const t0 = Date.now();
    await esperar(JANELA_CPU);
    const dt = (Date.now() - t0) / 1000;
    const p1 = await tempoDeProcessos(sessãoDoNavegador);
    const p = porcentoPorTipo(p0, p1, dt);
    const contagem = await página.evaluate(CONTAGEM);
    lista.push({ renderizador: arredondar(p.renderer, 1), gpu: arredondar(p.GPU, 1), total: arredondar(p.renderer + p.GPU, 1), svgNaTela: contagem.svgNaTela });
  }
  const pior = lista.reduce((m, x) => (x.total > m.total ? x : m), lista[0]);
  const recursos = await página.evaluate(RECURSOS);
  return {
    posições: lista.length,
    topoRenderizador: lista[0].renderizador,
    topoGpu: lista[0].gpu,
    topoTotal: lista[0].total,
    topoSvgNaTela: lista[0].svgNaTela,
    piorTotal: pior.total,
    piorSvgNaTela: pior.svgNaTela,
    médiaTotal: arredondar(soma(lista, (x) => x.total) / lista.length, 1),
    svgBaixadosTotal: recursos.filter(éSvgAnimado).length,
    nomesSvgTotal: recursos.filter(éSvgAnimado).map((r) => r.nome),
  };
}

/** Digita num campo e envia; devolve o pior tempo de interação (INP aproximado). */
async function medirInteração(página) {
  const campo = página.locator('#formulário input:not([type=hidden]):not([type=checkbox]):not([type=radio]), #busca').first();
  if (!(await campo.count())) return { inp: null, eventos: 0 };
  const antes = await página.evaluate(() => window.__medidas.eventos.length);
  await campo.scrollIntoViewIfNeeded().catch(() => {});
  await campo.click();
  await página.keyboard.type('1234', { delay: 90 });
  const enviar = página.locator('#formulário button[type=submit]').first();
  if (await enviar.count()) { await enviar.scrollIntoViewIfNeeded().catch(() => {}); await enviar.click(); }
  await esperar(900);
  const eventos = await página.evaluate((n) => window.__medidas.eventos.slice(n), antes);
  const interações = new Map();
  for (const e of eventos) if (e.id) interações.set(e.id, Math.max(interações.get(e.id) ?? 0, e.duração));
  const todas = [...interações.values()];
  return { inp: todas.length ? Math.max(...todas) : Math.max(0, ...eventos.map((e) => e.duração)), eventos: eventos.length };
}

async function medirTroca(página) {
  const botão = página.locator('#alternar-tema').first();
  if (!(await botão.count())) return { fps: null, máximo: null, longos: null };
  await página.evaluate(() => window.scrollTo(0, 0));
  const promessa = página.evaluate(() => window.__quadros(2300));
  await botão.click();
  return resumirQuadros(await promessa);
}

/* ------------------------------------------------------------------- uma rodada */
async function abrirPágina(navegador, reduzido, estrangular) {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: TELA }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    reducedMotion: reduzido ? 'reduce' : 'no-preference', colorScheme: 'light',
  });
  const página = await contexto.newPage();
  await página.addInitScript(OBSERVADORES);
  const sessão = await contexto.newCDPSession(página);
  await sessão.send('Performance.enable');
  await sessão.send('Network.enable');
  await sessão.send('Network.setCacheDisabled', { cacheDisabled: true });
  await sessão.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  if (estrangular) await sessão.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const erros = [];
  página.on('pageerror', (e) => erros.push(String(e)));
  return { contexto, página, sessão, erros };
}

async function umaRodada({ navegador, sessãoDoNavegador, base, caminho, reduzido, comTema }) {
  /* Passada 1: CPU 4× e rede 4G. */
  const { contexto, página, sessão, erros } = await abrirPágina(navegador, reduzido, true);
  await página.goto(`${base}${caminho}`, { waitUntil: 'load' });
  await esperar(1800);

  const instantâneo = await página.evaluate(`(() => {
    const m = window.__medidas;
    return { fcp: m.fcp, lcp: m.lcp, cls: m.cls, longas: m.longas, recursos: ${RECURSOS}, contagem: ${CONTAGEM} };
  })()`);
  const imagens = instantâneo.recursos.filter(éImagem);
  const svgBaixados = instantâneo.recursos.filter(éSvgAnimado);
  const carga = {
    fcp: arredondar(instantâneo.fcp, 0),
    lcp: arredondar(instantâneo.lcp, 0),
    cls: arredondar(instantâneo.cls, 4),
    longas: instantâneo.longas.length,
    tbt: arredondar(soma(instantâneo.longas, (x) => Math.max(0, x.duração - 50)), 0),
    requisições: instantâneo.recursos.length,
    svgBaixados: svgBaixados.length,
    kbImagens: arredondar(soma(imagens, (x) => x.bytes) / 1024, 1),
    kbTotal: arredondar(soma(instantâneo.recursos, (x) => x.bytes) / 1024, 1),
    ...instantâneo.contagem,
    nomesSvg: svgBaixados.map((r) => r.nome),
  };

  const parado = await medirJanela(página, sessão, JANELA_PARADO);
  const interação = await medirInteração(página);
  await página.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await esperar(700);
  const fim = { ...(await medirJanela(página, sessão, JANELA_FIM)), ...(await página.evaluate(CONTAGEM)) };
  const tema = comTema ? await medirTroca(página) : { fps: null, máximo: null, longos: null };
  await contexto.close();

  /* Passada 2: sem estrangulamento de CPU, só para a CPU real dos processos. */
  const livre = await abrirPágina(navegador, reduzido, false);
  await livre.página.goto(`${base}${caminho}`, { waitUntil: 'load' });
  await esperar(1500);
  const cpu = await medirCpu(livre.página, sessãoDoNavegador);
  await livre.contexto.close();

  return { carga, parado, fim, cpu, interação, tema, erros: [...erros, ...livre.erros] };
}

/* ---------------------------------------------------------------------- principal */
async function iniciarServidor(porta) {
  const processo = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(porta), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  const base = `http://127.0.0.1:${porta}`;
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(`${base}/`)).ok) return { processo, base }; } catch { /* subindo */ }
    await esperar(100);
  }
  processo.kill();
  throw new Error(`O servidor não subiu na porta ${porta}.`);
}

async function principal() {
  const chromium = acharChromium();
  if (!chromium) throw new Error('Playwright não encontrado. Defina PLAYWRIGHT_PACOTE=<caminho do package.json que o instala> (no monorrepo: ander-flow/package.json).');
  const porta = Number(opção('porta', 4461));
  const rodadas = Number(opção('rodadas', 3));
  const páginas = opção('páginas', PÁGINAS_PADRÃO.join(',')).split(',');
  const cenários = opção('cenários', 'animado,reduzido').split(',');
  const saída = opção('saída', null);
  const comTema = !tem('sem-tema');

  const { processo, base } = await iniciarServidor(porta);
  const resultados = {};
  try {
    for (const cenário of cenários) {
      const navegador = await abrirNavegador(chromium, { edgePrimeiro: true });
      const sessãoDoNavegador = await navegador.newBrowserCDPSession();
      for (const caminho of páginas) {
        const lista = [];
        for (let r = 0; r < rodadas; r += 1) {
          lista.push(await umaRodada({ navegador, sessãoDoNavegador, base, caminho, reduzido: cenário === 'reduzido', comTema: comTema && r === 0 }));
        }
        // O tema só foi medido numa rodada; as demais ficam sem ele e a mediana ignora os nulos.
        (resultados[caminho] ??= {})[cenário] = medianaDeObjetos(lista);
        const erros = [...new Set(lista.flatMap((x) => x.erros))];
        if (erros.length) console.error(`Erros de página em ${caminho}: ${erros.join(' | ')}`);
        const m = resultados[caminho][cenário];
        console.error(`${cenário.padEnd(8)} ${caminho.padEnd(28)} LCP ${m.carga.lcp} ms | CPU real topo ${m.cpu.topoTotal}% pior ${m.cpu.piorTotal}% | ${m.parado.fps} fps | INP ${m.interação.inp}`);
      }
      await navegador.close();
    }
  } finally {
    processo.kill();
  }

  const relatório = {
    quando: new Date().toISOString(),
    emulação: { viewport: `390x${TELA}`, dpr: 3, cpu: '4x', rede: '4G rápida (9 Mbps, 60 ms)', rodadas, janelaParadoMs: JANELA_PARADO, janelaCpuMs: JANELA_CPU },
    resultados,
  };
  if (saída) {
    mkdirSync(dirname(join(process.cwd(), saída)), { recursive: true });
    writeFileSync(saída, JSON.stringify(relatório, null, 2));
    console.error(`Gravado em ${saída}`);
  } else {
    console.log(JSON.stringify(relatório, null, 2));
  }
}

principal().catch((erro) => { console.error(erro); process.exit(1); });

/** Testes da política de publicação, do servidor local e da importação de cópia (Onda 0). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { caminhoÉPrivado, deveSerPublicado, arquivoDeCabeçalhos, CABEÇALHOS_DE_SEGURANÇA } from '../ferramentas/política-de-segurança.mjs';
import { listarPublicáveis } from '../ferramentas/publicar.mjs';
import { ferramentasProntas } from '../dados/catálogo.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const existe = (caminho) => stat(caminho).then(() => true, () => false);

/* ------------------------------------------------------------ política */

test('caminhos de desenvolvimento são privados e os do navegador não', () => {
  for (const privado of ['testes/catálogo.test.mjs', 'ferramentas/gerar.mjs', 'visuais/x.png', 'package.json',
    'package-lock.json', 'node_modules/x/y.js', '.git/config', '.env', 'f/.segredo/index.html', 'README.md',
    'vitrine/ferramentas/vitrine-trilha.mjs', 'vitrine/midia/video.mp4', 'publicação/index.html']) {
    assert.equal(caminhoÉPrivado(privado), true, privado);
  }
  for (const público of ['index.html', '404.html', 'scripts/ferramentas/porcentagem.js', 'scripts/núcleo/exportar.js',
    'dados/catálogo.js', 'f/juros/index.html', 'vitrine/vitrine.js', 'estilos/núcleo.css']) {
    assert.equal(caminhoÉPrivado(público), false, público);
  }
});

test('a lista de publicação é branca: só entra o que foi permitido', () => {
  for (const sim of ['index.html', 'ferramentas.html', 'niveis.html', '404.html', 'manifesto.webmanifest', 'estilos/núcleo.css',
    'scripts/ferramentas/juros.js', 'dados/site.js', 'recursos/ícone.svg', 'recursos/fontes/inter-latin-wght-normal.woff2',
    'f/juros/index.html', 'vitrine/imagens/vitrine-capa-paisagem.webp']) {
    assert.equal(deveSerPublicado(sim), true, sim);
  }
  for (const não of ['package.json', 'testes/x.test.mjs', 'ferramentas/publicar.mjs', 'visuais/a.png', 'LEIA-ME.md',
    'vitrine/LEIA-ME.md', 'vitrine/imagens/capas.sha256', 'vitrine/ferramentas/vitrine-gerar-capas.mjs',
    'recursos/fontes/licenças/OFL-inter.txt.bak', 'novo-arquivo-qualquer.html', 'segredos/x.json', 'scripts/x.test.js', 'scripts/mapa.js.map']) {
    assert.equal(deveSerPublicado(não), false, não);
  }
});

test('os cabeçalhos de segurança proíbem script e estilo embutidos e quadros externos', () => {
  const csp = CABEÇALHOS_DE_SEGURANÇA['Content-Security-Policy'];
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /style-src 'self'(;|$)/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.ok(arquivoDeCabeçalhos().includes('Content-Security-Policy'));
});

/* ---------------------------------------------------------- publicação */

test('a pasta publicada não leva testes, package.json nem visuais, e leva o que o site usa', async () => {
  const lista = await listarPublicáveis();
  assert.ok(lista.length > 100, 'a publicação não pode sair quase vazia');
  for (const relativo of lista) {
    assert.doesNotMatch(relativo, /^(testes|visuais|ferramentas|node_modules|publicação)\//, relativo);
    assert.doesNotMatch(relativo, /package(-lock)?\.json$|\.md$|\.test\./, relativo);
  }
  for (const preciso of ['index.html', '404.html', 'manifesto.webmanifest', 'dados/site.js', 'vitrine/vitrine-números.js',
    'scripts/núcleo/armazenamento.js', ...ferramentasProntas.map((f) => `f/${f.slug}/index.html`),
    ...ferramentasProntas.map((f) => `scripts/ferramentas/${f.slug}.js`)]) {
    assert.ok(lista.includes(preciso), `falta na publicação: ${preciso}`);
  }
});

test('tudo o que as páginas e os scripts publicados importam também é publicado', async () => {
  const lista = new Set(await listarPublicáveis());
  const faltando = [];
  for (const relativo of lista) {
    if (!/\.(html|js|css)$/.test(relativo)) continue;
    const texto = await readFile(join(RAIZ, relativo), 'utf8');
    const referências = relativo.endsWith('.html')
      ? [...texto.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)].map((m) => m[1])
      : relativo.endsWith('.css')
        ? [...texto.matchAll(/url\(\s*["']?(?!data:)([^"')?#]+)/g)].map((m) => m[1])
        : [...texto.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
    for (const referência of referências) {
      if (referência.includes('${') || /^(https?:|\/\/|data:|blob:)/.test(referência)) continue;
      const alvo = referência.endsWith('/') ? `${referência}index.html` : referência;
      const absoluto = alvo.startsWith('/') ? join(RAIZ, alvo) : resolve(dirname(join(RAIZ, relativo)), decodeURI(alvo));
      const relativoAoPortal = absoluto.slice(RAIZ.length + 1).replaceAll('\\', '/');
      if (!lista.has(relativoAoPortal)) faltando.push(`${relativo} → ${referência}`);
    }
  }
  assert.deepEqual(faltando, [], 'a publicação quebraria estes links ou imports');
});

/* ------------------------------------------------------------ servidor */

const PORTA = 4431;
let processo;

before(async () => {
  processo = spawn(process.execPath, ['ferramentas/servir.mjs', '.', '--porta', String(PORTA), '--local'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${PORTA}/`)).ok) return; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('O servidor de teste não subiu.');
});
after(() => processo?.kill());

const pegar = (caminho, opções) => fetch(`http://127.0.0.1:${PORTA}${caminho}`, opções);

test('caminho inexistente devolve 404 com a página HTML do portal, em qualquer profundidade', async () => {
  for (const caminho of ['/nao-existe', '/a/b/c/d']) {
    const resposta = await pegar(caminho);
    assert.equal(resposta.status, 404, caminho);
    assert.match(resposta.headers.get('content-type'), /text\/html/);
    const html = await resposta.text();
    assert.match(html, /Esta página não existe/);
    assert.match(html, /href="\/estilos\/núcleo\.css"/, 'os estilos precisam ser achados de qualquer profundidade');
  }
});

test('o servidor não entrega testes, ferramentas de desenvolvimento nem arquivos de projeto', async () => {
  for (const caminho of ['/testes/catálogo.test.mjs', '/ferramentas/gerar.mjs', '/ferramentas/servir.mjs', '/package.json',
    '/package-lock.json', '/visuais/', '/vitrine/ferramentas/vitrine-trilha.mjs', '/.git/config', '/..%2f..%2fpackage.json']) {
    const resposta = await pegar(caminho);
    assert.equal(resposta.status, 404, caminho);
    const corpo = await resposta.text();
    assert.doesNotMatch(corpo, /"name": "portal-de-ferramentas"/, caminho);
  }
});

test('o servidor continua entregando o que o navegador precisa, com a política de segurança', async () => {
  for (const caminho of ['/', '/f/juros/', '/scripts/ferramentas/juros.js', '/dados/site.js', '/vitrine/vitrine.js']) {
    const resposta = await pegar(caminho);
    assert.equal(resposta.status, 200, caminho);
    assert.equal(resposta.headers.get('content-security-policy'), CABEÇALHOS_DE_SEGURANÇA['Content-Security-Policy']);
    assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    await resposta.arrayBuffer();
  }
  assert.equal((await pegar('/', { method: 'POST' })).status, 405);
});

/* ----------------------------------------------- importação de cópia */

test('importar uma cópia restaura chaves com letra acentuada, como orçamento.emissor', async () => {
  const memória = new Map();
  globalThis.localStorage = {
    getItem: (c) => (memória.has(c) ? memória.get(c) : null),
    setItem: (c, v) => { memória.set(c, String(v)); },
    removeItem: (c) => { memória.delete(c); },
  };
  const { importarTudo, ler } = await import('../scripts/núcleo/armazenamento.js');
  // JSON.parse cria "__proto__" como chave própria, que é como chega de um arquivo de verdade.
  const chaveLonga = 'a'.repeat(61);
  const dados = JSON.parse(JSON.stringify({ 'orçamento.emissor': { nome: 'Ana' }, favoritos: ['juros'], 'tem espaço': 1, [chaveLonga]: 1 })
    .replace('{', '{"__proto__":{"x":1},'));
  const resultado = importarTudo({ versão: 1, dados });
  assert.equal(resultado.importadas, 2);
  assert.equal(resultado.ignoradas, 3);
  assert.deepEqual(ler('orçamento.emissor', null), { nome: 'Ana' });
  assert.deepEqual(ler('favoritos', null), ['juros']);
});

test('o 404 gerado existe no disco', async () => {
  assert.equal(await existe(join(RAIZ, '404.html')), true);
});

/** Testes das ilustrações animadas: categorias, estados de erro e onde cada uma aparece. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { categorias } from '../dados/categorias.js';
import { ferramentasProntas } from '../dados/catálogo.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'recursos', 'ilustrações');
const semAcento = (id) => id.normalize('NFD').replace(/[̀-ͯ]/g, '');

async function lerSvg(caminho) { return readFile(caminho, 'utf8'); }

function conferirSvg(nome, svg, viewBox) {
  assert.match(svg, new RegExp(`viewBox="${viewBox}"`), `${nome}: proporção`);
  assert.match(svg, /<title id="t">[^<]{15,}<\/title>/, `${nome}: título descritivo para leitor de tela`);
  assert.doesNotMatch(svg, /<script|\son[a-z]+=|href="http|xlink:href|<image|<foreignObject/i, `${nome}: sem script nem recurso externo`);
  assert.doesNotMatch(svg, /\sstyle="/, `${nome}: sem estilo embutido no elemento`);
  assert.match(svg, /@keyframes/, `${nome}: tem animação`);
  assert.match(svg, /prefers-reduced-motion: reduce/, `${nome}: respeita movimento reduzido`);
  assert.match(svg, /prefers-color-scheme: dark/, `${nome}: tem versão para tema escuro`);
}

test('toda categoria tem a própria ilustração animada, com tema escuro e movimento reduzido', async () => {
  for (const c of categorias) {
    const svg = await lerSvg(join(PASTA, 'categorias', `${semAcento(c.id)}.svg`));
    conferirSvg(`categoria ${c.id}`, svg, '0 0 480 200');
  }
});

test('as ilustrações de categoria são todas diferentes entre si', async () => {
  const vistos = new Map();
  for (const c of categorias) {
    const svg = await lerSvg(join(PASTA, 'categorias', `${semAcento(c.id)}.svg`));
    const corpo = svg.slice(svg.indexOf('</style>'));
    assert.ok(!vistos.has(corpo), `${c.id} repete o desenho de ${vistos.get(corpo)}`);
    vistos.set(corpo, c.id);
  }
  assert.equal(vistos.size, categorias.length);
});

test('não sobra ilustração de categoria sem categoria correspondente', async () => {
  const esperados = new Set(categorias.map((c) => `${semAcento(c.id)}.svg`));
  const existentes = (await readdir(join(PASTA, 'categorias'))).filter((a) => a.endsWith('.svg'));
  assert.deepEqual(existentes.filter((a) => !esperados.has(a)), []);
});

test('as ilustrações dos estados de erro existem e seguem as mesmas regras', async () => {
  for (const nome of ['erro-404', 'erro-do-servidor', 'servico-indisponivel', 'sem-conexao', 'acesso-negado', 'estado-vazio', 'boas-vindas']) {
    conferirSvg(nome, await lerSvg(join(PASTA, `${nome}.svg`)), '0 0 320 240');
  }
});

test('a página inicial mostra um cartão ilustrado por categoria', async () => {
  const html = await readFile(join(RAIZ, 'index.html'), 'utf8');
  for (const c of categorias) {
    assert.ok(html.includes(`src="recursos/ilustrações/categorias/${semAcento(c.id)}.svg"`), `falta o cartão de ${c.id}`);
  }
  assert.equal((html.match(/class="categoria-cartão__arte"/g) ?? []).length, categorias.length);
});

test('toda página de ferramenta pronta traz a ilustração da própria categoria no topo', async () => {
  for (const f of ferramentasProntas) {
    const html = await readFile(join(RAIZ, 'f', f.slug, 'index.html'), 'utf8');
    assert.ok(
      html.includes(`class="ferramenta-topo__arte" src="../../recursos/ilustrações/categorias/${semAcento(f.cat)}.svg"`),
      `${f.slug}: falta a ilustração no topo`,
    );
  }
});

/** Testes das ilustrações e dos ícones animados: arquivos, variantes de tema e onde cada um aparece. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { categorias } from '../dados/categorias.js';
import { ferramentas, ferramentasProntas } from '../dados/catálogo.js';
import { nomesDeÍcone } from '../scripts/núcleo/ícones.js';
import { slugDoÍcone as slugNoNavegador, íconeVivo, imagemDoTema } from '../scripts/núcleo/ícone-animado.js';
import { slugDoÍcone as slugNoGerador, nomesComAnimação } from '../ferramentas/ícones-animados.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'recursos', 'ilustrações');
const semAcento = (id) => id.normalize('NFD').replace(/[̀-ͯ]/g, '');
const ler = (caminho) => readFile(caminho, 'utf8');

function conferirSvg(nome, svg, viewBox) {
  assert.match(svg, new RegExp(`viewBox="${viewBox}"`), `${nome}: proporção`);
  assert.match(svg, /<title id="t">[^<]{15,}<\/title>/, `${nome}: título descritivo para leitor de tela`);
  assert.doesNotMatch(svg, /<script|\son[a-z]+=|href="http|xlink:href|<image|<foreignObject/i, `${nome}: sem script nem recurso externo`);
  assert.doesNotMatch(svg, /\sstyle="/, `${nome}: sem estilo embutido no elemento`);
  assert.match(svg, /@keyframes/, `${nome}: tem animação`);
  assert.match(svg, /prefers-reduced-motion: reduce/, `${nome}: respeita movimento reduzido`);
  assert.doesNotMatch(svg, /prefers-color-scheme/, `${nome}: o tema vem do arquivo (claro ou escuro), não do sistema`);
}

/** Confere o par claro/escuro: mesmo desenho, só a paleta muda. */
async function conferirPar(nome, caminho, viewBox) {
  const claro = await ler(`${caminho}.svg`);
  const escuro = await ler(`${caminho}.escuro.svg`);
  conferirSvg(`${nome} (claro)`, claro, viewBox);
  conferirSvg(`${nome} (escuro)`, escuro, viewBox);
  assert.notEqual(claro, escuro, `${nome}: a versão escura precisa ser diferente`);
  assert.equal(claro.slice(claro.indexOf('</style>')), escuro.slice(escuro.indexOf('</style>')), `${nome}: o desenho é o mesmo nos dois temas`);
}

test('toda categoria tem a própria ilustração animada, em dois temas', async () => {
  for (const c of categorias) await conferirPar(`categoria ${c.id}`, join(PASTA, 'categorias', semAcento(c.id)), '0 0 480 200');
});

test('todo recorte pequeno de categoria existe, em dois temas, e é um recorte 3:2 da ilustração grande', async () => {
  for (const c of categorias) {
    const slug = semAcento(c.id);
    const mini = await ler(join(PASTA, 'categorias', 'mini', `${slug}.svg`));
    assert.match(mini, /viewBox="-?\d+ 0 300 200"/, `${c.id}: recorte 300×200`);
    assert.match(mini, /@keyframes/, `${c.id}: o recorte continua animado`);
    await ler(join(PASTA, 'categorias', 'mini', `${slug}.escuro.svg`));
  }
});

test('as ilustrações de categoria são todas diferentes entre si', async () => {
  const vistos = new Map();
  for (const c of categorias) {
    const svg = await ler(join(PASTA, 'categorias', `${semAcento(c.id)}.svg`));
    const corpo = svg.slice(svg.indexOf('</style>'));
    assert.ok(!vistos.has(corpo), `${c.id} repete o desenho de ${vistos.get(corpo)}`);
    vistos.set(corpo, c.id);
  }
  assert.equal(vistos.size, categorias.length);
});

test('não sobra arquivo de categoria sem categoria correspondente', async () => {
  const esperados = new Set(categorias.flatMap((c) => [`${semAcento(c.id)}.svg`, `${semAcento(c.id)}.escuro.svg`]));
  for (const pasta of ['categorias', join('categorias', 'mini')]) {
    const existentes = (await readdir(join(PASTA, pasta))).filter((a) => a.endsWith('.svg'));
    assert.deepEqual(existentes.filter((a) => !esperados.has(a)), [], pasta);
  }
});

test('as ilustrações dos estados de erro existem em dois temas e seguem as mesmas regras', async () => {
  for (const nome of ['erro-404', 'erro-do-servidor', 'servico-indisponivel', 'sem-conexao', 'acesso-negado', 'estado-vazio', 'boas-vindas']) {
    await conferirPar(nome, join(PASTA, nome), '0 0 320 240');
  }
});

/* ------------------------------------------------------------ ícones animados */

test('todo ícone usado por uma ferramenta ou categoria tem versão animada', () => {
  const usados = new Set([...ferramentas.map((f) => f.ícone), ...categorias.map((c) => c.ícone)]);
  const semAnimação = [...usados].filter((nome) => !nomesComAnimação.includes(nome));
  assert.deepEqual(semAnimação, [], 'ícone usado sem animação');
  for (const nome of nomesComAnimação) assert.ok(nomesDeÍcone.includes(nome), `${nome} não existe no conjunto`);
});

test('os arquivos dos ícones animados existem, são seguros e respeitam movimento reduzido', async () => {
  for (const nome of nomesComAnimação) {
    const svg = await ler(join(RAIZ, 'recursos', 'ícones-animados', `${slugNoGerador(nome)}.svg`));
    assert.match(svg, /viewBox="0 0 24 24"/, nome);
    assert.match(svg, /@keyframes/, `${nome}: tem animação`);
    assert.match(svg, /prefers-reduced-motion: reduce/, nome);
    assert.doesNotMatch(svg, /<script|\son[a-z]+=|href=|\sstyle="/i, nome);
    assert.match(svg, /stroke-width: 1\.75/, `${nome}: mesmo traço do conjunto estático`);
  }
});

test('o nome do arquivo é o mesmo no gerador e no navegador, e o HTML aponta para ele', () => {
  for (const nome of nomesComAnimação) assert.equal(slugNoNavegador(nome), slugNoGerador(nome));
  const html = íconeVivo('relógio', { base: '../../', tamanho: 22 });
  assert.match(html, /src="\.\.\/\.\.\/recursos\/ícones-animados\/relogio\.svg"/);
  assert.match(html, /data-estado="carregando"/, 'começa mostrando o estático');
  assert.match(html, /<svg[^>]*width="22"/, 'o ícone estático está no mesmo HTML, como segunda alternativa');
  const par = imagemDoTema('recursos/x', { classe: 'k', largura: 10, altura: 5 });
  assert.match(par, /class="só-claro k" src="recursos\/x\.svg"/);
  assert.match(par, /class="só-escuro k" src="recursos\/x\.escuro\.svg"/);
});

/* -------------------------------------------------------------- nas páginas */

test('a página inicial mostra a animação pequena de cada categoria ao lado do nome, com o ícone estático de reserva', async () => {
  const html = await ler(join(RAIZ, 'index.html'));
  for (const c of categorias) {
    const slug = semAcento(c.id);
    assert.ok(html.includes(`src="recursos/ilustrações/categorias/mini/${slug}.svg"`), `falta o recorte claro de ${c.id}`);
    assert.ok(html.includes(`src="recursos/ilustrações/categorias/mini/${slug}.escuro.svg"`), `falta o recorte escuro de ${c.id}`);
  }
  assert.equal((html.match(/class="ícone-vivo categoria-cartão__arte" data-estado="carregando"/g) ?? []).length, categorias.length);
  const grade = html.slice(html.indexOf('grade-categorias'), html.indexOf('</section>', html.indexOf('grade-categorias')));
  assert.equal((grade.match(/class="categoria-cartão__ícone"/g) ?? []).length, categorias.length, 'cada cartão guarda o ícone estático');
});

test('toda página de ferramenta pronta traz o retângulo animado da categoria no cabeçalho e o ícone animado ao lado do nome', async () => {
  for (const f of ferramentasProntas) {
    const html = await ler(join(RAIZ, 'f', f.slug, 'index.html'));
    const slug = semAcento(f.cat);
    assert.ok(html.includes(`src="../../recursos/ilustrações/categorias/${slug}.svg"`), `${f.slug}: falta o retângulo claro`);
    assert.ok(html.includes(`src="../../recursos/ilustrações/categorias/${slug}.escuro.svg"`), `${f.slug}: falta o retângulo escuro`);
    const cabeçalho = html.slice(html.indexOf('<header class="ferramenta-topo">'), html.indexOf('</header>', html.indexOf('<header class="ferramenta-topo">')));
    assert.ok(cabeçalho.includes('ferramenta-topo__arte'), `${f.slug}: o retângulo fica no cabeçalho, ao lado do nome`);
    assert.ok(cabeçalho.includes(`recursos/ícones-animados/${slugNoGerador(f.ícone)}.svg`), `${f.slug}: o ícone do nome é animado`);
    assert.ok(!html.includes('ferramenta-bancada'), `${f.slug}: nada de retângulo dentro da área de trabalho`);
  }
});

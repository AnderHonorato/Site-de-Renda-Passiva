/**
 * Orçamento de desempenho das animações.
 *
 * Fixa o que o dono pediu ("as animações deixaram lento no celular") para não voltar:
 *   - o HTML não carrega nenhuma imagem animada sozinho: o endereço só entra pelo controle
 *     (scripts/núcleo/animação-viva.js), que respeita tela, limite simultâneo, tema e movimento reduzido;
 *   - peso máximo de cada SVG animado;
 *   - os ícones animam só `transform` e `opacity` (compostas); nada de propriedade que pinta de novo;
 *   - a escolha de quais animações rodam respeita o limite e revezada cobre todas.
 * O teste de navegador (testes/navegador/animações.teste.mjs) confere o mesmo na página de verdade.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { categorias } from '../dados/categorias.js';
import { ferramentasProntas } from '../dados/catálogo.js';
import { íconeVivo, arteViva } from '../scripts/núcleo/ícone-animado.js';
import { escolherAtivas, fonteDaImagem } from '../scripts/núcleo/animação-viva.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (...partes) => readFile(join(RAIZ, ...partes), 'utf8');
const semAcento = (id) => id.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Limites de peso (bytes, texto sem compressão). Medidos no estado de 05/10 com folga de ~25%. */
export const ORÇAMENTO = Object.freeze({ ícone: 1400, recorte: 3600, retângulo: 3600 });

/** Propriedades que o navegador anima sem pintar de novo a cada quadro. */
const COMPOSTAS = new Set(['transform', 'opacity']);

/** Nomes das propriedades usadas dentro dos @keyframes de um SVG. */
function propriedadesAnimadas(svg) {
  const propriedades = new Set();
  for (const bloco of svg.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
    for (const declaração of bloco[1].matchAll(/([a-z-]+)\s*:/g)) propriedades.add(declaração[1]);
  }
  return propriedades;
}

async function arquivos(pasta, filtro = () => true) {
  const nomes = (await readdir(join(RAIZ, pasta))).filter((n) => n.endsWith('.svg') && filtro(n));
  return Promise.all(nomes.map(async (n) => ({ nome: n, svg: await ler(pasta, n) })));
}

/* ------------------------------------------------------------ HTML sem imagem solta */

test('o HTML de um ícone animado não traz endereço da imagem: o controle é quem decide quando baixar', () => {
  const html = íconeVivo('relógio', { base: '../../', tamanho: 22 });
  assert.doesNotMatch(html, /<img[^>]*\ssrc=/, 'sem src no HTML');
  assert.doesNotMatch(html, /loading=/, 'sem lazy nativo: o controle usa IntersectionObserver');
  assert.match(html, /data-viva="ícone" data-fonte="\.\.\/\.\.\/recursos\/ícones-animados\/relogio\.svg"/);
});

test('a ilustração animada é uma imagem só, com o par claro/escuro em atributos (nunca duas imagens)', () => {
  const html = arteViva('recursos/x', { classe: 'k', largura: 10, altura: 5, tipo: 'topo' });
  assert.equal((html.match(/<img/g) ?? []).length, 1);
  assert.doesNotMatch(html, /\ssrc=/);
  assert.match(html, /data-viva="topo" data-fonte-claro="recursos\/x\.svg" data-fonte-escuro="recursos\/x\.escuro\.svg"/);
});

test('a página inicial não baixa imagem animada sozinha e traz uma imagem (não duas) por categoria', async () => {
  const html = await ler('index.html');
  assert.doesNotMatch(html, /<img[^>]*\ssrc="[^"]*(ilustrações\/categorias|ícones-animados)/, 'nenhuma imagem animada com src no HTML');
  for (const c of categorias) {
    const slug = semAcento(c.id);
    assert.equal((html.match(new RegExp(`data-fonte-claro="recursos/ilustrações/categorias/mini/${slug}\\.svg"`, 'g')) ?? []).length, 1, `${c.id}: um recorte`);
  }
  assert.equal((html.match(/<img[^>]*data-viva="arte"/g) ?? []).length, categorias.length);
});

test('toda página de ferramenta traz uma imagem animada no cabeçalho, prioritária, sem src e sem duplicar', async () => {
  for (const f of ferramentasProntas) {
    const html = await ler('f', f.slug, 'index.html');
    assert.doesNotMatch(html, /<img[^>]*\ssrc="[^"]*(ilustrações\/categorias|ícones-animados)/, `${f.slug}: nenhuma imagem animada com src no HTML`);
    assert.equal((html.match(/<img[^>]*data-viva="topo"/g) ?? []).length, 1, `${f.slug}: um retângulo no cabeçalho`);
    assert.equal((html.match(/<img[^>]*data-viva="ícone"/g) ?? []).length, 1, `${f.slug}: um ícone animado ao lado do nome`);
  }
});

/* ------------------------------------------------------------ controle */

const imagem = (viva, extra = {}) => ({ dataset: { viva, ...extra } });

test('escolherAtivas respeita o limite, deixa o retângulo do cabeçalho sempre ativo e reveza as demais', () => {
  const topo = imagem('topo');
  const ícones = Array.from({ length: 10 }, (_, i) => imagem('ícone', { n: i }));
  const todas = [topo, ...ícones];
  const vistas = new Set();
  for (let rodada = 0; rodada < 5; rodada += 1) {
    const ativas = escolherAtivas(todas, 6, rodada);
    assert.equal(ativas.size, 6, 'nunca passa do limite');
    assert.ok(ativas.has(topo), 'o do cabeçalho não é revezado');
    ícones.filter((i) => ativas.has(i)).forEach((i) => vistas.add(i));
  }
  assert.equal(vistas.size, 10, 'depois de algumas rodadas todo ícone apareceu animado');
});

test('escolherAtivas ativa todas quando cabem', () => {
  const lista = Array.from({ length: 4 }, () => imagem('ícone'));
  assert.equal(escolherAtivas(lista, 6, 3).size, 4);
  assert.equal(escolherAtivas([], 6, 0).size, 0);
});

test('fonteDaImagem entrega só a variante do tema, ou o arquivo único', () => {
  const par = imagem('arte', { fonteClaro: 'a.svg', fonteEscuro: 'a.escuro.svg' });
  assert.equal(fonteDaImagem(par, 'claro'), 'a.svg');
  assert.equal(fonteDaImagem(par, 'escuro'), 'a.escuro.svg');
  assert.equal(fonteDaImagem(imagem('ícone', { fonte: 'i.svg' }), 'escuro'), 'i.svg');
  assert.equal(fonteDaImagem(imagem('ícone'), 'claro'), '');
});

/* ------------------------------------------------------------ peso e propriedades */

test('cada SVG animado cabe no orçamento de peso', async () => {
  const estouros = [];
  const conferir = (grupo, lista, limite) => {
    for (const { nome, svg } of lista) {
      const bytes = Buffer.byteLength(svg);
      if (bytes > limite) estouros.push(`${grupo}/${nome}: ${bytes} B (limite ${limite})`);
    }
  };
  conferir('ícones-animados', await arquivos('recursos/ícones-animados'), ORÇAMENTO.ícone);
  conferir('categorias/mini', await arquivos('recursos/ilustrações/categorias/mini'), ORÇAMENTO.recorte);
  conferir('categorias', await arquivos('recursos/ilustrações/categorias'), ORÇAMENTO.retângulo);
  assert.deepEqual(estouros, []);
});

test('os ícones animados só mexem em propriedades compostas (transform e opacity)', async () => {
  const fora = [];
  for (const { nome, svg } of await arquivos('recursos/ícones-animados')) {
    for (const p of propriedadesAnimadas(svg)) if (!COMPOSTAS.has(p)) fora.push(`${nome}: ${p}`);
  }
  assert.deepEqual(fora, [], 'propriedade que obriga a pintar de novo a cada quadro');
});

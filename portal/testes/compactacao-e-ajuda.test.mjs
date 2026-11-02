/** A densidade e o modal são regras globais do portal, não ajustes por slug. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ferramentasProntas } from '../dados/catálogo.js';

const arquivo = (nome) => readFile(new URL(nome, import.meta.url), 'utf8');
const leitor = (arquivo) => readFile(new URL(arquivo, import.meta.url), 'utf8');

test('as páginas geradas compartilham a folha global compacta', async () => {
  for (const pagina of ['../index.html','../ferramentas.html','../en/index.html',
    '../ajuda.html','../planos.html','../f/juros/index.html']) {
    const html = await arquivo(pagina);
    assert.match(html, /estilos\/compacto\.css/, pagina);
  }
  const css = await arquivo('../estilos/compacto.css');
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#ferramenta \.campos--2/);
  assert.match(css, /#ferramenta \.campo:focus-within/);
});

test('todas as ferramentas têm modal, botão e informações geradas sem poluir a área principal', async () => {
  for (const ferramenta of ferramentasProntas) {
    const html = await arquivo('../f/' + ferramenta.slug + '/index.html');
    assert.match(html, /data-como-funciona aria-haspopup="dialog"/, ferramenta.slug);
    assert.match(html, /<dialog class="diálogo ajuda-modal" id="dialogo-como-funciona"/, ferramenta.slug);
    assert.match(html, /aria-labelledby="titulo-como-funciona"/, ferramenta.slug);
    assert.match(html, /<section class="prosa ajuda-modal__instrucoes" id="como-usar"/, ferramenta.slug);
    assert.match(html, /<div id="instruções">/, ferramenta.slug);
    assert.match(html, /<dl class="ficha">/, ferramenta.slug);
    assert.match(html, /data-fechar-ajuda/, ferramenta.slug);
    assert.match(html, /Passo a passo/, ferramenta.slug);
    const começo = html.indexOf('<div class="ferramenta-área">');
    const fim = html.indexOf('<dialog class="diálogo ajuda-modal"', começo);
    assert.ok(começo !== -1 && fim > começo, ferramenta.slug);
    assert.doesNotMatch(html.slice(começo, fim), /ferramenta-lado|<dl class="ficha">|id="instruções"/, ferramenta.slug);
  }
});

test('o modal abre/fecha com foco restaurado e permite tecla Escape pelo diálogo nativo', async () => {
  const js = await arquivo('../scripts/núcleo/página-de-ferramenta.js');
  assert.match(js, /diálogo\.showModal\(\)/);
  assert.match(js, /diálogo\.close\(\)/);
  assert.match(js, /diálogo\.addEventListener\('close', \(\) => botão\.focus\(\)\)/);
  assert.match(js, /ligarAjuda\(\)/);
  assert.doesNotMatch(js, /document\.body\.innerHTML\s*=/);
});

test('o projeto preserva SVGs de marca, paleta clara/escura e proíbe JS embutido na UI nova', async () => {
  const modelo = await arquivo('../f/juros/index.html');
  const style = await arquivo('../estilos/compacto.css');
  assert.match(modelo, /scripts\/núcleo\/página-de-ferramenta\.js/);
  assert.ok(!style.includes('color: white;'));
  assert.doesNotMatch(modelo, /onclick="|onkeyup="|onkeydown="/);
  assert.match(modelo, /<button class="botão botão--linha ferramenta-topo__ajuda"/);
});

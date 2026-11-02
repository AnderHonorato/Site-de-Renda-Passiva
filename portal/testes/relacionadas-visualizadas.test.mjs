/** Recomendações persistem e deixam as ferramentas já abertas identificáveis. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ferramentasProntas } from '../dados/catálogo.js';

const lerArquivo = (relativo) => readFile(new URL(relativo, import.meta.url), 'utf8');

test('recomendações ficam fora do modal em todas as páginas com alternativas prontas', async () => {
  let comRecomendacoes = 0;
  for (const f of ferramentasProntas) {
    const html = await lerArquivo('../f/' + f.slug + '/index.html');
    const modal = html.indexOf('<dialog class="diálogo ajuda-modal"');
    const fora = html.indexOf('<section class="relacionadas-faixa"');
    assert.ok(modal > 0, f.slug);
    assert.ok(!html.slice(modal, html.indexOf('</dialog>', modal)).includes('Ferramentas relacionadas'), f.slug);
    if (fora !== -1) {
      comRecomendacoes++;
      assert.ok(fora < modal, f.slug);
      assert.match(html.slice(fora, modal), /class="relacionadas relacionadas--compactas"/);
      assert.match(html.slice(fora, modal), /data-visto hidden/);
      for (const link of html.slice(fora, modal).matchAll(/data-relacionada="([^"]+)"[^>]*href="\.\.\/([^/]+)\/"/g)) {
        assert.equal(link[1], link[2], 'link errado ' + f.slug);
        assert.ok(ferramentasProntas.some((t) => t.slug === link[1]), 'link não pronto ' + link[1]);
      }
    }
  }
  assert.ok(comRecomendacoes >= 65, 'recomendações presentes na maioria das ferramentas');
});

test('faixa no celular permite deslizar horizontalmente sem alongar a tela', async () => {
  const css = await lerArquivo('../estilos/compacto.css');
  assert.match(css, /\.relacionadas-faixa__topo/);
  assert.match(css, /\.relacionadas--compactas \.relacionadas__item\[data-visitada="sim"\]/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /@media \(max-width: 767px\)/);
});

test('o histórico visual é permanente além dos 12 recentes e protege dados inválidos', async () => {
  const memória = new Map();
  globalThis.localStorage = {
    getItem: (k) => memória.has(k) ? memória.get(k) : null,
    setItem: (k, v) => memória.set(k, String(v)),
    removeItem: (k) => memória.delete(k),
  };
  const { registrarVisualizacao, lerVisualizadas, registrarUso, limparRecentes } = await import('../scripts/núcleo/preferências.js');
  // Aberturas prévias gravadas na chave do histórico recente também contam.
  memória.set('portal.recentes', JSON.stringify(['juros', 'porcentagem']));
  assert.ok(lerVisualizadas().includes('juros'));
  const total = 35;
  for (let n = 0; n < total; n++) {
    const slug = 'teste-ferramenta-' + n;
    registrarVisualizacao(slug);
    registrarUso(slug);
  }
  assert.equal(lerVisualizadas().filter(x => x.startsWith('teste-ferramenta-')).length, total);
  assert.equal(JSON.parse(memória.get('portal.recentes')).length, 12);
  assert.equal(registrarVisualizacao('ruim/arquivo'), false);
  assert.ok(lerVisualizadas().includes('teste-ferramenta-0'));
  limparRecentes();
  assert.ok(lerVisualizadas().includes('teste-ferramenta-0'),
    'limpar recentes não apaga a indicação de páginas já visitadas');
  assert.ok(lerVisualizadas().includes('juros'), 'herda antigos recentes');
});

test('página registra abertura e mostra selo de visitada ordenando novas primeiro', async () => {
  const js = await lerArquivo('../scripts/núcleo/página-de-ferramenta.js');
  assert.match(js, /registrarVisualizacao\(slug\)/);
  assert.match(js, /sinalizarVisualizadas\(\)/);
  assert.match(js, /selo\.hidden = !visualizada/);
  assert.match(js, /contêiner\.replaceChildren\(\.\.\.cartões\)/);
  assert.match(js, /aria-label/);
});

test('catálogo também distingue as ferramentas vistas sem ocupar outro card', async () => {
  const lista = await lerArquivo('../scripts/núcleo/lista.js');
  const css = await lerArquivo('../estilos/compacto.css');
  assert.match(lista, /const visualizadas = new Set\(lerVisualizadas\(\)\)/);
  assert.match(lista, /visualizada: visualizadas\.has\(f\.slug\)/);
  assert.match(lista, /ferramenta-linha__visto/);
  assert.match(css, /\.ferramenta-linha__visto/);
  assert.match(css, /\.ferramenta-linha\[data-visitada="sim"\]/);
});

test('voltar pelo histórico atualiza selos sem exigir recarregar a página', async () => {
  const pagina = await lerArquivo('../scripts/núcleo/página-de-ferramenta.js');
  const lista = await lerArquivo('../scripts/núcleo/lista.js');
  assert.match(pagina, /window\.addEventListener\('pageshow', sinalizarVisualizadas\)/);
  assert.match(lista, /window\.addEventListener\('pageshow', \(\) => atualizarMarcasVisualizadas\(contêiner\)\)/);
  assert.match(lista, /link\.append\(novo\)/);
});

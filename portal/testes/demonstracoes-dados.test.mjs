import test from 'node:test';
import assert from 'node:assert/strict';
import { ferramentasProntas } from '../dados/catálogo.js';
import { especificacoes as specsFinanceiro } from '../dados/profissionais/financeiro.js';
import { especificacoes as specsEstatistica } from '../dados/profissionais/estatistica.js';
import { executar as executarEstatistica } from '../servidor/profissionais/estatistica.mjs';
import { gerarDemonstracoes } from '../ferramentas/dados-demonstracoes.mjs';
import { validarDemonstracao } from '../scripts/núcleo/demonstracoes.js';

const demosPromise = gerarDemonstracoes();
const indicador = (demo, rotulo) => {
  const par = demo.indicadores.find(([nome]) => nome === rotulo);
  assert.ok(par, `Indicador ausente: ${rotulo}`);
  return par[1];
};
const perto = (obtido, esperado, tolerancia = 1e-5) =>
  assert.ok(Math.abs(obtido - esperado) <= tolerancia, `${obtido} ≠ ${esperado}`);

function paresCsv(csv) {
  return csv.trim().split(/\r?\n/).slice(1).map(linha => linha.split(';').map(Number));
}

function inclinacaoOls(pares) {
  const n = pares.length;
  const mediaX = pares.reduce((s, [x]) => s + x, 0) / n;
  const mediaY = pares.reduce((s, [, y]) => s + y, 0) / n;
  const cov = pares.reduce((s, [x, y]) => s + (x - mediaX) * (y - mediaY), 0);
  const variancia = pares.reduce((s, [x]) => s + (x - mediaX) ** 2, 0);
  return cov / variancia;
}

test('gera demonstração para exatamente as 140 ferramentas pagas prontas', async () => {
  const demos = await demosPromise;
  const pagas = ferramentasProntas.filter(f => f.plano === 'plus' || f.plano === 'premium');
  assert.equal(pagas.length, 140);
  assert.equal(demos.size, 140);
  assert.deepEqual([...demos.keys()].sort(), pagas.map(f => f.slug).sort());
  assert.equal([...demos.values()].filter(d => d.tipo === 'calculado').length, 139);
  assert.equal([...demos.values()].filter(d => d.tipo === 'ilustrativo').length, 1);
});

test('demonstração da regressão concorda com cálculo independente; fixture conhecido tem inclinação 0,6', async () => {
  const demos = await demosPromise;
  const slug = 'regressao-linear-influencia';
  const spec = specsEstatistica.find(s => s.slug === slug);
  const demo = demos.get(slug);
  assert.equal(demo.tipo, 'calculado');
  perto(indicador(demo, 'Inclinação'), inclinacaoOls(paresCsv(spec.exemplo)));

  const fixture = 'x;y\n1;2\n2;4\n3;5\n4;4\n5;5';
  const relatorio = executarEstatistica(slug, { csv: fixture });
  perto(relatorio.indicadores.find(([nome]) => nome === 'Inclinação')[1], 0.6);
});

test('VPL demonstrado confere com os fluxos, WACC e crescimento do exemplo', async () => {
  const demos = await demosPromise;
  const demo = demos.get('fluxo-caixa-descontado');
  const spec = specsFinanceiro.find(s => s.slug === demo.slug);
  const fluxos = paresCsv(spec.exemplo);
  const wacc = 0.12;
  const crescimento = 0.03;
  const vpExplicito = fluxos.reduce((s, [periodo, fluxo]) => s + fluxo / (1 + wacc) ** periodo, 0);
  const [periodoFinal, fluxoFinal] = fluxos.at(-1);
  const vpTerminal = fluxoFinal * (1 + crescimento) / (wacc - crescimento) / (1 + wacc) ** periodoFinal;
  perto(indicador(demo, 'VP dos fluxos explícitos'), vpExplicito);
  perto(indicador(demo, 'VP do valor terminal'), vpTerminal);
  perto(indicador(demo, 'Valor da firma estimado'), vpExplicito + vpTerminal);
});

test('amostra de imagem permanece ilustrativa e sem métricas numéricas', async () => {
  const demo = (await demosPromise).get('redimensionar-imagens-em-lote');
  assert.equal(demo.tipo, 'ilustrativo');
  assert.deepEqual(demo.indicadores, []);
  assert.deepEqual(demo.series, []);
  for (const row of demo.tabela.linhas) assert.ok(row.every(value => typeof value === 'string'));
  assert.ok(demo.notas.some(n => n.includes('sem arquivo binário')));
});

test('todas as amostras respeitam limites e contêm somente números finitos', async () => {
  const demos = await demosPromise;
  const visitar = (valor, slug) => {
    if (typeof valor === 'number') assert.ok(Number.isFinite(valor), `Número não finito em ${slug}`);
    else if (Array.isArray(valor)) valor.forEach(v => visitar(v, slug));
    else if (valor && typeof valor === 'object') Object.values(valor).forEach(v => visitar(v, slug));
  };
  for (const [slug, demo] of demos) {
    assert.equal(validarDemonstracao(demo).slug, slug, 'o navegador consegue ler toda amostra gerada');
    visitar(demo, slug);
    assert.ok(demo.indicadores.length <= 3, slug);
    assert.ok(demo.series.length <= 6, slug);
    assert.ok(demo.metodo.length <= 180, slug);
    assert.ok(demo.notas.every(n => n.length <= 180), slug);
    assert.ok(demo.tabela.colunas.length <= 4, slug);
    assert.ok(demo.tabela.linhas.length <= 5, slug);
    assert.ok(demo.tabela.linhas.every(row => row.length <= 4), slug);
    if (demo.entrada.texto !== undefined) assert.ok(demo.entrada.texto.length <= 300, slug);
    else {
      assert.ok(demo.entrada.colunas.length <= 4, slug);
      assert.ok(demo.entrada.linhas.length <= 3, slug);
      assert.ok(demo.entrada.linhas.every(row => row.length <= 4), slug);
    }
  }
});

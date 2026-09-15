import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCaixaRetangular } from '../scripts/cálculos/calcular-caixa-retangular.js';
import { calcularCaixaComTampa } from '../scripts/cálculos/calcular-caixa-com-tampa.js';
import { calcularEnvelope } from '../scripts/cálculos/calcular-envelope.js';
import { calcularGradeDeEtiquetas } from '../scripts/cálculos/calcular-grade-de-etiquetas.js';
import { gerarPdfDeCaixaRetangular } from '../scripts/geração/gerar-pdf-de-caixa-retangular.js';
import { gerarPdfDeCaixaComTampa } from '../scripts/geração/gerar-pdf-de-caixa-com-tampa.js';
import { gerarPdfDeEnvelope } from '../scripts/geração/gerar-pdf-de-envelope.js';
import { gerarPdfDeEtiquetas } from '../scripts/geração/gerar-pdf-de-etiquetas.js';
import { gerarSvgDeMolde } from '../scripts/geração/gerar-svg-de-molde.js';

function textoDoPdf(bytes) {
  return Buffer.from(bytes).toString('latin1');
}
function contarPáginas(texto) {
  return (texto.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}
function conteúdosDePágina(texto) {
  return [...texto.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((correspondência) => correspondência[1]);
}

test('caixa retangular pequena gera PDF de uma única folha, sem página vazia', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 });
  const bytes = gerarPdfDeCaixaRetangular({ resultado, tituloDaAtividade: 'Caixa de teste' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 1);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('quadrado de calibração de 50 mm aparece no PDF como retângulo de 141,732 × 141,732 pt', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 });
  const bytes = gerarPdfDeCaixaRetangular({ resultado, tituloDaAtividade: 'Caixa de teste' });
  const texto = textoDoPdf(bytes);
  assert.match(texto, /141\.732 141\.732 re/);
});

test('molde grande (caixa de 900×600×300 mm) é dividido em várias folhas A4, sem reduzir a escala', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 900, larguraInternoMm: 600, alturaInternoMm: 300, tamanhoDaAbaMm: 40 });
  assert.equal(resultado.válido, true);
  const bytes = gerarPdfDeCaixaRetangular({ resultado, tituloDaAtividade: 'Caixa grande' });
  const texto = textoDoPdf(bytes);
  const páginas = contarPáginas(texto);
  assert.ok(páginas > 1, 'esperava mais de uma folha para um molde maior que a área útil da A4');
  // A calibração de 50 mm continua exata em toda folha: a escala nunca é reduzida.
  assert.match(texto, /141\.732 141\.732 re/);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0, 'nenhuma folha pode ficar vazia');
});

test('caixa com tampa gera PDF com as folhas da base seguidas das folhas da tampa', () => {
  const resultado = calcularCaixaComTampa({ comprimentoInternoMm: 150, larguraInternoMm: 100, alturaDaBaseMm: 40, alturaDaTampaMm: 15, folgaMm: 1, tamanhoDaAbaMm: 12 });
  const bytes = gerarPdfDeCaixaComTampa({ resultado, tituloDaAtividade: 'Caixa com tampa' });
  const texto = textoDoPdf(bytes);
  assert.ok(contarPáginas(texto) >= 2);
  assert.match(texto, /base/);
  assert.match(texto, /tampa/);
});

test('envelope gera PDF válido de uma página', () => {
  const resultado = calcularEnvelope({ larguraDoConteúdoMm: 60, alturaDoConteúdoMm: 90, folgaMm: 2, tamanhoDaAbaMm: 15 });
  const bytes = gerarPdfDeEnvelope({ resultado, tituloDaAtividade: 'Envelope de teste' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 1);
});

test('etiquetas gera PDF com página de calibração e página da grade, ambas com conteúdo', () => {
  const resultado = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 50, alturaDaEtiquetaMm: 30, textoOpcional: 'Loja Ana' });
  const bytes = gerarPdfDeEtiquetas({ resultado, tituloDaAtividade: 'Etiquetas de teste' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 2);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('SVG do molde escapa texto do usuário e usa mm reais no width/height/viewBox', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 });
  const svg = gerarSvgDeMolde({ ...resultado, textoOpcional: '<script>alert(1)</script> & "aspas"', tituloDoMolde: 'Caixa' });
  assert.match(svg, /width="180mm"/);
  assert.match(svg, /viewBox="0 0 180 140"/);
  assert.ok(!svg.includes('<script>'));
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /&amp;/);
});

test('SVG do molde tem linhas de dobra tracejadas e de corte contínuas (distinguíveis também em preto e branco)', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 });
  const svg = gerarSvgDeMolde(resultado);
  assert.match(svg, /stroke-dasharray/);
  assert.match(svg, /class="corte"/);
  assert.match(svg, /class="dobra"/);
});

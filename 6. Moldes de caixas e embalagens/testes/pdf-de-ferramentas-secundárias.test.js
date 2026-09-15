import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCinta } from '../scripts/cálculos/calcular-cinta.js';
import { calcularDivisóriasDeCaixa } from '../scripts/cálculos/calcular-divisórias-de-caixa.js';
import { calcularSacoDePapel } from '../scripts/cálculos/calcular-saco-de-papel.js';
import { gerarPdfDeCinta } from '../scripts/geração/gerar-pdf-de-cinta.js';
import { gerarPdfDeDivisórias } from '../scripts/geração/gerar-pdf-de-divisórias.js';
import { gerarPdfDeSacoDePapel } from '../scripts/geração/gerar-pdf-de-saco-de-papel.js';

function textoDoPdf(bytes) {
  return Buffer.from(bytes).toString('latin1');
}
function contarPáginas(texto) {
  return (texto.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}
function conteúdosDePágina(texto) {
  return [...texto.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((correspondência) => correspondência[1]);
}

test('cinta: PDF de uma folha quando cabe na área útil, com o quadrado de calibração', () => {
  const resultado = calcularCinta({ perímetroMm: 150, sobreposiçãoMm: 15, alturaMm: 40 });
  const bytes = gerarPdfDeCinta({ resultado, tituloDaAtividade: 'Cinta de teste' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 1);
  assert.match(texto, /141\.732 141\.732 re/);
});

test('cinta: uma cinta longa (perímetro 300 mm) é dividida em folhas, sem reduzir a escala', () => {
  const resultado = calcularCinta({ perímetroMm: 300, sobreposiçãoMm: 15, alturaMm: 40 });
  const bytes = gerarPdfDeCinta({ resultado, tituloDaAtividade: 'Cinta grande' });
  const texto = textoDoPdf(bytes);
  assert.ok(contarPáginas(texto) > 1);
  assert.match(texto, /141\.732 141\.732 re/);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('divisórias: PDF traz uma folha para cada tira quando cada tira cabe numa única página', () => {
  const resultado = calcularDivisóriasDeCaixa({ comprimentoInternoMm: 180, larguraInternoMm: 150, alturaInternoMm: 80, linhas: 2, colunas: 3, espessuraMm: 2 });
  const bytes = gerarPdfDeDivisórias({ resultado, tituloDaAtividade: 'Divisórias de teste' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), resultado.tirasVerticais.length + resultado.tirasHorizontais.length);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('saco de papel: PDF válido de uma página quando o molde cabe na área útil, sem página vazia', () => {
  const resultado = calcularSacoDePapel({ larguraMm: 40, profundidadeMm: 30, alturaMm: 60, abaSuperiorMm: 10, abaDeColagemMm: 10 });
  const bytes = gerarPdfDeSacoDePapel({ resultado, tituloDaAtividade: 'Saco de teste' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 1);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('saco de papel: um saco grande é dividido em folhas, sem reduzir a escala', () => {
  const resultado = calcularSacoDePapel({ larguraMm: 120, profundidadeMm: 70, alturaMm: 200, abaSuperiorMm: 20, abaDeColagemMm: 15 });
  const bytes = gerarPdfDeSacoDePapel({ resultado, tituloDaAtividade: 'Saco grande' });
  const texto = textoDoPdf(bytes);
  assert.ok(contarPáginas(texto) > 1);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

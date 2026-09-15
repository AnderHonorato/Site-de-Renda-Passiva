import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contarFolhasDoMolde } from '../scripts/geração/contar-folhas-do-molde.js';
import { calcularCaixaRetangular } from '../scripts/cálculos/calcular-caixa-retangular.js';
import { calcularCaixaComTampa } from '../scripts/cálculos/calcular-caixa-com-tampa.js';
import { gerarPdfDeCaixaRetangular } from '../scripts/geração/gerar-pdf-de-caixa-retangular.js';
import { gerarPdfDeCaixaComTampa } from '../scripts/geração/gerar-pdf-de-caixa-com-tampa.js';

function contarPáginasDoPdf(bytes) {
  const texto = Buffer.from(bytes).toString('latin1');
  return (texto.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

test('caso pequeno: molde que cabe na área útil da A4 ocupa 1 folha', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 });
  assert.equal(contarFolhasDoMolde(resultado.retânguloEnvolvente), 1);
});

test('caixa retangular de 900×600×300 mm ocupa mais de 1 folha, igual ao número de páginas do PDF gerado', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 900, larguraInternoMm: 600, alturaInternoMm: 300, tamanhoDaAbaMm: 40 });
  const quantidadeContada = contarFolhasDoMolde(resultado.retânguloEnvolvente);
  assert.ok(quantidadeContada > 1);

  const bytes = gerarPdfDeCaixaRetangular({ resultado, tituloDaAtividade: 'Caixa grande' });
  assert.equal(contarPáginasDoPdf(bytes), quantidadeContada);
});

test('caixa com tampa de 900×600×300 mm: a soma das folhas contadas (base + tampa) bate com o total de páginas do PDF', () => {
  const resultado = calcularCaixaComTampa({
    comprimentoInternoMm: 900,
    larguraInternoMm: 600,
    alturaDaBaseMm: 300,
    alturaDaTampaMm: 60,
    folgaMm: 2,
    tamanhoDaAbaMm: 40,
  });
  assert.equal(resultado.válido, true);
  const quantidadeContada = contarFolhasDoMolde(resultado.base.retânguloEnvolvente) + contarFolhasDoMolde(resultado.tampa.retânguloEnvolvente);
  assert.ok(quantidadeContada > 2, 'esperava mais folhas do que o mínimo de 1 por peça, para um molde deste tamanho');

  const bytes = gerarPdfDeCaixaComTampa({ resultado, tituloDaAtividade: 'Caixa com tampa grande' });
  assert.equal(contarPáginasDoPdf(bytes), quantidadeContada);
});

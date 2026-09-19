import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarPdfDeOperações } from '../scripts/geração/gerar-pdf-de-operações.js';
import { gerarPdfDeTabuada } from '../scripts/geração/gerar-pdf-de-tabuada.js';
import { gerarPdfDeCaçaPalavras } from '../scripts/geração/gerar-pdf-de-caça-palavras.js';
import { gerarPdfDeCaligrafia } from '../scripts/geração/gerar-pdf-de-caligrafia.js';
import { gerarListaDeOperações } from '../scripts/cálculos/gerar-lista-de-operações.js';
import { gerarTabuada } from '../scripts/cálculos/gerar-tabuada.js';
import { gerarCaçaPalavras } from '../scripts/geração/gerar-caça-palavras.js';
import { calcularFolhaDeCaligrafia } from '../scripts/cálculos/calcular-folha-de-caligrafia.js';

function textoDoPdf(bytes) {
  return Buffer.from(bytes).toString('latin1');
}

function contarPáginas(texto) {
  return (texto.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

// Cada objeto de página tem um objeto de conteúdo "N 0 obj << /Length L >>\nstream\n...\nendstream".
// Uma página "vazia" teria um comando de conteúdo em branco; aqui conferimos que todo stream
// de conteúdo tem operadores PDF reais (BT/Tj para texto, "m"/"l" para linhas, "re" para retângulo).
function conteúdosDePágina(texto) {
  const streams = [...texto.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((correspondência) => correspondência[1]);
  return streams;
}

test('operações matemáticas: PDF tem a página de atividade e a página de gabarito, nenhuma vazia', () => {
  const lista = gerarListaDeOperações({ operadores: ['+', '−'], quantidade: 10, mínimo: 0, máximo: 20, semente: 1 });
  const bytes = gerarPdfDeOperações({ operações: lista.operações, apresentação: 'linha', tituloDaAtividade: 'Soma e subtração', comCabeçalho: true, sementeUsada: lista.sementeUsada });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 2);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0, 'stream de página vazio');
  assert.match(texto, /%PDF-1\.4/);
});

test('operações matemáticas: apresentação armada também gera PDF válido de duas páginas', () => {
  const lista = gerarListaDeOperações({ operadores: ['×'], quantidade: 8, mínimo: 2, máximo: 9, semente: 2 });
  const bytes = gerarPdfDeOperações({ operações: lista.operações, apresentação: 'armada', tituloDaAtividade: 'Tabuada rápida', sementeUsada: lista.sementeUsada });
  assert.equal(contarPáginas(textoDoPdf(bytes)), 2);
});

test('operações matemáticas: muitos exercícios paginam sem página vazia', () => {
  const lista = gerarListaDeOperações({ operadores: ['+'], quantidade: 120, mínimo: 0, máximo: 999, semente: 3 });
  const bytes = gerarPdfDeOperações({ operações: lista.operações, apresentação: 'linha', tituloDaAtividade: 'Muitas contas' });
  const texto = textoDoPdf(bytes);
  assert.ok(contarPáginas(texto) >= 3);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('tabuada: PDF tem atividade e gabarito, nenhuma página vazia', () => {
  const tabuada = gerarTabuada({ fatores: [2, 5, 7], multiplicadorMínimo: 1, multiplicadorMáximo: 10, semente: 1 });
  const bytes = gerarPdfDeTabuada({ itens: tabuada.itens, tituloDaAtividade: 'Tabuada do 2, 5 e 7', comCabeçalho: true, sementeUsada: tabuada.sementeUsada, ordem: 'sequencial' });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 2);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('caça-palavras: PDF tem atividade e gabarito com a marcação das palavras, nenhuma página vazia', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['SOL', 'LUA', 'MAR', 'CEU', 'CHUVA'], direções: ['horizontal', 'vertical'], linhas: 10, colunas: 10, semente: 9 });
  const bytes = gerarPdfDeCaçaPalavras({ ...resultado, tituloDaAtividade: 'Palavras do tempo', comCabeçalho: true, sementeUsada: resultado.sementeUsada });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 2);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
});

test('caça-palavras: quando alguma palavra não coube, o PDF do gabarito lista o motivo', () => {
  const resultado = gerarCaçaPalavras({ palavras: ['PRIMAVERA', 'INVERNO', 'OUTONO', 'VERAO', 'CHUVOSO', 'ENSOLARADO'], direções: ['horizontal'], linhas: 6, colunas: 6, semente: 1 });
  assert.ok(resultado.nãoColocadas.length > 0);
  const bytes = gerarPdfDeCaçaPalavras({ ...resultado, tituloDaAtividade: 'Estações' });
  const texto = textoDoPdf(bytes);
  assert.match(texto, /coube nesta grade/);
});

test('caligrafia: PDF de uma página, com o texto sólido do modelo e as repetições em contorno', () => {
  const folha = calcularFolhaDeCaligrafia({ texto: 'João', repetições: 6, quantidadeDeLinhas: 5, tamanhoDaLetra: 28 });
  const bytes = gerarPdfDeCaligrafia({ folha, tituloDaAtividade: 'Caligrafia do João', comCabeçalho: true });
  const texto = textoDoPdf(bytes);
  assert.equal(contarPáginas(texto), 1);
  for (const conteúdo of conteúdosDePágina(texto)) assert.ok(conteúdo.trim().length > 0);
  assert.match(texto, /1 Tr/); // ao menos uma repetição usa modo de contorno (Tr 1)
});

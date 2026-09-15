import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarPáginasDeFlashcards, CARTÕES_POR_PÁGINA } from '../scripts/cálculos/montar-páginas-de-flashcards.js';
import { validarFlashcardsSalvo } from '../scripts/validação/validar-flashcards-salvo.js';

test('cada página tem a frente com as perguntas na ordem digitada', () => {
  const pares = [
    { pergunta: 'p1', resposta: 'r1' },
    { pergunta: 'p2', resposta: 'r2' },
  ];
  const resultado = montarPáginasDeFlashcards({ pares, espelharVerso: false });
  assert.equal(resultado.válido, true);
  assert.deepEqual(resultado.páginas[0].frente[0], ['p1', 'p2']);
  assert.deepEqual(resultado.páginas[0].verso[0], ['r1', 'r2']);
});

test('com espelharVerso, o verso sai com a ordem das colunas invertida em relação à frente', () => {
  const pares = [
    { pergunta: 'p1', resposta: 'r1' },
    { pergunta: 'p2', resposta: 'r2' },
  ];
  const resultado = montarPáginasDeFlashcards({ pares, espelharVerso: true });
  assert.deepEqual(resultado.páginas[0].frente[0], ['p1', 'p2']);
  assert.deepEqual(resultado.páginas[0].verso[0], ['r2', 'r1']);
});

test('uma linha incompleta (menos pares que colunas) mantém a posição ao espelhar, com null no lugar vazio', () => {
  const pares = [{ pergunta: 'p1', resposta: 'r1' }];
  const resultado = montarPáginasDeFlashcards({ pares, espelharVerso: true });
  assert.deepEqual(resultado.páginas[0].frente[0], ['p1', null]);
  // Espelhado: a coluna 0 (com o par) vai para a coluna 1 no verso.
  assert.deepEqual(resultado.páginas[0].verso[0], [null, 'r1']);
});

test('mais de 8 pares (um por folha) geram uma segunda página', () => {
  const pares = Array.from({ length: CARTÕES_POR_PÁGINA + 3 }, (_, índice) => ({ pergunta: `p${índice}`, resposta: `r${índice}` }));
  const resultado = montarPáginasDeFlashcards({ pares });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.páginas.length, 2);
  assert.equal(resultado.páginas[0].quantidadeDeCartões, CARTÕES_POR_PÁGINA);
  assert.equal(resultado.páginas[1].quantidadeDeCartões, 3);
});

test('ignora pares totalmente vazios (linhas em branco no formulário)', () => {
  const pares = [
    { pergunta: 'p1', resposta: 'r1' },
    { pergunta: '', resposta: '' },
    { pergunta: 'p2', resposta: 'r2' },
  ];
  const resultado = montarPáginasDeFlashcards({ pares });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.pares.length, 2);
});

test('recusa par incompleto (só pergunta ou só resposta preenchida)', () => {
  const resultado = montarPáginasDeFlashcards({ pares: [{ pergunta: 'p1', resposta: '' }] });
  assert.equal(resultado.válido, false);
});

test('recusa lista vazia e lista com mais de 40 pares', () => {
  assert.equal(montarPáginasDeFlashcards({ pares: [] }).válido, false);
  const demais = Array.from({ length: 41 }, (_, índice) => ({ pergunta: `p${índice}`, resposta: `r${índice}` }));
  assert.equal(montarPáginasDeFlashcards({ pares: demais }).válido, false);
});

test('a mesma entrada é sempre determinística (mesma grade)', () => {
  const pares = [
    { pergunta: 'p1', resposta: 'r1' },
    { pergunta: 'p2', resposta: 'r2' },
    { pergunta: 'p3', resposta: 'r3' },
  ];
  assert.deepEqual(montarPáginasDeFlashcards({ pares }), montarPáginasDeFlashcards({ pares }));
});

test('validador de flashcards salvo recusa dados adulterados', () => {
  const válido = { nome: 'Capitais', pares: [{ pergunta: 'p1', resposta: 'r1' }], espelharVerso: true, tituloDaAtividade: '' };
  assert.equal(validarFlashcardsSalvo(válido), true);
  assert.equal(validarFlashcardsSalvo({ ...válido, pares: [{ pergunta: '', resposta: 'r1' }] }), false);
  assert.equal(validarFlashcardsSalvo({ ...válido, pares: [] }), false);
  assert.equal(validarFlashcardsSalvo(null), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarCartelasDeBingo } from '../scripts/cálculos/gerar-cartelas-de-bingo.js';
import { validarBingoSalvo } from '../scripts/validação/validar-bingo-salvo.js';

test('cada cartela sai sem números repetidos dentro dela mesma', () => {
  const resultado = gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 75, tamanhoDaGrade: 5, quantidadeDeCartelas: 5, semente: 7 });
  assert.equal(resultado.válido, true);
  for (const cartela of resultado.cartelas) {
    const números = cartela.grade.flat();
    assert.equal(new Set(números).size, números.length);
    assert.equal(números.length, 25);
    for (const número of números) assert.ok(número >= 1 && número <= 75);
  }
});

test('nenhuma cartela sai idêntica a outra (mesmo conjunto de números)', () => {
  const resultado = gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 75, tamanhoDaGrade: 5, quantidadeDeCartelas: 20, semente: 42 });
  assert.equal(resultado.válido, true);
  const assinaturas = resultado.cartelas.map((cartela) => cartela.grade.flat().slice().sort((a, b) => a - b).join(','));
  assert.equal(new Set(assinaturas).size, assinaturas.length);
});

test('a lista de sorteio é separada das cartelas e contém todos os números do intervalo, sem repetição', () => {
  const resultado = gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 20, tamanhoDaGrade: 3, quantidadeDeCartelas: 1, semente: 3 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.listaDeSorteio.length, 20);
  assert.equal(new Set(resultado.listaDeSorteio).size, 20);
  for (let número = 1; número <= 20; número += 1) assert.ok(resultado.listaDeSorteio.includes(número));
});

test('recusa configuração impossível: intervalo com menos números do que casas na cartela', () => {
  const resultado = gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 10, tamanhoDaGrade: 4, quantidadeDeCartelas: 1, semente: 1 });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /menos que as/);
});

test('recusa quantidade de cartelas maior do que o número de combinações possíveis, sem travar', () => {
  const resultado = gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 9, tamanhoDaGrade: 3, quantidadeDeCartelas: 5, semente: 1 });
  // Com intervalo 1–9 e cartela 3×3 (9 casas), só existe UM conjunto possível de números:
  // a segunda cartela nunca pode ser diferente da primeira.
  assert.equal(resultado.válido, false);
});

test('a mesma semente e as mesmas opções reproduzem exatamente as mesmas cartelas', () => {
  const opções = { intervaloMínimo: 1, intervaloMáximo: 90, tamanhoDaGrade: 5, quantidadeDeCartelas: 6, semente: 314 };
  assert.deepEqual(gerarCartelasDeBingo(opções), gerarCartelasDeBingo(opções));
});

test('rejeita intervalo invertido, tamanho de cartela inválido ou semente não numérica', () => {
  assert.equal(gerarCartelasDeBingo({ intervaloMínimo: 50, intervaloMáximo: 1, tamanhoDaGrade: 5, quantidadeDeCartelas: 1 }).válido, false);
  assert.equal(gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 75, tamanhoDaGrade: 6, quantidadeDeCartelas: 1 }).válido, false);
  assert.equal(gerarCartelasDeBingo({ intervaloMínimo: 1, intervaloMáximo: 75, tamanhoDaGrade: 5, quantidadeDeCartelas: 1, semente: NaN }).válido, false);
});

test('validador de bingo salvo recusa dados adulterados', () => {
  const válido = { nome: 'Turma B', intervaloMínimo: 1, intervaloMáximo: 75, tamanhoDaGrade: 5, quantidadeDeCartelas: 4, semente: 1, comCabeçalho: true, tituloDaAtividade: '' };
  assert.equal(validarBingoSalvo(válido), true);
  assert.equal(validarBingoSalvo({ ...válido, tamanhoDaGrade: 7 }), false);
  assert.equal(validarBingoSalvo({ ...válido, intervaloMínimo: 100 }), false);
  assert.equal(validarBingoSalvo(null), false);
});

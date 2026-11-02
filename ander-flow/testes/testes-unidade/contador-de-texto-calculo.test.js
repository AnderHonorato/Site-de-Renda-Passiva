import test from 'node:test';
import assert from 'node:assert/strict';
import { contarTexto, formatarDuracao } from '../../frontend/ferramentas/contador-de-texto/contador-de-texto-calculo.js';

test('caso do contrato: "Olá mundo. Tudo bem?\\n\\nSim."', () => {
  const resultado = contarTexto('Olá mundo. Tudo bem?\n\nSim.');
  assert.equal(resultado.palavras, 5);
  assert.equal(resultado.frases, 3);
  assert.equal(resultado.paragrafos, 2);
});

test('texto vazio conta zero em tudo', () => {
  const resultado = contarTexto('');
  assert.equal(resultado.caracteres, 0);
  assert.equal(resultado.palavras, 0);
  assert.equal(resultado.frases, 0);
  assert.equal(resultado.paragrafos, 0);
  assert.equal(resultado.linhas, 0);
  assert.equal(resultado.segundosDeLeitura, 0);
});

test('acento não vira dois caracteres e espaços saem da contagem sem espaço', () => {
  const resultado = contarTexto('ação');
  assert.equal(resultado.caracteres, 4);
  const comEspaco = contarTexto('a b c');
  assert.equal(comEspaco.caracteres, 5);
  assert.equal(comEspaco.caracteresSemEspaco, 3);
});

test('emoji composto conta como um caractere', () => {
  const resultado = contarTexto('👨‍👩‍👧 ok');
  assert.equal(resultado.caracteres, 4); // emoji + espaço + o + k
});

test('só espaços em branco não formam parágrafo', () => {
  const resultado = contarTexto('   \n\n   ');
  assert.equal(resultado.paragrafos, 0);
  assert.equal(resultado.palavras, 0);
});

test('tempo de leitura e de fala saem das palavras', () => {
  const texto = Array.from({ length: 200 }, () => 'palavra').join(' ');
  const resultado = contarTexto(texto);
  assert.equal(resultado.palavras, 200);
  assert.equal(resultado.segundosDeLeitura, 60);
  assert.equal(resultado.segundosDeFala, 92); // 200 / 130 minutos
});

test('média de palavras por frase', () => {
  const resultado = contarTexto('Uma frase curta. Outra frase aqui.');
  assert.equal(resultado.frases, 2);
  assert.equal(resultado.mediaPalavrasPorFrase, 3);
});

test('duração vira minutos e segundos', () => {
  assert.equal(formatarDuracao(0), '0:00');
  assert.equal(formatarDuracao(12), '0:12');
  assert.equal(formatarDuracao(185), '3:05');
});

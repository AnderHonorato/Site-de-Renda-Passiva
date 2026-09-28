/**
 * Testes do contador de texto.
 *
 * Os casos de contagem são os do Ander Flow (testes/testes-unidade/
 * contador-de-texto-calculo.test.js), com os nomes do portal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  contarTexto, contarCaracteres, formatarDuração, medirSms, situaçãoNoLimite, préviaDoTexto,
  LIMITES_DE_DESTINO, PALAVRAS_POR_MINUTO_DE_LEITURA, PALAVRAS_POR_MINUTO_DE_FALA,
} from '../scripts/cálculos/textos.js';
import ferramenta, { TEXTO_DE_EXEMPLO, LIMITE_DE_CARACTERES } from '../scripts/ferramentas/contador-de-texto.js';

/* ------------------------------------------------- casos do Ander Flow */

test('caso do contrato: "Olá mundo. Tudo bem?\\n\\nSim."', () => {
  const r = contarTexto('Olá mundo. Tudo bem?\n\nSim.');
  assert.equal(r.palavras, 5);
  assert.equal(r.frases, 3);
  assert.equal(r.parágrafos, 2);
});

test('texto vazio conta zero em tudo', () => {
  const r = contarTexto('');
  assert.equal(r.caracteres, 0);
  assert.equal(r.palavras, 0);
  assert.equal(r.frases, 0);
  assert.equal(r.parágrafos, 0);
  assert.equal(r.linhas, 0);
  assert.equal(r.segundosDeLeitura, 0);
  assert.equal(r.palavrasPorFrase, 0);
});

test('acento não vira dois caracteres e espaços saem da contagem sem espaço', () => {
  assert.equal(contarTexto('ação').caracteres, 4);
  const comEspaço = contarTexto('a b c');
  assert.equal(comEspaço.caracteres, 5);
  assert.equal(comEspaço.caracteresSemEspaço, 3);
});

test('emoji composto conta como um caractere', () => {
  assert.equal(contarTexto('👨‍👩‍👧 ok').caracteres, 4); // emoji + espaço + o + k
});

test('só espaços em branco não formam parágrafo nem palavra', () => {
  const r = contarTexto('   \n\n   ');
  assert.equal(r.parágrafos, 0);
  assert.equal(r.palavras, 0);
});

test('tempo de leitura e de fala saem das palavras', () => {
  const texto = Array.from({ length: 200 }, () => 'palavra').join(' ');
  const r = contarTexto(texto);
  assert.equal(r.palavras, 200);
  assert.equal(r.segundosDeLeitura, 60);
  assert.equal(r.segundosDeFala, 92); // 200 / 130 minutos
  assert.equal(PALAVRAS_POR_MINUTO_DE_LEITURA, 200);
  assert.equal(PALAVRAS_POR_MINUTO_DE_FALA, 130);
});

test('média de palavras por frase', () => {
  const r = contarTexto('Uma frase curta. Outra frase aqui.');
  assert.equal(r.frases, 2);
  assert.equal(r.palavrasPorFrase, 3);
});

test('duração vira minutos e segundos', () => {
  assert.equal(formatarDuração(0), '0:00');
  assert.equal(formatarDuração(12), '0:12');
  assert.equal(formatarDuração(185), '3:05');
  assert.equal(formatarDuração(-4), '0:00');
  assert.equal(formatarDuração(Number.NaN), '0:00');
});

/* ------------------------------------------------------ só do portal */

test('linhas contam quebras de qualquer sistema e espaço nas pontas conta como caractere', () => {
  assert.equal(contarTexto('a\r\nb\rc\nd').linhas, 4);
  assert.equal(contarTexto('  oi  ').caracteres, 6);
  assert.equal(contarCaracteres('ação'.normalize('NFD')), 4);
});

test('SMS: alfabeto básico leva 160 e emenda partes de 153', () => {
  assert.deepEqual(medirSms(''), { codificação: 'gsm', usados: 0, limite: 160, partes: 0 });
  assert.deepEqual(medirSms('Bom dia'), { codificação: 'gsm', usados: 7, limite: 160, partes: 1 });
  assert.equal(medirSms('a'.repeat(160)).partes, 1);
  assert.equal(medirSms('a'.repeat(161)).partes, 2);
  assert.equal(medirSms('a'.repeat(306)).partes, 2);
  assert.equal(medirSms('a'.repeat(307)).partes, 3);
});

test('SMS: ã, ç minúsculo e emoji obrigam o limite de 70; é e Ç cabem no básico', () => {
  assert.equal(medirSms('Olá').codificação, 'unicode');
  assert.equal(medirSms('ação').codificação, 'unicode');
  assert.equal(medirSms('café É Ç').codificação, 'gsm');
  const emoji = medirSms('ok 😀');
  assert.equal(emoji.codificação, 'unicode');
  assert.equal(emoji.usados, 5); // o emoji ocupa duas posições de 16 bits
  assert.equal(medirSms('á'.repeat(70)).partes, 1);
  assert.equal(medirSms('á'.repeat(71)).partes, 2);
  assert.equal(medirSms('á'.repeat(135)).partes, 3);
});

test('SMS: caracteres da tabela de extensão ocupam duas posições', () => {
  assert.equal(medirSms('10€').usados, 4);
  assert.equal(medirSms('[ok]').usados, 6);
  assert.equal(medirSms('{'.repeat(80)).partes, 1);
  assert.equal(medirSms('{'.repeat(81)).partes, 2);
});

test('limites de destino e situação', () => {
  assert.deepEqual(LIMITES_DE_DESTINO.map((l) => l.máximo), [280, 160, 60]);
  assert.deepEqual(situaçãoNoLimite(50, 60), { cabe: true, restam: 10, passou: 0 });
  assert.deepEqual(situaçãoNoLimite(60, 60), { cabe: true, restam: 0, passou: 0 });
  assert.deepEqual(situaçãoNoLimite(75, 60), { cabe: false, restam: 0, passou: 15 });
});

test('prévia corta por caractere visível, nunca no meio do emoji', () => {
  assert.equal(préviaDoTexto('curto', 10), 'curto');
  assert.equal(préviaDoTexto('abcdef', 3), 'abc…');
  assert.equal(préviaDoTexto('😀😀😀', 2), '😀😀…');
  assert.equal(préviaDoTexto('👨‍👩‍👧x', 1), '👨‍👩‍👧…');
});

test('os números do exemplo de "Como usar" são os que a ferramenta calcula', () => {
  const r = contarTexto(TEXTO_DE_EXEMPLO);
  assert.equal(r.palavras, 32);
  assert.equal(r.caracteres, 184);
  assert.equal(r.frases, 4);
  assert.equal(r.parágrafos, 2);
  assert.equal(formatarDuração(r.segundosDeLeitura), '0:10');
  assert.equal(formatarDuração(r.segundosDeFala), '0:15');
  assert.deepEqual(medirSms(TEXTO_DE_EXEMPLO), { codificação: 'unicode', usados: 184, limite: 70, partes: 3 });

  const exemplo = ferramenta.instruções.exemplo.texto;
  for (const trecho of ['32 palavras', '184 caracteres', '4 frases', '2 parágrafos', '0:10', '0:15', '70 caracteres', '3 mensagens']) {
    assert.ok(exemplo.includes(trecho), `o exemplo deveria citar "${trecho}"`);
  }
});

test('o limite declarado em "Como usar" é o mesmo que a ferramenta aplica', () => {
  assert.ok(ferramenta.instruções.limites.includes(LIMITE_DE_CARACTERES.toLocaleString('pt-BR')));
});

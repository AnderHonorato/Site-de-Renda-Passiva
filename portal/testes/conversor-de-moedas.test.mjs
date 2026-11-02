import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converterMoedas, calcularCambioNaTela } from '../scripts/ferramentas/conversor-de-moedas.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base = { valor: '100,00', origem: 'USD', destino: 'BRL', cotacao: '5,30', tarifa: '10' };
test('câmbio usa taxa manual e desconta tarifa na moeda destino', () => {
  const r = converterMoedas({ valor: 100, origem: 'USD', destino: 'BRL', cotacao: 5.3, tarifa: 10 });
  assert.equal(r.bruto, 530);
  assert.equal(r.liquido, 520);
  const tela = calcularCambioNaTela(base);
  assert.match(tela.valor, /BRL.*520,00/);
  assert.match(tela.texto, /1 USD = 5,3 BRL/);
});
test('cotação pequena e taxa fracionada não são truncadas silenciosamente', () => {
  const r = converterMoedas({ valor: 100, origem: 'BRL', destino: 'USD', cotacao: 0.19, tarifa: 0.5 });
  assert.equal(r.liquido, 18.5);
});
test('câmbio não aceita moeda idêntica nem taxa zerada/negativa', () => {
  for (const [chave, dado, campo] of [
    ['destino', 'USD', 'destino'], ['cotacao', '0', 'cotacao'],
    ['valor', '0', 'valor'], ['tarifa', '-1', 'tarifa'],
  ]) assert.throws(() => calcularCambioNaTela({ ...base, [chave]: dado }),
    (erro) => erro instanceof ErroDeEntrada && erro.campo === campo);
});
test('câmbio não afirma possuir cotação ao vivo', () => {
  const r = calcularCambioNaTela(base);
  assert.match(r.observações[0], /manual/);
  assert.match(r.observações[1], /IOF/);
});

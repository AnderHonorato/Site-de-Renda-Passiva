import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPapelQuadriculado, CORES_DE_LINHA } from '../scripts/cálculos/calcular-papel-quadriculado.js';
import { validarPapelQuadriculadoSalvo } from '../scripts/validação/validar-papel-quadriculado-salvo.js';

test('o quadrado de calibração mede sempre 10 mm, qualquer que seja o tamanho da quadrícula', () => {
  for (const tamanhoDaQuadrículaMm of [2, 5, 8, 12.5, 20]) {
    const folha = calcularPapelQuadriculado({ tamanhoDaQuadrículaMm, margemMm: 10 });
    assert.equal(folha.válido, true);
    assert.equal(folha.tamanhoDaCalibraçãoMm, 10);
  }
});

test('a grade cabe inteiramente dentro da área útil (dentro das margens)', () => {
  const folha = calcularPapelQuadriculado({ tamanhoDaQuadrículaMm: 5, margemMm: 15, comCabeçalho: true });
  assert.equal(folha.válido, true);
  assert.ok(folha.xInicialMm >= folha.margemMm - 0.001);
  assert.ok(folha.xInicialMm + folha.larguraGradeMm <= folha.larguraPáginaMm - folha.margemMm + 0.001);
  assert.ok(folha.yInicialMm + folha.alturaGradeMm <= folha.alturaPáginaMm - folha.margemMm + 0.001);
  assert.equal(folha.larguraGradeMm, folha.colunas * folha.tamanhoDaQuadrículaMm);
  assert.equal(folha.alturaGradeMm, folha.linhas * folha.tamanhoDaQuadrículaMm);
});

test('o quadrado de calibração fica dentro da área da grade', () => {
  const folha = calcularPapelQuadriculado({ tamanhoDaQuadrículaMm: 5, margemMm: 10 });
  assert.ok(folha.calibraçãoXMm >= folha.xInicialMm - 0.001);
  assert.ok(folha.calibraçãoXMm + folha.tamanhoDaCalibraçãoMm <= folha.xInicialMm + folha.larguraGradeMm + 0.001);
  assert.ok(folha.calibraçãoYMm >= folha.yInicialMm - 0.001);
  assert.ok(folha.calibraçãoYMm + folha.tamanhoDaCalibraçãoMm <= folha.yInicialMm + folha.alturaGradeMm + 0.001);
});

test('a mesma configuração é sempre determinística (mesma geometria)', () => {
  const opções = { tamanhoDaQuadrículaMm: 5, margemMm: 12, corDaLinha: 'azul', comCabeçalho: true };
  assert.deepEqual(calcularPapelQuadriculado(opções), calcularPapelQuadriculado(opções));
});

test('rejeita quadrícula ou margem fora da faixa, e cor de linha desconhecida', () => {
  assert.equal(calcularPapelQuadriculado({ tamanhoDaQuadrículaMm: 1, margemMm: 10 }).válido, false);
  assert.equal(calcularPapelQuadriculado({ tamanhoDaQuadrículaMm: 25, margemMm: 10 }).válido, false);
  assert.equal(calcularPapelQuadriculado({ tamanhoDaQuadrículaMm: 5, margemMm: 2 }).válido, false);
  assert.equal(calcularPapelQuadriculado({ tamanhoDaQuadrículaMm: 5, margemMm: 10, corDaLinha: 'roxo' }).válido, false);
});

test('todas as cores de linha declaradas existem no mapa CORES_DE_LINHA', () => {
  for (const chave of ['cinza', 'azul', 'verde']) assert.ok(Object.hasOwn(CORES_DE_LINHA, chave));
});

test('validador de papel quadriculado salvo recusa dados adulterados', () => {
  const válido = { nome: 'Quadriculado 5 mm', tamanhoDaQuadrículaMm: 5, margemMm: 10, corDaLinha: 'cinza', comCabeçalho: false, tituloDaAtividade: '' };
  assert.equal(validarPapelQuadriculadoSalvo(válido), true);
  assert.equal(validarPapelQuadriculadoSalvo({ ...válido, corDaLinha: 'roxo' }), false);
  assert.equal(validarPapelQuadriculadoSalvo({ ...válido, margemMm: 100 }), false);
  assert.equal(validarPapelQuadriculadoSalvo(null), false);
});

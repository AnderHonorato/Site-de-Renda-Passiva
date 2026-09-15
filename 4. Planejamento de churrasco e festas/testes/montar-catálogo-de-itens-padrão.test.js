import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarCatálogoDeItensPadrão } from '../scripts/cálculos/montar-catálogo-de-itens-padrão.js';
import { calcularPlanoDeConsumo } from '../scripts/cálculos/calcular-plano-de-consumo.js';

const CAMPOS_OBRIGATÓRIOS = ['chave', 'descrição', 'grupo', 'categoriaDePúblico', 'unidadeBase', 'quantidadePorAdulto'];

for (const perfil of ['churrasco', 'festa-infantil', 'almoço']) {
  test(`catálogo de "${perfil}" tem itens completos e chaves únicas`, () => {
    const itens = montarCatálogoDeItensPadrão(perfil);
    assert.ok(itens.length >= 5, 'cada perfil precisa de um catálogo com vários itens');
    const chaves = new Set();
    for (const item of itens) {
      for (const campo of CAMPOS_OBRIGATÓRIOS) assert.ok(campo in item, `item sem campo ${campo}`);
      assert.ok(!chaves.has(item.chave), `chave repetida: ${item.chave}`);
      chaves.add(item.chave);
      assert.ok(item.quantidadePorAdulto > 0);
    }
  });

  test(`catálogo de "${perfil}" produz um plano válido com valores padrão`, () => {
    const resultado = calcularPlanoDeConsumo({
      adultos: 10, crianças: 4, duraçãoEmHoras: 4, apetite: 'médio',
      vegetarianos: 1, semCarneVermelha: 1, adultosComConsumoDeÁlcool: 3,
      itens: montarCatálogoDeItensPadrão(perfil),
    });
    assert.equal(resultado.válido, true);
  });
}

test('perfil desconhecido retorna catálogo vazio, sem lançar erro', () => {
  assert.deepEqual(montarCatálogoDeItensPadrão('inexistente'), []);
});

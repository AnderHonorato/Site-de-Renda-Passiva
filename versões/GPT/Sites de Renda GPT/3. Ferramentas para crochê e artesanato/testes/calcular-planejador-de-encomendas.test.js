import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPlanejadorDeEncomendas } from '../scripts/cálculos/calcular-planejador-de-encomendas.js';

const SEG_A_SEX = [false, true, true, true, true, true, false]; // domingo=0 ... sábado=6

test('caso de conferência do prompt: 5 peças de 2 h, capacidade 2 h/dia = 5 dias produtivos', () => {
  const resultado = calcularPlanejadorDeEncomendas({
    quantidadeDePeças: 5,
    horasPorPeça: 2,
    capacidadeHorasPorDia: 2,
    diasDaSemanaTrabalhados: SEG_A_SEX,
    dataDeInício: '2026-09-14', // segunda-feira
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.horasTotais, 10);
  assert.equal(resultado.diasProdutivosNecessários, 5);
  assert.equal(resultado.dataEstimadaDeEntrega, '2026-09-18'); // sexta-feira seguinte
});

test('pula fins de semana ao contar dias produtivos', () => {
  const resultado = calcularPlanejadorDeEncomendas({
    quantidadeDePeças: 3,
    horasPorPeça: 2,
    capacidadeHorasPorDia: 2,
    diasDaSemanaTrabalhados: SEG_A_SEX,
    dataDeInício: '2026-09-18', // sexta-feira: só 1 dia útil essa semana
  });
  // sexta (18), depois pula sáb/dom, seg(21), ter(22) → 3º dia produtivo
  assert.equal(resultado.dataEstimadaDeEntrega, '2026-09-22');
});

test('rejeita capacidade zero, nenhum dia selecionado e data inválida', () => {
  assert.equal(calcularPlanejadorDeEncomendas({ quantidadeDePeças: 1, horasPorPeça: 2, capacidadeHorasPorDia: 0, diasDaSemanaTrabalhados: SEG_A_SEX, dataDeInício: '2026-09-14' }).válido, false);
  assert.equal(calcularPlanejadorDeEncomendas({ quantidadeDePeças: 1, horasPorPeça: 2, capacidadeHorasPorDia: 2, diasDaSemanaTrabalhados: [false, false, false, false, false, false, false], dataDeInício: '2026-09-14' }).válido, false);
  assert.equal(calcularPlanejadorDeEncomendas({ quantidadeDePeças: 1, horasPorPeça: 2, capacidadeHorasPorDia: 2, diasDaSemanaTrabalhados: SEG_A_SEX, dataDeInício: '31/09/2026' }).válido, false);
});

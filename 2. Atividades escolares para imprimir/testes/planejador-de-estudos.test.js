import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarPlanejadorDeEstudos, DIAS_DA_SEMANA } from '../scripts/cálculos/montar-planejador-de-estudos.js';
import { validarPlanejadorDeEstudosSalvo } from '../scripts/validação/validar-planejador-de-estudos-salvo.js';

test('2 disciplinas de 30 min somam 60 min de estudo por dia, sem contar pausas', () => {
  const disciplinas = [
    { nome: 'Matemática', minutosPorSessão: 30 },
    { nome: 'Português', minutosPorSessão: 30 },
  ];
  const resultado = montarPlanejadorDeEstudos({ disciplinas, pausaMinutos: 5, diasDaSemana: ['segunda'] });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.minutosDeEstudoPorDia, 60);
  assert.equal(resultado.minutosDePausaPorDia, 5);
  assert.equal(resultado.minutosTotaisPorDia, 65);
});

test('a pausa nunca aparece depois da última sessão do dia', () => {
  const disciplinas = [
    { nome: 'Matemática', minutosPorSessão: 20 },
    { nome: 'Português', minutosPorSessão: 20 },
    { nome: 'Ciências', minutosPorSessão: 20 },
  ];
  const resultado = montarPlanejadorDeEstudos({ disciplinas, pausaMinutos: 10, diasDaSemana: ['segunda'] });
  assert.equal(resultado.blocosDoDia.at(-1).tipo, 'sessão');
  const pausas = resultado.blocosDoDia.filter((bloco) => bloco.tipo === 'pausa');
  assert.equal(pausas.length, 2);
});

test('sem pausa (0 min), a grade não tem blocos de pausa', () => {
  const disciplinas = [
    { nome: 'Matemática', minutosPorSessão: 20 },
    { nome: 'Português', minutosPorSessão: 20 },
  ];
  const resultado = montarPlanejadorDeEstudos({ disciplinas, pausaMinutos: 0, diasDaSemana: ['segunda'] });
  assert.equal(resultado.blocosDoDia.every((bloco) => bloco.tipo === 'sessão'), true);
  assert.equal(resultado.minutosDePausaPorDia, 0);
});

test('o total da semana multiplica o total do dia pela quantidade de dias escolhidos', () => {
  const disciplinas = [{ nome: 'Matemática', minutosPorSessão: 40 }];
  const resultado = montarPlanejadorDeEstudos({ disciplinas, pausaMinutos: 5, diasDaSemana: ['segunda', 'quarta', 'sexta'] });
  assert.equal(resultado.minutosDeEstudoPorSemana, 40 * 3);
  assert.equal(resultado.minutosTotaisPorSemana, resultado.minutosTotaisPorDia * 3);
});

test('os dias escolhidos saem sempre na ordem da semana, mesmo se digitados fora de ordem', () => {
  const disciplinas = [{ nome: 'Matemática', minutosPorSessão: 30 }];
  const resultado = montarPlanejadorDeEstudos({ disciplinas, diasDaSemana: ['sexta', 'segunda', 'quarta'] });
  assert.deepEqual(resultado.diasDaSemana, ['segunda', 'quarta', 'sexta']);
});

test('recusa lista vazia de disciplinas, dia nenhum escolhido, ou minutos fora da faixa', () => {
  assert.equal(montarPlanejadorDeEstudos({ disciplinas: [], diasDaSemana: ['segunda'] }).válido, false);
  assert.equal(montarPlanejadorDeEstudos({ disciplinas: [{ nome: 'Matemática', minutosPorSessão: 30 }], diasDaSemana: [] }).válido, false);
  assert.equal(montarPlanejadorDeEstudos({ disciplinas: [{ nome: 'Matemática', minutosPorSessão: 1 }], diasDaSemana: ['segunda'] }).válido, false);
});

test('não promete nenhum resultado escolar: o resultado não tem nenhum campo de nota, aprovação ou desempenho', () => {
  const resultado = montarPlanejadorDeEstudos({ disciplinas: [{ nome: 'Matemática', minutosPorSessão: 30 }], diasDaSemana: ['segunda'] });
  for (const chave of Object.keys(resultado)) assert.doesNotMatch(chave.toLowerCase(), /aprova|nota|desempenho|sucesso/);
});

test('a mesma entrada é sempre determinística (mesma grade)', () => {
  const opções = { disciplinas: [{ nome: 'Matemática', minutosPorSessão: 30 }], pausaMinutos: 5, diasDaSemana: ['segunda', 'terça'] };
  assert.deepEqual(montarPlanejadorDeEstudos(opções), montarPlanejadorDeEstudos(opções));
});

test('todos os dias válidos estão em DIAS_DA_SEMANA e são aceitos', () => {
  for (const dia of DIAS_DA_SEMANA) {
    const resultado = montarPlanejadorDeEstudos({ disciplinas: [{ nome: 'Matemática', minutosPorSessão: 30 }], diasDaSemana: [dia] });
    assert.equal(resultado.válido, true);
  }
});

test('validador de planejador salvo recusa dados adulterados', () => {
  const válido = { nome: 'Semana padrão', disciplinas: [{ nome: 'Matemática', minutosPorSessão: 30 }], pausaMinutos: 5, diasDaSemana: ['segunda'], tituloDaAtividade: '' };
  assert.equal(validarPlanejadorDeEstudosSalvo(válido), true);
  assert.equal(validarPlanejadorDeEstudosSalvo({ ...válido, diasDaSemana: ['feriado'] }), false);
  assert.equal(validarPlanejadorDeEstudosSalvo({ ...válido, disciplinas: [] }), false);
  assert.equal(validarPlanejadorDeEstudosSalvo(null), false);
});

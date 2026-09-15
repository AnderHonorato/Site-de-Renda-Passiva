import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverOperaçãoMatemática } from '../scripts/cálculos/resolver-operação-matemática.js';
import { gerarListaDeOperações } from '../scripts/cálculos/gerar-lista-de-operações.js';
import { validarOperaçõesSalvas } from '../scripts/validação/validar-operações-salvas.js';

test('resolverOperaçãoMatemática calcula as quatro operações corretamente', () => {
  assert.equal(resolverOperaçãoMatemática({ operandoA: 7, operandoB: 5, operador: '+' }).resposta, 12);
  assert.equal(resolverOperaçãoMatemática({ operandoA: 7, operandoB: 5, operador: '−' }).resposta, 2);
  assert.equal(resolverOperaçãoMatemática({ operandoA: 7, operandoB: 5, operador: '×' }).resposta, 35);
  const divisão = resolverOperaçãoMatemática({ operandoA: 17, operandoB: 5, operador: '÷' });
  assert.equal(divisão.resposta, 3);
  assert.equal(divisão.resto, 2);
});

test('resolverOperaçãoMatemática rejeita divisão por zero e operador desconhecido', () => {
  assert.throws(() => resolverOperaçãoMatemática({ operandoA: 1, operandoB: 0, operador: '÷' }));
  assert.throws(() => resolverOperaçãoMatemática({ operandoA: 1, operandoB: 1, operador: '%' }));
});

test('todas as respostas geradas conferem com resolverOperaçãoMatemática, independente do gerador', () => {
  const lista = gerarListaDeOperações({ operadores: ['+', '−', '×', '÷'], quantidade: 60, mínimo: 0, máximo: 50, semente: 123 });
  assert.equal(lista.válido, true);
  for (const operação of lista.operações) {
    const conferência = resolverOperaçãoMatemática({ operandoA: operação.operandoA, operandoB: operação.operandoB, operador: operação.operador });
    assert.equal(operação.resposta, conferência.resposta);
    if (operação.operador === '÷') assert.equal(operação.resto, conferência.resto);
  }
});

test('divisão exata nunca sobra resto: dividendo vem de quociente × divisor', () => {
  const lista = gerarListaDeOperações({ operadores: ['÷'], quantidade: 40, mínimo: 1, máximo: 12, divisão: 'exata', semente: 5 });
  assert.equal(lista.válido, true);
  for (const operação of lista.operações) {
    assert.equal(operação.resto, 0);
    assert.equal(operação.operandoA, operação.operandoB * operação.resposta);
  }
});

test('divisão com resto pode sobrar, mas o resto sempre confere', () => {
  const lista = gerarListaDeOperações({ operadores: ['÷'], quantidade: 60, mínimo: 1, máximo: 30, divisão: 'comResto', semente: 8 });
  assert.equal(lista.válido, true);
  for (const operação of lista.operações) {
    assert.equal(operação.operandoA, operação.operandoB * operação.resposta + operação.resto);
    assert.ok(operação.resto >= 0 && operação.resto < operação.operandoB);
  }
});

test('sem permitir negativos, a subtração nunca dá resultado negativo', () => {
  const lista = gerarListaDeOperações({ operadores: ['−'], quantidade: 80, mínimo: 0, máximo: 40, permitirNegativos: false, semente: 3 });
  assert.equal(lista.válido, true);
  for (const operação of lista.operações) assert.ok(operação.resposta >= 0, `resultado negativo: ${operação.operandoA} − ${operação.operandoB}`);
});

test('permitindo negativos, a subtração pode dar resultado negativo', () => {
  const lista = gerarListaDeOperações({ operadores: ['−'], quantidade: 200, mínimo: 0, máximo: 20, permitirNegativos: true, semente: 33 });
  assert.equal(lista.válido, true);
  assert.ok(lista.operações.some((operação) => operação.resposta < 0));
});

test('a mesma semente e as mesmas opções reproduzem exatamente a mesma folha', () => {
  const opções = { operadores: ['+', '×'], quantidade: 15, mínimo: 2, máximo: 30, semente: 77 };
  const primeira = gerarListaDeOperações(opções);
  const segunda = gerarListaDeOperações(opções);
  assert.deepEqual(primeira.operações, segunda.operações);
});

test('sementes diferentes tendem a gerar folhas diferentes', () => {
  const base = { operadores: ['+', '−', '×'], quantidade: 20, mínimo: 0, máximo: 100 };
  const primeira = gerarListaDeOperações({ ...base, semente: 1 });
  const segunda = gerarListaDeOperações({ ...base, semente: 2 });
  assert.notDeepEqual(primeira.operações, segunda.operações);
});

test('reserva "exigir" e "evitar" respeitam a regra da soma quando é possível satisfazer', () => {
  const comReserva = gerarListaDeOperações({ operadores: ['+'], quantidade: 30, mínimo: 5, máximo: 90, reserva: 'exigir', semente: 21 });
  const semReserva = gerarListaDeOperações({ operadores: ['+'], quantidade: 30, mínimo: 5, máximo: 90, reserva: 'evitar', semente: 21 });
  const precisaReserva = (a, b) => String(a % 10 + (b % 10)).length > 1 || (a % 10) + (b % 10) >= 10;
  assert.ok(comReserva.operações.filter((operação) => precisaReserva(operação.operandoA, operação.operandoB)).length > 0);
  assert.ok(semReserva.operações.filter((operação) => !precisaReserva(operação.operandoA, operação.operandoB)).length > 0);
});

test('validação de entradas: operador vazio, quantidade e intervalo inválidos', () => {
  assert.equal(gerarListaDeOperações({ operadores: [], quantidade: 5, mínimo: 0, máximo: 10 }).válido, false);
  assert.equal(gerarListaDeOperações({ operadores: ['+'], quantidade: 0, mínimo: 0, máximo: 10 }).válido, false);
  assert.equal(gerarListaDeOperações({ operadores: ['+'], quantidade: 5, mínimo: 10, máximo: 5 }).válido, false);
  assert.equal(gerarListaDeOperações({ operadores: ['+'], quantidade: 5, mínimo: 0, máximo: 10, reserva: 'talvez' }).válido, false);
});

test('validador de registro salvo recusa dados adulterados', () => {
  const válido = {
    nome: 'Soma até 20',
    operadores: ['+'],
    quantidade: 10,
    mínimo: 0,
    máximo: 20,
    permitirNegativos: false,
    reserva: 'indiferente',
    divisão: 'exata',
    apresentação: 'linha',
    semente: 42,
    comCabeçalho: true,
    tituloDaAtividade: 'Adição',
  };
  assert.equal(validarOperaçõesSalvas(válido), true);
  assert.equal(validarOperaçõesSalvas({ ...válido, operadores: ['%'] }), false);
  assert.equal(validarOperaçõesSalvas({ ...válido, mínimo: 30 }), false);
  assert.equal(validarOperaçõesSalvas({ ...válido, reserva: '<script>' }), false);
  assert.equal(validarOperaçõesSalvas({ ...válido, apresentação: 'diagonal' }), false);
  assert.equal(validarOperaçõesSalvas(null), false);
});

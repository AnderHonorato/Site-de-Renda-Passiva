import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, buscarFerramentas } from '../../frontend/compartilhado/compartilhado-busca.js';

test('normalizar tira acento e coloca em minúsculas', () => {
  assert.equal(normalizar('Preço de Venda'), 'preco de venda');
  assert.equal(normalizar('AÇÃO'), 'acao');
});

test('normalizar apara espaço nas pontas', () => {
  assert.equal(normalizar('  Olá  '), 'ola');
});

const listaDeExemplo = [
  {
    slug: 'contador-de-texto',
    nome: 'Contador de texto',
    intencoes: ['contar palavras', 'contar caracteres'],
    etiquetas: ['texto', 'leitura'],
    descricao: 'Conta caracteres, palavras, frases e parágrafos.',
  },
  {
    slug: 'preco-de-venda',
    nome: 'Preço de venda',
    intencoes: ['quanto cobrar', 'calcular preço'],
    etiquetas: ['margem', 'markup'],
    descricao: 'Preço mínimo, preço com margem e quanto sobra por venda.',
  },
  {
    slug: 'ponto-de-equilibrio',
    nome: 'Ponto de equilíbrio',
    intencoes: ['quanto preciso vender'],
    etiquetas: ['custos fixos'],
    descricao: 'Quantidade e receita para cobrir os custos fixos do mês.',
  },
];

test('buscarFerramentas("quanto cobrar") encontra preco-de-venda', () => {
  const resultado = buscarFerramentas(listaDeExemplo, 'quanto cobrar');
  assert.ok(resultado.some((ferramenta) => ferramenta.slug === 'preco-de-venda'));
  assert.equal(resultado[0].slug, 'preco-de-venda');
});

test('buscarFerramentas ignora acento e caixa na consulta', () => {
  const resultado = buscarFerramentas(listaDeExemplo, 'PREÇO');
  assert.ok(resultado.some((ferramenta) => ferramenta.slug === 'preco-de-venda'));
});

test('buscarFerramentas exige que toda palavra case em algum campo', () => {
  const resultado = buscarFerramentas(listaDeExemplo, 'quanto vender girafa');
  assert.equal(resultado.length, 0);
});

test('buscarFerramentas com consulta vazia devolve lista vazia', () => {
  assert.deepEqual(buscarFerramentas(listaDeExemplo, '   '), []);
});

test('buscarFerramentas prioriza casamento no nome sobre a descrição', () => {
  const resultado = buscarFerramentas(listaDeExemplo, 'venda');
  assert.equal(resultado[0].slug, 'preco-de-venda');
});

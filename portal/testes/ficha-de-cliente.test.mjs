import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITE_CLIENTES, ErroFicha, validarCamposFicha, validarListaFichas,
  guardarFicha, apagarFicha, pesquisarFichas, criarBackupFicha, importarBackupFicha,
} from '../scripts/cálculos/ficha-de-cliente.js';

const data = '2026-11-02T15:00:00.000Z';
const depois = '2026-11-02T17:00:00.000Z';
const id1 = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const origem = { nome: 'João Silva', contato: 'joao@example.com',
  historico: '02/11/2026: 1 compra de material', observacoes: 'Retornar contato' };
const criar = (lista, dados, id = id1) => guardarFicha(lista, dados, { agora: data, novoId: () => id });

test('cadastra cliente com identificador único e datas sem alterar a lista original', () => {
  const entrada = [];
  const r = criar(entrada, origem);
  assert.equal(entrada.length, 0);
  assert.equal(r.clientes.length, 1);
  assert.equal(r.cliente.id, id1);
  assert.equal(r.cliente.criadoEm, data);
  assert.equal(r.editado, false);
});

test('edita sem trocar identidade/data de criação e preserva histórico escolhido', () => {
  const inicial = criar([], origem).clientes;
  const r = guardarFicha(inicial, { ...origem, nome: 'João Atualizado' }, { id: id1, agora: depois });
  assert.equal(r.editado, true);
  assert.equal(r.cliente.nome, 'João Atualizado');
  assert.equal(r.cliente.criadoEm, data);
  assert.equal(r.cliente.atualizadoEm, depois);
  assert.equal(inicial[0].nome, 'João Silva');
});

test('busca por nome, contato e histórico com acento indiferente', () => {
  const a = criar([], origem).clientes;
  const b = criar(a, { nome: 'Ana Costa', contato: 'ana@example.com', historico: 'Comprou caixa', observacoes: '' }, id2).clientes;
  assert.equal(pesquisarFichas(b, 'joao')[0].id, id1);
  assert.equal(pesquisarFichas(b, 'CAIXA')[0].id, id2);
  assert.equal(pesquisarFichas(b, 'example.com').length, 2);
  assert.equal(pesquisarFichas(b, 'nao existe').length, 0);
});

test('exclusão individual remove somente a ficha indicada', () => {
  const a = criar([], origem).clientes;
  const b = criar(a, { ...origem, nome: 'Ana' }, id2).clientes;
  const removidos = apagarFicha(b, id1);
  assert.deepEqual(removidos.map((x) => x.id), [id2]);
  assert.equal(b.length, 2);
  assert.throws(() => apagarFicha(removidos, id1), ErroFicha);
});

test('backup JSON restaurável guarda registros e descarta propriedades desconhecidas', () => {
  const b = criarBackupFicha(criar([], origem).clientes, depois);
  assert.equal(b.versao, 1);
  assert.deepEqual(importarBackupFicha(JSON.parse(JSON.stringify(b))), b.clientes);
  const acrescentado = { ...b, clientes: [{ ...b.clientes[0], admin: true, __extra: 'ignore' }], config: { admin: true } };
  assert.deepEqual(importarBackupFicha(acrescentado), b.clientes);
});

test('backup rejeita versões erradas, IDs duplicados, campos não textuais e datas falsas', () => {
  const b = criarBackupFicha(criar([], origem).clientes, depois);
  const inválidos = [
    { ...b, versao: 3 },
    { ...b, clientes: [b.clientes[0], b.clientes[0]] },
    { ...b, clientes: [{ ...b.clientes[0], contato: { perigoso: true } }] },
    { ...b, clientes: [{ ...b.clientes[0], criadoEm: 'ontem' }] },
    { ...b, geradoEm: '2026/11/02' },
    { ...b, clientes: null },
  ];
  for (const x of inválidos) assert.throws(() => importarBackupFicha(x), ErroFicha);
});

test('recusa textos excessivos e nomes vazios com indicação do campo', () => {
  const casos = [
    [{ ...origem, nome: ' ' }, 'nome'],
    [{ ...origem, contato: 'x'.repeat(181) }, 'contato'],
    [{ ...origem, historico: 'x'.repeat(1201) }, 'historico'],
    [{ ...origem, observacoes: 'x'.repeat(1201) }, 'observacoes'],
  ];
  for (const [dados, campo] of casos) assert.throws(() => validarCamposFicha(dados),
    (e) => e instanceof ErroFicha && e.campo === campo);
});

test('limite impede que cadastro cresça sem controle no armazenamento local', () => {
  const b = criar([], origem).clientes[0];
  const lotado = Array.from({ length: LIMITE_CLIENTES }, (_, i) => ({
    ...b, id: (i + 1).toString(16).padStart(8, '0') + '-1111-4111-8111-111111111111',
  }));
  assert.equal(validarListaFichas(lotado).length, LIMITE_CLIENTES);
  assert.throws(() => criar(lotado, origem, id2), /Limite/);
  assert.throws(() => validarListaFichas([...lotado, b]), /até 250/);
});

test('impede IDs repetidos e edição de cliente não existente', () => {
  const b = criar([], origem).clientes;
  assert.throws(() => criar(b, origem, id1), /identificador seguro/);
  assert.throws(() => guardarFicha(b, origem, { id: id2, agora: depois }), /não encontrado/);
});

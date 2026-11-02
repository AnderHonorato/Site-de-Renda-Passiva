import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarJsonSeguro } from '../scripts/armazenamento/analisar-json-seguro.js';
import { criarArmazenamento } from '../scripts/armazenamento/criar-armazenamento.js';
import { duplicarRegistroLocal } from '../scripts/armazenamento/duplicar-registro-local.js';
import { excluirRegistroLocal } from '../scripts/armazenamento/excluir-registro-local.js';
import { exportarCópiaLocal } from '../scripts/armazenamento/exportar-cópia-local.js';
import { importarCópiaLocal } from '../scripts/armazenamento/importar-cópia-local.js';
import { lerRegistroLocal } from '../scripts/armazenamento/ler-registro-local.js';
import { listarRegistrosLocais } from '../scripts/armazenamento/listar-registros-locais.js';
import { salvarRegistroLocal } from '../scripts/armazenamento/salvar-registro-local.js';

class ArmazenamentoEmMemória {
  #dados = new Map();
  get length() {
    return this.#dados.size;
  }
  key(índice) {
    return [...this.#dados.keys()][índice] ?? null;
  }
  getItem(chave) {
    return this.#dados.has(chave) ? this.#dados.get(chave) : null;
  }
  setItem(chave, valor) {
    this.#dados.set(chave, String(valor));
  }
  removeItem(chave) {
    this.#dados.delete(chave);
  }
}

class ArmazenamentoBloqueado {
  getItem() {
    throw new Error('bloqueado');
  }
  setItem() {
    throw new Error('bloqueado');
  }
  removeItem() {
    throw new Error('bloqueado');
  }
}

const coleçõesLocais = [
  { chave: 'receitas', rótulo: 'Receitas', validar: (registro) => typeof registro.nome === 'string' && registro.nome.length <= 120 },
];

function novoArmazenamento(prefixo = 'produto-a') {
  return criarArmazenamento({ prefixo, armazenamento: new ArmazenamentoEmMemória() });
}

test('salva, lista, lê, duplica e exclui registros locais', () => {
  const armazenamento = novoArmazenamento();
  const primeiro = salvarRegistroLocal('receitas', { nome: 'Brigadeiro' }, { armazenamento, agora: new Date('2026-09-14T10:00:00Z') });
  assert.equal(primeiro.salvo, true);
  assert.ok(primeiro.registro.id);
  const editado = salvarRegistroLocal('receitas', { ...primeiro.registro, nome: 'Brigadeiro gourmet' }, { armazenamento, agora: new Date('2026-09-14T11:00:00Z') });
  assert.equal(editado.registro.id, primeiro.registro.id);
  assert.equal(editado.registro.criadoEm, primeiro.registro.criadoEm);
  assert.equal(listarRegistrosLocais('receitas', { armazenamento }).length, 1);
  const cópia = duplicarRegistroLocal('receitas', primeiro.registro.id, { armazenamento, agora: new Date('2026-09-14T12:00:00Z') });
  assert.equal(cópia.registro.nome, 'Brigadeiro gourmet (cópia)');
  assert.notEqual(cópia.registro.id, primeiro.registro.id);
  assert.equal(listarRegistrosLocais('receitas', { armazenamento })[0].id, cópia.registro.id);
  assert.equal(lerRegistroLocal('receitas', primeiro.registro.id, { armazenamento }).nome, 'Brigadeiro gourmet');
  assert.equal(excluirRegistroLocal('receitas', primeiro.registro.id, { armazenamento }), true);
  assert.equal(excluirRegistroLocal('receitas', 'inexistente', { armazenamento }), false);
  assert.equal(listarRegistrosLocais('receitas', { armazenamento }).length, 1);
});

test('armazenamento indisponível não quebra a ferramenta', () => {
  const armazenamento = criarArmazenamento({ prefixo: 'produto-a', armazenamento: new ArmazenamentoBloqueado() });
  assert.equal(armazenamento.disponível, false);
  assert.equal(armazenamento.ler('x'), null);
  const resultado = salvarRegistroLocal('receitas', { nome: 'Bolo' }, { armazenamento });
  assert.equal(resultado.salvo, false);
  assert.match(resultado.erro, /não permite salvar/);
  assert.deepEqual(listarRegistrosLocais('receitas', { armazenamento }), []);
  const semNavegador = criarArmazenamento({ prefixo: 'produto-a', armazenamento: null });
  assert.equal(semNavegador.disponível, false);
});

test('prefixos separam dados de produtos na mesma origem', () => {
  const base = new ArmazenamentoEmMemória();
  const produtoA = criarArmazenamento({ prefixo: 'produto-a', armazenamento: base });
  const produtoB = criarArmazenamento({ prefixo: 'produto-b', armazenamento: base });
  salvarRegistroLocal('receitas', { nome: 'Só no A' }, { armazenamento: produtoA });
  assert.equal(listarRegistrosLocais('receitas', { armazenamento: produtoB }).length, 0);
  assert.deepEqual(produtoA.listarChaves(), ['coleção:receitas']);
});

test('JSON seguro remove chaves de poluição de protótipo e limita tamanho e profundidade', () => {
  const resultado = analisarJsonSeguro('{"__proto__":{"poluído":true},"constructor":{"prototype":{"x":1}},"nome":"ok"}');
  assert.equal(resultado.válido, true);
  assert.deepEqual(Object.keys(resultado.dados), ['nome']);
  assert.equal({}.poluído, undefined);
  assert.equal(analisarJsonSeguro('{"a":1}', { tamanhoMáximo: 3 }).válido, false);
  assert.equal(analisarJsonSeguro('['.repeat(30) + ']'.repeat(30)).válido, false);
  assert.equal(analisarJsonSeguro('{nome:1}').válido, false);
  assert.equal(analisarJsonSeguro(42).válido, false);
});

test('exporta e importa cópia versionada, rejeitando conteúdo estranho', () => {
  const origem = novoArmazenamento();
  salvarRegistroLocal('receitas', { nome: 'Brownie' }, { armazenamento: origem });
  salvarRegistroLocal('receitas', { nome: 'Bolo de pote' }, { armazenamento: origem });
  const cópia = exportarCópiaLocal(coleçõesLocais, { armazenamento: origem });
  assert.equal(cópia.esquema, 'produto-a.cópia-local');
  assert.equal(cópia.versão, 1);

  const destino = novoArmazenamento();
  const importação = importarCópiaLocal(JSON.stringify(cópia), { coleçõesLocais, armazenamento: destino });
  assert.deepEqual(importação, { válido: true, importados: 2, rejeitados: 0 });
  assert.equal(listarRegistrosLocais('receitas', { armazenamento: destino }).length, 2);

  const maliciosa = {
    ...cópia,
    coleções: {
      receitas: [{ id: 'x1', nome: 'ok' }, { id: 'x2', nome: 42 }, { nome: 'sem id' }, 'texto', { id: 'y'.repeat(101), nome: 'id longo' }],
      configuração: [{ id: 'pix', chavePix: 'invasor' }],
      __proto__: [{ id: 'p' }],
    },
  };
  const resultado = importarCópiaLocal(JSON.stringify(maliciosa), { coleçõesLocais, armazenamento: destino });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.importados, 1);
  assert.equal(resultado.rejeitados, 5);
  assert.equal(destino.ler('coleção:configuração'), null);

  assert.equal(importarCópiaLocal(JSON.stringify({ ...cópia, esquema: 'outro-site.cópia-local' }), { coleçõesLocais, armazenamento: destino }).válido, false);
  assert.equal(importarCópiaLocal(JSON.stringify({ ...cópia, versão: 99 }), { coleçõesLocais, armazenamento: destino }).válido, false);
  assert.equal(importarCópiaLocal('não é json', { coleçõesLocais, armazenamento: destino }).válido, false);
  assert.equal(importarCópiaLocal('x'.repeat(2_000_001), { coleçõesLocais, armazenamento: destino }).válido, false);
});

test('validador que lança erro rejeita o registro sem interromper a importação', () => {
  const destino = novoArmazenamento();
  const coleçõesFrágeis = [{ chave: 'receitas', validar: (registro) => registro.nome.trim().length > 0 }];
  const cópia = { esquema: 'produto-a.cópia-local', versão: 1, coleções: { receitas: [{ id: 'a', nome: 'ok' }, { id: 'b' }] } };
  assert.deepEqual(importarCópiaLocal(JSON.stringify(cópia), { coleçõesLocais: coleçõesFrágeis, armazenamento: destino }), { válido: true, importados: 1, rejeitados: 1 });
});

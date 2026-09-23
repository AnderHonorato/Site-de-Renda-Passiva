// paginas-trabalho-popup.test.js — frequência de exibição do popup administrável
// (compartilhado-popup.js), testada sem DOM via a função pura exportada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deveExibirPopup } from '../../frontend/compartilhado/compartilhado-popup.js';

function armazenamentoFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    getItem: (chave) => (chave in dados ? dados[chave] : null),
    setItem: (chave, valor) => {
      dados[chave] = valor;
    },
  };
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

test('mostra quando o aviso nunca foi visto', () => {
  const armazenamento = armazenamentoFalso();
  assert.equal(deveExibirPopup(7, armazenamento, Date.now()), true);
});

test('não mostra de novo antes de uma semana', () => {
  const agora = Date.now();
  const armazenamento = armazenamentoFalso({ 'af-popup-visto-7': String(agora - UM_DIA_MS) });
  assert.equal(deveExibirPopup(7, armazenamento, agora), false);
});

test('mostra de novo depois de uma semana', () => {
  const agora = Date.now();
  const armazenamento = armazenamentoFalso({ 'af-popup-visto-7': String(agora - 8 * UM_DIA_MS) });
  assert.equal(deveExibirPopup(7, armazenamento, agora), true);
});

test('cada aviso tem sua própria chave de frequência', () => {
  const agora = Date.now();
  const armazenamento = armazenamentoFalso({ 'af-popup-visto-1': String(agora) });
  assert.equal(deveExibirPopup(1, armazenamento, agora), false);
  assert.equal(deveExibirPopup(2, armazenamento, agora), true);
});

test('valor corrompido no armazenamento faz mostrar de novo', () => {
  const armazenamento = armazenamentoFalso({ 'af-popup-visto-3': 'não-é-um-número' });
  assert.equal(deveExibirPopup(3, armazenamento, Date.now()), true);
});

test('armazenamento indisponível (lança ao ler) faz mostrar de novo', () => {
  const armazenamento = {
    getItem: () => {
      throw new Error('bloqueado');
    },
  };
  assert.equal(deveExibirPopup(4, armazenamento, Date.now()), true);
});

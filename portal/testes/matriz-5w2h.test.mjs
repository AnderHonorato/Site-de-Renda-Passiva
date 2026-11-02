import { test } from 'node:test';
import assert from 'node:assert/strict';
import { organizar5W2H, calcular5W2HNaTela } from '../scripts/ferramentas/matriz-5w2h.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';

const dados = { oQue: 'Reorganizar estoque', porQue: 'Reduzir erros', quem: 'Equipe',
  quando: 'Em novembro', onde: 'Depósito', como: 'Separar por SKU', quanto: 'A definir' };
test('5W2H organiza exatamente sete perguntas na ordem esperada', () => {
  const r = organizar5W2H(dados);
  assert.equal(r.respostas.length, 7);
  assert.equal(r.respostas[0][1], 'Reorganizar estoque');
  assert.equal(r.respostas[6][1], 'A definir');
  assert.equal(calcular5W2HNaTela(dados).tabela.linhas.length, 7);
});
test('5W2H exige todas as respostas e limita textos muito longos', () => {
  for (const [nome, valor] of [['quem',''], ['quanto','   '], ['como','x'.repeat(801)]]) {
    assert.throws(() => organizar5W2H({ ...dados, [nome]: valor }),
      e => e instanceof ErroDeEntrada && e.campo === nome, nome);
  }
});
test('5W2H baixa PDF com cabeçalho real', async () => {
  const { nome, bytes, tipo } = await arquivoBaixado(calcular5W2HNaTela(dados).arquivos[0].gerar);
  assert.equal(nome, 'plano-5w2h.pdf');
  assert.equal(tipo, 'application/pdf');
  assert.match(new TextDecoder('latin1').decode(bytes.slice(0, 8)), /%PDF-1/);
});

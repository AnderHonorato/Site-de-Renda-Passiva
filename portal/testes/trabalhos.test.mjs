import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DADOS_MAXIMO_BYTES,
  dadosDeTrabalhoValidos,
  limitesDoPlano,
  planosPublicos,
  validarEdicaoTrabalho,
  validarNovoTrabalho,
} from '../servidor/trabalhos.mjs';

test('cotas de conta seguem o plano aprovado e Premium herda Plus provisoriamente', () => {
  assert.deepEqual(limitesDoPlano('gratuito'), { favoritos: 10, trabalhos: 3, lote_arquivos: 3 });
  assert.deepEqual(limitesDoPlano('plus'), { favoritos: 500, trabalhos: 500, lote_arquivos: 100 });
  assert.deepEqual(limitesDoPlano('premium'), limitesDoPlano('plus'));
  const premium = planosPublicos().find((plano) => plano.id === 'premium');
  assert.equal(premium.provisorio, true);
});

test('trabalho salvo aceita apenas payload pequeno, simples e válido', () => {
  const base = { ferramenta_slug: 'porcentagem', titulo: 'Meu cálculo', dados: { valor: '25' }, situacao: 'salvo' };
  assert.equal(validarNovoTrabalho(base), true);
  assert.equal(validarNovoTrabalho({ ...base, ferramenta_slug: '../segredo' }), false);
  assert.equal(validarNovoTrabalho({ ...base, titulo: ' '.repeat(2) }), false);
  assert.equal(validarNovoTrabalho({ ...base, dados: ['não', 'aceitar'] }), false);
  assert.equal(validarNovoTrabalho({ ...base, situacao: 'publico' }), false);
  assert.equal(validarEdicaoTrabalho({ titulo: 'Novo nome' }), true);
  assert.equal(validarEdicaoTrabalho({}), false);
});

test('limite de dados do trabalho é 20 kB de JSON', () => {
  const pequeno = { texto: 'a'.repeat(100) };
  const grande = { texto: 'a'.repeat(DADOS_MAXIMO_BYTES + 100) };
  assert.equal(dadosDeTrabalhoValidos(pequeno), true);
  assert.equal(dadosDeTrabalhoValidos(grande), false);
});

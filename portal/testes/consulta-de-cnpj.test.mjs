import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCnpj, consultarCnpj, consultarCnpjNaTela } from '../scripts/ferramentas/consulta-de-cnpj.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const cnpj = '00000000000191';
const buscar = async () => ({ ok: true, json: async () => ({
  cnpj, razao_social: 'EMPRESA EXEMPLO', descricao_situacao_cadastral: 'ATIVA',
  municipio: 'São Paulo', uf: 'SP', cnae_fiscal_descricao: 'Comércio',
}) });
test('validação dos dígitos verificadores e pontuação', () => {
  assert.equal(validarCnpj('00.000.000/0001-91'), cnpj);
  assert.equal(validarCnpj(cnpj), cnpj);
  for (const entrada of ['11111111111111', '00000000000192', 'abc', '', '00.000.000/0001-9X'])
    assert.throws(() => validarCnpj(entrada), ErroDeEntrada);
});
test('consulta e saída exportável', async () => {
  const resultado = await consultarCnpjNaTela({ cnpj }, { buscar });
  assert.match(resultado.resumo, /EMPRESA EXEMPLO/);
  assert.match(resultado.texto, /ATIVA/);
  assert.match(resultado.texto, /São Paulo/);
});
test('falha de rede, indisponibilidade e CNPJ divergente', async () => {
  await assert.rejects(consultarCnpj(cnpj, { buscar: async () => { throw Error('offline'); } }), ErroDeEntrada);
  await assert.rejects(consultarCnpj(cnpj, { buscar: async () => ({ status: 404, ok: false }) }), ErroDeEntrada);
  await assert.rejects(consultarCnpj(cnpj, { buscar: async () => ({ ok: true, json: async () => ({ cnpj: '123' }) }) }), ErroDeEntrada);
});

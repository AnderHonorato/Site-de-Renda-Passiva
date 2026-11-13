import test from 'node:test';
import assert from 'node:assert/strict';
import { ErroProfissional, lerTabela, numeroOpcao, quantil, relatorio } from '../servidor/profissionais/comum.mjs';

test('tabela profissional preserva tipos, células citadas e colunas extras sem protótipo', () => {
  const linhas = lerTabela('grupo;valor;nota\n"A;B";"-1.234,5";"um\ndois"', [{chave:'grupo',tipo:'texto'}, {chave:'valor',tipo:'numero'}]);
  assert.equal(Object.getPrototypeOf(linhas[0]), null);
  assert.equal(linhas[0].grupo, 'A;B');
  assert.equal(linhas[0].valor, -1234.5);
  assert.equal(linhas[0].nota, 'um\ndois');
  assert.equal(lerTabela('id;opcional\nA;', [{chave:'opcional',tipo:'texto',opcional:true}])[0].opcional, '');
});
test('entrada profissional recusa estrutura ambígua, números não finitos e linhas incompatíveis', () => {
  const cols = [{chave:'valor',tipo:'numero'}];
  for (const csv of ['valor\nInfinity', 'valor\n0x10', 'valor\n1e999', 'valor\n1.2,3', 'valor;valor\n1;2', 'valor\n"1"x', 'valor\n1"2"', 'valor\n"1', 'valor;nota\n1', 'valor\n\u0000']) {
    assert.throws(() => lerTabela(csv, cols), ErroProfissional, csv);
  }
  assert.throws(() => lerTabela('__proto__;valor\nx;1', cols), ErroProfissional);
  assert.throws(() => lerTabela('valor\n' + Array(2001).fill('1').join('\n'), cols), ErroProfissional);
  assert.throws(() => lerTabela('valor;texto\n1;' + 'a'.repeat(1000000), cols), ErroProfissional);
});
test('opções numéricas não convertem vazio/arrays em zero e respeitam o domínio', () => {
  assert.equal(numeroOpcao({}, 'alfa', .5, 0, 1), .5);
  assert.equal(numeroOpcao({opcoes:{alfa:'0,25'}}, 'alfa', .5, 0, 1), .25);
  for (const opcoes of [null, [], {alfa:''}, {alfa:true}, {alfa:2}]) {
    assert.throws(() => numeroOpcao({opcoes}, 'alfa', .5, 0, 1), ErroProfissional);
  }
  assert.equal(quantil([1,2,3,4], .25), 1.75);
});
test('relatório mantém premissas nas exportações e recusa células não finitas', () => {
  const spec = {nome:'Exemplo',processa:'Método declarado',limites:'Dados de uma única coorte.'};
  const r = relatorio(spec,{indicadores:[['Total',1]],colunas:['Valor'],linhas:[[null]],notas:['Verifique o período.']});
  assert.deepEqual(r.notas,['Verifique o período.','Dados de uma única coorte.']);
  assert.throws(() => relatorio(spec,{indicadores:[['Total',Infinity]],colunas:['Valor'],linhas:[[1]]}), ErroProfissional);
  assert.throws(() => relatorio(spec,{indicadores:[['Total',1]],colunas:['Valor'],linhas:[[1,2]]}), ErroProfissional);
});

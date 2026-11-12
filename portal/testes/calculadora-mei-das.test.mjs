import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMei, calcularMeiNaTela } from '../scripts/ferramentas/calculadora-mei-das.js';
const base = { salarioMinimo:1500, faturamento:40000, mesAbertura:1, limiteAnual:81000, atividade:'comercio' };
test('DAS comércio, serviços e ambos',()=>{
  assert.equal(calcularMei(base).das,76);
  assert.equal(calcularMei({...base,atividade:'servicos'}).das,80);
  assert.equal(calcularMei({...base,atividade:'ambos'}).das,81);
});
test('limite proporcional e excesso',()=>{
  const r=calcularMei({...base,mesAbertura:7,faturamento:50000});
  assert.equal(r.teto,40500);assert.equal(r.restante,-9500);
});
test('valida atividade e valores',()=>{
  assert.throws(()=>calcularMei({...base,atividade:'invalida'}));
  assert.throws(()=>calcularMei({...base,mesAbertura:13}));
  assert.throws(()=>calcularMei({...base,salarioMinimo:NaN}));
});
test('saída para usuário e alerta de excesso',()=>{
  const r=calcularMeiNaTela({salarioMinimo:'1500',faturamento:'90000',mesAbertura:'1',limiteAnual:'81000',atividade:'comercio'});
  assert.match(r.resumo,/76,00/);assert.match(r.observações[0],/supera/);
});

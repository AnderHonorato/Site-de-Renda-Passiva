import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizarCor,razaoContraste,avaliarContraste,sugerirCorTexto,calcularContrasteNaTela} from '../scripts/ferramentas/verificador-de-contraste.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
test('contraste preto branco 21:1 e branco branco 1:1',()=>{
 assert.ok(Math.abs(razaoContraste('#000','#FFF')-21)<1e-10);
 assert.equal(razaoContraste('#ffffff','#ffffff'),1);
 assert.equal(normalizarCor('#aBc'),'#AABBCC');
});
test('cinza #777 falha AA comum e passa AA grande',()=>{
 const r=avaliarContraste('#777','#FFFFFF');
 assert.ok(r.razao>4.4 && r.razao<4.5);
 assert.equal(r.aaNormal,false);assert.equal(r.aaGrande,true);
});
test('recomendações corrigem a falha em fundos claros e escuros',()=>{
 for(const fundo of ['#FFF','#000','#314159']){
  const sugerida=sugerirCorTexto('#777777',fundo);
  assert.match(sugerida,/^#[0-9A-F]{6}$/);
  assert.ok(razaoContraste(sugerida,fundo)>=4.5);
 }
});
test('cores malformadas apontam o campo certo',()=>{
 for(const [campo,valor] of [['texto','red'],['texto','#ff'],['fundo','#xx0000'],['fundo','#11223344']]){
  assert.throws(()=>calcularContrasteNaTela({texto:'#000',fundo:'#fff',[campo]:valor}),
  e=>e instanceof ErroDeEntrada&&e.campo===campo);
 }
});
test('resultado mostra normas, razões e limitações',()=>{
 const r=calcularContrasteNaTela({texto:'#777',fundo:'#fff'});
 assert.match(r.valor,/:1$/);assert.match(r.texto,/WCAG AAA/);
 assert.match(r.texto,/sugerido/i);assert.match(r.observações.join(' '),/gradiente/i);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {processarRegex,validarRegex,ErroRegex} from '../scripts/ferramentas/auxiliares/regex-motor.js';
import {realcarCorrespondencias} from '../scripts/ferramentas/regex.js';
const base={expressao:'(?<numero>\\d+)',flags:'g',texto:'Produto 123, SKU 456',substituir:false,substituicao:''};
test('regex localiza duas correspondências e captura grupos nomeados',()=>{
 const r=processarRegex(base);
 assert.deepEqual(r.correspondencias.map(m=>[m.inicio,m.trecho]),[[8,'123'],[17,'456']]);
 assert.deepEqual(r.correspondencias.map(m=>m.nomes.numero),['123','456']);
});
test('substituição usa semântica nativa de JS',()=>{
 const r=processarRegex({...base,substituir:true,substituicao:'[$<numero>]'});
 assert.equal(r.substituido,'Produto [123], SKU [456]');
});
test('sem g opera sobre apenas a primeira correspondência',()=>{
 const r=processarRegex({...base,flags:'',substituir:true,substituicao:'X'});
 assert.equal(r.correspondencias.length,1);assert.equal(r.substituido,'Produto X, SKU 456');
});
test('zero length incrementa respeitando surrogate pair Unicode',()=>{
 const r=processarRegex({expressao:'(?=.)',flags:'gu',texto:'😀a'});
 assert.deepEqual(r.correspondencias.map(m=>m.inicio),[0,2]);
});
test('150 correspondências é teto mesmo com padrão de comprimento zero',()=>{
 const r=processarRegex({expressao:'a*',flags:'g',texto:' '.repeat(900)});
 assert.equal(r.correspondencias.length,150);assert.equal(r.limite,true);
});
test('destaca textos escapando tags e entidades, não injeta HTML do usuário',()=>{
 const x=realcarCorrespondencias('A <script>12</script>',[{inicio:10,fim:12}]);
 assert.match(x,/&lt;script&gt;/);assert.ok(!x.includes('<script>'));
});
test('validação rejeita sinalizadores e expressões inválidos',()=>{
 for(const [campo,dados] of [
  ['flags',{flags:'gg'}],['flags',{flags:'uv'}],['flags',{flags:'x'}],
  ['expressao',{expressao:'('}],['expressao',{expressao:''}],
  ['texto',{texto:'a'.repeat(30001)}],['substituicao',{substituicao:'x'.repeat(1201)}]
 ])assert.throws(()=>validarRegex({...base,...dados}),e=>e instanceof ErroRegex&&e.campo===campo);
});
test('nenhuma correspondência não resulta em inventar capturas',()=>{
 const r=processarRegex({...base,expressao:'nao-existe'});
 assert.equal(r.correspondencias.length,0);
});

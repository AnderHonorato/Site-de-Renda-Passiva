import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarOpcoes,compararTamanhos,comprimirArquivo,LIMITES} from '../scripts/ferramentas/comprimir-imagem.js';
test('qualidade e proporção são respeitadas',()=>{
 const o=validarOpcoes({qualidade:'75',largura:'800',formato:'webp'},{largura:4000,altura:3000});
 assert.equal(o.largura,800);assert.equal(o.altura,600);assert.equal(o.qualidade,.75);
});
test('não amplia imagens e preserva proporção',()=>{
 const o=validarOpcoes({qualidade:80,largura:6000,formato:'jpeg'},{largura:600,altura:300});
 assert.equal(o.largura,600);assert.equal(o.altura,300);
});
test('bloqueia valores inválidos e imagens gigantes',()=>{
 for(const q of [-1,19,96,'abc',50.5]){
  assert.throws(()=>validarOpcoes({qualidade:q,largura:0,formato:'webp'},{largura:200,altura:200}));
 }
 assert.throws(()=>validarOpcoes({qualidade:75,largura:0,formato:'webp'},{largura:6000,altura:5000}));
 assert.throws(()=>validarOpcoes({qualidade:75,largura:0,formato:'webp'},{largura:10000,altura:500}));
});
test('compara tamanhos inclusive quando a saída cresce',()=>{
 assert.equal(compararTamanhos(1000,700).economia,300);
 assert.equal(compararTamanhos(1000,1200).menor,false);
 assert.ok(Math.abs(compararTamanhos(1000,1200).percentual+20)<1e-10);
 assert.throws(()=>compararTamanhos(0,2));
});
test('rejeita arquivo ausente, grande e não imagem antes de decodificar',async()=>{
 await assert.rejects(()=>comprimirArquivo(null,{}));
 await assert.rejects(()=>comprimirArquivo({size:LIMITES.bytes+1,type:'image/png'},{}));
 await assert.rejects(()=>comprimirArquivo({size:5,type:'application/pdf'},{}));
});

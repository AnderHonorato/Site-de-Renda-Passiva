import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recortarArquivo} from '../scripts/ferramentas/cortar-imagem.js';
import {converterImagem} from '../scripts/ferramentas/converter-formato-de-imagem.js';
import {limparMetadadosImagem} from '../scripts/ferramentas/remover-metadados-de-imagem.js';
import {montarPaletaDeImagem} from '../scripts/ferramentas/extrator-de-paleta-de-cores.js';
import {redimensionarLote} from '../scripts/ferramentas/redimensionar-imagens-em-lote.js';
import {lerZip} from '../scripts/cálculos/zip.js';
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRxkAAAAASUVORK5CYII=','base64'));
function simularNavegador(){
 const anterior={document:globalThis.document,createImageBitmap:globalThis.createImageBitmap};
 const desenhos=[];
 globalThis.createImageBitmap=async()=>({width:800,height:600,close(){}});
 globalThis.document={
  createElement(tipo){
   assert.equal(tipo,'canvas');
   const canvas={width:0,height:0};
   canvas.getContext=()=>({
    fillStyle:'#fff',imageSmoothingEnabled:true,imageSmoothingQuality:'high',
    fillRect(){},clearRect(){},drawImage(...args){desenhos.push(args);},
    getImageData(_x,_y,w,h){const data=new Uint8ClampedArray(w*h*4);
      for(let i=0;i<data.length;i+=4){data[i]=255;data[i+3]=255;}
      return {data,width:w,height:h};},
    font:'16px sans-serif',fillText(){},
   });
   canvas.toBlob=callback=>callback(new Blob([png],{type:'image/png'}));
   return canvas;
  },
 };
 return {desenhos,restaurar(){
  globalThis.document=anterior.document;
  globalThis.createImageBitmap=anterior.createImageBitmap;
 }};
}
const arquivo=(nome='produto.png')=>({
 name:nome,type:'image/png',size:100,
 async arrayBuffer(){return png.buffer.slice(png.byteOffset,png.byteOffset+png.byteLength);},
});
test('cinco fluxos geram saídas via canvas e ZIP com limites definidos',async()=>{
 const mock=simularNavegador();
 try{
  const img=arquivo();
  const converter=await converterImagem(img,{formato:'png',qualidade:'85',fundo:'transparente'});
  assert.equal(converter.blob.type,'image/png');assert.equal(converter.largura,800);
  const corte=await recortarArquivo(img,{proporcao:'1:1',posicao:'centro',formato:'png',qualidade:'90'});
  assert.deepEqual([corte.plano.x,corte.plano.largura,corte.plano.altura],[100,600,600]);
  const semExif=await limparMetadadosImagem(img,{formato:'png',qualidade:'90'});
  assert.equal(semExif.restantes.length,0);
  const paleta=await montarPaletaDeImagem(img,'6');
  assert.equal(paleta.cores[0].hex,'#FF0000');
  const lote=await redimensionarLote([arquivo('um.png'),arquivo('dois.png')],{
   largura:'400',altura:'400',qualidade:'80',formato:'png',
  });
  assert.equal(lote.resultados.length,2);
  assert.deepEqual(lote.resultados.map(r=>[r.largura,r.altura]),[[400,300],[400,300]]);
  const zip=lerZip(lote.zip);
  assert.equal(zip.entradas.length,2);
  assert.notEqual(zip.entradas[0].nome,zip.entradas[1].nome);
  assert.ok(mock.desenhos.length>=5);
 }finally{mock.restaurar();}
});

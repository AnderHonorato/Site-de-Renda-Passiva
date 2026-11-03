import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES_FAVICON,TAMANHOS_FAVICON,ErroFavicon,validarOpcaoFavicon,
  validarImagemFavicon,montarIco,manifestoFavicon,codigoHtmlFavicon,
  prepararArquivosFavicon,gerarZipFavicon
} from '../scripts/ferramentas/auxiliares/favicon-pacote.js';
import {lerZip,extrairEntrada} from '../scripts/cálculos/zip.js';

const png=Uint8Array.from(Buffer.from(
 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRxkAAAAASUVORK5CYII=','base64'));
const arquivos=()=>TAMANHOS_FAVICON.map(({nome,lado})=>({nome,lado,bytes:png}));
test('Favicon valida tamanho, tipo, dimensões e imagem com pouca resolução',()=>{
 assert.equal(validarImagemFavicon({size:100,type:'image/png'},48,48).pequena,true);
 assert.equal(validarImagemFavicon({size:100,type:'image/webp'},128,128).pequena,false);
 for (const [arquivo,l,a] of [
  [{size:LIMITES_FAVICON.arquivo+1,type:'image/png'},128,128],
  [{size:10,type:'image/svg+xml'},128,128],
  [{size:10,type:'image/png'},6000,4000],
  [{size:10,type:'image/jpeg'},0,128],
 ]){
  assert.throws(()=>validarImagemFavicon(arquivo,l,a),e=>e instanceof ErroFavicon&&e.campo==='arquivo');
 }
});
test('Favicon controla nome, encaixe e fundo',()=>{
 assert.equal(validarOpcaoFavicon({nome:'Minha loja',encaixe:'conter',fundo:'escuro'}).nome,'Minha loja');
 for (const [campo,valor] of [['nome',''],['nome','x'.repeat(71)],['fundo','javascript:alert(1)'],['encaixe','stretch']]){
  assert.throws(()=>validarOpcaoFavicon({nome:'Site',encaixe:'conter',fundo:'branco',[campo]:valor}),
  e=>e instanceof ErroFavicon&&e.campo===campo);
 }
});
test('ICO tem entradas de 16, 32 e 48 pixels e offsets corretos',()=>{
 const bytes=montarIco(arquivos().slice(0,3));
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 assert.equal(v.getUint16(2,true),1);
 assert.equal(v.getUint16(4,true),3);
 let pos=54;
 for(let i=0;i<3;i++){
  const e=6+i*16;
  assert.equal(bytes[e],[16,32,48][i]);
  assert.equal(v.getUint32(e+8,true),png.length);
  assert.equal(v.getUint32(e+12,true),pos);
  assert.deepEqual(bytes.slice(pos,pos+8),png.slice(0,8));
  pos+=png.length;
 }
 assert.equal(pos,bytes.length);
});
test('ICO rejeita bytes não PNG ou tamanhos trocados',()=>{
 assert.throws(()=>montarIco([{lado:16,bytes:new Uint8Array(30)},...arquivos().slice(1,3)]),/PNG/);
 assert.throws(()=>montarIco([arquivos()[1],arquivos()[0],arquivos()[2]]),/Ordem/);
});
test('Manifesto é JSON válido com ícones locais e nome escapado',()=>{
 const manifesto=JSON.parse(manifestoFavicon('Loja "Aurora"','escuro'));
 assert.equal(manifesto.name,'Loja "Aurora"');
 assert.equal(manifesto.theme_color,'#151515');
 assert.deepEqual(manifesto.icons.map(i=>i.sizes),['192x192','512x512']);
 assert.ok(manifesto.icons.every(i=>i.src.startsWith('./')));
 assert.match(codigoHtmlFavicon(),/rel="apple-touch-icon"/);
});
test('ZIP contém dez arquivos reais, incluindo manifesto e código HTML',async()=>{
 const {bytes,arquivos:itens}=await gerarZipFavicon(arquivos(),{nome:'Loja',fundo:'transparente',encaixe:'conter'});
 assert.equal(itens.length,10);
 const leitor=lerZip(bytes);
 const nomes=leitor.entradas.map(i=>i.nome);
 for(const nome of ['favicon.ico','favicon-16x16.png','favicon-32x32.png','favicon-48x48.png',
  'apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png',
  'site.webmanifest','codigo-para-head.html','LEIA-ME.txt']){
  assert.ok(nomes.includes(nome),nome);
 }
 const entry=leitor.entradas.find(i=>i.nome==='site.webmanifest');
 const texto=new TextDecoder().decode(await extrairEntrada(bytes,entry));
 assert.equal(JSON.parse(texto).name,'Loja');
});
test('Pacote rejeita falta de resolução e inclui instruções honestas',()=>{
 const lista=arquivos().slice(0,5);
 assert.throws(()=>prepararArquivosFavicon(lista,{nome:'Site'}),/seis/);
 const readme=prepararArquivosFavicon(arquivos(),{nome:'Site'}).find(a=>a.nome==='LEIA-ME.txt');
 assert.match(new TextDecoder().decode(readme.bytes),/NÃO torna o site um PWA/);
});

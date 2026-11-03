import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarArquivoImagem,validarLoteImagem,validarDimensoes,formatoDaSaida,
 qualidadeImagem,planejarRedimensionamento,planejarRecorte,nomeSeguroImagem,
 detectarBlocosDeMetadados,extrairPaletaRGBA,LIMITES_IMAGEM} from '../scripts/ferramentas/auxiliares/imagens-puras.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
import {converterPaletaEmCSS} from '../scripts/ferramentas/extrator-de-paleta-de-cores.js';
import {validarLoteOpcoes} from '../scripts/ferramentas/redimensionar-imagens-em-lote.js';

const arquivo=(tamanho=100,tipo='image/png',nome='produto.png')=>({size:tamanho,type:tipo,name:nome});
test('arquivos JPG PNG e WebP locais têm limites explícitos',()=>{
 for(const tipo of ['image/png','image/jpeg','image/webp'])assert.equal(validarArquivoImagem(arquivo(50,tipo)).type,tipo);
 for(const f of [null,arquivo(0),arquivo(LIMITES_IMAGEM.porArquivo+1),arquivo(100,'image/svg+xml')])
  assert.throws(()=>validarArquivoImagem(f),e=>e instanceof ErroDeEntrada&&e.campo==='arquivo');
});
test('lote aceita até 12 imagens e limita o total',()=>{
 assert.equal(validarLoteImagem(Array(12).fill(arquivo())).length,12);
 for(const fs of [[],Array(13).fill(arquivo()),Array(4).fill(arquivo(17*1024*1024))]){
  assert.throws(()=>validarLoteImagem(fs),e=>e instanceof ErroDeEntrada&&e.campo==='arquivos');
 }
});
test('redimensionar preserva proporção e nunca amplia',()=>{
 assert.deepEqual(planejarRedimensionamento(4000,3000,1200,1200),{largura:1200,altura:900,fator:.3});
 assert.deepEqual(planejarRedimensionamento(300,150,1200,1200),{largura:300,altura:150,fator:1});
 assert.throws(()=>planejarRedimensionamento(10000,200,1200,1200));
 assert.throws(()=>planejarRedimensionamento(500,500,0,500));
});
test('recorte central para quadrado não estica foto, e ancoragem muda origem',()=>{
 assert.deepEqual(planejarRecorte(4000,3000,'1:1','centro'),{x:500,y:0,largura:3000,altura:3000});
 assert.deepEqual(planejarRecorte(4000,3000,'1:1','esquerda'),{x:0,y:0,largura:3000,altura:3000});
 const r=planejarRecorte(1200,800,'9:16','topo');
 assert.equal(r.y,0);assert.ok(Math.abs(r.largura/r.altura-9/16)<.003);
 assert.deepEqual(planejarRecorte(1200,800,'livre','centro'),{x:0,y:0,largura:1200,altura:800});
 for(const [p,l] of [['55:99','centro'],['1:1','diagonal']])
  assert.throws(()=>planejarRecorte(1000,500,p,l));
});
test('formato saída, qualidade e nomes de ZIP resistem a entradas maliciosas',()=>{
 assert.equal(formatoDaSaida('jpeg').tipo,'image/jpeg');
 assert.equal(qualidadeImagem('85'),.85);
 assert.equal(nomeSeguroImagem('../../../../Meu produto.png','01-redim','webp'),'meu-produto-01-redim.webp');
 assert.throws(()=>formatoDaSaida('svg'),/Escolha/);
 assert.throws(()=>qualidadeImagem('101'));
 assert.throws(()=>nomeSeguroImagem('x','novo','exe'));
 assert.deepEqual(validarLoteOpcoes({largura:'1000',altura:'1000',qualidade:'85',formato:'webp'}).tipo,'image/webp');
});
test('scanner reconhece bloco EXIF e comentário JPEG sem revelar campos privados',()=>{
 const exif=[69,120,105,102,0,0,1,2,3,4];
 const len=exif.length+2;
 const bytes=Uint8Array.from([255,216,255,225,len>>8,len&255,...exif,255,254,0,4,65,66,255,217]);
 const encontrados=detectarBlocosDeMetadados(bytes,'image/jpeg');
 assert.ok(encontrados.some(t=>t.includes('EXIF')));
 assert.ok(encontrados.some(t=>t.includes('Comentários')));
 assert.deepEqual(detectarBlocosDeMetadados(Uint8Array.from([255,216,255,217]),'image/jpeg'),[]);
});
test('scanner identifica tEXt PNG e EXIF WebP pela estrutura',()=>{
 const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,116,69,88,116,0,0,0,0]);
 assert.deepEqual(detectarBlocosDeMetadados(png,'image/png'),['PNG tEXt']);
 const riff=Uint8Array.from([82,73,70,70,12,0,0,0,87,69,66,80,69,88,73,70,0,0,0,0]);
 assert.deepEqual(detectarBlocosDeMetadados(riff,'image/webp'),['WebP EXIF']);
});
test('paleta mede três pixels vermelhos e um azul, sem alpha invisível',()=>{
 const rgba=Uint8Array.from([255,0,0,255,255,0,0,255,255,0,0,255,0,0,255,255]);
 const r=extrairPaletaRGBA(rgba,2,2,4);
 assert.equal(r[0].hex,'#FF0000');
 assert.ok(Math.abs(r[0].percentual-75)<.01);
 assert.equal(r[1].hex,'#0000FF');
 assert.match(converterPaletaEmCSS(r),/--cor-1: #FF0000/);
});
test('paleta não considera área completamente transparente',()=>{
 const rgba=Uint8Array.from([255,0,0,0]);
 assert.throws(()=>extrairPaletaRGBA(rgba,1,1,4),/pixels visíveis/);
 assert.throws(()=>extrairPaletaRGBA(rgba,2,2,4),/Pixels inválidos/);
});

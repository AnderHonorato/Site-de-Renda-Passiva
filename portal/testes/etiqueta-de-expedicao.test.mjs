import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarEtiquetas, calcularEtiquetasNaTela } from '../scripts/ferramentas/etiqueta-de-expedicao.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';
const entrada={remetente:'Minha Loja',destinatario:'Cliente Exemplo',
 endereco:'Rua Exemplo, 123, São Paulo - SP, CEP 00000-000',referencia:'PED-100',quantidade:'4'};
test('quatro etiquetas cabem em uma folha A4',()=>{
 const r=gerarEtiquetas({...entrada,quantidade:4});
 assert.equal(r.quantidade,4);
 assert.equal(r.paginas,1);
 assert.match(new TextDecoder('latin1').decode(r.bytes.slice(0,8)),/%PDF-1/);
});
test('cinco etiquetas usam duas páginas, cada etiqueta tem número único',()=>{
 const r=gerarEtiquetas({...entrada,quantidade:5});
 assert.equal(r.paginas,2);
 const raw=new TextDecoder('latin1').decode(r.bytes);
 assert.match(raw,/\/Count 2/);
 assert.match(raw,/VOLUME 5 \/ 5/);
});
test('tela mantém endereços locais e sinaliza formato A4',()=>{
 const r=calcularEtiquetasNaTela(entrada);
 assert.equal(r.valor,'4 etiqueta(s)');
 assert.equal(r.tabela.linhas.length,4);
 assert.match(r.observações.join(' '),/“Salvar trabalho”/);
});
test('download do PDF recebe nome seguro e MIME correto',async()=>{
 const r=calcularEtiquetasNaTela(entrada);
 const {nome,tipo,bytes}=await arquivoBaixado(r.arquivos[0].gerar);
 assert.equal(nome,'etiquetas-ped-100.pdf');
 assert.equal(tipo,'application/pdf');
 assert.match(new TextDecoder('latin1').decode(bytes.slice(0,8)),/%PDF-1/);
});
test('rejeita quantidade inválida e campos ausentes',()=>{
 for(const [campo,valor] of [['quantidade','0'],['quantidade','81'],['quantidade','1,5'],
 ['remetente',''],['destinatario',''],['endereco',''],['referencia','']]) {
  assert.throws(()=>calcularEtiquetasNaTela({...entrada,[campo]:valor}),
    e=>e instanceof ErroDeEntrada&&e.campo===campo,campo);
 }
});

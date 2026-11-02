import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarIdentificadores,sortearCodigo,gerarIdentificadoresNaTela,ALFABETOS} from '../scripts/ferramentas/uuid.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
test('UUID v4 tem formato correto e IDs únicos no lote',()=>{
 const v=criarIdentificadores({tipo:'uuid',quantidade:100,tamanho:12});
 assert.equal(v.length,100);assert.equal(new Set(v).size,100);
 for(const id of v)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
test('código legível exclui O, I, zero e um, com prefixo opcional',()=>{
 const v=criarIdentificadores({tipo:'legivel',quantidade:80,tamanho:12,prefixo:'PED-'});
 assert.equal(v.length,80);assert.equal(new Set(v).size,80);
 for(const id of v)assert.match(id,/^PED-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/);
});
test('hexadecimal aleatório em lote só contém caracteres previstos',()=>{
 const v=criarIdentificadores({tipo:'hex',quantidade:100,tamanho:16});
 for(const id of v)assert.match(id,/^[0-9a-f]{16}$/);
 assert.equal(new Set(v).size,100);
});
test('limites e prefixos rejeitam entradas inválidas',()=>{
 for(const [campo,opcao] of [
  ['tipo',{tipo:'outro'}],['quantidade',{quantidade:0}],['quantidade',{quantidade:201}],
  ['tamanho',{tamanho:5}],['prefixo',{prefixo:'bad space'}],['prefixo',{prefixo:'_'.repeat(21)}]
 ])assert.throws(()=>criarIdentificadores({tipo:'uuid',quantidade:2,tamanho:12,...opcao}),
  e=>e instanceof ErroDeEntrada&&e.campo===campo);
});
test('fonte criptográfica é obrigatória: nenhuma alternativa Math.random',()=>{
 assert.throws(()=>sortearCodigo(ALFABETOS.hex,8,{getRandomValues:undefined}),/aleatoriedade segura/);
});
test('tela inclui TXT e tabela para exportação',()=>{
 const r=gerarIdentificadoresNaTela({tipo:'legivel',quantidade:'5',tamanho:'12',prefixo:'P-'});
 assert.equal(r.tabela.linhas.length,5);
 assert.equal(r.arquivos.length,1);
 assert.match(r.observações.join(' '),/não são enviados/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarPacoteDeFavicon} from '../scripts/ferramentas/gerador-de-favicon.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
test('falha de arquivo antes de utilizar o canvas ou Web Crypto',async()=>{
 for(const arquivo of [null,{size:0,type:'image/png'},{size:18000000,type:'image/png'},
   {size:100,type:'image/svg+xml'}]){
  await assert.rejects(()=>criarPacoteDeFavicon(arquivo,{nome:'Site',encaixe:'conter',fundo:'branco'}),
    e=>e instanceof ErroDeEntrada&&e.campo==='arquivo');
 }
});
test('nome e encaixe ruins apontam os campos responsáveis',async()=>{
 await assert.rejects(()=>criarPacoteDeFavicon(null,{nome:'',encaixe:'conter',fundo:'branco'}),
  e=>e instanceof ErroDeEntrada&&e.campo==='nome');
 await assert.rejects(()=>criarPacoteDeFavicon(null,{nome:'Site',encaixe:'achatar',fundo:'branco'}),
  e=>e instanceof ErroDeEntrada&&e.campo==='encaixe');
});

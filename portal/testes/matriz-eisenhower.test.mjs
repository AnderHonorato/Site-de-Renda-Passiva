import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classificarEisenhower,calcularEisenhowerNaTela} from '../scripts/ferramentas/matriz-eisenhower.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
import {arquivoBaixado} from './auxiliares/pdf-baixado.mjs';
const base={tarefas:'Site fora do ar; sim; sim\nNovo curso; não; sim\nAviso; sim; não\nArquivo antigo; não; não'};
test('Eisenhower classifica em quatro quadrantes e mantém ordem',()=>{
 const r=calcularEisenhowerNaTela(base);
 assert.equal(r.tabela.linhas.length,4);
 assert.deepEqual(r.tabela.linhas.map(x=>x[0]),[
  '1. Fazer agora','2. Planejar','3. Delegar ou negociar','4. Reavaliar ou eliminar']);
 assert.equal(r.linhas.length,4);
});
test('classificação não troca importante por urgente',()=>{
 const r=classificarEisenhower([{nome:'Tarefa A',urgente:false,importante:true}]);
 assert.equal(r.itens[0].grupo,'planejar');
 assert.equal(r.grupos.find(x=>x.chave==='fazer').quantidade,0);
});
test('Eisenhower rejeita dados inválidos, nomes repetidos e excesso de tarefas',()=>{
 for(const entradas of [
  'Tarefa; talvez; sim','Tarefa; sim; talvez','Tarefa; sim',
  'A; sim; não','Tarefa; sim; sim\ntarefa; não; não'
 ])assert.throws(()=>calcularEisenhowerNaTela({tarefas:entradas}),
   e=>e instanceof ErroDeEntrada&&e.campo==='tarefas',entradas);
 assert.throws(()=>calcularEisenhowerNaTela({tarefas:Array(81).fill('Tarefa; sim; sim').join('\n')}),/80/);
});
test('matriz tem PDF para baixar',async()=>{
 const {nome,bytes,tipo}=await arquivoBaixado(calcularEisenhowerNaTela(base).arquivos[0].gerar);
 assert.equal(nome,'matriz-eisenhower.pdf');
 assert.equal(tipo,'application/pdf');
 assert.match(new TextDecoder('latin1').decode(bytes.slice(0,8)),/%PDF-1/);
});

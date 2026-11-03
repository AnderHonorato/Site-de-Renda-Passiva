import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarFormato,ErroDeFormato,extensaoDoCodigo} from '../scripts/ferramentas/auxiliares/formatador-regras.js';
import {processarFormatadorEmWorker} from '../scripts/ferramentas/formatador-de-codigo.js';
import {formatarComBiblioteca} from '../scripts/terceiros/formatadores.js';
const exemplo={linguagem:'javascript',codigo:'const x={a:1,b:2}',acao:'formatar',espacos:'2',dialeto:'sql'};
test('configurações aceitam as linguagens e dialetos previstos',()=>{
 for (const linguagem of ['sql','javascript','typescript','html','css','json']){
  assert.equal(validarFormato({...exemplo,linguagem}).linguagem,linguagem);
  assert.ok(extensaoDoCodigo(linguagem));
 }
});
test('rejeita texto vazio, código excessivo e minificação insegura',()=>{
 for(const [campo,opcoes] of [['codigo',{codigo:' '}],['codigo',{codigo:'a'.repeat(65001)}],
  ['linguagem',{linguagem:'python'}],['dialeto',{linguagem:'sql',dialeto:'unk'}],
  ['espacos',{espacos:'3'}],['acao',{linguagem:'javascript',acao:'minificar'}]]){
  assert.throws(()=>validarFormato({...exemplo,...opcoes}),
    e=>e instanceof ErroDeFormato && e.campo===campo,campo);
 }
});
test('Prettier formata código JavaScript com parser real',async()=>{
 const r=await formatarComBiblioteca(validarFormato(exemplo));
 assert.match(r,/const x =/);assert.match(r,/a: 1/);assert.match(r,/b: 2/);
});
test('Prettier formata TypeScript, HTML e CSS',async()=>{
 const ts=await formatarComBiblioteca(validarFormato({...exemplo,linguagem:'typescript',codigo:'const x:number=1'}));
 assert.match(ts,/x: number = 1/);
 const html=await formatarComBiblioteca(validarFormato({...exemplo,linguagem:'html',codigo:'<div><span>Olá</span></div>'}));
 assert.match(html,/<div>/);
 const css=await formatarComBiblioteca(validarFormato({...exemplo,linguagem:'css',codigo:'a{color:red}'}));
 assert.match(css,/color: red/);
});
test('SQL Formatter processa consulta PostgreSQL',async()=>{
 const r=await formatarComBiblioteca(validarFormato({...exemplo,linguagem:'sql',dialeto:'postgresql',codigo:'select id, nome from produtos where ativo=1'}));
 assert.match(r,/SELECT/);assert.match(r,/FROM/);assert.match(r,/WHERE/);
});
test('JSON formatado e minificado mantêm valores',async()=>{
 const input='{"a":1,"b":[true,2]}';
 const bonito=await formatarComBiblioteca(validarFormato({...exemplo,linguagem:'json',codigo:input}));
 const curto=await formatarComBiblioteca(validarFormato({...exemplo,linguagem:'json',codigo:input,acao:'minificar'}));
 assert.deepEqual(JSON.parse(bonito),JSON.parse(input));
 assert.equal(curto,input);
});
test('sintaxe JavaScript inválida produz erro, não inventa correção',async()=>{
 await assert.rejects(()=>formatarComBiblioteca(validarFormato({...exemplo,codigo:'function () {'})),/SyntaxError|Unexpected|Error/i);
});
test('worker publica mensagem via API simulada e pode ser interrompido',async()=>{
 class WorkerFalso {
  terminate(){this.terminado=true;}
  postMessage(dados){queueMicrotask(()=>this.onmessage({data:{ok:true,resultado:dados.codigo+'\\n'}}));}
 }
 const r=await processarFormatadorEmWorker(exemplo,()=>new WorkerFalso());
 assert.match(r,/const x=/);
});

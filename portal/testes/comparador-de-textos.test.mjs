import {test} from 'node:test';import assert from 'node:assert/strict';
import {compararLinhas,calcularComparacao} from '../scripts/ferramentas/comparador-de-textos.js';
test('igualdade não cria mudanças',()=>assert.ok(compararLinhas('a\nb','a\nb').every(x=>x.tipo==='igual')));
test('inclusões e remoções corretas',()=>{
 const m=compararLinhas('a\nb\nc','a\nx\nc');
 assert.equal(m.filter(x=>x.tipo==='adicionada').length,1);
 assert.equal(m.filter(x=>x.tipo==='removida').length,1);
});
test('normaliza CRLF e preserva acentos',()=>{
 const m=compararLinhas('ação\r\nfim','ação\nfim');assert.ok(m.every(x=>x.tipo==='igual'));
});
test('limita custo de comparação e tamanho de texto',()=>{
 assert.throws(()=>compararLinhas('x\n'.repeat(401),'x'),/400 linhas/);
 assert.throws(()=>calcularComparacao({antes:'a'.repeat(30001),depois:'b'}));
});
test('exportação é TXT com diferenças',()=>{
 const r=calcularComparacao({antes:'a\nb',depois:'a\nc'});
 assert.match(r.texto,/\+ c/);assert.match(r.texto,/- b/);assert.equal(r.arquivos.length,1);
});

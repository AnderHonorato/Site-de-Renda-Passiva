import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDIOMAS,validarTraducao,obterDisponibilidade} from '../scripts/ferramentas/traduzir-texto.js';
test('aceita pares de idioma distintos e texto válido',()=>{
 assert.equal(validarTraducao(' Olá ','pt','en'),'Olá');
 assert.equal(Object.keys(IDIOMAS).length,3);
});
test('rejeita vazio, excesso de caracteres, idioma inválido e idioma repetido',()=>{
 for(const args of [[' ','pt','en'],['a'.repeat(10001),'pt','en'],['Olá','xx','en'],['Olá','pt','pt']])
  assert.throws(()=>validarTraducao(...args));
});
test('não finge disponibilidade sem API local completa',()=>{
 assert.equal(obterDisponibilidade(undefined),false);
 assert.equal(obterDisponibilidade({create(){}}),false);
 assert.equal(obterDisponibilidade({create(){},availability(){}}),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderizarContaTopo } from '../ferramentas/conta-topo-previa-pages.mjs';

function elemento(tag) {
  return {
    tag,className:'',textContent:'',href:'',hidden:false,children:[],
    append(...filhos){this.children.push(...filhos)},
    setAttribute(nome,valor){this[nome]=valor},
    remove(){}
  };
}
test('prévia estática mostra somente acesso ao site real, sem exigir novo login', () => {
  const anterior=globalThis.document;
  let raiz;
  globalThis.document={
    documentElement:{dataset:{raiz:'../../'}},
    getElementById:id=>id==='preferencias-visitante'?{hidden:true}:null,
    createElement:elemento
  };
  try{
    const fim={querySelector:()=>null,append:e=>{raiz=e;}};
    renderizarContaTopo(fim,{usuario:null},{idioma:'pt'});
    assert.equal(raiz.children.length,1);
    assert.equal(raiz.children[0].href,'../../servidor-teste.html');
    assert.match(raiz.children[0].innerHTML, /<svg[^>]*aria-hidden/);
    assert.equal(raiz.children[0]['aria-label'],'Abrir o site completo com login e conta');
    assert.equal(raiz.children[0].getAttribute,undefined);
  }finally{globalThis.document=anterior}
});

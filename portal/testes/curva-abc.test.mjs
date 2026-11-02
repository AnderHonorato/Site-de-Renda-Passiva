import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificarCurvaABC, calcularCurvaABCNaTela } from '../scripts/ferramentas/curva-abc.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base={tipo:'valor',produtos:'A; 800\nB; 150\nC; 50'};
test('classifica itens com contribuição acumulada e desempate estável',()=>{
 const r=classificarCurvaABC([{nome:'B',valor:150},{nome:'C',valor:50},{nome:'A',valor:800}]);
 assert.deepEqual(r.itens.map(x=>[x.nome,x.classe]),[['A','A'],['B','B'],['C','C']]);
 assert.deepEqual(r.classes,{A:1,B:1,C:1});
 assert.equal(r.itens[2].acumulado,100);
});
test('o maior item que sozinho cruza 80% fica em A',()=>{
 const r=classificarCurvaABC([{nome:'Líder',valor:950},{nome:'Outro',valor:50}]);
 assert.equal(r.itens[0].classe,'A');
 assert.equal(r.itens[1].classe,'B');
});
test('a tabela inclui classe e permite CSV/Excel sem dependências extras',()=>{
 const r=calcularCurvaABCNaTela(base);
 assert.equal(r.tabela.linhas.length,3);
 assert.equal(r.tabela.cabeçalho.at(-1),'Classe');
 assert.match(r.texto,/Produto/);
 assert.match(r.observações.join(' '),/não margem/);
});
test('quantidade não aceita fração e produtos repetidos são rejeitados',()=>{
 for(const p of ['A; 3,5\nB; 4','A; -1\nB; 5','A; 0\nB; 0','A; 5\na; 2','A; 20; 30\nB; 10']){
  const dados={tipo:p.includes('3,5')?'quantidade':'valor',produtos:p};
  assert.throws(()=>calcularCurvaABCNaTela(dados),e=>e instanceof ErroDeEntrada&&e.campo==='produtos',p);
 }
});
test('evita classificar números impossíveis ou uma lista vazia',()=>{
 assert.throws(()=>calcularCurvaABCNaTela({tipo:'valor',produtos:'Produto; 10'}),/2 a 150/);
 assert.throws(()=>calcularCurvaABCNaTela({tipo:'valor',produtos:'A; texto\nB; 20'}),/valor/);
 assert.throws(()=>calcularCurvaABCNaTela({tipo:'errado',produtos:base.produtos}),e=>e instanceof ErroDeEntrada&&e.campo==='tipo');
});

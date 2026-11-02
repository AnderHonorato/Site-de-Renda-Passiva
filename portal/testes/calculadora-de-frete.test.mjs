import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compararFretes, calcularFreteNaTela } from '../scripts/ferramentas/calculadora-de-frete.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base={comprimento:'60',largura:'40',altura:'50',volumes:'1',pesoRealKg:'12',distanciaKm:'100',
 transportadoras:'A; 10; 2; 0,50; 167; 0\nB; 15; 1,50; 0,50; 200; 0'};
test('compara preços distintos com fator volumétrico por transportadora',()=>{
 const r=calcularFreteNaTela(base);
 assert.match(r.valor,/100,08/);
 assert.equal(r.tabela.linhas.length,2);
 assert.equal(r.tabela.linhas[0][0],'A');
 assert.equal(r.tabela.linhas[1][0],'B');
});
test('uma transportadora pode cobrar por peso real enquanto outra cobra por cubagem',()=>{
 const r=compararFretes({comprimento:60,largura:40,altura:50,volumes:1,pesoRealKg:30,distanciaKm:0,
  transportadoras:[
   {nome:'A',precoBase:10,precoKg:1,precoKm:0,fatorKgM3:167,adicional:0},
   {nome:'B',precoBase:10,precoKg:1,precoKm:0,fatorKgM3:300,adicional:0}]});
 assert.equal(r.resultados[0].pesoTarifadoKg,30);
 assert.equal(r.resultados[1].pesoTarifadoKg,36);
});
test('avisos não afirmam que consulta preços em tempo real',()=>{
 const r=calcularFreteNaTela(base);
 assert.match(r.observações.join(' '),/digitados por você/);
 assert.match(r.observações.join(' '),/não consultados/);
});
test('valida fator zero, campos fracionários e transportadoras duplicadas',()=>{
 for(const [campo,valor] of [['volumes','1,5'],['pesoRealKg','-1'],['distanciaKm','-3'],
 ['transportadoras','A; 10; 1; 0; 0; 0\nB; 10; 1; 0; 167; 0'],
 ['transportadoras','A; 10; 1; 0; 167; 0\na; 10; 1; 0; 167; 0'],
 ['transportadoras','A; 10; 1; 0; 167\nB; 10; 1; 0; 167; 0']]) {
  assert.throws(()=>calcularFreteNaTela({...base,[campo]:valor}),
    e=>e instanceof ErroDeEntrada&&e.campo===campo,campo);
 }
});

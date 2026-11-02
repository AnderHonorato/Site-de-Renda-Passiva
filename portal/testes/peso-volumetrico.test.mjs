import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPesoVolumetrico, calcularPesoVolumetricoNaTela } from '../scripts/ferramentas/peso-volumetrico.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
const base={comprimento:'60',largura:'40',altura:'50',volumes:'1',pesoRealKg:'12',fatorKgM3:'167'};
test('peso cubado ultrapassa peso real com fator informado',()=>{
 const r=calcularPesoVolumetrico({comprimento:60,largura:40,altura:50,volumes:1,pesoRealKg:12,fatorKgM3:167});
 assert.ok(Math.abs(r.cubagemM3-0.12)<1e-10);
 assert.ok(Math.abs(r.pesoCubadoKg-20.04)<1e-9);
 assert.equal(r.critério,'cubado');assert.ok(Math.abs(r.pesoCobradoKg-20.04)<1e-9);
});
test('peso real prevalece quando é maior e considera o total da remessa',()=>{
 const r=calcularPesoVolumetrico({comprimento:60,largura:40,altura:50,volumes:2,pesoRealKg:55,fatorKgM3:167});
 assert.equal(r.critério,'real'); assert.equal(r.pesoCobradoKg,55);
});
test('fator não é apresentado como universal',()=>{
 const r=calcularPesoVolumetricoNaTela(base);
 assert.match(r.valor,/20,04/);
 assert.match(r.observações.join(' '),/somente um exemplo/);
 assert.match(r.observações.join(' '),/TOTAL/);
});
test('recusa medidas, factor e quantidade inválidos no campo correto',()=>{
 for(const [campo,valor] of [['comprimento','0'],['largura','-2'],['altura','10001'],
 ['volumes','1,5'],['fatorKgM3','0'],['pesoRealKg','-1']]){
  assert.throws(()=>calcularPesoVolumetricoNaTela({...base,[campo]:valor}),
   e=>e instanceof ErroDeEntrada&&e.campo===campo,campo);
 }
});

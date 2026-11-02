import {test} from 'node:test';
import assert from 'node:assert/strict';
import {organizarPauta, calcularPautaNaTela} from '../scripts/ferramentas/pauta-de-reuniao.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
import {arquivoBaixado} from './auxiliares/pdf-baixado.mjs';
const dados={titulo:'Reunião',data:'2026-11-02',inicio:'09:00',
 assuntos:'Resultados; Gerência; 20\nPlanejamento; Equipe; 40'};
test('pauta soma minutos e distribui horários',()=>{
 const r=organizarPauta([{assunto:'A',responsavel:'X',minutos:20},{assunto:'B',responsavel:'Y',minutos:40}],540);
 assert.equal(r.duracaoMinutos,60);
 assert.equal(r.terminoAbsoluto,600);
 const tela=calcularPautaNaTela(dados);
 assert.equal(tela.valor,'60 minutos');
 assert.deepEqual(tela.tabela.linhas.map(x=>x[0]),['09:00','09:20']);
});
test('pauta indica dia seguinte quando cruzar meia-noite',()=>{
 const tela=calcularPautaNaTela({...dados,inicio:'23:30'});
 assert.match(tela.resumo, /00:30 \(\+1 dia\)/);
});
test('pauta rejeita dias impossíveis, minutos não inteiros e campos vazios',()=>{
 for(const [campo,valor] of [['data','2026-02-30'],['inicio','24:00'],['assuntos','A; B; 0'],
  ['assuntos','A; B; 1,5'],['assuntos','A; B'],['titulo','']]){
  assert.throws(()=>calcularPautaNaTela({...dados,[campo]:valor}),
    e=>e instanceof ErroDeEntrada&&e.campo===campo,campo);
 }
});
test('pauta gera PDF real sem inscrição',async()=>{
 const {nome,tipo,bytes}=await arquivoBaixado(calcularPautaNaTela(dados).arquivos[0].gerar);
 assert.equal(nome,'pauta-de-reuniao.pdf');
 assert.equal(tipo,'application/pdf');
 assert.match(new TextDecoder('latin1').decode(bytes.slice(0,8)),/%PDF-1/);
});

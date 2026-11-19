import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEdicao, montarArgumentosFFmpeg, ErroEstudio } from '../servidor/estudio-midia-processamento.mjs';

const arquivos=new Map([
 ['v1',{id:'v1',caminho:'/tmp/input-1.mp4',duracao:12,video:true,audio:true}],
 ['v2',{id:'v2',caminho:'/tmp/input-2.mp4',duracao:8,video:true,audio:false}],
 ['a1',{id:'a1',caminho:'/tmp/input-3.mp3',duracao:9,video:false,audio:true}]
]);
test('F357 combina vídeos heterogêneos com linha do tempo, filtro e áudio silencioso onde falta',()=>{
 const plano=normalizarEdicao('video',[
   {arquivo:'v1',inicio:1,fim:4,volume:0.7,filtro:'quente'},
   {arquivo:'v2',inicio:0,fim:3,volume:1,filtro:'pb'}
 ],arquivos);
 assert.equal(plano.duracao,6);
 assert.equal(plano.trechos.length,2);
 const args=montarArgumentosFFmpeg(plano,'/tmp/saida.mp4');
 assert.equal(args.at(-1),'/tmp/saida.mp4');
 assert.ok(args.includes('-filter_complex'));
 assert.ok(args.join(' ').includes('anullsrc'));
 assert.match(args[args.indexOf('-filter_complex')+1],/concat=n=2:v=1:a=1/);
 assert.match(args[args.indexOf('-filter_complex')+1],/eq=brightness=/);
 assert.ok(args.includes('-movflags'));
 assert.ok(!args.includes('-filter_script'));
});
test('F358 monta episódio de áudio com fade, ganho e normalização de volume',()=>{
 const plano=normalizarEdicao('audio',[
   {arquivo:'a1',inicio:1,fim:4,volume:0.6},
   {arquivo:'a1',inicio:5,fim:7,volume:1}
 ],arquivos);
 assert.equal(plano.duracao,5);
 const args=montarArgumentosFFmpeg(plano,'/tmp/saida.mp3');
 const filtro=args[args.indexOf('-filter_complex')+1];
 assert.match(filtro,/concat=n=2:v=0:a=1/);
 assert.match(filtro,/loudnorm=I=-16:TP=-1\.5:LRA=11/);
 assert.match(filtro,/afade=t=in/);
 assert.ok(args.includes('libmp3lame'));
});
test('rejeita arquivos ausentes, mídia errada e edição inválida',()=>{
 assert.throws(()=>normalizarEdicao('video',[{arquivo:'a1',inicio:0,fim:1}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('audio',[{arquivo:'v1',inicio:0,fim:1}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('video',[{arquivo:'v1',inicio:0,fim:0}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('video',[{arquivo:'v1',inicio:-2,fim:1}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('video',[{arquivo:'v1',inicio:1,fim:15}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('video',Array.from({length:9},()=>({arquivo:'v1',inicio:0,fim:2})),arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('video',[{arquivo:'v1',inicio:0,fim:1,filtro:'evil;rm'}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('audio',[{arquivo:'a1',inicio:0,fim:1,volume:Infinity}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('audio',[{arquivo:'a1',inicio:0,fim:1,volume:50}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('video',[{arquivo:'v1',inicio:0,fim:1,extra:'-filter_complex'}],arquivos),ErroEstudio);
 assert.throws(()=>normalizarEdicao('gif',[],arquivos),ErroEstudio);
});
test('caminho binário não é controlado pelo usuário, sem shell ou URL de entrada',()=>{
 const plano=normalizarEdicao('video',[{arquivo:'v1',inicio:0,fim:3}],arquivos);
 const args=montarArgumentosFFmpeg(plano,'/tmp/saida.mp4');
 assert.ok(args.includes('-nostdin'));
 assert.ok(args.includes('-protocol_whitelist'));
 assert.ok(args.includes('file,pipe'));
 assert.ok(!args.includes('https://example.com'));
 assert.equal(args.filter(x=>x==='/tmp/input-1.mp4').length,1);
});
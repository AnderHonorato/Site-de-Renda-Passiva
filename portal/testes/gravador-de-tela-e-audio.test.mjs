import {test} from 'node:test';import assert from 'node:assert/strict';import {escolherFormato,extensaoParaTipo,descreverErroCaptura,duracaoGravacaoMs} from '../scripts/ferramentas/gravador-de-tela-e-audio.js';
test('negociação de codecs suportados',()=>{assert.equal(escolherFormato(['video/mp4','video/webm'],x=>x==='video/webm'),'video/webm');assert.equal(escolherFormato(['audio/mp4'],()=>false),'');});
test('extensão coerente com o contêiner',()=>{assert.equal(extensaoParaTipo('video/mp4'),'mp4');assert.equal(extensaoParaTipo('audio/ogg'),'ogg');assert.equal(extensaoParaTipo('video/webm;codecs=vp8'),'webm');});

test('erros de permissão, hardware e indisponibilidade são explicados',()=>{
  assert.match(descreverErroCaptura({name:'NotAllowedError'}),/Permissão/);
  assert.match(descreverErroCaptura({name:'NotFoundError'}),/dispositivo/);
  assert.match(descreverErroCaptura({name:'NotReadableError'}),/ocupado/);
  assert.match(descreverErroCaptura({message:'Falha inesperada'}),/Falha inesperada/);
});

test('cronômetro desconta pausas e nunca retorna duração negativa',()=>{
  assert.equal(duracaoGravacaoMs(1000,2000,10000),7000);
  assert.equal(duracaoGravacaoMs(1000,1000,10000,8000),6000);
  assert.equal(duracaoGravacaoMs(1000,20000,10000),0);
  assert.equal(duracaoGravacaoMs(0,0,10000),0);
});

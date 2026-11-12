import {test} from 'node:test';import assert from 'node:assert/strict';import {escolherFormato,extensaoParaTipo} from '../scripts/ferramentas/gravador-de-tela-e-audio.js';
test('negociação de codecs suportados',()=>{assert.equal(escolherFormato(['video/mp4','video/webm'],x=>x==='video/webm'),'video/webm');assert.equal(escolherFormato(['audio/mp4'],()=>false),'');});
test('extensão coerente com o contêiner',()=>{assert.equal(extensaoParaTipo('video/mp4'),'mp4');assert.equal(extensaoParaTipo('audio/ogg'),'ogg');assert.equal(extensaoParaTipo('video/webm;codecs=vp8'),'webm');});

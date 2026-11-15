import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { respostaFAQ } from '../scripts/núcleo/flower-faq.js';
import { flowerConfigAdmin, flowerStatus, pinnedLookup, responderFlower, salvarConfigFlower } from '../servidor/flower.mjs';

function dbFlower(){const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE flower_config(id INTEGER PRIMARY KEY,provider TEXT NOT NULL DEFAULT 'openai',model TEXT NOT NULL DEFAULT '',base_url TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0,key_ciphertext TEXT,key_iv TEXT,key_tag TEXT,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);INSERT INTO flower_config(id) VALUES(1);`);return db;}

test('Flower: FAQ offline responde cumprimentos, planos, editores e FAQ real e sinaliza dúvidas desconhecidas',()=>{
  assert.match(respostaFAQ('Olá!'),/sou a Flower/u);
  assert.match(respostaFAQ('Qual é o seu nome?'),/Flower/u);
  assert.match(respostaFAQ('Quantas ferramentas prontas existem?'),/258 ferramentas prontas/u);
  assert.match(respostaFAQ('As ferramentas são grátis?'),/públicas gratuitas.*Plus ou Premium/u);
  assert.match(respostaFAQ('Como editar um PDF?'),/não altera o texto que já existe/u);
  assert.match(respostaFAQ('Como editar uma imagem?'),/navegador.*original fica intacto/u);
  assert.match(respostaFAQ('Como cortar e converter áudio?'),/Editor de áudio.*WAV, MP3/u);
  assert.match(respostaFAQ('Como editar um DOCX?'),/Editor de documentos.*DOCX ou TXT/u);
  assert.match(respostaFAQ('Como editar um PPTX?'),/Editor de apresentações.*PPTX/u);
  assert.match(respostaFAQ('Como editar uma planilha XLSX?'),/Editor de planilhas.*XLSX ou CSV/u);
  assert.match(respostaFAQ('Como salvo favoritos?'),/neste aparelho.*sincronizá-los/u);
  assert.match(respostaFAQ('Como encontro o portal?'),/página Ferramentas/u);
  assert.match(respostaFAQ('Como funciona a privacidade dos meus dados?'),/Privacidade e Cookies/u);
  assert.match(respostaFAQ('A inteligência artificial responde online?'),/IA online/u);
  assert.equal(respostaFAQ('Pode ler meu arquivo e dizer o que tem nele?'),null);
  assert.equal(respostaFAQ('x'.repeat(1600)),null);
});

test('Flower: chave é cifrada, não volta no GET e provider Responses é verificável sem rede',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-flower-unit-'));
  const anterior=process.env.PORTAL_IA_CHAVE_MESTRA_FILE;process.env.PORTAL_IA_CHAVE_MESTRA_FILE=join(pasta,'master.key');
  const db=dbFlower();
  try {
    let config=salvarConfigFlower(db,{provider:'openai',model:'modelo-de-teste',apiKey:'chave-de-teste-nao-real',enabled:true,revision:1});
    assert.equal(config.online,true);assert.equal(config.hasKey,true);
    assert.equal('apiKey' in config,false);assert.equal('key_ciphertext' in config,false);
    assert.equal('key_ciphertext' in flowerConfigAdmin(db),false);
    const saved=db.prepare('SELECT key_ciphertext,key_iv,key_tag FROM flower_config').get();
    assert.ok(saved.key_ciphertext);assert.notEqual(Buffer.from(saved.key_ciphertext,'base64').toString(),'chave-de-teste-nao-real');
    assert.equal(statSync(join(pasta,'master.key')).mode&0o777,0o600);
    assert.equal(flowerStatus(db).online,true);
    let called;
    const result=await responderFlower(db,[{role:'user',content:'Oi'}],{request:async(url,headers,body)=>{called={url:String(url),headers,body:JSON.parse(body)};return {status:200,body:JSON.stringify({output:[{content:[{type:'output_text',text:'Olá!'}]}]})};}});
    assert.equal(called.url,'https://api.openai.com/v1/responses');
    assert.equal(called.headers.Authorization,'Bearer chave-de-teste-nao-real');
    assert.match(called.body.instructions,/Contexto limitado do portal/u);
    assert.equal(called.body.input[0].content,'Oi');assert.equal(called.body.store,false);assert.equal(called.body.max_output_tokens,1024);
    assert.deepEqual(result,{reply:'Olá!',online:true});
    await responderFlower(db,[{role:'user',content:'Oi'},{role:'assistant',content:'Olá!'},{role:'user',content:'E agora?'}],{request:async(_url,_headers,body)=>{const payload=JSON.parse(body);assert.equal(payload.input[0].content,'Oi');assert.equal(payload.input[1].role,'assistant');assert.equal(payload.input[1].content,'Olá!');assert.equal(payload.input[2].content,'E agora?');return {status:200,body:JSON.stringify({output:[{content:[{type:'output_text',text:'Segunda resposta'}]}]})};}});
    assert.equal(JSON.stringify(flowerConfigAdmin(db)).includes('chave-de-teste-nao-real'),false);
    const compat={
      anthropic:{url:'https://api.anthropic.com/v1/messages',body:{content:[{type:'text',text:'Resposta Claude'}]},verify:({body,headers})=>{assert.ok(body.system);assert.equal(body.messages[0].role,'user');assert.equal(headers['x-api-key'],'chave-de-teste-nao-real');}},
      gemini:{url:'https://generativelanguage.googleapis.com/v1beta/models/modelo-de-teste:generateContent',body:{candidates:[{content:{parts:[{text:'Resposta Gemini'}]}}]},verify:({body,headers,url})=>{assert.equal(body.contents[0].role,'user');assert.equal(body.generationConfig.maxOutputTokens,1024);assert.equal(headers['x-goog-api-key'],'chave-de-teste-nao-real');assert.equal(new URL(url).search,'');}},
      groq:{url:'https://api.groq.com/openai/v1/chat/completions',body:{choices:[{message:{content:'Resposta Groq'}}]}},
      deepseek:{url:'https://api.deepseek.com/v1/chat/completions',body:{choices:[{message:{content:'Resposta DeepSeek'}}]}},
      mistral:{url:'https://api.mistral.ai/v1/chat/completions',body:{choices:[{message:{content:'Resposta Mistral'}}]}},
      xai:{url:'https://api.x.ai/v1/chat/completions',body:{choices:[{message:{content:'Resposta xAI'}}]}},
      openrouter:{url:'https://openrouter.ai/api/v1/chat/completions',body:{choices:[{message:{content:'Resposta OpenRouter'}}]}},
      cohere:{url:'https://api.cohere.com/v2/chat',body:{message:{content:[{text:'Resposta Cohere'}]}},verify:({body})=>{assert.equal(body.max_tokens,700);assert.equal(body.messages[0].role,'system');assert.equal(body.messages[1].role,'user');}},
    };
    let revision=2;
    for(const [provider,expect] of Object.entries(compat)){
      config=salvarConfigFlower(db,{provider,model:'modelo-de-teste',apiKey:'chave-de-teste-nao-real',enabled:true,revision});revision=config.revision;
      let request;
      const output=await responderFlower(db,[{role:'user',content:'Oi'}],{request:async(url,headers,body)=>{request={url:String(url),headers,body:JSON.parse(body)};return {status:200,body:JSON.stringify(expect.body)};}});
      assert.equal(request.url,expect.url);expect.verify?.(request);assert.match(output.reply,/Resposta/u);
    }
    assert.throws(()=>salvarConfigFlower(db,{provider:'openai',model:'outro',enabled:true,apiKey:'',revision:1}),e=>e.status===409);
    await assert.rejects(()=>responderFlower(db,[{role:'user',content:'Oi'}],{request:async()=>({status:401,body:'{"error":{"message":"invalid api key"}}'})}),e=>e.codigo==='flower_credencial_invalida');
    await assert.rejects(()=>responderFlower(db,[{role:'user',content:'Oi'}],{request:async()=>({status:429,body:'{"error":{"message":"rate limit"}}'})}),e=>e.codigo==='flower_limite_provedor');
  } finally {db.close();if(anterior===undefined)delete process.env.PORTAL_IA_CHAVE_MESTRA_FILE;else process.env.PORTAL_IA_CHAVE_MESTRA_FILE=anterior;rmSync(pasta,{recursive:true,force:true});}
});

test('Flower: hosts custom exigem HTTPS público e segredo fica fora da URL',()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-flower-custom-'));
  const anterior=process.env.PORTAL_IA_CHAVE_MESTRA_FILE;process.env.PORTAL_IA_CHAVE_MESTRA_FILE=join(pasta,'master.key');
  const db=dbFlower();
  try {
    assert.throws(()=>salvarConfigFlower(db,{provider:'custom',baseUrl:'http://localhost',model:'modelo',apiKey:'segredo-de-teste',enabled:true,revision:1}),e=>e.status===400);
    const saved=salvarConfigFlower(db,{provider:'custom',baseUrl:'https://api.exemplo.org/prefixo',model:'modelo livre',apiKey:'segredo-de-teste',enabled:true,revision:1});
    assert.equal(saved.baseUrl,'https://api.exemplo.org/prefixo');
    assert.equal(JSON.stringify(saved).includes('segredo-de-teste'),false);
  } finally {db.close();if(anterior===undefined)delete process.env.PORTAL_IA_CHAVE_MESTRA_FILE;else process.env.PORTAL_IA_CHAVE_MESTRA_FILE=anterior;rmSync(pasta,{recursive:true,force:true});}
});

test('Flower: mudar destino apaga a chave antiga e exige chave nova para reabilitar',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-flower-rotation-'));
  const anterior=process.env.PORTAL_IA_CHAVE_MESTRA_FILE;process.env.PORTAL_IA_CHAVE_MESTRA_FILE=join(pasta,'master.key');
  const db=dbFlower();
  try {
    let config=salvarConfigFlower(db,{provider:'openai',model:'modelo',apiKey:'chave-openai-nao-real',enabled:true,revision:1});
    assert.throws(()=>salvarConfigFlower(db,{provider:'groq',model:'modelo',apiKey:'',enabled:true,revision:config.revision}),e=>e.codigo==='flower_chave_nova_obrigatoria');
    config=salvarConfigFlower(db,{provider:'groq',model:'modelo',apiKey:'',enabled:false,revision:config.revision});
    assert.equal(config.hasKey,false);assert.equal(config.online,false);
    await assert.rejects(()=>responderFlower(db,[{role:'user',content:'oi'}],{request:async()=>{throw Error('não deve enviar')}}),e=>e.codigo==='flower_offline');
    const fixed=pinnedLookup({address:'203.0.113.9',family:4});
    let value;fixed('example.org',{all:false},(...args)=>{value=args;});assert.deepEqual(value,[null,'203.0.113.9',4]);
    fixed('example.org',{all:true},(...args)=>{value=args;});assert.deepEqual(value,[null,[{address:'203.0.113.9',family:4}]]);
  } finally {db.close();if(anterior===undefined)delete process.env.PORTAL_IA_CHAVE_MESTRA_FILE;else process.env.PORTAL_IA_CHAVE_MESTRA_FILE=anterior;rmSync(pasta,{recursive:true,force:true});}
});

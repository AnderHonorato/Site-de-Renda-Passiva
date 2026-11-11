import test from 'node:test';
import assert from 'node:assert/strict';
import {extrairEnderecoEstavel,variaveisDeServidor,PORTA_WEB,PORTA_API}
 from '../ferramentas/servidor-tunel-estavel.mjs';
import {comandoInicializacao}
 from '../ferramentas/configurar-tunel-estavel.mjs';

test('SSH só aceita domínio HTTPS específico do túnel gratuito',()=>{
 const a='https://brave-fox-7c41e09b.tunnl.gg';
 assert.equal(extrairEnderecoEstavel('{"type":"ready","url":"'+a+'"}'),a);
 assert.equal(extrairEnderecoEstavel('log antes '+a+'\nlog depois'),a);
 assert.equal(extrairEnderecoEstavel('https://attacker.example.com'),null);
 assert.equal(extrairEnderecoEstavel('https://tunnl.gg'),null);
 assert.equal(extrairEnderecoEstavel('https://abc.tunnl.gg.attacker.example'),null);
 assert.equal(extrairEnderecoEstavel(12),null);
});
test('API e site usam mesma origem HTTPS com dados separados no PC',()=>{
 const url='https://silent-otter-1234abcd.tunnl.gg';
 const env=variaveisDeServidor(url,{NODE_ENV:'development',PORTAL_CHAT_PUBLICO:'1'});
 assert.equal(env.URL_PUBLICA,url);
 assert.equal(env.NODE_ENV,'production');
 assert.equal(env.PORTAL_CHAT_PUBLICO,'0');
 assert.equal(env.PORTAL_CHAT_LOCAL,'0');
 assert.equal(env.PORTAL_ADS_ATIVO,'0');
 assert.equal(env.PORTAL_API_PORTA,String(PORTA_API));
 assert.equal(PORTA_WEB,4418);
 assert.ok(env.PORTAL_BANCO.endsWith('portal.sqlite'));
 assert.throws(()=>variaveisDeServidor('https://evil.example'),/tunnl.gg/);
 assert.throws(()=>variaveisDeServidor(url+'/entrar'),/tunnl.gg/);
});
test('início oculto preserva espaços e é limitado a arquivo VBS',()=>{
 assert.equal(comandoInicializacao('C:\\Projetos\\Ander Flow\\site.vbs'),
   'wscript.exe "C:\\Projetos\\Ander Flow\\site.vbs"');
 assert.throws(()=>comandoInicializacao('C:\\Windows\\cmd.exe'));
});

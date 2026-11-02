import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basePublica,completarSeo } from '../ferramentas/seo.mjs';
import { faixaDePrestigio } from '../scripts/núcleo/prestígio.js';
import { abrirBanco } from '../servidor/banco.mjs';
import { configuracaoPublicidade,salvarPublicidade,validarPublicidade } from '../servidor/publicidade.mjs';
import { ferramentasProntas } from '../dados/catálogo.js';
import { instrucoesEmHtml } from '../scripts/núcleo/instruções.js';

test('SEO não publica domínio falso, credenciais ou endereços locais',()=>{
  for(const u of ['', 'http://exemplo.com/','https://exemplo.invalid/','https://localhost/','https://127.0.0.1/','https://usuario:senha@exemplo.com/']) assert.equal(basePublica(u),null);
  assert.equal(basePublica('https://meuportal.com'),'https://meuportal.com/');
});

test('SEO gera canônica, idioma absoluto, dados estruturados e metadados sem executar HTML',()=>{
  const html='<head><title>Título &amp; Nome</title><meta name="description" content="Descrição"><link rel="alternate" hreflang="en" href="en/"></head>';
  const r=completarSeo(html,'index.html',{base:'https://meuportal.com/'});
  assert.match(r,/<link rel="canonical" href="https:\/\/meuportal.com\/">/u);assert.match(r,/hreflang="en" href="https:\/\/meuportal.com\/en\/"/u);
  assert.match(r,/property="og:title"/u);
  const ferramenta={nome:'</script><script>alert(1)</script>',resumo:'Texto'};
  const tool=completarSeo(html,'f/teste/index.html',{base:'https://meuportal.com/',ferramenta});
  const schema=JSON.parse(tool.match(/<script type="application\/ld\+json">(.*?)<\/script>/u)[1]);
  assert.equal(schema['@graph'][0].name,ferramenta.nome);assert.equal(schema['@graph'][0].url,'https://meuportal.com/f/teste/');
  assert.doesNotMatch(tool,/<script>alert/u);
  assert.doesNotMatch(completarSeo('<head><meta name="robots" content="noindex,follow"></head>','conta/index.html',{base:'https://meuportal.com/'}),/rel="canonical"/u);
});

test('todas as ferramentas com instruções já têm explicações no HTML estático',async()=>{
  for(const f of ferramentasProntas) {
    const modulo=await import(`../scripts/ferramentas/${f.slug}.js`);
    const esperado=instrucoesEmHtml((modulo.default||modulo.definição)?.instruções);
    if(esperado) assert.ok(readFileSync(new URL(`../f/${f.slug}/index.html`,import.meta.url),'utf8').includes(esperado),f.slug);
  }
});

test('prestígio acompanha marcos de nível e emblemas efetivamente desbloqueados',()=>{
  assert.deepEqual([1,3,5,8,13,1000].map(nivel=>faixaDePrestigio({nivel})),[0,1,2,3,4,4]);
  assert.equal(faixaDePrestigio({nivel:1,medalhas:[{tier:7,desbloqueada:false}]}),0);
  assert.equal(faixaDePrestigio({nivel:1,medalhas:[{tier:7,desbloqueada:true}]}),4);
  assert.equal(faixaDePrestigio({nivel:'<svg>'}),0);
});

test('publicidade: configuração salva, editor/blocos válidos e demonstração bloqueada em produção',()=>{
  const config={ativo:true,demonstracao:true,teste:true,editor:'',blocos:{}};
  assert.throws(()=>validarPublicidade(config,{NODE_ENV:'production'}),e=>e.codigo==='demonstracao_local');
  assert.throws(()=>validarPublicidade({...config,demonstracao:false}),e=>e.codigo==='configuracao_incompleta');
  assert.throws(()=>validarPublicidade({...config,editor:'<script>'}),e=>e.codigo==='editor_invalido');
  assert.throws(()=>validarPublicidade({...config,blocos:{rodape:'erro'}}),e=>e.codigo==='bloco_invalido');
  const db=abrirBanco(':memory:');
  try { salvarPublicidade(db,config,{NODE_ENV:'development'});assert.equal(configuracaoPublicidade(db).demonstracao,true); }
  finally {db.close();}
});

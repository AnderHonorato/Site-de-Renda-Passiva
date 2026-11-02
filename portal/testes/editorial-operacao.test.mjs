import test from 'node:test';import assert from 'node:assert/strict';import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync } from 'node:fs';import { tmpdir } from 'node:os';import { join } from 'node:path';
import { validarEditorial,criarEditorial,PONTOS_PADRAO } from '../servidor/editorial.mjs';import { criarProtecao } from '../servidor/trafego.mjs';
test('editorial recusa ferramentas/campos inventados, HTML, nomes repetidos, protótipos e cotas incoerentes',()=>{
  assert.deepEqual(validarEditorial({}).pontos,PONTOS_PADRAO);
  for(const c of [{ferramentas:{inventada:{en:{nome:'Teste',resumo:'Teste'}}}},{textos:{'inicio.titulo':{'pt-BR':'<script>teste</script>'}}},{pontos:{constructor:1}},{pontos:{por_uso:999}},{limites:{gratuito:{limites:{favoritos:1000,trabalhos:3},dados_maximo_bytes:20480,armazenamento_maximo_bytes:61440}}},{ferramentas:{porcentagem:{en:{nome:'Teste',resumo:'Teste',status:'pronta'}}}}])assert.throws(()=>validarEditorial(c));
});
test('rascunho preserva publicação, bloqueia edição desatualizada e restaura revisão sem apagar histórico',()=>{
  const db=new DatabaseSync(':memory:');try{const e=criarEditorial(db),antes=e.painel();let r=e.salvar({textos:{'inicio.titulo':{'pt-BR':'Novo título'}}},antes.versao);
    assert.equal(r.publicado.textos['inicio.titulo'],undefined);assert.equal(r.versao,2);assert.throws(()=>e.salvar({},1),x=>x.codigo==='editorial_alterado');
    const original=e.historico().find(h=>h.acao==='anterior');r=e.restaurar(original.id,r.versao);assert.equal(r.rascunho.textos['inicio.titulo'],undefined);assert.equal(e.historico().length,4);
  }finally{db.close();}
});
test('publicação isolada é idempotente, restaura artefato em falha e recupera interrupção no próximo início',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-editorial-unit-')),db=new DatabaseSync(':memory:');mkdirSync(join(pasta,'ferramentas'));mkdirSync(join(pasta,'dados'));
  const script=join(pasta,'ferramentas/gerar.mjs'),arquivo=join(pasta,'dados/editorial-publicado.js');writeFileSync(script,'process.exit(0)');writeFileSync(arquivo,'export const editorial = {};\n');
  try{const e=criarEditorial(db,{pasta});const r=e.salvar({pontos:{por_uso:3},textos:{'inicio.titulo':{'pt-BR':'Texto publicado'}}},1);await e.publicar(r.versao);const publicado=readFileSync(arquivo,'utf8');assert.match(publicado,/Texto publicado/);assert.equal(e.publicado().pontos.por_uso,3);await e.publicar(r.versao);assert.equal(e.historico().filter(h=>h.acao==='publicar').length,1);
    const outro=e.salvar({textos:{'inicio.titulo':{'pt-BR':'Não publicar'}}},r.versao);writeFileSync(script,'process.exit(1)');await assert.rejects(e.publicar(outro.versao));assert.equal(readFileSync(arquivo,'utf8'),publicado);assert.equal(e.publicado().textos['inicio.titulo']['pt-BR'],'Texto publicado');
    writeFileSync(script,'process.exit(0)');writeFileSync(arquivo,'export const editorial = {textos:{}};');db.prepare('UPDATE portal_editorial SET publicacao_pendente=1').run();await e.recuperar();assert.match(readFileSync(arquivo,'utf8'),/Texto publicado/);assert.equal(e.painel().publicando,false);
  }finally{db.close();assert.ok(pasta.startsWith(tmpdir()));rmSync(pasta,{recursive:true,force:true});}
});
test('tráfego persiste bloqueio, reincide em minutos/horas e não prolonga por consultar enquanto bloqueado',()=>{
  const db=new DatabaseSync(':memory:');let agora=1000000;try{let p=criarProtecao(db,{agora:()=>agora});const disparar=()=>{p.conferir('login:192.0.2.1',1,1000);assert.throws(()=>p.conferir('login:192.0.2.1',1,1000),e=>e.status===429);};
    disparar();const b=p.listar()[0];assert.equal(b.bloqueado_ate-agora,60000);assert.ok(!JSON.stringify(b).includes('192.0.2.1'));p=criarProtecao(db,{agora:()=>agora});assert.throws(()=>p.conferir('login:192.0.2.1',1,1000));assert.equal(p.listar()[0].bloqueado_ate,b.bloqueado_ate);
    agora=b.bloqueado_ate+1;disparar();assert.equal(p.listar()[0].bloqueado_ate-agora,1800000);agora=p.listar()[0].bloqueado_ate+1;disparar();assert.equal(p.listar()[0].bloqueado_ate-agora,7200000);
    const atual=p.listar()[0];assert.throws(()=>p.desbloquear(atual.id,0));p.desbloquear(atual.id,atual.bloqueado_ate);assert.equal(p.listar()[0].ativo,false);p.conferir('login:192.0.2.1',1,1000);
  }finally{db.close();}
});
test('ritmo de chat não cria restrição persistente e erros registrados não armazenam corpo nem detalhes',()=>{
  const db=new DatabaseSync(':memory:');try{const p=criarProtecao(db,{agora:()=>1000});p.conferir('chat2:1',1,2000);assert.throws(()=>p.conferir('chat2:1',1,2000),e=>e.retryAfter===2);assert.deepEqual(p.listar(),[]);p.registrarErro('POST');assert.deepEqual(Object.keys(db.prepare('SELECT * FROM operacao_erros').get()),['id','metodo','codigo','criado_em']);}finally{db.close();}
});

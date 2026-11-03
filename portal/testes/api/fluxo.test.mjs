import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { ferramentasProntas } from '../../dados/catálogo.js';
import { setTimeout as aguardar } from 'node:timers/promises';

const raiz=resolve(import.meta.dirname,'../../');
const origem='http://127.0.0.1:4400';
const portaLivre=()=>new Promise(ok=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});

test('autenticação, CSRF, chat, bloqueio e administração',async()=>{
  const pasta=mkdtempSync(join(tmpdir(),'portal-api-teste-'));
  const porta=await portaLivre();
  process.env.PORTAL_BANCO=join(pasta,'banco.sqlite');
  process.env.PORTAL_CHAT_LOCAL='1';
  process.env.PORTAL_SSE_PING_MS='100';
  process.env.PORTAL_EMAILS_DIR=join(pasta,'emails');
  const { iniciar, fecharBanco }=await import('../../servidor/iniciar.mjs');
  const servidor=await iniciar({porta});
  let db;
  const base=`http://127.0.0.1:${porta}`;
  let cookie='',csrf='';
  async function pedir(caminho,metodo='GET',body,jar=true){
    const resposta=await fetch(base+caminho,{method:metodo,headers:{...(jar&&cookie?{Cookie:cookie}:{}),...(metodo!=='GET'?{Origin:origem,'X-CSRF-Token':csrf,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const set=resposta.headers.getSetCookie?.()||[];
    if(jar&&set.length){const mapa=new Map(cookie.split('; ').filter(Boolean).map(x=>x.split('=')));for(const item of set){const [k,v]=item.split(';')[0].split('=');mapa.set(k,v);}cookie=[...mapa].map(([k,v])=>`${k}=${v}`).join('; ');csrf=mapa.get('csrf')||csrf;}
    return {status:resposta.status,data:await resposta.json(),retryAfter:resposta.headers.get('Retry-After')};
  }
  try{
    let r=await pedir('/api/autenticacao/sessao');assert.equal(r.status,200);assert.equal(r.data.usuario,null);
    cookie=cookie.replace(/csrf=[^;]+/,'csrf=bad');r=await pedir('/api/autenticacao/sessao');assert.equal(r.status,200);assert.match(csrf,/^[A-Za-z0-9_-]{43}$/);
    r=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Alice',email:'alice@example.com',usuario:'alice',senha:'senha-muito-forte-123',idade:20,aceitaTermos:true});assert.equal(r.status,201);assert.equal(r.data.usuario.papel,'usuario');
    r=await pedir('/api/autenticacao/sessao');assert.equal(r.data.usuario.usuario,'alice');
    r=await pedir('/api/conta');assert.deepEqual(r.data.limites,{favoritos:10,trabalhos:3,lote_arquivos:3});assert.deepEqual(r.data.uso,{favoritos:0,trabalhos:0});
    r=await pedir('/api/perfil','PATCH',{ferramentas_recomendadas:[ferramentasProntas[0].slug]});assert.equal(r.status,400);
    r=await pedir(`/api/ferramentas/${ferramentasProntas[0].slug}/uso`,'POST',{});assert.equal(r.status,200);
    r=await pedir('/api/perfil','PATCH',{ferramentas_recomendadas:[ferramentasProntas[0].slug]});assert.equal(r.status,200);assert.deepEqual(r.data.perfil.ferramentas_recomendadas,[ferramentasProntas[0].slug]);
    r=await pedir(`/api/favoritos/${ferramentasProntas[0].slug}`,'PUT',{});assert.equal(r.status,200);
    for(const f of ferramentasProntas.slice(1,10)){r=await pedir(`/api/favoritos/${f.slug}`,'PUT',{});assert.equal(r.status,200);}
    r=await pedir(`/api/favoritos/${ferramentasProntas[0].slug}`,'PUT',{});assert.equal(r.status,200);
    r=await pedir(`/api/favoritos/${ferramentasProntas[10].slug}`,'PUT',{});assert.equal(r.status,403);assert.equal(r.data.erro,'limite_favoritos');
    r=await pedir('/api/favoritos');assert.equal(r.data.favoritos.length,10);
    const slugTrabalho=ferramentasProntas[0].slug;
    const trabalhos=[];
    for(let n=1;n<=3;n++){r=await pedir('/api/trabalhos','POST',{ferramenta_slug:slugTrabalho,titulo:`Trabalho ${n}`,dados:{valor:String(n),opcao:'teste'},situacao:'salvo'});assert.equal(r.status,201);trabalhos.push(r.data.trabalho);}
    r=await pedir('/api/trabalhos','POST',{ferramenta_slug:slugTrabalho,titulo:'Excedente',dados:{valor:'4'},situacao:'salvo'});assert.equal(r.status,403);assert.equal(r.data.erro,'limite_do_plano');
    r=await pedir('/api/trabalhos');assert.equal(r.status,200);assert.equal(r.data.limite,3);assert.equal(r.data.trabalhos.length,3);
    r=await pedir(`/api/trabalhos/${trabalhos[0].id}`);assert.equal(r.status,200);assert.deepEqual(r.data.trabalho.dados,{valor:'1',opcao:'teste'});
    r=await pedir(`/api/trabalhos/${trabalhos[0].id}`,'PATCH',{titulo:'Trabalho renomeado'});assert.equal(r.status,200);assert.equal(r.data.trabalho.titulo,'Trabalho renomeado');
    r=await pedir(`/api/trabalhos/${trabalhos[2].id}`,'DELETE',{});assert.equal(r.status,200);assert.equal(r.data.ok,true);
    r=await pedir('/api/conta');assert.equal(r.data.uso.trabalhos,2);
    r=await pedir('/api/suporte','POST',{assunto:'Ajuda no site',texto:'Preciso de ajuda com uma ferramenta.'});assert.equal(r.status,201);const suporteId=r.data.id;
    r=await pedir('/api/chat/salas');assert.equal(r.status,403);
    r=await pedir('/api/chat/aceite','POST',{});assert.equal(r.status,400);assert.equal(r.data.erro,'aceite_obrigatorio');
    r=await pedir('/api/chat/aceite','POST',{aceito:false});assert.equal(r.status,400);
    r=await pedir('/api/chat/aceite','POST',{aceito:true});assert.equal(r.status,200);
    r=await pedir('/api/chat/salas');assert.equal(r.status,200);assert.ok(r.data.salas.some(s=>s.id==='global'));
    r=await pedir('/api/chat/salas/global/mensagens','POST',{texto:'Olá, mundo!'});assert.equal(r.status,201);assert.equal(r.data.mensagem.texto,'Olá, mundo!');
    r=await pedir('/api/chat/salas/global/mensagens','POST',{texto:'Spam'});assert.equal(r.status,429);assert.ok(+r.retryAfter>=1);
    r=await pedir('/api/chat/salas/global/mensagens');assert.equal(r.data.mensagens.length,1);
    r=await pedir('/api/conta/exportar');assert.equal(r.data.mensagens.length,1);
    r=await pedir('/api/autenticacao/sair','POST',{});assert.equal(r.status,200);
    r=await pedir('/api/conta');assert.equal(r.status,401);
    r=await pedir('/api/autenticacao/entrar','POST',{email:'alice@example.com',senha:'senha-muito-forte-123'});assert.equal(r.status,200);
    r=await pedir('/api/conta/senha','PATCH',{senhaAtual:'senha-muito-forte-123',novaSenha:'outra-senha-forte-456'});assert.equal(r.status,200);
    r=await pedir('/api/autenticacao/entrar','POST',{email:'alice@example.com',senha:'senha-muito-forte-123'});assert.equal(r.status,401);
    r=await pedir('/api/autenticacao/entrar','POST',{email:'alice@example.com',senha:'outra-senha-forte-456'});assert.equal(r.status,200);
    const resp=await fetch(base+'/api/conta',{method:'DELETE',headers:{Cookie:cookie,Origin:'http://evil.example','X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify({senha:'outra-senha-forte-456'})});assert.equal(resp.status,403);
    const alice={cookie,csrf};
    cookie='';csrf='';await pedir('/api/autenticacao/sessao');
    r=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Bob',email:'bob@example.com',usuario:'bob',senha:'senha-forte-do-bob-123',idade:17,aceitaTermos:true});assert.equal(r.status,201);const bob={cookie,csrf,id:r.data.usuario.id};
    r=await pedir('/api/admin/chat/denuncias');assert.equal(r.status,403);
    r=await pedir('/api/amizades','POST',{usuario:'alice'});assert.equal(r.data.estado,'pendente');
    cookie=alice.cookie;csrf=alice.csrf;
    r=await pedir('/api/amizades/aceitar','POST',{usuario:'bob'});assert.equal(r.status,200);const privada=r.data.sala;
    // O chat aplica um intervalo mínimo de 2 segundos entre mensagens do mesmo usuário,
    // inclusive entre salas diferentes. O teste aguarda essa regra real sem desativá-la.
    await aguardar(2100);
    r=await pedir(`/api/chat/salas/${privada}/mensagens`,'POST',{texto:'mensagem privada'});assert.equal(r.status,201);const idPrivado=r.data.mensagem.id;
    cookie='';csrf='';await pedir('/api/autenticacao/sessao');
    r=await pedir('/api/autenticacao/criar-conta','POST',{nome:'Charlie',email:'charlie@example.com',usuario:'charlie',senha:'senha-forte-charlie-123',idade:22,aceitaTermos:true});assert.equal(r.status,201);await pedir('/api/chat/aceite','POST',{aceito:true});
    r=await pedir(`/api/chat/salas/${privada}/mensagens`);assert.equal(r.status,404);
    r=await pedir('/api/chat/denuncias','POST',{mensagemId:idPrivado,motivo:'Denúncia sem acesso'});assert.equal(r.status,404);
    cookie=bob.cookie;csrf=bob.csrf;r=await pedir('/api/bloqueios','POST',{usuario:'alice'});assert.equal(r.status,200);
    r=await pedir('/api/perfil/alice');assert.deepEqual(r.data,{erro:'perfil_nao_localizado'});
    r=await pedir('/api/perfil/usuario_inexistente');assert.deepEqual(r.data,{erro:'perfil_nao_localizado'});
    db=new DatabaseSync(join(pasta,'banco.sqlite'));
    db.prepare("UPDATE usuarios SET papel='admin' WHERE usuario='alice'").run();
    assert.match(db.prepare("SELECT senha_hash FROM usuarios WHERE usuario='alice'").get().senha_hash,/^scrypt\$/);
    cookie=alice.cookie;csrf=alice.csrf;
    r=await pedir('/api/admin/usuarios');assert.equal(r.status,200);assert.ok(r.data.usuarios.length>=3);
    r=await pedir(`/api/admin/usuarios/${bob.id}`,'PATCH',{plano:'plus'});assert.equal(r.status,200);
    // Regressão Premium: Plus não executa, Premium autorizado recebe relatório verdadeiro.
    const cabSku='sku;mes;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_un;imposto_pct;perdas_pct;estoque;prazo_dias';
    const historicoSku=[cabSku,'A1;2026-08;10;100;40;12;3;10;5;5;2;10;7',
      'A1;2026-09;15;100;40;12;3;10;5;5;2;10;7',
      'A1;2026-10;20;100;40;12;3;10;5;5;2;10;7'].join('\n');
    const feedSku=['id;title;description;link;image_link;availability;price',
      'A1;Camiseta básica algodão premium;Camiseta casual de algodão;https://loja.exemplo/p;https://loja.exemplo/p.png;in_stock;99.90 BRL'].join('\n');
    cookie=bob.cookie;csrf=bob.csrf;
    let acesso=await pedir('/api/premium/previsao-de-vendas','POST',{historico:historicoSku});
    assert.equal(acesso.status,403,'Plus não pode executar previsão Premium');
    acesso=await pedir('/api/premium/auditar-feed','POST',{feed:feedSku});
    assert.equal(acesso.status,403,'Plus não pode auditar catálogo Premium');
    cookie=alice.cookie;csrf=alice.csrf;
    acesso=await pedir(`/api/admin/usuarios/${bob.id}`,'PATCH',{plano:'premium'});
    assert.equal(acesso.status,200,'Administrador pode habilitar o Premium manualmente');
    cookie=bob.cookie;csrf=bob.csrf;
    acesso=await pedir('/api/premium/previsao-de-vendas','POST',{historico:historicoSku,cenario:5,margemMeta:15});
    assert.equal(acesso.status,200,'Premium autorizado recebe cálculo do motor real');
    assert.equal(acesso.data.relatorio.skuTotal,1);
    assert.equal(acesso.data.relatorio.itens[0].margemUnitaria,23);
    acesso=await pedir('/api/premium/auditar-feed','POST',{feed:feedSku});
    assert.equal(acesso.status,200,'Premium autorizado recebe auditoria real');
    assert.equal(acesso.data.relatorio.produtos,1);
    acesso=await pedir('/api/premium/auditar-feed','POST',{feed:'id;title\n1;A'});
    assert.equal(acesso.status,400,'Dados inválidos nunca produzem relatório');
    cookie=alice.cookie;csrf=alice.csrf;

    r=await pedir('/api/admin/suporte');assert.equal(r.status,200);assert.ok(r.data.mensagens.some(x=>x.id===suporteId));
    r=await pedir(`/api/admin/suporte/${suporteId}`,'PATCH',{resposta:'Resposta de teste para suporte.'});assert.equal(r.status,200);
    r=await pedir('/api/suporte');assert.equal(r.data.mensagens.find(x=>x.id===suporteId).status,'respondida');
    r=await pedir('/api/admin/chat/moderar','POST',{usuarioId:bob.id,acao:'silenciar',horas:1});assert.equal(r.status,200);
    assert.ok(db.prepare('SELECT count(*) n FROM auditoria_admin').get().n>=3);
    assert.equal(db.prepare("SELECT count(*) n FROM auditoria_admin WHERE acao='silenciar'").get().n,1);
    cookie=bob.cookie;csrf=bob.csrf;await pedir('/api/chat/aceite','POST',{aceito:true});
    r=await pedir('/api/chat/salas/global/mensagens','POST',{texto:'Bloqueado pelo silêncio'});assert.equal(r.status,403);
    const stream=await fetch(base+'/api/chat/eventos',{headers:{Cookie:cookie}});assert.equal(stream.status,200);const reader=stream.body.getReader();await reader.read();
    cookie=alice.cookie;csrf=alice.csrf;r=await pedir('/api/admin/chat/moderar','POST',{usuarioId:bob.id,acao:'banir'});assert.equal(r.status,200);
    const fim=await Promise.race([reader.read(),aguardar(1500).then(()=>null)]);assert.ok(fim?.done,'SSE deve fechar ao revogar chat');reader.cancel();
    r=await pedir('/api/autenticacao/recuperar-senha','POST',{email:'alice@example.com'});assert.equal(r.status,200);
    const log=readFileSync(join(pasta,'emails','recuperacao-local.txt'),'utf8');const recuperacao=log.match(/#token=([A-Za-z0-9_-]+)/)?.[1];assert.ok(recuperacao);
    const pares=await Promise.all([pedir('/api/autenticacao/redefinir-senha','POST',{token:recuperacao,senha:'mais-uma-senha-forte-789'}),pedir('/api/autenticacao/redefinir-senha','POST',{token:recuperacao,senha:'mais-uma-senha-forte-789'})]);
    assert.deepEqual(pares.map(x=>x.status).sort(),[200,400]);
    r=await pedir('/api/conta');assert.equal(r.status,401);
    r=await pedir('/api/autenticacao/entrar','POST',{email:'alice@example.com',senha:'mais-uma-senha-forte-789'});assert.equal(r.status,200);
    db.close();db=null;
    r=await pedir('/api/conta','DELETE',{senha:'mais-uma-senha-forte-789'});assert.equal(r.status,200);
    r=await pedir('/api/autenticacao/sessao');assert.equal(r.data.usuario,null);
  } finally {await new Promise(ok=>servidor.close(ok));db?.close();fecharBanco();rmSync(pasta,{recursive:true,force:true});}
});

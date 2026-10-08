import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:http';
import { iniciarBanners,validarBanner,salvarBanner,bannerAdmin,bannersPublicos,salvarImagemBanner,imagemBannerValida,MAX_IMAGEM_BANNER,tratarBanners } from '../servidor/banners.mjs';
import { corpo,erro } from '../servidor/seguranca.mjs';

const base={titulo_pt:'Um aviso importante',titulo_en:'An important announcement',texto_pt:'Texto.',texto_en:'Text.',ordem:0,ativo:true};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=','base64');
function banco(){const db=new DatabaseSync(':memory:');iniciarBanners(db);return db;}

for(const [nome,extra,codigo='dados_invalidos'] of [
  ['título vazio',{titulo_pt:''}],['texto longo',{texto_pt:'x'.repeat(701)}],['ordem inválida',{ordem:-1}],['ativo não booleano',{ativo:1}],
  ['JavaScript',{url:'javascript:alert(1)'},'link_invalido'],['endereço HTTP',{url:'http://example.com'},'link_invalido'],['link de rede',{url:'//example.com'},'link_invalido'],
  ['credenciais em endereço',{url:'https://user:secret@example.com'},'link_invalido'],['admin codificado',{url:'/%61dmin/banners/'},'link_invalido'],['API',{url:'/api/users'},'link_invalido'],['barra codificada',{url:'/%2fexample.com'},'link_invalido'],
  ['cor com CSS',{cor_texto:'red;position:fixed'},'cor_invalida'],['contraste ilegível',{cor_texto:'#ffffff',cor_fundo:'#ffffff'},'contraste_insuficiente'],['alinhamento com código',{alinhamento:'left;url(x)'}],['peso inválido',{peso:999}],['fonte externa',{fonte:'https://example.com/font'}],['dia inválido',{publicar_em:'2027-02-30T10:00:00Z'},'data_invalida'],['retirada antecipada',{publicar_em:'2027-01-02T10:00:00Z',retirar_em:'2027-01-01T10:00:00Z'},'data_invalida']
])test(`banners: rejeita ${nome}`,()=>assert.throws(()=>validarBanner({...base,...extra}),e=>e.codigo===codigo));

test('banners: inicia vazio, publica por ordem/idioma/agendamento e preserva outros dados',()=>{
  const db=banco();try{
    iniciarBanners(db);db.exec("CREATE TABLE preservar(texto TEXT);INSERT INTO preservar VALUES('contas e fotos');");
    assert.deepEqual(bannersPublicos(db),{itens:[]});
    salvarBanner(db,{...base,ativo:false});
    const normal=salvarBanner(db,{...base,ordem:3,url:'https://example.com/aviso?q=1',botao_pt:'Abrir',botao_en:'Open'});
    const futuro=salvarBanner(db,{...base,ordem:1,publicar_em:'2027-01-01T11:00:00Z',retirar_em:'2027-01-01T12:00:00Z'});
    assert.deepEqual(bannersPublicos(db,'en',Date.parse('2027-01-01T10:00Z')).itens.map(i=>i.id),[normal.id]);
    assert.deepEqual(bannersPublicos(db,'en',Date.parse('2027-01-01T11:00Z')).itens.map(i=>i.id),[futuro.id,normal.id]);
    const publico=bannersPublicos(db,'en',Date.parse('2027-01-01T12:00Z')).itens[0];assert.equal(publico.titulo,base.titulo_en);assert.equal('ativo'in publico,false);assert.equal('imagem'in publico,false);assert.equal('publicar_em'in publico,false);
    assert.equal(db.prepare('SELECT texto FROM preservar').get().texto,'contas e fotos');
  }finally{db.close();}
});

test('banners: versões evitam sobrescrever outra edição e limite inclui agendas',()=>{
  const db=banco();try{
    const inicial=salvarBanner(db,base);assert.throws(()=>salvarBanner(db,{...base,versao:0},inicial.id),e=>e.codigo==='banner_desatualizado');
    const alterado=salvarBanner(db,{...base,titulo_pt:'<img src=x onerror=alert(1)>',versao:inicial.versao},inicial.id);
    assert.equal(bannersPublicos(db).itens[0].titulo,'<img src=x onerror=alert(1)>');assert.equal(alterado.versao,2);
    for(let n=1;n<12;n++)salvarBanner(db,{...base,publicar_em:'2029-01-01T10:00:00Z'});
    assert.throws(()=>salvarBanner(db,base),e=>e.codigo==='limite_banners');assert.equal(salvarBanner(db,{...base,ativo:false}).ativo,false);
  }finally{db.close();}
});

test('banners: valida imagens por assinatura/tamanho, alt e versão',()=>{
  assert.equal(imagemBannerValida(png,'image/png'),true);assert.equal(imagemBannerValida(Buffer.from('<svg onload="x"/>'),'image/png'),false);assert.equal(imagemBannerValida(png,'image/svg+xml'),false);assert.equal(imagemBannerValida(Buffer.alloc(MAX_IMAGEM_BANNER+1),'image/png'),false);
  const db=banco();try{
    let i=salvarBanner(db,base);assert.throws(()=>salvarImagemBanner(db,i.id,i.versao,png,'image/png'),e=>e.codigo==='alt_obrigatorio');
    i=salvarBanner(db,{...base,alt_pt:'Um pixel',alt_en:'One pixel',versao:i.versao},i.id);i=salvarImagemBanner(db,i.id,i.versao,png,'image/png');assert.ok(i.imagem_url);
    assert.throws(()=>salvarImagemBanner(db,i.id,i.versao-1,null,null),e=>e.codigo==='banner_desatualizado');
    i=salvarImagemBanner(db,i.id,i.versao,null,null);assert.equal(i.imagem_url,null);
  }finally{db.close();}
});

test('banners: integração HTTP CRUD com guarda admin/CSRF, imagem pública e erro isolado',async()=>{
  const db=banco(),auditoria=[];
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const server=createServer(async(req,res)=>{try{
    const atendido=await tratarBanners(req,res,{banco:db,json,corpo,
      proteger:r=>{if(r.headers['x-csrf-token']!=='token-teste')throw erro(403,'csrf_invalido');},
      admin:r=>{if(r.headers.authorization!=='admin-teste')throw erro(401,'sessao_necessaria');return {id:1};},
      corpoBinario:async(r,max)=>{const partes=[];let n=0;for await(const b of r){n+=b.length;if(n>max)throw erro(413,'corpo_grande');partes.push(b);}return Buffer.concat(partes);},
      registrarAdmin:(_u,acao,id)=>auditoria.push({acao,id})});
    if(!atendido)json(res,200,{ok:true});
  }catch(e){json(res,e.status||500,{erro:e.codigo||'erro'});}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origem=`http://127.0.0.1:${server.address().port}`;
  const request=(url,method='GET',b,headers={})=>fetch(origem+url,{method,headers:{...(b?{'Content-Type':'application/json'}:{}),...headers},body:b?JSON.stringify(b):undefined});
  const auth={Authorization:'admin-teste','X-CSRF-Token':'token-teste'};
  try{
    assert.equal((await request('/api/admin/banners')).status,401);assert.equal((await request('/api/admin/banners','POST',base,{Authorization:'admin-teste'})).status,403);
    assert.deepEqual(await(await request('/api/banners')).json(),{itens:[]});
    const criado=await request('/api/admin/banners','POST',{...base,alt_pt:'Imagem',alt_en:'Image'},auth);assert.equal(criado.status,201);let item=(await criado.json()).item;
    assert.equal((await request(`/api/admin/banners/${item.id}`,'PUT',{...base,versao:0},auth)).status,409);
    let r=await fetch(`${origem}/api/admin/banners/${item.id}/imagem`,{method:'POST',headers:{...auth,'Content-Type':'image/png','X-Banner-Versao':String(item.versao)},body:png});assert.equal(r.status,200);item=(await r.json()).item;
    assert.equal((await request(`/api/banners/${item.id}/imagem`)).headers.get('Content-Type'),'image/png');
    assert.equal((await request('/api/admin/banners','POST',{...base,url:'javascript:alert(1)'},auth)).status,400);
    assert.equal((await request('/outra-funcao')).status,200);
    assert.equal((await request(`/api/admin/banners/${item.id}`,'DELETE',{versao:item.versao},auth)).status,200);
    assert.deepEqual(await(await request('/api/banners')).json(),{itens:[]});assert.equal(auditoria.length,3);
    assert.throws(()=>bannerAdmin(db,item.id),e=>e.codigo==='banner_nao_localizado');
  }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});

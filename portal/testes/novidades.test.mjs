import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../servidor/banco.mjs';
import { imagemValida, MAX_IMAGEM, novidadesPublicas, removerNovidade, salvarImagem, salvarNovidade, validarNovidade } from '../servidor/novidades.mjs';

export const baseNovidade = { titulo_pt:'Uma novidade',texto_pt:'Texto completo.',titulo_en:'News',texto_en:'Full text.',ordem:0,ativo:true };

for (const [nome,alteracao,codigo='dados_invalidos'] of [
  ['título vazio',{titulo_pt:''}], ['texto muito grande',{texto_en:'x'.repeat(2001)}], ['tipo errado',{titulo_en:1}],
  ['ordem fracionária',{ordem:0.5}], ['publicação não booleana',{ativo:1}],
  ['link javascript',{url:'javascript:alert(1)',botao_pt:'Abrir',botao_en:'Open'},'link_invalido'],
  ['link externo',{url:'//evil.test',botao_pt:'Abrir',botao_en:'Open'},'link_invalido'],
  ['barra codificada',{url:'/%2Fexample.com',botao_pt:'Abrir',botao_en:'Open'},'link_invalido'],
  ['admin codificado',{url:'/%61dmin/novidades/',botao_pt:'Abrir',botao_en:'Open'},'link_invalido'],
  ['dia inexistente',{publicar_em:'2027-02-30T10:00:00Z'},'data_invalida'],
  ['botão sem tradução',{url:'/ferramentas.html',botao_pt:'Abrir'}],
  ['link admin',{url:'/admin/novidades/',botao_pt:'Abrir',botao_en:'Open'},'link_invalido'],
  ['data sem fuso',{publicar_em:'2027-01-01T10:00'},'data_invalida'],
  ['retirada antes de publicação',{publicar_em:'2027-01-02T10:00:00Z',retirar_em:'2027-01-01T10:00:00Z'},'data_invalida'],
]) test(`novidades rejeitam ${nome}`,()=>{
  assert.throws(()=>validarNovidade({...baseNovidade,...alteracao}),e=>e.codigo===codigo);
});

test('novidades: publicação, ordem, traduções, revisões, agendamento e exclusão sem apagar contas',()=>{
  const db=abrirBanco(':memory:');
  try {
    const agora=Date.parse('2027-01-01T10:00:00Z');
    const agendada=salvarNovidade(db,{...baseNovidade,publicar_em:'2027-01-01T11:00:00Z',retirar_em:'2027-01-01T12:00:00Z',ordem:0});
    const normal=salvarNovidade(db,{...baseNovidade,ordem:1});
    const rascunho=salvarNovidade(db,{...baseNovidade,ativo:false});
    assert.equal(novidadesPublicas(db,'pt-BR',agora).itens.length,1);
    const visto=novidadesPublicas(db,'pt-BR',agora).revisao; assert.ok(visto>1);
    const ingles=novidadesPublicas(db,'en',agora);assert.equal(ingles.itens[0].titulo,'News');assert.equal(ingles.revisao,visto);
    const futuro=novidadesPublicas(db,'pt-BR',agora+3600000);
    assert.deepEqual(futuro.itens.map(x=>x.id),[agendada.id,normal.id]); assert.ok(futuro.itens[0].revisao>visto);
    assert.equal(novidadesPublicas(db,'pt-BR',agora+7200000).itens.length,1);
    assert.throws(()=>salvarNovidade(db,{...baseNovidade,versao:normal.versao-1},normal.id),e=>e.codigo==='novidade_desatualizada');
    const alterada=salvarNovidade(db,{...baseNovidade,versao:normal.versao,titulo_pt:'<img src=x onerror=alert(1)>'},normal.id);
    assert.equal(novidadesPublicas(db,'pt-BR',agora).itens[0].titulo,'<img src=x onerror=alert(1)>');
    assert.ok(novidadesPublicas(db,'pt-BR',agora).revisao>futuro.revisao);
    assert.throws(()=>removerNovidade(db,normal.id,normal.versao),e=>e.codigo==='novidade_desatualizada');
    removerNovidade(db,normal.id,alterada.versao); removerNovidade(db,rascunho.id,rascunho.versao);
    assert.equal(novidadesPublicas(db,'pt-BR',agora).itens.length,0);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='usuarios'").get());
  } finally { db.close(); }
});

test('novidades: até vinte itens ligados; limite também conta os agendados',()=>{
  const db=abrirBanco(':memory:');
  try {
    for(let n=0;n<20;n++) salvarNovidade(db,{...baseNovidade,publicar_em:'2029-01-01T10:00:00Z'});
    assert.throws(()=>salvarNovidade(db,baseNovidade),e=>e.codigo==='limite_novidades');
    assert.equal(salvarNovidade(db,{...baseNovidade,ativo:false}).ativo,false);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM novidades').get().n,21);
  } finally { db.close(); }
});

test('novidades: imagens verificadas por bytes, tamanho, tradução e versão',()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=','base64');
  assert.equal(imagemValida(png,'image/png'),true);
  assert.equal(imagemValida(Buffer.from('<svg/>'),'image/png'),false);
  assert.equal(imagemValida(png,'image/svg+xml'),false);
  assert.equal(imagemValida(Buffer.alloc(MAX_IMAGEM+1),'image/png'),false);
  const db=abrirBanco(':memory:');
  try {
    let item=salvarNovidade(db,{...baseNovidade,ativo:false});
    assert.throws(()=>salvarImagem(db,item.id,item.versao,png,'image/png'),e=>e.codigo==='alt_obrigatorio');
    item=salvarNovidade(db,{...baseNovidade,versao:item.versao,alt_pt:'Um pixel',alt_en:'One pixel'},item.id);
    item=salvarImagem(db,item.id,item.versao,png,'image/png');assert.ok(item.imagem_url);assert.equal('imagem' in item,false);
    assert.throws(()=>salvarImagem(db,item.id,item.versao-1,null,null),e=>e.codigo==='novidade_desatualizada');
    item=salvarImagem(db,item.id,item.versao,null,null);assert.equal(item.imagem_url,null);
  } finally { db.close(); }
});

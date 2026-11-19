import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarGerenciadorEstudio } from '../servidor/estudio-midia-sessoes.mjs';

const wav=()=>{const b=Buffer.alloc(64);b.write('RIFF',0);b.write('WAVE',8);return b;};
test('sessões pertencem ao usuário e limitam a biblioteca de uploads',async()=>{
 const base=await mkdtemp(join(tmpdir(),'studio-teste-'));
 const estudio=criarGerenciadorEstudio({baseDir:base,sondar:async()=>({duracao:5,video:false,audio:true})});
 try{
  const s=await estudio.criar(20,'audio');
  await assert.rejects(estudio.obter(21,s.id),e=>e.status===404);
  const a=await estudio.anexar(20,s.id,wav(),'audio/wav');
  assert.ok(a.id&&a.duracao===5);
  const detalhe=await estudio.obter(20,s.id);
  assert.equal(detalhe.arquivos.length,1);
  assert.equal(detalhe.arquivos[0].id,a.id);
  await assert.rejects(estudio.anexar(20,s.id,Buffer.from('bad'),'audio/wav'),e=>e.status===400);
  await assert.rejects(estudio.criar(20,'javascript'),e=>e.status===400);
  const out=await estudio.arquivo(20,s.id,a.id);
  assert.equal((await readFile(out.caminho)).length,64);
 }finally{await estudio.fechar();await rm(base,{recursive:true,force:true});}
});
test('duas sessões por pessoa, expiração e autoria dos downloads',async()=>{
 const base=await mkdtemp(join(tmpdir(),'studio-limites-'));
 const estudio=criarGerenciadorEstudio({baseDir:base,sondar:async()=>({duracao:5,video:false,audio:true})});
 try{
  const a=await estudio.criar(1,'audio');await estudio.criar(1,'video');
  await assert.rejects(estudio.criar(1,'audio'),e=>e.status===429);
  await assert.rejects(estudio.obter(2,a.id),e=>e.status===404);
  await assert.rejects(estudio.arquivo(1,a.id,'inexistente'),e=>e.status===404);
  await estudio.excluir(1,a.id);
  await assert.rejects(estudio.obter(1,a.id),e=>e.status===404);
  await estudio.criar(1,'audio');
 }finally{await estudio.fechar();await rm(base,{recursive:true,force:true});}
});
test('renderização é assíncrona, mostra progresso medido e entrega mídia ao dono',async()=>{
 const base=await mkdtemp(join(tmpdir(),'studio-render-'));
 const estudio=criarGerenciadorEstudio({baseDir:base,
  sondar:async()=>({duracao:5,video:false,audio:true}),
  renderizador:async(plano,destino,{progresso})=>{
   progresso(0.3);await new Promise(r=>setTimeout(r,15));
   progresso(0.8);await import('node:fs/promises').then(fs=>fs.writeFile(destino,Buffer.from('som gerado')));
  }
 });
 try{
  const sess=await estudio.criar(5,'audio');
  const a=await estudio.anexar(5,sess.id,wav(),'audio/wav');
  const inicio=await estudio.renderizar(5,sess.id,[{arquivo:a.id,inicio:0,fim:3,volume:1}]);
  assert.equal(inicio.estado,'processando');
  let estado;
  for(let i=0;i<35;i++){
   estado=await estudio.obter(5,sess.id);
   if(estado.estado==='concluido')break;
   await new Promise(r=>setTimeout(r,20));
  }
  assert.equal(estado.estado,'concluido');
  assert.equal(estado.progresso,100);
  const saida=await estudio.resultado(5,sess.id);
  assert.equal((await readFile(saida.caminho)).toString(),'som gerado');
  await assert.rejects(estudio.resultado(6,sess.id),e=>e.status===404);
 }finally{await estudio.fechar();await rm(base,{recursive:true,force:true});}
});
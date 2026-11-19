import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sondarComFFprobe,renderizarComFFmpeg} from '../servidor/estudio-midia-sessoes.mjs';
import {normalizarEdicao} from '../servidor/estudio-midia-processamento.mjs';

const exists=spawnSync(process.env.PORTAL_FFMPEG_BIN||'ffmpeg',['-version'],{timeout:6000,encoding:'utf8'}).status===0 &&
 spawnSync(process.env.PORTAL_FFPROBE_BIN||'ffprobe',['-version'],{timeout:6000,encoding:'utf8'}).status===0;
if(!exists && process.env.PORTAL_TEST_FFMPEG_REQUIRED==='1')
 throw new Error('FFmpeg e FFprobe são obrigatórios no CI de transcodificação.');
function gerar(args){
 const exec=spawnSync(process.env.PORTAL_FFMPEG_BIN||'ffmpeg',
  ['-hide_banner','-loglevel','error','-nostdin','-y',...args],{timeout:30000,encoding:'utf8'});
 assert.equal(exec.status,0,exec.stderr?.slice(-1200));
}
test('FFmpeg compõe MP4 de dois clipes distintos, incluindo silêncio no segundo', {skip:!exists},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-real-video-'));
 try{
  const v1=join(dir,'primeiro.mp4'),v2=join(dir,'segundo.mp4'),out=join(dir,'montado.mp4');
  gerar(['-f','lavfi','-i','testsrc2=size=320x240:rate=24',
   '-f','lavfi','-i','sine=frequency=440:sample_rate=48000',
   '-t','1.8','-shortest','-c:v','libx264','-pix_fmt','yuv420p',
   '-c:a','aac',v1]);
  gerar(['-f','lavfi','-i','color=c=blue:s=320x240:r=24',
   '-t','1.7','-c:v','libx264','-pix_fmt','yuv420p','-an',v2]);
  const a1=await sondarComFFprobe(v1),a2=await sondarComFFprobe(v2);
  assert.ok(a1.audio&&a1.video);assert.ok(!a2.audio&&a2.video);
  const plano=normalizarEdicao('video',[
    {arquivo:'um',inicio:0,fim:1.2,volume:1,filtro:'cinema'},
    {arquivo:'dois',inicio:0.2,fim:1.4,volume:1,filtro:'quente'}
  ],new Map([['um',{caminho:v1,...a1}],['dois',{caminho:v2,...a2}]]));
  const progresso=[];
  await renderizarComFFmpeg(plano,out,{progresso:x=>progresso.push(x)});
  const info=await sondarComFFprobe(out);
  assert.equal(info.video,true);
  assert.equal(info.audio,true);
  assert.ok(info.duracao>2&&info.duracao<4,'duração final '+info.duracao);
  assert.ok((await stat(out)).size>10000);
  assert.ok(progresso.length>0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('FFmpeg monta MP3 em múltiplos trechos, com volume e loudnorm', {skip:!exists},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-real-audio-'));
 try{
  const input=join(dir,'voz.mp3'),out=join(dir,'podcast.mp3');
  gerar(['-f','lavfi','-i','sine=frequency=670:sample_rate=48000',
   '-t','2.1','-c:a','libmp3lame',input]);
  const meta=await sondarComFFprobe(input);
  assert.equal(meta.audio,true);
  const plano=normalizarEdicao('audio',[
    {arquivo:'voz',inicio:0.1,fim:1.0,volume:0.8},
    {arquivo:'voz',inicio:0.8,fim:1.8,volume:1.2}
  ],new Map([['voz',{caminho:input,...meta}]]));
  await renderizarComFFmpeg(plano,out);
  const resultado=await sondarComFFprobe(out);
  assert.equal(resultado.audio,true);
  assert.ok(resultado.duracao>1.4&&resultado.duracao<3);
  assert.ok((await stat(out)).size>3000);
 }finally{await rm(dir,{recursive:true,force:true});}
});
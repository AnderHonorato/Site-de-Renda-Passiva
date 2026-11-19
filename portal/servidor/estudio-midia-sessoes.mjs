/** Sessões efêmeras de edição audiovisual no servidor, com isolamento por usuário.
 * O conteúdo fica em diretório temporário e nunca entra no SQLite ou nos logs.
 */
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { ErroEstudio, normalizarEdicao, montarArgumentosFFmpeg } from './estudio-midia-processamento.mjs';

const exec=promisify(execFile);
const VALIDOS={
 'video/mp4':{ext:'.mp4',tipo:'video'},
 'video/webm':{ext:'.webm',tipo:'video'},
 'audio/mpeg':{ext:'.mp3',tipo:'audio'},
 'audio/wav':{ext:'.wav',tipo:'audio'},
 'audio/ogg':{ext:'.ogg',tipo:'audio'}
};
function assinaturaValida(bytes,mime){
 if(!Buffer.isBuffer(bytes)||bytes.length<12)return false;
 if(mime==='video/mp4')return bytes.subarray(4,8).toString()==='ftyp';
 if(mime==='video/webm')return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(mime==='audio/wav')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE';
 if(mime==='audio/ogg')return bytes.toString('ascii',0,4)==='OggS';
 if(mime==='audio/mpeg')return bytes.toString('ascii',0,3)==='ID3'||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0;
 return false;
}
export async function sondarComFFprobe(caminho){
 let stdout;
 try{
  const result=await exec(process.env.PORTAL_FFPROBE_BIN||'ffprobe',[
   '-v','error','-protocol_whitelist','file,pipe',
   '-show_entries','format=duration:stream=codec_type,width,height',
   '-of','json',caminho
  ],{timeout:13000,maxBuffer:256000,windowsHide:true});
  stdout=result.stdout;
 }catch{throw new ErroEstudio('Não foi possível validar a mídia. Verifique formato e codecs.',422);}
 let meta;
 try{meta=JSON.parse(stdout)}catch{throw new ErroEstudio('A mídia não foi reconhecida.',422)}
 const duracao=Number(meta.format?.duration);
 const streams=meta.streams||[];
 const video=streams.some(s=>s.codec_type==='video');
 const audio=streams.some(s=>s.codec_type==='audio');
 const pixels=streams.filter(s=>s.codec_type==='video')
  .some(s=>Number(s.width)*Number(s.height)>3840*2160||!Number(s.width)||!Number(s.height));
 if(!Number.isFinite(duracao)||duracao<0.25||duracao>240||pixels||(!video&&!audio))
  throw new ErroEstudio('Mídia fora do limite: 4 minutos e até 4K.',422);
 return {duracao:Math.round(duracao*1000)/1000,video,audio};
}
export async function renderizarComFFmpeg(plano,saida,{signal,progresso}={}){
 const args=montarArgumentosFFmpeg(plano,saida);
 return await new Promise((resolve,reject)=>{
  const proc=spawn(process.env.PORTAL_FFMPEG_BIN||'ffmpeg',args,{
   windowsHide:true,stdio:['ignore','pipe','pipe'],signal
  });
  let finalizado=false,stdout='',erro='';
  const timeout=setTimeout(()=>{proc.kill('SIGKILL');terminar(new ErroEstudio('Tempo máximo de processamento excedido.',503));},180000);
  timeout.unref();
  function terminar(error){
   if(finalizado)return;finalizado=true;clearTimeout(timeout);
   error?reject(error):resolve();
  }
  proc.stdout.on('data',bloco=>{
   stdout=(stdout+String(bloco)).slice(-2048);
   const regex=/out_time_ms=(\d+)/g;let match,ms=0;
   while((match=regex.exec(stdout)))ms=Number(match[1]);
   if(ms&&plano.duracao>0)progresso?.(Math.min(0.98,ms/1000000/plano.duracao));
  });
  proc.stderr.on('data',bloco=>{erro=(erro+String(bloco)).slice(-2500);});
  proc.once('error',e=>terminar(signal?.aborted
   ?new ErroEstudio('Renderização cancelada.',409)
   :new ErroEstudio(e.code==='ENOENT'?'FFmpeg não instalado no servidor.':'Falha ao iniciar o FFmpeg.',503)));
  proc.once('close',code=>terminar(signal?.aborted
   ?new ErroEstudio('Renderização cancelada.',409)
   :code===0?null:new ErroEstudio('Não foi possível renderizar. Verifique codecs e arquivos.',422)));
 });
}
export function criarGerenciadorEstudio({
 baseDir=tmpdir(),sondar=sondarComFFprobe,renderizador=renderizarComFFmpeg
}={}){
 const sessoes=new Map();
 let trabalhos=0;
 const TTL=45*60*1000;
 const agora=()=>Date.now();
 function encontrar(dono,id){
  const s=sessoes.get(id);
  if(!s||s.dono!==dono||s.expiraEm<agora())
   throw new ErroEstudio('Projeto não encontrado ou expirado.',404);
  return s;
 }
 function publico(s){
  return {id:s.id,tipo:s.tipo,estado:s.estado,progresso:s.progresso,
   duracao:s.duracao??0,
   arquivos:[...s.arquivos.values()].map(a=>({
    id:a.id,mime:a.mime,duracao:a.duracao,video:a.video,audio:a.audio,tamanho:a.tamanho
   })),
   saida:s.estado==='concluido'?{nome:s.tipo==='video'?'video-editado.mp4':'episodio-editado.mp3',tamanho:s.tamanhoSaida}:null,
   mensagem:s.mensagem??null,expiraEm:s.expiraEm};
 }
 async function excluir(dono,id){
  const s=encontrar(dono,id);
  sessoes.delete(id);s.cancelador?.abort();
  await rm(s.diretorio,{recursive:true,force:true});
 }
 async function criar(dono,tipo){
  if(!Number.isSafeInteger(dono)||dono<=0||!['video','audio'].includes(tipo))
   throw new ErroEstudio('Tipo de projeto inválido.');
  if(sessoes.size>=16||[...sessoes.values()].filter(s=>s.dono===dono).length>=2)
   throw new ErroEstudio('Limite temporário de projetos atingido. Exclua um projeto anterior.',429);
  await mkdir(baseDir,{recursive:true});
  const diretorio=await mkdtemp(join(baseDir,'sitesads-estudio-'));
  const s={id:randomUUID(),dono,tipo,diretorio,arquivos:new Map(),
   estado:'editando',progresso:0,totalBytes:0,expiraEm:agora()+TTL};
  sessoes.set(s.id,s);
  return publico(s);
 }
 async function anexar(dono,id,bytes,mime){
  const s=encontrar(dono,id);
  const cfg=VALIDOS[mime];
  if(!cfg||cfg.tipo!==s.tipo||!assinaturaValida(bytes,mime)||
     bytes.length>25*1024*1024||bytes.length<20)
   throw new ErroEstudio('Formato inválido ou arquivo maior que 25 MB.');
  if(s.arquivos.size>=4||s.totalBytes+bytes.length>75*1024*1024||s.estado==='processando')
   throw new ErroEstudio('Limite de arquivos do projeto atingido.',429);
  const arquivoId=randomUUID();
  const caminho=join(s.diretorio,arquivoId+cfg.ext);
  await writeFile(caminho,bytes,{flag:'wx',mode:0o600});
  let info;
  try{
   info=await sondar(caminho);
   if(!info||!Number.isFinite(info.duracao)||info.duracao<0.25||
      info.duracao>240||(s.tipo==='video'?!info.video:!info.audio||info.video))
    throw new ErroEstudio('Mídia sem trilha compatível ou duração incorreta.',422);
  }catch(e){await rm(caminho,{force:true});throw e;}
  const a={id:arquivoId,caminho,mime,tamanho:bytes.length,...info};
  s.arquivos.set(arquivoId,a);s.totalBytes+=bytes.length;
  return publico(s).arquivos.at(-1);
 }
 async function arquivo(dono,id,arquivoId){
  const s=encontrar(dono,id),a=s.arquivos.get(arquivoId);
  if(!a)throw new ErroEstudio('Arquivo não encontrado.',404);
  return {caminho:a.caminho,mime:a.mime,tamanho:a.tamanho,nome:'midia-'+a.id+VALIDOS[a.mime].ext};
 }
 async function renderizar(dono,id,trechos){
  const s=encontrar(dono,id);
  if(s.estado==='processando'||trabalhos>=2)
   throw new ErroEstudio('Serviço ocupado. Tente novamente após esta renderização.',429);
  const plano=normalizarEdicao(s.tipo,trechos,s.arquivos);
  if(s.saida)await rm(s.saida,{force:true});
  s.saida=join(s.diretorio,'resultado-'+randomUUID()+(s.tipo==='video'?'.mp4':'.mp3'));
  s.estado='processando';s.progresso=0;s.duracao=plano.duracao;s.mensagem=null;
  const cancelador=new AbortController();
  s.cancelador=cancelador;trabalhos++;
  void (async()=>{
   try{
    await renderizador(plano,s.saida,{signal:cancelador.signal,progresso:valor=>{
     if(s.estado==='processando'&&Number.isFinite(valor))
      s.progresso=Math.min(99,Math.round(Math.max(0,valor)*100));
    }});
    if(cancelador.signal.aborted)throw new ErroEstudio('Renderização cancelada.',409);
    const info=await stat(s.saida);
    if(info.size<1||info.size>90*1024*1024)
     throw new ErroEstudio('Arquivo final inválido ou grande demais.',422);
    s.tamanhoSaida=info.size;s.estado='concluido';s.progresso=100;
   }catch(e){
    s.estado=cancelador.signal.aborted?'cancelado':'erro';
    s.mensagem=cancelador.signal.aborted?'Renderização cancelada.':'Não foi possível renderizar esta combinação de mídias.';
    await rm(s.saida,{force:true}).catch(()=>{});
   }finally{trabalhos--;s.cancelador=null;}
  })();
  return publico(s);
 }
 async function resultado(dono,id){
  const s=encontrar(dono,id);
  if(s.estado!=='concluido'||!s.saida)
   throw new ErroEstudio('Resultado ainda não disponível.',409);
  return {caminho:s.saida,mime:s.tipo==='video'?'video/mp4':'audio/mpeg',
   nome:s.tipo==='video'?'video-editado.mp4':'episodio-editado.mp3',
   tamanho:s.tamanhoSaida};
 }
 async function cancelar(dono,id){
  const s=encontrar(dono,id);
  if(s.estado!=='processando')throw new ErroEstudio('Não existe renderização em andamento.',409);
  s.estado='cancelado';s.mensagem='Renderização cancelada.';
  s.cancelador.abort();
  return publico(s);
 }
 const intervalo=setInterval(()=>{
  for(const s of sessoes.values())if(s.expiraEm<agora()){
   sessoes.delete(s.id);s.cancelador?.abort();
   void rm(s.diretorio,{recursive:true,force:true}).catch(()=>{});
  }
 },60000);intervalo.unref();
 return {criar,anexar,arquivo,renderizar,resultado,cancelar,excluir,
  obter:async(dono,id)=>publico(encontrar(dono,id)),
  async fechar(){
   clearInterval(intervalo);
   for(const s of sessoes.values()){s.cancelador?.abort();}
   await Promise.all([...sessoes.values()].map(s=>rm(s.diretorio,{recursive:true,force:true}).catch(()=>{})));
   sessoes.clear();
  }
 };
}
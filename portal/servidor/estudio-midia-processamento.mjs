/** FFmpeg servidor: composição de vídeo F357 e podcast F358. Sem shell e sem URLs remotas. */
export class ErroEstudio extends Error {
  constructor(message,status=400){super(message);this.name='ErroEstudio';this.status=status;}
}
const FILTROS=Object.freeze({
 neutro:'',quente:'eq=brightness=0.02:saturation=1.12:gamma_r=1.04:gamma_b=0.96',
 frio:'eq=brightness=0:saturation=1.06:gamma_r=0.96:gamma_b=1.04',
 pb:'hue=s=0',cinema:'eq=contrast=1.12:brightness=-0.015:saturation=0.88'
});
const numero=x=>typeof x==='number'&&Number.isFinite(x);
const arred=x=>Math.round(x*1000)/1000;
export function normalizarEdicao(tipo,trechos,arquivos){
 if(!['video','audio'].includes(tipo))throw new ErroEstudio('Tipo inválido.');
 if(!Array.isArray(trechos)||trechos.length<1||trechos.length>8)throw new ErroEstudio('Use de 1 a 8 trechos.');
 if(!(arquivos instanceof Map))throw new ErroEstudio('Biblioteca inválida.');
 let duracao=0;
 const lista=trechos.map((t,i)=>{
  if(!t||typeof t!=='object'||Array.isArray(t)||
   Object.keys(t).some(k=>!['arquivo','inicio','fim','volume','filtro'].includes(k)))
   throw new ErroEstudio('Trecho '+(i+1)+': campos inválidos.');
  const a=arquivos.get(t.arquivo);
  if(!a||typeof a.caminho!=='string'||!(tipo==='video'?a.video:a.audio&&!a.video))
   throw new ErroEstudio('Trecho '+(i+1)+': mídia incompatível.');
  const inicio=t.inicio,fim=t.fim,volume=t.volume??1,filtro=t.filtro??'neutro';
  if(!numero(inicio)||!numero(fim)||inicio<0||fim<=inicio||
     fim>a.duracao+0.005||fim-inicio<0.2)
   throw new ErroEstudio('Trecho '+(i+1)+': corte inválido.');
  if(!numero(volume)||volume<0||volume>2)throw new ErroEstudio('Volume entre 0 e 200%.');
  if(!Object.hasOwn(FILTROS,filtro))throw new ErroEstudio('Filtro não permitido.');
  const tempo=arred(fim-inicio);
  duracao+=tempo;
  if(duracao>180.001)throw new ErroEstudio('Máximo de 3 minutos por projeto.');
  return Object.freeze({arquivo:t.arquivo,caminho:a.caminho,
   inicio:arred(inicio),fim:arred(fim),duracao:tempo,
   volume:arred(volume),filtro,video:a.video,audio:a.audio});
 });
 return Object.freeze({tipo,trechos:Object.freeze(lista),duracao:arred(duracao)});
}
export function montarArgumentosFFmpeg(plano,saida){
 if(!plano||!['video','audio'].includes(plano.tipo)||
    !Array.isArray(plano.trechos)||!plano.trechos.length||
    typeof saida!=='string'||! /[/\\]/.test(saida))
  throw new ErroEstudio('Renderização não configurada.');
 const video=plano.tipo==='video',itens=plano.trechos;
 if(video?!saida.endsWith('.mp4'):!saida.endsWith('.mp3'))
  throw new ErroEstudio('Formato de saída incorreto.');
 const args=['-hide_banner','-nostdin','-y','-loglevel','error',
  '-progress','pipe:1','-stats_period','0.3','-threads','2'];
 for(const s of itens){
  if(typeof s.caminho!=='string'||!s.caminho.startsWith('/')&&!/^[A-Za-z]:\\/.test(s.caminho))
   throw new ErroEstudio('Arquivo interno inválido.');
  args.push('-ss',String(s.inicio),'-t',String(s.duracao),
   '-protocol_whitelist','file,pipe','-i',s.caminho);
 }
 const silencio=new Map();
 if(video)itens.forEach((s,i)=>{
  if(!s.audio){
   silencio.set(i,itens.length+silencio.size);
   args.push('-f','lavfi','-t',String(s.duracao),'-i',
    'anullsrc=channel_layout=stereo:sample_rate=48000');
  }
 });
 const filtros=[];
 itens.forEach((s,i)=>{
  if(video){
   const fx=FILTROS[s.filtro];
   filtros.push('['+i+':v:0]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p,setpts=PTS-STARTPTS'+(fx?','+fx:'')+'[v'+i+']');
  }
  const origem=video&&silencio.has(i)?silencio.get(i):i;
  const fade=arred(Math.min(0.12,s.duracao/5));
  filtros.push('['+origem+':a:0]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume='+s.volume+',afade=t=in:st=0:d='+fade+',afade=t=out:st='+arred(s.duracao-fade)+':d='+fade+'[a'+i+']');
 });
 if(video)filtros.push(itens.map((_,i)=>'[v'+i+'][a'+i+']').join('')+'concat=n='+itens.length+':v=1:a=1[outv][outa]');
 else{
  filtros.push(itens.map((_,i)=>'[a'+i+']').join('')+'concat=n='+itens.length+':v=0:a=1[concatenado]');
  filtros.push('[concatenado]loudnorm=I=-16:TP=-1.5:LRA=11[outa]');
 }
 args.push('-filter_complex',filtros.join(';'));
 if(video)args.push('-map','[outv]','-map','[outa]','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','128k','-movflags','+faststart','-max_muxing_queue_size','1024');
 else args.push('-map','[outa]','-c:a','libmp3lame','-q:a','2');
 args.push(saida);
 return args;
}
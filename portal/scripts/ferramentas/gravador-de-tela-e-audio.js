/** F194 — gravação local por APIs nativas, sem upload nem servidor. */
export function escolherFormato(tipos, suporta) {
  return tipos.find(tipo => suporta(tipo)) || '';
}
export function descreverErroCaptura(erro) {
  if (erro?.name === 'NotAllowedError') return 'Permissão negada ou captura cancelada.';
  if (erro?.name === 'NotFoundError') return 'Nenhum dispositivo de captura foi encontrado.';
  if (erro?.name === 'NotReadableError') return 'O dispositivo está ocupado ou indisponível.';
  return String(erro?.message || 'Não foi possível iniciar a gravação.');
}
export function extensaoParaTipo(tipo) { return /mp4/i.test(tipo) ? 'mp4' : /ogg/i.test(tipo) ? 'ogg' : 'webm'; }
export function duracaoGravacaoMs(inicio, pausas, agora, pausaIniciada = 0) {
  if (!Number.isFinite(inicio) || inicio <= 0) return 0;
  return Math.max(0, agora - inicio - pausas - (pausaIniciada ? agora - pausaIniciada : 0));
}
export default {
  instruções: {
    passos: ['Escolha tela ou somente microfone.', 'Autorize a captura no navegador.', 'Pare a gravação e baixe o arquivo.'],
    limites: 'Gravação de tela requer navegador compatível e HTTPS; muitos celulares não permitem. O áudio do sistema depende do navegador. O arquivo fica apenas no dispositivo.',
    perguntas: [{p:'O site recebe a gravação?',r:'Não. A captura, a prévia e o download acontecem localmente no navegador.'}],
  },
  montar(raiz) {
    let gravador=null, fluxo=null, audioExtra=null, mistura=null, partes=[], url='', iniciado=0, intervalo=0, ocupado=false, pausas=0, pausaIniciada=0;
    raiz.replaceChildren();
    const criar=(tag,classe,conteudo)=>{const e=document.createElement(tag);if(classe)e.className=classe;if(conteudo)e.textContent=conteudo;return e;};
    const painel=criar('section','ferramenta-formulario');
    const titulo=criar('h2','', 'Gravar tela ou voz');
    const explicacao=criar('p','suave','A gravação fica neste aparelho. Nada é enviado ao portal.');
    const rotulo=criar('label','','Tipo de captura');
    const seletor=criar('select');seletor.setAttribute('aria-label','Tipo de captura');
    for(const [valor,nome] of [['tela','Tela com áudio opcional'],['voz','Somente microfone']]){const o=criar('option','',nome);o.value=valor;seletor.append(o);}
    const rotuloMic=criar('label');const mic=criar('input');mic.type='checkbox';mic.checked=false;rotuloMic.append(mic,document.createTextNode(' Incluir microfone na gravação da tela'));
    const iniciar=criar('button','botão botão--primário','Iniciar gravação');iniciar.type='button';
    const pausar=criar('button','botão','Pausar');pausar.type='button';pausar.disabled=true;
    const parar=criar('button','botão','Parar gravação');parar.type='button';parar.disabled=true;
    const status=criar('p','suave','Pronto para gravar');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const previa=criar('video');previa.controls=true;previa.playsInline=true;previa.hidden=true;previa.style.width='100%';
    const ouvir=criar('audio');ouvir.controls=true;ouvir.hidden=true;
    const baixar=criar('a','botão','Baixar gravação');baixar.hidden=true;baixar.download='gravacao-ander-flow.webm';
    const controles=criar('div','');controles.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:16px 0';
    controles.append(iniciar,pausar,parar);
    painel.append(titulo,explicacao,rotulo,seletor,rotuloMic,controles,status,previa,ouvir,baixar);raiz.append(painel);
    const atualizar=()=>{rotuloMic.hidden=seletor.value!=='tela';};seletor.addEventListener('change',atualizar);atualizar();
    const liberar=()=>{for(const t of fluxo?.getTracks()||[])t.stop();for(const t of audioExtra?.getTracks()||[])t.stop();void mistura?.close().catch(()=>{});mistura=null;fluxo=null;audioExtra=null;clearInterval(intervalo);intervalo=0;ocupado=false;iniciar.disabled=false;parar.disabled=true;pausar.disabled=true;pausar.textContent='Pausar';seletor.disabled=false;mic.disabled=false;};
    const descartar=()=>{if(url){URL.revokeObjectURL(url);url='';}previa.removeAttribute('src');ouvir.removeAttribute('src');previa.hidden=ouvir.hidden=baixar.hidden=true;};
    const terminar=()=>{if(!gravador||gravador.state==='inactive')return;parar.disabled=true;pausar.disabled=true;gravador.stop();};
    pausar.addEventListener('click',()=>{
      if(!gravador)return;
      try {
        if(gravador.state==='recording'){gravador.pause();pausaIniciada=Date.now();pausar.textContent='Retomar';status.textContent='Gravação pausada';}
        else if(gravador.state==='paused'){gravador.resume();pausas+=Date.now()-pausaIniciada;pausaIniciada=0;pausar.textContent='Pausar';}
      } catch(e){status.textContent='Não foi possível pausar ou retomar: '+descreverErroCaptura(e);}
    });
    iniciar.addEventListener('click',async()=>{
      if(ocupado || gravador?.state==='recording')return;
      ocupado=true;
      descartar();iniciar.disabled=true;seletor.disabled=true;mic.disabled=true;status.textContent='Solicitando permissão de captura…';
      try{
        if(!navigator.mediaDevices||!globalThis.MediaRecorder)throw Error('Este navegador não suporta gravação.');
        const tela=seletor.value==='tela';
        if(tela && !navigator.mediaDevices.getDisplayMedia)throw Error('Captura de tela indisponível neste navegador. Tente gravar somente a voz.');
        fluxo=tela?await navigator.mediaDevices.getDisplayMedia({video:true,audio:true}):await navigator.mediaDevices.getUserMedia({audio:true});
        if(tela&&mic.checked){
          audioExtra=await navigator.mediaDevices.getUserMedia({audio:true});
          // Uma única trilha de áudio mixada: dois tracks de áudio em MediaStream
          // não garantem mixagem no MediaRecorder (alguns navegadores ignoram um).
          const telaOriginal=fluxo;
          const contexto=new AudioContext();
          mistura=contexto;
          const destino=contexto.createMediaStreamDestination();
          for(const origem of [telaOriginal,audioExtra]){
            if(origem.getAudioTracks().length){
              const fonte=contexto.createMediaStreamSource(origem);
              fonte.connect(destino);
            }
          }
          fluxo=new MediaStream([...telaOriginal.getVideoTracks(),...destino.stream.getAudioTracks()]);
          // A captura original continua viva e será encerrada junto com a gravação.
          audioExtra=new MediaStream([...telaOriginal.getAudioTracks(),...audioExtra.getAudioTracks()]);
        }
        const tipos=tela?['video/webm;codecs=vp8,opus','video/webm','video/mp4']:['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
        const tipo=escolherFormato(tipos,t=>MediaRecorder.isTypeSupported(t));
        gravador=new MediaRecorder(fluxo,tipo?{mimeType:tipo}:undefined);
        partes=[];const atual=gravador;
        atual.addEventListener('dataavailable',e=>{if(e.data.size)partes.push(e.data);});
        atual.addEventListener('error',()=>{status.textContent='Erro durante a gravação.';liberar();});
        atual.addEventListener('stop',()=>{
          const blob=new Blob(partes,{type:atual.mimeType||partes[0]?.type||'application/octet-stream'});
          liberar();if(!blob.size){status.textContent='A gravação terminou sem conteúdo.';return;}
          url=URL.createObjectURL(blob);
          const player=tela?previa:ouvir;player.src=url;player.hidden=false;
          baixar.href=url;baixar.download='gravacao-ander-flow.'+extensaoParaTipo(blob.type);baixar.hidden=false;
          status.textContent='Gravação concluída: '+(blob.size/1048576).toFixed(1)+' MB. Confira a prévia e baixe.';
        },{once:true});
        fluxo.getVideoTracks().forEach(t=>t.addEventListener('ended',terminar,{once:true}));
        gravador.start(1000);iniciado=Date.now();pausas=0;pausaIniciada=0;parar.disabled=false;pausar.disabled=false;
        intervalo=setInterval(()=>{if(gravador?.state==='recording')status.textContent='Gravando · '+Math.floor(duracaoGravacaoMs(iniciado,pausas,Date.now())/1000)+' s';},1000);
        status.textContent='Gravando · 0 s';
      }catch(e){liberar();status.textContent=e?.name==='NotAllowedError'?'Permissão negada ou captura cancelada.':descreverErroCaptura(e);}
    });
    parar.addEventListener('click',terminar);
    // Limpeza quando a página for fechada; nunca manter microfone ativo após sair.
    window.addEventListener('pagehide',()=>{if(gravador && gravador.state!=='inactive')gravador.stop();liberar();descartar();},{once:true});
  },
};

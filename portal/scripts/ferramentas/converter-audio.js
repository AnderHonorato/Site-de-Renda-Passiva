/** Estúdio local de edição e conversão de áudio F191. */
import { LIMITES_AUDIO, FORMATOS_AUDIO, TAXAS_AMOSTRAGEM, validarAjustesAudio, criarArgumentosAudio, nomeSaidaAudio, formatarTempo } from '../cálculos/editor-audio.js';
import { baixar } from '../núcleo/montador.js';
import { criarExecucaoVisual } from '../núcleo/execucao-visual.js';

const MIMES = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4' };
const carregarCSS = () => {
  const href = new URL('../../estilos/editor-audio.css', import.meta.url).href;
  if (document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(href)}"]`)) return;
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.dataset.editorAudio = 'sim'; document.head.append(link);
};
const criar = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, String(v));
  }
  for (const child of children) el.append(child);
  return el;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function montarWav(samples, sampleRate = 44100, channels = 1) {
  const total = samples.length * 2;
  const buffer = new ArrayBuffer(44 + total);
  const view = new DataView(buffer);
  const texto = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  texto(0, 'RIFF'); view.setUint32(4, 36 + total, true); texto(8, 'WAVE'); texto(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); texto(36, 'data'); view.setUint32(40, total, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(clamp(samples[i], -1, 1) * (samples[i] < 0 ? 32768 : 32767)), true);
  return new Uint8Array(buffer);
}

function gerarTom() {
  const rate = 44100, seconds = 5, samples = new Float32Array(rate * seconds);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 8, (seconds - t) * 8);
    samples[i] = (Math.sin(2 * Math.PI * 440 * t) * 0.48 + Math.sin(2 * Math.PI * 660 * t) * 0.16) * env;
  }
  return new File([montarWav(samples, rate)], 'tom-de-exemplo.wav', { type: 'audio/wav' });
}

export default {
  instruções: {
    passos: [
      'Escolha um MP3, WAV, OGG, FLAC ou M4A de até 60 MB. O arquivo é processado no seu aparelho.',
      'Marque o início e o fim na forma de onda ou ajuste os campos de tempo. Ouça a seleção e ajuste fades, volume, normalização, velocidade, canais e taxa de amostragem.',
      'Escolha WAV, MP3, OGG ou FLAC e toque em Exportar. O novo áudio será baixado sem alterar o original.',
    ],
    exemplo: { texto: 'Para criar um clipe de 12 segundos, marque 00:08 a 00:20, aplique fade de entrada e saída de 1 segundo e exporte em MP3. O arquivo gerado contém apenas esse trecho.' },
    limites: 'Arquivos de até 60 MB e 10 minutos. A leitura da forma de onda e a prévia usam os decodificadores disponíveis no navegador; alguns M4A/FLAC podem ser editados e exportados mesmo que o navegador não consiga desenhar a onda ou tocar a prévia. A exportação usa FFmpeg compilado para WebAssembly, carregado localmente. O processamento é limitado a 180 segundos; em aparelhos lentos, reduza a duração ou a taxa de amostragem. MP3 usa o codificador incluído no pacote FFmpeg local.',
    perguntas: [
      { p: 'Meu arquivo é enviado para algum servidor?', r: 'Não. O arquivo e a exportação ficam no seu aparelho; o FFmpeg roda localmente no navegador.' },
      { p: 'O que faz normalizar o áudio?', r: 'Ajusta a sonoridade integrada para um nível de referência comum, sem prometer corrigir gravação estourada ou ruído.' },
      { p: 'O tom de exemplo é uma gravação real?', r: 'Não. Ele é sintetizado no próprio navegador e serve para testar seleção, efeitos e exportação.' },
    ],
  },
  montar(raiz) {
    carregarCSS();
    const urlAjuda = new URL('../comum/midia/ffmpeg.js', import.meta.url).href;
    const painel = criar('section', { class: 'ea', 'aria-label': 'Estúdio de áudio' });
    painel.innerHTML = `
      <div class="ea__hero"><div><p class="ea__eyebrow">ESTÚDIO LOCAL · F191</p><h2>Seu áudio, no ponto.</h2><p>Recorte, ajuste e exporte sem tirar o arquivo do aparelho.</p></div><span class="ea__badge"><span></span> Processamento local</span></div>
      <div class="ea__workspace">
        <div class="ea__main">
          <div class="ea__file" data-role="file-zone"><input class="ea__file-input" data-role="file" type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,.mp3,.wav,.ogg,.flac,.m4a" aria-label="Escolher arquivo de áudio"><span class="ea__file-icon" aria-hidden="true">♫</span><div><strong>Solte um áudio aqui</strong><span>ou escolha um arquivo · MP3, WAV, OGG, FLAC, M4A · até 60 MB</span></div><button class="ea__button ea__button--light" data-role="browse" type="button">Escolher áudio</button></div>
          <div class="ea__demo-row"><button class="ea__text-button" data-role="demo" type="button">Experimentar com um tom de exemplo</button><span>Um WAV curto gerado no aparelho</span></div>
          <div class="ea__track" data-role="track" hidden>
            <div class="ea__track-head"><div><p class="ea__eyebrow">ARQUIVO ABERTO</p><h3 data-role="filename"></h3></div><button class="ea__icon-button" data-role="remove" type="button" aria-label="Fechar áudio">×</button></div>
            <div class="ea__metadata" data-role="metadata"></div>
            <div class="ea__wave-wrap"><canvas data-role="wave" aria-label="Forma de onda do áudio; use as setas para ajustar a seleção" tabindex="0"></canvas><div class="ea__wave-empty" data-role="wave-empty" hidden>Prévia da forma de onda indisponível neste navegador. Use os campos de tempo para selecionar o trecho.</div><div class="ea__range-labels"><span data-role="start-label">00:00.00</span><span data-role="end-label">00:00.00</span></div></div>
            <div class="ea__range-controls"><label>Início <input data-role="start" type="number" min="0" step="0.01" value="0" aria-label="Início da seleção em segundos"><small>segundos</small></label><label>Fim <input data-role="end" type="number" min="0" step="0.01" value="0" aria-label="Fim da seleção em segundos"><small>segundos</small></label><div class="ea__duration"><span>Trecho</span><strong data-role="selection-duration">00:00.00</strong></div></div>
            <div class="ea__player"><button class="ea__play" data-role="play" type="button" aria-label="Reproduzir seleção">▶</button><span data-role="play-status">Prévia do original</span><audio data-role="audio" controls preload="metadata"></audio></div>
          </div>
        </div>
        <aside class="ea__side" data-role="controls" hidden>
          <div class="ea__side-head"><p class="ea__eyebrow">AJUSTES DO TRECHO</p><div><button class="ea__text-button" data-role="undo" type="button" disabled>Desfazer</button><button class="ea__text-button" data-role="redo" type="button" disabled>Refazer</button></div></div>
          <label class="ea__field">Formato de saída<select data-role="format"><option value="wav">WAV · sem perda</option><option value="mp3">MP3 · compatível</option><option value="ogg">OGG · aberto</option><option value="flac">FLAC · sem perda comprimido</option></select></label>
          <label class="ea__field">Volume <output data-role="volume-value">100%</output><input data-role="volume" type="range" min="0" max="200" value="100"><span class="ea__hint">0 a 200%</span></label>
          <label class="ea__field">Velocidade <output data-role="speed-value">100%</output><input data-role="speed" type="range" min="50" max="200" value="100" step="5"></label>
          <div class="ea__two-fields"><label class="ea__field">Fade entrada <input data-role="fade-in" type="number" min="0" max="30" step="0.1" value="0"> <span class="ea__hint">segundos</span></label><label class="ea__field">Fade saída <input data-role="fade-out" type="number" min="0" max="30" step="0.1" value="0"> <span class="ea__hint">segundos</span></label></div>
          <label class="ea__check"><input data-role="normalize" type="checkbox"><span><strong>Normalizar sonoridade</strong><small>Volume integrado em −16 LUFS</small></span></label>
          <div class="ea__two-fields"><label class="ea__field">Canais<select data-role="channels"><option value="estéreo">Estéreo</option><option value="mono">Mono</option></select></label><label class="ea__field">Amostragem<select data-role="sample-rate">${TAXAS_AMOSTRAGEM.map((n) => `<option value="${n}" ${n === 44100 ? 'selected' : ''}>${n / 1000} kHz</option>`).join('')}</select></label></div>
          <button class="ea__button ea__button--primary" data-role="export" type="button" disabled>Exportar áudio <span aria-hidden="true">↗</span></button>
          <div class="ea__visual-progress" data-progressocontainer data-role="progressocontainer"></div><button class="ea__text-button ea__cancel" data-role="cancel" type="button" hidden>Cancelar exportação</button>
          <p class="ea__status" data-role="status" role="status" aria-live="polite">Escolha um arquivo para começar.</p>
          <section class="ea__result" data-role="result" aria-label="Áudio exportado" hidden><div class="ea__result-head"><div><p class="ea__eyebrow">PRÉVIA DO RESULTADO</p><strong data-role="result-summary"></strong></div><span class="ea__result-mark" aria-hidden="true">✓</span></div><audio data-role="result-audio" controls preload="metadata" aria-label="Ouvir o áudio editado"></audio><button class="ea__button ea__button--light ea__download-again" data-role="download-again" type="button">Baixar o arquivo novamente</button></section>
        </aside>
      </div>
      <details class="ea__edit-log"><summary>Histórico desta sessão</summary><div data-role="history"></div><button class="ea__text-button" data-role="export-log" type="button" disabled>Baixar lista de ajustes</button></details>`;
    raiz.replaceChildren(painel);
    const $ = (role) => painel.querySelector(`[data-role="${role}"]`);
    const fileInput = $('file'); const track = $('track'); const controls = $('controls'); const audio = $('audio'); const canvas = $('wave');
    const ctx = canvas.getContext('2d');
    const visual = criarExecucaoVisual($('progressocontainer'), { titulo: 'Edição do áudio', tipo: 'arquivo' });
    const state = { file: null, duration: 0, buffer: null, peaks: null, history: [], position: -1, inputUrl: null, outputUrl: null, outputBlob: null, outputName: '', abort: null, busy: false, operationId: 0 };
    const announce = (msg, isError = false) => { $('status').textContent = msg; $('status').dataset.error = String(isError); };
    function revokeOutput() {
      const player=$('result-audio');player.pause();player.removeAttribute('src');player.load();
      if(state.outputUrl)URL.revokeObjectURL(state.outputUrl);
      state.outputUrl=null;state.outputBlob=null;state.outputName='';$('result').hidden=true;$('result-summary').textContent='';
    }
    const snapshot = () => Object.fromEntries(['start','end','format','volume','speed','fade-in','fade-out','normalize','channels','sample-rate'].map((key) => [key, $(key).type === 'checkbox' ? $(key).checked : $(key).value]));
    const applySnapshot = (s) => { for (const [key, value] of Object.entries(s)) if ($(key)) $(key).type === 'checkbox' ? $(key).checked = value : $(key).value = value; renderWave(); updateSelection(); updateLabels(); };
    const record = () => { const s = snapshot(); if (state.position < state.history.length - 1) state.history.splice(state.position + 1); state.history.push(s); if (state.history.length > 40) state.history.shift(); state.position = state.history.length - 1; updateHistory(); };
    function updateHistory() {
      $('undo').disabled = state.position <= 0 || state.busy; $('redo').disabled = state.position >= state.history.length - 1 || state.busy;
      $('export-log').disabled = !state.history.length;
      const changes = state.history.map((s, i) => `<li><span>${i === 0 ? 'Áudio carregado' : `Ajuste ${i}`}</span><small>${formatarTempo(Number(s.start))}–${formatarTempo(Number(s.end))} · ${esc(FORMATOS_AUDIO[s.format]?.rótulo ?? s.format)} · ${s.volume}% · ${s.speed}%</small></li>`).join('');
      $('history').innerHTML = changes ? `<ol>${changes}</ol>` : '<p>Seus ajustes aparecem aqui.</p>';
    }
    function updateLabels() {
      const start = Number($('start').value) || 0, end = Number($('end').value) || 0;
      $('start-label').textContent = formatarTempo(start); $('end-label').textContent = formatarTempo(end);
      $('selection-duration').textContent = formatarTempo(Math.max(0, end - start));
      $('volume-value').textContent = `${$('volume').value}%`; $('speed-value').textContent = `${$('speed').value}%`;
      $('export').disabled = !state.file || state.busy || end - start < 0.05;
    }
    function updateSelection() {
      if (!state.duration) return;
      const start = clamp(Number($('start').value) || 0, 0, state.duration);
      const end = clamp(Number($('end').value) || state.duration, 0, state.duration);
      if (document.activeElement === $('start')) $('start').value = String(start);
      if (document.activeElement === $('end')) $('end').value = String(end);
      $('start').max = String(state.duration); $('end').max = String(state.duration);
      renderWave(); updateLabels();
    }
    function renderWave() {
      const ratio = devicePixelRatio || 1; const width = Math.max(1, canvas.clientWidth); const height = 120;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.clearRect(0,0,width,height); ctx.fillStyle = '#f3efe8'; ctx.fillRect(0,0,width,height);
      if (!state.buffer) return;
      const peaks = state.peaks;
      const startX = (Number($('start').value) || 0) / state.duration * width;
      const endX = (Number($('end').value) || state.duration) / state.duration * width;
      ctx.fillStyle = 'rgba(183,91,68,.10)'; ctx.fillRect(startX, 0, Math.max(0,endX-startX), height);
      ctx.strokeStyle = '#c66b50'; ctx.lineWidth = 1.25; ctx.beginPath();
      for (let x=0; x<width; x++) { let min=1,max=-1;const a=Math.floor(x*peaks.length/width),b=Math.max(a+1,Math.floor((x+1)*peaks.length/width));for(let i=a;i<Math.min(b,peaks.length);i++){min=Math.min(min,peaks[i][0]);max=Math.max(max,peaks[i][1]);}const y1=(1-max)*height/2,y2=(1-min)*height/2;ctx.moveTo(x+.5,y1);ctx.lineTo(x+.5,y2); }
      ctx.stroke(); ctx.strokeStyle='#7c3327'; ctx.lineWidth=2; for(const x of [startX,endX]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();ctx.beginPath();ctx.arc(x,height/2,5,0,Math.PI*2);ctx.fillStyle='#7c3327';ctx.fill();}
    }
    function waveTime(event) { const rect = canvas.getBoundingClientRect(); return clamp((event.clientX-rect.left)/rect.width*state.duration,0,state.duration); }
    let movingHandle = 'start';
    canvas.addEventListener('pointerdown', (event) => { if (!state.duration) return; canvas.setPointerCapture(event.pointerId); movingHandle = Math.abs(waveTime(event)-Number($('start').value)) <= Math.abs(waveTime(event)-Number($('end').value)) ? 'start' : 'end'; setWaveTime(event); });
    canvas.addEventListener('pointermove', (event) => { if(canvas.hasPointerCapture(event.pointerId)) setWaveTime(event); });
    canvas.addEventListener('pointerup', () => record());
    function setWaveTime(event) { const t=waveTime(event); const other=Number($(movingHandle==='start'?'end':'start').value); $(movingHandle).value=String(Number((movingHandle==='start'?Math.min(t,other-.05):Math.max(t,other+.05)).toFixed(2)));updateSelection(); }
    canvas.addEventListener('keydown',(event)=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const input=$(movingHandle);let t=Number(input.value);if(event.key==='Home')t=0;else if(event.key==='End')t=state.duration;else t+=event.key==='ArrowRight'?0.1:-0.1;input.value=String(clamp(t,0,state.duration));updateSelection();record();});
    const onEdit = () => { updateSelection(); record(); };
    for (const role of ['start','end','format','volume','speed','fade-in','fade-out','normalize','channels','sample-rate']) $(role).addEventListener('change',onEdit);
    $('volume').addEventListener('input',updateLabels); $('speed').addEventListener('input',updateLabels);
    async function chooseFile(file) {
      if (!file) return;
      if (file.size > LIMITES_AUDIO.bytes) { announce('O arquivo passa do limite de 60 MB.',true); return; }
      if (!/\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name) && !/^audio\//i.test(file.type)) { announce('Escolha um MP3, WAV, OGG, FLAC ou M4A.',true); return; }
      if(state.busy){state.operationId++;state.abort?.abort();visual.cancelar('Exportação cancelada porque o áudio foi trocado.');}
      revokeOutput();stopAudio(); state.file=file;state.buffer=null;state.peaks=null;state.duration=0;state.history=[];state.position=-1;
      if(state.inputUrl)URL.revokeObjectURL(state.inputUrl);
      const objectUrl=URL.createObjectURL(file);state.inputUrl=objectUrl;track.hidden=false;controls.hidden=false;$('filename').textContent=file.name;
      $('metadata').textContent=`${(file.size/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})} MB · lendo duração…`;
      try { await new Promise((resolve,reject)=>{audio.onloadedmetadata=resolve;audio.onerror=()=>reject(Error('Este navegador não conseguiu ler a duração deste áudio para preparar o corte. Tente outro navegador ou salve uma cópia em WAV ou MP3.'));audio.src=objectUrl;});
        if (!Number.isFinite(audio.duration) || audio.duration<=0 || audio.duration>LIMITES_AUDIO.duração) throw Error('Este editor aceita áudio com duração até 10 minutos.');
        state.duration=audio.duration;$('start').value='0';$('end').value=String(Math.min(audio.duration,Number(audio.duration.toFixed(2))));$('metadata').textContent=`${file.name.split('.').pop().toUpperCase()} · ${formatarTempo(audio.duration)} · ${(file.size/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})} MB`;
        try { const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio indisponível');const ac=new AC();state.buffer=await ac.decodeAudioData(await file.arrayBuffer());await ac.close();$('metadata').textContent+=` · ${state.buffer.numberOfChannels} ch · ${state.buffer.sampleRate.toLocaleString('pt-BR')} Hz`;
          const channel=state.buffer.getChannelData(0), count=1600, peaks=new Array(count), step=Math.ceil(channel.length/count);
          for(let bin=0;bin<count;bin++){let min=1,max=-1;for(let i=bin*step;i<Math.min(channel.length,(bin+1)*step);i++){min=Math.min(min,channel[i]);max=Math.max(max,channel[i]);}peaks[bin]=[min,max];}state.peaks=peaks;$('wave-empty').hidden=true;canvas.hidden=false; }
        catch { $('wave-empty').hidden=false;canvas.hidden=true; }
        record();renderWave();updateLabels();announce('Áudio pronto. Ajuste o trecho e os efeitos.');
      } catch(error) { track.hidden=false;controls.hidden=false;announce(error.message||'Não foi possível abrir o áudio.',true); }
    }
    audio.addEventListener('loadedmetadata',()=>{const channels=audio.mozChannels;void channels;});
    $('result-audio').addEventListener('loadedmetadata',()=>{
      if(!state.outputBlob)return;
      const seconds=$('result-audio').duration;
      $('result-summary').textContent=`${state.outputName} · ${formatarTempo(seconds)} · ${(state.outputBlob.size/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})} MB`;
    });
    $('download-again').addEventListener('click',()=>{if(state.outputBlob)baixar(state.outputBlob,state.outputName,state.outputBlob.type);});
    function stopAudio(){audio.pause();audio.currentTime=0;}
    $('play').addEventListener('click',()=>{if(!state.file)return;if(audio.paused){const start=Number($('start').value)||0,end=Number($('end').value)||state.duration;if(audio.currentTime<start||audio.currentTime>=end)audio.currentTime=start;audio.play();$('play').textContent='Ⅱ';$('play-status').textContent='Reproduzindo seleção';const stop=()=>{if(audio.currentTime>=end){stopAudio();$('play').textContent='▶';$('play-status').textContent='Prévia do original';}};audio.addEventListener('timeupdate',stop);audio.addEventListener('pause',()=>{$('play').textContent='▶';},{once:true});}else stopAudio();});
    $('remove').addEventListener('click',()=>{if(state.busy){state.operationId++;state.abort?.abort();visual.cancelar('Exportação cancelada.');}revokeOutput();stopAudio();state.file=null;state.buffer=null;state.peaks=null;state.duration=0;audio.removeAttribute('src');audio.load();if(state.inputUrl)URL.revokeObjectURL(state.inputUrl);state.inputUrl=null;track.hidden=true;controls.hidden=true;fileInput.value='';announce('Escolha um arquivo para começar.');});
    $('browse').addEventListener('click',()=>fileInput.click());fileInput.addEventListener('change',()=>chooseFile(fileInput.files?.[0]));
    $('demo').addEventListener('click',()=>chooseFile(gerarTom()));
    const zone=$('file-zone');zone.addEventListener('dragover',(e)=>{e.preventDefault();zone.dataset.drag='sim';});zone.addEventListener('dragleave',()=>delete zone.dataset.drag);zone.addEventListener('drop',(e)=>{e.preventDefault();delete zone.dataset.drag;chooseFile(e.dataTransfer.files?.[0]);});
    $('undo').addEventListener('click',()=>{if(state.position>0){state.position--;applySnapshot(state.history[state.position]);updateHistory();}});$('redo').addEventListener('click',()=>{if(state.position<state.history.length-1){state.position++;applySnapshot(state.history[state.position]);updateHistory();}});
    $('export-log').addEventListener('click',()=>{const text=`Histórico do editor de áudio\n${state.history.map((s,i)=>`${i}. ${formatarTempo(+s.start)}–${formatarTempo(+s.end)} | ${s.format.toUpperCase()} | volume ${s.volume}% | velocidade ${s.speed}% | fades ${s['fade-in']}/${s['fade-out']} s | ${s.channels} | ${s['sample-rate']} Hz${s.normalize?' | normalização':''}`).join('\n')}`;baixar(new Blob([text],{type:'text/plain;charset=utf-8'}),nomeSaidaAudio(state.file?.name,'wav').replace(/\.wav$/,'-historico.txt'),'text/plain');});
    $('cancel').addEventListener('click',()=>state.abort?.abort());
    $('export').addEventListener('click',async()=>{
      if(!state.file||state.busy)return;
      const operationId=++state.operationId;
      const arquivoOriginal=state.file;
      try {
        const cfg={início:Number($('start').value),fim:Number($('end').value),formato:$('format').value,volume:Number($('volume').value)/100,velocidade:Number($('speed').value)/100,fadeIn:Number($('fade-in').value),fadeOut:Number($('fade-out').value),canais:$('channels').value,sampleRate:Number($('sample-rate').value)};
        const checked=validarAjustesAudio(cfg,state.duration);if($('normalize').checked)cfg.normalizar=true;
        const args=criarArgumentosAudio(cfg,state.duration,'audio.input',`audio.${checked.formato.extensão}`);
        revokeOutput();
        state.busy=true;state.abort=new AbortController();$('cancel').hidden=false;$('export').disabled=true;updateHistory();
        visual.iniciar('Carregando o motor local de áudio…');
        const mod=await import(urlAjuda);if(typeof mod.processarMidia!=='function')throw Error('O módulo local de processamento de mídia não está disponível nesta versão.');
        const saida=`audio.${checked.formato.extensão}`;
        const resultado=await mod.processarMidia({arquivos:[{nome:'audio.input',bytes:new Uint8Array(await arquivoOriginal.arrayBuffer())}],argumentos:args,saida,signal:state.abort.signal,limiteTempoMs:LIMITES_AUDIO.timeoutMs,onProgress:(info)=>{
          if(operationId!==state.operationId)return;
          const pct=typeof info==='number'?info:Number(info?.progress??info?.percent??info?.progresso);
          const progresso=Number.isFinite(pct)?clamp(pct>1?pct:pct*100,0,100):undefined;
          const etapa={carregando:'Carregando o motor local de áudio…',processando:'Aplicando corte, fades e conversão…'}[info?.etapa];
          if(etapa)visual.andar(progresso,etapa);
        }});
        if(operationId!==state.operationId)return;
        const bytes=resultado?.bytes;if(!(bytes instanceof Uint8Array)||!bytes.length)throw Error('O processador não retornou um áudio. Confira os ajustes e tente de novo.');
        const blob=new Blob([bytes],{type:MIMES[cfg.formato]});const filename=nomeSaidaAudio(arquivoOriginal.name,cfg.formato);
        state.outputBlob=blob;state.outputName=filename;state.outputUrl=URL.createObjectURL(blob);$('result-audio').src=state.outputUrl;$('result-audio').load();$('result').hidden=false;
        baixar(blob,filename,blob.type);const detalhe=`${filename} · ${formatarTempo(checked.duraçãoSaída)} · ${(blob.size/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})} MB`;$('result-summary').textContent=detalhe;announce(`Exportação concluída: ${detalhe}.`);visual.concluir('Áudio exportado',detalhe);
      } catch(error) { if(operationId===state.operationId){const cancelado=error?.name==='AbortError';const mensagem=cancelado?'Exportação cancelada.':error?.message||'Falha na exportação. Tente WAV ou reduza o trecho.';announce(mensagem,!cancelado);if(cancelado)visual.cancelar(mensagem);else visual.falhar(mensagem);} }
      finally {if(operationId===state.operationId){state.busy=false;state.abort=null;$('cancel').hidden=true;updateLabels();updateHistory();}else if(state.busy){state.busy=false;state.abort=null;$('cancel').hidden=true;updateLabels();updateHistory();}}
    });
    window.addEventListener('resize',renderWave);
    window.addEventListener('pagehide',()=>{revokeOutput();if(state.inputUrl)URL.revokeObjectURL(state.inputUrl);state.inputUrl=null;},{once:true});
  },
};

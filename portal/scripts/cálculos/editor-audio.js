/** Regras puras e construção da linha de comando do editor de áudio F191. */
export const LIMITES_AUDIO = Object.freeze({ bytes: 60 * 1024 * 1024, duração: 600, timeoutMs: 180_000 });
export const FORMATOS_AUDIO = Object.freeze({
  wav: { extensão: 'wav', codec: 'pcm_s16le', rótulo: 'WAV' },
  mp3: { extensão: 'mp3', codec: 'libmp3lame', rótulo: 'MP3' },
  ogg: { extensão: 'ogg', codec: 'libvorbis', rótulo: 'OGG' },
  flac: { extensão: 'flac', codec: 'flac', rótulo: 'FLAC' },
});
export const TAXAS_AMOSTRAGEM = Object.freeze([22050, 32000, 44100, 48000]);

export function validarAjustesAudio(ajustes, duraçãoTotal) {
  if (!ajustes || typeof ajustes !== 'object') throw new TypeError('Confira os ajustes de áudio.');
  const início = Number(ajustes.início);
  const fim = Number(ajustes.fim);
  if (!Number.isFinite(duraçãoTotal) || duraçãoTotal <= 0 || duraçãoTotal > LIMITES_AUDIO.duração) {
    throw new RangeError('O áudio precisa ter duração positiva e não passar de 10 minutos.');
  }
  if (!Number.isFinite(início) || !Number.isFinite(fim) || início < 0 || fim > duraçãoTotal || fim <= início) {
    throw new RangeError('O trecho precisa começar antes do fim e ficar dentro da duração do áudio.');
  }
  if (fim - início < 0.05) throw new RangeError('O trecho selecionado precisa ter pelo menos 0,05 segundo.');
  const formato = FORMATOS_AUDIO[ajustes.formato];
  if (!formato) throw new RangeError('Escolha WAV, MP3, OGG ou FLAC.');
  const volume = Number(ajustes.volume);
  const velocidade = Number(ajustes.velocidade);
  const fadeIn = Number(ajustes.fadeIn);
  const fadeOut = Number(ajustes.fadeOut);
  const sampleRate = Number(ajustes.sampleRate);
  if (!Number.isFinite(volume) || volume < 0 || volume > 2) throw new RangeError('O volume deve ficar entre 0 e 200%.');
  if (!Number.isFinite(velocidade) || velocidade < 0.5 || velocidade > 2) throw new RangeError('A velocidade deve ficar entre 50% e 200%.');
  const trecho = fim - início;
  const duraçãoSaída = trecho / velocidade;
  if (![fadeIn, fadeOut].every((n) => Number.isFinite(n) && n >= 0 && n <= Math.min(30, duraçãoSaída / 2))) {
    throw new RangeError('Cada fade deve caber na metade do trecho selecionado.');
  }
  if (!TAXAS_AMOSTRAGEM.includes(sampleRate)) throw new RangeError('Escolha uma taxa de amostragem disponível.');
  if (!['mono', 'estéreo'].includes(ajustes.canais)) throw new RangeError('Escolha mono ou estéreo.');
  return { início, fim, duração: trecho, duraçãoSaída, formato, volume, velocidade, fadeIn, fadeOut, sampleRate, canais: ajustes.canais };
}

/** Cria argumentos apenas com opções controladas pelo editor; nomes e bytes são fornecidos separadamente ao wrapper. */
export function criarArgumentosAudio(ajustes, duraçãoTotal, entrada = 'audio.input', saída = 'audio.wav') {
  const a = validarAjustesAudio(ajustes, duraçãoTotal);
  const filtros = ['asetpts=PTS-STARTPTS'];
  if (a.velocidade !== 1) filtros.push(`atempo=${a.velocidade}`);
  if (a.volume !== 1) filtros.push(`volume=${a.volume}`);
  if (ajustes.normalizar === true) filtros.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  if (a.fadeIn > 0) filtros.push(`afade=t=in:st=0:d=${a.fadeIn}`);
  if (a.fadeOut > 0) filtros.push(`afade=t=out:st=${Math.max(0, a.duraçãoSaída - a.fadeOut)}:d=${a.fadeOut}`);
  // Limita primeiro o áudio de entrada, para filtros e normalização nunca lerem além do trecho escolhido.
  const args = ['-hide_banner', '-loglevel', 'error', '-ss', String(a.início), '-t', String(a.duração), '-i', entrada, '-t', String(a.duraçãoSaída)];
  if (filtros.length) args.push('-af', filtros.join(','));
  args.push('-ac', String(a.canais === 'mono' ? 1 : 2), '-ar', String(a.sampleRate), '-c:a', a.formato.codec, '-y', saída);
  return args;
}

export function nomeSaidaAudio(nome = 'audio', formato = 'wav') {
  const base = String(nome).replace(/\.[^.]*$/, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'audio';
  const ext = FORMATOS_AUDIO[formato]?.extensão;
  if (!ext) throw new RangeError('Formato de áudio inválido.');
  return `${base}-editado.${ext}`;
}

export function formatarTempo(segundos) {
  const n = Math.max(0, Number(segundos) || 0);
  const m = Math.floor(n / 60);
  return `${String(m).padStart(2, '0')}:${(n - m * 60).toFixed(2).padStart(5, '0')}`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { criarArgumentosAudio, validarAjustesAudio, nomeSaidaAudio, formatarTempo, LIMITES_AUDIO } from '../scripts/cálculos/editor-audio.js';

const base = { início: 2, fim: 8, formato: 'wav', volume: 1, velocidade: 1, fadeIn: 0, fadeOut: 0, sampleRate: 44100, canais: 'estéreo' };

test('aceita recorte e efeito válidos dentro dos limites declarados', () => {
  assert.deepEqual(validarAjustesAudio({ ...base, fadeIn: 1, fadeOut: 1 }, 10), {
    início: 2, fim: 8, duração: 6, duraçãoSaída: 6, formato: { extensão: 'wav', codec: 'pcm_s16le', rótulo: 'WAV' },
    volume: 1, velocidade: 1, fadeIn: 1, fadeOut: 1, sampleRate: 44100, canais: 'estéreo',
  });
  assert.equal(LIMITES_AUDIO.bytes, 60 * 1024 * 1024);
  assert.equal(LIMITES_AUDIO.duração, 600);
});

test('FFmpeg recebe corte, fades, volume, velocidade, canais e formato reais', () => {
  const args = criarArgumentosAudio({ ...base, formato: 'mp3', fadeIn: 0.5, fadeOut: 1, volume: 1.25, velocidade: 1.5, canais: 'mono', normalizar: true }, 12, 'audio.input', 'audio.mp3');
  assert.deepEqual(args.slice(0, 8), ['-hide_banner', '-loglevel', 'error', '-ss', '2', '-t', '6', '-i']);
  assert.equal(args[args.indexOf('-i') + 1], 'audio.input');
  const tempos = args.flatMap((arg, i) => arg === '-t' ? [args[i + 1]] : []);
  assert.deepEqual(tempos, ['6', '4'], 'a entrada contém só o trecho marcado e a saída respeita a velocidade');
  assert.match(args[args.indexOf('-af') + 1], /afade=t=in:st=0:d=0\.5/);
  assert.match(args[args.indexOf('-af') + 1], /afade=t=out:st=3:d=1/);
  assert.match(args[args.indexOf('-af') + 1], /^asetpts=PTS-STARTPTS,atempo=1\.5,volume=1\.25,loudnorm=I=-16/);
  assert.deepEqual(args.slice(-8), ['-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-y', 'audio.mp3']);
  assert.equal(args.at(-1), 'audio.mp3');
});

test('valida intervalos, efeitos, taxa e codec sem repassar texto do usuário ao FFmpeg', () => {
  for (const cfg of [{ ...base, início: -1 }, { ...base, fim: 11 }, { ...base, fim: 2.01 }, { ...base, velocidade: 3 }, { ...base, volume: 5 }, { ...base, sampleRate: 12345 }, { ...base, formato: '-i hacked' }, { ...base, fadeOut: 3.1 }]) {
    assert.throws(() => validarAjustesAudio(cfg, 10));
  }
  assert.throws(() => validarAjustesAudio(base, 601));
});

test('nome de saída remove extensão, acentos e caracteres de caminho', () => {
  assert.equal(nomeSaidaAudio('../Música de teste!.m4a', 'flac'), 'Musica-de-teste-editado.flac');
  assert.equal(nomeSaidaAudio('???', 'wav'), 'audio-editado.wav');
  assert.equal(formatarTempo(65.129), '01:05.13');
});

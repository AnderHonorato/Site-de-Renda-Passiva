import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES_MIDIA, validarArquivoVideo, validarAjustes, construirArgumentos, formatarTempo,
} from '../scripts/ferramentas/cortar-video-e-audio.js';

const dados = (ajustes = {}) => ({
  início: '1', fim: '8', corteX: '0', corteY: '0', corteLargura: '100', corteAltura: '100',
  velocidade: '1', volume: '100', tamanho: 'original', larguraCustom: '1280', alturaCustom: '720',
  formato: 'mp4', giro: '0', espelho: 'nenhum', mudo: 'com-áudio', fadeIn: '0', fadeOut: '0', texto: '',
  fonte: 'sans', posiçãoTexto: 'inferior-centro', ...ajustes,
});

test('limites documentados e extensões permitidas são aplicados ao arquivo', () => {
  assert.equal(LIMITES_MIDIA.bytes, 60 * 1024 * 1024);
  assert.equal(validarArquivoVideo({ name: 'clip.MP4', size: 12 }), 'mp4');
  assert.throws(() => validarArquivoVideo({ name: 'arquivo.exe', size: 12 }), /MP4, WebM, MOV/);
  assert.throws(() => validarArquivoVideo({ name: 'clip.mov', size: LIMITES_MIDIA.bytes + 1 }), /60 MB/);
});

test('recusa trechos e cortes fora dos limites e configurações inválidas', () => {
  assert.throws(() => validarAjustes(dados({ fim: '1' }), 10), /depois do início/);
  assert.throws(() => validarAjustes(dados({ fim: '11' }), 10), /passa da duração/);
  assert.throws(() => validarAjustes(dados({ corteX: '65', corteLargura: '40' }), 10), /dentro do quadro/);
  assert.throws(() => validarAjustes(dados({ velocidade: '3' }), 10), /entre 0.5 e 2/);
  assert.throws(() => validarAjustes(dados({ fadeIn: '5', fadeOut: '4' }), 10), /soma dos fades/);
  assert.throws(() => validarAjustes(dados({ início:'1',fim:'3',velocidade:'2',fadeIn:'0.6',fadeOut:'0.5' }), 10), /duração final/);
  assert.throws(() => validarAjustes(dados({ formato: 'wav', mudo: 'sim' }), 10), /WAV precisa de áudio/);
});

test('plano de edição normaliza pixels do crop, dimensões e texto sem executar codecs', () => {
  const plano = validarAjustes(dados({ corteX: '10', corteY: '5', corteLargura: '80', corteAltura: '70', giro: '90', tamanho: '720', texto: 'Olá mundo' }), 10, { largura: 1920, altura: 1080 });
  assert.deepEqual(plano.cropPixels, { x: 192, y: 54, largura: 1536, altura: 756 });
  assert.equal(plano.largura, 1280);
  assert.equal(plano.altura, 720);
  assert.equal(plano.giro, 90);
  assert.equal(plano.texto, 'Olá mundo');
});

test('argumentos incluem o corte e transcodificação que correspondem ao formato pedido', () => {
  const cfg = validarAjustes(dados({ início: '2.5', fim: '8', velocidade: '1.5', volume: '80', corteLargura: '50', mudo: 'sim' }), 10, { largura: 640, altura: 480 });
  const args = construirArgumentos(cfg, 'entrada.mov', 'saida.mp4');
  assert.deepEqual(args.slice(0, 6), ['-ss', '2.5', '-t', '5.5', '-i', 'entrada.mov']);
  assert.ok(args.some((arg) => arg.includes('crop=320:480:0:0')));
  assert.ok(args.some((arg) => arg.includes('setpts=PTS/1.5')));
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('-an'));
  assert.equal(args.at(-1), 'saida.mp4');
});

test('GIF usa palettegen/paletteuse; WAV não tem vídeo e WebM solicita VP8/Vorbis', () => {
  const cfg = validarAjustes(dados(), 10);
  const gif = construirArgumentos({ ...cfg, formato: 'gif' }, 'entrada.mp4', 'saida.gif');
  assert.ok(gif.includes('-filter_complex'));
  assert.ok(gif.some((x) => x.includes('palettegen') && x.includes('paletteuse')));
  const wavConfig = validarAjustes(dados({ formato: 'wav' }), 10);
  const wav = construirArgumentos(wavConfig, 'entrada.mp4', 'saida.wav');
  assert.ok(wav.includes('-vn'));
  assert.ok(wav.includes('pcm_s16le'));
  const webm = construirArgumentos({ ...cfg, formato: 'webm' }, 'entrada.mp4', 'saida.webm');
  assert.ok(webm.includes('libvpx'));
  assert.ok(webm.includes('libvorbis'));
});

test('tempos legíveis são compactos, inclusive duração longa', () => {
  assert.equal(formatarTempo(62.34), '01:02.34');
  assert.equal(formatarTempo(0), '00:00.00');
});

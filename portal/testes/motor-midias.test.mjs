import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITES_MOTOR, validarTrabalhoMidia } from '../scripts/comum/midia/ffmpeg.js';

const trabalho = extra => ({ arquivos: [{ nome: 'entrada.wav', bytes: Uint8Array.of(82, 73, 70, 70) }],
  argumentos: ['-i', 'entrada.wav', '-c:a', 'libmp3lame', 'saida.mp3'], saida: 'saida.mp3', ...extra });

test('o motor aceita um trabalho local com nomes isolados e prazo limitado', () => {
  assert.deepEqual(validarTrabalhoMidia(trabalho({ limiteTempoMs: 5000 })), { tamanho: 4, limiteTempoMs: 5000 });
});

test('trabalhos não sobrescrevem a entrada nem usam caminhos externos no worker', () => {
  for (const nome of ['../entrada.wav', '/entrada.wav', 'pasta/entrada.wav', 'a..wav']) {
    assert.throws(() => validarTrabalhoMidia(trabalho({ arquivos: [{ nome, bytes: Uint8Array.of(1) }] })), erro => erro.codigo === 'entrada');
  }
  assert.throws(() => validarTrabalhoMidia(trabalho({ saida: 'entrada.wav' })), erro => erro.codigo === 'entrada');
  assert.throws(() => validarTrabalhoMidia(trabalho({ arquivos: [{ nome: 'entrada.wav', bytes: Uint8Array.of(1) }, { nome: 'entrada.wav', bytes: Uint8Array.of(2) }] })), erro => erro.codigo === 'entrada');
});

test('endereços de rede e protocolos não podem entrar como argumentos de processamento', () => {
  for (const endereco of ['https://exemplo.test/video.mp4', 'file:///etc/passwd', 'ftp://exemplo.test/arquivo', 'data:video/mp4;base64,AA']) {
    assert.throws(() => validarTrabalhoMidia(trabalho({ argumentos: ['-i', endereco, 'saida.mp3'] })), erro => erro.codigo === 'argumentos');
  }
});

test('limites recusam entradas vazias, orçamento excessivo e volume total de memória', () => {
  assert.throws(() => validarTrabalhoMidia(trabalho({ arquivos: [{ nome: 'entrada.wav', bytes: new Uint8Array() }] })), erro => erro.codigo === 'entrada');
  assert.throws(() => validarTrabalhoMidia(trabalho({ limiteTempoMs: LIMITES_MOTOR.tempoMs + 1 })), erro => erro.codigo === 'limite');
  assert.throws(() => validarTrabalhoMidia(trabalho({ arquivos: [{ nome: 'entrada.wav', bytes: new Uint8Array(LIMITES_MOTOR.entrada + 1) }] })), erro => erro.codigo === 'limite');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { validarIdiomaOCR, validarDimensoesOCR, criarLeitorOCR, ErroOCR } from '../scripts/comum/ocr/motor.js';
import { deveSerPublicado } from '../ferramentas/política-de-segurança.mjs';
import { listarPublicáveis } from '../ferramentas/publicar.mjs';

test('OCR: aceita apenas os idiomas publicados e recusa caminhos externos antes de criar Worker', async () => {
  for (const idioma of ['por', 'eng', 'spa']) assert.equal(validarIdiomaOCR(idioma), idioma);
  for (const idioma of ['fra', '../eng', 'https://outro/por', 'por+eng', null]) {
    assert.throws(() => validarIdiomaOCR(idioma), ErroOCR);
    await assert.rejects(criarLeitorOCR({ idioma }), erro => erro.codigo === 'idioma');
  }
});
test('OCR: limites de pixels e de lado evitam canvas inviável no celular', () => {
  validarDimensoesOCR(2000, 4000);
  for (const [largura, altura] of [[0, 100], [NaN, 200], [100, 1.5], [8001, 2], [3000, 3000]]) {
    assert.throws(() => validarDimensoesOCR(largura, altura), ErroOCR);
  }
});
test('OCR: sinal já cancelado não chega a criar Worker', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(criarLeitorOCR({ signal: controller.signal }), erro => erro.name === 'AbortError' && erro.cancelado === true);
});

test('OCR: publicação inclui os modelos locais e mantém outros arquivos compactados privados', async () => {
  const publicaveis = new Set(await listarPublicáveis());
  for (const idioma of ['por', 'eng', 'spa']) {
    const caminho = `recursos/ocr/${idioma}.traineddata.gz`;
    assert.equal(deveSerPublicado(caminho), true);
    assert.ok(publicaveis.has(caminho), `${caminho} precisa existir no artefato público`);
  }
  for (const caminho of ['recursos/ocr/backup.gz', 'recursos/outro.gz', 'recursos/ocr/fra.traineddata.gz', 'servidor/banco.gz']) assert.equal(deveSerPublicado(caminho), false);
});

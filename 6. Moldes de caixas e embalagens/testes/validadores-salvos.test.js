import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCaixaRetangularSalva } from '../scripts/validação/validar-caixa-retangular-salva.js';
import { validarCaixaComTampaSalva } from '../scripts/validação/validar-caixa-com-tampa-salva.js';
import { validarEnvelopeSalvo } from '../scripts/validação/validar-envelope-salvo.js';
import { validarEtiquetasSalvas } from '../scripts/validação/validar-etiquetas-salvas.js';

test('validador de caixa retangular aceita registro correto e recusa dados adulterados', () => {
  const válido = { nome: 'Caixa de brigadeiro', comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 0.3, tamanhoDaAbaMm: 15, tipoDePapel: '', textoOpcional: '', unidade: 'mm' };
  assert.equal(validarCaixaRetangularSalva(válido), true);
  assert.equal(validarCaixaRetangularSalva({ ...válido, tamanhoDaAbaMm: 41 }), false);
  assert.equal(validarCaixaRetangularSalva({ ...válido, unidade: 'polegada' }), false);
  assert.equal(validarCaixaRetangularSalva(null), false);
  assert.equal(validarCaixaRetangularSalva({ ...válido, comprimentoInternoMm: -5 }), false);
});

test('validador de caixa com tampa exige aba dentro da menor altura', () => {
  const válido = {
    nome: 'Caixa presente',
    comprimentoInternoMm: 150,
    larguraInternoMm: 100,
    alturaDaBaseMm: 40,
    alturaDaTampaMm: 15,
    folgaMm: 1,
    espessuraDoPapelMm: 0.3,
    tamanhoDaAbaMm: 12,
    tipoDePapel: '',
    textoOpcional: '',
    unidade: 'mm',
  };
  assert.equal(validarCaixaComTampaSalva(válido), true);
  assert.equal(validarCaixaComTampaSalva({ ...válido, tamanhoDaAbaMm: 20 }), false);
  assert.equal(validarCaixaComTampaSalva({ ...válido, folgaMm: -1 }), false);
});

test('validador de envelope recusa nome vazio e texto longo demais', () => {
  const válido = { nome: 'Convite', larguraDoConteúdoMm: 100, alturaDoConteúdoMm: 150, folgaMm: 3, tamanhoDaAbaMm: 25, tipoDePapel: '', textoOpcional: '', unidade: 'mm' };
  assert.equal(validarEnvelopeSalvo(válido), true);
  assert.equal(validarEnvelopeSalvo({ ...válido, nome: '' }), false);
  assert.equal(validarEnvelopeSalvo({ ...válido, textoOpcional: 'x'.repeat(201) }), false);
});

test('validador de etiquetas recusa margem fora da faixa', () => {
  const válido = { nome: 'Etiquetas da loja', larguraDaEtiquetaMm: 50, alturaDaEtiquetaMm: 30, espaçamentoMm: 3, margemMm: 10, textoOpcional: '', unidade: 'mm' };
  assert.equal(validarEtiquetasSalvas(válido), true);
  assert.equal(validarEtiquetasSalvas({ ...válido, margemMm: 2 }), false);
  assert.equal(validarEtiquetasSalvas({ ...válido, margemMm: 40 }), false);
});

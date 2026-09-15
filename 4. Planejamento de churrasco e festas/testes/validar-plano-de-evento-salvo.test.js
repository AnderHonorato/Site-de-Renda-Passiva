import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPlanoDeEventoSalvo } from '../scripts/validação/validar-plano-de-evento-salvo.js';

const válido = {
  nome: 'Churrasco de aniversário',
  perfil: 'churrasco',
  adultos: 10,
  crianças: 2,
  duraçãoEmHoras: 4,
  apetite: 'médio',
  vegetarianos: 1,
  semCarneVermelha: 0,
  adultosComConsumoDeÁlcool: 5,
  itens: [{ chave: 'carne-sem-osso', incluído: true, quantidadePorAdulto: 450, embalagemNaUnidadeBase: 1000, preçoPorUnidadeDeCompraEmCentavos: 3990 }],
};

test('registro bem formado é aceito', () => {
  assert.equal(validarPlanoDeEventoSalvo(válido), true);
});

test('registros adulterados são recusados', () => {
  assert.equal(validarPlanoDeEventoSalvo(null), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, perfil: 'piquenique' }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, adultos: -1 }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, adultos: 1.5 }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, adultos: 0, crianças: 0 }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, apetite: 'insaciável' }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, adultosComConsumoDeÁlcool: 999 }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, itens: [] }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, itens: [{ chave: 'x' }] }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, itens: [{ ...válido.itens[0], quantidadePorAdulto: '<script>' }] }), false);
  assert.equal(validarPlanoDeEventoSalvo({ ...válido, nome: '' }), false);
  assert.equal(validarPlanoDeEventoSalvo('não é objeto'), false);
});

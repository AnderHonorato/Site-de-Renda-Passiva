import { test } from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import qrcode from '../recursos/bibliotecas/qrcode.mjs';
import { calcularCrcPix } from '../scripts/apoio/calcular-crc-pix.js';
import { gerarMatrizQr } from '../scripts/apoio/gerar-matriz-qr.js';
import { gerarPayloadPix } from '../scripts/apoio/gerar-payload-pix.js';
import { montarCampoEmv } from '../scripts/apoio/montar-campo-emv.js';
import { normalizarTextoPix } from '../scripts/apoio/normalizar-texto-pix.js';
import { validarChavePix } from '../scripts/apoio/validar-chave-pix.js';
import { validarValorPix } from '../scripts/apoio/validar-valor-pix.js';

// Dados de teste NÃO pagáveis: chave aleatória do exemplo do manual do Banco Central.
const CHAVE_DE_TESTE = '123e4567-e12b-12d1-a456-426655440000';

function lerCamposEmv(texto) {
  const campos = new Map();
  let posição = 0;
  while (posição < texto.length) {
    const id = texto.slice(posição, posição + 2);
    const tamanho = Number(texto.slice(posição + 2, posição + 4));
    campos.set(id, texto.slice(posição + 4, posição + 4 + tamanho));
    posição += 4 + tamanho;
  }
  return campos;
}

function decodificarMatriz(matriz) {
  const escala = 6;
  const margem = 4;
  const lado = (matriz.length + margem * 2) * escala;
  const pixels = new Uint8ClampedArray(lado * lado * 4).fill(255);
  matriz.forEach((linha, y) => {
    linha.forEach((escuro, x) => {
      if (!escuro) return;
      for (let dy = 0; dy < escala; dy += 1) {
        for (let dx = 0; dx < escala; dx += 1) {
          const índice = (((y + margem) * escala + dy) * lado + (x + margem) * escala + dx) * 4;
          pixels[índice] = 0;
          pixels[índice + 1] = 0;
          pixels[índice + 2] = 0;
        }
      }
    });
  });
  return jsQR(pixels, lado, lado);
}

test('CRC confere com o exemplo do Manual de Padrões para Iniciação do Pix', () => {
  const semCrc = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.equal(calcularCrcPix(semCrc), '1D3D');
});

test('campo EMV tem identificador, tamanho com dois dígitos e rejeita excessos', () => {
  assert.equal(montarCampoEmv('58', 'BR'), '5802BR');
  assert.throws(() => montarCampoEmv('5', 'BR'));
  assert.throws(() => montarCampoEmv('59', 'x'.repeat(100)));
  assert.throws(() => montarCampoEmv('59', 'João'));
});

test('valor do Pix é convertido em centavos inteiros sem ponto flutuante', () => {
  const casos = [
    ['1', 100], ['1,5', 150], ['1,05', 105], ['15,50', 1550], ['1.234,56', 123456], ['10.50', 1050],
    ['1.500', 150000], ['R$ 20', 2000], ['99.999,99', 9999999], [',50', 50], [100, 100], [10000, 10000],
  ];
  for (const [entrada, centavos] of casos) {
    assert.deepEqual(validarValorPix(entrada), { válido: true, centavos }, `entrada ${entrada}`);
  }
  for (const inválido of ['', '0', '0,00', '-1', '1e3', '1,234', 'abc', '100000', '1,2,3', '12.34.56', 'Infinity', 1.5, 0, -100, 10_000_000]) {
    assert.equal(validarValorPix(inválido).válido, false, `entrada ${inválido}`);
  }
});

test('chaves Pix válidas e inválidas', () => {
  assert.deepEqual(validarChavePix('529.982.247-25'), { válida: true, tipo: 'CPF', chaveNormalizada: '52998224725' });
  assert.deepEqual(validarChavePix('11.222.333/0001-81'), { válida: true, tipo: 'CNPJ', chaveNormalizada: '11222333000181' });
  assert.equal(validarChavePix('+5511999998888').tipo, 'telefone');
  assert.equal(validarChavePix('Pessoa@Exemplo.com.br').chaveNormalizada, 'pessoa@exemplo.com.br');
  assert.equal(validarChavePix(CHAVE_DE_TESTE.toUpperCase()).chaveNormalizada, CHAVE_DE_TESTE);
  for (const inválida of ['', '111.111.111-11', '529.982.247-24', '11999998888x', '+1 555 0100', 'sem-arroba', 'a'.repeat(78)]) {
    assert.equal(validarChavePix(inválida).válida, false, `chave ${inválida}`);
  }
});

test('nome e cidade perdem acentos e símbolos sem cortar silenciosamente', () => {
  assert.equal(normalizarTextoPix('  João   Açaí <script> '), 'Joao Acai script');
  assert.equal(normalizarTextoPix('São Paulo'), 'Sao Paulo');
});

test('payload estático tem campos corretos, valor exato e CRC coerente', () => {
  const payload = gerarPayloadPix({ chave: CHAVE_DE_TESTE, nome: 'Fulano de Tal', cidade: 'Brasília', centavos: 1000 });
  const campos = lerCamposEmv(payload);
  assert.equal(campos.get('00'), '01');
  assert.equal(campos.get('52'), '0000');
  assert.equal(campos.get('53'), '986');
  assert.equal(campos.get('54'), '10.00');
  assert.equal(campos.get('58'), 'BR');
  assert.equal(campos.get('59'), 'Fulano de Tal');
  assert.equal(campos.get('60'), 'Brasilia');
  assert.equal(campos.get('62'), '0503***');
  const conta = lerCamposEmv(campos.get('26'));
  assert.equal(conta.get('00'), 'br.gov.bcb.pix');
  assert.equal(conta.get('01'), CHAVE_DE_TESTE);
  assert.equal(payload.slice(-8, -4), '6304');
  assert.equal(calcularCrcPix(payload.slice(0, -4)), payload.slice(-4));
});

test('os sete valores obrigatórios geram códigos com o valor exato', () => {
  const esperados = { 100: '1.00', 500: '5.00', 1000: '10.00', 2000: '20.00', 3000: '30.00', 5000: '50.00', 10000: '100.00' };
  for (const [centavos, texto] of Object.entries(esperados)) {
    const payload = gerarPayloadPix({ chave: CHAVE_DE_TESTE, nome: 'Anderson', cidade: 'Sao Paulo', centavos: Number(centavos) });
    assert.equal(lerCamposEmv(payload).get('54'), texto);
  }
  const livre = gerarPayloadPix({ chave: CHAVE_DE_TESTE, nome: 'Anderson', cidade: 'Sao Paulo', centavos: 1234 });
  assert.equal(lerCamposEmv(livre).get('54'), '12.34');
});

test('payload recusa dados incompletos em vez de gerar código parcial', () => {
  const base = { chave: CHAVE_DE_TESTE, nome: 'Anderson', cidade: 'Sao Paulo', centavos: 500 };
  assert.throws(() => gerarPayloadPix({ ...base, chave: '' }));
  assert.throws(() => gerarPayloadPix({ ...base, nome: '' }));
  assert.throws(() => gerarPayloadPix({ ...base, nome: 'Nome de recebedor comprido demais' }));
  assert.throws(() => gerarPayloadPix({ ...base, cidade: 'Cidade comprida demais' }));
  assert.throws(() => gerarPayloadPix({ ...base, centavos: 0 }));
  assert.throws(() => gerarPayloadPix({ ...base, centavos: '5' }));
});

test('QR Code gerado é decodificado por leitor independente (jsQR) com o mesmo texto', () => {
  for (const centavos of [100, 500, 10000, 9999999]) {
    const payload = gerarPayloadPix({ chave: CHAVE_DE_TESTE, nome: 'Fulano de Tal', cidade: 'Brasilia', centavos });
    const lido = decodificarMatriz(gerarMatrizQr(payload, qrcode));
    assert.ok(lido, 'o QR Code deve ser legível');
    assert.equal(lido.data, payload);
  }
});

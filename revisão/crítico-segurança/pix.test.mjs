// Pix: campos EMV, CRC com implementação independente (tabela), valor exato e leitura do QR
// por decodificador independente (jsQR) a partir da biblioteca publicada no pacote.
// Chave de exemplo do Manual do BCB, não pagável.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { RAIZ, caminho, importar } from './_util.mjs';

const exigir = createRequire(`${RAIZ}/package.json`);
const jsQR = exigir('jsqr');
const { gerarPayloadPix } = await importar(1, 'scripts/comum/apoio/gerar-payload-pix.js');
const { validarValorPix } = await importar(1, 'scripts/comum/apoio/validar-valor-pix.js');
const { validarChavePix } = await importar(1, 'scripts/comum/apoio/validar-chave-pix.js');
const { gerarMatrizQr } = await importar(1, 'scripts/comum/apoio/gerar-matriz-qr.js');
const qrcode = (await import(pathToFileURL(caminho(1, 'publicação/recursos/bibliotecas/qrcode.mjs')).href)).default;

const CHAVE = '123e4567-e12b-12d1-a456-426655440000';

// CRC-16/CCITT-FALSE por tabela — implementação independente da do projeto.
const TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n << 8;
  for (let k = 0; k < 8; k += 1) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  return c;
});
function crc16(texto) {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, 'utf8')) crc = ((crc << 8) & 0xffff) ^ TABELA[((crc >> 8) ^ byte) & 0xff];
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function lerTlv(texto) {
  const campos = [];
  let p = 0;
  while (p < texto.length) {
    const id = texto.slice(p, p + 2);
    const tamanho = Number(texto.slice(p + 2, p + 4));
    assert.ok(/^\d{2}$/.test(texto.slice(p + 2, p + 4)), `tamanho do campo ${id}`);
    campos.push([id, texto.slice(p + 4, p + 4 + tamanho)]);
    p += 4 + tamanho;
  }
  assert.equal(p, texto.length, 'TLV consome o texto inteiro');
  return campos;
}

function decodificarQr(texto) {
  const matriz = gerarMatrizQr(texto, qrcode);
  const escala = 4;
  const margem = 4;
  const lado = (matriz.length + margem * 2) * escala;
  const pixels = new Uint8ClampedArray(lado * lado * 4).fill(255);
  matriz.forEach((linha, y) => linha.forEach((escuro, x) => {
    if (!escuro) return;
    for (let dy = 0; dy < escala; dy += 1) for (let dx = 0; dx < escala; dx += 1) {
      const i = (((y + margem) * escala + dy) * lado + (x + margem) * escala + dx) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
    }
  }));
  return jsQR(pixels, lado, lado)?.data ?? null;
}

test('CRC independente confere o vetor padrão e o exemplo estático do manual', () => {
  assert.equal(crc16('123456789'), '29B1');
  const exemploDoManual = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  console.log(`CRC do exemplo estático sem valor (manual BCB): ${crc16(exemploDoManual)}`);
});

test('payload para os sete valores rápidos e extremos: campos EMV, valor, CRC e QR lido por jsQR', () => {
  for (const centavos of [100, 500, 1000, 2000, 3000, 5000, 10000, 1, 1234, 9_999_999]) {
    const payload = gerarPayloadPix({ chave: CHAVE, nome: 'Fulano de Tal', cidade: 'Brasília', centavos });
    const campos = new Map(lerTlv(payload));
    assert.equal(campos.get('00'), '01');
    assert.deepEqual(lerTlv(campos.get('26')), [['00', 'br.gov.bcb.pix'], ['01', CHAVE]]);
    assert.equal(campos.get('52'), '0000');
    assert.equal(campos.get('53'), '986');
    assert.equal(campos.get('54'), `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`);
    assert.equal(campos.get('58'), 'BR');
    assert.equal(campos.get('59'), 'Fulano de Tal');
    assert.equal(campos.get('60'), 'Brasilia');
    assert.deepEqual(lerTlv(campos.get('62')), [['05', '***']]);
    assert.equal(campos.get('63'), crc16(payload.slice(0, -4)));
    assert.equal(payload.indexOf('6304'), payload.length - 8);
    assert.equal(decodificarQr(payload), payload, `QR de ${centavos} centavos`);
  }
});

test('valor: rejeita zero, negativo, expoente, excesso de casas e acima do limite; nunca gera código parcial', () => {
  for (const texto of ['', '0', '0,00', '-1', '−1', '1e3', '10,001', '100000', '100.000,00', '1.2.3', 'abc', '１０', '10 reais']) {
    assert.equal(validarValorPix(texto).válido, false, texto);
  }
  assert.equal(validarValorPix('15,5').centavos, 1550);
  assert.equal(validarValorPix('R$ 1.250,00').centavos, 125000);
  assert.equal(validarValorPix('99.999,99').centavos, 9_999_999);
  for (const centavos of [0, -100, 10_000_000, 1.5, NaN, '1000']) {
    assert.throws(() => gerarPayloadPix({ chave: CHAVE, nome: 'Fulano de Tal', cidade: 'Brasília', centavos }));
  }
  assert.throws(() => gerarPayloadPix({ chave: '', nome: 'Fulano de Tal', cidade: 'Brasília', centavos: 100 }));
  assert.throws(() => gerarPayloadPix({ chave: CHAVE, nome: 'N'.repeat(26), cidade: 'Brasília', centavos: 100 }));
  assert.throws(() => gerarPayloadPix({ chave: CHAVE, nome: 'Fulano', cidade: '', centavos: 100 }));
});

test('chaves: formatos aceitos e recusados', () => {
  assert.equal(validarChavePix(CHAVE).tipo, 'aleatória');
  assert.equal(validarChavePix('123.456.789-09').chaveNormalizada, '12345678909');
  assert.equal(validarChavePix('111.111.111-11').válida, false);
  assert.equal(validarChavePix('+5561912345678').tipo, 'telefone');
  assert.equal(validarChavePix('61912345678').válida, false); // telefone sem +55 cai como CPF inválido
  assert.equal(validarChavePix('Fulano@Exemplo.com').chaveNormalizada, 'fulano@exemplo.com');
  assert.equal(validarChavePix('a'.repeat(78)).válida, false);
});

/**
 * Editor de fotos (F184): conferência da foto, EXIF, geometria e cores.
 *
 * Valores de referência conferidos fora do código:
 * - Os giros e os espelhos são conferidos pelos cantos: o canto superior esquerdo de uma foto girada 90° no sentido
 *   horário vai para o canto superior direito, e assim por diante.
 * - Contraste: fator (259·(c+255))/(255·(259−c)), com c em -255..255 (100% = 255). Em c = 0 o fator é 1.
 * - Sépia de um pixel branco: R = 1,351·255 (satura em 255), G = 1,203·255 (satura), B = 0,937·255 = 238,9, que arredonda a 239.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { png, jpeg } from './auxiliares/imagens-de-teste.mjs';
import {
  LIMITES, AJUSTES_PADRÃO, FORMATOS_DE_SAÍDA, ErroDeEdição, conferirFoto, lerOrientaçãoExif, dimensõesOrientadas, matrizDeOrientação,
  girarMargens, espelharMargens, margensDeProporção, margensDeRetângulo, normalizarAjustes, compor, aplicarMatriz, matrizDeDesenho,
  tabelaDeTons, coresNeutras, ajustarPixels, descreverAjustes, nomeDaSaída, aplicarOperação,
} from '../scripts/cálculos/editor-de-fotos.js';

const texto = (t) => [...t].map((c) => c.charCodeAt(0));
const normalizar = (entrada = {}, origem = { largura: 400, altura: 300 }) => normalizarAjustes(entrada, origem);
const recusa = (entrada, origem, padrão, campo) => assert.throws(
  () => normalizar(entrada, origem),
  (erro) => erro instanceof ErroDeEdição && padrão.test(erro.message) && (campo === undefined || erro.campo === campo),
);

/* ------------------------------------------------------------------ a foto */

test('aceita JPG e PNG pelo conteúdo e devolve as dimensões do cabeçalho', () => {
  const j = conferirFoto(jpeg(640, 480));
  assert.deepEqual([j.ok, j.tipo, j.largura, j.altura, j.orientação], [true, 'jpeg', 640, 480, 1]);
  const p = conferirFoto(png(20, 10));
  assert.deepEqual([p.ok, p.tipo, p.largura, p.altura], [true, 'png', 20, 10]);
});

test('a orientação EXIF 6 e 8 deita o quadro; 3 só vira de cabeça para baixo', () => {
  for (const [orientação, largura, altura] of [[1, 640, 480], [2, 640, 480], [3, 640, 480], [4, 640, 480], [5, 480, 640], [6, 480, 640], [7, 480, 640], [8, 480, 640]]) {
    const r = conferirFoto(jpeg(640, 480, { orientação }));
    assert.equal(r.orientação, orientação);
    assert.deepEqual([r.largura, r.altura], [largura, altura], `EXIF ${orientação}`);
  }
});

test('EXIF estragado, ausente ou com valor fora de 1..8 vira "sem giro", nunca erro', () => {
  assert.equal(lerOrientaçãoExif(jpeg(10, 10)), 1);
  assert.equal(lerOrientaçãoExif(jpeg(10, 10, { orientação: 9 })), 1);
  assert.equal(lerOrientaçãoExif(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x04, 0x45, 0x78])), 1);
  assert.equal(lerOrientaçãoExif(new Uint8Array(0)), 1);
  assert.equal(lerOrientaçãoExif(png(10, 10)), 1);
  // Posição do IFD apontando para fora do arquivo, e número de entradas absurdo: não podem fazer o leitor ler fora do segmento.
  const posição = Buffer.from(jpeg(10, 10, { orientação: 6 })).indexOf(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]));
  const foraDoArquivo = Buffer.from(jpeg(10, 10, { orientação: 6 }));
  foraDoArquivo.writeUInt32BE(0xFFFFFFF0, posição + 4);
  assert.equal(lerOrientaçãoExif(new Uint8Array(foraDoArquivo)), 1);
  const semEntradas = Buffer.from(jpeg(10, 10, { orientação: 6 }));
  semEntradas.writeUInt16BE(0xFFFF, posição + 8);
  semEntradas.writeUInt16BE(0x0000, posição + 10); // a primeira entrada deixa de ser a orientação
  assert.equal(lerOrientaçãoExif(new Uint8Array(semEntradas)), 1);
});

test('EXIF em ordem de bytes "II" (Intel) também é lido', () => {
  const tiff = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16BE(exif.length + 2);
  const arquivo = new Uint8Array(Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), tamanho, exif, Buffer.alloc(40)]));
  assert.equal(lerOrientaçãoExif(arquivo), 3);
});

test('dimensões orientadas trocam largura e altura de 5 a 8', () => {
  assert.deepEqual(dimensõesOrientadas(10, 20, 1), { largura: 10, altura: 20 });
  assert.deepEqual(dimensõesOrientadas(10, 20, 6), { largura: 20, altura: 10 });
  assert.deepEqual(dimensõesOrientadas(10, 20, 4), { largura: 10, altura: 20 });
});

test('a matriz de cada orientação EXIF leva os cantos da foto gravada ao quadro em pé', () => {
  // Foto gravada 4 × 3. Em EXIF 6 ela fica 3 × 4 e o canto superior esquerdo vai para o superior direito.
  const caso = (orientação, esperado) => {
    const m = matrizDeOrientação(orientação, 4, 3);
    const cantos = [[0, 0], [4, 0], [0, 3], [4, 3]].map(([x, y]) => aplicarMatriz(m, x, y));
    assert.deepEqual(cantos, esperado, `EXIF ${orientação}`);
  };
  caso(1, [[0, 0], [4, 0], [0, 3], [4, 3]]);
  caso(2, [[4, 0], [0, 0], [4, 3], [0, 3]]);
  caso(3, [[4, 3], [0, 3], [4, 0], [0, 0]]);
  caso(4, [[0, 3], [4, 3], [0, 0], [4, 0]]);
  caso(5, [[0, 0], [0, 4], [3, 0], [3, 4]]);
  caso(6, [[3, 0], [3, 4], [0, 0], [0, 4]]);
  caso(7, [[3, 4], [3, 0], [0, 4], [0, 0]]);
  caso(8, [[0, 4], [0, 0], [3, 4], [3, 0]]);
});

test('recusa arquivo vazio, grande demais e de tipo errado, olhando o conteúdo e não a extensão', () => {
  assert.equal(conferirFoto(new Uint8Array(0)).motivo, 'vazio');
  assert.equal(conferirFoto(null).motivo, 'vazio');
  const grande = new Uint8Array(LIMITES.bytes + 1);
  grande.set(png(2, 2));
  assert.equal(conferirFoto(grande).motivo, 'grande');

  const pdf = conferirFoto(new Uint8Array([...texto('%PDF-1.7\n'), 0x31, 0x20]));
  assert.equal(pdf.motivo, 'tipo');
  assert.match(pdf.mensagem, /PDF/);
  assert.match(conferirFoto(new Uint8Array([0x50, 0x4B, 3, 4, 0, 0, 0, 0])).mensagem, /ZIP/);
  assert.match(conferirFoto(new Uint8Array(texto('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).mensagem, /SVG/);
  assert.match(conferirFoto(new Uint8Array(texto('olá, isto é só texto'))).mensagem, /texto/);
  const heic = new Uint8Array([0, 0, 0, 24, ...texto('ftypheic'), 0, 0, 0, 0, ...texto('mif1heic')]);
  assert.match(conferirFoto(heic).mensagem, /HEIC.*JPG/s);
  assert.equal(conferirFoto(new Uint8Array([1, 2, 3, 0, 5, 6])).motivo, 'tipo');
});

test('foto truncada ou que declara dimensões absurdas é recusada antes de decodificar', () => {
  assert.equal(conferirFoto(png(10, 10).slice(0, 14)).motivo, 'corrompido');
  assert.equal(conferirFoto(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 4, 0, 0])).motivo, 'corrompido');
  // PNG de poucos bytes que declara 30.000 × 30.000 (900 megapixels): bomba de descompressão.
  const bomba = conferirFoto(png(30_000, 30_000, { linhas: 1 }));
  assert.equal(bomba.ok, false);
  assert.equal(bomba.motivo, 'megapixels');
  assert.match(bomba.mensagem, /900 megapixels/);
  assert.match(bomba.mensagem, /limite é 50/);
});

test('o limite de megapixels vale no limite (aceita) e um acima (recusa)', () => {
  // 10.000 × 5.000 = 50 MP exatos; 10.000 × 5.001 passa.
  assert.equal(conferirFoto(png(10_000, 5_000, { linhas: 1 })).ok, true);
  assert.equal(conferirFoto(png(10_000, 5_001, { linhas: 1 })).motivo, 'megapixels');
});

/* ------------------------------------------------------------------ margens */

test('girar as margens as leva junto com a imagem e girar de volta devolve o original', () => {
  const m = { esquerda: 10, topo: 20, direita: 30, base: 40 };
  assert.deepEqual(girarMargens(m, 1), { esquerda: 40, topo: 10, direita: 20, base: 30 });
  assert.deepEqual(girarMargens(m, -1), { esquerda: 20, topo: 30, direita: 40, base: 10 });
  assert.deepEqual(girarMargens(girarMargens(m, 1), -1), m);
  let quatro = m;
  for (let i = 0; i < 4; i += 1) quatro = girarMargens(quatro, 1);
  assert.deepEqual(quatro, m);
});

test('espelhar as margens troca os lados certos e duas vezes volta ao início', () => {
  const m = { esquerda: 10, topo: 20, direita: 30, base: 40 };
  assert.deepEqual(espelharMargens(m, 'h'), { esquerda: 30, topo: 20, direita: 10, base: 40 });
  assert.deepEqual(espelharMargens(m, 'v'), { esquerda: 10, topo: 40, direita: 30, base: 20 });
  assert.deepEqual(espelharMargens(espelharMargens(m, 'h'), 'h'), m);
});

test('a proporção pronta corta o maior retângulo centralizado', () => {
  // 4000 × 3000 em 1:1 → 3000 × 3000: sobra 500 de cada lado (12,5%) e nada em cima e embaixo.
  assert.deepEqual(margensDeProporção({ largura: 4000, altura: 3000 }, [1, 1]), { esquerda: 12.5, topo: 0, direita: 12.5, base: 0 });
  // 4000 × 3000 em 16:9 → 4000 × 2250: sobram 750 na altura, 375 de cada lado (12,5%).
  assert.deepEqual(margensDeProporção({ largura: 4000, altura: 3000 }, [16, 9]), { esquerda: 0, topo: 12.5, direita: 0, base: 12.5 });
  // Já na proporção: não corta nada.
  assert.deepEqual(margensDeProporção({ largura: 1600, altura: 900 }, [16, 9]), { esquerda: 0, topo: 0, direita: 0, base: 0 });
  // E o resultado vira pixels da proporção pedida.
  const a = normalizar({ recorte: margensDeProporção({ largura: 4000, altura: 3000 }, [1, 1]) }, { largura: 4000, altura: 3000 });
  assert.deepEqual([a.corte.largura, a.corte.altura], [3000, 3000]);
});

test('o retângulo escolhido na imagem vira margens, com os cantos em qualquer ordem e limitado ao quadro', () => {
  const quadro = { largura: 1000, altura: 500 };
  assert.deepEqual(margensDeRetângulo(quadro, { x0: 100, y0: 50, x1: 900, y1: 450 }), { esquerda: 10, topo: 10, direita: 10, base: 10 });
  assert.deepEqual(margensDeRetângulo(quadro, { x0: 900, y0: 450, x1: 100, y1: 50 }), { esquerda: 10, topo: 10, direita: 10, base: 10 });
  assert.deepEqual(margensDeRetângulo(quadro, { x0: -50, y0: -50, x1: 5000, y1: 5000 }), { esquerda: 0, topo: 0, direita: 0, base: 0 });
});

/* ------------------------------------------------------------------ ajustes validados */

test('os ajustes padrão não mudam nada: saída com o tamanho da foto e matriz identidade', () => {
  const a = normalizar();
  assert.deepEqual(a.corte, { x: 0, y: 0, largura: 400, altura: 300 });
  assert.deepEqual(a.saída, { largura: 400, altura: 300 });
  assert.deepEqual(a.matriz, [1, 0, 0, 1, 0, 0]);
  assert.equal(coresNeutras(a), true);
  assert.deepEqual(descreverAjustes(a), []);
});

test('o giro troca o quadro e a matriz leva cada canto da foto ao canto certo', () => {
  const cantos = (a) => [[0, 0], [400, 0], [0, 300], [400, 300]].map(([x, y]) => aplicarMatriz(a.matriz, x, y));
  const noventa = normalizar({ giro: 90 });
  assert.deepEqual(noventa.trabalho, { largura: 300, altura: 400 });
  assert.deepEqual(cantos(noventa), [[300, 0], [300, 400], [0, 0], [0, 400]]);
  const cento = normalizar({ giro: 180 });
  assert.deepEqual(cantos(cento), [[400, 300], [0, 300], [400, 0], [0, 0]]);
  const duzentos = normalizar({ giro: 270 });
  assert.deepEqual(duzentos.trabalho, { largura: 300, altura: 400 });
  assert.deepEqual(cantos(duzentos), [[0, 400], [0, 0], [300, 400], [300, 0]]);
});

test('espelhar vale para o que se vê depois do giro', () => {
  const cantos = (a) => [[0, 0], [400, 0], [0, 300], [400, 300]].map(([x, y]) => aplicarMatriz(a.matriz, x, y));
  // Sem giro: espelhar na horizontal troca esquerda e direita.
  assert.deepEqual(cantos(normalizar({ espelharH: true })), [[400, 0], [0, 0], [400, 300], [0, 300]]);
  assert.deepEqual(cantos(normalizar({ espelharV: true })), [[0, 300], [400, 300], [0, 0], [400, 0]]);
  // Girada 90°, o canto superior esquerdo da foto está no superior direito do quadro (300, 0);
  // espelhar na horizontal o leva para o superior esquerdo (0, 0).
  assert.deepEqual(cantos(normalizar({ giro: 90, espelharH: true })), [[0, 0], [0, 400], [300, 0], [300, 400]]);
  // Os dois espelhos juntos equivalem a girar 180°.
  assert.deepEqual(normalizar({ espelharH: true, espelharV: true }).matriz, normalizar({ giro: 180 }).matriz);
});

test('o corte em margens e os modos de tamanho dão os pixels certos', () => {
  const origem = { largura: 1000, altura: 500 };
  const corte = { esquerda: 10, topo: 20, direita: 10, base: 20 };
  const a = normalizar({ recorte: corte }, origem);
  assert.deepEqual(a.corte, { x: 100, y: 100, largura: 800, altura: 300 });
  assert.deepEqual(a.saída, { largura: 800, altura: 300 });
  const tam = (tamanho) => normalizar({ recorte: corte, tamanho }, origem).saída;
  assert.deepEqual(tam({ modo: 'largura', largura: 400 }), { largura: 400, altura: 150 });
  assert.deepEqual(tam({ modo: 'altura', altura: 600 }), { largura: 1600, altura: 600 });
  assert.deepEqual(tam({ modo: 'exato', largura: 640, altura: 480 }), { largura: 640, altura: 480 });
  assert.deepEqual(tam({ modo: 'porcentagem', porcentagem: 50 }), { largura: 400, altura: 150 });
  assert.deepEqual(tam({ modo: 'porcentagem', porcentagem: 33.3 }), { largura: 266, altura: 100 });
});

test('a matriz de desenho leva o corte inteiro à saída inteira', () => {
  const origem = { largura: 1000, altura: 500 };
  const a = normalizar({ giro: 90, recorte: { esquerda: 10, topo: 20, direita: 30, base: 5 }, tamanho: { modo: 'largura', largura: 200 } }, origem);
  // O quadro girado é 500 × 1000. O corte começa em (50, 200) e termina em (350, 950).
  assert.deepEqual(a.corte, { x: 50, y: 200, largura: 300, altura: 750 });
  assert.deepEqual(a.saída, { largura: 200, altura: 500 });
  // Canto superior esquerdo do corte, no quadro girado, é o (50, 200); a foto girada 90° o tem em (x', y') = (altura - y, x).
  // O ponto da foto que cai nele: x' = 500 - y = 50 → y = 450; y' = x = 200.
  const [x, y] = aplicarMatriz(a.matriz, 200, 450);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9, `era (${x}, ${y})`);
  // E o canto inferior direito do corte (350, 950) vai para o canto da saída (200, 500).
  const [x2, y2] = aplicarMatriz(a.matriz, 950, 150);
  assert.ok(Math.abs(x2 - 200) < 1e-9 && Math.abs(y2 - 500) < 1e-9, `era (${x2}, ${y2})`);
});

test('compor aplica a segunda matriz primeiro', () => {
  const dobrar = [2, 0, 0, 2, 0, 0];
  const mover = [1, 0, 0, 1, 5, 7];
  assert.deepEqual(aplicarMatriz(compor(mover, dobrar), 1, 1), [7, 9]);
  assert.deepEqual(aplicarMatriz(compor(dobrar, mover), 1, 1), [12, 16]);
  assert.deepEqual(matrizDeDesenho(10, 10, normalizar({}, { largura: 10, altura: 10 })), [1, 0, 0, 1, 0, 0]);
});

test('recusa valores absurdos com a mensagem no campo certo', () => {
  recusa({ brilho: 101 }, undefined, /brilho precisa estar entre -100 e 100/i, 'brilho');
  recusa({ brilho: -101 }, undefined, /brilho/i, 'brilho');
  recusa({ contraste: NaN }, undefined, /contraste precisa ser um número/i, 'contraste');
  recusa({ saturação: Infinity }, undefined, /saturação precisa ser um número/i, 'saturação');
  recusa({ temperatura: '10' }, undefined, /temperatura precisa ser um número/i, 'temperatura');
  recusa({ qualidade: 5 }, undefined, /qualidade precisa estar entre 10 e 100/i, 'qualidade');
  recusa({ giro: 45 }, undefined, /giro/i, 'giro');
  recusa({ filtro: 'lixo' }, undefined, /filtros/i, 'filtro');
  recusa({ formato: 'gif' }, undefined, /JPG, PNG ou WebP/i, 'formato');
  recusa({ tamanho: { modo: 'diagonal' } }, undefined, /redimensionar/i, 'redimensionar');
  recusa({ recorte: { esquerda: 96 } }, undefined, /margem da esquerda precisa estar entre 0% e 95%/i, 'margemEsquerda');
  recusa({ recorte: { topo: -1 } }, undefined, /margem de cima/i, 'margemTopo');
  recusa({ recorte: { direita: 'x' } }, undefined, /margem da direita precisa ser um número/i, 'margemDireita');
  recusa({ recorte: { esquerda: 60, direita: 60 } }, undefined, /não sobra imagem/i, 'margemEsquerda');
  recusa({ recorte: { topo: 50, base: 50 } }, undefined, /não sobra imagem/i, 'margemTopo');
  assert.throws(() => normalizarAjustes(null, { largura: 1, altura: 1 }), ErroDeEdição);
  assert.throws(() => normalizarAjustes({}, null), /Escolha uma foto/);
  assert.throws(() => normalizarAjustes({}, { largura: 0, altura: 10 }), /Escolha uma foto/);
});

test('recusa tamanho final inválido: zero, decimal, enorme, texto, e megapixels demais', () => {
  const t = (tamanho) => ({ tamanho });
  recusa(t({ modo: 'largura', largura: 0 }), undefined, /pelo menos 1 pixel/, 'larguraPx');
  recusa(t({ modo: 'largura', largura: -5 }), undefined, /pelo menos 1 pixel/, 'larguraPx');
  recusa(t({ modo: 'largura', largura: 10.5 }), undefined, /número inteiro/, 'larguraPx');
  recusa(t({ modo: 'largura', largura: null }), undefined, /largura precisa ser um número/, 'larguraPx');
  recusa(t({ modo: 'altura', altura: NaN }), undefined, /altura precisa ser um número/, 'alturaPx');
  recusa(t({ modo: 'largura', largura: 16_385 }), undefined, /limite de 16\.385|limite de 16\.384/, 'larguraPx');
  recusa(t({ modo: 'exato', largura: 10_000, altura: 10_000 }), undefined, /100 megapixels/, 'larguraPx');
  recusa(t({ modo: 'porcentagem', porcentagem: 0 }), undefined, /porcentagem precisa estar entre 1% e 400%/, 'porcentagem');
  recusa(t({ modo: 'porcentagem', porcentagem: 401 }), undefined, /porcentagem/, 'porcentagem');
  recusa(t({ modo: 'porcentagem', porcentagem: 400 }), { largura: 10_000, altura: 4_000 }, /limite de 50 megapixels|maior que 16\.384/, 'porcentagem');
  // A altura calculada pela proporção também tem limite: faixa de 16.384 × 1 pedindo largura de 16.384 não pode virar 16.384 × 16.384.
  recusa(t({ modo: 'altura', altura: 16_384 }), { largura: 2, altura: 1 }, /maior que 16\.384/, 'alturaPx');
});

test('o tamanho final no limite passa e um acima não', () => {
  // 50 megapixels = 10.000 × 5.000.
  const ok = normalizar({ tamanho: { modo: 'exato', largura: 10_000, altura: 5_000 } });
  assert.deepEqual(ok.saída, { largura: 10_000, altura: 5_000 });
  recusa({ tamanho: { modo: 'exato', largura: 10_000, altura: 5_001 } }, undefined, /passa do limite de 50 megapixels/, 'larguraPx');
});

test('a proporção nunca gera lado zero, mesmo numa faixa de 1 pixel', () => {
  const a = normalizar({ tamanho: { modo: 'largura', largura: 1 } }, { largura: 10_000, altura: 3 });
  assert.deepEqual(a.saída, { largura: 1, altura: 1 });
  const b = normalizar({ tamanho: { modo: 'porcentagem', porcentagem: 1 } }, { largura: 10, altura: 10 });
  assert.deepEqual(b.saída, { largura: 1, altura: 1 });
});

test('o corte máximo de 95% ainda deixa pelo menos 1 pixel, e margens simétricas dão corte simétrico', () => {
  const a = normalizar({ recorte: { esquerda: 95, direita: 0 } }, { largura: 100, altura: 100 });
  assert.deepEqual([a.corte.x, a.corte.largura], [95, 5]);
  // Numa foto de 10 pixels, 95% de margem não deixaria nada: a mensagem diz isso.
  recusa({ recorte: { esquerda: 95 } }, { largura: 10, altura: 10 }, /não sobra imagem/, 'margemEsquerda');
  const b = normalizar({ recorte: { esquerda: 12.5, direita: 12.5 } }, { largura: 4001, altura: 3000 });
  assert.equal(b.corte.x, 4001 - (b.corte.x + b.corte.largura));
});

/* ------------------------------------------------------------------ girar e espelhar o que se vê */

const INÍCIO = { giro: 0, espelharH: false, espelharV: false };
const mapaDeCantos = (estado, largura = 400, altura = 300) => {
  const a = normalizarAjustes(estado, { largura, altura });
  return { quadro: a.trabalho, cantos: [[0, 0], [largura, 0], [0, altura], [largura, altura]].map(([x, y]) => aplicarMatriz(a.matriz, x, y)) };
};

test('uma operação sobre o que se vê equivale a aplicar a operação aos cantos já na tela', () => {
  // Para cada estado possível (giro, espelhos), cada operação deve produzir o mesmo resultado que operar na imagem visível.
  const operaçãoNaTela = {
    'girar-horário': ([x, y], quadro) => [quadro.altura - y, x],
    'girar-anti': ([x, y], quadro) => [y, quadro.largura - x],
    'espelhar-h': ([x, y], quadro) => [quadro.largura - x, y],
    'espelhar-v': ([x, y], quadro) => [x, quadro.altura - y],
  };
  for (const giro of [0, 90, 180, 270]) {
    for (const espelharH of [false, true]) {
      for (const espelharV of [false, true]) {
        const antes = { giro, espelharH, espelharV };
        const { quadro, cantos } = mapaDeCantos(antes);
        for (const [operação, aplicar] of Object.entries(operaçãoNaTela)) {
          const esperado = cantos.map((c) => aplicar(c, quadro));
          const depois = aplicarOperação(antes, operação);
          assert.equal(depois.espelharV, false, 'a forma canônica não usa espelho vertical');
          assert.deepEqual(mapaDeCantos(depois).cantos, esperado, `${JSON.stringify(antes)} + ${operação}`);
        }
      }
    }
  }
});

test('propriedades: quatro giros voltam ao início, dois espelhos voltam ao início, giro e anti-giro se desfazem', () => {
  let e = INÍCIO;
  for (let i = 0; i < 4; i += 1) e = aplicarOperação(e, 'girar-horário');
  assert.deepEqual(e, INÍCIO);
  assert.deepEqual(aplicarOperação(aplicarOperação(INÍCIO, 'espelhar-h'), 'espelhar-h'), INÍCIO);
  assert.deepEqual(aplicarOperação(aplicarOperação(INÍCIO, 'espelhar-v'), 'espelhar-v'), INÍCIO);
  assert.deepEqual(aplicarOperação(aplicarOperação({ giro: 90, espelharH: true, espelharV: false }, 'girar-horário'), 'girar-anti'), { giro: 90, espelharH: true, espelharV: false });
  // Espelhar nos dois eixos é girar 180°.
  assert.deepEqual(aplicarOperação(aplicarOperação(INÍCIO, 'espelhar-h'), 'espelhar-v'), { giro: 180, espelharH: false, espelharV: false });
});

test('girar uma imagem espelhada gira o que se vê (o espelho inverte o sentido do giro guardado)', () => {
  // Espelhada na horizontal e girada 90° no sentido horário na tela = giro de 270° (anti-horário) com o espelho.
  const espelhada = aplicarOperação(INÍCIO, 'espelhar-h');
  assert.deepEqual(aplicarOperação(espelhada, 'girar-horário'), { giro: 270, espelharH: true, espelharV: false });
});

test('operação desconhecida é recusada', () => {
  assert.throws(() => aplicarOperação(INÍCIO, 'virar'), ErroDeEdição);
});

/* ------------------------------------------------------------------ cores */

const pixel = (r, g, b, a = 255) => new Uint8ClampedArray([r, g, b, a]);
const ajustado = (p, mudanças) => [...ajustarPixels(p, { brilho: 0, contraste: 0, saturação: 0, temperatura: 0, filtro: 'nenhum', ...mudanças })];

test('sem ajuste, os pixels ficam idênticos; a tabela de tons é a identidade', () => {
  assert.deepEqual(ajustado(pixel(10, 200, 77, 123), {}), [10, 200, 77, 123]);
  const t = tabelaDeTons(0, 0);
  for (let v = 0; v < 256; v += 1) assert.equal(t[v], v);
});

test('brilho soma um deslocamento (±100 leva ao branco e ao preto) e o alfa nunca muda', () => {
  assert.deepEqual(ajustado(pixel(10, 20, 30, 77), { brilho: 100 }), [255, 255, 255, 77]);
  assert.deepEqual(ajustado(pixel(200, 220, 240, 5), { brilho: -100 }), [0, 0, 0, 5]);
  // +10 de brilho = +25,5 em cada canal: 100 vira 125,5 → 126 (e o contraste é neutro).
  assert.deepEqual(ajustado(pixel(100, 100, 100), { brilho: 10 }), [126, 126, 126, 255]);
});

test('contraste: -100 achata tudo em cinza médio; +50 afasta do cinza médio', () => {
  assert.deepEqual(ajustado(pixel(0, 128, 255), { contraste: -100 }), [128, 128, 128, 255]);
  // c = 50% → c' = 127,5, fator = 259·382,5/(255·131,5) = 2,9546…; 160 → 2,9546·32 + 128 = 222,5 → 223.
  const fator = (259 * (127.5 + 255)) / (255 * (259 - 127.5));
  assert.equal(ajustado(pixel(160, 160, 160), { contraste: 50 })[0], Math.round(fator * 32 + 128));
  assert.equal(Math.round(fator * 32 + 128), 223);
  // Valores abaixo do cinza médio escurecem.
  assert.ok(ajustado(pixel(100, 100, 100), { contraste: 50 })[0] < 100);
});

test('saturação -100 e o filtro preto e branco deixam os três canais iguais; +100 não passa de 255', () => {
  const [r, g, b] = ajustado(pixel(200, 50, 100), { saturação: -100 });
  assert.ok(r === g && g === b, `era ${r},${g},${b}`);
  // luma = 0,299·200 + 0,587·50 + 0,114·100 = 59,8 + 29,35 + 11,4 = 100,55 → 101.
  assert.equal(r, 101);
  const pb = ajustado(pixel(200, 50, 100), { filtro: 'pb' });
  assert.deepEqual(pb.slice(0, 3), [101, 101, 101]);
  const forte = ajustado(pixel(250, 10, 10), { saturação: 100 });
  assert.ok(forte.every((v) => v >= 0 && v <= 255));
  // Cinza puro não tem cor para saturar.
  assert.deepEqual(ajustado(pixel(90, 90, 90), { saturação: 100 }).slice(0, 3), [90, 90, 90]);
});

test('sépia de um pixel branco dá (255, 255, 239) e de um preto continua preto', () => {
  assert.deepEqual(ajustado(pixel(255, 255, 255), { filtro: 'sépia' }), [255, 255, 239, 255]);
  assert.deepEqual(ajustado(pixel(0, 0, 0), { filtro: 'sépia' }), [0, 0, 0, 255]);
});

test('temperatura esquenta (mais vermelho, menos azul) ou esfria', () => {
  // +50 → deslocamento de 20.
  assert.deepEqual(ajustado(pixel(100, 100, 100), { temperatura: 50 }).slice(0, 3), [120, 100, 80]);
  assert.deepEqual(ajustado(pixel(100, 100, 100), { temperatura: -50 }).slice(0, 3), [80, 100, 120]);
  assert.deepEqual(ajustado(pixel(250, 100, 5), { temperatura: 100 }).slice(0, 3), [255, 100, 0]);
});

test('propriedade: mais brilho nunca escurece e o resultado fica sempre em 0..255, com entrada aleatória', () => {
  let semente = 12345;
  const sorteio = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 32; };
  const base = new Uint8ClampedArray(4 * 500);
  for (let i = 0; i < base.length; i += 1) base[i] = Math.floor(sorteio() * 256);
  const com = (brilho) => ajustarPixels(new Uint8ClampedArray(base), { brilho, contraste: 0, saturação: 0, temperatura: 0, filtro: 'nenhum' });
  const menos = com(-30);
  const mais = com(30);
  for (let i = 0; i < base.length; i += 4) {
    for (let c = 0; c < 3; c += 1) assert.ok(mais[i + c] >= menos[i + c]);
    assert.equal(mais[i + 3], base[i + 3]);
  }
  // Com Uint8Array comum (sem o clamp automático), os valores também ficam dentro da faixa.
  const comum = ajustarPixels(Uint8Array.from(base), { brilho: 100, contraste: 100, saturação: 100, temperatura: 100, filtro: 'sépia' });
  assert.ok(comum.every((v) => v >= 0 && v <= 255 && Number.isInteger(v)));
});

test('propriedade: processar em faixas dá o mesmo resultado que processar tudo de uma vez', () => {
  const imagem = new Uint8ClampedArray(4 * 64);
  for (let i = 0; i < imagem.length; i += 1) imagem[i] = (i * 37) % 256;
  const ajustes = { brilho: 15, contraste: -20, saturação: 40, temperatura: 10, filtro: 'nenhum' };
  const inteira = ajustarPixels(new Uint8ClampedArray(imagem), ajustes);
  const emFaixas = new Uint8ClampedArray(imagem);
  for (let início = 0; início < emFaixas.length; início += 4 * 10) ajustarPixels(emFaixas.subarray(início, início + 4 * 10), ajustes);
  assert.deepEqual([...emFaixas], [...inteira]);
});

test('pixels sem alfa completo (dado truncado) não derrubam o cálculo', () => {
  assert.doesNotThrow(() => ajustarPixels(new Uint8ClampedArray(7), { brilho: 10, contraste: 0, saturação: 0, temperatura: 0, filtro: 'nenhum' }));
  assert.doesNotThrow(() => ajustarPixels(new Uint8ClampedArray(0), { brilho: 10, contraste: 0, saturação: 0, temperatura: 0, filtro: 'nenhum' }));
});

/* ------------------------------------------------------------------ texto da tela */

test('descreve só o que foi feito, na ordem das operações', () => {
  const a = normalizar({ giro: 90, espelharH: true, recorte: { esquerda: 10, direita: 10 }, brilho: 20, contraste: -5, filtro: 'sépia', tamanho: { modo: 'largura', largura: 200 } });
  assert.deepEqual(descreverAjustes(a), [
    'girada 90° no sentido horário', 'espelhada na horizontal', 'cortada para 240 × 400 px', 'redimensionada para 200 × 333 px',
    'brilho +20', 'contraste -5', 'filtro sépia',
  ]);
});

test('o nome de saída tira a extensão, limpa o nome e usa a extensão do formato', () => {
  assert.equal(nomeDaSaída('Férias na Praia.JPG', 'png'), 'ferias-na-praia-editada.png');
  assert.equal(nomeDaSaída('IMG_0001.heic.jpg', 'webp'), 'img-0001-heic-editada.webp');
  assert.equal(nomeDaSaída('', 'jpg'), 'foto-editada.jpg');
  // Nome com caminho nunca vira caminho: só letras, números e hífen.
  assert.match(nomeDaSaída('../../etc/passwd', 'jpg'), /^[a-z0-9-]+-editada\.jpg$/);
  assert.equal(nomeDaSaída(undefined, 'jpg'), 'foto-editada.jpg');
  for (const f of Object.keys(FORMATOS_DE_SAÍDA)) assert.match(nomeDaSaída('a.png', f), new RegExp(`\\.${FORMATOS_DE_SAÍDA[f].extensão}$`));
});

test('os padrões do módulo passam na própria validação', () => {
  assert.doesNotThrow(() => normalizar(AJUSTES_PADRÃO));
});

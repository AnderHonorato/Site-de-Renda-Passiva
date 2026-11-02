/**
 * Criar GIF (F185): paleta, codificador LZW, arquivo GIF89a e planejamento.
 *
 * O codificador é conferido por um DECODIFICADOR escrito aqui, do zero, a partir da especificação do GIF89a (tabela de
 * prefixo e sufixo, código de limpeza, código de fim, tamanho de código variável): se o codificador e o decodificador
 * concordam em dados aleatórios, em corridas longas e na tabela cheia, o formato está certo. O teste de navegador
 * confere ainda com o decodificador do próprio Chromium.
 *
 * Valores de referência conferidos fora do código:
 * - O exemplo clássico de LZW de GIF, a imagem 10 × 10 de 4 cores da explicação "What's in a GIF - Bit-Mapped Data"
 *   (Bournemouth, e a especificação GIF89a): comprime-se em exatamente os bytes 8C 2D 99 87 2A 1C DC 33 A0 02 75 EC 95 FA
 *   A8 DE 60 8C 04 91 4C 01.
 * - Tempo do quadro: 500 ms = 50 centésimos; 20 ms = 2; 5 ms (abaixo do mínimo) é recusado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { png } from './auxiliares/imagens-de-teste.mjs';
import {
  LIMITES, ErroDeGif, conferirImagemDoGif, retânguloDeDesenho, atrasoEmCentésimos, sequênciaDosQuadros, planejarGif, tamanhoDaPaleta,
  quantizar, comprimirLzw, escreverGif, gerarGif, nomeDoGif,
} from '../scripts/cálculos/criar-gif.js';

const recusa = (executar, padrão, campo) => assert.throws(executar, (e) => e instanceof ErroDeGif && padrão.test(e.message) && (campo === undefined || e.campo === campo));

/* ------------------------------------------------------------------ decodificador independente */

/** Decodifica os dados LZW de um GIF (já sem os sub-blocos) para índices. */
function descomprimirLzw(bytes, profundidade, esperados) {
  const limpeza = 1 << profundidade;
  const fim = limpeza + 1;
  let bits = profundidade + 1;
  let próximo = fim + 1;
  const prefixo = new Int32Array(4096);
  const sufixo = new Uint8Array(4096);
  const comprimento = new Int32Array(4096);
  for (let i = 0; i < limpeza; i += 1) { sufixo[i] = i; comprimento[i] = 1; prefixo[i] = -1; }
  const saída = [];
  const texto = (código) => {
    const lista = [];
    for (let c = código; c >= 0; c = prefixo[c]) lista.push(sufixo[c]);
    return lista.reverse();
  };
  let posição = 0;
  const ler = () => {
    let valor = 0;
    for (let b = 0; b < bits; b += 1) {
      const byte = bytes[(posição + b) >> 3];
      if (byte === undefined) return -2;
      valor |= ((byte >> ((posição + b) & 7)) & 1) << b;
    }
    posição += bits;
    return valor;
  };
  let anterior = -1;
  for (;;) {
    const código = ler();
    if (código === -2) throw new Error('acabaram os bits antes do código de fim');
    if (código === limpeza) { bits = profundidade + 1; próximo = fim + 1; anterior = -1; continue; }
    if (código === fim) break;
    let entrada;
    if (anterior === -1) {
      entrada = [código];
    } else if (código < próximo) {
      entrada = texto(código);
      if (próximo < 4096) { prefixo[próximo] = anterior; sufixo[próximo] = entrada[0]; próximo += 1; }
    } else if (código === próximo) {
      const antes = texto(anterior);
      entrada = [...antes, antes[0]];
      if (próximo < 4096) { prefixo[próximo] = anterior; sufixo[próximo] = antes[0]; próximo += 1; }
    } else throw new Error(`código ${código} fora da tabela (${próximo})`);
    saída.push(...entrada);
    anterior = código;
    if (próximo === (1 << bits) && bits < 12) bits += 1;
    if (saída.length > esperados + 4096) throw new Error('mais dados que o esperado');
  }
  return Uint8Array.from(saída);
}

/** Lê um GIF89a bloco a bloco e devolve o que ele diz. */
function lerGif(bytes) {
  const texto = (a, b) => String.fromCharCode(...bytes.subarray(a, b));
  assert.equal(texto(0, 6), 'GIF89a');
  const u16 = (o) => bytes[o] | (bytes[o + 1] << 8);
  const largura = u16(6);
  const altura = u16(8);
  const empacotado = bytes[10];
  assert.ok(empacotado & 0x80, 'tabela global de cores');
  const tamanhoDaTabela = 2 ** ((empacotado & 7) + 1);
  let p = 13;
  const paleta = bytes.subarray(p, p + tamanhoDaTabela * 3);
  p += tamanhoDaTabela * 3;
  const gif = { largura, altura, tamanhoDaTabela, paleta, quadros: [], repetições: null };
  let controle = null;
  while (bytes[p] !== 0x3B) {
    assert.ok(p < bytes.length, 'o arquivo acabou sem o byte de fim (0x3B)');
    if (bytes[p] === 0x21) {
      const rótulo = bytes[p + 1];
      if (rótulo === 0xF9) {
        assert.equal(bytes[p + 2], 4);
        controle = { empacotado: bytes[p + 3], atraso: u16(p + 4), transparente: bytes[p + 6] };
        assert.equal(bytes[p + 7], 0);
        p += 8;
      } else {
        const nome = rótulo === 0xFF ? texto(p + 3, p + 14) : '';
        p += 2;
        while (bytes[p] !== 0) {
          if (nome === 'NETSCAPE2.0' && bytes[p] === 3 && bytes[p + 1] === 1) gif.repetições = u16(p + 2);
          p += bytes[p] + 1;
        }
        p += 1;
      }
    } else if (bytes[p] === 0x2C) {
      const quadro = { x: u16(p + 1), y: u16(p + 3), largura: u16(p + 5), altura: u16(p + 7), controle };
      assert.equal(bytes[p + 9], 0, 'sem tabela local nem entrelaçamento');
      p += 10;
      quadro.profundidade = bytes[p];
      p += 1;
      const pedaços = [];
      while (bytes[p] !== 0) { assert.ok(bytes[p] <= 255); pedaços.push(bytes.subarray(p + 1, p + 1 + bytes[p])); p += bytes[p] + 1; }
      p += 1;
      const dados = new Uint8Array(pedaços.reduce((s, c) => s + c.length, 0));
      let o = 0;
      for (const c of pedaços) { dados.set(c, o); o += c.length; }
      quadro.indices = descomprimirLzw(dados, quadro.profundidade, quadro.largura * quadro.altura);
      gif.quadros.push(quadro);
      controle = null;
    } else assert.fail(`bloco desconhecido 0x${bytes[p].toString(16)} em ${p}`);
  }
  assert.equal(p, bytes.length - 1, 'nada depois do byte de fim');
  return gif;
}

const sortear = (semente) => () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 32; };

/* ------------------------------------------------------------------ LZW */

test('o exemplo clássico da especificação (imagem 10 × 10, paleta de 4 cores) se comprime nos bytes publicados', () => {
  const linhas = ['1111122222', '1111122222', '1111122222', '1110000222', '1110000222', '2220000111', '2220000111', '2222211111', '2222211111', '2222211111'];
  const índices = Uint8Array.from(linhas.join('').split('').map(Number));
  const esperado = [0x8C, 0x2D, 0x99, 0x87, 0x2A, 0x1C, 0xDC, 0x33, 0xA0, 0x02, 0x75, 0xEC, 0x95, 0xFA, 0xA8, 0xDE, 0x60, 0x8C, 0x04, 0x91, 0x4C, 0x01];
  assert.deepEqual([...comprimirLzw(índices, 2)], esperado);
});

test('ida e volta com o decodificador independente: dados aleatórios em paletas de 2, 4, 16 e 256 cores', () => {
  for (const profundidade of [2, 3, 4, 5, 6, 7, 8]) {
    const sorteio = sortear(profundidade * 17);
    for (const quantidade of [1, 2, 3, 100, 5000, 70_000]) {
      const índices = Uint8Array.from({ length: quantidade }, () => Math.floor(sorteio() * (1 << profundidade)));
      const comprimido = comprimirLzw(índices, profundidade);
      assert.deepEqual([...descomprimirLzw(comprimido, profundidade, quantidade)], [...índices], `profundidade ${profundidade}, ${quantidade} pixels`);
    }
  }
});

test('ida e volta: corridas longas, imagem lisa, padrões repetidos e a tabela cheia (código de limpeza)', () => {
  const casos = {
    lisa: new Uint8Array(200_000).fill(3),
    listras: Uint8Array.from({ length: 120_000 }, (_, i) => (i >> 3) & 1),
    degradê: Uint8Array.from({ length: 90_000 }, (_, i) => (i * 7 + (i >> 5)) & 255),
    xadrez: Uint8Array.from({ length: 60_000 }, (_, i) => ((i % 300) ^ Math.floor(i / 300)) & 1),
  };
  for (const [nome, índices] of Object.entries(casos)) {
    const profundidade = nome === 'degradê' ? 8 : 2;
    const comprimido = comprimirLzw(índices, profundidade);
    assert.deepEqual([...descomprimirLzw(comprimido, profundidade, índices.length)], [...índices], nome);
  }
  // Imagem lisa comprime muito; dado aleatório quase não comprime.
  assert.ok(comprimirLzw(casos.lisa, 2).length < casos.lisa.length / 50);
});

test('o código de limpeza aparece quando a tabela enche (dado aleatório de 8 bits)', () => {
  const sorteio = sortear(7);
  const índices = Uint8Array.from({ length: 40_000 }, () => Math.floor(sorteio() * 256));
  const comprimido = comprimirLzw(índices, 8);
  // Descomprimir com sucesso uma sequência que enche a tabela de 4096 entradas várias vezes só é possível com os limpar certos.
  assert.deepEqual([...descomprimirLzw(comprimido, 8, índices.length)], [...índices]);
});

test('entrada vazia gera só limpeza e fim', () => {
  const r = comprimirLzw(new Uint8Array(0), 2);
  assert.deepEqual([...descomprimirLzw(r, 2, 0)], []);
});

/* ------------------------------------------------------------------ arquivo GIF */

const quadroSólido = (largura, altura, r, g, b, a = 255) => {
  const q = new Uint8ClampedArray(largura * altura * 4);
  for (let i = 0; i < q.length; i += 4) { q[i] = r; q[i + 1] = g; q[i + 2] = b; q[i + 3] = a; }
  return q;
};

test('gera um GIF89a válido com o tamanho, o tempo, a repetição e as cores certas', async () => {
  const [l, a] = [6, 4];
  const quadros = [quadroSólido(l, a, 255, 0, 0), quadroSólido(l, a, 0, 255, 0), quadroSólido(l, a, 0, 0, 255)];
  const r = await gerarGif({ largura: l, altura: a, quadros, sequência: [0, 1, 2], atrasoCs: 50, repetições: 'infinito' });
  const gif = lerGif(r.bytes);
  assert.deepEqual([gif.largura, gif.altura, gif.quadros.length, gif.repetições], [6, 4, 3, 0]);
  assert.deepEqual(gif.quadros.map((q) => q.controle.atraso), [50, 50, 50]);
  assert.equal(gif.quadros[0].controle.empacotado & 1, 0, 'sem transparência');
  assert.equal(r.coresUsadas, 3);
  // Cada quadro decodifica para um único índice, e a cor desse índice na paleta é a cor do quadro.
  const cores = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
  gif.quadros.forEach((q, i) => {
    assert.equal(q.indices.length, l * a);
    assert.equal(new Set(q.indices).size, 1);
    const k = q.indices[0];
    assert.deepEqual([...gif.paleta.subarray(k * 3, k * 3 + 3)], cores[i]);
  });
});

test('repetir uma vez não grava a extensão; 3 vezes grava contador 2 (o contador não conta a primeira volta)', async () => {
  const quadros = [quadroSólido(2, 2, 1, 2, 3), quadroSólido(2, 2, 9, 8, 7)];
  const base = { largura: 2, altura: 2, quadros, sequência: [0, 1], atrasoCs: 10 };
  assert.equal(lerGif((await gerarGif({ ...base, repetições: 1 })).bytes).repetições, null);
  assert.equal(lerGif((await gerarGif({ ...base, repetições: 3 })).bytes).repetições, 2);
  assert.equal(lerGif((await gerarGif({ ...base, repetições: 'infinito' })).bytes).repetições, 0);
});

test('uma imagem real pequena (degradê com ruído) volta idêntica nos índices e quase igual nas cores', async () => {
  const [l, a] = [40, 30];
  const sorteio = sortear(5);
  const quadro = new Uint8ClampedArray(l * a * 4);
  for (let y = 0; y < a; y += 1) for (let x = 0; x < l; x += 1) {
    const i = (y * l + x) * 4;
    quadro[i] = (x * 6) & 255; quadro[i + 1] = (y * 8) & 255; quadro[i + 2] = Math.floor(sorteio() * 256); quadro[i + 3] = 255;
  }
  const r = await gerarGif({ largura: l, altura: a, quadros: [quadro, quadro], sequência: [0, 1, 0], atrasoCs: 10, repetições: 'infinito' });
  const gif = lerGif(r.bytes);
  assert.equal(gif.quadros.length, 3);
  // Os três quadros são idênticos (o 3º repete o 1º): mesmos índices.
  assert.deepEqual([...gif.quadros[2].indices], [...gif.quadros[0].indices]);
  // Cada pixel decodificado está perto da cor original (a paleta de 256 cores sobre 1.200 pixels quase aleatórios erra pouco).
  let erro = 0;
  gif.quadros[0].indices.forEach((k, p) => {
    for (let c = 0; c < 3; c += 1) erro += Math.abs(gif.paleta[k * 3 + c] - quadro[p * 4 + c]);
  });
  assert.ok(erro / (l * a * 3) < 12, `erro médio ${(erro / (l * a * 3)).toFixed(1)}`);
});

test('transparência: pixel quase transparente vira o índice reservado; sem pixel transparente, nenhum índice é gasto', async () => {
  const [l, a] = [4, 4];
  const quadro = quadroSólido(l, a, 200, 10, 10);
  for (let p = 0; p < 4; p += 1) quadro[p * 4 + 3] = 0; // primeira linha transparente
  quadro[4 * 4 + 3] = 127; // metade: ainda transparente
  quadro[5 * 4 + 3] = 128; // 50%: opaco
  const r = await gerarGif({ largura: l, altura: a, quadros: [quadro, quadro], sequência: [0, 1], atrasoCs: 5, repetições: 'infinito', transparência: true });
  assert.equal(r.transparente, true);
  const gif = lerGif(r.bytes);
  const q = gif.quadros[0];
  assert.equal(q.controle.empacotado & 1, 1);
  const t = q.controle.transparente;
  assert.deepEqual([...q.indices.subarray(0, 5)], [t, t, t, t, t]);
  assert.notEqual(q.indices[5], t);
  assert.deepEqual([...gif.paleta.subarray(q.indices[5] * 3, q.indices[5] * 3 + 3)], [200, 10, 10]);
  assert.equal((q.controle.empacotado >> 2) & 7, 2, 'descarte: restaurar o fundo');
  // Sem transparência pedida, o mesmo quadro vira opaco, e com pedido mas sem pixel transparente não reserva índice.
  const opaco = await gerarGif({ largura: l, altura: a, quadros: [quadroSólido(l, a, 1, 2, 3)], sequência: [0], atrasoCs: 5, repetições: 1, transparência: true });
  assert.equal(opaco.transparente, false);
  assert.equal(opaco.coresUsadas, 1);
});

test('mais de 256 cores: a paleta tem no máximo 256, o arquivo continua válido e as cores principais ficam bem representadas', async () => {
  const [l, a] = [64, 64];
  const quadro = new Uint8ClampedArray(l * a * 4);
  for (let p = 0; p < l * a; p += 1) { quadro[p * 4] = (p * 3) & 255; quadro[p * 4 + 1] = (p >> 2) & 255; quadro[p * 4 + 2] = (p * 11) & 255; quadro[p * 4 + 3] = 255; }
  for (const suavizar of [false, true]) {
    const r = await gerarGif({ largura: l, altura: a, quadros: [quadro, quadro], sequência: [0, 1], atrasoCs: 5, repetições: 'infinito', suavizar });
    const gif = lerGif(r.bytes);
    assert.equal(gif.tamanhoDaTabela, 256);
    assert.ok(r.coresUsadas <= 256);
    assert.ok(gif.quadros[0].indices.every((k) => k < 256));
  }
});

test('o preto-e-branco usa só 2 cores (tabela de 2 entradas) e o código mínimo é 2', async () => {
  const quadro = new Uint8ClampedArray(8 * 8 * 4);
  for (let p = 0; p < 64; p += 1) { const v = p % 2 ? 255 : 0; quadro.set([v, v, v, 255], p * 4); }
  const r = await gerarGif({ largura: 8, altura: 8, quadros: [quadro], sequência: [0], atrasoCs: 5, repetições: 1 });
  const gif = lerGif(r.bytes);
  assert.equal(gif.tamanhoDaTabela, 2);
  assert.equal(gif.quadros[0].profundidade, 2);
  assert.deepEqual([...gif.quadros[0].indices].map((k) => gif.paleta[k * 3]), Array.from({ length: 64 }, (_, p) => (p % 2 ? 255 : 0)));
});

test('quantizar recusa quadros do tamanho errado e lista vazia; escrever recusa tamanho absurdo', () => {
  recusa(() => quantizar([], 2, 2), /Não há quadros/);
  recusa(() => quantizar([new Uint8ClampedArray(8)], 2, 2), /tamanho esperado/);
  assert.throws(() => escreverGif({ largura: 0, altura: 1, paleta: new Uint8Array(6), tamanho: 2, quadros: [], repetições: 1 }), ErroDeGif);
  assert.throws(() => escreverGif({ largura: 70_000, altura: 1, paleta: new Uint8Array(6), tamanho: 2, quadros: [], repetições: 1 }), ErroDeGif);
  assert.throws(() => escreverGif({ largura: 2, altura: 2, paleta: new Uint8Array(6), tamanho: 2, quadros: [{ indices: new Uint8Array(3), atrasoCs: 5 }], repetições: 1 }), /tamanho esperado/);
});

test('cancelar no meio interrompe com o erro certo', async () => {
  const quadros = [quadroSólido(4, 4, 1, 1, 1), quadroSólido(4, 4, 2, 2, 2)];
  let chamadas = 0;
  await assert.rejects(
    gerarGif({ largura: 4, altura: 4, quadros, sequência: [0, 1], atrasoCs: 5, repetições: 1 }, { cancelado: () => { chamadas += 1; return chamadas > 1; } }),
    (e) => e instanceof ErroDeGif && e.campo === 'cancelado',
  );
});

test('a paleta única é montada com as cores de TODOS os quadros', () => {
  const q1 = quadroSólido(3, 3, 255, 0, 0);
  const q2 = quadroSólido(3, 3, 0, 0, 255);
  const r = quantizar([q1, q2], 3, 3);
  assert.equal(r.coresUsadas, 2);
  assert.notEqual(r.indices[0][0], r.indices[1][0]);
  assert.deepEqual([...r.paleta.subarray(r.indices[0][0] * 3, r.indices[0][0] * 3 + 3)], [255, 0, 0]);
  assert.deepEqual([...r.paleta.subarray(r.indices[1][0] * 3, r.indices[1][0] * 3 + 3)], [0, 0, 255]);
});

test('uma imagem grande e variada (0,5 milhão de pixels, 2 quadros) é convertida em tempo razoável', async () => {
  const [l, a] = [800, 600];
  const sorteio = sortear(3);
  const quadro = new Uint8ClampedArray(l * a * 4);
  for (let p = 0; p < l * a; p += 1) { quadro.set([(p % l) & 255, Math.floor(p / l) & 255, Math.floor(sorteio() * 256), 255], p * 4); }
  const início = performance.now();
  const r = await gerarGif({ largura: l, altura: a, quadros: [quadro, quadro], sequência: [0, 1], atrasoCs: 5, repetições: 'infinito', suavizar: true });
  assert.ok(performance.now() - início < 15_000, `demorou ${(performance.now() - início).toFixed(0)} ms`);
  const gif = lerGif(r.bytes);
  assert.deepEqual([gif.largura, gif.altura, gif.quadros.length], [800, 600, 2]);
});

/* ------------------------------------------------------------------ planejamento e limites */

test('o tamanho da paleta é a menor potência de 2, de 2 a 256', () => {
  for (const [n, t] of [[1, 2], [2, 2], [3, 4], [4, 4], [5, 8], [17, 32], [128, 128], [129, 256], [256, 256]]) assert.equal(tamanhoDaPaleta(n), t, String(n));
});

test('tempo do quadro em centésimos de segundo, com mínimo de 2', () => {
  assert.equal(atrasoEmCentésimos(500), 50);
  assert.equal(atrasoEmCentésimos(20), 2);
  assert.equal(atrasoEmCentésimos(24), 2);
  assert.equal(atrasoEmCentésimos(25), 3);
  assert.equal(atrasoEmCentésimos(5), 2);
  assert.equal(atrasoEmCentésimos(10_000), 1000);
});

test('ida e volta não repete as pontas', () => {
  assert.deepEqual(sequênciaDosQuadros(4, true), [0, 1, 2, 3, 2, 1]);
  assert.deepEqual(sequênciaDosQuadros(3, true), [0, 1, 2, 1]);
  assert.deepEqual(sequênciaDosQuadros(2, true), [0, 1]);
  assert.deepEqual(sequênciaDosQuadros(4, false), [0, 1, 2, 3]);
  // Propriedade: o último quadro da sequência é vizinho do primeiro, para o laço ficar suave.
  for (let n = 3; n <= 12; n += 1) { const s = sequênciaDosQuadros(n, true); assert.equal(s.length, 2 * n - 2); assert.ok(Math.abs(s.at(-1) - s[0]) === 1); }
});

test('onde desenhar: caber deixa faixas, preencher corta, mesma proporção não muda nada', () => {
  assert.deepEqual(retânguloDeDesenho({ largura: 200, altura: 100 }, { largura: 100, altura: 100 }, 'caber'), { x: 0, y: 25, largura: 100, altura: 50 });
  assert.deepEqual(retânguloDeDesenho({ largura: 200, altura: 100 }, { largura: 100, altura: 100 }, 'preencher'), { x: -50, y: 0, largura: 200, altura: 100 });
  assert.deepEqual(retânguloDeDesenho({ largura: 50, altura: 100 }, { largura: 100, altura: 100 }, 'caber'), { x: 25, y: 0, largura: 50, altura: 100 });
  assert.deepEqual(retânguloDeDesenho({ largura: 400, altura: 300 }, { largura: 200, altura: 150 }, 'caber'), { x: 0, y: 0, largura: 200, altura: 150 });
  assert.deepEqual(retânguloDeDesenho({ largura: 400, altura: 300 }, { largura: 200, altura: 150 }, 'preencher'), { x: 0, y: 0, largura: 200, altura: 150 });
});

const base = { quantidade: 5, primeira: { largura: 1600, altura: 1200 }, largura: 480, atrasoMs: 500, repetições: 'infinito' };

test('planeja o GIF: altura pela proporção da primeira imagem, tempo, duração e pixels', () => {
  const p = planejarGif(base);
  assert.deepEqual([p.largura, p.altura, p.quadros, p.atrasoCs, p.duraçãoMs, p.pixels], [480, 360, 5, 50, 2500, 5 * 480 * 360]);
  assert.equal(planejarGif({ ...base, idaEVolta: true }).quadros, 8);
  assert.equal(planejarGif({ ...base, repetições: '3' }).repetições, 3);
  assert.equal(planejarGif({ ...base, repetições: 'infinito' }).repetições, 'infinito');
});

test('recusa valores absurdos com a mensagem no campo certo', () => {
  recusa(() => planejarGif({ ...base, quantidade: 1 }), /pelo menos 2 imagens/, 'arquivo');
  recusa(() => planejarGif({ ...base, quantidade: 0 }), /pelo menos 2 imagens/, 'arquivo');
  recusa(() => planejarGif({ ...base, quantidade: 61 }), /61 imagens e o limite é 60/, 'arquivo');
  recusa(() => planejarGif({ ...base, quantidade: 2.5 }), /pelo menos/, 'arquivo');
  recusa(() => planejarGif({ ...base, primeira: null }), /primeira imagem/, 'arquivo');
  recusa(() => planejarGif({ ...base, largura: 15 }), /entre 16 e 1\.000/, 'largura');
  recusa(() => planejarGif({ ...base, largura: 1001 }), /entre 16 e 1\.000/, 'largura');
  recusa(() => planejarGif({ ...base, largura: 100.5 }), /inteiro/, 'largura');
  recusa(() => planejarGif({ ...base, largura: NaN }), /inteiro/, 'largura');
  recusa(() => planejarGif({ ...base, largura: '480' }), /inteiro/, 'largura');
  recusa(() => planejarGif({ ...base, atrasoMs: 5 }), /entre 20 e 10\.000 milissegundos/, 'atraso');
  recusa(() => planejarGif({ ...base, atrasoMs: 10_001 }), /entre 20 e 10\.000/, 'atraso');
  recusa(() => planejarGif({ ...base, atrasoMs: Infinity }), /precisa ser um número/, 'atraso');
  recusa(() => planejarGif({ ...base, repetições: '7' }), /quantas vezes/, 'repetições');
  recusa(() => planejarGif({ ...base, ajuste: 'esticar' }), /encaixar/, 'ajuste');
  recusa(() => planejarGif({ ...base, fundo: 'verde' }), /branco, preto ou transparente/, 'fundo');
});

test('os limites valem no limite (aceita) e um acima (recusa)', () => {
  assert.equal(planejarGif({ ...base, quantidade: 60, largura: 400 }).quadros, 60);
  assert.equal(planejarGif({ ...base, largura: 16 }).largura, 16);
  assert.equal(planejarGif({ ...base, atrasoMs: 20 }).atrasoCs, 2);
  assert.equal(planejarGif({ ...base, atrasoMs: 10_000 }).atrasoCs, 1000);
  assert.equal(planejarGif({ ...base, quantidade: 2 }).quadros, 2);
  // Total de pixels: 60 quadros quadrados de 632 × 632 = 23,96 milhões passa; 633 × 633 = 24,04 milhões não.
  const quadrada = { ...base, quantidade: 60, primeira: { largura: 100, altura: 100 } };
  assert.equal(planejarGif({ ...quadrada, largura: 632 }).pixels, 60 * 632 * 632);
  recusa(() => planejarGif({ ...quadrada, largura: 633 }), /24 milhões.*Diminua a largura/, 'largura');
  // A ida e volta conta os quadros repetidos.
  recusa(() => planejarGif({ ...quadrada, quantidade: 60, idaEVolta: true, largura: 500 }), /118 quadros/, 'largura');
});

test('altura absurda pela proporção da primeira imagem é recusada com o que fazer', () => {
  recusa(() => planejarGif({ ...base, primeira: { largura: 1000, altura: 20_000 } }), /480 × 9\.600 pixels.*outra largura/, 'largura');
  recusa(() => planejarGif({ ...base, primeira: { largura: 20_000, altura: 100 } }), /480 × 2 pixels/, 'largura');
  assert.equal(planejarGif({ ...base, primeira: { largura: 1000, altura: 4000 }, largura: 400 }).altura, 1600);
});

/* ------------------------------------------------------------------ arquivos de entrada */

test('imagens de entrada: aceita pelo conteúdo, recusa o resto falando em "imagem"', () => {
  assert.equal(conferirImagemDoGif(png(20, 10)).ok, true);
  const pdf = conferirImagemDoGif(new Uint8Array([...'%PDF-1.7\n1 0 obj'].map((c) => c.charCodeAt(0))));
  assert.equal(pdf.ok, false);
  assert.match(pdf.mensagem, /não uma imagem que eu consiga abrir/);
  assert.doesNotMatch(pdf.mensagem, /\bfoto\b/i);
  assert.equal(conferirImagemDoGif(new Uint8Array(0)).motivo, 'vazio');
  const bomba = conferirImagemDoGif(png(30_000, 30_000, { linhas: 1 }));
  assert.equal(bomba.motivo, 'megapixels');
  assert.match(bomba.mensagem, /A imagem tem 30\.000 × 30\.000/);
  assert.equal(conferirImagemDoGif(png(10, 10).slice(0, 14)).motivo, 'corrompido');
  assert.equal(LIMITES.quadrosMáx, 60);
});

test('o nome do arquivo sai do primeiro nome, sem acento nem caracteres perigosos', () => {
  assert.equal(nomeDoGif('Férias na Praia'), 'ferias-na-praia.gif');
  assert.equal(nomeDoGif(''), 'animacao.gif');
  assert.equal(nomeDoGif(undefined), 'animacao.gif');
  assert.match(nomeDoGif('../../x'), /^[a-z0-9-]+\.gif$/);
  assert.ok(nomeDoGif('a'.repeat(300)).length <= 44);
});

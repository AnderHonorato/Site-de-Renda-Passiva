import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ajusteInicial,
  validarAjuste,
  geometriaDigitalizacao,
  tratarPixels,
  encaixeDaPagina,
  gerarPdfDigitalizado,
} from "../scripts/cálculos/digitalizar-para-pdf.js";
import * as biblioteca from "../recursos/pdf-lib.esm.min.js";

test("o recorte acompanha os lados da foto depois de um giro de 90 graus", () => {
  const g = geometriaDigitalizacao(400, 200, {
    ...ajusteInicial(),
    giro: 90,
    esquerda: 25,
    topo: 10,
    base: 10,
  });
  assert.deepEqual(
    [g.giradaLargura, g.giradaAltura, g.x, g.y, g.largura, g.altura],
    [200, 400, 50, 40, 150, 320],
  );
  assert.equal(g.reduzida, false);
});
test("reduz a exportação de forma proporcional e não aumenta fotos pequenas", () => {
  const g = geometriaDigitalizacao(6000, 3000, ajusteInicial());
  assert.deepEqual([g.largura, g.altura, g.reduzida], [3000, 1500, true]);
  assert.deepEqual(
    [
      geometriaDigitalizacao(300, 100, ajusteInicial()).largura,
      geometriaDigitalizacao(300, 100, ajusteInicial()).altura,
    ],
    [300, 100],
  );
});
test("recusa corte vazio, lados fora do intervalo, rotação e tratamento inválidos", () => {
  for (const a of [
    { esquerda: 80, direita: 20 },
    { topo: -1 },
    { esquerda: NaN },
    { base: 91 },
    { giro: 45 },
    { modo: "ia" },
    { contraste: 101 },
    { limiar: Infinity },
  ])
    assert.throws(() => validarAjuste(a));
});
test("tratamento compõe transparência em branco, converte luminância e aplica limiar real", () => {
  assert.deepEqual(
    [
      ...tratarPixels(
        new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 255]),
        ajusteInicial(),
      ),
    ],
    [255, 255, 255, 255, 255, 0, 0, 255],
  );
  const cinza = tratarPixels(new Uint8ClampedArray([255, 0, 0, 255]), {
    modo: "cinza",
  });
  assert.deepEqual([...cinza], [54, 54, 54, 255]);
  const pb = tratarPixels(
    new Uint8ClampedArray([150, 150, 150, 255, 170, 170, 170, 255]),
    { modo: "pb", limiar: 160 },
  );
  assert.deepEqual([...pb], [0, 0, 0, 255, 255, 255, 255, 255]);
});
test("A4 centraliza sem deformação e modo imagem conserva proporção a 150 dpi", () => {
  const a4 = encaixeDaPagina(400, 200, "a4");
  assert.equal(a4.largura, 595.28);
  assert.equal(a4.altura, 841.89);
  assert.equal(a4.imagemLargura / a4.imagemAltura, 2);
  assert.equal(a4.x, 18);
  const auto = encaixeDaPagina(400, 200, "a4-auto");
  assert.equal(auto.largura, 841.89);
  assert.equal(auto.altura, 595.28);
  assert.deepEqual(encaixeDaPagina(300, 450, "adaptar"), {
    largura: 144,
    altura: 216,
    x: 0,
    y: 0,
    imagemLargura: 144,
    imagemAltura: 216,
  });
  assert.throws(() => encaixeDaPagina(200, 300, "inexistente"));
});
test("exportação vazia/longa e cancelamento são recusados antes de publicar um arquivo parcial", async () => {
  await assert.rejects(
    gerarPdfDigitalizado([], { biblioteca }),
    /pelo menos uma/,
  );
  await assert.rejects(
    gerarPdfDigitalizado(Array(21).fill({}), { biblioteca }),
    /20 fotos/,
  );
  let renderizou = false;
  await assert.rejects(
    gerarPdfDigitalizado([{}], {
      biblioteca,
      cancelado: () => true,
      renderizar: async () => {
        renderizou = true;
      },
    }),
    (e) => e.cancelado === true,
  );
  assert.equal(renderizou, false);
});

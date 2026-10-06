/**
 * Testes de JPG para PDF.
 *
 * Os casos de tamanho de página vêm da pesquisa do comportamento esperado
 * (documentação/pesquisa-ilovepdf/b-otimizar-e-para-pdf.md, B4) e foram
 * conferidos à mão: A4 = 595,28 × 841,89 pt e 10 mm = 28,35 pt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { biblioteca, conteúdoDaPágina, perto } from './auxiliares/pdf-de-teste.mjs';
import { png, jpeg } from './auxiliares/imagens-de-teste.mjs';
import {
  converterImagensEmPdf, calcularPágina, mensagemDeErroDeJpgParaPdf, LIMITE_DE_IMAGENS, MARGENS_MM, PAPÉIS,
} from '../scripts/cálculos/jpg-para-pdf.js';
import {
  lerImagem, pngEstáÍntegro, matrizDaImagem, aplicarMatriz, compor, conferirImagem, prepararImagem, mensagemDeErroDaImagem,
  TAMANHO_MÁXIMO_DA_IMAGEM,
} from '../scripts/cálculos/imagens-em-pdf.js';
import ferramenta from '../scripts/ferramentas/jpg-para-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument } = biblioteca;

const converter = (arquivos, opções = {}) => converterImagensEmPdf(arquivos, { biblioteca, ...opções });
const tamanhos = async (bytes) => (await PDFDocument.load(bytes)).getPages().map((p) => p.getSize());

/** Matriz [a b c d e f] do primeiro operador `cm` do conteúdo da página. */
function matrizDeImagem(documento, índice) {
  const m = conteúdoDaPágina(documento, índice).match(/([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) cm/);
  assert.ok(m, 'a página deveria ter um desenho de imagem');
  return m.slice(1, 7).map(Number);
}

/* ------------------------------------------- casos da pesquisa (B4) */

test('adaptar: cada página tem o tamanho da própria imagem (320×240 e 1240×400)', async () => {
  const r = await converter([
    { nome: 'foto.png', bytes: png(320, 240) },
    { nome: 'texto-escaneado.png', bytes: png(1240, 400) },
  ], { tamanho: 'adaptar' });
  assert.equal(r.ok, true);
  assert.equal(r.páginas, 2);
  assert.equal(r.arquivos.length, 1);
  assert.deepEqual(await tamanhos(r.arquivos[0].bytes), [{ width: 320, height: 240 }, { width: 1240, height: 400 }]);
});

test('A4 retrato com margem pequena: página A4, imagem inteira e centrada, largura útil de 595,28 − 2×28,35', async () => {
  const r = await converter([
    { nome: 'foto.png', bytes: png(320, 240) },
    { nome: 'texto-escaneado.png', bytes: png(1240, 400) },
  ], { tamanho: 'a4', orientação: 'retrato', margem: 'pequena' });
  const documento = await PDFDocument.load(r.arquivos[0].bytes);
  for (const página of documento.getPages()) {
    assert.ok(perto(página.getWidth(), 595.28) && perto(página.getHeight(), 841.89));
  }
  const útil = 595.28 - 2 * 28.35;
  const [a, , , d, e, f] = matrizDeImagem(documento, 1); // a imagem larga: ocupa a largura útil toda
  assert.ok(perto(a, útil, 0.05), `largura ${a}`);
  assert.ok(perto(d, (útil * 400) / 1240, 0.05), `altura ${d}`);
  assert.ok(perto(e, 28.35, 0.05), `x ${e}`);
  assert.ok(perto(f, (841.89 - d) / 2, 0.05), `y ${f} (centrada na vertical)`);
});

test('juntar desmarcado: um PDF por imagem, com o nome da imagem', async () => {
  const r = await converter([
    { nome: 'frente.png', bytes: png(100, 100) },
    { nome: 'verso.final.png', bytes: png(100, 100) },
  ], { juntar: false });
  assert.equal(r.ok, true);
  assert.deepEqual(r.arquivos.map((a) => a.nome), ['frente', 'verso.final']);
  for (const arquivo of r.arquivos) assert.equal((await PDFDocument.load(arquivo.bytes)).getPageCount(), 1);
});

/* ------------------------------------------------ rotação EXIF */

test('o EXIF de cada orientação (1 a 8) é lido do JPEG', () => {
  for (let o = 1; o <= 8; o++) {
    const info = lerImagem(jpeg(400, 300, { orientação: o }));
    assert.deepEqual([info.tipo, info.largura, info.altura, info.orientação], ['jpg', 400, 300, o]);
  }
  assert.equal(lerImagem(jpeg(400, 300)).orientação, 1);
});

test('foto de celular em pé (EXIF 6, guardada 400×300) vira página 300×400 em "adaptar"', async () => {
  const r = await converter([{ nome: 'pé.jpg', bytes: jpeg(400, 300, { orientação: 6 }) }], { tamanho: 'adaptar' });
  assert.deepEqual(await tamanhos(r.arquivos[0].bytes), [{ width: 300, height: 400 }]);
});

test('cada orientação EXIF leva o canto de cima da imagem guardada ao canto certo da imagem vista', () => {
  // Pixel guardado no canto superior esquerdo (u=0, v=1), em uma caixa vista de 100 × 200 em (10, 20).
  // Onde ele deve cair, segundo a tabela EXIF (a 1ª linha guardada fica no lado que o nome diz):
  const esperado = {
    1: 'cima-esquerda', 2: 'cima-direita', 3: 'baixo-direita', 4: 'baixo-esquerda',
    5: 'cima-esquerda', 6: 'cima-direita', 7: 'baixo-direita', 8: 'baixo-esquerda',
  };
  const caixa = { x: 10, y: 20, largura: 100, altura: 200 };
  for (const [orientação, lugar] of Object.entries(esperado)) {
    const { x, y } = aplicarMatriz(matrizDaImagem(Number(orientação), caixa), 0, 1);
    const direita = x > 60;
    const cima = y > 120;
    assert.equal(`${cima ? 'cima' : 'baixo'}-${direita ? 'direita' : 'esquerda'}`, lugar, `orientação ${orientação}`);
    // E o quadrado inteiro continua dentro da caixa.
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const p = aplicarMatriz(matrizDaImagem(Number(orientação), caixa), u, v);
      assert.ok(p.x >= 10 - 1e-9 && p.x <= 110 + 1e-9 && p.y >= 20 - 1e-9 && p.y <= 220 + 1e-9);
    }
  }
});

test('a matriz do EXIF 6 no PDF gira de verdade: o desenho sai com a e d zerados', async () => {
  const r = await converter([{ nome: 'pé.jpg', bytes: jpeg(400, 300, { orientação: 6 }) }], { tamanho: 'adaptar' });
  const [a, b, c, d, e, f] = matrizDeImagem(await PDFDocument.load(r.arquivos[0].bytes), 0);
  assert.deepEqual([a, d].map(Math.abs), [0, 0]);
  assert.ok(perto(c, 300) && perto(b, -400) && perto(e, 0) && perto(f, 400));
});

test('compor aplica a primeira matriz e depois a segunda', () => {
  const deslocar = [1, 0, 0, 1, 10, 0];
  const dobrar = [2, 0, 0, 2, 0, 0];
  assert.deepEqual(aplicarMatriz(compor(deslocar, dobrar), 1, 1), { x: 22, y: 2 });
  assert.deepEqual(aplicarMatriz(compor(dobrar, deslocar), 1, 1), { x: 12, y: 2 });
});

/* ------------------------------------------- orientação e tamanho */

test('orientação do papel: retrato, paisagem e automática (que segue a imagem)', () => {
  const larga = { largura: 400, altura: 100, orientação: 1 };
  const alta = { largura: 100, altura: 400, orientação: 1 };
  const base = { tamanho: 'a4', margem: 'sem' };
  assert.deepEqual(calcularPágina(larga, { ...base, orientação: 'retrato' }).página, PAPÉIS.a4);
  assert.deepEqual(calcularPágina(larga, { ...base, orientação: 'paisagem' }).página, [PAPÉIS.a4[1], PAPÉIS.a4[0]]);
  assert.deepEqual(calcularPágina(larga, { ...base, orientação: 'automática' }).página, [PAPÉIS.a4[1], PAPÉIS.a4[0]]);
  assert.deepEqual(calcularPágina(alta, { ...base, orientação: 'automática' }).página, PAPÉIS.a4);
  assert.deepEqual(calcularPágina(larga, { tamanho: 'carta', orientação: 'retrato', margem: 'sem' }).página, [612, 792]);
});

test('propriedade: a imagem sempre cabe dentro das margens e mantém a proporção, para qualquer tamanho', () => {
  const formas = [[1, 1], [3000, 20], [20, 3000], [4032, 3024], [3024, 4032], [1, 5000], [640, 480]];
  for (const [largura, altura] of formas) {
    for (const orientaçãoExif of [1, 6]) {
      for (const tamanho of ['a4', 'carta', 'adaptar']) {
        for (const margem of Object.keys(MARGENS_MM)) {
          for (const orientação of ['retrato', 'paisagem', 'automática']) {
            const imagem = { largura, altura, orientação: orientaçãoExif };
            const { página: [pl, pa], caixa } = calcularPágina(imagem, { tamanho, orientação, margem });
            const m = (MARGENS_MM[margem] * 72) / 25.4;
            const texto = JSON.stringify({ largura, altura, orientaçãoExif, tamanho, margem, orientação });
            assert.ok(caixa.x >= m - 1e-6 && caixa.y >= m - 1e-6, texto);
            assert.ok(caixa.x + caixa.largura <= pl - m + 1e-6 && caixa.y + caixa.altura <= pa - m + 1e-6, texto);
            const vista = orientaçãoExif === 6 ? altura / largura : largura / altura;
            assert.ok(Math.abs(caixa.largura / caixa.altura - vista) < 1e-6 * Math.max(1, vista), texto);
          }
        }
      }
    }
  }
});

test('imagem gigante em "adaptar" encolhe para a página caber no limite dos leitores (14400 pt)', () => {
  const { página } = calcularPágina({ largura: 30000, altura: 20000, orientação: 1 }, { tamanho: 'adaptar', orientação: 'retrato', margem: 'sem' });
  assert.ok(Math.max(...página) <= 14400 + 1e-6);
  assert.ok(Math.abs(página[0] / página[1] - 1.5) < 1e-9);
});

/* ------------------------------------------------ entradas hostis */

test('lista vazia, lote acima do limite e opções inválidas são recusados', async () => {
  assert.equal((await converter([])).erro, 'sem_imagens');
  const muitas = Array.from({ length: LIMITE_DE_IMAGENS + 1 }, (_, i) => ({ nome: `${i}.png`, bytes: png(2, 2) }));
  assert.equal((await converter(muitas)).erro, 'imagens_demais');
  assert.equal((await converter([{ nome: 'a.png', bytes: png(2, 2) }], { tamanho: 'a0' })).erro, 'tamanho_inválido');
  assert.equal((await converter([{ nome: 'a.png', bytes: png(2, 2) }], { orientação: 'torta' })).erro, 'orientação_inválida');
  assert.equal((await converter([{ nome: 'a.png', bytes: png(2, 2) }], { margem: 'enorme' })).erro, 'margem_inválida');
});

test('o limite de imagens bate com o "Como usar"', () => {
  assert.equal(LIMITE_DE_IMAGENS, 100);
  assert.match(ferramenta.instruções.limites, /Até 100 imagens por vez, cada uma com até 25 MB/);
});

test('arquivo vazio, texto com nome de imagem e formato desconhecido são recusados pelo conteúdo', async () => {
  const bom = { nome: 'ok.png', bytes: png(4, 4) };
  const vazio = await converter([bom, { nome: 'vazio.jpg', bytes: new Uint8Array() }]);
  assert.deepEqual([vazio.erro, vazio.extras.nome], ['imagem_vazia', 'vazio.jpg']);
  const texto = await converter([{ nome: 'foto.jpg', bytes: new TextEncoder().encode('isto não é uma imagem de jeito nenhum') }]);
  assert.equal(texto.erro, 'imagem_nao_suportada');
  assert.match(mensagemDeErroDeJpgParaPdf(texto.erro, texto.extras), /"foto\.jpg" não é uma imagem.*mesmo que o nome termine em \.jpg/);
  const pdf = await converter([{ nome: 'doc.png', bytes: new TextEncoder().encode('%PDF-1.7\n%âãÏÓ\nresto do arquivo') }]);
  assert.equal(pdf.erro, 'imagem_nao_suportada');
});

test('TIFF, HEIC e BMP têm mensagem própria dizendo o que fazer', async () => {
  const tiff = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const heic = new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode('ftypheic'), 0, 0, 0, 0, 0, 0, 0, 0]);
  const bmp = new Uint8Array([0x42, 0x4d, ...new Uint8Array(20)]);
  for (const [nome, bytes, formato] of [['a.tif', tiff, 'TIFF'], ['b.heic', heic, 'HEIC'], ['c.bmp', bmp, 'BMP']]) {
    const r = await converter([{ nome, bytes }]);
    assert.equal(r.erro, 'imagem_nao_suportada');
    assert.match(mensagemDeErroDeJpgParaPdf(r.erro, r.extras), new RegExp(`está em ${formato}.*JPG ou PNG`));
  }
});

test('PNG e JPEG com cabeçalho certo e miolo quebrado viram imagem_corrompida, com o nome', async () => {
  const quebrado = png(50, 50).slice(0, 60); // corta no meio dos dados
  const r = await converter([{ nome: 'ok.png', bytes: png(4, 4) }, { nome: 'quebrada.png', bytes: quebrado }]);
  assert.deepEqual([r.erro, r.extras.nome], ['imagem_corrompida', 'quebrada.png']);
  // A pdf-lib trava em laço infinito nestes dois casos; o teste só passa se a conferência prévia os barrar.
  const mentiroso = await converter([{ nome: 'mentiroso.png', bytes: png(50, 50, { linhas: 10 }) }]);
  assert.deepEqual([mentiroso.erro, mentiroso.extras.nome], ['imagem_corrompida', 'mentiroso.png']);
  assert.equal(await pngEstáÍntegro(png(50, 50)), true);
  assert.equal(await pngEstáÍntegro(png(50, 50, { alfa: true })), true);
  assert.equal(await pngEstáÍntegro(png(50, 50).slice(0, 80)), false);
  const semFim = png(8, 8);
  assert.equal(await pngEstáÍntegro(semFim.slice(0, semFim.length - 12)), false);
  const semQuadro = await converter([{ nome: 'sem-quadro.jpg', bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9, 0, 0, 0, 0]) }]);
  assert.equal(semQuadro.erro, 'imagem_corrompida');
});

test('dimensões absurdas no cabeçalho são recusadas antes de decodificar', () => {
  const enorme = png(2, 2);
  new DataView(enorme.buffer).setUint32(16, 30000);
  new DataView(enorme.buffer).setUint32(20, 30000);
  assert.equal(conferirImagem({ nome: 'e.png', bytes: enorme }).erro, 'imagem_pixels_demais');
  assert.equal(conferirImagem({ nome: 'z.png', bytes: png(1, 1).fill(0, 16, 24) }).erro, 'imagem_corrompida');
  // JPEG aguenta mais, porque não é decodificado: 12 MP passa, 150 MP não.
  assert.equal(conferirImagem({ nome: 'f.jpg', bytes: jpeg(4000, 3000) }).ok, true);
  assert.equal(conferirImagem({ nome: 'g.jpg', bytes: jpeg(15000, 10000) }).erro, 'imagem_pixels_demais');
});

test('imagem acima de 25 MB é recusada', () => {
  const grande = new Uint8Array(TAMANHO_MÁXIMO_DA_IMAGEM + 1);
  grande.set(png(2, 2));
  assert.equal(conferirImagem({ nome: 'g.png', bytes: grande }).erro, 'imagem_grande_demais');
  assert.match(mensagemDeErroDaImagem('imagem_grande_demais', { nome: 'g.png' }), /passa de 25 MB/);
});

test('WebP e GIF dependem do conversor da tela; com ele entram como PNG, sem ele são recusados', async () => {
  const gif = new Uint8Array([...new TextEncoder().encode('GIF89a'), 5, 0, 7, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([lerImagem(gif).tipo, lerImagem(gif).largura, lerImagem(gif).altura], ['gif', 5, 7]);
  const sem = await prepararImagem({ nome: 'a.gif', bytes: gif });
  assert.equal(sem.erro, 'imagem_nao_suportada');
  let chamadas = 0;
  const com = await prepararImagem({ nome: 'a.gif', bytes: gif }, {
    converter: async (bytes, tipo) => { chamadas++; assert.equal(tipo, 'gif'); return { bytes: png(5, 7), largura: 5, altura: 7 }; },
  });
  assert.equal(chamadas, 1);
  assert.deepEqual([com.imagem.tipo, com.imagem.largura, com.imagem.altura, com.imagem.orientação], ['png', 5, 7, 1]);
  const falha = await prepararImagem({ nome: 'a.gif', bytes: gif }, { converter: async () => { throw new Error('x'); } });
  assert.equal(falha.erro, 'imagem_corrompida');
});

test('cabeçalhos de WebP (lossy, sem perdas e estendido) dão as dimensões', () => {
  const riff = (bloco, corpo) => new Uint8Array([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBP'), ...new TextEncoder().encode(bloco), ...corpo]);
  const lossy = riff('VP8 ', [0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, 0x2c, 1, 0xc8, 0, 0, 0]);
  assert.deepEqual([lerImagem(lossy).largura, lerImagem(lossy).altura], [300, 200]);
  const estendido = riff('VP8X', [0, 0, 0, 0, 0, 0, 0, 0, 99, 0, 0, 49, 0, 0]);
  assert.deepEqual([lerImagem(estendido).largura, lerImagem(estendido).altura], [100, 50]);
  const semPerdas = riff('VP8L', [0, 0, 0, 0, 0x2f, 0x63, 0x40, 0x0c, 0x00]);
  assert.deepEqual([lerImagem(semPerdas).largura, lerImagem(semPerdas).altura], [100, 50]);
});

test('PNG com transparência é aceito e vira página normal', async () => {
  const r = await converter([{ nome: 'logo.png', bytes: png(30, 20, { alfa: true }) }], { tamanho: 'adaptar' });
  assert.equal(r.ok, true);
  assert.deepEqual(await tamanhos(r.arquivos[0].bytes), [{ width: 30, height: 20 }]);
});

test('cancelar interrompe e não gera arquivo', async () => {
  let vezes = 0;
  const r = await converter(Array.from({ length: 10 }, (_, i) => ({ nome: `${i}.png`, bytes: png(8, 8) })), { cancelado: () => ++vezes > 4 });
  assert.equal(r.erro, 'cancelado');
});

test('o progresso conta imagem a imagem', async () => {
  const passos = [];
  await converter([{ nome: 'a.png', bytes: png(4, 4) }, { nome: 'b.png', bytes: png(4, 4) }], { aoProgredir: (p) => passos.push([p.imagem, p.total]) });
  assert.deepEqual(passos, [[1, 2], [2, 2]]);
});

test('propriedade: uma página por imagem, na ordem da lista (largura de cada página identifica a imagem)', async () => {
  const larguras = [37, 120, 5, 999, 64];
  const r = await converter(larguras.map((l, i) => ({ nome: `${i}.png`, bytes: png(l, 10) })), { tamanho: 'adaptar' });
  assert.deepEqual((await tamanhos(r.arquivos[0].bytes)).map((t) => t.width), larguras);
});

/* ---------------------------------------------------- ficha e texto */

test('as mensagens chegam em português com o nome do arquivo', () => {
  assert.match(mensagemDeErroDaImagem('imagem_vazia', { nome: 'x.jpg' }), /"x\.jpg" está vazio/);
  assert.match(mensagemDeErroDaImagem('imagem_corrompida', { nome: 'x.jpg' }), /danificada ou incompleta/);
  assert.match(mensagemDeErroDeJpgParaPdf('imagens_demais'), /até 100 imagens/);
  assert.equal(mensagemDeErroDeJpgParaPdf('sem_imagens'), 'Escolha pelo menos uma imagem.');
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['jpg-para-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
});

test('"Como usar" traz passos, exemplo, limites e perguntas', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && exemplo.texto && limites && perguntas.length >= 3);
});

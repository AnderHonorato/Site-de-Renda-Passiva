/**
 * JPG para PDF: uma imagem por página, no tamanho de papel escolhido.
 *
 * O JPEG entra no PDF sem recompressão (os bytes seguem como estão); PNG vai pela
 * pdf-lib; WebP e GIF passam pelo `converter` que a tela fornece. A rotação EXIF
 * (foto de celular em pé) é respeitada por matriz, sem decodificar a foto.
 */
import {
  prepararImagem, incorporarImagem, matrizDaImagem, exifTrocaOsLados, mensagemDeErroDaImagem,
} from './imagens-em-pdf.js';

export const LIMITE_DE_IMAGENS = 100;
export const TAMANHO_TOTAL_MÁXIMO = 200 * 1024 * 1024; // 200 MB somando todas as imagens

/** Maior lado de página que os leitores de PDF aceitam (200 polegadas). */
const LADO_MÁXIMO_DA_PÁGINA = 14400;

/** Tamanhos de papel em pontos, em pé. */
export const PAPÉIS = Object.freeze({
  a4: [595.28, 841.89],
  carta: [612, 792],
});

/** Margens em milímetros; valores nossos, mostrados na tela. */
export const MARGENS_MM = Object.freeze({ sem: 0, pequena: 10, grande: 25 });

const PONTOS_POR_MM = 72 / 25.4;
const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

export function mensagemDeErroDeJpgParaPdf(erro, extras = {}) {
  const mensagens = {
    sem_imagens: 'Escolha pelo menos uma imagem.',
    imagens_demais: `Dá para converter até ${LIMITE_DE_IMAGENS} imagens por vez. Converta em partes e junte os PDFs depois.`,
    total_grande_demais: `As imagens somam mais de ${TAMANHO_TOTAL_MÁXIMO / 1024 / 1024} MB. Converta em partes menores.`,
    tamanho_inválido: 'Escolha um tamanho de página da lista.',
    orientação_inválida: 'Escolha uma orientação da lista.',
    margem_inválida: 'Escolha uma margem da lista.',
    cancelado: 'Conversão cancelada. Nenhum arquivo foi gerado.',
  };
  return mensagens[erro] ?? mensagemDeErroDaImagem(erro, extras);
}

/**
 * Tamanho da página e do retângulo da imagem, no espaço do PDF, para uma imagem.
 * @param {{largura: number, altura: number, orientação: number}} imagem
 * @param {{tamanho: 'adaptar'|'a4'|'carta', orientação: 'retrato'|'paisagem'|'automática', margem: 'sem'|'pequena'|'grande'}} opções
 * @returns {{página: [number, number], caixa: {x: number, y: number, largura: number, altura: number}}}
 */
export function calcularPágina(imagem, { tamanho, orientação, margem }) {
  const trocada = exifTrocaOsLados(imagem.orientação);
  const vistaL = trocada ? imagem.altura : imagem.largura;
  const vistaA = trocada ? imagem.largura : imagem.altura;
  const m = MARGENS_MM[margem] * PONTOS_POR_MM;

  if (tamanho === 'adaptar') {
    // 1 pixel = 1 ponto; imagem gigante encolhe para a página caber no limite dos leitores.
    const escala = Math.min(1, (LADO_MÁXIMO_DA_PÁGINA - 2 * m) / Math.max(vistaL, vistaA));
    const l = vistaL * escala;
    const a = vistaA * escala;
    return { página: [l + 2 * m, a + 2 * m], caixa: { x: m, y: m, largura: l, altura: a } };
  }

  const [pl, pa] = PAPÉIS[tamanho];
  const paisagem = orientação === 'paisagem' || (orientação === 'automática' && vistaL > vistaA);
  const [larguraDaPágina, alturaDaPágina] = paisagem ? [pa, pl] : [pl, pa];
  const útilL = larguraDaPágina - 2 * m;
  const útilA = alturaDaPágina - 2 * m;
  const escala = Math.min(útilL / vistaL, útilA / vistaA);
  const l = vistaL * escala;
  const a = vistaA * escala;
  return {
    página: [larguraDaPágina, alturaDaPágina],
    caixa: { x: m + (útilL - l) / 2, y: m + (útilA - a) / 2, largura: l, altura: a },
  };
}

async function montarPdf(biblioteca, imagens, opções, { aoProgredir, cancelado, início, total }) {
  const { PDFDocument, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = biblioteca;
  const documento = await PDFDocument.create();
  documento.setProducer('Portal de Ferramentas');
  documento.setCreator('Portal de Ferramentas');
  const detalhes = [];
  for (const [i, { nome, imagem }] of imagens.entries()) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    await folga();
    const embutida = await incorporarImagem(documento, imagem);
    if (!embutida.ok) return { ok: false, erro: embutida.erro, extras: { nome } };
    const { página: [l, a], caixa } = calcularPágina(imagem, opções);
    const página = documento.addPage([l, a]);
    página.node.normalize();
    const nomeDoObjeto = página.node.newXObject('Img', embutida.imagem.ref);
    const matriz = matrizDaImagem(imagem.orientação, caixa);
    página.node.addContentStream(documento.context.register(documento.context.contentStream([
      pushGraphicsState(), concatTransformationMatrix(...matriz), drawObject(nomeDoObjeto), popGraphicsState(),
    ])));
    detalhes.push({ nome, largura: imagem.largura, altura: imagem.altura, páginaLargura: l, páginaAltura: a });
    aoProgredir?.({ imagem: início + i + 1, total });
  }
  return { ok: true, bytes: await documento.save(), detalhes };
}

/**
 * Converte imagens em PDF.
 * @param {Array<{nome: string, bytes: Uint8Array}>} arquivos na ordem das páginas
 * @param {{
 *   biblioteca: any,
 *   tamanho?: 'adaptar'|'a4'|'carta', orientação?: 'retrato'|'paisagem'|'automática', margem?: 'sem'|'pequena'|'grande',
 *   juntar?: boolean, converter?: Function, aoProgredir?: Function, cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   {ok: true, arquivos: {nome: string, bytes: Uint8Array}[], páginas: number, detalhes: object[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function converterImagensEmPdf(arquivos, {
  biblioteca, tamanho = 'a4', orientação = 'retrato', margem = 'sem', juntar = true, converter, aoProgredir, cancelado,
} = {}) {
  if (!Array.isArray(arquivos) || arquivos.length === 0) return { ok: false, erro: 'sem_imagens' };
  if (arquivos.length > LIMITE_DE_IMAGENS) return { ok: false, erro: 'imagens_demais' };
  if (tamanho !== 'adaptar' && !(tamanho in PAPÉIS)) return { ok: false, erro: 'tamanho_inválido' };
  if (!['retrato', 'paisagem', 'automática'].includes(orientação)) return { ok: false, erro: 'orientação_inválida' };
  if (!(margem in MARGENS_MM)) return { ok: false, erro: 'margem_inválida' };
  if (arquivos.reduce((soma, a) => soma + (a.bytes?.length ?? 0), 0) > TAMANHO_TOTAL_MÁXIMO) return { ok: false, erro: 'total_grande_demais' };

  // Primeiro confere todas (barato, só cabeçalho), para recusar antes de gastar memória.
  const imagens = [];
  for (const arquivo of arquivos) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const r = await prepararImagem(arquivo, { converter });
    if (!r.ok) return r;
    imagens.push({ nome: arquivo.nome, imagem: r.imagem });
  }

  const opçõesDePágina = { tamanho, orientação, margem };
  const total = imagens.length;
  if (juntar) {
    const r = await montarPdf(biblioteca, imagens, opçõesDePágina, { aoProgredir, cancelado, início: 0, total });
    if (!r.ok) return r;
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    return { ok: true, arquivos: [{ nome: 'imagens', bytes: r.bytes }], páginas: total, detalhes: r.detalhes };
  }

  const saídas = [];
  const detalhes = [];
  for (const [i, item] of imagens.entries()) {
    const r = await montarPdf(biblioteca, [item], opçõesDePágina, { aoProgredir, cancelado, início: i, total });
    if (!r.ok) return r;
    saídas.push({ nome: item.nome.replace(/\.[^.]*$/, '') || 'imagem', bytes: r.bytes });
    detalhes.push(...r.detalhes);
  }
  return { ok: true, arquivos: saídas, páginas: total, detalhes };
}

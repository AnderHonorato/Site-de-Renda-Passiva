/**
 * Recortar PDF: tira margens das páginas ajustando a área visível (CropBox).
 *
 * ATENÇÃO, e a ferramenta precisa dizer isto com todas as letras: recortar assim
 * NÃO apaga nada. O conteúdo que ficou de fora continua dentro do arquivo, só
 * escondido; quem abrir o PDF num editor, extrair as imagens ou copiar o texto
 * consegue recuperá-lo. Para tirar informação de verdade, use "Ocultar informações".
 *
 * As margens são pedidas como a pessoa vê a página (em cima, à direita, embaixo,
 * à esquerda). Em página girada (/Rotate) elas são convertidas para o espaço do
 * PDF, e uma CropBox que já existia é respeitada: o corte parte da área visível.
 */
import {
  carregarPdf, interpretarPáginas, geometriaDaPágina, mmParaPt, ptParaMm, arredondar, mensagemDeErroDoPdfÚnico,
} from './pdf-páginas.js';

/** Quanto vale uma unidade, em pontos do PDF. */
export const UNIDADES = Object.freeze({ mm: mmParaPt(1), cm: mmParaPt(10), pt: 1 });

/** Lados da página, na ordem em que a tela os mostra. */
export const LADOS = Object.freeze(['cima', 'direita', 'baixo', 'esquerda']);

/** Sobra mínima de cada lado depois do corte, em pontos (pouco mais de 3 mm). */
export const SOBRA_MÍNIMA = 10;

/** Maior valor aceito em uma margem, na unidade escolhida (impede 1e308 de virar infinito). */
export const MARGEM_MÁXIMA = 100_000;

export function mensagemDeErroDeRecorte(erro, extras = {}) {
  const lado = { cima: 'em cima', direita: 'à direita', baixo: 'embaixo', esquerda: 'à esquerda' }[extras.lado] ?? '';
  const mensagens = {
    unidade_inválida: 'Escolha a unidade da lista: milímetros, centímetros ou pontos.',
    margem_inválida: `A margem ${lado} precisa ser um número, zero ou maior.`,
    margem_grande: `A margem ${lado} é grande demais.`,
    sem_corte: 'Informe quanto cortar em pelo menos um dos lados.',
    corte_demais: `Na página ${extras.página ?? ''} o corte deixa só ${extras.sobraLargura ?? 0} × ${extras.sobraAltura ?? 0} mm: sobra pouco demais. Corte menos.`,
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/**
 * Caixa nova de uma página, no espaço do PDF, a partir das margens vistas na tela.
 * @param {ReturnType<typeof geometriaDaPágina>} g
 * @param {{cima: number, direita: number, baixo: number, esquerda: number}} m margens em pontos
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function caixaRecortada(g, m) {
  // Para cada rotação, qual lado visto é qual lado do espaço do PDF (esquerda, direita, baixo, cima).
  const r = {
    0: { esquerda: m.esquerda, direita: m.direita, baixo: m.baixo, cima: m.cima },
    90: { esquerda: m.cima, direita: m.baixo, baixo: m.esquerda, cima: m.direita },
    180: { esquerda: m.direita, direita: m.esquerda, baixo: m.cima, cima: m.baixo },
    270: { esquerda: m.baixo, direita: m.cima, baixo: m.direita, cima: m.esquerda },
  }[g.rot];
  return { x: g.x + r.esquerda, y: g.y + r.baixo, w: g.w - r.esquerda - r.direita, h: g.h - r.baixo - r.cima };
}

/**
 * Recorta as páginas de um PDF.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   biblioteca: any, margens: {cima?: number, direita?: number, baixo?: number, esquerda?: number},
 *   unidade?: 'mm'|'cm'|'pt', páginas?: string,
 *   aoProgredir?: Function, cancelado?: () => boolean, limiteDePáginas?: number,
 * }} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, páginas: number, cortadas: number[], tamanhos: {página: number, largura: number, altura: number}[], avisos: string[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function recortarPdf(arquivo, {
  biblioteca, margens = {}, unidade = 'mm', páginas = '', aoProgredir, cancelado, limiteDePáginas,
} = {}) {
  // Opções primeiro: recusar barato antes de abrir um PDF de 100 MB.
  if (!(unidade in UNIDADES)) return { ok: false, erro: 'unidade_inválida' };
  const emPontos = {};
  for (const lado of LADOS) {
    const valor = margens[lado] ?? 0;
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) return { ok: false, erro: 'margem_inválida', extras: { lado } };
    if (valor > MARGEM_MÁXIMA) return { ok: false, erro: 'margem_grande', extras: { lado } };
    emPontos[lado] = valor * UNIDADES[unidade];
  }
  if (LADOS.every((lado) => emPontos[lado] === 0)) return { ok: false, erro: 'sem_corte' };

  const aberto = await carregarPdf(arquivo, { biblioteca, limiteDePáginas });
  if (!aberto.ok) return aberto;
  const { documento, páginas: total } = aberto;
  const faixa = interpretarPáginas(páginas, total);
  if (!faixa.ok) return faixa;

  // Primeiro calcula todas: se uma página não aguenta o corte, nenhuma é alterada.
  const novas = [];
  for (const índice of faixa.índices) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const página = documento.getPage(índice);
    const caixa = caixaRecortada(geometriaDaPágina(página), emPontos);
    if (caixa.w < SOBRA_MÍNIMA || caixa.h < SOBRA_MÍNIMA) {
      const visualmenteGirada = geometriaDaPágina(página).rot % 180 !== 0;
      const [l, a] = visualmenteGirada ? [caixa.h, caixa.w] : [caixa.w, caixa.h];
      return {
        ok: false, erro: 'corte_demais',
        extras: { página: índice + 1, sobraLargura: arredondar(Math.max(0, ptParaMm(l)), 1), sobraAltura: arredondar(Math.max(0, ptParaMm(a)), 1) },
      };
    }
    novas.push({ página, índice, caixa });
  }

  const { PDFName } = biblioteca;
  const tamanhos = [];
  for (const [vez, { página, índice, caixa }] of novas.entries()) {
    página.setCropBox(caixa.x, caixa.y, caixa.w, caixa.h);
    // Caixas de gráfica maiores que a nova área não fazem mais sentido: sem elas, valem a CropBox.
    for (const nome of ['TrimBox', 'BleedBox', 'ArtBox']) página.node.delete(PDFName.of(nome));
    const g = geometriaDaPágina(página);
    tamanhos.push({ página: índice + 1, largura: g.largura, altura: g.altura });
    aoProgredir?.({ página: vez + 1, total: novas.length });
    if ((vez + 1) % 100 === 0) await new Promise((resolver) => { setTimeout(resolver, 0); });
  }

  documento.setProducer('Portal de Ferramentas');
  const bytes = await documento.save();
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };
  return { ok: true, bytes, páginas: total, cortadas: novas.map((n) => n.índice + 1), tamanhos, avisos: ['conteúdo_continua'] };
}

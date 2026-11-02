/**
 * Organizar PDF: reordena, gira, duplica, apaga e insere páginas em branco, e grava o PDF na ordem da lista.
 *
 * A lista é uma sequência de itens ({tipo: 'página', origem, giro} ou {tipo: 'branca'}) e cada operação
 * devolve uma lista NOVA, sem alterar a anterior; assim "Desfazer" é guardar a lista de antes.
 *
 * Comportamento a partir da pesquisa do iLovePDF (documentação/pesquisa-ilovepdf/a-organizar.md, A5):
 * reordenar, girar 90°, eliminar, inserir página em branco, redefinir tudo. Sem miniaturas (o portal não tem
 * leitor de PDF para desenhá-las), a lista descreve cada página por número, formato e orientação.
 */
import {
  copiarMetadados, mensagemDeErro,
} from './páginas-do-pdf.js';
import { rotaçãoNormalizada } from './girar-pdf.js';

/** Páginas que a lista aceita: uma linha por página, e 500 linhas já pedem bastante do celular. */
export const LIMITE_DE_PÁGINAS_DA_LISTA = 500;

/** Itens da lista, contando duplicatas e páginas em branco. */
export const LIMITE_DE_ITENS = 1000;

/** Quantos passos de "Desfazer" ficam guardados. */
export const LIMITE_DO_HISTÓRICO = 100;

/** Tamanho (pontos) da página em branco quando não há página vizinha para copiar: A4 em pé. */
const A4 = Object.freeze([595.28, 841.89]);

/**
 * @typedef {{tipo: 'página', origem: number, giro: number} | {tipo: 'branca'}} Item
 */

/** @param {number} total @returns {Item[]} */
export function listaOriginal(total) {
  return Array.from({ length: total }, (_, origem) => ({ tipo: 'página', origem, giro: 0 }));
}

const posiçãoVálida = (itens, i) => Number.isInteger(i) && i >= 0 && i < itens.length;

/** Move o item `de` para a posição `para` (as duas a partir de 0). */
export function moverItem(itens, de, para) {
  if (!posiçãoVálida(itens, de) || !posiçãoVálida(itens, para) || de === para) return itens;
  const nova = [...itens];
  const [item] = nova.splice(de, 1);
  nova.splice(para, 0, item);
  return nova;
}

/** Soma `graus` (90, 180 ou 270) ao giro do item. Página em branco gira sem efeito visível e fica como está. */
export function girarItem(itens, i, graus) {
  if (!posiçãoVálida(itens, i) || itens[i].tipo !== 'página') return itens;
  const nova = [...itens];
  nova[i] = { ...itens[i], giro: (itens[i].giro + graus) % 360 };
  return nova;
}

/** Copia o item logo depois dele. Devolve `null` se a lista passaria do limite. */
export function duplicarItem(itens, i) {
  if (!posiçãoVálida(itens, i)) return itens;
  if (itens.length + 1 > LIMITE_DE_ITENS) return null;
  const nova = [...itens];
  nova.splice(i + 1, 0, { ...itens[i] });
  return nova;
}

export function removerItem(itens, i) {
  if (!posiçãoVálida(itens, i)) return itens;
  return itens.filter((_, k) => k !== i);
}

/** Põe uma página em branco na posição `posição` (0 = antes de tudo, `itens.length` = no fim). Devolve `null` acima do limite. */
export function inserirBranca(itens, posição) {
  if (!Number.isInteger(posição) || posição < 0 || posição > itens.length) return itens;
  if (itens.length + 1 > LIMITE_DE_ITENS) return null;
  const nova = [...itens];
  nova.splice(posição, 0, { tipo: 'branca' });
  return nova;
}

export function inverterOrdem(itens) {
  return [...itens].reverse();
}

/**
 * Números da lista para o resumo e para decidir se há algo a fazer.
 * @param {Item[]} itens
 * @param {number} total páginas do PDF original
 */
export function resumoDaLista(itens, total) {
  const vistas = new Set();
  let brancas = 0;
  let giradas = 0;
  let cópias = 0;
  for (const item of itens) {
    if (item.tipo === 'branca') { brancas++; continue; }
    if (item.giro !== 0) giradas++;
    if (vistas.has(item.origem)) cópias++;
    vistas.add(item.origem);
  }
  const removidas = total - vistas.size;
  const alterada = itens.length !== total || itens.some((item, i) => item.tipo !== 'página' || item.origem !== i || item.giro !== 0);
  return { páginas: itens.length, brancas, giradas, cópias, removidas, alterada };
}

/* ---------------------------------------------------------------- descrição */

const PONTOS_POR_CM = 72 / 2.54;

/** Formatos comuns, em pontos (retrato). Tolerância de 3 pt: escaneadores arredondam. */
const FORMATOS = [
  ['A3', 841.89, 1190.55], ['A4', 595.28, 841.89], ['A5', 419.53, 595.28],
  ['Carta', 612, 792], ['Ofício', 612, 1008], ['Tabloide', 792, 1224],
];

/**
 * "A4 · retrato" para uma página, já considerando a rotação (uma página retrato com /Rotate 90 aparece deitada).
 * @param {number} largura pontos, sem a rotação
 * @param {number} altura pontos, sem a rotação
 * @param {number} [rotação] graus
 * @returns {string}
 */
export function descreverPágina(largura, altura, rotação = 0) {
  const deitada = rotaçãoNormalizada(rotação) % 180 !== 0;
  const [largura1, altura1] = deitada ? [altura, largura] : [largura, altura];
  const menor = Math.min(largura1, altura1);
  const maior = Math.max(largura1, altura1);
  const orientação = Math.abs(largura1 - altura1) < 3 ? 'quadrada' : (largura1 < altura1 ? 'retrato' : 'paisagem');
  const formato = FORMATOS.find(([, l, a]) => Math.abs(menor - l) <= 3 && Math.abs(maior - a) <= 3)?.[0];
  const cm = (pontos) => (pontos / PONTOS_POR_CM).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const medida = formato ?? `${cm(largura1)} × ${cm(altura1)} cm`;
  return `${medida} · ${orientação}`;
}

/**
 * Tamanho (pontos) da página em branco na posição `i`: o da página vizinha, como ela aparece (com o giro).
 * A anterior tem preferência; se não houver, a seguinte; se a lista só tem páginas em branco, A4.
 * @param {Item[]} itens
 * @param {number} i
 * @param {{largura: number, altura: number, rotação: number}[]} medidas medidas das páginas originais
 * @returns {[number, number]}
 */
export function tamanhoDaBranca(itens, i, medidas) {
  const vizinha = (k) => (k >= 0 && k < itens.length && itens[k].tipo === 'página' ? itens[k] : null);
  const procurar = (passo) => {
    for (let k = i + passo; k >= 0 && k < itens.length; k += passo) if (vizinha(k)) return vizinha(k);
    return null;
  };
  const item = procurar(-1) ?? procurar(1);
  if (!item) return [...A4];
  const { largura, altura, rotação } = medidas[item.origem];
  const deitada = (rotaçãoNormalizada(rotação) + item.giro) % 180 !== 0;
  return deitada ? [altura, largura] : [largura, altura];
}

/**
 * Medidas de todas as páginas do PDF aberto.
 * @param {any} documento
 * @returns {{largura: number, altura: number, rotação: number}[]}
 */
export function medirPáginas(documento) {
  return documento.getPages().map((página) => {
    const { width, height } = página.getSize();
    return { largura: width, altura: height, rotação: rotaçãoNormalizada(página.getRotation().angle) };
  });
}

/* ------------------------------------------------------------------ gravar */

/**
 * Grava o PDF na ordem da lista.
 *
 * Cada vez que a mesma página original aparece de novo (duplicata), ela é copiada numa "rodada" nova:
 * a pdf-lib devolve o MESMO objeto de página quando a mesma página é copiada duas vezes na mesma
 * chamada, e girar uma duplicata giraria a outra junto. Uma chamada por rodada mantém os recursos
 * compartilhados (fontes, imagens) copiados uma vez só no caso comum, sem duplicatas.
 * @param {{documento: any}} aberto PDF já aberto por `abrirPdf`
 * @param {Item[]} itens
 * @param {{biblioteca: {PDFDocument: any, degrees: Function}}} opções
 * @returns {Promise<{ok: true, bytes: Uint8Array, páginas: number} | {ok: false, erro: string, mensagem: string}>}
 */
export async function organizarPdf({ documento }, itens, { biblioteca }) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return { ok: false, erro: 'lista_vazia', mensagem: 'A lista está vazia. Deixe pelo menos uma página.' };
  }
  const total = documento.getPageCount();
  if (itens.length > LIMITE_DE_ITENS || itens.some((item) => item.tipo === 'página' && !(Number.isInteger(item.origem) && item.origem >= 0 && item.origem < total))) {
    return { ok: false, erro: 'lista_inválida', mensagem: mensagemDeErro('falha_ao_montar') };
  }

  try {
    const medidas = medirPáginas(documento);
    const novo = await biblioteca.PDFDocument.create();
    copiarMetadados(documento, novo);

    const vistas = new Map();
    const rodadaDe = itens.map((item) => {
      if (item.tipo !== 'página') return -1;
      const rodada = vistas.get(item.origem) ?? 0;
      vistas.set(item.origem, rodada + 1);
      return rodada;
    });
    const cópias = new Array(itens.length);
    for (let rodada = 0; rodada <= Math.max(...rodadaDe); rodada++) {
      const posições = itens.map((_, i) => i).filter((i) => rodadaDe[i] === rodada);
      if (posições.length === 0) continue;
      const copiadas = await novo.copyPages(documento, posições.map((i) => itens[i].origem));
      posições.forEach((i, k) => { cópias[i] = copiadas[k]; });
    }

    itens.forEach((item, i) => {
      if (item.tipo === 'branca') {
        novo.addPage(tamanhoDaBranca(itens, i, medidas));
        return;
      }
      const página = cópias[i];
      if (item.giro !== 0) página.setRotation(biblioteca.degrees((medidas[item.origem].rotação + item.giro) % 360));
      novo.addPage(página);
    });
    return { ok: true, bytes: await novo.save(), páginas: itens.length };
  } catch {
    return { ok: false, erro: 'falha_ao_montar', mensagem: mensagemDeErro('falha_ao_montar') };
  }
}

/**
 * Extrair texto do PDF: o texto que já está dentro do arquivo, página por página.
 *
 * Quem lê as páginas é o pdf.js (Apache-2.0), que roda no navegador; aqui fica o que não
 * depende dele e dá para testar no Node: reconstruir as linhas a partir dos pedaços de texto,
 * juntar linhas em parágrafos, reconhecer página sem texto (escaneada) e montar o arquivo final.
 * O pdf.js entra por `abrir`, assim o teste usa o de verdade só para ler e a tela usa o mesmo.
 *
 * Só existe texto "de verdade" em PDF feito em programa de texto. PDF escaneado é uma foto da
 * página: não há o que extrair sem OCR, e isto é dito com todas as letras.
 */
import { pareceArquivoPdf, TAMANHO_MÁXIMO_POR_ARQUIVO } from './pdf.js';
import {
  interpretarPáginas, mensagemDeErroDoPdfÚnico, textoDePáginas, LIMITE_DE_PÁGINAS,
} from './pdf-páginas.js';

/** Tamanho do texto de saída; acima disso a página trava ao mostrar e o celular, ao copiar. */
export const LIMITE_DE_CARACTERES = 10_000_000;
/** Quanto do texto aparece na tela; copiar e baixar levam o texto inteiro. */
export const LIMITE_DA_PRÉVIA = 200_000;

export function mensagemDeErroDeExtração(erro, extras = {}) {
  const mensagens = {
    sem_texto: `"${extras.nome ?? 'O arquivo'}" não tem texto para extrair: parece ser um PDF escaneado, em que cada página é uma foto. `
      + 'Para tirar o texto de uma imagem é preciso OCR (reconhecimento de caracteres), que é outra ferramenta e não está nesta.',
    texto_grande: `O texto passou de ${LIMITE_DE_CARACTERES.toLocaleString('pt-BR')} caracteres. Escolha menos páginas em "Páginas".`,
    página_com_erro: `Não foi possível ler o texto da página ${extras.página ?? ''}. O PDF pode ter um defeito nela.`,
    leitor_indisponível: 'Não foi possível carregar o leitor de PDF. Confira a conexão e tente de novo.',
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/* ------------------------------------------------- linhas e parágrafos */

/** Letra ou número de qualquer alfabeto: o que separa "página com texto" de página só com espaços e sinais. */
const TEM_CONTEÚDO = /[\p{L}\p{N}]/u;

/** Caracteres de controle e invisíveis que o pdf.js às vezes devolve e que sujam o texto copiado. */
const INVISÍVEIS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‍⁠﻿]/g;

/** Espaços "especiais" (fixo, fino, ideográfico…) viram o espaço comum. */
const ESPAÇOS_ESPECIAIS = /[   -   　]/g;

/** Limpa um pedaço de texto sem mexer nas letras. */
export function limparTexto(texto) {
  return String(texto ?? '').replace(INVISÍVEIS, '').replace(ESPAÇOS_ESPECIAIS, ' ').normalize('NFC');
}

/**
 * Linhas de uma página a partir dos pedaços de texto do pdf.js (em coordenadas da vista).
 *
 * Um pedaço novo começa outra linha quando o leitor marca fim de linha ou quando a linha de
 * base muda mais que meia altura de letra; dentro da linha, um vazio maior que um quinto da
 * altura vira espaço. A ordem é a do arquivo, que na maioria dos PDFs é a de leitura.
 *
 * @param {{str: string, ox: number, oy: number, ux: number, uy: number, vx: number, vy: number, eol?: boolean}[]} itens
 * @returns {{texto: string, y: number, altura: number}[]}
 */
export function linhasDaPágina(itens) {
  const linhas = [];
  let atual = null;
  const fechar = () => {
    if (atual) {
      const texto = atual.partes.join('').replace(/ {2,}/g, ' ').trim();
      if (texto) linhas.push({ texto, y: atual.y, altura: atual.altura });
    }
    atual = null;
  };

  for (const item of itens) {
    const str = limparTexto(item.str);
    const altura = Math.max(1, Math.hypot(item.vx ?? 0, item.vy ?? 0));
    if (atual && Math.abs(item.oy - atual.y) > 0.5 * Math.max(altura, atual.altura)) fechar();
    if (str !== '') {
      if (!atual) atual = { partes: [], y: item.oy, altura, fimX: item.ox };
      else if (item.ox - atual.fimX > 0.2 * altura && !/\s$/.test(atual.partes.at(-1)) && !/^\s/.test(str)) atual.partes.push(' ');
      atual.partes.push(str);
      atual.fimX = item.ox + (item.ux ?? 0);
      atual.altura = Math.max(atual.altura, altura);
    }
    if (item.eol) fechar();
  }
  fechar();
  return linhas;
}

/**
 * Texto de uma página. Linhas muito distantes ganham uma linha em branco (separam parágrafos).
 * Com `parágrafos`, as linhas de um mesmo bloco são unidas em uma só, e a palavra partida por
 * hífen no fim da linha ("informa-" + "ção") é recomposta.
 *
 * @param {Parameters<typeof linhasDaPágina>[0]} itens
 * @param {{parágrafos?: boolean}} [opções]
 * @returns {string}
 */
export function montarTextoDaPágina(itens, { parágrafos = false } = {}) {
  const linhas = linhasDaPágina(itens);
  const blocos = [];
  let anterior = null;
  for (const linha of linhas) {
    const novoBloco = !anterior || linha.y - anterior.y > 1.7 * Math.max(linha.altura, anterior.altura) || linha.y < anterior.y - 0.5 * linha.altura;
    if (novoBloco) blocos.push([linha.texto]);
    else blocos.at(-1).push(linha.texto);
    anterior = linha;
  }
  const juntar = (bloco) => {
    if (!parágrafos) return bloco.join('\n');
    let saída = bloco[0];
    for (const linha of bloco.slice(1)) {
      // Hífen de quebra de linha: letra, hífen e uma minúscula na linha seguinte. "guarda-chuva" também cai aqui; é o preço de uma regra simples.
      if (/\p{L}-$/u.test(saída) && /^\p{Ll}/u.test(linha)) saída = saída.slice(0, -1) + linha;
      else saída += ` ${linha}`;
    }
    return saída;
  };
  return blocos.map(juntar).join('\n\n');
}

/** A página tem alguma letra ou número? */
export const temConteúdo = (texto) => TEM_CONTEÚDO.test(texto);

const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

/** Texto final, com ou sem o título "Página N" em cima de cada página. */
export function montarTextoFinal(páginas, { títulos = true } = {}) {
  return páginas.map((p) => {
    const corpo = p.vazia ? '[Página sem texto]' : p.texto;
    return títulos ? `--- Página ${p.página} ---\n\n${corpo}` : corpo;
  }).join('\n\n').trim();
}

/**
 * Lê o texto das páginas pedidas.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   abrir: (bytes: Uint8Array) => Promise<{
 *     páginas: number,
 *     texto: (página: number) => Promise<{itens: object[]}>,
 *     fechar: () => void | Promise<void>,
 *   }>,
 *   páginas?: string, parágrafos?: boolean, títulos?: boolean,
 *   aoProgredir?: Function, cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   {ok: true, texto: string, páginas: {página: number, texto: string, caracteres: number, vazia: boolean}[], totalDePáginas: number, semTexto: number[], caracteres: number}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function extrairTextoDoPdf(arquivo, {
  abrir, páginas = '', parágrafos = false, títulos = true, aoProgredir, cancelado,
} = {}) {
  const { nome, bytes } = arquivo;
  const falha = (erro, mais = {}) => ({ ok: false, erro, extras: { nome, ...mais } });
  if (!bytes || bytes.length === 0) return falha('arquivo_vazio');
  if (bytes.length > TAMANHO_MÁXIMO_POR_ARQUIVO) return falha('arquivo_grande_demais');
  if (!pareceArquivoPdf(bytes)) return falha('arquivo_nao_pdf');

  let documento;
  try {
    documento = await abrir(bytes);
  } catch (erro) {
    if (erro?.name === 'PasswordException') return falha('pdf_protegido');
    if (erro?.name === 'LeitorIndisponível') return { ok: false, erro: 'leitor_indisponível' };
    return falha('pdf_corrompido');
  }

  try {
    const total = documento.páginas;
    if (!Number.isInteger(total) || total < 1) return falha('pdf_sem_paginas');
    if (total > LIMITE_DE_PÁGINAS) return falha('pdf_páginas_demais', { total, limite: LIMITE_DE_PÁGINAS });
    const faixa = interpretarPáginas(páginas, total);
    if (!faixa.ok) return faixa;

    const lidas = [];
    let soma = 0;
    for (const [vez, índice] of faixa.índices.entries()) {
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      await folga();
      const página = índice + 1;
      let texto;
      try {
        const { itens } = await documento.texto(página);
        texto = montarTextoDaPágina(itens, { parágrafos });
      } catch (erro) {
        if (erro?.name === 'PasswordException') return falha('pdf_protegido');
        return falha('página_com_erro', { página });
      }
      const vazia = !temConteúdo(texto);
      if (vazia) texto = '';
      soma += texto.length;
      if (soma > LIMITE_DE_CARACTERES) return falha('texto_grande');
      lidas.push({ página, texto, caracteres: texto.replace(/\s/g, '').length, vazia });
      aoProgredir?.({ página: vez + 1, total: faixa.índices.length });
    }
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };

    const semTexto = lidas.filter((p) => p.vazia).map((p) => p.página);
    if (semTexto.length === lidas.length) return falha('sem_texto');
    return {
      ok: true,
      texto: montarTextoFinal(lidas, { títulos }),
      páginas: lidas,
      totalDePáginas: total,
      semTexto,
      caracteres: lidas.reduce((s, p) => s + p.caracteres, 0),
    };
  } finally {
    await documento.fechar?.();
  }
}

/** "3, 5 e 9" a partir de uma lista de páginas, com limite para não virar um parágrafo. */
export function listaDePáginas(números, máximo = 12) {
  const lista = números.slice(0, máximo).join(', ');
  return números.length > máximo ? `${lista}… (${textoDePáginas(números.length)})` : lista;
}

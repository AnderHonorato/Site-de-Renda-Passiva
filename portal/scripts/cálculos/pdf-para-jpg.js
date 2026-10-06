/**
 * PDF para JPG: cada página escolhida vira uma imagem (JPG ou PNG), na resolução pedida.
 *
 * Quem desenha a página é o pdf.js (Apache-2.0), que roda no navegador; aqui fica
 * o que não depende dele e dá para testar no Node: conferir o arquivo, entender
 * as páginas pedidas, calcular o tamanho de cada imagem dentro dos limites do
 * navegador, dar nome às imagens e juntar tudo. O pdf.js e o canvas entram por
 * `abrir`, assim o teste usa um falso e a tela usa o de verdade.
 */
import { pareceArquivoPdf, TAMANHO_MÁXIMO_POR_ARQUIVO } from './pdf.js';
import {
  interpretarPáginas, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS,
} from './pdf-páginas.js';

export const DPI_MÍN = 72;
export const DPI_MÁX = 300;
export const DPI_PADRÃO = 150;
/** Páginas convertidas por vez: cada imagem fica na memória até o ZIP sair. */
export const LIMITE_DE_PÁGINAS_CONVERTIDAS = 200;
/** Maior lado e maior área de uma imagem. Acima disso o canvas falha ou trava o celular. */
export const LADO_MÁXIMO_EM_PIXELS = 8000;
export const PIXELS_MÁXIMOS = 40_000_000;
/** Soma dos arquivos de saída, antes de virarem ZIP. */
export const SAÍDA_MÁXIMA = 400 * 1024 * 1024;
export const QUALIDADES = Object.freeze({ 60: 0.6, 80: 0.8, 95: 0.95 });
export const FORMATOS = Object.freeze({ jpg: { tipo: 'image/jpeg', extensão: 'jpg' }, png: { tipo: 'image/png', extensão: 'png' } });

export function mensagemDeErroDePdfParaImagem(erro, extras = {}) {
  const mensagens = {
    formato_inválido: 'Escolha JPG ou PNG.',
    dpi_inválido: `A resolução vai de ${DPI_MÍN} a ${DPI_MÁX} dpi.`,
    qualidade_inválida: 'Escolha a qualidade da lista: 60, 80 ou 95.',
    páginas_demais: `Dá para converter até ${LIMITE_DE_PÁGINAS_CONVERTIDAS} páginas por vez, e você pediu ${(extras.pedidas ?? 0).toLocaleString('pt-BR')}. Escolha menos páginas em "Páginas".`,
    página_com_erro: `Não foi possível desenhar a página ${extras.página ?? ''}. O PDF pode ter um defeito nela.`,
    saída_grande: 'As imagens passaram de 400 MB juntas. Converta menos páginas ou use uma resolução menor.',
    leitor_indisponível: 'Não foi possível carregar o leitor de PDF. Confira a conexão e tente de novo.',
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/** Zeros à esquerda para a ordem alfabética coincidir com a das páginas: 001, 002, … */
export function nomeDaImagem(base, página, total, extensão) {
  const casas = total > 1 ? Math.max(3, String(total).length) : 0;
  return `${base}-pagina-${casas ? String(página).padStart(casas, '0') : página}.${extensão}`;
}

/**
 * Tamanho em pixels de uma página, dentro dos limites do navegador.
 * @param {number} larguraEmPontos página como aparece (já com a rotação)
 * @param {number} alturaEmPontos
 * @param {number} dpi
 * @returns {{largura: number, altura: number, escala: number, reduzida: boolean}}
 */
export function tamanhoDaImagem(larguraEmPontos, alturaEmPontos, dpi) {
  let escala = dpi / 72;
  const pedida = escala;
  const lado = Math.max(larguraEmPontos, alturaEmPontos) * escala;
  if (lado > LADO_MÁXIMO_EM_PIXELS) escala *= LADO_MÁXIMO_EM_PIXELS / lado;
  const área = larguraEmPontos * alturaEmPontos * escala * escala;
  if (área > PIXELS_MÁXIMOS) escala *= Math.sqrt(PIXELS_MÁXIMOS / área);
  // Arredonda para o pixel mais perto (1240 × 1754 no A4 a 150 dpi); se isso passar do limite por uma fração, trunca.
  let largura = Math.max(1, Math.round(larguraEmPontos * escala));
  let altura = Math.max(1, Math.round(alturaEmPontos * escala));
  if (largura * altura > PIXELS_MÁXIMOS || Math.max(largura, altura) > LADO_MÁXIMO_EM_PIXELS) {
    largura = Math.max(1, Math.floor(larguraEmPontos * escala));
    altura = Math.max(1, Math.floor(alturaEmPontos * escala));
  }
  return {
    largura,
    altura,
    escala,
    reduzida: escala < pedida - 1e-9,
  };
}

const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

/**
 * Converte páginas de PDF em imagens.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   abrir: (bytes: Uint8Array) => Promise<{
 *     páginas: number,
 *     tamanho: (página: number) => Promise<{largura: number, altura: number}>,
 *     desenhar: (página: number, tamanho: {largura: number, altura: number, escala: number}, formato: {tipo: string}, qualidade: number) => Promise<Uint8Array>,
 *     fechar: () => void | Promise<void>,
 *   }>,
 *   formato?: 'jpg'|'png', dpi?: number, qualidade?: 60|80|95, páginas?: string,
 *   aoProgredir?: Function, cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   {ok: true, imagens: {nome: string, bytes: Uint8Array, página: number, largura: number, altura: number}[], páginas: number, reduzidas: number[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function converterPdfEmImagens(arquivo, {
  abrir, formato = 'jpg', dpi = DPI_PADRÃO, qualidade = 80, páginas = '', aoProgredir, cancelado,
} = {}) {
  // Opções primeiro: recusar barato antes de ler um PDF de 100 MB.
  if (!(formato in FORMATOS)) return { ok: false, erro: 'formato_inválido' };
  if (!Number.isInteger(dpi) || dpi < DPI_MÍN || dpi > DPI_MÁX) return { ok: false, erro: 'dpi_inválido' };
  if (formato === 'jpg' && !(qualidade in QUALIDADES)) return { ok: false, erro: 'qualidade_inválida' };

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
    if (faixa.índices.length > LIMITE_DE_PÁGINAS_CONVERTIDAS) return falha('páginas_demais', { pedidas: faixa.índices.length });

    const base = nome.replace(/\.pdf$/i, '') || 'documento';
    const extensão = FORMATOS[formato].extensão;
    const imagens = [];
    const reduzidas = [];
    let soma = 0;
    for (const [vez, índice] of faixa.índices.entries()) {
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      await folga();
      const página = índice + 1;
      let saída;
      let medida;
      try {
        const { largura, altura } = await documento.tamanho(página);
        medida = tamanhoDaImagem(largura, altura, dpi);
        saída = await documento.desenhar(página, medida, FORMATOS[formato], QUALIDADES[qualidade] ?? 0.8);
      } catch (erro) {
        if (erro?.name === 'PasswordException') return falha('pdf_protegido');
        return falha('página_com_erro', { página });
      }
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      soma += saída.length;
      if (soma > SAÍDA_MÁXIMA) return falha('saída_grande');
      if (medida.reduzida) reduzidas.push(página);
      imagens.push({
        nome: nomeDaImagem(base, página, faixa.índices.length, extensão), bytes: saída, página, largura: medida.largura, altura: medida.altura,
      });
      aoProgredir?.({ página: vez + 1, total: faixa.índices.length });
    }
    return { ok: true, imagens, páginas: total, reduzidas };
  } finally {
    await documento.fechar?.();
  }
}

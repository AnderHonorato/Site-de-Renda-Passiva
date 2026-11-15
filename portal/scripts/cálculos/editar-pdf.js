/**
 * Aplicação de anotações sobre PDF. As operações usam pontos no espaço visual
 * da página (origem no alto à esquerda), como a prévia do pdf.js.
 * Sem DOM: bytes e biblioteca são injetados para permitir teste Node real.
 */
import { carregarPdf, geometriaDaPágina, paraEspaçoDoPdf, primeiroCaractereForaDaFonte } from './pdf-páginas.js';
import { conferirImagem } from './imagens-em-pdf.js';

export const LIMITE_DE_PÁGINAS_EDITOR = 100;
export const LIMITE_DE_OPERACOES = 100;
export const LIMITE_DE_IMAGEM_BYTES = 5 * 1024 * 1024;
export const LIMITE_DE_IMAGENS_BYTES = 15 * 1024 * 1024;
export const LIMITE_DE_PIXELS_POR_IMAGEM = 8_000_000;
const MAX_TEXTO = 500;

export function validarOperacoes(ops, total) {
  if (!Array.isArray(ops) || ops.length > LIMITE_DE_OPERACOES) return 'operacoes_demais';
  let totalImagem = 0;
  for (const op of ops) {
    if (!op || !['texto', 'imagem', 'retangulo', 'linha', 'desenho'].includes(op.tipo)) return 'operacao_invalida';
    if (!Number.isInteger(op.pagina) || op.pagina < 1 || op.pagina > total) return 'pagina_invalida';
    if (![op.x, op.y, op.largura, op.altura].every(Number.isFinite) || op.x < 0 || op.y < 0 || op.largura <= 0 || op.altura <= 0) return 'geometria_invalida';
    if (op.tipo === 'texto' && (!String(op.texto ?? '').trim() || String(op.texto).length > MAX_TEXTO || !Number.isFinite(op.tamanho) || op.tamanho < 6 || op.tamanho > 96)) return 'texto_invalido';
    if (op.tipo === 'texto' && primeiroCaractereForaDaFonte(op.texto)) return 'texto_fonte_nao_suportada';
    if (op.tipo === 'imagem') {
      if (!(op.bytes instanceof Uint8Array) || !['png', 'jpg', 'jpeg'].includes(String(op.formato).toLowerCase())) return 'imagem_invalida';
      if (op.bytes.length > LIMITE_DE_IMAGEM_BYTES) return 'imagem_grande';
      const imagemLida = conferirImagem({ nome: 'imagem da anotação', bytes: op.bytes });
      if (!imagemLida.ok || imagemLida.info.tipo !== (['jpg','jpeg'].includes(String(op.formato).toLowerCase()) ? 'jpg' : 'png')) return 'imagem_invalida';
      if (imagemLida.info.largura * imagemLida.info.altura > LIMITE_DE_PIXELS_POR_IMAGEM) return 'imagem_pixels_demais';
      totalImagem += op.bytes.length;
    }
    if (op.tipo === 'desenho' && (!Array.isArray(op.pontos) || op.pontos.length < 2 || op.pontos.length > 5000 || op.pontos.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)))) return 'desenho_invalido';
    if (op.tipo === 'linha' && (!Number.isFinite(op.x2) || !Number.isFinite(op.y2))) return 'geometria_invalida';
    if (op.cor && !/^#[0-9a-f]{6}$/i.test(op.cor)) return 'cor_invalida';
  }
  return totalImagem > LIMITE_DE_IMAGENS_BYTES ? 'imagens_demais' : null;
}

const rgb = (b, hex = '#222222') => {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '222222';
  return b.rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
};

/** @returns {Promise<{ok:boolean,bytes?:Uint8Array,páginas?:number,erro?:string}>} */
export async function aplicarEdiçõesPdf(arquivo, { biblioteca, operações = [], cancelado = () => false, aoProgredir = () => {} } = {}) {
  const abrir = await carregarPdf(arquivo, { biblioteca, limiteDePáginas: LIMITE_DE_PÁGINAS_EDITOR });
  if (!abrir.ok) return abrir;
  const erroOp = validarOperacoes(operações, abrir.páginas);
  if (erroOp) return { ok: false, erro: erroOp };
  const { documento } = abrir;
  const b = biblioteca;
  for (let i = 0; i < operações.length; i++) {
    if (cancelado()) return { ok: false, erro: 'cancelado' };
    const op = operações[i];
    const página = documento.getPage(op.pagina - 1);
    const g = geometriaDaPágina(página);
    if (op.x + op.largura > g.largura + 0.01 || op.y + op.altura > g.altura + 0.01 || (op.tipo === 'linha' && (op.x2 < 0 || op.y2 < 0 || op.x2 > g.largura || op.y2 > g.altura))) return { ok: false, erro: 'geometria_fora_da_pagina' };
    // A âncora é o canto inferior esquerdo visual. Ajuste CropBox e orientação.
    const rot = g.rot;
    const p0 = paraEspaçoDoPdf(g, op.x, g.altura - op.y - op.altura);
    // `rotate` gira o retângulo depois de construído. As dimensões que passamos
    // já estão no espaço visual: trocá-las aqui geraria um segundo swap.
    const width = op.largura;
    const height = op.altura;
    const rotation = b.degrees(rot);
    const opts = { x: p0.x, y: p0.y, width, height, rotate: rotation, color: rgb(b, op.cor), opacity: 1 };
    if (op.tipo === 'texto') {
      const fonte = await documento.embedFont(b.StandardFonts[op.fonte === 'serif' ? 'TimesRoman' : 'Helvetica']);
      página.drawText(String(op.texto).normalize('NFC'), { ...opts, size: op.tamanho, font: fonte, maxWidth: op.largura, lineHeight: op.tamanho * 1.2 });
    } else if (op.tipo === 'imagem') {
      let imagem;
      try { imagem = ['jpg','jpeg'].includes(op.formato.toLowerCase()) ? await documento.embedJpg(op.bytes) : await documento.embedPng(op.bytes); }
      catch { return { ok: false, erro: 'imagem_invalida' }; }
      página.drawImage(imagem, opts);
    } else if (op.tipo === 'retangulo') {
      página.drawRectangle({ ...opts, borderColor: rgb(b, op.cor), borderWidth: Math.max(1, op.espessura ?? 2), color: op.preenchido ? rgb(b, op.cor) : undefined, opacity: op.preenchido ? 0.15 : 0 });
    } else if (op.tipo === 'linha') {
      página.drawLine({ start: paraEspaçoDoPdf(g, op.x, g.altura - op.y), end: paraEspaçoDoPdf(g, op.x2, g.altura - op.y2), thickness: op.espessura ?? 2, color: rgb(b, op.cor) });
    } else if (op.tipo === 'desenho') {
      for (let j = 1; j < op.pontos.length; j++) {
        const [x1,y1] = op.pontos[j-1], [x2,y2] = op.pontos[j];
        página.drawLine({ start: paraEspaçoDoPdf(g, x1, g.altura-y1), end: paraEspaçoDoPdf(g, x2, g.altura-y2), thickness: op.espessura ?? 2, color: rgb(b, op.cor) });
      }
    }
    aoProgredir({ atual: i + 1, total: operações.length });
  }
  if (cancelado()) return { ok: false, erro: 'cancelado' };
  try { return { ok: true, bytes: await documento.save({ useObjectStreams: true }), páginas: abrir.páginas }; }
  catch { return { ok: false, erro: 'salvar_falhou' }; }
}

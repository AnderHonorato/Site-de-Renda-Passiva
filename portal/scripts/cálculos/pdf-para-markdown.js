/** Estrutura texto selecionável de PDF em Markdown. Sem DOM, rede ou execução de HTML. */
import { pareceArquivoPdf } from './pdf.js';
import { interpretarPáginas, mensagemDeErroDoPdfÚnico } from './pdf-páginas.js';
import { linhasDaPágina, temConteúdo } from './extrair-texto-de-pdf.js';

export const LIMITE_BYTES_MARKDOWN = 20 * 1024 * 1024;
export const LIMITE_PÁGINAS_MARKDOWN = 100;
export const LIMITE_TEXTO_MARKDOWN = 1_000_000;
export const LIMITE_PRÉVIA_MARKDOWN = 100_000;

export function mensagemMarkdown(erro, extras = {}) {
  const mensagens = {
    arquivo_grande_demais: 'Escolha um PDF de até 20 MB.',
    texto_grande: 'O texto passou de 1 milhão de caracteres. Escolha menos páginas.',
    sem_texto: 'Não encontrei texto selecionável nessas páginas. Se o PDF é uma digitalização, use OCR de PDF primeiro.',
    página_com_erro: `Não consegui ler a página ${extras.página ?? ''}. Tente uma cópia do PDF ou selecione outras páginas.`,
    leitor_indisponível: 'Não consegui carregar o leitor de PDF. Confira a conexão e tente novamente.',
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/** Escapa conteúdo do PDF: links, imagens e HTML nunca viram conteúdo ativo em um leitor Markdown. */
export function escaparMarkdown(texto) {
  return String(texto).replace(/[\\`*_[\]{}<>|]/g, '\\$&')
    .replace(/^([ \t]*)([#+>\-])/gm, '$1\\$2')
    .replace(/^(\d+)([.)])(?=\s)/gm, '$1\\$2');
}

function alturaDoCorpo(linhas) {
  const pesos = new Map();
  for (const l of linhas) {
    const h = Math.round(l.altura * 2) / 2;
    pesos.set(h, (pesos.get(h) ?? 0) + Math.max(1, l.texto.length));
  }
  return [...pesos].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 12;
}

/** Regras conservadoras. Não tenta reconstruir tabelas, imagens, colunas nem a fonte original. */
export function estruturarLinhas(linhas, { estrutura = true } = {}) {
  const corpo = alturaDoCorpo(linhas);
  const blocos = [];
  let anterior;
  for (const linha of linhas) {
    const texto = linha.texto.trim();
    if (!texto) continue;
    const lista = estrutura && texto.match(/^(?:([•●▪◦‣–-])\s+|(\d{1,4})[.)]\s+)(.+)$/u);
    const razão = linha.altura / corpo;
    const título = estrutura && !lista && texto.length <= 160 && razão >= 1.22;
    const distância = anterior ? linha.y - anterior.y : Infinity;
    const perto = anterior && distância > 0 && distância <= 1.7 * Math.max(linha.altura, anterior.altura);
    if (título) {
      blocos.push({ tipo: 'titulo', nível: razão >= 1.8 ? 1 : razão >= 1.4 ? 2 : 3, texto });
    } else if (lista) {
      const ordenada = Boolean(lista[2]);
      const último = blocos.at(-1);
      const número = Number(lista[2] ?? 1);
      if (último?.tipo === 'lista' && último.ordenada === ordenada && perto
        && (!ordenada || número === último.início + último.itens.length)) último.itens.push(lista[3]);
      else blocos.push({ tipo: 'lista', ordenada, início: número, itens: [lista[3]] });
    } else {
      const último = blocos.at(-1);
      if (último?.tipo === 'paragrafo' && perto) último.texto += ` ${texto}`;
      else blocos.push({ tipo: 'paragrafo', texto });
    }
    anterior = linha;
  }
  return blocos;
}

export function markdownDosBlocos(blocos) {
  return blocos.map((b) => {
    if (b.tipo === 'titulo') return `${'#'.repeat(b.nível)} ${escaparMarkdown(b.texto)}`;
    if (b.tipo === 'lista') return b.itens.map((item, i) => `${b.ordenada ? `${b.início + i}.` : '-'} ${escaparMarkdown(item)}`).join('\n');
    return escaparMarkdown(b.texto);
  }).join('\n\n');
}

export function textoDosBlocos(blocos) {
  return blocos.map((b) => b.tipo === 'lista' ? b.itens.map((s, i) => `${b.ordenada ? `${b.início + i}.` : '•'} ${s}`).join('\n') : b.texto).join('\n\n');
}

/** A abertura entra por parâmetro; testes podem provar regras sem substituir a leitura no navegador. */
export async function converterPdfParaMarkdown({ nome = 'documento.pdf', bytes }, {
  abrir, páginas = '', estrutura = true, separarPáginas = true, cancelado = () => false, aoProgredir,
} = {}) {
  const falha = (erro, extras = {}) => ({ ok: false, erro, extras: { nome, ...extras } });
  if (!(bytes instanceof Uint8Array) || !bytes.length) return falha('arquivo_vazio');
  if (bytes.length > LIMITE_BYTES_MARKDOWN) return falha('arquivo_grande_demais');
  if (!pareceArquivoPdf(bytes)) return falha('arquivo_nao_pdf');
  let doc;
  try { doc = await abrir(bytes); } catch (erro) {
    if (erro?.name === 'PasswordException') return falha('pdf_protegido');
    return falha(erro?.name === 'LeitorIndisponível' ? 'leitor_indisponível' : 'pdf_corrompido');
  }
  try {
    if (!Number.isInteger(doc.páginas) || doc.páginas < 1) return falha('pdf_sem_paginas');
    if (doc.páginas > LIMITE_PÁGINAS_MARKDOWN) return falha('pdf_páginas_demais', { total: doc.páginas, limite: LIMITE_PÁGINAS_MARKDOWN });
    const faixa = interpretarPáginas(páginas, doc.páginas);
    if (!faixa.ok) return faixa;
    const lidas = [];
    let caracteres = 0;
    for (const índice of faixa.índices) {
      if (cancelado()) return falha('cancelado');
      await new Promise((r) => setTimeout(r, 0));
      let itens;
      try { ({ itens } = await doc.texto(índice + 1)); } catch { return falha('página_com_erro', { página: índice + 1 }); }
      const linhas = linhasDaPágina(itens);
      caracteres += linhas.reduce((s, l) => s + l.texto.length, 0);
      if (caracteres > LIMITE_TEXTO_MARKDOWN) return falha('texto_grande');
      const blocos = estruturarLinhas(linhas, { estrutura });
      lidas.push({ página: índice + 1, blocos, vazia: !temConteúdo(textoDosBlocos(blocos)) });
      aoProgredir?.({ página: lidas.length, total: faixa.índices.length });
    }
    if (cancelado()) return falha('cancelado');
    if (lidas.every((p) => p.vazia)) return falha('sem_texto');
    const markdown = lidas.filter((p) => !p.vazia).map((p) => `${separarPáginas ? `<!-- Página ${p.página} -->\n\n` : ''}${markdownDosBlocos(p.blocos)}`).join('\n\n---\n\n') + '\n';
    const texto = lidas.filter((p) => !p.vazia).map((p) => `${separarPáginas ? `Página ${p.página}\n\n` : ''}${textoDosBlocos(p.blocos)}`).join('\n\n') + '\n';
    if (markdown.length > LIMITE_TEXTO_MARKDOWN) return falha('texto_grande');
    return { ok: true, markdown, texto, páginas: lidas, semTexto: lidas.filter((p) => p.vazia).map((p) => p.página), total: doc.páginas, caracteres };
  } finally { await doc.fechar?.(); }
}

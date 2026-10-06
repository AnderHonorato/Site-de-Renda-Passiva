/**
 * Apoio das ferramentas que mexem nas páginas de UM PDF (números de página,
 * marca d'água, recorte, PDF para JPG): abrir o arquivo com segurança, entender
 * "1-3, 5, 8-", achar a área visível de cada página (CropBox e rotação) e
 * escrever por cima ou por baixo do conteúdo existente.
 *
 * Sem DOM. A biblioteca pdf-lib entra por parâmetro, como em `pdf.js`: o teste
 * roda no Node e a página só baixa a biblioteca quando a ferramenta precisa.
 */
import { pareceArquivoPdf, TAMANHO_MÁXIMO_POR_ARQUIVO } from './pdf.js';
import { codificarWinAnsi } from '../comum/pdf/codificar-winansi.js';

/** Páginas que uma ferramenta aceita de uma vez; acima disso a memória do celular não aguenta com folga. */
export const LIMITE_DE_PÁGINAS = 3000;

/** Pontos de PDF por milímetro (72 pontos por polegada). */
const PONTOS_POR_MM = 72 / 25.4;

export const mmParaPt = (mm) => mm * PONTOS_POR_MM;
export const ptParaMm = (pt) => pt / PONTOS_POR_MM;

/** Duas casas, sem erro de ponto flutuante visível (para comparar e para mostrar). */
export const arredondar = (valor, casas = 2) => {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
};

const plural = (n, um, vários) => (n === 1 ? um : vários);
export const textoDePáginas = (n) => `${n.toLocaleString('pt-BR')} ${plural(n, 'página', 'páginas')}`;

/* ------------------------------------------------------------ mensagens */

/**
 * Mensagem para a pessoa a partir do código de erro. Cobre abrir o PDF, a faixa
 * de páginas e as recusas comuns; cada ferramenta acrescenta as suas.
 * @param {string} erro
 * @param {Record<string, any>} [extras]
 * @returns {string}
 */
export function mensagemDeErroDoPdfÚnico(erro, extras = {}) {
  const { nome = 'O arquivo', trecho = '', página = 0, total = 0, limite = LIMITE_DE_PÁGINAS } = extras;
  const mensagens = {
    sem_arquivo: 'Escolha um arquivo PDF.',
    arquivo_vazio: `"${nome}" está vazio (0 bytes).`,
    arquivo_nao_pdf: `"${nome}" não é um PDF de verdade: o conteúdo do arquivo não confere.`,
    arquivo_grande_demais: `"${nome}" passa de 100 MB.`,
    pdf_protegido: `"${nome}" está protegido por senha. Abra no leitor de PDF, salve uma cópia sem proteção e use a cópia.`,
    pdf_corrompido: `Não foi possível ler "${nome}". O arquivo parece estar danificado.`,
    pdf_sem_paginas: `"${nome}" não tem nenhuma página.`,
    pdf_páginas_demais: `"${nome}" tem ${textoDePáginas(total)}. O limite desta ferramenta é ${limite.toLocaleString('pt-BR')}.`,
    faixa_inválida: `Não entendi "${trecho}". Use números e intervalos separados por vírgula, como 1-3, 5, 8-.`,
    faixa_invertida: `O intervalo "${trecho}" está invertido: o primeiro número precisa ser menor ou igual ao segundo.`,
    faixa_fora: `A página ${página} não existe: o PDF tem ${textoDePáginas(total)}.`,
    faixa_zero: 'As páginas começam em 1. A página 0 não existe.',
    faixa_sem_páginas: `Nenhuma página do PDF fica dentro de "${trecho}".`,
    cancelado: 'Operação cancelada. Nenhum arquivo foi gerado.',
  };
  return mensagens[erro] ?? 'Não foi possível processar o PDF.';
}

/* ---------------------------------------------------------- abrir o PDF */

function classificarFalha(erro) {
  return /encrypt/i.test(String(erro?.message ?? erro)) ? 'pdf_protegido' : 'pdf_corrompido';
}

/**
 * Abre um PDF recusando o que não dá para tratar, antes de gastar memória.
 * A ordem importa: vazio, grande demais, assinatura %PDF, leitura (senha ou
 * dano), sem páginas, páginas demais.
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{biblioteca: {PDFDocument: any}, limiteDePáginas?: number}} opções
 * @returns {Promise<
 *   {ok: true, documento: any, páginas: number}
 *   | {ok: false, erro: string, extras: {nome: string, total?: number, limite?: number}}
 * >}
 */
export async function carregarPdf({ nome, bytes }, { biblioteca, limiteDePáginas = LIMITE_DE_PÁGINAS }) {
  const falha = (erro, mais = {}) => ({ ok: false, erro, extras: { nome, ...mais } });
  if (!bytes || bytes.length === 0) return falha('arquivo_vazio');
  if (bytes.length > TAMANHO_MÁXIMO_POR_ARQUIVO) return falha('arquivo_grande_demais');
  if (!pareceArquivoPdf(bytes)) return falha('arquivo_nao_pdf');

  let documento;
  try {
    documento = await biblioteca.PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (erro) {
    return falha(classificarFalha(erro));
  }
  let páginas;
  try {
    páginas = documento.getPageCount();
  } catch {
    return falha('pdf_corrompido');
  }
  if (páginas === 0) return falha('pdf_sem_paginas');
  if (páginas > limiteDePáginas) return falha('pdf_páginas_demais', { total: páginas, limite: limiteDePáginas });
  return { ok: true, documento, páginas };
}

/* ----------------------------------------------------- faixa de páginas */

/**
 * Entende uma faixa de páginas como a pessoa escreve: "1-3, 5, 8-", "-4",
 * "pares", "ímpares". Vazio ou "todas" quer dizer todas as páginas.
 *
 *  - "8-" vai da 8 até a última; "-4" vai da 1 até a 4;
 *  - repetição e sobreposição não duplicam página;
 *  - o resultado sai em ordem crescente, em índices a partir de 0.
 *
 * @param {string} texto
 * @param {number} total páginas do PDF
 * @returns {{ok: true, índices: number[], todas: boolean} | {ok: false, erro: string, extras: object}}
 */
export function interpretarPáginas(texto, total) {
  const todas = Array.from({ length: total }, (_, i) => i);
  // "3 - 5" e "8 -" valem como "3-5" e "8-": o espaço em volta do traço não separa nada.
  const bruto = String(texto ?? '').trim().toLowerCase().normalize('NFC').replace(/\s*([-–—])\s*/g, '$1');
  if (bruto === '' || bruto === 'todas' || bruto === 'todas as páginas') return { ok: true, índices: todas, todas: true };

  const marcadas = new Set();
  for (const pedaço of bruto.split(/[,;\s]+/).filter(Boolean)) {
    if (pedaço === 'pares' || pedaço === 'par') {
      for (let n = 2; n <= total; n += 2) marcadas.add(n - 1);
      continue;
    }
    if (pedaço === 'ímpares' || pedaço === 'impares' || pedaço === 'ímpar' || pedaço === 'impar') {
      for (let n = 1; n <= total; n += 2) marcadas.add(n - 1);
      continue;
    }
    // Aceita o hífen comum e os traços longos que o corretor do celular costuma trocar.
    const intervalo = pedaço.match(/^(\d*)[-–—](\d*)$/);
    const único = pedaço.match(/^\d+$/);
    if (!intervalo && !único) return { ok: false, erro: 'faixa_inválida', extras: { trecho: pedaço } };

    let de;
    let até;
    if (único) {
      de = Number(pedaço);
      até = de;
    } else {
      if (intervalo[1] === '' && intervalo[2] === '') return { ok: false, erro: 'faixa_inválida', extras: { trecho: pedaço } };
      de = intervalo[1] === '' ? 1 : Number(intervalo[1]);
      até = intervalo[2] === '' ? total : Number(intervalo[2]);
    }
    if (!Number.isSafeInteger(de) || !Number.isSafeInteger(até)) return { ok: false, erro: 'faixa_inválida', extras: { trecho: pedaço } };
    if (de === 0 || até === 0) return { ok: false, erro: 'faixa_zero', extras: { trecho: pedaço } };
    if (de > até) return { ok: false, erro: 'faixa_invertida', extras: { trecho: pedaço } };
    if (até > total) return { ok: false, erro: 'faixa_fora', extras: { página: até, total } };
    for (let n = de; n <= até; n++) marcadas.add(n - 1);
  }

  if (marcadas.size === 0) return { ok: false, erro: 'faixa_sem_páginas', extras: { trecho: bruto } };
  const índices = [...marcadas].sort((a, b) => a - b);
  return { ok: true, índices, todas: índices.length === total };
}

/* ------------------------------------------------ geometria da página */

/** /Rotate vira 0, 90, 180 ou 270 (o PDF aceita negativos e múltiplos de 360). */
export function normalizarRotação(graus) {
  const número = Number(graus);
  if (!Number.isFinite(número)) return 0;
  const normal = ((Math.round(número / 90) * 90) % 360 + 360) % 360;
  return normal;
}

/** Lê [x1, y1, x2, y2] de um PDFArray e devolve o retângulo na ordem certa, ou nulo se não prestar. */
function retânguloDe(matriz) {
  if (!matriz || typeof matriz.size !== 'function' || matriz.size() < 4) return null;
  const valores = [0, 1, 2, 3].map((i) => matriz.lookup(i)?.asNumber?.());
  if (valores.some((v) => typeof v !== 'number' || !Number.isFinite(v))) return null;
  const x = Math.min(valores[0], valores[2]);
  const y = Math.min(valores[1], valores[3]);
  const w = Math.abs(valores[2] - valores[0]);
  const h = Math.abs(valores[3] - valores[1]);
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

/** Interseção de dois retângulos {x, y, w, h}; nulo se não se tocam. */
function interseção(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
}

/**
 * Área que a pessoa vê de uma página: CropBox dentro da MediaBox, com a rotação.
 *
 *  - `x, y, w, h`: a área visível no espaço do PDF (origem no canto inferior esquerdo, sem rotação);
 *  - `rot`: 0, 90, 180 ou 270 (sentido horário, como no PDF);
 *  - `largura, altura`: o tamanho como aparece na tela (trocados em 90 e 270).
 *
 * Sem MediaBox legível, vale o A4 (o que os leitores fazem).
 * @param {any} página PDFPage da pdf-lib
 */
export function geometriaDaPágina(página) {
  const media = retânguloDe(página.node.MediaBox?.()) ?? { x: 0, y: 0, w: 595.28, h: 841.89 };
  const corte = retânguloDe(página.node.CropBox?.());
  const visível = (corte && interseção(corte, media)) || media;
  const rot = normalizarRotação(página.node.Rotate?.()?.asNumber?.() ?? 0);
  const girada = rot === 90 || rot === 270;
  return {
    ...visível,
    rot,
    largura: girada ? visível.h : visível.w,
    altura: girada ? visível.w : visível.h,
  };
}

/**
 * Converte um ponto da página como aparece (origem no canto inferior esquerdo
 * visual, y para cima) para o espaço do PDF. A mesma conta vale para o ângulo
 * de um texto que precisa ficar legível: ele gira `rot` graus no espaço do PDF.
 * @param {ReturnType<typeof geometriaDaPágina>} g
 * @param {number} vx
 * @param {number} vy
 * @returns {{x: number, y: number}}
 */
export function paraEspaçoDoPdf(g, vx, vy) {
  switch (g.rot) {
    case 90: return { x: g.x + g.w - vy, y: g.y + vx };
    case 180: return { x: g.x + g.w - vx, y: g.y + g.h - vy };
    case 270: return { x: g.x + vy, y: g.y + g.h - vx };
    default: return { x: g.x + vx, y: g.y + vy };
  }
}

/* ------------------------------------------- escrever na página (camadas) */

/**
 * Coloca operadores de desenho na página, por cima ou por baixo do que já existe.
 *
 * O fluxo próprio vem embrulhado em guardar/restaurar estado gráfico por quem o
 * monta (os operadores de `drawText` e `drawImage` da pdf-lib já fazem isso).
 * Por cima, o conteúdo antigo é embrulhado antes (a pdf-lib faz ao normalizar):
 * sem isso, um PDF que deixa a matriz de transformação torta desloca o que
 * escrevemos.
 *
 * @param {any} documento PDFDocument
 * @param {any} página PDFPage
 * @param {any[]} operadores operadores da pdf-lib
 * @param {'acima'|'abaixo'} [camada]
 */
export function inserirOperadores(documento, página, operadores, camada = 'acima') {
  página.node.normalize();
  const fluxo = documento.context.contentStream(operadores);
  const ref = documento.context.register(fluxo);
  if (camada === 'abaixo') {
    const conteúdo = página.node.Contents();
    if (conteúdo && typeof conteúdo.insert === 'function') {
      conteúdo.insert(0, ref);
      return;
    }
  }
  página.node.addContentStream(ref);
}

/* ------------------------------------------------------------- texto */

/**
 * Primeiro caractere que a fonte padrão do PDF (WinAnsi) não tem, ou nulo.
 * As fontes padrão cobrem letras com acento do português, cedilha, aspas e
 * pontuação comum; não cobrem setas, emojis, letras gregas ou asiáticas.
 * @param {string} texto
 * @returns {string|null}
 */
export function primeiroCaractereForaDaFonte(texto) {
  for (const caractere of String(texto ?? '').normalize('NFC')) {
    if (/[\t\r\n]/.test(caractere)) continue;
    if (codificarWinAnsi(caractere).substituídos > 0) return caractere;
  }
  return null;
}

/** Cores prontas das ferramentas (a pessoa escolhe pelo nome; valores de 0 a 1). */
export const CORES = Object.freeze({
  preto: [0, 0, 0],
  cinza: [0.45, 0.45, 0.45],
  vermelho: [0.78, 0.1, 0.1],
  azul: [0.1, 0.25, 0.75],
  verde: [0.1, 0.5, 0.2],
});

/** Fontes padrão do PDF, sem arquivo de fonte embutido: chave → nome na pdf-lib. */
export const FONTES = Object.freeze({
  helvetica: 'Helvetica',
  'helvetica-negrito': 'HelveticaBold',
  times: 'TimesRoman',
  'times-negrito': 'TimesRomanBold',
  courier: 'Courier',
});

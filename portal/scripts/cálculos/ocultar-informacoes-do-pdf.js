/**
 * Ocultar informações do PDF: tarja preta que APAGA de verdade.
 *
 * Tarja que só cobre o texto vaza: quem abrir o arquivo copia o texto de baixo da tarja. Aqui,
 * cada página afetada é DESENHADA como imagem (pdf.js), a tarja é pintada na imagem, e o PDF de
 * saída é montado do zero com a imagem no lugar da página. A página de saída não tem texto,
 * fontes nem camadas: o que estava escrito não existe mais no arquivo. As páginas que nada
 * pediu para ocultar são copiadas como estão (continuam com texto selecionável).
 *
 * Garantias e como são conferidas (na hora e nos testes):
 *  - a saída é um documento NOVO: título, autor, assuntos, marcadores, anexos e campos do original
 *    não vão junto, e os comentários e links das páginas copiadas são tirados;
 *  - antes de entregar, a saída é aberta de novo: nenhuma página rasterizada pode ter fonte,
 *    operador de texto, e o leitor de PDF não pode achar nenhuma letra nela. Se achar, não há arquivo.
 *
 * O que NÃO se garante: achar o texto. A busca vale para o texto que o PDF guarda; texto dentro de
 * imagem (escaneado) só se oculta marcando a área à mão. A posição de cada trecho é estimada
 * (o PDF não diz onde fica cada letra); por isso a tarja ganha uma folga e a tela mostra uma prévia.
 *
 * Sem DOM: o pdf.js e a pdf-lib entram por parâmetro.
 */
import { pareceArquivoPdf, TAMANHO_MÁXIMO_POR_ARQUIVO } from './pdf.js';
import {
  carregarPdf, interpretarPáginas, mensagemDeErroDoPdfÚnico, textoDePáginas, LIMITE_DE_PÁGINAS,
} from './pdf-páginas.js';
import { tamanhoDaImagem, SAÍDA_MÁXIMA } from './pdf-para-jpg.js';

/** Páginas que viram imagem de uma vez: cada imagem fica na memória até o PDF sair. */
export const LIMITE_DE_PÁGINAS_OCULTADAS = 200;
export const DPIS = Object.freeze([150, 200, 300]);
export const DPI_PADRÃO = 200;
export const QUALIDADE_DO_JPEG = 0.9;
export const LIMITE_DE_TERMOS = 50;
export const LIMITE_DO_TERMO = 200;
export const LIMITE_DE_ACHADOS = 2000;
export const LIMITE_DE_RETÂNGULOS = 20_000;
/** Folga mínima da tarja em volta do trecho achado, em pontos. */
export const FOLGA_MÍNIMA = 2;
export const CORES_DA_TARJA = Object.freeze({ preto: '#000000', 'cinza-escuro': '#3a3a3a', branco: '#ffffff' });
const FORMATO_JPEG = Object.freeze({ tipo: 'image/jpeg', extensão: 'jpg' });

export function mensagemDeErroDeOcultação(erro, extras = {}) {
  const mensagens = {
    sem_critério: 'Escreva o que procurar (uma palavra ou frase por linha) ou marque um tipo de dado, como CPF ou e-mail.',
    termos_demais: `Dá para procurar até ${LIMITE_DE_TERMOS} termos de uma vez.`,
    termo_longo: `Cada termo pode ter até ${LIMITE_DO_TERMO} caracteres.`,
    achados_demais: `Foram achados mais de ${LIMITE_DE_ACHADOS.toLocaleString('pt-BR')} trechos. Procure por algo mais específico ou escolha menos páginas.`,
    nada_para_ocultar: 'Nada foi marcado para ocultar. Procure o texto, desenhe uma área na prévia ou escolha páginas inteiras.',
    dpi_inválido: `Escolha a resolução da lista: ${DPIS.join(', ')} dpi.`,
    cor_inválida: 'Escolha uma cor de tarja da lista.',
    tarja_inválida: 'Uma das áreas marcadas não é válida. Desenhe-a de novo na prévia.',
    tarjas_demais: 'Há áreas marcadas demais. Remova algumas e tente de novo.',
    páginas_demais_ocultar: `Dá para transformar até ${LIMITE_DE_PÁGINAS_OCULTADAS} páginas em imagem por vez, e ${(extras.pedidas ?? 0).toLocaleString('pt-BR')} foram afetadas. Oculte menos páginas ou divida o PDF antes.`,
    página_com_erro: `Não foi possível desenhar a página ${extras.página ?? ''}. O PDF pode ter um defeito nela. Nenhum arquivo foi gerado, porque a página não pode ficar sem a tarja.`,
    saída_grande: 'As imagens passaram de 400 MB juntas. Oculte menos páginas ou use uma resolução menor.',
    verificação_falhou: `A conferência final achou texto na página ${extras.página ?? ''} do arquivo gerado. Por segurança, nenhum arquivo foi entregue.`,
    leitor_indisponível: 'Não foi possível carregar o leitor de PDF. Confira a conexão e tente de novo.',
  };
  return mensagens[erro] ?? mensagemDeErroDoPdfÚnico(erro, extras);
}

/* ------------------------------------------------- validação de números */

const soDigitos = (texto) => texto.replace(/\D/g, '');

export function validarCpf(texto) {
  const d = soDigitos(texto);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dígito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dígito(9) === Number(d[9]) && dígito(10) === Number(d[10]);
}

export function validarCnpj(texto) {
  const d = soDigitos(texto);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dígito = (n) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dígito(12) === Number(d[12]) && dígito(13) === Number(d[13]);
}

/** Algoritmo de Luhn: o dígito de controle dos números de cartão. */
export function passaNoLuhn(texto) {
  const d = soDigitos(texto);
  if (d.length < 13 || d.length > 19 || /^(\d)\1+$/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    soma += n;
  }
  return soma % 10 === 0;
}

function dataPlausível(texto) {
  const [dia, mês] = texto.split('/').map(Number);
  return dia >= 1 && dia <= 31 && mês >= 1 && mês <= 12;
}

/**
 * Tipos de dado que dão para achar por forma. Cada um traz a expressão e a conferência; a ordem
 * é a de prioridade quando dois tipos acham o mesmo trecho (CNPJ antes de CPF, cartão antes de telefone).
 * Dígitos de controle inválidos NÃO são marcados: "123.456.789-00" não é um CPF.
 */
export const EXPRESSÕES = Object.freeze({
  cnpj: { rótulo: 'CNPJ', padrão: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, confere: validarCnpj, bordaDeNúmero: true },
  cpf: { rótulo: 'CPF', padrão: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, confere: validarCpf, bordaDeNúmero: true },
  cartão: { rótulo: 'Cartão', padrão: /(?:\d[ -]?){12,18}\d/g, confere: passaNoLuhn, bordaDeNúmero: true },
  telefone: {
    rótulo: 'Telefone',
    padrão: /(?:\+55[ ]?)?(?:\(\d{2}\)[ ]?|\d{2}[ ])9?\d{4}[- ]?\d{4}|9?\d{4}-\d{4}/g,
    confere: (t) => { const n = soDigitos(t).replace(/^55(?=\d{10,11}$)/, ''); return n.length >= 8 && n.length <= 11; },
    bordaDeNúmero: true,
  },
  cep: { rótulo: 'CEP', padrão: /\d{5}-\d{3}/g, confere: () => true, bordaDeNúmero: true },
  email: { rótulo: 'E-mail', padrão: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, confere: () => true, bordaDeNúmero: false },
  data: { rótulo: 'Data', padrão: /\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2})/g, confere: dataPlausível, bordaDeNúmero: true },
});

/* ---------------------------------------------------- texto da página */

/** Larguras (em milésimos de em) da Helvetica: o que a maioria dos PDFs usa e boa aproximação das outras sem serifa. */
const LARGURAS = (() => {
  const t = new Map();
  const grupo = (letras, largura) => { for (const c of letras) t.set(c, largura); };
  grupo(' .,:;!/\\tfI', 278); grupo("il|jJ'", 222); grupo('"', 355); grupo('()[]{}r-', 333); grupo('mM', 833); grupo('w', 722); grupo('W', 944);
  grupo('ckvxyzsJ_', 500); grupo('ABEKPSVXY', 667); grupo('CDHNRUw', 722); grupo('GOQ', 778); grupo('F', 611); grupo('TZ', 611); grupo('L', 556);
  grupo('@', 1015); grupo('%', 889); grupo('&', 667); grupo('+=<>~', 584); grupo('#$0123456789?abdeghnopqu', 556);
  return t;
})();

/** Larguras da Times-Roman, para fonte com serifa. */
const LARGURAS_COM_SERIFA = (() => {
  const t = new Map();
  const grupo = (letras, largura) => { for (const c of letras) t.set(c, largura); };
  grupo(' .,', 250); grupo(':;/\\ijl', 278); grupo('t', 278); grupo('fI!()[]{}-r', 333); grupo('s', 389); grupo('J', 389); grupo('"', 408); grupo("'", 180);
  grupo('acez?', 444); grupo('bdghknopquvxy0123456789#$_', 500); grupo('+=<>~', 564); grupo('m', 778); grupo('w', 722); grupo('W', 944); grupo('@', 921); grupo('%', 833); grupo('&', 778);
  grupo('ABCDHKNORUVXY', 722); grupo('CP', 667); grupo('EGLTZ', 611); grupo('FS', 556); grupo('M', 889); grupo('|', 200);
  grupo('AB', 722); grupo('B', 667); grupo('G', 722); grupo('C', 667); grupo('D', 722); grupo('E', 611); grupo('F', 556); grupo('L', 611); grupo('P', 556); grupo('Q', 722); grupo('R', 667); grupo('S', 556); grupo('T', 611); grupo('Z', 611);
  return t;
})();

/** Peso (largura relativa) de um caractere; letras acentuadas valem como a letra base. */
function pesoDoCaractere(c, comSerifa = false) {
  const tabela = comSerifa ? LARGURAS_COM_SERIFA : LARGURAS;
  const direto = tabela.get(c);
  if (direto !== undefined) return direto;
  const base = c.normalize('NFD')[0];
  return tabela.get(base) ?? (comSerifa ? 500 : 556);
}

const pontosDe = (texto) => Array.from(String(texto ?? '').normalize('NFC'));

/**
 * Texto corrido de uma página, com o mapa de cada caractere para o pedaço de texto de onde veio.
 * Entre pedaços da mesma linha entra um espaço se houver vazio; entre linhas, uma quebra. Esses
 * separadores não pertencem a nenhum pedaço (mapa nulo), então não entram nas tarjas.
 * @param {{str: string, ox: number, oy: number, ux: number, uy: number, vx: number, vy: number, eol?: boolean}[]} itens
 * @returns {{pontos: string[], mapa: ({item: number, k: number} | null)[]}}
 */
export function textoCorridoDaPágina(itens) {
  const pontos = [];
  const mapa = [];
  let anterior = null;
  for (const [i, item] of itens.entries()) {
    const altura = Math.max(1, Math.hypot(item.vx ?? 0, item.vy ?? 0));
    const cs = pontosDe(item.str);
    if (anterior && cs.length) {
      if (Math.abs(item.oy - anterior.oy) > 0.5 * altura) { pontos.push('\n'); mapa.push(null); } else if (item.ox - (anterior.ox + anterior.ux) > 0.2 * altura) { pontos.push(' '); mapa.push(null); }
    }
    cs.forEach((c, k) => { pontos.push(c); mapa.push({ item: i, k }); });
    if (cs.length) anterior = item;
    if (item.eol && cs.length) { pontos.push('\n'); mapa.push(null); anterior = null; }
  }
  return { pontos, mapa };
}

/** Caractere sem acento e em minúsculas, na medida em que a opção pede; sempre um caractere só (o primeiro). */
function dobrar(c, { ignorarCaixa, ignorarAcentos }) {
  let r = c;
  if (ignorarAcentos) {
    const sem = r.normalize('NFD').replace(/\p{M}/gu, '');
    if (sem) r = sem;
  }
  if (ignorarCaixa) r = r.toLocaleLowerCase('pt-BR');
  return Array.from(r)[0] ?? c;
}

/**
 * Retângulos (pontos, na página como aparece) que cobrem os caracteres [início, fim) do texto corrido.
 * A posição de cada caractere é estimada pela largura relativa das letras (partes iguais em fonte
 * monoespaçada), e a tarja ganha folga: no mínimo `FOLGA_MÍNIMA` pontos ou 60% da largura média de uma letra.
 * Com `coberturaTotal`, cobre o pedaço de texto inteiro.
 */
export function retângulosDoTrecho(itens, mapa, início, fim, { coberturaTotal = false } = {}) {
  const porItem = new Map();
  for (let p = início; p < fim; p++) {
    const m = mapa[p];
    if (!m) continue;
    const atual = porItem.get(m.item);
    if (atual) { atual.de = Math.min(atual.de, m.k); atual.até = Math.max(atual.até, m.k); } else porItem.set(m.item, { de: m.k, até: m.k });
  }
  const retângulos = [];
  for (const [índice, { de, até }] of porItem) {
    const item = itens[índice];
    const cs = pontosDe(item.str);
    const L = cs.length;
    const comprimento = Math.hypot(item.ux, item.uy);
    const altura = Math.max(1, Math.hypot(item.vx, item.vy));
    // Sem largura conhecida, assume meia altura por letra (melhor um palpite generoso que nenhuma tarja).
    const total = comprimento > 0 ? comprimento : (altura * L) / 2;
    const [dx, dy] = comprimento > 0 ? [item.ux / comprimento, item.uy / comprimento] : [1, 0];
    const [cx, cy] = Math.hypot(item.vx, item.vy) > 0 ? [item.vx / altura, item.vy / altura] : [0, -1];

    let fa = 0;
    let fb = 1;
    if (!coberturaTotal) {
      const pesos = cs.map((c) => (item.mono ? 1 : pesoDoCaractere(c, item.serif === true)));
      const soma = pesos.reduce((s, n) => s + n, 0) || 1;
      let antes = 0;
      for (let k = 0; k < de; k++) antes += pesos[k];
      let dentro = antes;
      for (let k = de; k <= até; k++) dentro += pesos[k];
      fa = antes / soma;
      fb = dentro / soma;
      // Folga: o maior entre o mínimo, 60% de uma letra média e 3% do pedaço (a estimativa pelas larguras
      // de uma fonte-modelo erra um pouco a mais quanto mais longe do começo, em fontes que não são a modelo).
      const folga = (item.mono ? Math.max(FOLGA_MÍNIMA, 0.6 * (total / L)) : Math.max(FOLGA_MÍNIMA, 0.6 * (total / L), 0.03 * total)) / total;
      fa -= folga;
      fb += folga;
    } else {
      const folga = FOLGA_MÍNIMA / total;
      fa -= folga;
      fb += folga;
    }
    const a = fa * total;
    const b = fb * total;
    const abaixo = -0.3 * altura;
    const acima = 1.15 * altura;
    // Os quatro cantos do retângulo (ao longo da linha e para cima), e a caixa que os contém.
    const cantos = [[a, abaixo], [b, abaixo], [a, acima], [b, acima]].map(([s, t]) => [item.ox + dx * s + cx * t, item.oy + dy * s + cy * t]);
    const xs = cantos.map((c) => c[0]);
    const ys = cantos.map((c) => c[1]);
    retângulos.push({ x: Math.min(...xs), y: Math.min(...ys), largura: Math.max(...xs) - Math.min(...xs), altura: Math.max(...ys) - Math.min(...ys) });
  }
  return retângulos;
}

/** Fecha o texto de uma lista de termos: uma frase por linha, sem repetição nem linhas vazias. */
export function termosDe(texto) {
  const vistos = new Set();
  const lista = [];
  for (const linha of String(texto ?? '').split(/\r?\n/)) {
    const termo = linha.normalize('NFC').trim();
    if (termo && !vistos.has(termo)) { vistos.add(termo); lista.push(termo); }
  }
  return lista;
}

const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Acha termos e tipos de dado no texto de uma página.
 *
 * @param {{str: string}[]} itens pedaços de texto da página, em coordenadas da vista
 * @param {{
 *   termos?: string[], expressões?: string[], ignorarCaixa?: boolean, ignorarAcentos?: boolean, coberturaTotal?: boolean,
 * }} opções
 * @returns {{tipo: string, rótulo: string, texto: string, retângulos: object[]}[]} em ordem de leitura
 */
export function acharNaPágina(itens, { termos = [], expressões = [], ignorarCaixa = true, ignorarAcentos = true, coberturaTotal = false } = {}) {
  const { pontos, mapa } = textoCorridoDaPágina(itens);
  if (pontos.length === 0) return [];
  const dobrados = pontos.map((c) => dobrar(c, { ignorarCaixa, ignorarAcentos }));
  // Posição (em unidades de código) de cada caractere dobrado, para voltar do índice da regex ao caractere.
  const cuDe = new Int32Array(dobrados.length + 1);
  let cu = 0;
  for (let i = 0; i < dobrados.length; i++) { cuDe[i] = cu; cu += dobrados[i].length; }
  cuDe[dobrados.length] = cu;
  const cpDe = new Map();
  for (let i = 0; i <= dobrados.length; i++) cpDe.set(cuDe[i], i);
  const texto = dobrados.join('');

  const achados = [];
  const registrar = (tipo, rótulo, de, até) => {
    const início = cpDe.get(de);
    const fim = cpDe.get(até);
    if (início === undefined || fim === undefined || fim <= início) return;
    if (!mapa.slice(início, fim).some(Boolean)) return;
    achados.push({ tipo, rótulo, início, fim });
  };

  // Tipos de dado primeiro (têm prioridade sobre termos escritos pela pessoa).
  for (const chave of Object.keys(EXPRESSÕES)) {
    if (!expressões.includes(chave)) continue;
    const { padrão, confere, rótulo, bordaDeNúmero } = EXPRESSÕES[chave];
    const regex = new RegExp(padrão.source, padrão.flags.includes('u') ? 'giu' : 'gi');
    for (const m of texto.matchAll(regex)) {
      const de = m.index;
      const até = de + m[0].length;
      if (bordaDeNúmero && (/\d/.test(texto[de - 1] ?? '') || /\d/.test(texto[até] ?? ''))) continue;
      if (!confere(m[0])) continue;
      registrar(chave, rótulo, de, até);
    }
  }
  for (const termo of termos) {
    const dobrado = pontosDe(termo).map((c) => dobrar(c, { ignorarCaixa, ignorarAcentos })).join('');
    const padrão = escaparRegex(dobrado.trim()).replace(/\s+/g, '\\s+');
    if (!padrão) continue;
    for (const m of texto.matchAll(new RegExp(padrão, 'gu'))) registrar('termo', 'Termo', m.index, m.index + m[0].length);
  }

  // Um achado dentro de outro (o CPF dentro de um termo maior, por exemplo) não precisa aparecer duas vezes.
  achados.sort((a, b) => a.início - b.início || b.fim - a.fim);
  const únicos = [];
  for (const a of achados) {
    if (únicos.some((u) => a.início >= u.início && a.fim <= u.fim)) continue;
    únicos.push(a);
  }
  return únicos.map((a) => ({
    tipo: a.tipo,
    rótulo: a.rótulo,
    texto: pontos.slice(a.início, a.fim).join('').replace(/\s+/g, ' ').trim(),
    retângulos: retângulosDoTrecho(itens, mapa, a.início, a.fim, { coberturaTotal }),
  }));
}

const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

/**
 * Procura nas páginas do PDF.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   abrir: Function, termos?: string[], expressões?: string[], ignorarCaixa?: boolean, ignorarAcentos?: boolean, coberturaTotal?: boolean,
 *   páginas?: string, aoProgredir?: Function, cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   {ok: true, achados: {id: number, página: number, tipo: string, rótulo: string, texto: string, retângulos: object[]}[], totalDePáginas: number, páginasSemTexto: number[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function procurarNoPdf(arquivo, {
  abrir, termos = [], expressões = [], ignorarCaixa = true, ignorarAcentos = true, coberturaTotal = false, aoProgredir, cancelado,
} = {}) {
  if (termos.length === 0 && expressões.length === 0) return { ok: false, erro: 'sem_critério' };
  if (termos.length > LIMITE_DE_TERMOS) return { ok: false, erro: 'termos_demais' };
  if (termos.some((t) => t.length > LIMITE_DO_TERMO)) return { ok: false, erro: 'termo_longo' };
  if (expressões.some((e) => !(e in EXPRESSÕES))) return { ok: false, erro: 'sem_critério' };

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
    const achados = [];
    const páginasSemTexto = [];
    for (let página = 1; página <= total; página++) {
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      await folga();
      let itens;
      try {
        ({ itens } = await documento.texto(página));
      } catch (erro) {
        if (erro?.name === 'PasswordException') return falha('pdf_protegido');
        return falha('página_com_erro', { página });
      }
      if (!itens.some((i) => /\S/.test(i.str))) páginasSemTexto.push(página);
      for (const a of acharNaPágina(itens, { termos, expressões, ignorarCaixa, ignorarAcentos, coberturaTotal })) {
        achados.push({ id: achados.length, página, ...a });
        if (achados.length > LIMITE_DE_ACHADOS) return falha('achados_demais');
      }
      aoProgredir?.({ página, total });
    }
    return { ok: true, achados, totalDePáginas: total, páginasSemTexto };
  } finally {
    await documento.fechar?.();
  }
}

/* --------------------------------------------------------- ocultar */

/** Chaves da página que podem guardar texto ou dados fora do desenho; tiradas das páginas copiadas. */
const CHAVES_DA_PÁGINA_A_TIRAR = ['Annots', 'Metadata', 'PieceInfo', 'Thumb', 'B', 'AA', 'LastModified', 'SeparationInfo', 'StructParents'];

/** Conteúdo (descomprimido) de todos os fluxos de uma página, como texto. */
function conteúdoDaPágina(documento, página, b) {
  const conteúdo = página.node.Contents();
  const fluxos = conteúdo instanceof b.PDFArray ? conteúdo.asArray().map((ref) => documento.context.lookup(ref)) : [conteúdo];
  return fluxos.filter(Boolean).map((fluxo) => {
    const bytes = fluxo instanceof b.PDFRawStream ? b.decodePDFRawStream(fluxo).decode() : fluxo.getUnencodedContents();
    return new TextDecoder('latin1').decode(bytes);
  }).join('\n');
}

/** A página de saída tem texto? Só passa se não houver fonte, nem operador de texto, nem arquivo de texto embutido. */
function páginaTemTexto(documento, página, b) {
  const recursos = página.node.Resources();
  const fontes = recursos?.lookup(b.PDFName.of('Font'));
  if (fontes && fontes.keys().length > 0) return true;
  const conteúdo = conteúdoDaPágina(documento, página, b);
  return /(^|\s)BT(\s|$)|\)\s*Tj|\]\s*TJ|>\s*Tj/.test(conteúdo);
}

/**
 * Oculta o que foi marcado.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   abrir: Function, biblioteca: any,
 *   retângulos?: {página: number, x: number, y: number, largura: number, altura: number}[],
 *   páginasInteiras?: string, cor?: string, dpi?: number,
 *   aoProgredir?: (p: {página: number, total: number}) => void, cancelado?: () => boolean,
 * }} opções `retângulos` em pontos, na página como aparece (canto superior esquerdo = 0, 0)
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, páginas: number, ocultadas: number[], copiadas: number[], tarjas: number, reduzidas: number[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function ocultarInformações(arquivo, {
  abrir, biblioteca, retângulos = [], páginasInteiras = '', cor = 'preto', dpi = DPI_PADRÃO, aoProgredir, cancelado,
} = {}) {
  // Opções primeiro: recusar barato antes de abrir um PDF de 100 MB.
  if (!DPIS.includes(dpi)) return { ok: false, erro: 'dpi_inválido' };
  if (!(cor in CORES_DA_TARJA)) return { ok: false, erro: 'cor_inválida' };
  if (!Array.isArray(retângulos)) return { ok: false, erro: 'tarja_inválida' };
  if (retângulos.length > LIMITE_DE_RETÂNGULOS) return { ok: false, erro: 'tarjas_demais' };
  for (const r of retângulos) {
    const ok = r && Number.isInteger(r.página) && r.página >= 1 && [r.x, r.y, r.largura, r.altura].every(Number.isFinite) && r.largura > 0 && r.altura > 0;
    if (!ok) return { ok: false, erro: 'tarja_inválida' };
  }

  const aberto = await carregarPdf(arquivo, { biblioteca });
  if (!aberto.ok) return aberto;
  const { documento: original, páginas: total } = aberto;
  const inteiras = faixaOuNenhuma(páginasInteiras, total);
  if (!inteiras.ok) return inteiras;
  if (retângulos.some((r) => r.página > total)) return { ok: false, erro: 'tarja_inválida' };

  const porPágina = new Map();
  for (const r of retângulos) {
    if (!porPágina.has(r.página)) porPágina.set(r.página, []);
    porPágina.get(r.página).push({ x: r.x, y: r.y, largura: r.largura, altura: r.altura });
  }
  const afetadas = new Set([...porPágina.keys(), ...inteiras.índices.map((i) => i + 1)]);
  if (afetadas.size === 0) return { ok: false, erro: 'nada_para_ocultar' };
  if (afetadas.size > LIMITE_DE_PÁGINAS_OCULTADAS) return { ok: false, erro: 'páginas_demais_ocultar', extras: { pedidas: afetadas.size } };
  const páginasInteirasSet = new Set(inteiras.índices.map((i) => i + 1));

  let leitor;
  try {
    leitor = await abrir(arquivo.bytes);
  } catch (erro) {
    if (erro?.name === 'PasswordException') return { ok: false, erro: 'pdf_protegido', extras: { nome: arquivo.nome } };
    if (erro?.name === 'LeitorIndisponível') return { ok: false, erro: 'leitor_indisponível' };
    return { ok: false, erro: 'pdf_corrompido', extras: { nome: arquivo.nome } };
  }

  try {
    if (leitor.páginas !== total) return { ok: false, erro: 'pdf_corrompido', extras: { nome: arquivo.nome } };
    const b = biblioteca;
    const saída = await b.PDFDocument.create();
    saída.setProducer('Portal de Ferramentas');
    saída.setCreator('Portal de Ferramentas');

    // As páginas que ninguém pediu para ocultar são copiadas de uma vez (recursos compartilhados saem uma vez só).
    const aCopiar = [];
    for (let n = 1; n <= total; n++) if (!afetadas.has(n)) aCopiar.push(n - 1);
    // Os comentários, campos e dados soltos saem das páginas ANTES da cópia (o original só existe em memória aqui):
    // depois de copiados, ficariam no arquivo como objetos soltos, fora de qualquer página, mas dentro do arquivo.
    for (const índice of aCopiar) for (const chave of CHAVES_DA_PÁGINA_A_TIRAR) original.getPage(índice).node.delete(b.PDFName.of(chave));
    const cópias = aCopiar.length ? await saída.copyPages(original, aCopiar) : [];
    const cópiaDe = new Map(aCopiar.map((índice, i) => [índice + 1, cópias[i]]));

    const ocultadas = [];
    const copiadas = [];
    const reduzidas = [];
    let soma = 0;
    let tarjas = 0;
    for (let n = 1; n <= total; n++) {
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      if (!afetadas.has(n)) {
        saída.addPage(cópiaDe.get(n));
        copiadas.push(n);
        continue;
      }
      await folga();
      let imagem;
      let largura;
      let altura;
      try {
        ({ largura, altura } = await leitor.tamanho(n));
        const medida = tamanhoDaImagem(largura, altura, dpi);
        if (medida.reduzida) reduzidas.push(n);
        // Página inteira = uma tarja do tamanho da página. As outras são cortadas para dentro da página.
        const lista = páginasInteirasSet.has(n)
          ? [{ x: 0, y: 0, largura, altura }]
          : (porPágina.get(n) ?? []).map((t) => recortarNaPágina(t, largura, altura)).filter(Boolean);
        tarjas += lista.length;
        imagem = await leitor.desenharComTarjas(n, medida, lista, CORES_DA_TARJA[cor], FORMATO_JPEG, QUALIDADE_DO_JPEG);
      } catch (erro) {
        if (erro?.name === 'PasswordException') return { ok: false, erro: 'pdf_protegido', extras: { nome: arquivo.nome } };
        // Sem imagem não há tarja: a página original NUNCA vai no lugar dela.
        return { ok: false, erro: 'página_com_erro', extras: { página: n } };
      }
      if (cancelado?.()) return { ok: false, erro: 'cancelado' };
      soma += imagem.length;
      if (soma > SAÍDA_MÁXIMA) return { ok: false, erro: 'saída_grande' };
      let incorporada;
      try {
        incorporada = await saída.embedJpg(imagem);
      } catch {
        return { ok: false, erro: 'página_com_erro', extras: { página: n } };
      }
      const página = saída.addPage([Math.round(largura * 100) / 100, Math.round(altura * 100) / 100]);
      página.drawImage(incorporada, { x: 0, y: 0, width: página.getWidth(), height: página.getHeight() });
      ocultadas.push(n);
      aoProgredir?.({ página: ocultadas.length, total: afetadas.size });
    }

    const bytes = await saída.save();
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };

    // Conferência final: abrir o arquivo que vai ser entregue e provar que as páginas ocultadas não têm texto.
    const conferida = await PDFDocumentDe(b, bytes);
    for (const n of ocultadas) {
      if (páginaTemTexto(conferida, conferida.getPage(n - 1), b)) return { ok: false, erro: 'verificação_falhou', extras: { página: n } };
    }
    let releitura;
    try {
      releitura = await abrir(bytes);
      for (const n of ocultadas) {
        const { itens } = await releitura.texto(n);
        if (itens.some((i) => /\S/.test(i.str))) return { ok: false, erro: 'verificação_falhou', extras: { página: n } };
      }
    } catch {
      return { ok: false, erro: 'verificação_falhou', extras: { página: ocultadas[0] } };
    } finally {
      await releitura?.fechar?.();
    }
    return { ok: true, bytes, páginas: total, ocultadas, copiadas, tarjas, reduzidas };
  } finally {
    await leitor.fechar?.();
  }
}

const PDFDocumentDe = (b, bytes) => b.PDFDocument.load(bytes, { updateMetadata: false });

function faixaOuNenhuma(texto, total) {
  if (String(texto ?? '').trim() === '') return { ok: true, índices: [] };
  return interpretarPáginas(texto, total);
}

/** Corta a tarja para dentro da página; nulo se sobrar nada. */
function recortarNaPágina(t, largura, altura) {
  const x0 = Math.max(0, t.x);
  const y0 = Math.max(0, t.y);
  const x1 = Math.min(largura, t.x + t.largura);
  const y1 = Math.min(altura, t.y + t.altura);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 } : null;
}

export { textoDePáginas };

/**
 * Cálculos de texto: contagem, maiúsculas e minúsculas e remoção de acentos.
 *
 * Funções puras, sem DOM, cobertas por teste. O comportamento veio das
 * ferramentas prontas do Ander Flow (contador-de-texto, transformador-de-caixa
 * e removedor-de-acentos), com os mesmos casos de teste.
 */

const IDIOMA = 'pt-BR';

/** Médias de referência, não medição: leitura em silêncio e fala em voz alta. */
export const PALAVRAS_POR_MINUTO_DE_LEITURA = 200;
export const PALAVRAS_POR_MINUTO_DE_FALA = 130;

/* ------------------------------------------------------------ contagem */

/**
 * Conta segmentos com `Intl.Segmenter`, que segue o que a pessoa vê na tela:
 * acento, emoji composto e pontuação contam do jeito que se lê.
 * @returns {number|null} `null` quando o ambiente não tem o segmentador
 */
function contarSegmentos(texto, granularidade, filtro) {
  if (typeof Intl?.Segmenter !== 'function') return null;
  const segmentador = new Intl.Segmenter(IDIOMA, { granularity: granularidade });
  let total = 0;
  for (const segmento of segmentador.segment(texto)) {
    if (!filtro || filtro(segmento)) total++;
  }
  return total;
}

/** Reserva para ambiente sem `Intl.Segmenter`: conta por expressão regular. */
function contagemDeReserva(texto) {
  return {
    caracteres: [...texto].length,
    palavras: (texto.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length,
    frases: (texto.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? []).filter((f) => f.trim()).length,
  };
}

/**
 * Caracteres como a pessoa vê: "ação" tem 4 mesmo quando o acento veio
 * separado da letra, e um emoji composto conta como um.
 * @param {string} texto
 * @returns {number}
 */
export function contarCaracteres(texto) {
  const conteúdo = String(texto ?? '');
  return contarSegmentos(conteúdo, 'grapheme') ?? [...conteúdo].length;
}

/**
 * Conta caracteres, palavras, frases, parágrafos e linhas, e estima os tempos.
 * @param {string} texto
 * @returns {{
 *   caracteres: number, caracteresSemEspaço: number, palavras: number,
 *   frases: number, parágrafos: number, linhas: number,
 *   segundosDeLeitura: number, segundosDeFala: number, palavrasPorFrase: number
 * }}
 */
export function contarTexto(texto = '') {
  const conteúdo = String(texto ?? '');
  const reserva = contagemDeReserva(conteúdo);

  const caracteres = contarSegmentos(conteúdo, 'grapheme') ?? reserva.caracteres;
  const caracteresSemEspaço = [...conteúdo.replace(/\s/gu, '')].length;
  const palavras = contarSegmentos(conteúdo, 'word', (s) => s.isWordLike) ?? reserva.palavras;
  const frases = contarSegmentos(conteúdo, 'sentence', (s) => s.segment.trim().length > 0) ?? reserva.frases;
  const parágrafos = conteúdo.split(/\n\s*\n/).filter((bloco) => bloco.trim().length > 0).length;
  const linhas = conteúdo.length === 0 ? 0 : conteúdo.split(/\r\n|\r|\n/).length;

  return {
    caracteres,
    caracteresSemEspaço,
    palavras,
    frases,
    parágrafos,
    linhas,
    segundosDeLeitura: Math.round((palavras / PALAVRAS_POR_MINUTO_DE_LEITURA) * 60),
    segundosDeFala: Math.round((palavras / PALAVRAS_POR_MINUTO_DE_FALA) * 60),
    palavrasPorFrase: frases ? Math.round((palavras / frases) * 10) / 10 : 0,
  };
}

/**
 * Começo de um texto para mostrar na tela, com reticências quando encurtado.
 * Corta por caractere visível, então nunca parte um emoji ou uma letra
 * acentuada ao meio. O texto curto volta intacto.
 * @param {string} texto
 * @param {number} tamanho máximo de caracteres visíveis
 * @returns {string}
 */
export function préviaDoTexto(texto, tamanho) {
  const conteúdo = String(texto ?? '');
  if (conteúdo.length <= tamanho) return conteúdo; // cada caractere visível ocupa ao menos uma posição
  const pedaços = typeof Intl?.Segmenter === 'function'
    ? new Intl.Segmenter(IDIOMA, { granularity: 'grapheme' }).segment(conteúdo)
    : Array.from(conteúdo, (segment) => ({ segment }));
  let prévia = '';
  let contados = 0;
  for (const { segment } of pedaços) {
    if (contados === tamanho) return `${prévia}…`;
    prévia += segment;
    contados++;
  }
  return conteúdo;
}

/**
 * "3:05" a partir de segundos; menos de um minuto vira "0:12".
 * @param {number} segundos
 * @returns {string}
 */
export function formatarDuração(segundos) {
  const inteiros = Math.max(0, Math.round(Number(segundos) || 0));
  const minutos = Math.floor(inteiros / 60);
  return `${minutos}:${String(inteiros % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ SMS */

/**
 * Alfabeto básico do SMS (GSM 03.38, 3GPP TS 23.038). Texto só com estes
 * caracteres vai em 7 bits por caractere; qualquer outro — ã, õ, ç minúsculo,
 * á, í, ó, ú, â, ê, ô, emoji — obriga a codificação de 16 bits.
 */
const GSM_BÁSICO = new Set([
  '@', '£', '$', '¥', 'è', 'é', 'ù', 'ì', 'ò', 'Ç', '\n', 'Ø', 'ø', '\r', 'Å', 'å',
  'Δ', '_', 'Φ', 'Γ', 'Λ', 'Ω', 'Π', 'Ψ', 'Σ', 'Θ', 'Ξ', 'Æ', 'æ', 'ß', 'É',
  ' ', '!', '"', '#', '¤', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
  '¡', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ñ', 'Ü', '§',
  '¿', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ä', 'ö', 'ñ', 'ü', 'à',
]);

/** Tabela de extensão: cabem no alfabeto de 7 bits, mas ocupam duas posições. */
const GSM_EXTENSÃO = new Set(['\f', '^', '{', '}', '\\', '[', '~', ']', '|', '€']);

/**
 * Quanto um texto ocupa em SMS.
 *
 * Uma mensagem leva 160 caracteres do alfabeto básico ou 70 em 16 bits.
 * Quando passa disso, o celular emenda partes de 153 ou 67 caracteres,
 * porque cada parte perde espaço para o cabeçalho que as junta.
 * @param {string} texto
 * @returns {{codificação: 'gsm'|'unicode', usados: number, limite: number, partes: number}}
 */
export function medirSms(texto = '') {
  const conteúdo = String(texto ?? '');
  let usadosGsm = 0;
  let gsm = true;
  for (const caractere of conteúdo) {
    if (GSM_BÁSICO.has(caractere)) usadosGsm += 1;
    else if (GSM_EXTENSÃO.has(caractere)) usadosGsm += 2;
    else { gsm = false; break; }
  }

  const usados = gsm ? usadosGsm : conteúdo.length; // em 16 bits, emoji ocupa duas unidades
  const limite = gsm ? 160 : 70;
  const porParte = gsm ? 153 : 67;
  const partes = usados === 0 ? 0 : usados <= limite ? 1 : Math.ceil(usados / porParte);
  return { codificação: gsm ? 'gsm' : 'unicode', usados, limite, partes };
}

/* ------------------------------------------------------------- limites */

/**
 * Limites de onde o texto costuma ser colado, contados em caracteres como a
 * pessoa vê. O do X é o do post comum; título e descrição são a referência de
 * corte no resultado de busca, que na verdade é medido em pixels.
 */
export const LIMITES_DE_DESTINO = Object.freeze([
  Object.freeze({ chave: 'x', nome: 'Post no X', máximo: 280 }),
  Object.freeze({ chave: 'descrição', nome: 'Descrição no Google', máximo: 160 }),
  Object.freeze({ chave: 'título', nome: 'Título de página', máximo: 60 }),
]);

/**
 * Compara uma quantidade de caracteres com um limite.
 * @param {number} caracteres
 * @param {number} máximo
 * @returns {{cabe: boolean, restam: number, passou: number}}
 */
export function situaçãoNoLimite(caracteres, máximo) {
  const diferença = máximo - caracteres;
  return { cabe: diferença >= 0, restam: Math.max(0, diferença), passou: Math.max(0, -diferença) };
}

/* ------------------------------------------------------- maiúsculas etc. */

/** Modos de caixa, na ordem em que aparecem na tela. */
export const MODOS_DE_CAIXA = Object.freeze({
  maiúsculas: 'MAIÚSCULAS',
  minúsculas: 'minúsculas',
  'cada-palavra': 'Cada Palavra',
  frase: 'Frase normal',
});

/** Palavra (letras, sinais e números) usada para reconhecer siglas. */
const PALAVRA = /([\p{L}\p{M}\p{N}]+)/u;

/**
 * Sigla: duas letras ou mais, todas maiúsculas ("CPF", "RG", "ONU", "4G" não).
 * @param {string} palavra
 */
function éSigla(palavra) {
  const letras = palavra.match(/\p{L}/gu) ?? [];
  return letras.length >= 2
    && palavra === palavra.toLocaleUpperCase(IDIOMA)
    && palavra !== palavra.toLocaleLowerCase(IDIOMA);
}

/**
 * Minúsculas, deixando as siglas como estão quando pedido.
 * Cada pedaço é convertido separado porque a troca de caixa pode mudar o
 * tamanho do texto ("ß" vira "SS"), o que impede recolocar por posição.
 */
function paraMinúsculas(texto, manterSiglas) {
  if (!manterSiglas) return texto.toLocaleLowerCase(IDIOMA);
  return texto
    .split(PALAVRA)
    .map((parte, i) => (i % 2 === 1 && éSigla(parte) ? parte : parte.toLocaleLowerCase(IDIOMA)))
    .join('');
}

/**
 * Converte a caixa do texto.
 *
 * - `maiúsculas` e `minúsculas`: conversão direta, respeitando acentos (à → À).
 * - `cada-palavra`: tudo minúsculo e a primeira letra de cada sequência
 *   separada por espaço em maiúscula ("MARIA DA silva" → "Maria Da Silva").
 * - `frase`: tudo minúsculo e maiúscula só no começo do texto e depois de
 *   ". ", "! " ou "? ".
 *
 * Com `manterSiglas`, palavras que já estão todas em maiúsculas ficam como
 * estão nos três modos que baixam a caixa.
 * @param {string} texto
 * @param {keyof typeof MODOS_DE_CAIXA} modo
 * @param {{manterSiglas?: boolean}} [opções]
 * @returns {string}
 */
export function transformarCaixa(texto, modo = 'maiúsculas', { manterSiglas = false } = {}) {
  const conteúdo = String(texto ?? '');
  const maiúscula = (letra) => letra.toLocaleUpperCase(IDIOMA);

  switch (modo) {
    case 'maiúsculas':
      return conteúdo.toLocaleUpperCase(IDIOMA);
    case 'minúsculas':
      return paraMinúsculas(conteúdo, manterSiglas);
    case 'cada-palavra':
      return paraMinúsculas(conteúdo, manterSiglas)
        .replace(/(^|\s)(\S)/g, (_, antes, letra) => antes + maiúscula(letra));
    case 'frase':
      return paraMinúsculas(conteúdo, manterSiglas)
        .replace(/(^\s*|[.!?]\s+)(\S)/g, (_, antes, letra) => antes + maiúscula(letra));
    default:
      throw new Error(`Modo de caixa desconhecido: ${modo}`);
  }
}

/**
 * Diz se o texto tem letra e nenhuma delas é minúscula — caso em que
 * "manter siglas" trataria o texto inteiro como sigla e nada mudaria.
 * @param {string} texto
 */
export function estáTodoEmMaiúsculas(texto) {
  const conteúdo = String(texto ?? '');
  return /\p{L}/u.test(conteúdo) && conteúdo === conteúdo.toLocaleUpperCase(IDIOMA)
    && conteúdo !== conteúdo.toLocaleLowerCase(IDIOMA);
}

/* ------------------------------------------------------------- acentos */

/** Sinais combinantes (acento, til, cedilha…) escritos por código, não colados. */
const SINAIS_COMBINANTES = /[̀-ͯ]/g;
/** `\w` é só ASCII: com a pontuação desligada, sobra texto que qualquer sistema antigo aceita. */
const NEM_LETRA_NEM_NÚMERO_NEM_ESPAÇO = /[^\w\s]/g;

/**
 * Quantos sinais de acento, til ou cedilha o texto tem.
 * @param {string} texto
 * @returns {number}
 */
export function contarAcentos(texto) {
  return (String(texto ?? '').normalize('NFD').match(SINAIS_COMBINANTES) ?? []).length;
}

/**
 * Remove acentos, til e cedilha.
 *
 * A normalização NFD separa a letra do sinal ("ç" vira "c" + cedilha) e os
 * sinais U+0300–U+036F saem; a pontuação não é tocada. Sem `manterPontuação`,
 * sai também tudo o que não é letra, número ou espaço — inclusive a vírgula dos
 * números: "10,00" vira "1000". No fim o texto volta para NFC, para que
 * escritas que a NFD decompõe (como o coreano) não saiam desmontadas.
 * @param {string} texto
 * @param {{manterPontuação?: boolean}} [opções]
 * @returns {string}
 */
export function removerAcentos(texto, { manterPontuação = true } = {}) {
  const semAcento = String(texto ?? '').normalize('NFD').replace(SINAIS_COMBINANTES, '');
  const saída = manterPontuação ? semAcento : semAcento.replace(NEM_LETRA_NEM_NÚMERO_NEM_ESPAÇO, '');
  return saída.normalize('NFC');
}

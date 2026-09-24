// compartilhado-formatar.js — formatação de moeda, número, percentual, data e leitura de número
// digitado (pt-BR/en). Tudo função pura: recebe o idioma por parâmetro (com valor padrão lido do
// documento, quando existir) para rodar no Node sem DOM.

import { t } from './compartilhado-idioma.js';

function idiomaSeguro() {
  try {
    return document.documentElement.lang === 'en' ? 'en' : 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}

function localeDoIdioma(idioma) {
  return idioma === 'en' ? 'en-US' : 'pt-BR';
}

/** BRL: pt-BR → "R$ 74,41" (espaço normal), en → "R$74.41". */
export function formatarMoeda(valor, idioma = idiomaSeguro()) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  const texto = new Intl.NumberFormat(localeDoIdioma(idioma), { style: 'currency', currency: 'BRL' }).format(numero);
  return texto.replace(/ /g, ' ');
}

export function formatarNumero(valor, casas = 2, idioma = idiomaSeguro()) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  return new Intl.NumberFormat(localeDoIdioma(idioma), {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(numero);
}

/** `0.3` → "30%". */
export function formatarPercentual(fracao, casas = 0, idioma = idiomaSeguro()) {
  const numero = Number(fracao);
  if (!Number.isFinite(numero)) return '';
  return new Intl.NumberFormat(localeDoIdioma(idioma), {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(numero);
}

export function formatarData(iso, idioma = idiomaSeguro()) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return new Intl.DateTimeFormat(localeDoIdioma(idioma), { dateStyle: 'short' }).format(data);
}

/** pt-BR: "terça, 22 de setembro" (sem o "-feira"); en: "Tuesday, September 22". */
export function formatarDataLonga(iso, idioma = idiomaSeguro()) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const texto = new Intl.DateTimeFormat(localeDoIdioma(idioma), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(data);
  return idioma === 'en' ? texto : texto.replace('-feira', '');
}

/** "agora" / "há {quantidade} min" / "há {quantidade} h" / "há {quantidade} dias". */
export function formatarTempoRelativo(iso, agora = Date.now()) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const diferencaSegundos = Math.max(0, Math.floor((agora - data.getTime()) / 1000));
  if (diferencaSegundos < 60) return t('compartilhado.tempo.agora');
  const minutos = Math.floor(diferencaSegundos / 60);
  if (minutos < 60) return t('compartilhado.tempo.minutos', { quantidade: minutos });
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return t('compartilhado.tempo.horas', { quantidade: horas });
  const dias = Math.floor(horas / 24);
  return t('compartilhado.tempo.dias', { quantidade: dias });
}

/**
 * Decide, a partir do próprio texto, qual separador de `corpo` (só dígitos, "." e ",") é o
 * decimal e qual é o de milhar, e devolve o corpo normalizado com "." como decimal:
 * - com "," e "." presentes: o separador que aparece por último é o decimal;
 * - só um tipo de separador, repetido ("1.234.567"): é de milhar;
 * - só um separador, uma vez, seguido de 1, 2 ou mais de 3 dígitos: é decimal;
 * - só um separador, uma vez, seguido de exatamente 3 dígitos ("1.234", "1,234"): ambíguo —
 *   vale a convenção do idioma (pt-BR: "." milhar/"," decimal; en: "," milhar/"." decimal).
 */
function normalizarCorpoNumerico(corpo, idioma) {
  const temVirgula = corpo.includes(',');
  const temPonto = corpo.includes('.');

  if (temVirgula && temPonto) {
    const decimalEhVirgula = corpo.lastIndexOf(',') > corpo.lastIndexOf('.');
    return decimalEhVirgula ? corpo.replace(/\./g, '').replace(',', '.') : corpo.replace(/,/g, '');
  }

  if (!temVirgula && !temPonto) return corpo;

  const separador = temVirgula ? ',' : '.';
  const partes = corpo.split(separador);
  if (partes.length > 2) return partes.join('');

  const [inteiro, decimais] = partes;
  if (decimais.length === 3) {
    const separadorEhDecimalNoIdioma = idioma === 'en' ? separador === '.' : separador === ',';
    return separadorEhDecimalNoIdioma ? `${inteiro}.${decimais}` : `${inteiro}${decimais}`;
  }
  return `${inteiro}.${decimais}`;
}

/** Aceita "1.234,56" (pt-BR) e "1234.56" (en), decidindo o separador pelo próprio texto
 *  (ver `normalizarCorpoNumerico`); inválido → NaN. */
export function lerNumero(texto, idioma = idiomaSeguro()) {
  if (typeof texto !== 'string') return NaN;
  const limpo = texto.trim();
  if (!limpo) return NaN;
  const negativo = limpo.startsWith('-');
  const corpo = negativo ? limpo.slice(1) : limpo;
  if (!/^\d+([.,]\d+)*$/.test(corpo)) return NaN;
  const normalizado = normalizarCorpoNumerico(corpo, idioma);
  if (!/^\d+(\.\d+)?$/.test(normalizado)) return NaN;
  return Number(negativo ? `-${normalizado}` : normalizado);
}

/**
 * Converter planilha (F199): CSV, TSV e JSON entre si e para XLSX, tudo no navegador.
 *
 * Sem biblioteca nova: a leitura de CSV/TSV vem de `tabular.js`, a gravação de XLSX de
 * `comum/exportação/gerar-planilha-xlsx.js` e o CSV gravado passa por `neutralizarFórmula`.
 *
 * Decisões que importam:
 * - Valores vindos de CSV/TSV são TEXTO. Adivinhar tipo estraga CEP, telefone e código com zero à esquerda;
 *   por isso converter para número é uma escolha (`detectarTipos`) e só vale para números "limpos"
 *   (sem zero à esquerda, até 15 dígitos, que é o que o número do JavaScript e do Excel guardam sem perda).
 * - Cabeçalho repetido ou vazio ganha nome único (nome, nome_2), em vez de um campo apagar o outro.
 * - Os limites existem para entrada hostil não travar a página: arquivo, linhas, colunas e tamanho de célula.
 */
import { lerCsv, detectarSeparador } from './tabular.js';
import { montarCsv, neutralizarFórmula } from '../núcleo/exportar.js';
import { gerarPlanilhaXlsx } from '../comum/exportação/gerar-planilha-xlsx.js';

export const LIMITES = Object.freeze({
  bytes: 20 * 1024 * 1024,
  linhas: 200_000,
  colunas: 500,
  célula: 32_767, // limite de texto de uma célula do Excel
  células: 1_000_000, // máximo de células para gerar XLSX (o arquivo fica pesado demais depois disso)
});

export const FORMATOS_DE_ENTRADA = Object.freeze({ auto: 'Detectar sozinho', csv: 'CSV', tsv: 'TSV (tabulação)', json: 'JSON' });
export const FORMATOS_DE_SAÍDA = Object.freeze({
  csv: { rótulo: 'CSV', extensão: 'csv', tipo: 'text/csv;charset=utf-8' },
  tsv: { rótulo: 'TSV (tabulação)', extensão: 'tsv', tipo: 'text/tab-separated-values;charset=utf-8' },
  json: { rótulo: 'JSON (lista de objetos)', extensão: 'json', tipo: 'application/json;charset=utf-8' },
  'json-linhas': { rótulo: 'JSON (lista de listas)', extensão: 'json', tipo: 'application/json;charset=utf-8' },
  xlsx: { rótulo: 'XLSX (Excel)', extensão: 'xlsx', tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
});

/** Erro de regra de negócio com o campo da tela que precisa ser corrigido. */
export class ErroDePlanilha extends Error {
  /** @param {string} mensagem @param {string} [campo] */
  constructor(mensagem, campo) {
    super(mensagem);
    this.name = 'ErroDePlanilha';
    this.campo = campo;
  }
}

const SÓ_CABEÇALHO = 'Só há uma linha, e ela é o cabeçalho: não sobram dados. Desmarque "A primeira linha é o cabeçalho" se ela também for dado.';

/** @typedef {string|number|boolean} Célula */
/** @typedef {{cabeçalho: string[]|null, linhas: Célula[][], colunas: number, avisos: string[]}} Tabela */

/* ------------------------------------------------------------------ arquivo e texto */

/**
 * Reconhece o que NÃO é texto de planilha, pelos bytes, para dizer o que é em vez de mostrar lixo.
 * @param {Uint8Array} bytes
 * @returns {string|null} mensagem de recusa, ou null se parece texto
 */
export function recusarSeNãoForTexto(bytes) {
  if (bytes.length === 0) return 'O arquivo está vazio.';
  const começa = (...assinatura) => assinatura.every((b, i) => bytes[i] === b);
  if (começa(0x50, 0x4B, 0x03, 0x04)) return 'Este arquivo é um pacote ZIP (XLSX, ODS ou outro). Esta ferramenta lê CSV, TSV e JSON: abra a planilha no Excel ou no LibreOffice e salve como CSV.';
  if (começa(0xD0, 0xCF, 0x11, 0xE0)) return 'Este arquivo é uma planilha antiga do Excel (XLS). Esta ferramenta lê CSV, TSV e JSON: abra no Excel e salve como CSV.';
  if (começa(0x25, 0x50, 0x44, 0x46)) return 'Este arquivo é um PDF, não uma planilha em texto.';
  if (começa(0x89, 0x50, 0x4E, 0x47) || começa(0xFF, 0xD8, 0xFF) || começa(0x47, 0x49, 0x46, 0x38)) return 'Este arquivo é uma imagem, não uma planilha em texto.';
  const utf16 = começa(0xFF, 0xFE) || começa(0xFE, 0xFF);
  if (!utf16 && bytes.subarray(0, 4096).includes(0)) return 'Este arquivo parece binário, não texto. Use um CSV, TSV ou JSON.';
  return null;
}

/**
 * Converte bytes em texto: UTF-8 (com ou sem BOM), UTF-16 com BOM, e Windows-1252 quando não for UTF-8 válido
 * (é o que o Excel em português grava no "CSV" comum).
 * @param {Uint8Array} bytes
 * @returns {{texto: string, codificação: string}}
 */
export function decodificarTexto(bytes) {
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return { texto: new TextDecoder('utf-16le').decode(bytes.subarray(2)), codificação: 'UTF-16' };
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return { texto: new TextDecoder('utf-16be').decode(bytes.subarray(2)), codificação: 'UTF-16' };
  try {
    return { texto: new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''), codificação: 'UTF-8' };
  } catch {
    return { texto: new TextDecoder('windows-1252').decode(bytes), codificação: 'Windows-1252' };
  }
}

/**
 * Descobre o formato do texto: pela extensão do arquivo e, na falta dela, pelo conteúdo.
 * @param {string} texto
 * @param {string} [nome] nome do arquivo
 * @returns {'csv'|'tsv'|'json'}
 */
export function detectarFormato(texto, nome = '') {
  const extensão = /\.([a-z0-9]+)$/i.exec(nome)?.[1]?.toLowerCase();
  if (extensão === 'json') return 'json';
  if (extensão === 'tsv' || extensão === 'tab') return 'tsv';
  if (extensão === 'csv') return 'csv';
  const início = texto.trimStart()[0];
  if (início === '[' || início === '{') {
    try { JSON.parse(texto); return 'json'; } catch { /* continua: pode ser CSV que começa com colchete */ }
  }
  return detectarSeparador(texto) === '\t' ? 'tsv' : 'csv';
}

/* ------------------------------------------------------------------ tabela */

/** Nome único para cada coluna: vazio vira "colunaN" e repetido ganha _2, _3. */
export function nomesÚnicos(cabeçalho) {
  const usados = new Map();
  return cabeçalho.map((bruto, i) => {
    const base = String(bruto ?? '').trim() || `coluna${i + 1}`;
    const vezes = (usados.get(base) ?? 0) + 1;
    usados.set(base, vezes);
    return vezes === 1 ? base : `${base}_${vezes}`;
  });
}

function conferirLimites(linhas, colunas) {
  if (colunas > LIMITES.colunas) throw new ErroDePlanilha(`A planilha tem ${colunas.toLocaleString('pt-BR')} colunas e o limite é ${LIMITES.colunas.toLocaleString('pt-BR')}. Confira se o separador está certo.`, 'conteúdo');
  if (linhas > LIMITES.linhas) throw new ErroDePlanilha(`A planilha tem ${linhas.toLocaleString('pt-BR')} linhas e o limite é ${LIMITES.linhas.toLocaleString('pt-BR')}. Divida o arquivo em partes.`, 'conteúdo');
}

/** Garante que toda linha tenha o mesmo número de colunas; devolve quantas precisaram de ajuste. */
function igualarLarguras(linhas, colunas) {
  let ajustadas = 0;
  const saída = linhas.map((linha) => {
    if (linha.length === colunas) return linha;
    ajustadas += 1;
    return linha.length < colunas ? [...linha, ...Array(colunas - linha.length).fill('')] : linha;
  });
  return { linhas: saída, ajustadas };
}

/**
 * Lê o texto como tabela.
 * @param {string} texto
 * @param {{formato: 'csv'|'tsv'|'json', separador?: string, comCabeçalho?: boolean}} opções
 * @returns {Tabela}
 */
export function lerTabela(texto, { formato, separador = 'auto', comCabeçalho = true }) {
  if (!String(texto).trim()) throw new ErroDePlanilha('Não há dados: o conteúdo está vazio.', 'conteúdo');
  const avisos = [];

  if (formato === 'json') {
    let valor;
    try {
      valor = JSON.parse(texto);
    } catch (erro) {
      if (erro instanceof RangeError) throw new ErroDePlanilha('O JSON é fundo demais para processar.', 'conteúdo');
      throw new ErroDePlanilha(`JSON inválido: ${erro.message}`, 'conteúdo');
    }
    const lista = Array.isArray(valor) ? valor : [valor];
    if (lista.length === 0) throw new ErroDePlanilha('O JSON é uma lista vazia: não há linhas para converter.', 'conteúdo');
    conferirLimites(lista.length, 0);
    if (lista.every((item) => Array.isArray(item))) {
      // Lista de listas: a primeira lista é o cabeçalho, se a pessoa disse que é.
      const colunas = lista.reduce((m, l) => Math.max(m, l.length), 0);
      conferirLimites(lista.length, colunas);
      const células = lista.map((l) => l.map(valorDeCélula));
      if (comCabeçalho && células.length < 2) throw new ErroDePlanilha(SÓ_CABEÇALHO, 'conteúdo');
      const { linhas, ajustadas } = igualarLarguras(células, colunas);
      if (ajustadas) avisos.push(`${ajustadas.toLocaleString('pt-BR')} linha(s) tinham menos colunas que a maior e foram completadas com células vazias.`);
      return comCabeçalho
        ? { cabeçalho: nomesÚnicos(linhas[0].map(String)), linhas: linhas.slice(1), colunas, avisos }
        : { cabeçalho: null, linhas, colunas, avisos };
    }
    if (!lista.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
      throw new ErroDePlanilha('O JSON precisa ser uma lista de objetos ou uma lista de listas. Itens soltos (números, textos) não formam uma tabela.', 'conteúdo');
    }
    const chaves = [];
    const vistas = new Set();
    for (const objeto of lista) {
      for (const chave of Object.keys(objeto)) {
        if (!vistas.has(chave)) { vistas.add(chave); chaves.push(chave); }
      }
      conferirLimites(lista.length, chaves.length);
    }
    const linhas = lista.map((objeto) => chaves.map((chave) => valorDeCélula(objeto[chave])));
    return { cabeçalho: nomesÚnicos(chaves), linhas, colunas: chaves.length, avisos };
  }

  const separadorUsado = formato === 'tsv' ? '\t' : (separador === 'auto' ? detectarSeparador(texto) : separador);
  const bruta = lerCsv(texto, { separador: separadorUsado });
  if (bruta.length === 0) throw new ErroDePlanilha('Não há dados: o conteúdo está vazio.', 'conteúdo');
  conferirLimites(bruta.length, 0); // antes de medir: milhões de linhas não devem nem ser percorridas
  const colunas = bruta.reduce((m, l) => Math.max(m, l.length), 0);
  conferirLimites(bruta.length, colunas);
  const { linhas, ajustadas } = igualarLarguras(bruta, colunas);
  if (ajustadas) avisos.push(`${ajustadas.toLocaleString('pt-BR')} linha(s) tinham número de colunas diferente do cabeçalho e foram ajustadas.`);
  const vazias = linhas.filter((l) => l.every((c) => c === '')).length;
  if (vazias) avisos.push(`${vazias.toLocaleString('pt-BR')} linha(s) estão em branco e foram mantidas.`);
  if (comCabeçalho && linhas.length < 2) throw new ErroDePlanilha(SÓ_CABEÇALHO, 'conteúdo');
  return comCabeçalho
    ? { cabeçalho: nomesÚnicos(linhas[0]), linhas: linhas.slice(1), colunas, avisos }
    : { cabeçalho: null, linhas, colunas, avisos };
}

/** Valor de uma célula vinda do JSON: texto, número e verdadeiro/falso ficam como estão; vazio vira texto vazio; objeto vira JSON. */
function valorDeCélula(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string' || typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : String(valor);
  return JSON.stringify(valor);
}

/**
 * Converte texto em número ou verdadeiro/falso só quando é seguro: número inteiro ou decimal com ponto, sem zero
 * à esquerda e com no máximo 15 dígitos. "007", "01310-000", "1e5" e "1,5" continuam texto.
 * @param {Célula} valor
 * @returns {Célula}
 */
export function inferirTipo(valor) {
  if (typeof valor !== 'string') return valor;
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(valor) && valor.replace(/[-.]/g, '').length <= 15) return Number(valor);
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return valor;
}

/* ------------------------------------------------------------------ saída */

const textoDaCélula = (valor) => (typeof valor === 'string' ? valor : String(valor));

/**
 * Conta as células de texto que começam como fórmula (=, +, -, @) e que o CSV vai proteger com apóstrofo.
 * @param {Tabela} tabela
 */
export function contarFórmulasProtegidas(tabela) {
  let total = 0;
  for (const linha of [tabela.cabeçalho ?? [], ...tabela.linhas]) {
    for (const célula of linha) if (typeof célula === 'string' && neutralizarFórmula(célula) !== célula) total += 1;
  }
  return total;
}

/**
 * Converte a tabela para o formato pedido.
 * @param {Tabela} tabela
 * @param {{formato: keyof typeof FORMATOS_DE_SAÍDA, separador?: string, comBom?: boolean, detectarTipos?: boolean, nomeDaAba?: string}} opções
 * @returns {{texto?: string, bytes?: Uint8Array}}
 */
export function converterTabela(tabela, { formato, separador = ';', comBom = true, detectarTipos = false, nomeDaAba = 'Planilha' }) {
  if (!Object.hasOwn(FORMATOS_DE_SAÍDA, formato)) throw new ErroDePlanilha('Escolha o formato de saída.', 'saída');
  const tipada = detectarTipos ? tabela.linhas.map((l) => l.map(inferirTipo)) : tabela.linhas;
  const cabeçalho = tabela.cabeçalho;

  if (formato === 'csv' || formato === 'tsv') {
    const sep = formato === 'tsv' ? '\t' : (separador === 'auto' ? ';' : separador);
    const linhas = [...(cabeçalho ? [cabeçalho] : []), ...tipada].map((l) => l.map(textoDaCélula));
    return { texto: montarCsv(linhas, { separador: sep, comBom, protegerFórmulas: true }) };
  }

  if (formato === 'json') {
    const nomes = cabeçalho ?? nomesÚnicos(Array(tabela.colunas).fill(''));
    // Objetos sem protótipo: uma coluna chamada "__proto__" vira um campo comum, não mexe no objeto.
    const objetos = tipada.map((linha) => {
      const objeto = Object.create(null);
      nomes.forEach((nome, i) => { objeto[nome] = linha[i] ?? ''; });
      return objeto;
    });
    return { texto: JSON.stringify(objetos, null, 2) };
  }

  if (formato === 'json-linhas') {
    return { texto: JSON.stringify([...(cabeçalho ? [cabeçalho] : []), ...tipada], null, 2) };
  }

  // XLSX
  const total = (tipada.length + (cabeçalho ? 1 : 0)) * tabela.colunas;
  if (total > LIMITES.células) {
    throw new ErroDePlanilha(`A planilha tem ${total.toLocaleString('pt-BR')} células e o XLSX gerado aqui vai até ${LIMITES.células.toLocaleString('pt-BR')}. Converta para CSV ou divida o arquivo.`, 'saída');
  }
  for (const linha of [cabeçalho ?? [], ...tipada]) {
    for (const célula of linha) {
      if (typeof célula === 'string' && célula.length > LIMITES.célula) {
        throw new ErroDePlanilha(`Uma célula tem mais de ${LIMITES.célula.toLocaleString('pt-BR')} caracteres, o limite de texto de uma célula do Excel. Converta para CSV ou JSON.`, 'saída');
      }
    }
  }
  const comoCélula = (valor) => (typeof valor === 'number' ? { número: valor } : { texto: textoDaCélula(valor) });
  const linhas = [
    ...(cabeçalho ? [cabeçalho.map((texto) => ({ texto, estilo: 'cabeçalho' }))] : []),
    ...tipada.map((l) => l.map(comoCélula)),
  ];
  const nomeSeguro = String(nomeDaAba).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Planilha';
  return { bytes: gerarPlanilhaXlsx({ nomeDaAba: nomeSeguro, linhas, corDoCabeçalho: '#1a1a1a', título: nomeSeguro, autor: 'Portal de Ferramentas' }) };
}

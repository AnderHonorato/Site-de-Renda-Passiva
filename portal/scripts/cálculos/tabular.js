/** Leitura e limpeza de dados tabulares (CSV, TSV e colagem de planilha). */

/**
 * Descobre o separador mais provável olhando a primeira linha.
 * @param {string} texto
 * @returns {string}
 */
export function detectarSeparador(texto) {
  const primeira = String(texto ?? '').split(/\r?\n/, 1)[0] ?? '';
  const candidatos = [';', ',', '\t', '|'];
  let melhor = ';';
  let maior = -1;
  for (const separador of candidatos) {
    // Conta só fora de aspas, para não confundir vírgula dentro de campo.
    let contagem = 0;
    let dentroDeAspas = false;
    for (let i = 0; i < primeira.length; i += 1) {
      if (primeira[i] === '"') dentroDeAspas = !dentroDeAspas;
      else if (!dentroDeAspas && primeira[i] === separador) contagem += 1;
    }
    if (contagem > maior) { maior = contagem; melhor = separador; }
  }
  return maior > 0 ? melhor : ';';
}

/**
 * Interpreta CSV respeitando aspas, aspas escapadas e quebras dentro de células.
 * @param {string} texto
 * @param {{separador?: string}} [opções]
 * @returns {string[][]}
 */
export function lerCsv(texto, { separador } = {}) {
  const conteúdo = String(texto ?? '').replace(/^﻿/, '');
  if (!conteúdo.trim()) return [];
  const sep = separador ?? detectarSeparador(conteúdo);

  const linhas = [];
  let linha = [];
  let célula = '';
  let dentroDeAspas = false;

  for (let i = 0; i < conteúdo.length; i += 1) {
    const c = conteúdo[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (conteúdo[i + 1] === '"') { célula += '"'; i += 1; }
        else dentroDeAspas = false;
      } else célula += c;
      continue;
    }
    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === sep) { linha.push(célula); célula = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && conteúdo[i + 1] === '\n') i += 1;
      linha.push(célula);
      linhas.push(linha);
      linha = [];
      célula = '';
      continue;
    }
    célula += c;
  }
  linha.push(célula);
  linhas.push(linha);

  // Descarta a última linha quando ela é só o resultado de um \n final.
  if (linhas.length > 1 && linhas[linhas.length - 1].every((v) => v === '')) linhas.pop();
  return linhas;
}

/**
 * Aplica limpezas a uma tabela.
 * @param {string[][]} tabela primeira linha é o cabeçalho quando `comCabeçalho`
 * @param {{
 *   comCabeçalho?: boolean, aparar?: boolean, removerVazias?: boolean,
 *   removerDuplicadas?: boolean, espaçosDuplos?: boolean,
 *   caixa?: 'nenhuma'|'maiúsculas'|'minúsculas'|'primeira'
 * }} opções
 * @returns {{cabeçalho: string[]|null, linhas: string[][], removidas: {vazias: number, duplicadas: number}}}
 */
export function limparTabela(tabela, opções = {}) {
  const {
    comCabeçalho = true, aparar = true, removerVazias = true,
    removerDuplicadas = true, espaçosDuplos = true, caixa = 'nenhuma',
  } = opções;

  if (!Array.isArray(tabela) || tabela.length === 0) {
    throw new Error('Não há dados para limpar.');
  }

  const cabeçalho = comCabeçalho ? tabela[0].map((c) => c.trim()) : null;
  let linhas = comCabeçalho ? tabela.slice(1) : [...tabela];

  const ajustarCaixa = (valor) => {
    if (caixa === 'maiúsculas') return valor.toLocaleUpperCase('pt-BR');
    if (caixa === 'minúsculas') return valor.toLocaleLowerCase('pt-BR');
    if (caixa === 'primeira') {
      const baixo = valor.toLocaleLowerCase('pt-BR');
      return baixo.charAt(0).toLocaleUpperCase('pt-BR') + baixo.slice(1);
    }
    return valor;
  };

  linhas = linhas.map((linha) => linha.map((célula) => {
    let valor = String(célula ?? '');
    if (aparar) valor = valor.trim();
    if (espaçosDuplos) valor = valor.replace(/[ \t]{2,}/g, ' ');
    return ajustarCaixa(valor);
  }));

  const antesDeVazias = linhas.length;
  if (removerVazias) linhas = linhas.filter((l) => l.some((c) => c !== ''));
  const vazias = antesDeVazias - linhas.length;

  let duplicadas = 0;
  if (removerDuplicadas) {
    const vistas = new Set();
    linhas = linhas.filter((l) => {
      const chave = l.join('');
      if (vistas.has(chave)) { duplicadas += 1; return false; }
      vistas.add(chave);
      return true;
    });
  }

  return { cabeçalho, linhas, removidas: { vazias, duplicadas } };
}

/**
 * Converte uma tabela com cabeçalho em lista de objetos.
 * @param {string[]} cabeçalho
 * @param {string[][]} linhas
 * @returns {Record<string, string>[]}
 */
export function paraObjetos(cabeçalho, linhas) {
  const chaves = cabeçalho.map((c, i) => (c.trim() || `coluna${i + 1}`));
  return linhas.map((linha) => {
    const objeto = {};
    chaves.forEach((chave, i) => {
      // Não copiamos chaves que poluiriam o protótipo do objeto.
      if (chave === '__proto__' || chave === 'constructor' || chave === 'prototype') return;
      objeto[chave] = linha[i] ?? '';
    });
    return objeto;
  });
}

/**
 * Converte lista de objetos em tabela.
 * @param {readonly Record<string, unknown>[]} objetos
 * @returns {{cabeçalho: string[], linhas: string[][]}}
 */
export function deObjetos(objetos) {
  if (!Array.isArray(objetos) || objetos.length === 0) {
    throw new Error('O JSON precisa ser uma lista de objetos com pelo menos um item.');
  }
  const chaves = [];
  for (const objeto of objetos) {
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) {
      throw new Error('Cada item da lista precisa ser um objeto.');
    }
    for (const chave of Object.keys(objeto)) if (!chaves.includes(chave)) chaves.push(chave);
  }
  const linhas = objetos.map((objeto) => chaves.map((chave) => {
    const valor = objeto[chave];
    if (valor === null || valor === undefined) return '';
    return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  }));
  return { cabeçalho: chaves, linhas };
}

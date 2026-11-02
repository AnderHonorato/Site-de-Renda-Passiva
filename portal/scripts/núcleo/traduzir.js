/**
 * Tradutor mínimo, igual no Node (geração das páginas) e no navegador.
 *
 * Um dicionário é um objeto de objetos com textos nas folhas. A chave é o caminho com pontos:
 * t('início.título', { nome: 'X' }). Chave inexistente é ERRO, não texto vazio: um texto que
 * some em silêncio é pior do que uma página que não gera.
 *
 * - {parâmetro}: trocado pelo valor dado; parâmetro que falta é erro.
 * - "um|vários": quando o texto tem uma barra vertical e {n}, o primeiro vale para n = 1.
 */

/** Acha o valor de um caminho com pontos dentro do dicionário. */
function achar(dicionário, chave) {
  let atual = dicionário;
  for (const parte of chave.split('.')) {
    if (atual === null || typeof atual !== 'object' || !(parte in atual)) throw new Error(`Texto sem tradução: "${chave}"`);
    atual = atual[parte];
  }
  return atual;
}

/** Troca os {parâmetros} de um texto. */
export function preencher(texto, parâmetros = {}, chave = '') {
  let alvo = texto;
  if (alvo.includes('|') && 'n' in parâmetros) {
    const [um, vários] = alvo.split('|');
    alvo = Number(parâmetros.n) === 1 ? um : vários;
  }
  return alvo.replace(/\{([^}]+)\}/g, (_, nome) => {
    if (!(nome in parâmetros)) throw new Error(`Falta o parâmetro {${nome}} em "${chave}"`);
    return String(parâmetros[nome]);
  });
}

/**
 * Cria a função t de um dicionário.
 * @param {object} dicionário
 * @returns {(chave: string, parâmetros?: Record<string, unknown>) => string}
 */
export function criarTradutor(dicionário) {
  return (chave, parâmetros) => {
    const valor = achar(dicionário, chave);
    if (typeof valor !== 'string') throw new Error(`"${chave}" não é um texto (é ${Array.isArray(valor) ? 'uma lista' : typeof valor})`);
    return preencher(valor, parâmetros, chave);
  };
}

/** Devolve uma lista de textos (por exemplo as perguntas frequentes) sem trocar parâmetros. */
export function lista(dicionário, chave) {
  const valor = achar(dicionário, chave);
  if (!Array.isArray(valor)) throw new Error(`"${chave}" não é uma lista`);
  return valor;
}

/** Todas as chaves de folha de um dicionário, em ordem, para os testes de paridade. */
export function chavesDe(dicionário, prefixo = '') {
  const chaves = [];
  for (const [nome, valor] of Object.entries(dicionário)) {
    const caminho = prefixo ? `${prefixo}.${nome}` : nome;
    if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) chaves.push(...chavesDe(valor, caminho));
    else chaves.push(caminho);
  }
  return chaves;
}

/** Nomes dos {parâmetros} de um texto (ou de todos os itens de uma lista), para a paridade entre idiomas. */
export function parâmetrosDe(valor) {
  const textos = Array.isArray(valor) ? valor : [valor];
  const nomes = new Set();
  for (const texto of textos) for (const [, nome] of String(texto).matchAll(/\{([^}]+)\}/g)) nomes.add(nome);
  return [...nomes].sort();
}

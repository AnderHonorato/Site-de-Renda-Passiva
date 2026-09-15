// document.createElement() não serve para elementos SVG (cria um HTMLUnknownElement);
// aqui, e só aqui neste produto, usamos createElementNS diretamente. Constrói o nó sem
// innerHTML, com atributos seguros (sem "style" nem manipuladores on*).
const SVG_NS = 'http://www.w3.org/2000/svg';

function éAtributoPerigoso(nome) {
  const chave = nome.toLowerCase();
  return chave === 'style' || chave.startsWith('on');
}

export function criarElementoSvg(tag, atributos = {}, filhos = []) {
  const elemento = document.createElementNS(SVG_NS, tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || éAtributoPerigoso(nome)) continue;
    elemento.setAttribute(nome, String(valor));
  }
  for (const filho of filhos) {
    if (filho === undefined || filho === null || filho === false) continue;
    elemento.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return elemento;
}

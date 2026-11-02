// Sincronizado de compartilhado/scripts/interface/criar-elemento.js — edite a origem e rode "npm run sincronizar" na raiz.
// compartilhado/scripts/interface/criar-elemento.js
// Construção segura de DOM: nunca usa innerHTML/outerHTML/insertAdjacentHTML.
// Todo texto entra por textContent; todo atributo passa por setAttribute com
// recusa explícita de atributos perigosos (on*, style) e de esquemas de
// endereço não confiáveis em href/src.

const ESQUEMAS_PERMITIDOS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function éAtributoPerigoso(nome) {
  const chave = nome.toLowerCase();
  return chave === 'style' || chave.startsWith('on');
}

function endereçoÉSeguro(valor) {
  const texto = String(valor).trim();
  if (texto === '' || texto.startsWith('#') || texto.startsWith('/') || texto.startsWith('./') || texto.startsWith('../')) {
    return true;
  }
  try {
    const url = new URL(texto, 'https://exemplo.invalido/');
    return ESQUEMAS_PERMITIDOS.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Cria um elemento DOM sem recorrer a innerHTML.
 * @param {string} tag Nome da tag (ex.: 'div', 'button').
 * @param {object} [opções]
 * @param {string} [opções.classe] Uma ou mais classes separadas por espaço.
 * @param {string} [opções.texto] Texto do elemento, via textContent.
 * @param {Record<string, string|number|boolean>} [opções.atributos]
 * @param {Record<string, string>} [opções.dados] Preenche element.dataset.
 * @param {(Node|string)[]} [filhos] Nós ou textos a anexar, em ordem.
 * @returns {HTMLElement}
 */
export function criarElemento(tag, opções = {}, filhos = []) {
  const elemento = document.createElement(tag);
  const { classe, texto, atributos, dados } = opções;

  if (classe) {
    elemento.setAttribute('class', classe);
  }

  if (texto !== undefined && texto !== null) {
    elemento.textContent = String(texto);
  }

  if (atributos) {
    for (const [nome, valor] of Object.entries(atributos)) {
      if (valor === undefined || valor === null || valor === false) continue;
      if (éAtributoPerigoso(nome)) continue;
      if ((nome === 'href' || nome === 'src' || nome === 'action' || nome === 'formaction') && !endereçoÉSeguro(valor)) {
        continue;
      }
      elemento.setAttribute(nome, valor === true ? '' : String(valor));
    }
  }

  if (dados) {
    for (const [chave, valor] of Object.entries(dados)) {
      if (valor === undefined || valor === null) continue;
      elemento.dataset[chave] = String(valor);
    }
  }

  for (const filho of filhos) {
    if (filho === undefined || filho === null || filho === false) continue;
    elemento.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }

  return elemento;
}

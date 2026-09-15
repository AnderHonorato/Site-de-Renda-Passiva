// Sincronizado de compartilhado/scripts/armazenamento/analisar-json-seguro.js — edite a origem e rode "npm run sincronizar" na raiz.
// Interpreta JSON de origem não confiável (cópia importada, armazenamento local)
// com limite de tamanho e profundidade, removendo chaves que permitem poluição de protótipo.
// Retorna { válido: true, dados } ou { válido: false, erro }.

const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

function medirProfundidade(valor, limite, nível = 0) {
  if (nível > limite) return false;
  if (valor && typeof valor === 'object') {
    for (const item of Object.values(valor)) {
      if (!medirProfundidade(item, limite, nível + 1)) return false;
    }
  }
  return true;
}

export function analisarJsonSeguro(texto, { tamanhoMáximo = 1_000_000, profundidadeMáxima = 12 } = {}) {
  if (typeof texto !== 'string') return { válido: false, erro: 'Conteúdo inválido.' };
  if (texto.length > tamanhoMáximo) return { válido: false, erro: 'O arquivo é grande demais para ser importado.' };
  let dados;
  try {
    dados = JSON.parse(texto, (chave, valor) => (CHAVES_PROIBIDAS.has(chave) ? undefined : valor));
  } catch {
    return { válido: false, erro: 'O arquivo não é um JSON válido.' };
  }
  if (!medirProfundidade(dados, profundidadeMáxima)) return { válido: false, erro: 'O arquivo tem estrutura aninhada demais.' };
  return { válido: true, dados };
}

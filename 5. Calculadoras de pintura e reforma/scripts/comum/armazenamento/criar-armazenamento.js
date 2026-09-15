// Sincronizado de compartilhado/scripts/armazenamento/criar-armazenamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Envolve o localStorage com prefixo do produto e tratamento de falhas
// (modo privado, cota cheia, bloqueio do navegador). Nunca lança erro para a interface.
import { analisarJsonSeguro } from './analisar-json-seguro.js';

function prefixoDaPágina() {
  return typeof document !== 'undefined' ? document.documentElement.dataset.prefixo : undefined;
}

export function criarArmazenamento({ prefixo = prefixoDaPágina(), armazenamento } = {}) {
  if (!prefixo) throw new Error('Prefixo de armazenamento não definido.');
  let base = armazenamento;
  if (base === undefined) {
    try {
      base = globalThis.localStorage;
    } catch {
      base = null;
    }
  }
  let disponível = false;
  if (base) {
    try {
      const chaveDeTeste = `${prefixo}:teste`;
      base.setItem(chaveDeTeste, '1');
      base.removeItem(chaveDeTeste);
      disponível = true;
    } catch {
      disponível = false;
    }
  }
  const chaveCompleta = (chave) => `${prefixo}:${chave}`;

  return {
    disponível,
    prefixo,
    ler(chave) {
      if (!disponível) return null;
      try {
        const texto = base.getItem(chaveCompleta(chave));
        if (texto === null) return null;
        const resultado = analisarJsonSeguro(texto, { tamanhoMáximo: 5_000_000, profundidadeMáxima: 16 });
        return resultado.válido ? resultado.dados : null;
      } catch {
        return null;
      }
    },
    gravar(chave, valor) {
      if (!disponível) return false;
      try {
        base.setItem(chaveCompleta(chave), JSON.stringify(valor));
        return true;
      } catch {
        return false;
      }
    },
    remover(chave) {
      if (!disponível) return false;
      try {
        base.removeItem(chaveCompleta(chave));
        return true;
      } catch {
        return false;
      }
    },
    listarChaves() {
      if (!disponível) return [];
      const chaves = [];
      try {
        for (let índice = 0; índice < base.length; índice += 1) {
          const chave = base.key(índice);
          if (chave && chave.startsWith(`${prefixo}:`)) chaves.push(chave.slice(prefixo.length + 1));
        }
      } catch {
        return [];
      }
      return chaves;
    },
  };
}

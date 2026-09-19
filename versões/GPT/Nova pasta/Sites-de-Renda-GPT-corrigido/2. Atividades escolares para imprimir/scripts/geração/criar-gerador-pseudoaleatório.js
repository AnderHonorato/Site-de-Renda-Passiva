// Gerador pseudoaleatório determinístico (mulberry32): a mesma semente numérica
// sempre produz a mesma sequência, em qualquer aparelho. Usado para reproduzir a
// folha exata a partir da semente exibida na tela (operações, tabuada, caça-palavras).
// Não serve para criptografia ou sorteio com garantias de imprevisibilidade.
export function criarGeradorPseudoaleatório(semente) {
  let estado = (Number.isFinite(semente) ? Math.trunc(semente) : 0) >>> 0;
  if (estado === 0) estado = 1;

  function próximoDecimal() {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let resultado = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    resultado = (resultado + Math.imul(resultado ^ (resultado >>> 7), 61 | resultado)) ^ resultado;
    return ((resultado ^ (resultado >>> 14)) >>> 0) / 4294967296;
  }

  return {
    /** Número decimal em [0, 1). */
    decimal() {
      return próximoDecimal();
    },
    /** Inteiro em [mínimo, máximo], incluindo as duas pontas. */
    inteiroEntre(mínimo, máximo) {
      if (máximo < mínimo) [mínimo, máximo] = [máximo, mínimo];
      return mínimo + Math.floor(próximoDecimal() * (máximo - mínimo + 1));
    },
    /** Um elemento aleatório da lista (não remove nem altera a lista original). */
    elementoDe(lista) {
      return lista[Math.floor(próximoDecimal() * lista.length)];
    },
    /** Cópia embaralhada da lista (Fisher–Yates), sem alterar a lista original. */
    embaralhar(lista) {
      const cópia = lista.slice();
      for (let índice = cópia.length - 1; índice > 0; índice -= 1) {
        const outro = Math.floor(próximoDecimal() * (índice + 1));
        [cópia[índice], cópia[outro]] = [cópia[outro], cópia[índice]];
      }
      return cópia;
    },
  };
}

/** Deriva uma semente numérica de 32 bits de um texto qualquer (ex.: nome salvo). */
export function sementeAPartirDeTexto(texto) {
  const entrada = String(texto ?? '');
  let hash = 2166136261;
  for (let índice = 0; índice < entrada.length; índice += 1) {
    hash ^= entrada.codePointAt(índice) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Gera uma semente nova, adequada para preencher o campo "semente" pela primeira vez. */
export function gerarSementeAleatória() {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 4294967295);
}

/**
 * Apoio dos testes de exportação em PDF: executa o botão de download de verdade
 * (o `gerar` que a tela chama) e devolve o texto que o PDF baixado escreve.
 *
 * O download do navegador é simulado só no último passo — o `<a download>` e o
 * `URL.createObjectURL` —, então o teste passa pelo mesmo resumo, subtítulo e
 * codificação que chegam à pessoa.
 */

/**
 * Chama `gerar()` e captura o arquivo que seria baixado.
 * @param {() => void} gerar
 * @returns {Promise<{nome: string, tipo: string, bytes: Uint8Array}>}
 */
export async function arquivoBaixado(gerar) {
  const documentoAntes = globalThis.document;
  const criarAntes = URL.createObjectURL;
  const revogarAntes = URL.revokeObjectURL;
  let blob = null;
  let nome = '';
  globalThis.document = {
    createElement: () => ({
      set download(valor) { nome = valor; },
      get download() { return nome; },
      click() {},
      remove() {},
    }),
    body: { append() {} },
  };
  URL.createObjectURL = (conteúdo) => { blob = conteúdo; return 'blob:teste'; };
  URL.revokeObjectURL = () => {};
  try {
    gerar();
  } finally {
    globalThis.document = documentoAntes;
    URL.createObjectURL = criarAntes;
    URL.revokeObjectURL = revogarAntes;
  }
  if (!blob) throw new Error('nenhum arquivo foi baixado');
  return { nome, tipo: blob.type, bytes: new Uint8Array(await blob.arrayBuffer()) };
}

/**
 * A quebra de linha do PDF trata o espaço fixo (U+00A0) de "R$ 1,00" como
 * espaço comum; para comparar trechos, os dois lados passam por aqui.
 * @param {string} texto
 */
export function espaçosComuns(texto) {
  return texto.replace(/ /g, ' ');
}

/** Bytes WinAnsi de 0x80 a 0x9f que o portal usa; o resto coincide com Latin-1. */
const WINANSI = new Map([[0x96, '–'], [0x97, '—'], [0x95, '•'], [0x85, '…'], [0x93, '“'], [0x94, '”']]);

/**
 * Texto de todos os `(…) Tj` do PDF, na ordem, já sem os escapes.
 * @param {Uint8Array} bytes
 * @returns {string[]}
 */
export function textosDoPdf(bytes) {
  const bruto = new TextDecoder('latin1').decode(bytes);
  const textos = [];
  for (const [, escapado] of bruto.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)) {
    textos.push(escapado.replace(/\\([0-7]{3}|.)/g, (_, código) => {
      if (código.length === 1) return código;
      const byte = parseInt(código, 8);
      return WINANSI.get(byte) ?? String.fromCharCode(byte);
    }));
  }
  return textos;
}

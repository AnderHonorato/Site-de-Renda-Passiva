/**
 * Marcação mínima para blocos de texto das páginas (ajuda, privacidade, termos).
 *
 * O texto vem do dicionário (e, no futuro, do painel do admin), então é sempre PURO TEXTO:
 * aqui ele é escapado primeiro e só depois recebe as poucas marcações permitidas. Nunca passa
 * HTML de fora para a página.
 *
 *   *ênfase*              → <em>
 *   [[tecla:/]]           → <kbd>
 *   [[código:portal.]]    → <code>
 *   [texto](endereço)     → <a href> (só endereços internos ou https)
 *
 * Linhas de bloco:
 *   "## Título"   → <h2>        "> texto"  → <p class="suave">
 *   "- item"      → <ul><li>    outro      → <p>
 */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Endereços aceitos nos links: relativos simples, âncoras e https. Nada de javascript:. */
const ENDEREÇO_SEGURO = /^(?:[a-z0-9áéíóúâêôãõç_\-./#?=&%]+|https:\/\/[^\s"'<>]+)$/i;

/** Marcações dentro de uma linha. */
export function emLinha(texto) {
  return escapar(texto)
    .replace(/\[\[tecla:([^\]]+)\]\]/g, '<kbd>$1</kbd>')
    .replace(/\[\[código:([^\]]+)\]\]/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^()\s]*(?:\([^()\s]*\))?[^()\s]*)\)/g, (_, rótulo, endereço) => {
      const limpo = endereço.replaceAll('&amp;', '&');
      return ENDEREÇO_SEGURO.test(limpo) ? `<a href="${endereço}">${rótulo}</a>` : rótulo;
    })
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * Converte uma lista de blocos em HTML.
 * @param {string[]} blocos
 * @param {string} [recuo] espaços antes de cada linha, para o HTML gerado ficar legível
 */
export function blocosEmHtml(blocos, recuo = '      ') {
  const saída = [];
  let itens = [];
  const fecharLista = () => {
    if (itens.length === 0) return;
    saída.push(`${recuo}<ul>\n${itens.map((i) => `${recuo}  <li>${emLinha(i)}</li>`).join('\n')}\n${recuo}</ul>`);
    itens = [];
  };
  for (const bloco of blocos) {
    if (bloco.startsWith('- ')) { itens.push(bloco.slice(2)); continue; }
    fecharLista();
    if (bloco.startsWith('## ')) saída.push(`${recuo}<h2>${emLinha(bloco.slice(3))}</h2>`);
    else if (bloco.startsWith('> ')) saída.push(`${recuo}<p class="suave">${emLinha(bloco.slice(2))}</p>`);
    else saída.push(`${recuo}<p>${emLinha(bloco)}</p>`);
  }
  fecharLista();
  return saída.join('\n');
}

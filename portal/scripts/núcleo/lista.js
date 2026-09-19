/** Desenho da lista de ferramentas — o componente mais reaproveitado do portal. */
import { escapar } from './texto.js';
import { ícone } from './ícones.js';
import { lerFavoritos, alternarFavorito } from './preferências.js';
import { avisar } from './interface.js';

/**
 * Markup de uma linha de ferramenta.
 * Linha compacta de ~54 px: cabe muita coisa na primeira dobra.
 * @param {object} f ferramenta do catálogo
 * @param {{base?: string, favoritada?: boolean}} [opções]
 * @returns {string}
 */
export function linhaDeFerramenta(f, { base = '', favoritada = false } = {}) {
  const planejada = f.status === 'planejada';
  const destino = planejada ? `${base}ferramentas.html#${f.slug}` : `${base}f/${f.slug}/`;
  const selo = planejada
    ? '<span class="etiqueta">Planejada</span>'
    : f.plano === 'plus' ? '<span class="etiqueta etiqueta--info">Plus</span>' : '';
  return `<div class="ferramenta-linha" data-status="${f.status}" data-slug="${escapar(f.slug)}">
  <span class="ferramenta-linha__ícone">${ícone(f.ícone)}</span>
  <span class="ferramenta-linha__texto">
    <a class="ferramenta-linha__nome" href="${escapar(destino)}"${planejada ? ' aria-disabled="true"' : ''}>${escapar(f.nome)}${selo}</a>
    <span class="ferramenta-linha__resumo">${escapar(f.resumo)}</span>
  </span>
  <span class="ferramenta-linha__fim">
    <button class="favorito" type="button" data-favorito="${escapar(f.slug)}"
      aria-pressed="${favoritada}" aria-label="${favoritada ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${escapar(f.nome)}">${ícone('marcador')}</button>
    <span class="ferramenta-linha__seta" aria-hidden="true">${ícone('chevron')}</span>
  </span>
</div>`;
}

/**
 * Desenha uma lista de ferramentas dentro de um contêiner.
 * @param {HTMLElement} contêiner
 * @param {readonly object[]} lista
 * @param {{base?: string, vazio?: string}} [opções]
 */
export function desenharLista(contêiner, lista, { base = '', vazio = 'Nenhuma ferramenta encontrada.' } = {}) {
  const favoritos = new Set(lerFavoritos());
  if (lista.length === 0) {
    contêiner.innerHTML = `<p class="vazio">${ícone('busca')}${escapar(vazio)}</p>`;
    return;
  }
  contêiner.innerHTML = lista
    .map((f) => linhaDeFerramenta(f, { base, favoritada: favoritos.has(f.slug) }))
    .join('');
}

/**
 * Liga os botões de favorito de um contêiner. Chamar uma vez por contêiner.
 * @param {HTMLElement} contêiner
 * @param {() => void} [aoMudar] chamado depois de alternar, para redesenhar listas dependentes
 */
export function ligarFavoritos(contêiner, aoMudar) {
  contêiner.addEventListener('click', (evento) => {
    const botão = evento.target instanceof Element ? evento.target.closest('[data-favorito]') : null;
    if (!botão) return;
    evento.preventDefault();
    const { favoritado, limiteAtingido } = alternarFavorito(botão.dataset.favorito);
    if (limiteAtingido) {
      avisar('Limite de favoritos atingido. Remova algum antes de salvar outro.');
      return;
    }
    botão.setAttribute('aria-pressed', String(favoritado));
    botão.setAttribute('aria-label', `${favoritado ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${botão.closest('.ferramenta-linha')?.querySelector('.ferramenta-linha__nome')?.textContent?.trim() ?? ''}`);
    avisar(favoritado ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
    aoMudar?.();
  });
}

/** Desenho da lista de ferramentas — o componente mais reaproveitado do portal. */
import { escapar } from './texto.js';
import { ícone } from './ícones.js';
import { lerFavoritos, alternarFavorito } from './preferências.js';
import { avisar } from './interface.js';

/**
 * Markup de uma linha de ferramenta.
 *
 * A linha inteira é o alvo do toque, não só o título: o link é esticado por
 * `::after` sobre toda a área. Antes, só o texto do nome respondia — 224 × 23 px
 * dentro de uma linha de 63 px de altura, e tocar no ícone ou no resumo não
 * fazia nada.
 *
 * Ferramenta ainda não implementada não vira link: vira um botão que abre a
 * ficha do que ela vai fazer, ali mesmo. Link que leva a lugar nenhum e ainda
 * apaga o filtro aplicado é pior do que não ter link.
 *
 * @param {object} f ferramenta do catálogo
 * @param {{base?: string, favoritada?: boolean}} [opções]
 * @returns {string}
 */
export function linhaDeFerramenta(f, { base = '', favoritada = false } = {}) {
  const planejada = f.status === 'planejada';
  const selo = planejada
    ? '<span class="etiqueta">Planejada</span>'
    : f.plano === 'plus' ? '<span class="etiqueta etiqueta--info">Plus</span>' : '';

  const alvo = planejada
    ? `<button type="button" class="ferramenta-linha__nome ferramenta-linha__alvo" data-ficha="${escapar(f.slug)}"
        aria-expanded="false">${escapar(f.nome)}${selo}</button>`
    : `<a class="ferramenta-linha__nome ferramenta-linha__alvo" href="${escapar(`${base}f/${f.slug}/`)}">${escapar(f.nome)}${selo}</a>`;

  return `<div class="ferramenta-linha" data-status="${f.status}" data-slug="${escapar(f.slug)}">
  <span class="ferramenta-linha__ícone">${ícone(f.ícone)}</span>
  <span class="ferramenta-linha__texto">
    ${alvo}
    <span class="ferramenta-linha__resumo">${escapar(f.resumo)}</span>
  </span>
  <span class="ferramenta-linha__fim">
    <button class="favorito" type="button" data-favorito="${escapar(f.slug)}"
      aria-pressed="${favoritada}" aria-label="${favoritada ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${escapar(f.nome)}">${ícone('marcador')}</button>
    <span class="ferramenta-linha__seta" aria-hidden="true">${ícone(planejada ? 'chevron-baixo' : 'chevron')}</span>
  </span>
  <div class="ferramenta-linha__ficha" hidden></div>
</div>`;
}

/**
 * Monta a ficha de uma ferramenta ainda não implementada.
 * É o que a página inicial promete quando diz que nenhuma abre tela vazia.
 * @param {object} f
 * @returns {string}
 */
function fichaDaPlanejada(f) {
  const item = (rótulo, valor) => `<div><dt>${escapar(rótulo)}</dt><dd>${escapar(valor)}</dd></div>`;
  return `<p class="rótulo">Ainda não implementada</p>
    <dl class="ficha t-1">
      ${item('Para que serve', f.problema)}
      ${item('Você informará', f.entra)}
      ${item('Você receberá', f.sai)}
      ${item('Como vai calcular', f.processa)}
    </dl>
    <p class="pequeno suave t-1">Ela aparece no catálogo porque está planejada e com o escopo definido.
      Quando abrir, terá validação, tratamento de erro e teste automático, como as demais.</p>`;
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
 * Liga os botões de favorito e as fichas das planejadas. Chamar uma vez por contêiner.
 * @param {HTMLElement} contêiner
 * @param {readonly object[]} catálogo para encontrar a ferramenta da ficha
 * @param {() => void} [aoMudar] chamado depois de alternar um favorito
 */
export function ligarLista(contêiner, catálogo, aoMudar) {
  contêiner.addEventListener('click', (evento) => {
    const alvo = evento.target instanceof Element ? evento.target : null;
    if (!alvo) return;

    const favorito = alvo.closest('[data-favorito]');
    if (favorito) {
      evento.preventDefault();
      const { favoritado, limiteAtingido } = alternarFavorito(favorito.dataset.favorito);
      if (limiteAtingido) {
        avisar('Limite de favoritos atingido. Remova algum antes de salvar outro.');
        return;
      }
      const nome = favorito.closest('.ferramenta-linha')?.querySelector('.ferramenta-linha__nome')?.textContent?.trim() ?? '';
      favorito.setAttribute('aria-pressed', String(favoritado));
      favorito.setAttribute('aria-label', `${favoritado ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${nome}`);
      avisar(favoritado ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
      aoMudar?.();
      return;
    }

    const gatilhoDaFicha = alvo.closest('[data-ficha]');
    if (gatilhoDaFicha) {
      const linha = gatilhoDaFicha.closest('.ferramenta-linha');
      const ficha = linha?.querySelector('.ferramenta-linha__ficha');
      if (!ficha) return;
      const abrindo = ficha.hidden;
      if (abrindo && !ficha.dataset.pronta) {
        const ferramenta = catálogo.find((f) => f.slug === gatilhoDaFicha.dataset.ficha);
        if (ferramenta) {
          ficha.innerHTML = fichaDaPlanejada(ferramenta);
          ficha.dataset.pronta = 'sim';
        }
      }
      ficha.hidden = !abrindo;
      gatilhoDaFicha.setAttribute('aria-expanded', String(abrindo));
    }
  });
}

/** Mantido para quem só precisa dos favoritos, sem fichas. */
export function ligarFavoritos(contêiner, aoMudar) {
  ligarLista(contêiner, [], aoMudar);
}

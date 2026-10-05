/** Desenho da lista de ferramentas — o componente mais reaproveitado do portal. */
import { escapar } from './texto.js';
import { ícone } from './ícones.js';
import { íconeVivo, imagemDoTema, conferirÍconesVivos } from './ícone-animado.js';
import { lerFavoritos, alternarFavorito } from './preferências.js';
import { avisar } from './interface.js';
import { t, éInglês, raizDoSite } from './idioma.js';

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
export function linhaDeFerramenta(f, { base = raizDoSite, favoritada = false } = {}) {
  const planejada = f.status === 'planejada';
  const selo = planejada
    ? `<span class="etiqueta">${escapar(t('lista.planejada'))}</span>`
    : f.plano === 'plus' ? `<span class="etiqueta etiqueta--info">${escapar(t('lista.plus'))}</span>` : '';
  // As ferramentas ainda são só em português (Onda 9): na lista em inglês o link avisa disso.
  const idiomaDoLink = éInglês && !planejada;
  const avisoDeIdioma = idiomaDoLink ? `<span class="etiqueta">${escapar(t('lista.versãoSóEmPortuguês'))}</span>` : '';

  const alvo = planejada
    ? `<button type="button" class="ferramenta-linha__nome ferramenta-linha__alvo" data-ficha="${escapar(f.slug)}"
        aria-expanded="false">${escapar(f.nome)}${selo}</button>`
    : `<a class="ferramenta-linha__nome ferramenta-linha__alvo" href="${escapar(`${base}f/${f.slug}/`)}"${idiomaDoLink ? ' hreflang="pt-BR"' : ''}>${escapar(f.nome)}${selo}${avisoDeIdioma}</a>`;

  return `<div class="ferramenta-linha" data-status="${f.status}" data-slug="${escapar(f.slug)}">
  <span class="ferramenta-linha__ícone">${planejada ? ícone(f.ícone) : íconeVivo(f.ícone, { base, tamanho: 23 })}</span>
  <span class="ferramenta-linha__texto">
    ${alvo}
    <span class="ferramenta-linha__resumo">${escapar(f.resumo)}</span>
  </span>
  <span class="ferramenta-linha__fim">
    <button class="favorito" type="button" data-favorito="${escapar(f.slug)}"
      aria-pressed="${favoritada}" aria-label="${escapar(t('lista.favoritoComNome', { ação: favoritada ? t('lista.removerFavorito') : t('lista.salvarFavorito'), nome: f.nome }))}">${ícone('marcador')}</button>
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
  return `<p class="rótulo">${escapar(t('lista.fichaTítulo'))}</p>
    <dl class="ficha t-1">
      ${item(t('lista.fichaParaQueServe'), f.problema)}
      ${item(t('lista.fichaVocêInformará'), f.entra)}
      ${item(t('lista.fichaVocêReceberá'), f.sai)}
      ${item(t('lista.fichaComoVaiCalcular'), f.processa)}
    </dl>
    <p class="pequeno suave t-1">${escapar(t('lista.fichaNota'))}</p>`;
}

/**
 * Desenha uma lista de ferramentas dentro de um contêiner.
 * @param {HTMLElement} contêiner
 * @param {readonly object[]} lista
 * @param {{base?: string, vazio?: string}} [opções]
 */
export function desenharLista(contêiner, lista, { base = raizDoSite, vazio = t('lista.nenhuma') } = {}) {
  const favoritos = new Set(lerFavoritos());
  if (lista.length === 0) {
    contêiner.innerHTML = `<p class="vazio">${imagemDoTema(`${base}recursos/ilustrações/estado-vazio`, { classe: 'vazio__desenho', largura: 160, altura: 120 })}${escapar(vazio)}</p>`;
    return;
  }
  contêiner.innerHTML = lista
    .map((f) => linhaDeFerramenta(f, { base, favoritada: favoritos.has(f.slug) }))
    .join('');
  conferirÍconesVivos(contêiner);
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
        avisar(t('lista.limiteFavoritos'));
        return;
      }
      const nome = favorito.closest('.ferramenta-linha')?.querySelector('.ferramenta-linha__nome')?.textContent?.trim() ?? '';
      favorito.setAttribute('aria-pressed', String(favoritado));
      favorito.setAttribute('aria-label', t('lista.favoritoComNome', { ação: favoritado ? t('lista.removerFavorito') : t('lista.salvarFavorito'), nome }));
      avisar(favoritado ? t('lista.salvoNosFavoritos') : t('lista.removidoDosFavoritos'));
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

/** Página inicial, bloco "busca": campo com sugestões ao vivo e atalhos de intenção. */
import { ferramentas } from '../../../dados/catálogo.js';
import { buscar } from '../../núcleo/busca.js';
import { escapar } from '../../núcleo/texto.js';
import { ícone } from '../../núcleo/ícones.js';
import { insígniaDePlano } from '../../núcleo/insígnia-plano.js';
import { t, lista, raizDoSite, raizDoIdioma } from '../../núcleo/idioma.js';

export function montar() {
  const campoDeBusca = document.getElementById('busca');
  const caixaDeSugestões = document.getElementById('sugestões');
  if (!campoDeBusca || !caixaDeSugestões) throw new Error('A busca da página inicial não está no HTML.');

  const INTENÇÕES = lista('início.intenções');
  const caixaDeIntenções = document.getElementById('intenções');
  if (caixaDeIntenções) {
    caixaDeIntenções.innerHTML = INTENÇÕES
      .map((i) => `<button type="button" data-intenção="${escapar(i)}">${escapar(i)}</button>`).join('');
    caixaDeIntenções.addEventListener('click', (evento) => {
      const botão = evento.target instanceof Element ? evento.target.closest('[data-intenção]') : null;
      if (!botão || !(campoDeBusca instanceof HTMLInputElement)) return;
      campoDeBusca.value = botão.dataset.intenção;
      campoDeBusca.focus();
      atualizarSugestões();
    });
  }

  /* -------------------------------------------------------- busca ao vivo */
  let ativa = -1;

  function fecharSugestões() {
    caixaDeSugestões.hidden = true;
    campoDeBusca.setAttribute('aria-expanded', 'false');
    ativa = -1;
  }

  function atualizarSugestões() {
    const consulta = campoDeBusca.value.trim();
    if (consulta.length < 2) { fecharSugestões(); return; }

    const achados = buscar(ferramentas, consulta, { limite: 7 });
    if (achados.length === 0) {
      caixaDeSugestões.innerHTML = `<p class="sugestões__vazio">${escapar(t('início.nadaEncontrado', { consulta }))}<br>
        <a href="${raizDoIdioma}ferramentas.html">${escapar(t('início.verCatálogoCompleto'))}</a></p>`;
    } else {
      caixaDeSugestões.innerHTML = achados.map((f, i) => {
        const destino = f.status === 'pronta' ? `${raizDoSite}f/${f.slug}/` : `${raizDoIdioma}ferramentas.html#${f.slug}`;
        const selo = f.status === 'pronta' ? insígniaDePlano(f) : `<span class="etiqueta">${escapar(t('lista.planejada'))}</span>`;
        return `<a class="sugestões__item" role="option" id="sugestão-${i}" aria-selected="false" href="${destino}">
          ${ícone(f.ícone)}<span><b>${escapar(f.nome)}</b><small>${escapar(f.resumo)}</small></span>${selo}</a>`;
      }).join('');
    }
    caixaDeSugestões.hidden = false;
    campoDeBusca.setAttribute('aria-expanded', 'true');
    ativa = -1;
  }

  function mover(passo) {
    const itens = [...caixaDeSugestões.querySelectorAll('.sugestões__item')];
    if (itens.length === 0) return;
    itens[ativa]?.removeAttribute('data-ativo');
    itens[ativa]?.setAttribute('aria-selected', 'false');
    ativa = (ativa + passo + itens.length) % itens.length;
    itens[ativa].setAttribute('data-ativo', 'sim');
    itens[ativa].setAttribute('aria-selected', 'true');
    campoDeBusca.setAttribute('aria-activedescendant', itens[ativa].id);
    itens[ativa].scrollIntoView({ block: 'nearest' });
  }

  if (campoDeBusca instanceof HTMLInputElement) {
    campoDeBusca.addEventListener('input', atualizarSugestões);
    campoDeBusca.addEventListener('focus', atualizarSugestões);
    campoDeBusca.addEventListener('keydown', (evento) => {
      if (caixaDeSugestões.hidden) {
        if (evento.key === 'Enter' && campoDeBusca.value.trim()) {
          evento.preventDefault();
          location.href = `${raizDoIdioma}ferramentas.html?busca=${encodeURIComponent(campoDeBusca.value.trim())}`;
        }
        return;
      }
      if (evento.key === 'ArrowDown') { evento.preventDefault(); mover(1); }
      else if (evento.key === 'ArrowUp') { evento.preventDefault(); mover(-1); }
      else if (evento.key === 'Escape') { fecharSugestões(); }
      else if (evento.key === 'Enter') {
        const itens = [...caixaDeSugestões.querySelectorAll('.sugestões__item')];
        if (ativa >= 0 && itens[ativa]) { evento.preventDefault(); itens[ativa].click(); }
        else if (campoDeBusca.value.trim()) {
          evento.preventDefault();
          location.href = `${raizDoIdioma}ferramentas.html?busca=${encodeURIComponent(campoDeBusca.value.trim())}`;
        }
      }
    });
    document.addEventListener('click', (evento) => {
      const alvo = evento.target;
      if (alvo instanceof Node && !caixaDeSugestões.contains(alvo) && alvo !== campoDeBusca) fecharSugestões();
    });
  }
}

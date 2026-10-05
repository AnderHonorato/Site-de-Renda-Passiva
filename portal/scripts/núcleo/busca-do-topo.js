/**
 * Busca do cabeçalho: o botão da lupa abre o campo ali mesmo, com sugestões ao vivo.
 *
 * O catálogo e a busca só são baixados na primeira vez que a pessoa abre o campo (import()
 * dinâmico dentro de um isolarBloco), então a lupa não pesa no carregamento de nenhuma página.
 * Enter vai para o catálogo com a busca aplicada, ou direto para a sugestão destacada.
 */
import { isolarBloco, carregarBloco } from './isolar-bloco.js';
import { t, raizDoSite, raizDoIdioma } from './idioma.js';
import { escapar } from './texto.js';
import { ícone } from './ícones.js';

const aqui = (arquivo) => new URL(arquivo, import.meta.url).href;

/** Liga a busca do cabeçalho. Não faz nada se a página não tiver o formulário. */
export function ligarBuscaDoTopo() {
  const formulário = document.getElementById('busca-topo');
  const botão = document.getElementById('ir-para-busca');
  const campo = document.getElementById('busca-topo-campo');
  const caixa = document.getElementById('busca-topo-sugestões');
  if (!formulário || !botão || !(campo instanceof HTMLInputElement) || !caixa) return;

  let motor = null; // { buscar, ferramentas }, carregado na primeira abertura
  let ativa = -1;

  const aberta = () => formulário.dataset.aberta === 'sim';

  function fecharSugestões() {
    caixa.hidden = true;
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
    ativa = -1;
  }

  function abrir() {
    formulário.dataset.aberta = 'sim';
    botão.setAttribute('aria-expanded', 'true');
    campo.tabIndex = 0;
    // O campo ainda está crescendo: espera o quadro para o foco não rolar a página.
    requestAnimationFrame(() => campo.focus({ preventScroll: true }));
    if (!motor) {
      isolarBloco('busca-do-topo', async (tentativa) => {
        const [busca, catálogo] = await Promise.all([
          carregarBloco(aqui('./busca.js'), tentativa),
          carregarBloco(new URL('../../dados/catálogo.js', import.meta.url).href, tentativa),
        ]);
        motor = { buscar: busca.buscar, ferramentas: catálogo.ferramentas };
        if (campo.value.trim().length >= 2) atualizar();
      });
    }
  }

  function fechar({ devolverFoco = true } = {}) {
    formulário.dataset.aberta = 'não';
    botão.setAttribute('aria-expanded', 'false');
    campo.tabIndex = -1;
    campo.value = '';
    fecharSugestões();
    if (devolverFoco) botão.focus({ preventScroll: true });
  }

  function destinoDe(f) {
    return f.status === 'pronta' ? `${raizDoSite}f/${f.slug}/` : `${raizDoIdioma}ferramentas.html#${f.slug}`;
  }

  /** Escreve as sugestões; todo texto vindo do catálogo ou da pessoa passa por escapar(). */
  function atualizar() {
    const consulta = campo.value.trim();
    if (consulta.length < 2 || !motor) { fecharSugestões(); return; }
    const achados = motor.buscar(motor.ferramentas, consulta, { limite: 6 });
    if (achados.length === 0) {
      caixa.innerHTML = `<p class="sugestões__vazio">${escapar(t('início.nadaEncontrado', { consulta }))}<br>`
        + `<a href="${raizDoIdioma}ferramentas.html?busca=${encodeURIComponent(consulta)}">${escapar(t('início.verCatálogoCompleto'))}</a></p>`;
    } else {
      caixa.innerHTML = achados.map((f, i) => {
        const selo = f.status === 'pronta' ? '' : `<span class="etiqueta">${escapar(t('lista.planejada'))}</span>`;
        return `<a class="sugestões__item" role="option" id="sugestão-topo-${i}" aria-selected="false" href="${escapar(destinoDe(f))}">`
          + `${ícone(f.ícone)}<span><b>${escapar(f.nome)}</b><small>${escapar(f.resumo)}</small></span>${selo}</a>`;
      }).join('');
    }
    caixa.hidden = false;
    campo.setAttribute('aria-expanded', 'true');
    ativa = -1;
  }

  function mover(passo) {
    const itens = [...caixa.querySelectorAll('.sugestões__item')];
    if (itens.length === 0) return;
    itens[ativa]?.removeAttribute('data-ativo');
    itens[ativa]?.setAttribute('aria-selected', 'false');
    ativa = (ativa + passo + itens.length) % itens.length;
    itens[ativa].setAttribute('data-ativo', 'sim');
    itens[ativa].setAttribute('aria-selected', 'true');
    campo.setAttribute('aria-activedescendant', itens[ativa].id);
  }

  botão.addEventListener('click', () => (aberta() ? fechar() : abrir()));
  campo.addEventListener('input', atualizar);
  campo.addEventListener('focus', atualizar);

  campo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') { evento.preventDefault(); fechar(); return; }
    if (evento.key === 'ArrowDown') { evento.preventDefault(); mover(1); return; }
    if (evento.key === 'ArrowUp') { evento.preventDefault(); mover(-1); return; }
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const itens = [...caixa.querySelectorAll('.sugestões__item')];
    if (ativa >= 0 && itens[ativa]) { itens[ativa].click(); return; }
    const consulta = campo.value.trim();
    if (consulta) location.href = `${raizDoIdioma}ferramentas.html?busca=${encodeURIComponent(consulta)}`;
  });
  formulário.addEventListener('submit', (evento) => evento.preventDefault());

  // Clicar fora fecha; sair do campo com Tab também.
  document.addEventListener('click', (evento) => {
    if (aberta() && evento.target instanceof Node && !formulário.contains(evento.target)) fechar({ devolverFoco: false });
  });
  formulário.addEventListener('focusout', (evento) => {
    if (aberta() && !formulário.contains(evento.relatedTarget)) fechar({ devolverFoco: false });
  });

  // A tecla / abre a busca do cabeçalho em qualquer página que não tenha o campo grande.
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || aberta()) return;
    const alvo = evento.target;
    const digitando = alvo instanceof HTMLElement && (alvo.isContentEditable || /^(input|textarea|select)$/i.test(alvo.tagName));
    if (digitando || document.getElementById('busca')) return;
    evento.preventDefault();
    abrir();
  });
}

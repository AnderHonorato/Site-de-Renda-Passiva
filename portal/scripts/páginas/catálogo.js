/** Catálogo: busca, filtro por categoria, por tipo de tarefa e por situação. */
import { ferramentas } from '../../dados/catálogo.js';
import { buscar } from '../núcleo/busca.js';
import { desenharLista, ligarLista } from '../núcleo/lista.js';
import { lerFavoritos } from '../núcleo/preferências.js';
import { plural } from '../núcleo/texto.js';

const campoDeBusca = document.getElementById('busca');
const pílulas = document.getElementById('pílulas-categorias');
const filtroTarefa = document.getElementById('filtro-tarefa');
const filtroStatus = document.getElementById('filtro-status');
const lista = document.getElementById('lista');
const contagem = document.getElementById('contagem');

const estado = { busca: '', categoria: 'todas', tarefa: 'todas', status: 'todas' };

/** Lê os filtros vindos da URL, para que links e menus já cheguem filtrados. */
function lerEndereço() {
  const parâmetros = new URLSearchParams(location.search);
  estado.categoria = parâmetros.get('categoria') ?? 'todas';
  estado.busca = parâmetros.get('busca') ?? '';
  estado.tarefa = parâmetros.get('tarefa') ?? 'todas';
  if (campoDeBusca instanceof HTMLInputElement) campoDeBusca.value = estado.busca;
  if (filtroTarefa instanceof HTMLSelectElement) filtroTarefa.value = estado.tarefa;
}

/**
 * Mantém a URL em dia, para que o filtro sobreviva a recarregar e compartilhar.
 *
 * Mudar de categoria ou de filtro empilha uma entrada no histórico, para que o
 * botão Voltar desfaça um filtro por vez — no celular, Voltar é o gesto
 * principal, e antes ele jogava a pessoa fora do catálogo de uma vez.
 * Digitação na busca só substitui, para não empilhar uma entrada por letra.
 * @param {boolean} empilhar
 */
function gravarEndereço(empilhar) {
  const parâmetros = new URLSearchParams();
  if (estado.busca) parâmetros.set('busca', estado.busca);
  if (estado.categoria !== 'todas') parâmetros.set('categoria', estado.categoria);
  if (estado.tarefa !== 'todas') parâmetros.set('tarefa', estado.tarefa);
  const consulta = parâmetros.toString();
  const endereço = consulta ? `?${consulta}` : location.pathname;
  if (endereço === location.pathname + location.search) return;
  if (empilhar) history.pushState({ ...estado }, '', endereço);
  else history.replaceState({ ...estado }, '', endereço);
}

function aplicar({ empilhar = false } = {}) {
  let resultado = buscar(ferramentas, estado.busca, {
    categoria: estado.categoria,
    tarefa: estado.tarefa,
    apenasProntas: estado.status === 'pronta',
  });

  if (estado.status === 'favoritas') {
    const favoritos = new Set(lerFavoritos());
    resultado = resultado.filter((f) => favoritos.has(f.slug));
  }

  desenharLista(lista, resultado, {
    vazio: estado.status === 'favoritas'
      ? 'Você ainda não salvou nenhuma ferramenta. Use o marcador ao lado do nome.'
      : 'Nenhuma ferramenta combina com esses filtros.',
  });

  const total = resultado.length;
  contagem.textContent = `${total} ${plural(total, 'ferramenta', 'ferramentas')}`;
  for (const botão of pílulas.querySelectorAll('[data-categoria]')) {
    botão.setAttribute('aria-pressed', String(botão.dataset.categoria === estado.categoria));
  }
  gravarEndereço(empilhar);
}

pílulas.addEventListener('click', (evento) => {
  const botão = evento.target instanceof Element ? evento.target.closest('[data-categoria]') : null;
  if (!botão) return;
  estado.categoria = botão.dataset.categoria;
  aplicar({ empilhar: true });
});

campoDeBusca?.addEventListener('input', () => {
  estado.busca = campoDeBusca.value;
  aplicar();
});
filtroTarefa?.addEventListener('change', () => { estado.tarefa = filtroTarefa.value; aplicar({ empilhar: true }); });
filtroStatus?.addEventListener('change', () => { estado.status = filtroStatus.value; aplicar(); });

ligarLista(lista, ferramentas, () => { if (estado.status === 'favoritas') aplicar(); });

// Voltar e avançar do navegador precisam repintar a lista com o estado do endereço.
addEventListener('popstate', () => { lerEndereço(); aplicar(); });

lerEndereço();
aplicar();

// Endereço com âncora de ferramenta: rola até ela, destaca e abre a ficha
// quando for uma planejada. Mantido porque links antigos continuam circulando.
if (location.hash.length > 1) {
  const alvo = lista.querySelector(`[data-slug="${CSS.escape(decodeURIComponent(location.hash.slice(1)))}"]`);
  if (alvo) {
    alvo.scrollIntoView({ block: 'center' });
    alvo.classList.add('ferramenta-linha--destacada');
    alvo.querySelector('[data-ficha]')?.click();
  }
}

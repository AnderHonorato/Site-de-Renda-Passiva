/** Catálogo: busca, filtro por categoria, por tipo de tarefa e por situação. */
import { ferramentas } from '../../dados/catálogo.js';
import { buscar } from '../núcleo/busca.js';
import { desenharLista, ligarFavoritos } from '../núcleo/lista.js';
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

/** Mantém a URL em dia, para que o filtro sobreviva a recarregar e compartilhar. */
function gravarEndereço() {
  const parâmetros = new URLSearchParams();
  if (estado.busca) parâmetros.set('busca', estado.busca);
  if (estado.categoria !== 'todas') parâmetros.set('categoria', estado.categoria);
  if (estado.tarefa !== 'todas') parâmetros.set('tarefa', estado.tarefa);
  const consulta = parâmetros.toString();
  history.replaceState(null, '', consulta ? `?${consulta}` : location.pathname);
}

function aplicar() {
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
  gravarEndereço();
}

pílulas.addEventListener('click', (evento) => {
  const botão = evento.target instanceof Element ? evento.target.closest('[data-categoria]') : null;
  if (!botão) return;
  estado.categoria = botão.dataset.categoria;
  aplicar();
});

campoDeBusca?.addEventListener('input', () => {
  estado.busca = campoDeBusca.value;
  aplicar();
});
filtroTarefa?.addEventListener('change', () => { estado.tarefa = filtroTarefa.value; aplicar(); });
filtroStatus?.addEventListener('change', () => { estado.status = filtroStatus.value; aplicar(); });

ligarFavoritos(lista, () => { if (estado.status === 'favoritas') aplicar(); });

lerEndereço();
aplicar();

// Chegou por âncora de uma ferramenta planejada: destaca a linha correspondente.
if (location.hash.length > 1) {
  const alvo = lista.querySelector(`[data-slug="${CSS.escape(location.hash.slice(1))}"]`);
  if (alvo) {
    alvo.scrollIntoView({ block: 'center' });
    alvo.classList.add('ferramenta-linha--destacada');
  }
}

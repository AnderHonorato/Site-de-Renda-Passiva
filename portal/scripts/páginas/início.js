/** Página inicial: busca com sugestões, atalhos de intenção, recentes e prontas. */
import { ferramentas, ferramentasProntas, ferramentaPorSlug } from '../../dados/catálogo.js';
import { categorias } from '../../dados/categorias.js';
import { buscar } from '../núcleo/busca.js';
import { desenharLista, ligarFavoritos } from '../núcleo/lista.js';
import { lerRecentes, limparRecentes } from '../núcleo/preferências.js';
import { escapar } from '../núcleo/texto.js';
import { ícone } from '../núcleo/ícones.js';

const campoDeBusca = document.getElementById('busca');
const caixaDeSugestões = document.getElementById('sugestões');
const listaProntas = document.getElementById('lista-prontas');
const seçãoRecentes = document.getElementById('recentes');
const listaRecentes = document.getElementById('lista-recentes');

/* ---------------------------------------------- contagem por categoria */
for (const c of categorias) {
  const alvo = document.querySelector(`[data-contagem="${c.id}"]`);
  if (!alvo) continue;
  const total = ferramentas.filter((f) => f.cat === c.id).length;
  const prontas = ferramentasProntas.filter((f) => f.cat === c.id).length;
  alvo.textContent = `${prontas} de ${total} prontas`;
}

/* ------------------------------------------------- sugestões de intenção */
const INTENÇÕES = [
  'quanto devo cobrar',
  'rachar a conta',
  'quantos dias faltam',
  'qual embalagem compensa',
  'somar horas trabalhadas',
  'fazer um orçamento',
  'limpar minha planilha',
  'criar senha forte',
];
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
    caixaDeSugestões.innerHTML = `<p class="sugestões__vazio">Nada encontrado para “${escapar(consulta)}”.<br>
      <a href="ferramentas.html">Ver o catálogo completo</a></p>`;
  } else {
    caixaDeSugestões.innerHTML = achados.map((f, i) => {
      const destino = f.status === 'pronta' ? `f/${f.slug}/` : `ferramentas.html#${f.slug}`;
      const selo = f.status === 'pronta' ? '' : '<span class="etiqueta">Planejada</span>';
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
        location.href = `ferramentas.html?busca=${encodeURIComponent(campoDeBusca.value.trim())}`;
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
        location.href = `ferramentas.html?busca=${encodeURIComponent(campoDeBusca.value.trim())}`;
      }
    }
  });
  document.addEventListener('click', (evento) => {
    const alvo = evento.target;
    if (alvo instanceof Node && !caixaDeSugestões.contains(alvo) && alvo !== campoDeBusca) fecharSugestões();
  });
}

/* ------------------------------------------------------------- listas */
function desenharRecentes() {
  const lista = lerRecentes().map((slug) => ferramentaPorSlug[slug]).filter(Boolean).slice(0, 4);
  seçãoRecentes.hidden = lista.length === 0;
  if (lista.length > 0) desenharLista(listaRecentes, lista);
}

desenharLista(listaProntas, ferramentasProntas);
desenharRecentes();
ligarFavoritos(listaProntas);
ligarFavoritos(listaRecentes);

document.getElementById('limpar-recentes')?.addEventListener('click', () => {
  limparRecentes();
  desenharRecentes();
});

/** Comportamento do cabeçalho: menu de categorias, tema e atalho de busca. */
import { alternarTema, lerTema } from './preferências.js';
import { isolarBloco, instalarTratadorGlobal } from './isolar-bloco.js';
import { ligarÍconesVivos } from './ícone-animado.js';
import { raizDoIdioma } from './idioma.js';
import { trocarTemaComTransição } from './transição-de-tema.js';

function ligarMenuDeCategorias() {
  const gatilho = document.getElementById('abrir-categorias');
  const painel = document.getElementById('painel-categorias');
  if (!gatilho || !painel) return;

  const fechar = () => {
    painel.hidden = true;
    gatilho.setAttribute('aria-expanded', 'false');
  };
  const abrir = () => {
    painel.hidden = false;
    gatilho.setAttribute('aria-expanded', 'true');
  };

  gatilho.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
  document.addEventListener('click', (evento) => {
    if (painel.hidden) return;
    const alvo = evento.target;
    if (alvo instanceof Node && !painel.contains(alvo) && !gatilho.contains(alvo)) fechar();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !painel.hidden) { fechar(); gatilho.focus(); }
  });
}

function ligarTema() {
  const botão = document.getElementById('alternar-tema');
  if (!botão) return;

  const éEscuro = () => {
    const tema = lerTema();
    return tema === 'escuro' || (tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  // aria-checked = tema escuro ligado. O visual da pílula acompanha o tema da página; no clique
  // ela muda na hora (data-forçar) e entrega o comando ao tema quando a troca termina.
  const sincronizar = () => botão.setAttribute('aria-checked', String(éEscuro()));

  sincronizar();
  botão.addEventListener('click', () => {
    if (botão.dataset.forçar) return; // já está trocando
    const paraEscuro = !éEscuro();
    botão.dataset.forçar = paraEscuro ? 'escuro' : 'claro';
    botão.setAttribute('aria-checked', String(paraEscuro));
    trocarTemaComTransição(() => { alternarTema(); }, paraEscuro).finally(() => {
      sincronizar();
      delete botão.dataset.forçar;
    });
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sincronizar);
}

function ligarAtalhoDeBusca() {
  const irParaBusca = () => {
    const campo = document.getElementById('busca');
    if (campo instanceof HTMLInputElement) {
      campo.focus();
      campo.select();
      campo.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return true;
    }
    return false;
  };

  document.getElementById('ir-para-busca')?.addEventListener('click', () => {
    if (!irParaBusca()) location.href = new URL(`${raizDoIdioma}ferramentas.html`, location.href).href;
  });

  document.addEventListener('keydown', (evento) => {
    const alvo = evento.target;
    const digitando = alvo instanceof HTMLElement
      && (alvo.isContentEditable || /^(input|textarea|select)$/i.test(alvo.tagName));
    if (evento.key === '/' && !digitando && !evento.ctrlKey && !evento.metaKey) {
      if (irParaBusca()) evento.preventDefault();
    }
  });
}

// Cada comportamento do cabeçalho é isolado: se um falhar, os outros continuam.
instalarTratadorGlobal();
isolarBloco('ícones-animados', ligarÍconesVivos);
isolarBloco('menu-de-categorias', ligarMenuDeCategorias);
isolarBloco('tema', ligarTema);
isolarBloco('atalho-de-busca', ligarAtalhoDeBusca);

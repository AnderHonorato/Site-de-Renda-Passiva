/** Comportamento do cabeçalho: menu de categorias, tema e atalho de busca. */
import { alternarTema, lerTema } from './preferências.js';
import { ícone } from './ícones.js';

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

  const pintarÍcone = () => {
    const tema = lerTema();
    const escuro = tema === 'escuro'
      || (tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
    botão.innerHTML = ícone(escuro ? 'sol' : 'lua');
    botão.setAttribute('aria-label', escuro ? 'Usar tema claro' : 'Usar tema escuro');
  };

  pintarÍcone();
  botão.addEventListener('click', () => { alternarTema(); pintarÍcone(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pintarÍcone);
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
    if (!irParaBusca()) location.href = new URL('ferramentas.html', location.href).href;
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

ligarMenuDeCategorias();
ligarTema();
ligarAtalhoDeBusca();

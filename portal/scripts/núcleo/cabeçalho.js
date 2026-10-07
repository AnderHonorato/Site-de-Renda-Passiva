/** Comportamento do cabeçalho: menu de categorias, tema e atalho de busca. */
import { alternarTema, lerTema, sincronizarFavoritos } from './preferências.js';
import { isolarBloco, carregarBloco, instalarTratadorGlobal } from './isolar-bloco.js';
import { ligarÍconesVivos } from './ícone-animado.js';
import { trocarTemaComTransição } from './transição-de-tema.js';
import { ligarBuscaDoTopo } from './busca-do-topo.js';
import { ligarAntiCópia } from './anti-cópia.js';
import { ligarNotificações } from './notificações.js';
import { avisar } from './interface.js';
import { obterSessao } from './sessão.js';
import { renderizarContaTopo } from './conta-topo.js';

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

  // Com mouse, passar por cima abre o menu e sair dele fecha, com uma folga para o ponteiro
  // atravessar o vão entre o botão e o painel. Teclado e toque seguem pelo clique.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const área = gatilho.closest('.menu-categorias');
    let espera = 0;
    const agendar = (acao, ms) => { clearTimeout(espera); espera = setTimeout(acao, ms); };
    área?.addEventListener('pointerenter', () => agendar(abrir, 90));
    área?.addEventListener('pointerleave', () => agendar(fechar, 240));
  }
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

  // A lupa do cabeçalho abre o campo no próprio cabeçalho (busca-do-topo.js). Aqui fica só a
  // tecla "/" nas páginas que já têm o campo grande de busca.
  document.addEventListener('keydown', (evento) => {
    const alvo = evento.target;
    const digitando = alvo instanceof HTMLElement
      && (alvo.isContentEditable || /^(input|textarea|select)$/i.test(alvo.tagName));
    if (evento.key === '/' && !digitando && !evento.ctrlKey && !evento.metaKey) {
      if (irParaBusca()) evento.preventDefault();
    }
  });
}

function ligarArteDoRodapé() {
  const arte = document.querySelector('.rodapé__arte');
  if (!arte || !('IntersectionObserver' in window)) { arte?.setAttribute('data-visível', ''); return; }
  new IntersectionObserver(([entrada]) => {
    if (entrada.isIntersecting) arte.setAttribute('data-visível', ''); else arte.removeAttribute('data-visível');
  }).observe(arte);
}

// Cada comportamento do cabeçalho é isolado: se um falhar, os outros continuam.
instalarTratadorGlobal();
isolarBloco('ícones-animados', ligarÍconesVivos);
isolarBloco('menu-de-categorias', ligarMenuDeCategorias);
isolarBloco('tema', ligarTema);
isolarBloco('atalho-de-busca', ligarAtalhoDeBusca);
isolarBloco('busca-do-topo-ligar', ligarBuscaDoTopo);
isolarBloco('arte-do-rodapé', ligarArteDoRodapé);
isolarBloco('anti-cópia', ligarAntiCópia);
isolarBloco('notificações', ligarNotificações);
isolarBloco('sessão-e-chat', async () => {
  const idioma = document.documentElement.lang === 'en' ? 'en' : 'pt';
  const base = document.documentElement.dataset.raizIdioma || './';
  const fim = document.querySelector('.topo__fim');
  if (!fim) return;
  try {
    const sessao = await obterSessao();
    renderizarContaTopo(fim, sessao, { base, idioma });
    if (!sessao.usuario) return;
    import('./evolução.js').then(m=>m.conferirConquistas(sessao)).catch(()=>{});
    sincronizarFavoritos().then(({ excedentesLocais }) => {
      if (excedentesLocais > 0 && !sessionStorage.getItem('portal.favoritos.cota-avisada')) {
        sessionStorage.setItem('portal.favoritos.cota-avisada', '1');
        avisar(idioma === 'en' ? 'Some favorites remain only on this device because of your account limit.'
          : 'Alguns favoritos ficam só neste aparelho por causa do limite da conta.');
      }
    }).catch(() => {});
    const título = document.querySelector('.abertura__título');
    const primeiroNome = String(sessao.usuario.nome || '').trim().split(/\s+/)[0];
    if (título && primeiroNome) título.textContent = idioma === 'en'
      ? `Hello, ${primeiroNome}! What shall we work on today?`
      : `Olá, ${primeiroNome}! O que vamos trabalhar hoje?`;
    if (sessao.chat_habilitado) {
      const modulo = await import('./chat/chat.js');
      modulo.ligarChat(sessao);
    }
  } catch {
    renderizarContaTopo(fim, null, { base, idioma });
  }
});
// O aviso de bloqueador só é baixado nas páginas geradas com anúncios ativos.
if (document.documentElement.dataset.anuncios === 'sim') {
  isolarBloco('anti-bloqueador', () => carregarBloco(new URL('./anti-bloqueador.js', import.meta.url).href).then((m) => m.ligarAntiBloqueador()));
}

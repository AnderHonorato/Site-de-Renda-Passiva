/** Comportamento do cabeçalho: menu de categorias, tema e atalho de busca. */
import { isolarBloco, carregarBloco, instalarTratadorGlobal } from './isolar-bloco.js';

const modulo = (nome, tentativa = 1) => carregarBloco(new URL(nome, import.meta.url).href, tentativa);

function ligarMenuDeCategorias() {
  const gatilho = document.getElementById('abrir-categorias');
  const painel = document.getElementById('painel-categorias');
  if (!gatilho || !painel) return;
  let espera = 0;

  const ajustarAltura = () => {
    if (painel.hidden) return;
    if (!gatilho.getClientRects().length) {
      clearTimeout(espera);painel.hidden=true;gatilho.setAttribute('aria-expanded','false');return;
    }
    const viewport = window.visualViewport;
    const limite = viewport ? viewport.offsetTop + viewport.height : innerHeight;
    // offsetTop ignora a translação temporária da animação de entrada do painel.
    const topo = painel.offsetTop + (painel.offsetParent?.getBoundingClientRect().top || 0);
    const espaço = Math.max(0, limite - topo - 16);
    painel.style.maxHeight = `${espaço}px`;
  };

  const fechar = () => {
    clearTimeout(espera);
    painel.hidden = true;
    gatilho.setAttribute('aria-expanded', 'false');
  };
  const abrir = () => {
    clearTimeout(espera);
    painel.hidden = false;
    ajustarAltura();
    gatilho.setAttribute('aria-expanded', 'true');
  };

  gatilho.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
  window.addEventListener('resize', ajustarAltura);
  window.visualViewport?.addEventListener('resize', ajustarAltura);
  window.visualViewport?.addEventListener('scroll', ajustarAltura);

  // Com mouse, passar por cima abre o menu e sair dele fecha, com uma folga para o ponteiro
  // atravessar o vão entre o botão e o painel. Teclado e toque seguem pelo clique.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const área = gatilho.closest('.menu-categorias');
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

async function ligarTema(tentativa) {
  const botão = document.getElementById('alternar-tema');
  if (!botão) return;
  // O seletor existe no HTML antes dos módulos opcionais chegarem. Em vez de aceitar um toque
  // que não faz nada nesse intervalo, ele aguarda poucos instantes e só então fica acionável.
  botão.disabled = true;
  let alternarTema, lerTema, trocarTemaComTransição;
  try {
    [{ alternarTema, lerTema }, { trocarTemaComTransição }] = await Promise.all([
      modulo('./preferências.js', tentativa), modulo('./transição-de-tema.js', tentativa),
    ]);
  } catch (erro) {
    botão.disabled = false;
    throw erro;
  }

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
  botão.disabled = false;
}

function ligarPreferenciasVisitante(){
  const raiz=document.getElementById('preferencias-visitante'),botao=document.getElementById('abrir-preferencias');
  const painel=raiz?.querySelector('.preferencias-topo__painel');if(!painel||!botao)return;
  const abrir=()=>{painel.hidden=false;botao.setAttribute('aria-expanded','true');};
  const fechar=()=>{painel.hidden=true;botao.setAttribute('aria-expanded','false');};
  botao.addEventListener('click',()=>painel.hidden?abrir():fechar());
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){let espera;raiz.addEventListener('pointerenter',()=>{clearTimeout(espera);espera=setTimeout(abrir,90);});raiz.addEventListener('pointerleave',()=>{clearTimeout(espera);espera=setTimeout(fechar,240);});}
  document.addEventListener('click',evento=>{if(!raiz.contains(evento.target))fechar();});
  document.addEventListener('keydown',evento=>{if(evento.key==='Escape'&&!painel.hidden){fechar();botao.focus();}});
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
isolarBloco('ícones-animados', tentativa => modulo('./ícone-animado.js', tentativa).then(m => m.ligarÍconesVivos()));
isolarBloco('menu-de-categorias', ligarMenuDeCategorias);
isolarBloco('tema', ligarTema);
isolarBloco('preferências-do-topo',ligarPreferenciasVisitante);
isolarBloco('atalho-de-busca', ligarAtalhoDeBusca);
isolarBloco('busca-do-topo-ligar', tentativa => modulo('./busca-do-topo.js', tentativa).then(m => m.ligarBuscaDoTopo()), { alvo: document.querySelector('.busca-topo'), preservar: true, discreto: true });
isolarBloco('arte-do-rodapé', ligarArteDoRodapé);
isolarBloco('anti-cópia', tentativa => modulo('./anti-cópia.js', tentativa).then(m => m.ligarAntiCópia()));
isolarBloco('notificações', tentativa => modulo('./notificações.js', tentativa).then(m => m.ligarNotificações()), { alvo: document.querySelector('.notificações'), preservar: true, discreto: true });
isolarBloco('avisos-prioritarios', tentativa => modulo('./banner-prioritario.js', tentativa).then(m => m.iniciarBannerPrioritario()));

function carregarContaEChat() {
  const idioma = document.documentElement.lang === 'en' ? 'en' : 'pt';
  const base = document.documentElement.dataset.raizIdioma || './';
  const fim = document.querySelector('.topo__fim');
  if (!fim) return;
  const conta = document.createElement('div');
  conta.className = 'topo-sessao';
  const esqueleto = document.createElement('span');
  esqueleto.className = 'esqueleto-conta';
  esqueleto.setAttribute('role', 'status');
  esqueleto.setAttribute('aria-label', idioma === 'en' ? 'Loading account' : 'Carregando conta');
  for (const classe of ['esqueleto-conta__avatar', 'esqueleto-conta__nome']) {
    const parte = document.createElement('span'); parte.className = classe; esqueleto.append(parte);
  }
  conta.append(esqueleto);
  fim.append(conta);

  // Revalida a conta quando a aba volta do histórico ou retorna do segundo plano.
  // Atualizar apenas o cabeçalho evita reiniciar ferramentas e chat existentes.
  let revisaoVisual = 0;
  let ultimaVerificacao = Date.now();
  let revalidacaoEmCurso = null;
  const apresentar = async sessao => {
    const revisao = ++revisaoVisual;
    const { renderizarContaTopo } = await modulo('./conta-topo.js');
    if (revisao !== revisaoVisual) return;
    renderizarContaTopo(fim, sessao, { base, idioma });
    esqueleto.remove();
  };
  function revalidar() {
    if (revalidacaoEmCurso) return revalidacaoEmCurso;
    ultimaVerificacao = Date.now();
    revalidacaoEmCurso = (async () => {
      try {
        const { obterSessao } = await modulo('./sessão.js');
        await apresentar(await obterSessao({ renovar: true }));
      } catch (erro) {
        console.warn('Não foi possível verificar novamente a sessão.', erro);
      }
    })().finally(() => { revalidacaoEmCurso = null; });
    return revalidacaoEmCurso;
  }
  document.addEventListener('portal:sessao-alterada', evento => {
    if (evento.detail?.usuario) void apresentar(evento.detail);
  });
  window.addEventListener('pageshow', evento => { if (evento.persisted) void revalidar(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - ultimaVerificacao > 30000) void revalidar();
  });

  isolarBloco('sessão', async tentativa => {
    const { obterSessao } = await modulo('./sessão.js');
    const revisaoInicial = revisaoVisual;
    const sessao = await obterSessao({ renovar: tentativa > 1 });
    if (revisaoInicial === revisaoVisual) await apresentar(sessao);
    if (!sessao.usuario) return;
    // Cada serviço tem sua própria falha. Um erro do chat jamais transforma uma conta
    // autenticada em visitante nem remove o nome que já foi mostrado no cabeçalho.
    isolarBloco('conquistas', tentativa => modulo('./evolução.js', tentativa).then(m => m.conferirConquistas(sessao)));
    isolarBloco('favoritos-da-conta', async tentativa => {
      const { sincronizarFavoritos } = await modulo('./preferências.js', tentativa);
      const { excedentesLocais } = await sincronizarFavoritos();
      if (excedentesLocais > 0 && !sessionStorage.getItem('portal.favoritos.cota-avisada')) {
        sessionStorage.setItem('portal.favoritos.cota-avisada', '1');
        const { avisar } = await modulo('./interface.js');
        avisar(idioma === 'en' ? 'Some favorites remain only on this device because of your account limit.'
          : 'Alguns favoritos ficam só neste aparelho por causa do limite da conta.');
      }
    });
    const título = document.querySelector('.abertura__título');
    const primeiroNome = String(sessao.usuario.nome || '').trim().split(/\s+/)[0];
    if (título && primeiroNome) título.textContent = idioma === 'en'
      ? `Hello, ${primeiroNome}! What shall we work on today?`
      : `Olá, ${primeiroNome}! O que vamos trabalhar hoje?`;
    if (sessao.chat_habilitado) {
      const chat = document.createElement('div');
      chat.className = 'chat-carregamento';
      const esqueletoChat = document.createElement('span');
      esqueletoChat.className = 'esqueleto-chat';
      esqueletoChat.setAttribute('role', 'status');
      esqueletoChat.setAttribute('aria-label', idioma === 'en' ? 'Loading chat' : 'Carregando chat');
      chat.append(esqueletoChat); document.body.append(chat);
      isolarBloco('chat', async tentativaChat => {
        const { ligarChat } = await modulo('./chat/chat.js', tentativaChat);
        await ligarChat(sessao);
        esqueletoChat.remove();
        chat.remove();
      }, { alvo: chat, preservar: true, discreto: true });
    }
  }, { alvo: conta, preservar: true, discreto: true });
}
carregarContaEChat();
// O aviso de bloqueador só é baixado nas páginas geradas com anúncios ativos.
if (document.documentElement.dataset.anuncios === 'sim') {
  isolarBloco('anti-bloqueador', () => carregarBloco(new URL('./anti-bloqueador.js', import.meta.url).href).then((m) => m.ligarAntiBloqueador()));
}

/** Publicidade condicional do portal. Nenhuma decisão de elegibilidade vem do HTML sozinho:
 * a API precisa permitir, haver consentimento vigente e ao menos um bloco com ID válido.
 */
export const CHAVE_CONSENTIMENTO = 'consentimento-portal-v1';
export const VERSAO_CONSENTIMENTO = '1';
export const POSICOES = Object.freeze(['resultado', 'lateral', 'lista', 'rodape']);
const EDITOR_VALIDO = /^ca-pub-\d{16}$/;
const BLOCO_VALIDO = /^\d{6,20}$/;
const MAXIMO_SLOTS = 3;
let geração = 0;
const observadoresDeInterseção = new Set();
const observadoresDeStatus = new Set();
const temporizadores = new Set();
const contêineresAtivos = new Set();
const contêineresAguardando = new Set();
const statusPorContêiner = new Map();
const timerPorContêiner = new Map();

function invalidarExecuções() {
  geração += 1;
  for (const observer of observadoresDeInterseção) observer.disconnect();
  for (const observer of observadoresDeStatus) observer.disconnect();
  for (const timer of temporizadores) clearTimeout(timer);
  observadoresDeInterseção.clear(); observadoresDeStatus.clear(); temporizadores.clear();
  for (const container of contêineresAguardando) esconder(container);
  contêineresAguardando.clear();
  for (const container of contêineresAtivos) esconder(container);
  contêineresAtivos.clear();
}

/** Revoga imediatamente observers e slots em espera quando o consentimento ou a elegibilidade muda. */
export function invalidarPublicidade() { invalidarExecuções(); }

export function validarRespostaAnuncios(resposta) {
  if (!resposta || typeof resposta !== 'object' || resposta.ativo !== true || resposta.permitido !== true || !EDITOR_VALIDO.test(String(resposta.editor ?? ''))) return null;
  const blocos = {};
  for (const posicao of POSICOES) {
    const id = String(resposta.blocos?.[posicao] ?? '');
    if (BLOCO_VALIDO.test(id)) blocos[posicao] = id;
  }
  return Object.keys(blocos).length ? { editor: resposta.editor, blocos, teste: resposta.teste === true } : null;
}

export function consentimentoVigente(consentimento, agora = Date.now()) {
  return !!consentimento && consentimento.versao === VERSAO_CONSENTIMENTO &&
    Number.isFinite(consentimento.expiraEm) && consentimento.expiraEm > agora &&
    ['aceitar', 'essencial'].includes(consentimento.escolha);
}

export function estadoDoBloco(status) {
  if (status === 'filled') return 'preenchido';
  if (status === 'unfilled') return 'vazio';
  return 'pendente';
}

export async function consultarConfiguracaoAnuncios(fetcher, pathname) {
  try {
    const response = await fetcher(`/api/anuncios?pagina=${encodeURIComponent(pathname)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response?.ok) return null;
    return validarRespostaAnuncios(await response.json());
  } catch { return null; }
}

export function paginaPodeExibirAnuncios({ pathname = '/', paginaMarcada = true, infantil = false, impressão = false } = {}) {
  if (!paginaMarcada || infantil || impressão) return false;
  const rota = (String(pathname).toLowerCase().replace(/\.html?$/, '').replace(/\/$/, '') || '/');
  return !/(^|\/)(admin|account|conta|sign-in|login|entrar|register|create-account|criar-conta|cadastro|forgot-password|reset-password|redefinir-senha|recuperar-senha|plans|planos|terms|termos|privacy|privacidade|cookies|about|informacoes|404|saved|salvos|print|imprimir|impressao|trabalhos|chat)(\/|$)/.test(rota) && !/(^|\/)(school|escolar|children|infantil)(\/|$)/.test(rota);
}

export function textoRotuloPublicidade(lang = 'pt') { return String(lang).toLowerCase().startsWith('en') ? 'Advertisement' : 'Publicidade'; }

function consentimentoSalvo() {
  try { return JSON.parse(localStorage.getItem(CHAVE_CONSENTIMENTO) || 'null'); }
  catch { return null; }
}

function esconder(container) {
  container.classList.remove('publicidade-pendente', 'publicidade-preenchida');
  container.classList.add('publicidade-vazia');
  container.classList.remove('publicidade-preenchida');
  container.querySelector('[data-rotulo-publicidade]')?.remove();
  container.replaceChildren();
  delete container.dataset.publicidadeIniciada;
  contêineresAguardando.delete(container);
  const status = statusPorContêiner.get(container);
  status?.disconnect();
  if (status) observadoresDeStatus.delete(status);
  statusPorContêiner.delete(container);
  const timer = timerPorContêiner.get(container);
  if (timer) { clearTimeout(timer); temporizadores.delete(timer); }
  timerPorContêiner.delete(container);
  contêineresAtivos.delete(container);
}

function consentimentoNaoPersonalizado(consentimento) {
  return consentimento.escolha === 'essencial' || consentimento.publicidade === false;
}

function criarScript(editor, slots) {
  let script = document.querySelector('script[data-script-adsense]');
  if (!script) {
    script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.scriptAdsense = 'sim';
    const nonceOrigem = document.querySelector('script[nonce]')?.nonce || document.querySelector('meta[name="csp-nonce"]')?.content;
    if (nonceOrigem) script.nonce = nonceOrigem;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(editor)}`;
    script.addEventListener('error', () => slots.forEach(({ container }) => esconder(container)), { once: true });
    document.head.append(script);
  }
}

function iniciarSlot(container, bloco, editor, npa, teste, lang, token) {
  if (container.dataset.publicidadeIniciada === 'sim') return;
  container.dataset.publicidadeIniciada = 'sim';
  container.classList.remove('publicidade-vazia');
  container.classList.add('publicidade-pendente');
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.dataset.adClient = editor;
  ins.dataset.adSlot = bloco;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  if (teste) ins.dataset.adtest = 'on';
  container.replaceChildren(ins);

  let timer;
  const pararObservação = () => {
    status.disconnect(); observadoresDeStatus.delete(status); statusPorContêiner.delete(container);
    if (timer) { clearTimeout(timer); temporizadores.delete(timer); timerPorContêiner.delete(container); }
  };
  const revelar = () => {
    const estado = estadoDoBloco(ins.dataset.adStatus);
    if (estado === 'preenchido') {
      if (!container.querySelector('[data-rotulo-publicidade]')) {
        const rotulo = document.createElement('span');
        rotulo.dataset.rotuloPublicidade = '';
        rotulo.textContent = textoRotuloPublicidade(lang);
        container.prepend(rotulo);
      }
      container.classList.remove('publicidade-pendente', 'publicidade-vazia');
      container.classList.add('publicidade-preenchida');
      pararObservação();
    } else if (estado === 'vazio') { pararObservação(); esconder(container); }
  };
  const status = new MutationObserver(revelar);
  observadoresDeStatus.add(status);
  statusPorContêiner.set(container, status);
  status.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
  (window.adsbygoogle = window.adsbygoogle || []).push({});
  // Se o provedor nunca informa status, não deixar um wrapper reservado indefinidamente.
  timer = window.setTimeout(() => {
    temporizadores.delete(timer);
    if (token === geração && ins.dataset.adStatus !== 'filled') esconder(container);
    status.disconnect(); observadoresDeStatus.delete(status);
    statusPorContêiner.delete(container); timerPorContêiner.delete(container);
  }, 12000);
  temporizadores.add(timer);
  timerPorContêiner.set(container, timer);
}

/** Inicializa as posições marcadas com data-anuncio-posicao. Pode ser chamado após salvar/revogar consentimento. */
export async function iniciarPublicidade({ fetcher = globalThis.fetch, doc = globalThis.document, agora = Date.now() } = {}) {
  if (!doc || typeof fetcher !== 'function') return 0;
  invalidarExecuções();
  const token = geração;
  const containers = [...doc.querySelectorAll('[data-anuncio-posicao]')].slice(0, MAXIMO_SLOTS);
  if (!containers.length) return 0;
  const page = doc.documentElement;
  const path = globalThis.location?.pathname || '/';
  const consentimento = consentimentoSalvo();
  if (!consentimentoVigente(consentimento, agora) || !paginaPodeExibirAnuncios({
    pathname: path,
    paginaMarcada: page.dataset.anuncios !== 'nao' && containers.length > 0,
    infantil: page.dataset.publicoInfantil === 'sim',
    impressão: page.dataset.impressao === 'sim' || globalThis.matchMedia?.('print')?.matches,
  })) {
    containers.forEach(esconder);
    return 0;
  }

  const config = await consultarConfiguracaoAnuncios(fetcher, path);
  if (token !== geração) return 0;
  if (!consentimentoVigente(consentimentoSalvo(), Date.now())) { containers.forEach(esconder); return 0; }
  if (!config) { containers.forEach(esconder); return 0; }

  const slots = containers.flatMap((container) => {
    const posicao = container.dataset.anuncioPosicao;
    const bloco = config.blocos[posicao];
    if (!POSICOES.includes(posicao) || !bloco) { esconder(container); return []; }
    return [{ container, bloco }];
  });
  if (!slots.length) return 0;
  for (const { container } of slots) {
    // O alvo precisa participar do layout para o IntersectionObserver notificá-lo.
    // A classe mantém altura e margens em zero enquanto a requisição segue pendente.
    container.hidden = false;
    container.classList.remove('publicidade-vazia', 'publicidade-preenchida');
    container.classList.add('publicidade-pendente');
    contêineresAguardando.add(container);
  }
  const carregarSlot = async ({ container, bloco }) => {
    if (token !== geração) return;
    if (!consentimentoVigente(consentimentoSalvo(), Date.now())) { esconder(container); return; }
    const atual = await consultarConfiguracaoAnuncios(fetcher, path);
    if (token !== geração) return;
    if (!consentimentoVigente(consentimentoSalvo(), Date.now()) || !atual || atual.editor !== config.editor || atual.blocos[container.dataset.anuncioPosicao] !== bloco) { esconder(container); return; }
    const npa = consentimentoNaoPersonalizado(consentimentoSalvo());
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.requestNonPersonalizedAds = npa ? 1 : 0;
    criarScript(atual.editor, [ { container } ]);
    contêineresAguardando.delete(container);
    contêineresAtivos.add(container);
    iniciarSlot(container, bloco, atual.editor, npa, atual.teste, doc.documentElement.lang || (path.startsWith('/en/') ? 'en' : 'pt'), token);
  };
  if ('IntersectionObserver' in globalThis) {
    const pendentes = new Set(slots.map(({ container }) => container));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        pendentes.delete(entry.target);
        observer.unobserve(entry.target);
        const slot = slots.find(({ container }) => container === entry.target);
        if (slot) void carregarSlot(slot);
      }
      if (pendentes.size === 0) {
        observer.disconnect(); observadoresDeInterseção.delete(observer);
      }
    }, { rootMargin: '300px 0px' });
    observadoresDeInterseção.add(observer);
    slots.forEach(({ container }) => observer.observe(container));
  } else await Promise.all(slots.map(carregarSlot));
  return slots.length;
}

globalThis.addEventListener?.('consentimento-alterado', () => {
  invalidarPublicidade();
  if (consentimentoVigente(consentimentoSalvo())) void iniciarPublicidade();
});

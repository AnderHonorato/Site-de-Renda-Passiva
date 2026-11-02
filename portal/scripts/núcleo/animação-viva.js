/**
 * Controle das animações em SVG: só anima o que está na tela, e só até um limite.
 *
 * Um SVG usado como imagem roda a própria animação sozinho e o site não consegue pausá-la. Cada
 * imagem animada na tela custa um redesenho por quadro (medido: veja documentação/desempenho-animacoes.md),
 * então o HTML não traz o endereço da imagem animada. Este módulo coloca o `src` só nas que:
 *   1. estão na tela (IntersectionObserver); e
 *   2. cabem no orçamento de animações simultâneas do aparelho (`perfilDeAnimação`).
 * As demais ficam com o desenho estático, que já está no HTML. Quando passa do limite, as animadas
 * se revezam: a cada poucos segundos o grupo ativo anda, e todo ícone aparece vivo de tempos em tempos.
 *
 * Também escolhe a variante do tema (claro ou escuro) e baixa só a que vale: um SVG usado como imagem
 * enxerga apenas o tema do sistema, não o do botão do site, então existem dois arquivos por desenho.
 * Quando o tema muda, a variante nova é carregada sob demanda.
 *
 * Com "reduzir movimento" nada animado é baixado nem montado: fica o desenho estático.
 *
 * Contrato do HTML (feito por `íconeVivo` e `arteViva`, em ícone-animado.js):
 *   <span class="ícone-vivo" data-estado="carregando"> desenho estático  <img data-viva="…" data-fonte="x.svg"> </span>
 *   data-fonte                          um arquivo só (não muda com o tema)
 *   data-fonte-claro / data-fonte-escuro  o par, quando o desenho tem variante de tema
 *   data-viva                           "ícone" | "arte" | "topo" ("topo" tem prioridade e nunca é revezado)
 */
import { movimentoReduzido } from './movimento.js';

/** Quantas animações cabem ao mesmo tempo, conforme o aparelho. Ver a tabela de custo na documentação. */
export function perfilDeAnimação() {
  const rede = typeof navigator !== 'undefined' ? navigator.connection : undefined;
  const economia = rede?.saveData === true || /(^|-)2g$/.test(rede?.effectiveType ?? '');
  const fraco = (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4;
  const celular = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
  const máximo = economia ? 3 : celular || fraco ? 6 : 16;
  return { máximo, economia, celular, fraco, intervaloDoRodízio: economia ? 7000 : 4500 };
}

/** Tema que vale agora: o escolhido no botão (`data-tema`) ou, sem escolha, o do sistema. */
export function temaAtual() {
  const escolhido = document.documentElement.dataset.tema;
  if (escolhido === 'claro' || escolhido === 'escuro') return escolhido;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

/** Endereço do arquivo de uma imagem animada para o tema dado. */
export function fonteDaImagem(imagem, tema) {
  const { fonte, fonteClaro, fonteEscuro } = imagem.dataset;
  if (fonteClaro || fonteEscuro) return (tema === 'escuro' ? fonteEscuro : fonteClaro) ?? fonteClaro ?? fonteEscuro ?? '';
  return fonte ?? '';
}

export function fonteEstaticaDaCategoria(imagem, tema) {
  const fonte = fonteDaImagem(imagem, tema);
  return imagem.dataset.viva === 'arte' && fonte.includes('ilustrações/categorias/mini/')
    ? fonte.replace('ilustrações/categorias/mini/', 'ilustrações/paradas-categorias/mini/') : '';
}

/** Escolhe quais imagens animam: as de prioridade primeiro, depois o grupo da vez, até o limite. */
export function escolherAtivas(visíveis, máximo, rodada) {
  const fixas = visíveis.filter((i) => i.dataset.viva === 'topo');
  const demais = visíveis.filter((i) => i.dataset.viva !== 'topo');
  const vaga = Math.max(0, máximo - fixas.length);
  if (demais.length <= vaga) return new Set([...fixas, ...demais]);
  const ativas = new Set(fixas);
  for (let k = 0; k < vaga; k += 1) ativas.add(demais[(rodada * vaga + k) % demais.length]);
  return ativas;
}

/** A arte prioritária também ocupa vagas; as demais precisam revezar quando faltam vagas. */
export function precisaRodizio(visíveis, máximo) {
  const fixas = visíveis.filter(i => i.dataset.viva === 'topo').length;
  return visíveis.length - fixas > Math.max(0, máximo - fixas);
}

/* --------------------------------------------------------------- no navegador */

const alvos = new Map(); // imagem → { visível, falhou }
let observador;
let perfil;
let rodada = 0;
let relógioDoRodízio = 0;
let agendado = false;
let ligado = false;

const caixaDe = (imagem) => imagem.closest('.ícone-vivo');
function estado(imagem, valor) {
  const caixa = caixaDe(imagem);
  if (caixa) caixa.dataset.estado = valor;
}

function ativar(imagem) {
  const fonte = fonteDaImagem(imagem, temaAtual());
  if (!fonte) return;
  if (imagem.dataset.carregada === fonte) { // já baixada: só volta a mostrar (e a animar)
    if (imagem.dataset.pausada) {
      delete imagem.dataset.pausada;
      if (imagem.dataset.estatica) { delete imagem.dataset.estatica; imagem.src = fonte; }
      if (imagem.complete && imagem.naturalWidth > 0) estado(imagem, 'pronto');
    }
    return;
  }
  delete imagem.dataset.pausada;
  delete imagem.dataset.estatica;
  imagem.dataset.carregada = fonte;
  estado(imagem, 'carregando');
  imagem.src = fonte;
}

/**
 * Pausa sem apagar o arquivo: `visibility: hidden` faz o navegador parar a animação do SVG (medido:
 * 0,2% de CPU contra 30% com 11 imagens animando) e a imagem já baixada volta na hora, sem nova requisição.
 */
function desativar(imagem) {
  const alvo = alvos.get(imagem);
  if (alvo?.falhou) return;
  const estatica = fonteEstaticaDaCategoria(imagem, temaAtual());
  if (estatica && alvo?.visível && imagem.dataset.estatica !== estatica) {
    // Trocar pelo MESMO desenho sem movimento pausa realmente o SVG. Só marcar a
    // imagem como pausada deixava as categorias redesenhando fora do orçamento.
    imagem.dataset.estatica = estatica;
    imagem.src = estatica;
  }
  if ((!imagem.dataset.carregada && !estatica) || imagem.dataset.pausada) return;
  imagem.dataset.pausada = 'sim';
  estado(imagem, 'carregando');
}

function reavaliar() {
  agendado = false;
  if (!perfil) return;
  const visíveis = [];
  for (const [imagem, alvo] of alvos) {
    if (!imagem.isConnected) { observador?.unobserve(imagem); alvos.delete(imagem); continue; }
    if (alvo.visível && !alvo.falhou && !document.hidden) visíveis.push(imagem);
  }
  visíveis.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const ativas = movimentoReduzido() ? new Set() : escolherAtivas(visíveis, perfil.máximo, rodada);
  for (const imagem of alvos.keys()) {
    if (ativas.has(imagem)) ativar(imagem); else desativar(imagem);
  }

  // O revezamento só gira enquanto houver mais imagens na tela do que vagas.
  const sobram = precisaRodizio(visíveis, perfil.máximo);
  if (sobram && !relógioDoRodízio && !movimentoReduzido()) {
    relógioDoRodízio = setInterval(() => { rodada += 1; reavaliar(); }, perfil.intervaloDoRodízio);
  } else if (!sobram && relógioDoRodízio) {
    clearInterval(relógioDoRodízio);
    relógioDoRodízio = 0;
  }
}

/** Junta várias mudanças (rolagem, lista nova) numa só reavaliação por quadro. */
function agendar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(reavaliar);
}

/** Passa a cuidar das imagens animadas que existem dentro de `raiz` (chamar de novo depois de desenhar listas). */
export function registrarAnimações(raiz = document) {
  if (!observador) return;
  for (const imagem of raiz.querySelectorAll('img[data-viva]')) {
    if (alvos.has(imagem)) continue;
    alvos.set(imagem, { visível: false, falhou: false });
    observador.observe(imagem);
  }
}

/** Liga o controle, uma vez por página. Sem IntersectionObserver, tudo fica no desenho estático. */
export function ligarAnimaçãoViva() {
  if (!ligado) {
    ligado = true;
    if (typeof IntersectionObserver !== 'function') return;
    perfil = perfilDeAnimação();
    observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) { const alvo = alvos.get(e.target); if (alvo) alvo.visível = e.isIntersecting; }
      agendar();
    }, { rootMargin: '60px 0px' });

    // Eventos de carregamento não borbulham: a escuta é na captura, e vale para imagens criadas depois.
    document.addEventListener('load', (e) => {
      const imagem = e.target;
      if (imagem instanceof HTMLImageElement && alvos.has(imagem) && imagem.dataset.carregada) estado(imagem, 'pronto');
    }, true);
    document.addEventListener('error', (e) => {
      const imagem = e.target;
      const alvo = imagem instanceof HTMLImageElement ? alvos.get(imagem) : null;
      if (alvo) { alvo.falhou = true; estado(imagem, 'falhou'); }
    }, true);

    // Tema trocado: as imagens ativas pedem a variante nova; as outras nem chegam a baixar a antiga.
    new MutationObserver(agendarTrocaDeTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', agendarTrocaDeTema);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', agendar);
    document.addEventListener('visibilitychange', agendar);
  }
  registrarAnimações();
}

function agendarTrocaDeTema() {
  const tema = temaAtual();
  for (const imagem of alvos.keys()) {
    if (imagem.dataset.carregada && imagem.dataset.carregada !== fonteDaImagem(imagem, tema)) {
      delete imagem.dataset.carregada; // força ativar() a pedir a variante nova
    }
  }
  agendar();
}

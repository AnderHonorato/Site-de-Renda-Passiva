// portal/vitrine/vitrine-motor.js
// Relógio, canvas responsivo e utilidades de animação da vitrine.
// Cada quadro é uma função pura do tempo: desenhar(t) sempre gera a mesma imagem,
// o que permite pausar, pular para um instante e renderizar vídeo quadro a quadro.

export const DURAÇÃO = 15;

// Paleta da identidade: marfim, tinta, terracota e areia. Os nomes antigos (vinho, girassol…)
// ficaram para não mexer nas cenas: "vinho" é o terracota que serve de texto sobre o marfim
// (3,5:1, só em texto grande), "vinhoEscuro" é o terracota fechado das sombras e "girassol"
// é o terracota vivo dos destaques.
export const cores = {
  fundo: '#f5f2ed',
  papel: '#fffdf9',
  tinta: '#1a1a1a',
  suave: '#5c6270',
  borda: '#ddd6cc',
  vinho: '#c9633f',
  vinhoEscuro: '#8f3b20',
  rosa: '#e3a68e',
  girassol: '#d97757',
};

// Seis áreas na paleta da identidade. `texto` é a cor do nome escrito sobre o cartão: creme nos
// fundos escuros e tinta nos claros (areia, arena e terracota suave não sustentam texto claro).
export const categorias = [
  { id: 'confeitaria', cor: '#d97757', sombra: '#a8472a', texto: '#1a1a1a' },
  { id: 'educacao', cor: '#3d4451', sombra: '#262b34', texto: '#fffdf9' },
  { id: 'artesanato', cor: '#c9b89b', sombra: '#9a8b70', texto: '#1a1a1a' },
  { id: 'festas', cor: '#e8a58d', sombra: '#b96e55', texto: '#1a1a1a' },
  { id: 'reforma', cor: '#6b7280', sombra: '#4b5260', texto: '#fffdf9' },
  { id: 'embalagens', cor: '#b8a88a', sombra: '#8a7b5e', texto: '#1a1a1a' },
];

// ---------- matemática de tempo ----------
export const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const progresso = (t, início, fim) => limitar((t - início) / (fim - início));
export const misturar = (a, b, p) => a + (b - a) * p;

export const curva = {
  linear: (p) => p,
  entradaQuad: (p) => p * p,
  saidaQuad: (p) => 1 - (1 - p) * (1 - p),
  entradaCubica: (p) => p * p * p,
  saidaCubica: (p) => 1 - (1 - p) ** 3,
  entradaSaidaCubica: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  saidaExpo: (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  entradaExpo: (p) => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
  saidaVolta: (p, s = 1.70158) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  entradaVolta: (p, s = 1.70158) => (s + 1) * p ** 3 - s * p ** 2,
  saidaElastica: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 2 ** (-10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
};

// Mola amortecida: 0 → 1 com oscilação física. dt em segundos desde o início.
export function mola(dt, frequência = 2.2, amortecimento = 7) {
  if (dt <= 0) return 0;
  return 1 - Math.exp(-amortecimento * dt) * Math.cos(frequência * 2 * Math.PI * dt);
}

// Pêndulo amortecido: começa em amplitude e oscila até zero.
export function pêndulo(dt, amplitude, frequência = 1.4, amortecimento = 2.6) {
  if (dt <= 0) return amplitude;
  return amplitude * Math.exp(-amortecimento * dt) * Math.cos(frequência * 2 * Math.PI * dt);
}

export function criarAleatório(semente = 1) {
  let a = semente >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- desenho ----------
export function caminhoArredondado(ctx, x, y, l, a, r) {
  const raio = Math.max(0, Math.min(r, l / 2, a / 2));
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + l, y, x + l, y + a, raio);
  ctx.arcTo(x + l, y + a, x, y + a, raio);
  ctx.arcTo(x, y + a, x, y, raio);
  ctx.arcTo(x, y, x + l, y, raio);
  ctx.closePath();
}

// Papel recortado: sombra sólida deslocada + preenchimento. Centro em (cx, cy).
export function papel(ctx, { cx, cy, l, a, raio = 24, cor, sombra = 'rgba(26,26,26,.14)', desvio = 10, giro = 0, escala = 1, contorno = null, larguraContorno = 0 }) {
  if (escala <= 0.001) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(giro);
  ctx.scale(escala, escala);
  if (desvio > 0 && sombra) {
    caminhoArredondado(ctx, -l / 2 + desvio * 0.55, -a / 2 + desvio, l, a, raio);
    ctx.fillStyle = sombra;
    ctx.fill();
  }
  caminhoArredondado(ctx, -l / 2, -a / 2, l, a, raio);
  if (cor) { ctx.fillStyle = cor; ctx.fill(); }
  if (contorno && larguraContorno > 0) { ctx.lineWidth = larguraContorno; ctx.strokeStyle = contorno; ctx.stroke(); }
  ctx.restore();
}

// Traço revelado progressivamente (0 → 1) usando dash.
export function traçar(ctx, desenharCaminho, p, comprimento) {
  if (p <= 0) return;
  ctx.save();
  ctx.setLineDash([comprimento * p, comprimento]);
  desenharCaminho();
  ctx.stroke();
  ctx.restore();
}

// Uma família só (Inter), com três pesos e espaçamento mais fechado nos títulos grandes.
// As cenas pedem "titulo", "corpo" ou "mao" (a nota escrita à mão do desenho antigo); as três
// viram Inter, cada uma com o peso e o espaçamento do seu papel.
export function fonte(ctx, família, tamanho, peso = 400) {
  const papéis = {
    titulo: { peso: 600, espaço: '-0.04em' },
    corpo: { peso: peso >= 600 ? 600 : peso >= 500 ? 500 : 400, espaço: '-0.01em' },
    mao: { peso: 500, espaço: '-0.02em' },
  };
  const p = papéis[família];
  // A letra manuscrita antiga era bem mais estreita que a Inter: sem este fator, as notas
  // vazam das etiquetas e dos papéis onde foram desenhadas.
  const escala = família === 'mao' ? 0.8 : 1;
  ctx.font = `${p.peso} ${tamanho * escala}px "Vitrine Inter", system-ui, "Segoe UI", Arial, sans-serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = p.espaço;
}

// ---------- ciclo de vida ----------
// 14,29 s: assinatura completa (o lema termina de ser escrito em 14,3 s e começa a sumir em 14,28 s).
export function criarVitrine(canvas, { desenhar, quadroEstático = 14.29, aoMudarEstado } = {}) {
  const ctx = canvas.getContext('2d');
  const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)');
  let largura = 0, altura = 0, densidade = 1;
  let tempo = 0, último = null, quadroPedido = null;
  let tocando = false, visível = true, pausadoPeloUsuário = false;

  // O desenho acontece num palco fixo (1920×1080 ou 1080×1920) encaixado no canvas.
  // Fundos usam a área visível inteira, então não aparecem faixas em proporções diferentes.
  function palco() {
    const retrato = altura > largura;
    const W = retrato ? 1080 : 1920;
    const H = retrato ? 1920 : 1080;
    const escala = Math.min(canvas.width / W, canvas.height / H);
    const ox = (canvas.width - W * escala) / 2;
    const oy = (canvas.height - H * escala) / 2;
    return {
      retrato, W, H, escala, ox, oy,
      visível: { x0: -ox / escala, y0: -oy / escala, x1: W + ox / escala, y1: H + oy / escala },
    };
  }

  function ajustarTamanho() {
    const caixa = canvas.getBoundingClientRect();
    densidade = Math.min(2, window.devicePixelRatio || 1);
    largura = Math.max(1, Math.round(caixa.width));
    altura = Math.max(1, Math.round(caixa.height));
    canvas.width = Math.round(largura * densidade);
    canvas.height = Math.round(altura * densidade);
    pintar();
  }

  function pintar() {
    const p = palco();
    ctx.setTransform(p.escala, 0, 0, p.escala, p.ox, p.oy);
    desenhar(ctx, tempo, p);
  }

  function passo(agora) {
    quadroPedido = null;
    if (!tocando) return;
    if (último !== null) tempo = (tempo + Math.min(0.1, (agora - último) / 1000)) % DURAÇÃO;
    último = agora;
    pintar();
    quadroPedido = requestAnimationFrame(passo);
  }

  function avaliar() {
    const deveTocar = visível && !pausadoPeloUsuário && !reduzirMovimento.matches && !document.hidden;
    if (deveTocar && !tocando) {
      tocando = true; último = null;
      quadroPedido = requestAnimationFrame(passo);
    } else if (!deveTocar && tocando) {
      tocando = false;
      if (quadroPedido) cancelAnimationFrame(quadroPedido);
      quadroPedido = null;
    }
    if (reduzirMovimento.matches && !pausadoPeloUsuário) { tempo = quadroEstático; pintar(); }
    aoMudarEstado?.({ tocando, pausadoPeloUsuário, reduzido: reduzirMovimento.matches });
  }

  const observadorTamanho = new ResizeObserver(ajustarTamanho);
  observadorTamanho.observe(canvas);
  const observadorTela = new IntersectionObserver(([e]) => { visível = e.isIntersecting; avaliar(); }, { threshold: 0.15 });
  observadorTela.observe(canvas);
  const aoTrocarAba = () => avaliar();
  document.addEventListener('visibilitychange', aoTrocarAba);
  reduzirMovimento.addEventListener?.('change', avaliar);

  ajustarTamanho();
  avaliar();

  return {
    alternar() { pausadoPeloUsuário = !pausadoPeloUsuário; avaliar(); },
    pausar() { pausadoPeloUsuário = true; avaliar(); },
    tocar() { pausadoPeloUsuário = false; avaliar(); },
    irPara(t) { tempo = ((t % DURAÇÃO) + DURAÇÃO) % DURAÇÃO; pintar(); },
    // Quadro exato em t, sem normalizar (usado na renderização: t = 15 é válido).
    quadroExato(t) { tempo = t; pintar(); },
    repintar() { pintar(); },
    tempoAtual: () => tempo,
    // Uso em renderização: tamanho fixo, sem relógio.
    fixarTamanho(l, a) {
      observadorTamanho.disconnect();
      densidade = 1; largura = l; altura = a;
      canvas.width = l; canvas.height = a;
      pausadoPeloUsuário = true; avaliar();
    },
    destruir() {
      tocando = false;
      if (quadroPedido) cancelAnimationFrame(quadroPedido);
      observadorTamanho.disconnect(); observadorTela.disconnect();
      document.removeEventListener('visibilitychange', aoTrocarAba);
      reduzirMovimento.removeEventListener?.('change', avaliar);
    },
  };
}

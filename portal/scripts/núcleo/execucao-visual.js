/** Feedback da operação real. O relógio anima o papel; quem executa informa os estados. */
import {
  criarVitrine,
  papel,
  caminhoArredondado,
} from '../../vitrine/vitrine-motor.js';
import { ícone } from './ícones.js';

const controles = new WeakMap();

const DURACAO_RÁPIDA_MS = 10_000;
const DURACAO_ANALISE_MS = 15_000;
const DURACAO_ARQUIVO_MS = 20_000;

function normalizarTipo(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Escolhe quanto a cena decorativa permanece visível, sem atrasar o resultado real. */
export function resolverDuracaoApresentacao({
  tipo = 'analise',
  demorada = false,
  profissional = false,
  campos = [],
  exporta = [],
  cat,
} = {}) {
  const tipoNormalizado = normalizarTipo(tipo);
  if (tipoNormalizado === 'arquivo') return DURACAO_ARQUIVO_MS;
  if (tipoNormalizado === 'importacao') return DURACAO_RÁPIDA_MS;

  const camposLista = Array.isArray(campos) ? campos : Object.values(campos ?? {});
  const temArquivo = camposLista.some((campo) => {
    const tipoCampo = normalizarTipo(typeof campo === 'string' ? campo : campo?.tipo ?? campo?.type);
    return ['file', 'arquivo', 'ficheiro'].includes(tipoCampo);
  });
  const categorias = (Array.isArray(cat) ? cat : [cat]).map(normalizarTipo);
  const categoriaPesada = categorias.some((categoria) =>
    ['pdf', 'imagem', 'imagens', 'image', 'images'].includes(categoria),
  );
  if (temArquivo || categoriaPesada) return DURACAO_ARQUIVO_MS;

  const formatos = (Array.isArray(exporta) ? exporta : [exporta]).map(normalizarTipo);
  if (profissional || demorada || formatos.some((formato) => ['pdf', 'xlsx'].includes(formato))) {
    return DURACAO_ANALISE_MS;
  }
  return DURACAO_RÁPIDA_MS;
}

/** Dá ao navegador uma oportunidade de pintar, sem impor duração mínima ao trabalho. */
export function aguardarPintura() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function' || document.hidden) {
      setTimeout(resolve, 0);
      return;
    }
    // Trocar de aba depois do clique não pode prender o início em um rAF suspenso.
    let quadro, prazo;
    const terminar = () => {
      cancelAnimationFrame(quadro);
      clearTimeout(prazo);
      document.removeEventListener('visibilitychange', aoOcultar);
      resolve();
    };
    const aoOcultar = () => {
      if (document.hidden) terminar();
    };
    document.addEventListener('visibilitychange', aoOcultar);
    quadro = requestAnimationFrame(() => setTimeout(terminar, 0));
    prazo = setTimeout(terminar, 100);
  });
}

function criar(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined) n.textContent = texto;
  return n;
}
function desenhar(ctx, t, p, estado, cores) {
  const W = p.retrato ? 640 : 1000,
    H = (ctx.canvas.height / ctx.canvas.width) * W;
  ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.width / W, 0, 0);
  ctx.fillStyle = cores.fundo;
  ctx.fillRect(0, 0, W, H);
  const y = H * 0.5,
    l = Math.min(140, W * 0.19),
    a = Math.min(H * 0.67, 150),
    xs = [W * 0.18, W * 0.5, W * 0.82];
  const final = estado === 'concluído',
    erro = estado === 'erro',
    cancelado = estado === 'cancelado';
  ctx.save();
  ctx.strokeStyle = cores.borda;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 9]);
  ctx.lineDashOffset = -t * 20;
  ctx.beginPath();
  ctx.moveTo(xs[0], y);
  ctx.lineTo(xs[2], y);
  ctx.stroke();
  ctx.restore();
  if (estado === 'processando')
    for (let i = 0; i < 6; i++) {
      const v = (t * 0.28 + i / 6) % 1,
        x = xs[0] + (xs[2] - xs[0]) * v;
      ctx.save();
      ctx.translate(x, y - 10 * Math.sin(v * Math.PI * 2));
      ctx.rotate(t + i);
      ctx.fillStyle = cores.marca;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  if (estado === 'concluído') {
    for (let i = 0; i < 8; i++) {
      const ângulo = (Math.PI * 2 * i) / 8 + t * 0.7;
      const distância = 46 + 8 * Math.sin(t * 2 + i);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3 + i));
      ctx.fillStyle = cores.ok;
      ctx.translate(xs[2] + Math.cos(ângulo) * distância, y + Math.sin(ângulo) * distância);
      ctx.rotate(ângulo);
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
  }
  xs.forEach((x, i) => {
    const giro =
      estado === 'processando' && i === 1
        ? Math.sin(t * 2.8) * 0.035
        : estado === 'concluído' && i === 2
          ? Math.sin(t * 2.4) * 0.012
          : 0;
    papel(ctx, {
      cx: x,
      cy: y,
      l,
      a,
      raio: 14,
      cor: cores.papel,
      sombra: 'rgba(26,26,26,.12)',
      desvio: 6,
      giro,
      contorno: i === 2 && final ? cores.ok : cores.borda,
      larguraContorno: final && i === 2 ? 3 : 1,
    });
    ctx.save();
    ctx.translate(x, y);
    if (final && i === 2) {
      const escala = 1 + Math.sin(t * 2.8) * 0.035;
      ctx.scale(escala, escala);
    }
    ctx.strokeStyle = i === 2 && erro ? cores.erro : cores.marca;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (i === 2 && final) {
      ctx.strokeStyle = cores.ok;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-5, 15);
      ctx.lineTo(24, -18);
      ctx.stroke();
    } else if (i === 2 && (erro || cancelado)) {
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(14, 14);
      ctx.moveTo(14, -14);
      ctx.lineTo(-14, 14);
      ctx.stroke();
    } else if (i === 1) {
      ctx.save();
      if (estado === 'processando') ctx.rotate(t * 0.9);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 1.65);
      ctx.stroke();
      ctx.restore();
    } else {
      caminhoArredondado(ctx, -20, -27, 40, 54, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(10, -10);
      ctx.moveTo(-10, 2);
      ctx.lineTo(10, 2);
      ctx.moveTo(-10, 14);
      ctx.lineTo(5, 14);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** O alvo pertence à ferramenta; não são lidos dados dos campos nem resultados de demonstração. */
export function criarExecucaoVisual(
  elemento,
  {
    titulo = 'Resultado da operação',
    tipo = 'analise',
    compacta = false,
    duracaoMinimaMs = resolverDuracaoApresentacao({ tipo }),
  } = {},
) {
  if (controles.has(elemento)) return controles.get(elemento);
  elemento.hidden = true;
  elemento.classList.add('execucao-visual');
  if (compacta) elemento.classList.add('execucao-visual--compacta');
  elemento.dataset.tipoExecucao = tipo;
  const topo = criar('div', 'execucao-visual__topo');
  const nome = criar('p', 'execucao-visual__titulo', titulo);
  const selo = criar('span', 'execucao-visual__selo');
  const pausar = criar('button', 'execucao-visual__pausar');
  pausar.type = 'button';
  pausar.innerHTML = ícone('pausar');
  pausar.setAttribute(
    'aria-label',
    'Pausar animação visual; o processamento continua',
  );
  pausar.setAttribute('aria-pressed', 'false');
  topo.append(nome, selo, pausar);
  const palco = criar('div', 'execucao-visual__palco');
  const canvas = criar('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  palco.append(canvas);
  const texto =
    elemento.querySelector('.progresso__texto') ||
    criar('p', 'progresso__texto');
  texto.setAttribute('role', 'status');
  texto.setAttribute('aria-live', 'polite');
  const trilho =
    elemento.querySelector('.progresso__trilho') ||
    criar('div', 'progresso__trilho');
  const barra =
    trilho.querySelector('.progresso__barra') ||
    criar('div', 'progresso__barra');
  if (!barra.parentElement) trilho.append(barra);
  const resumo = criar('p', 'execucao-visual__resumo');
  resumo.hidden = true;
  const etapas = criar('ol', 'execucao-visual__etapas');
  for (const t of ['Dados', 'Processamento', 'Resultado'])
    etapas.append(criar('li', '', t));
  elemento.replaceChildren(topo, palco, texto, trilho, resumo, etapas);
  let motor = null,
    timer = null,
    token = 0,
    estado = 'oculto',
    semMovimento = false,
    inícioDaOperação = null,
    cores;
  const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)');
  const duraçãoDaApresentação = Number.isFinite(duracaoMinimaMs)
    ? Math.max(0, Math.round(duracaoMinimaMs))
    : resolverDuracaoApresentacao({ tipo });

  function agora() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  function tempoRestanteDaApresentação() {
    if (inícioDaOperação === null) return duraçãoDaApresentação;
    return Math.max(0, duraçãoDaApresentação - (agora() - inícioDaOperação));
  }

  function sincronizarRótuloDePausa() {
    const apresentaçãoPronta = estado === 'concluído';
    const rótulo = semMovimento
      ? apresentaçãoPronta ? 'Retomar apresentação visual' : 'Retomar animação visual'
      : apresentaçãoPronta
        ? 'Pausar animação visual; resultado já disponível'
        : 'Pausar animação visual; o processamento continua';
    pausar.setAttribute('aria-label', rótulo);
  }

  function programarFimDaApresentação(mensagem) {
    clearTimeout(timer);
    const atual = token;
    const falhouOuCancelou = estado === 'erro' || estado === 'cancelado';
    const tempo = falhouOuCancelou || reduzirMovimento.matches
      ? 650
      : tempoRestanteDaApresentação();
    timer = setTimeout(() => {
      if (token !== atual) return;
      parar();
      palco.hidden = true;
      pausar.hidden = true;
      elemento.dataset.compacto = 'sim';
      if (estado === 'concluído') texto.textContent = mensagem;
      inícioDaOperação = null;
    }, tempo);
  }

  function paleta() {
    const s = getComputedStyle(document.documentElement),
      cor = (n, p) => s.getPropertyValue(n).trim() || p;
    return {
      fundo: cor('--fundo', '#f5f2ed'),
      papel: cor('--superfície', '#fffdf9'),
      borda: cor('--borda', '#ddd6cc'),
      marca: cor('--marca', '#a8472a'),
      ok: cor('--ok', '#2c6a4c'),
      erro: cor('--erro', '#a32b23'),
    };
  }
  function parar() {
    motor?.destruir();
    motor = null;
    if (ouvinteMovimentoAtivo) {
      reduzirMovimento.removeEventListener?.('change', aoTrocarPreferênciaDeMovimento);
      reduzirMovimento.removeListener?.(aoTrocarPreferênciaDeMovimento);
      ouvinteMovimentoAtivo = false;
    }
  }
  let ouvinteMovimentoAtivo = false;
  function observarPreferênciaDeMovimento() {
    if (ouvinteMovimentoAtivo) return;
    if (reduzirMovimento.addEventListener) reduzirMovimento.addEventListener('change', aoTrocarPreferênciaDeMovimento);
    else reduzirMovimento.addListener?.(aoTrocarPreferênciaDeMovimento);
    ouvinteMovimentoAtivo = true;
  }
  function iniciarMotor() {
    if (!elemento.isConnected || !canvas.getContext('2d')) return;
    observarPreferênciaDeMovimento();
    cores = paleta();
    if (!motor)
      motor = criarVitrine(canvas, {
        quadroEstático: 0,
        desenhar(ctx, t, p) {
          if (!elemento.isConnected) {
            queueMicrotask(parar);
            return;
          }
          desenhar(ctx, t, p, estado, cores);
        },
      });
    if (semMovimento) motor.pausar();
    else motor.tocar();
  }
  function pintar(novo, mensagem, porcentagem) {
    clearTimeout(timer);
    token++;
    estado = novo;
    elemento.hidden = false;
    elemento.dataset.estado = novo;
    elemento.dataset.execucaoEstado = novo;
    // O status fica fora da região ocupada para ser anunciado durante o trabalho.
    palco.setAttribute('aria-busy', String(novo === 'processando'));
    texto.textContent = mensagem;
    selo.textContent =
      novo === 'processando'
        ? 'Em andamento'
        : novo === 'concluído'
          ? 'Pronto'
          : novo === 'erro'
            ? 'Falhou'
            : 'Cancelado';
    sincronizarRótuloDePausa();
    etapas
      .querySelectorAll('li')
      .forEach(
        (n, i) =>
          (n.dataset.fase =
            novo === 'concluído'
              ? 'concluida'
              : i === 1 && novo === 'processando'
                ? 'ativa'
                : i === 0
                  ? 'concluida'
                  : 'pendente'),
      );
    const informado =
      typeof porcentagem === 'number' && Number.isFinite(porcentagem);
    trilho.hidden = novo === 'erro' || novo === 'cancelado';
    trilho.setAttribute('role', 'progressbar');
    trilho.setAttribute('aria-label', mensagem);
    trilho.setAttribute('aria-valuemin', '0');
    trilho.setAttribute('aria-valuemax', '100');
    if (informado) {
      const v = Math.max(0, Math.min(100, porcentagem));
      trilho.setAttribute('aria-valuenow', String(Math.round(v)));
      barra.style.width = `${v}%`;
      trilho.dataset.indeterminado = 'nao';
    } else {
      trilho.removeAttribute('aria-valuenow');
      barra.style.width = '';
      trilho.dataset.indeterminado = 'sim';
    }
    resumo.hidden = true;
    pausar.hidden =
      !['processando', 'concluído'].includes(novo) || reduzirMovimento.matches;
    palco.hidden = false;
    delete elemento.dataset.compacto;
    iniciarMotor();
    motor?.repintar();
    if (novo === 'concluído') {
      programarFimDaApresentação(mensagem);
    } else if (novo === 'erro' || novo === 'cancelado') {
      programarFimDaApresentação(mensagem);
    }
  }

  function aoTrocarPreferênciaDeMovimento() {
    pausar.hidden =
      !(estado === 'processando' || (estado === 'concluído' && !palco.hidden)) || reduzirMovimento.matches;
    if (estado === 'concluído' && !palco.hidden) {
      programarFimDaApresentação(texto.textContent);
    }
  }
  pausar.addEventListener('click', () => {
    semMovimento = !semMovimento;
    pausar.setAttribute('aria-pressed', String(semMovimento));
    elemento.dataset.animacaoPausada = semMovimento ? 'sim' : 'nao';
    sincronizarRótuloDePausa();
    pausar.innerHTML = ícone(semMovimento ? 'reproduzir' : 'pausar');
    if (semMovimento) motor?.pausar();
    else motor?.tocar();
  });
  const controle = {
    iniciar(mensagem = 'Preparando…') {
      resumo.hidden = true;
      inícioDaOperação = agora();
      pintar('processando', mensagem);
    },
    andar(porcentagem, mensagem = 'Processando…') {
      if (inícioDaOperação === null) inícioDaOperação = agora();
      pintar('processando', mensagem, porcentagem);
    },
    concluir(mensagem = 'Resultado pronto', detalhe) {
      if (inícioDaOperação === null) inícioDaOperação = agora();
      pintar('concluído', mensagem, 100);
      if (detalhe) {
        resumo.textContent = String(detalhe);
        resumo.hidden = false;
      }
    },
    falhar(mensagem = 'Não foi possível concluir') {
      pintar('erro', mensagem);
    },
    cancelar(mensagem = 'Operação cancelada') {
      pintar('cancelado', mensagem);
    },
    esconder() {
      clearTimeout(timer);
      token++;
      estado = 'oculto';
      inícioDaOperação = null;
      elemento.hidden = true;
      palco.setAttribute('aria-busy', 'false');
      parar();
    },
    destruir() {
      controle.esconder();
      controles.delete(elemento);
    },
  };
  controles.set(elemento, controle);
  return controle;
}

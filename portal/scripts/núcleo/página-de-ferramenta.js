/**
 * Arranque comum de toda página de ferramenta.
 *
 * Carrega o módulo da ferramenta, monta a interface, registra o uso no
 * histórico local, liga o favorito e escreve a seção "Como usar" a partir
 * do que o próprio módulo declara — assim a documentação nunca descola do código.
 */
import { ferramentaPorSlug } from '../../dados/catálogo.js';
import { registrarUso, registrarVisualizacao, lerVisualizadas, éFavorito, alternarFavorito } from './preferências.js';
import { escapar } from './texto.js';
import { avisar } from './interface.js';
import { isolarBloco, carregarBloco } from './isolar-bloco.js';
import { pulsar } from './movimento.js';

const raiz = document.getElementById('ferramenta');
const slug = raiz?.dataset.slug;
const ferramenta = slug ? ferramentaPorSlug[slug] : null;

function ligarFavorito() {
  const botão = document.querySelector(`[data-favorito="${CSS.escape(slug)}"]`);
  if (!botão) return;
  const pintar = (ligado) => {
    botão.setAttribute('aria-pressed', String(ligado));
    botão.setAttribute('aria-label', ligado ? 'Remover dos favoritos' : 'Salvar nos favoritos');
  };
  pintar(éFavorito(slug));
  botão.addEventListener('click', () => {
    const { favoritado, limiteAtingido } = alternarFavorito(slug);
    if (limiteAtingido) { avisar('Limite de favoritos atingido.'); return; }
    pintar(favoritado);
    pulsar(botão);
    avisar(favoritado ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
  });
}

/**
 * Escreve a seção "Como usar" com o que o módulo declarou.
 * @param {{passos?: string[], exemplo?: {título?: string, texto: string}, perguntas?: {p: string, r: string}[], limites?: string}} instruções
 */
function escreverInstruções(instruções = {}) {
  const alvo = document.getElementById('instruções');
  if (!alvo) return;
  const partes = [];

  if (instruções.passos?.length) {
    partes.push(`<ol>${instruções.passos.map((p) => `<li>${escapar(p)}</li>`).join('')}</ol>`);
  }
  if (instruções.exemplo) {
    partes.push(`<h3>${escapar(instruções.exemplo.título ?? 'Exemplo')}</h3><p>${escapar(instruções.exemplo.texto)}</p>`);
  }
  if (instruções.limites) {
    partes.push(`<h3>Limites e premissas</h3><p>${escapar(instruções.limites)}</p>`);
  }
  if (instruções.perguntas?.length) {
    partes.push('<h3>Perguntas frequentes</h3>');
    partes.push(instruções.perguntas
      .map((q) => `<details><summary>${escapar(q.p)}</summary><p>${escapar(q.r)}</p></details>`)
      .join(''));
  }

  if (partes.length === 0) {
    document.getElementById('como-usar')?.remove();
    return;
  }
  alvo.innerHTML = partes.join('');
}

function ligarAjuda() {
  const botão = document.querySelector('[data-como-funciona]');
  const diálogo = document.getElementById('dialogo-como-funciona');
  const fechar = diálogo?.querySelector('[data-fechar-ajuda]');
  if (!botão || !diálogo || !fechar) return;
  botão.addEventListener('click', () => {
    if (!diálogo.open) diálogo.showModal();
  });
  fechar.addEventListener('click', () => diálogo.close());
  diálogo.addEventListener('click', (evento) => {
    if (evento.target === diálogo) diálogo.close();
  });
  // O diálogo nativo mantém o foco dentro da ajuda e aceita Escape.
  diálogo.addEventListener('close', () => botão.focus());
}

/** Diferencia visualmente atalhos já abertos e coloca os novos primeiro. */
function sinalizarVisualizadas() {
  const contêiner = document.querySelector('.relacionadas--compactas');
  if (!contêiner) return;
  const jáAbertas = new Set(lerVisualizadas());
  const cartões = Array.from(contêiner.querySelectorAll('[data-relacionada]'));
  for (const cartão of cartões) {
    const visualizada = jáAbertas.has(cartão.dataset.relacionada);
    cartão.dataset.visitada = visualizada ? 'sim' : 'nao';
    const selo = cartão.querySelector('[data-visto]');
    if (selo) selo.hidden = !visualizada;
    const nome = cartão.querySelector('.relacionadas__nome')?.textContent?.trim() ?? '';
    cartão.setAttribute('aria-label', visualizada
      ? nome + ' — já visualizada neste aparelho'
      : nome + ' — ainda não visualizada');
  }
  // Novas recomendações antes das vistas, mantendo a ordem de relevância de cada grupo.
  cartões.sort((a, b) => Number(a.dataset.visitada === 'sim') - Number(b.dataset.visitada === 'sim'));
  contêiner.replaceChildren(...cartões);
}

async function iniciar() {
  if (!raiz || !ferramenta) return;
  ligarAjuda();
  isolarBloco('favorito', ligarFavorito);
  registrarVisualizacao(slug);
  registrarUso(slug);
  sinalizarVisualizadas();
  // Ao voltar pelo navegador (bfcache), atualiza a marca das páginas visitadas.
  window.addEventListener('pageshow', sinalizarVisualizadas);
  // A ferramenta é um bloco à parte: se o módulo dela não carregar ou quebrar ao montar, só a
  // área dela mostra a mensagem (com "Tentar de novo"); o cabeçalho e o resto da página seguem.
  await isolarBloco('ferramenta', async (tentativa) => {
    const módulo = await carregarBloco(new URL(`../ferramentas/${slug}.js`, import.meta.url).href, tentativa);
    const definição = módulo.default;
    raiz.replaceChildren();
    definição.montar(raiz, ferramenta);
    escreverInstruções(definição.instruções);
  }, { alvo: raiz });
}

await iniciar();

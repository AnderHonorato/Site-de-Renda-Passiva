/**
 * Arranque comum de toda página de ferramenta.
 *
 * Carrega o módulo da ferramenta, monta a interface, registra o uso no
 * histórico local, liga o favorito e escreve a seção "Como usar" a partir
 * do que o próprio módulo declara — assim a documentação nunca descola do código.
 */
import { ferramentaPorSlug } from '../../dados/catálogo.js';
import { registrarUso, éFavorito, alternarFavorito } from './preferências.js';
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

async function iniciar() {
  if (!raiz || !ferramenta) return;
  isolarBloco('favorito', ligarFavorito);
  registrarUso(slug);
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

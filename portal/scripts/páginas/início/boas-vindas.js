/**
 * Popup de boas-vindas da página inicial: a animação do portal à esquerda e um carrossel curto à
 * direita. Aparece sozinho na primeira visita (a lembrança fica num cookie) e pode ser reaberto
 * pelo botão "Ver a apresentação". A animação e as fontes dela só são baixadas quando o popup abre.
 */
import { carregarBloco } from '../../núcleo/isolar-bloco.js';
import { ícone } from '../../núcleo/ícones.js';
import { escapar } from '../../núcleo/texto.js';
import { t, lista, idioma } from '../../núcleo/idioma.js';

const COOKIE = 'visto_novidades';
const UM_ANO = 60 * 60 * 24 * 365;

function jáViu() {
  try {
    if (document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE}=`))) return true;
  } catch { /* cookies bloqueados: cai para o armazenamento local */ }
  try { return localStorage.getItem(COOKIE) === '1'; } catch { return false; }
}

function lembrar() {
  try { document.cookie = `${COOKIE}=1; max-age=${UM_ANO}; path=/; SameSite=Lax`; } catch { /* sem cookie */ }
  try { localStorage.setItem(COOKIE, '1'); } catch { /* sem armazenamento */ }
}

/** Cada item da lista traduzida é "título|texto". */
function slidesDaLista() {
  return lista('boasVindas.slides').map((item) => {
    const corte = item.indexOf('|');
    return { título: item.slice(0, corte), texto: item.slice(corte + 1) };
  });
}

let aberto = null;

/** Abre o popup. Devolve o elemento (ou o que já estava aberto). */
export function abrirBoasVindas() {
  if (aberto) return aberto;
  const slides = slidesDaLista();
  if (slides.length === 0) return null;

  const diálogo = document.createElement('dialog');
  diálogo.className = 'boas-vindas';
  diálogo.setAttribute('aria-labelledby', 'bv-título');
  diálogo.innerHTML = `
    <div class="boas-vindas__arte" data-vitrine data-vitrine-manual data-idioma="${escapar(idioma)}">
      <canvas class="vitrine__tela"></canvas>
    </div>
    <div class="boas-vindas__texto">
      <button class="ícone-botão boas-vindas__fechar" type="button" data-bv="fechar" aria-label="${escapar(t('boasVindas.fechar'))}">${ícone('fechar')}</button>
      <div class="boas-vindas__slides" aria-live="polite">
        ${slides.map((s, i) => `<section class="boas-vindas__slide" data-slide="${i}"${i === 0 ? '' : ' hidden'}>
          <h2${i === 0 ? ' id="bv-título"' : ''}>${escapar(s.título)}</h2>
          <p>${escapar(s.texto)}</p>
        </section>`).join('')}
      </div>
      <div class="boas-vindas__barra" role="presentation"><i></i></div>
      <div class="boas-vindas__ações">
        <button class="botão botão--texto" type="button" data-bv="fechar">${escapar(t('boasVindas.pular'))}</button>
        <button class="botão boas-vindas__próximo" type="button" autofocus data-bv="próximo">
          <span>${escapar(t('boasVindas.próximo'))}</span> ${ícone('seta', { tamanho: 16 })}
        </button>
      </div>
    </div>`;
  document.body.append(diálogo);

  let atual = 0;
  const barra = diálogo.querySelector('.boas-vindas__barra i');
  const rótuloDoBotão = diálogo.querySelector('.boas-vindas__próximo span');
  const ir = (índice) => {
    atual = Math.max(0, Math.min(slides.length - 1, índice));
    diálogo.querySelectorAll('.boas-vindas__slide').forEach((el, i) => { el.hidden = i !== atual; });
    barra.style.transform = `scaleX(${(atual + 1) / slides.length})`;
    rótuloDoBotão.textContent = atual === slides.length - 1 ? t('boasVindas.começar') : t('boasVindas.próximo');
  };
  ir(0);

  let vitrine = null;
  const fechar = () => {
    if (!aberto) return;
    vitrine?.destruir?.();
    aberto = null;
    lembrar();
    diálogo.classList.add('boas-vindas--saindo');
    const remover = () => diálogo.remove();
    diálogo.addEventListener('animationend', remover, { once: true });
    setTimeout(remover, 400); // se "reduzir movimento" desligar a animação
    try { diálogo.close(); } catch { /* já fechado */ }
  };

  diálogo.addEventListener('click', (evento) => {
    const alvo = evento.target instanceof Element ? evento.target : null;
    if (alvo === diálogo) { fechar(); return; } // clique no fundo escuro
    const ação = alvo?.closest('[data-bv]')?.dataset.bv;
    if (ação === 'fechar') fechar();
    else if (ação === 'próximo') (atual === slides.length - 1 ? fechar() : ir(atual + 1));
  });
  diálogo.addEventListener('cancel', (evento) => { evento.preventDefault(); fechar(); }); // Esc
  diálogo.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowRight') ir(atual + 1);
    else if (evento.key === 'ArrowLeft') ir(atual - 1);
  });

  if (typeof diálogo.showModal === 'function') diálogo.showModal(); else diálogo.setAttribute('open', '');
  aberto = diálogo;

  // A animação entra depois do popup aparecer; se falhar, o painel continua útil sem ela.
  carregarBloco(new URL('../../../vitrine/vitrine.js', import.meta.url).href)
    .then(async (módulo) => {
      await módulo.carregarFontes(1500);
      if (aberto === diálogo) vitrine = módulo.montarVitrine(diálogo.querySelector('[data-vitrine]'));
    })
    .catch((erro) => {
      console.error('[boas-vindas] animação indisponível', erro);
      diálogo.classList.add('boas-vindas--sem-arte');
    });

  return diálogo;
}

export function montar() {
  document.getElementById('ver-apresentação')?.addEventListener('click', () => abrirBoasVindas());
  if (jáViu()) return;
  // Espera a página assentar: o popup não disputa o primeiro carregamento.
  const abrir = () => abrirBoasVindas();
  if ('requestIdleCallback' in window) requestIdleCallback(() => setTimeout(abrir, 700), { timeout: 3000 });
  else setTimeout(abrir, 1500);
}

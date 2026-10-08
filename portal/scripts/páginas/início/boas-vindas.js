/**
 * Popup de boas-vindas da página inicial: a animação do portal à esquerda e um carrossel curto à
 * direita. Aparece sozinho na primeira visita e grava essa visualização num cookie.
 * A animação e as fontes dela só são baixadas quando o popup abre.
 */
import { carregarBloco } from '../../núcleo/isolar-bloco.js';
import { ícone } from '../../núcleo/ícones.js';
import { escapar } from '../../núcleo/texto.js';
import { t, lista, idioma } from '../../núcleo/idioma.js';
import { carregarNovidades, lembrarNovidades, linkNovidadeSeguro, ultimaNovidadeVista } from '../../núcleo/novidades.js';


/** Cada item da lista traduzida é "título|texto". */
function slidesDaLista() {
  return lista('boasVindas.slides').map((item) => {
    const corte = item.indexOf('|');
    return { título: item.slice(0, corte), texto: item.slice(corte + 1) };
  });
}

let aberto = null;

/** Abre o popup. Devolve o elemento (ou o que já estava aberto). */
export function abrirBoasVindas({ itens = slidesDaLista(), lembrar = true } = {}) {
  if (aberto) return aberto;
  const slides = itens;
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
      </div>
      <p class="suave pequeno" data-bv-posicao role="status"></p>
      <div class="boas-vindas__segmentos" aria-hidden="true"></div>
      <div class="boas-vindas__ações">
        <button class="botão botão--texto" type="button" data-bv="fechar">${escapar(t('boasVindas.pular'))}</button>
        <button class="botão botão--linha" type="button" data-bv="anterior">${idioma === 'en' ? 'Previous' : 'Anterior'}</button>
        <button class="botão boas-vindas__próximo" type="button" autofocus data-bv="próximo">
          <span>${escapar(t('boasVindas.próximo'))}</span> ${ícone('seta', { tamanho: 16 })}
        </button>
      </div>
    </div>`;
  document.body.append(diálogo);

  const area = diálogo.querySelector('.boas-vindas__slides');
  const segmentos = diálogo.querySelector('.boas-vindas__segmentos');
  const posicao = diálogo.querySelector('[data-bv-posicao]');
  for (const [i,s] of slides.entries()) {
    const slide = document.createElement('section'); slide.className = 'boas-vindas__slide'; slide.dataset.slide = String(i);
    const titulo = document.createElement('h2'); titulo.textContent = s.título ?? s.titulo; titulo.id = `bv-titulo-${i}`;
    const texto = document.createElement('p'); texto.textContent = s.texto; slide.append(titulo,texto);
    if (typeof s.imagem_url === 'string' && /^\/api\/(admin\/)?novidades\/\d+\/imagem\?v=\d+$/u.test(s.imagem_url)) {
      const imagem = document.createElement('img'); imagem.src = s.imagem_url; imagem.alt = s.alt || ''; imagem.className = 'boas-vindas__imagem'; imagem.loading = 'lazy';
      imagem.addEventListener('error',()=>imagem.remove(),{once:true}); slide.append(imagem);
    }
    const url = linkNovidadeSeguro(s.url);
    if (url && s.botao) { const link = document.createElement('a'); link.href = url; link.className = 'botão botão--linha'; link.textContent = s.botao; slide.append(link); }
    area.append(slide); segmentos.append(document.createElement('i'));
  }

  let atual = 0;
  const rótuloDoBotão = diálogo.querySelector('.boas-vindas__próximo span');
  const anterior = diálogo.querySelector('[data-bv="anterior"]');
  const ir = (índice) => {
    atual = Math.max(0, Math.min(slides.length - 1, índice));
    diálogo.querySelectorAll('.boas-vindas__slide').forEach((el, i) => { el.hidden = i !== atual; });
    segmentos.hidden = slides.length === 1;
    segmentos.querySelectorAll('i').forEach((el,i)=>el.classList.toggle('atual',i === atual));
    anterior.hidden = atual === 0;
    posicao.hidden = slides.length === 1;
    posicao.textContent = idioma === 'en' ? `Item ${atual + 1} of ${slides.length}` : `Item ${atual + 1} de ${slides.length}`;
    diálogo.setAttribute('aria-labelledby',`bv-titulo-${atual}`);
    diálogo.querySelector('.boas-vindas__próximo svg').hidden = slides.length === 1;
    rótuloDoBotão.textContent = atual === slides.length - 1 ? t('boasVindas.começar') : t('boasVindas.próximo');
  };
  ir(0);

  let vitrine = null;
  const fechar = () => {
    if (!aberto) return;
    vitrine?.destruir?.();
    aberto = null;
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
    else if (ação === 'anterior') ir(atual - 1);
    else if (ação === 'próximo') (atual === slides.length - 1 ? fechar() : ir(atual + 1));
  });
  diálogo.addEventListener('cancel', (evento) => { evento.preventDefault(); fechar(); }); // Esc
  diálogo.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowRight') { evento.preventDefault(); ir(atual + 1); }
    else if (evento.key === 'ArrowLeft') { evento.preventDefault(); ir(atual - 1); }
  });

  if (typeof diálogo.showModal === 'function') diálogo.showModal(); else diálogo.setAttribute('open', '');
  aberto = diálogo;
  if (lembrar) lembrarNovidades(Math.max(1,...slides.map(s=>Number(s.revisao)||1)));

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

export async function montar() {
  const publicado = await carregarNovidades(idioma);
  const visto = ultimaNovidadeVista();
  const itens = [...(visto ? [] : slidesDaLista()),...publicado.filter(s=>s.revisao > visto)];
  if (!itens.length) return;
  // Espera a página assentar: o popup não disputa o primeiro carregamento.
  let mostrou = false;
  let pendente;
  const observador=new MutationObserver(()=>{clearTimeout(pendente);pendente=setTimeout(abrir,80);});
  const abrir = () => {
    if (mostrou || document.documentElement.dataset.consentimentoPronto !== 'sim' || document.querySelector('.consentimento') || document.querySelector('dialog[open]')) return;
    mostrou=true;observador.disconnect();clearTimeout(pendente);abrirBoasVindas({itens});
  };
  // Se outro diálogo estiver aberto, a apresentação espera seu fechamento.
  observador.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden']});
  window.addEventListener('consentimento-alterado',()=>setTimeout(abrir,0));
  window.addEventListener('consentimento-pronto',()=>setTimeout(abrir,700),{once:true});
  if ('requestIdleCallback' in window) requestIdleCallback(() => setTimeout(abrir, 700), { timeout: 3000 });
  else setTimeout(abrir, 1500);
}

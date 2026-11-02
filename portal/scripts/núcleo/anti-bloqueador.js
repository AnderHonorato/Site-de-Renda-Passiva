/**
 * Pede para desligar o bloqueador de anúncios antes de usar uma ferramenta.
 *
 * Só vale quando TUDO isto é verdade: a página foi gerada com anúncios ativos (`data-anuncios="sim"`),
 * a pessoa não é Plus/Premium (`data-sem-anuncios`), a página é de ferramenta e a pessoa deu consentimento
 * para publicidade. Sem consentimento nenhum anúncio é pedido, então não existe bloqueio a detectar e a
 * ferramenta fica livre: não se condiciona o uso à aceitação de rastreamento.
 *
 * Como detecta: uma "isca" com nomes de classe que os bloqueadores escondem, mais o resultado do
 * carregamento do script de anúncios (evento `anuncios:script`). Duas leituras seguidas evitam falso alarme.
 * É verificação do lado do navegador: quem quiser contornar consegue, e a ferramenta não é a única
 * proteção do negócio.
 */
import { t } from './idioma.js';

const CHAVE_DO_CONSENTIMENTO = 'consentimento-v1';

/** Consentimento guardado pela faixa de cookies: `{ publicidade: boolean }`. */
export function consentimentoDePublicidade() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DO_CONSENTIMENTO) ?? 'null')?.publicidade === true;
  } catch { return false; }
}

/** A isca some (display none, altura zero, fora da árvore) quando um filtro cosmético a esconde. */
export function iscaFoiEscondida(isca) {
  if (!isca.isConnected) return true;
  const estilo = getComputedStyle(isca);
  return isca.offsetHeight === 0 || estilo.display === 'none' || estilo.visibility === 'hidden';
}

export function ligarAntiBloqueador() {
  const raiz = document.documentElement;
  if (raiz.dataset.anuncios !== 'sim' || raiz.dataset.semAnuncios === 'sim') return;
  if (raiz.dataset.exigirSemBloqueador !== 'sim') return;
  if (!document.getElementById('ferramenta')) return;
  if (!consentimentoDePublicidade()) return;

  let scriptFalhou = false;
  window.addEventListener('anuncios:script', (evento) => { scriptFalhou = evento.detail?.ok === false; });

  const isca = document.createElement('div');
  isca.className = 'isca-de-anúncio adsbox ad-banner pub_300x250 textads banner-ads ad-placement';
  isca.setAttribute('aria-hidden', 'true');
  document.body.append(isca);

  let diálogo = null;
  const mostrar = () => {
    if (diálogo?.isConnected) return;
    diálogo = document.createElement('dialog');
    diálogo.className = 'aviso-de-bloqueador';
    diálogo.setAttribute('aria-labelledby', 'ab-título');
    const título = document.createElement('h2');
    título.id = 'ab-título';
    título.textContent = t('bloqueador.título');
    const texto = document.createElement('p');
    texto.textContent = t('bloqueador.texto');
    const como = document.createElement('p');
    como.className = 'suave';
    como.textContent = t('bloqueador.como');
    const ações = document.createElement('div');
    ações.className = 'ações';
    const botão = document.createElement('button');
    botão.type = 'button';
    botão.className = 'botão';
    botão.textContent = t('bloqueador.recarregar');
    botão.addEventListener('click', () => location.reload());
    ações.append(botão);
    diálogo.append(título, texto, como, ações);
    diálogo.addEventListener('cancel', (evento) => evento.preventDefault()); // Esc não fecha
    document.body.append(diálogo);
    document.getElementById('ferramenta')?.setAttribute('inert', '');
    if (typeof diálogo.showModal === 'function') diálogo.showModal(); else diálogo.setAttribute('open', '');
  };
  const esconder = () => {
    diálogo?.remove();
    diálogo = null;
    document.getElementById('ferramenta')?.removeAttribute('inert');
  };

  const bloqueado = () => scriptFalhou || iscaFoiEscondida(isca);
  let leiturasSeguidas = 0;
  const conferir = () => {
    if (bloqueado()) {
      leiturasSeguidas += 1;
      if (leiturasSeguidas >= 2) mostrar();
    } else {
      leiturasSeguidas = 0;
      if (diálogo) esconder();
    }
  };
  setTimeout(() => { conferir(); setInterval(conferir, 2500); }, 1500);

  // Quem apagar o aviso pelo console o vê voltar na próxima leitura.
  new MutationObserver(() => {
    if (diálogo && !diálogo.isConnected) { diálogo = null; if (bloqueado()) mostrar(); }
  }).observe(document.body, { childList: true });
}

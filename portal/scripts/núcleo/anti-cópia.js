/**
 * Dissuasão contra copiar o conteúdo do site (textos, ilustrações, fichas).
 *
 * O que faz: impede selecionar e copiar o texto corrido, abrir o menu do botão direito e arrastar
 * imagens para fora da página. O que NÃO atrapalha: campos de formulário, resultados das ferramentas,
 * trechos de código e qualquer coisa marcada com `.copiável`. O botão "Copiar" dos resultados continua
 * funcionando, e a impressão também.
 *
 * É dissuasão: quem tem o navegador na mão consegue ler o HTML. Por isso não mexe em teclado nem em
 * ferramentas do desenvolvedor, e nunca atrapalha leitor de tela, que não usa seleção.
 */
import { t } from './idioma.js';
import { avisar } from './interface.js';

/** O que continua selecionável e copiável. */
const LIVRES = 'input, textarea, select, [contenteditable="true"], [contenteditable=""], .resultado, .copiável, pre, code, .tabela-copiável';

const éLivre = (nó) => {
  const elemento = nó instanceof Element ? nó : nó?.parentElement;
  return Boolean(elemento?.closest(LIVRES));
};

export function ligarAntiCópia() {
  if (document.documentElement.dataset.antiCopia !== 'sim') return;
  document.documentElement.classList.add('anti-cópia');

  let últimoAviso = 0;
  const avisarComCalma = () => {
    const agora = Date.now();
    if (agora - últimoAviso < 6000) return;
    últimoAviso = agora;
    avisar(t('proteção.cópiaBloqueada'), { duração: 3200 });
  };

  const barrarCópia = (evento) => {
    const seleção = getSelection();
    if (!seleção || seleção.isCollapsed) return;
    // Seleção inteira dentro de um campo ou resultado: deixa passar.
    if (éLivre(seleção.anchorNode) && éLivre(seleção.focusNode)) return;
    evento.preventDefault();
    evento.clipboardData?.setData('text/plain', t('proteção.textoNaÁreaDeTransferência', { endereço: location.href }));
    avisarComCalma();
  };
  document.addEventListener('copy', barrarCópia, true);
  document.addEventListener('cut', barrarCópia, true);

  document.addEventListener('contextmenu', (evento) => {
    if (éLivre(evento.target)) return;
    evento.preventDefault();
  }, true);

  document.addEventListener('dragstart', (evento) => {
    const alvo = evento.target;
    if (alvo instanceof Element && alvo.closest('img, svg, canvas, picture')) evento.preventDefault();
  }, true);

  document.addEventListener('selectstart', (evento) => {
    if (!éLivre(evento.target)) evento.preventDefault();
  }, true);
}

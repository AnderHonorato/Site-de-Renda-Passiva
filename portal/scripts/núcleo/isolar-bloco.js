/**
 * Erro isolado por bloco.
 *
 * Cada parte de uma página (cabeçalho, busca, vitrine, listas, ferramenta) é montada por
 * `isolarBloco`. Se uma delas falhar, ou porque o código lançou um erro, ou porque um
 * `import()` não carregou, ou porque uma promessa foi rejeitada, só aquela parte mostra a
 * mensagem com o desenho e o botão "Tentar de novo". O resto da página continua de pé.
 *
 * Importante: um `import` estático que falha derruba o módulo inteiro. Por isso cada bloco
 * que pode falhar entra por `carregarBloco`, que faz `import()` dinâmico dentro do
 * `isolarBloco`, e só o que é obrigatório para a página existir é importado de forma estática.
 */
import { avisar } from './interface.js';
import { t } from './idioma.js';

const DESENHO_CLARO = new URL('../../recursos/ilustrações/erro-do-servidor.svg', import.meta.url).href;
const DESENHO_ESCURO = new URL('../../recursos/ilustrações/erro-do-servidor.escuro.svg', import.meta.url).href;

/**
 * Carrega um módulo por `import()`. A partir da segunda tentativa troca o endereço
 * (`?tentativa=2`), porque o navegador guarda o fracasso do endereço original.
 * @param {string} endereço endereço absoluto, por exemplo `new URL('./x.js', import.meta.url).href`
 * @param {number} [tentativa] número da tentativa, começando em 1
 */
export function carregarBloco(endereço, tentativa = 1) {
  return import(tentativa > 1 ? `${endereço}?tentativa=${tentativa}` : endereço);
}

function criar(tag, atributos = {}, texto = '') {
  const elemento = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos)) elemento.setAttribute(chave, valor);
  if (texto) elemento.textContent = texto;
  return elemento;
}

/**
 * Troca o conteúdo do alvo pela mensagem de falha, sem `innerHTML`.
 * @param {HTMLElement} alvo
 * @param {string} nome nome do bloco, só para o leitor de tela e para o teste
 * @param {() => void} tentarDeNovo
 * @param {number} falhas quantas vezes já falhou
 */
function mostrarFalha(alvo, nome, tentarDeNovo, falhas) {
  const imagem = criar('img', { src: DESENHO_CLARO, alt: '', width: '160', height: '120', class: 'só-claro bloco-falhou__desenho' });
  const imagemEscura = criar('img', { src: DESENHO_ESCURO, alt: '', width: '160', height: '120', class: 'só-escuro bloco-falhou__desenho' });
  const título = criar('p', { class: 'bloco-falhou__título' }, falhas > 1 ? t('bloco.aindaNãoDeu') : t('bloco.falhou'));
  const texto = criar('p', { class: 'pequeno suave' }, falhas > 1 ? t('bloco.recarregarAjuda') : t('bloco.restoFunciona'));
  const botão = criar('button', { type: 'button', class: 'botão botão--linha' }, t('bloco.tentarDeNovo'));
  botão.addEventListener('click', () => { botão.disabled = true; tentarDeNovo(); });
  const ações = criar('p', { class: 'ações' });
  ações.append(botão);
  if (falhas > 1) {
    const recarregar = criar('button', { type: 'button', class: 'botão botão--texto' }, t('bloco.recarregar'));
    recarregar.addEventListener('click', () => location.reload());
    ações.append(recarregar);
  }
  const conteúdo = criar('div');
  conteúdo.append(título, texto, ações);
  const caixa = criar('div', { class: 'bloco-falhou', role: 'alert', 'data-bloco': nome });
  caixa.append(imagem, imagemEscura, conteúdo);
  // Esconde o que estava no alvo (em vez de apagar) para poder restaurar se a nova tentativa der certo.
  for (const filho of alvo.children) {
    if (filho.hidden) continue;
    filho.hidden = true;
    filho.setAttribute('data-escondido-por-falha', 'sim');
  }
  alvo.append(caixa);
}

function restaurar(alvo) {
  alvo.querySelector(':scope > .bloco-falhou')?.remove();
  for (const filho of alvo.querySelectorAll(':scope > [data-escondido-por-falha]')) {
    filho.hidden = false;
    filho.removeAttribute('data-escondido-por-falha');
  }
}

/**
 * Monta um bloco isolado.
 * @param {string} nome identificador do bloco (aparece em `data-bloco` e no console)
 * @param {(tentativa: number) => unknown | Promise<unknown>} montar função que monta o bloco;
 *   recebe o número da tentativa e pode devolver uma promessa
 * @param {{alvo?: HTMLElement | null}} [opções] onde mostrar a mensagem se falhar. Sem alvo,
 *   a falha só vai para o console (útil para comportamentos sem lugar próprio na tela).
 * @returns {Promise<boolean>} verdadeiro se montou
 */
export async function isolarBloco(nome, montar, { alvo = null } = {}) {
  let tentativa = 0;
  let falhas = 0;

  async function rodar() {
    tentativa += 1;
    if (alvo) restaurar(alvo);
    try {
      await montar(tentativa);
      return true;
    } catch (erro) {
      falhas += 1;
      console.error(`[bloco ${nome}]`, erro);
      if (alvo) mostrarFalha(alvo, nome, rodar, falhas);
      return false;
    }
  }
  return rodar();
}

/**
 * Tratador global discreto: um erro que ninguém tratou vira, no máximo, um aviso curto de
 * tempos em tempos. Nunca derruba nem esconde nada, só avisa que algo pode não responder.
 */
export function instalarTratadorGlobal() {
  if (window.__tratadorGlobal) return;
  window.__tratadorGlobal = true;
  let últimoAviso = 0;
  const avisarComCalma = () => {
    const agora = Date.now();
    if (agora - últimoAviso < 20000) return;
    últimoAviso = agora;
    avisar(t('bloco.algoDeuErrado'), { duração: 5000 });
  };
  window.addEventListener('error', (evento) => {
    // Erros de scripts de outra origem (extensões) chegam sem detalhe e não são do portal.
    if (!evento.error && /^script error\.?$/i.test(evento.message ?? '')) return;
    if (/ResizeObserver loop/.test(evento.message ?? '')) return;
    console.error(evento.error ?? evento.message);
    avisarComCalma();
  });
  window.addEventListener('unhandledrejection', (evento) => {
    console.error(evento.reason);
    avisarComCalma();
  });
}

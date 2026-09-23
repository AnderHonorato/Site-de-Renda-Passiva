// compartilhado-popup.js — popup administrável (aviso tipo "popup"): busca /api/avisos/popup,
// mostra `.popup-aviso` (dialog não modal) no máximo 1x por semana por aviso, nunca em página
// de ferramenta, fecha com Esc/"Agora não"/X e devolve o foco a quem estava focado antes.
// Importado dinamicamente por compartilhado-pagina.js (docs/contratos.md §12).

import { chamarApi } from './compartilhado-api.js';
import { t } from './compartilhado-idioma.js';

const UMA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

function chavePopup(id) {
  return `af-popup-visto-${id}`;
}

/** Decide se o popup `id` pode ser mostrado agora, dado o que está em `armazenamento`. Função pura. */
export function deveExibirPopup(id, armazenamento, agora = Date.now()) {
  let bruto;
  try {
    bruto = armazenamento.getItem(chavePopup(id));
  } catch {
    return true;
  }
  if (!bruto) return true;
  const ultimaVez = Number(bruto);
  if (!Number.isFinite(ultimaVez)) return true;
  return agora - ultimaVez >= UMA_SEMANA_MS;
}

function registrarExibicao(id, agora = Date.now()) {
  try {
    window.localStorage.setItem(chavePopup(id), String(agora));
  } catch {
    // armazenamento indisponível: o popup pode aparecer de novo na próxima visita
  }
}

function criarIcone(nome) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icone icone--20');
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${nome}`);
  svg.append(uso);
  return svg;
}

function montarPopup(aviso) {
  const focoAnterior = document.activeElement;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'popup-aviso';
  dialogo.setAttribute('aria-labelledby', 'af-popup-titulo');

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'botao-icone';
  fechar.setAttribute('aria-label', t('compartilhado.popup.fechar'));
  fechar.append(criarIcone('fechar'));

  const rotulo = document.createElement('p');
  rotulo.className = 'sobretitulo';
  rotulo.textContent = t('compartilhado.popup.rotulo');

  const titulo = document.createElement('h2');
  titulo.id = 'af-popup-titulo';
  titulo.className = 'titulo-display titulo-display--4';
  titulo.textContent = aviso.titulo;

  const corpo = document.createElement('p');
  corpo.className = 'texto-2';
  corpo.textContent = aviso.corpo;

  dialogo.append(fechar, rotulo, titulo, corpo);

  if (aviso.link_url && aviso.link_rotulo) {
    const acao = document.createElement('a');
    acao.className = 'botao botao--primario botao--pequeno';
    acao.href = aviso.link_url;
    acao.textContent = aviso.link_rotulo;
    dialogo.append(acao);
  }

  const agoraNao = document.createElement('button');
  agoraNao.type = 'button';
  agoraNao.className = 'botao botao--fantasma botao--pequeno';
  agoraNao.textContent = t('compartilhado.acoes.agora_nao');
  dialogo.append(agoraNao);

  function aoTeclado(evento) {
    if (evento.key !== 'Escape') return;
    evento.preventDefault();
    fecharPopup();
  }

  function fecharPopup() {
    document.removeEventListener('keydown', aoTeclado, true);
    dialogo.close();
    dialogo.remove();
    if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus();
  }

  fechar.addEventListener('click', fecharPopup);
  agoraNao.addEventListener('click', fecharPopup);
  dialogo.addEventListener('cancel', (evento) => {
    evento.preventDefault();
    fecharPopup();
  });

  document.body.appendChild(dialogo);
  dialogo.show();
  document.addEventListener('keydown', aoTeclado, true);
  fechar.focus();

  registrarExibicao(aviso.id);
}

async function iniciarPopup() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('main.ferramenta')) return;

  let resposta;
  try {
    resposta = await chamarApi('/api/avisos/popup');
  } catch {
    return;
  }

  const aviso = resposta?.aviso;
  if (!aviso) return;
  if (!deveExibirPopup(aviso.id, window.localStorage)) return;

  montarPopup(aviso);
}

iniciarPopup();

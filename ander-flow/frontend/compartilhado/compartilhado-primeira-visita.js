// compartilhado-primeira-visita.js — faixa de privacidade na primeira visita.

import { t } from './compartilhado-idioma.js';

const CHAVE_ARMAZENAMENTO = 'af-primeira-visita';

/** Decide se a faixa deve aparecer, a partir do valor lido do localStorage. Função pura. */
export function deveMostrarFaixa(valorArmazenado) {
  return valorArmazenado == null;
}

function lerValorArmazenado() {
  try {
    return localStorage.getItem(CHAVE_ARMAZENAMENTO);
  } catch {
    return '1';
  }
}

function gravarValorArmazenado() {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, '1');
  } catch {
    // armazenamento indisponível; a faixa pode voltar a aparecer, sem problema
  }
}

function criarFaixa() {
  const faixa = document.createElement('div');
  faixa.className = 'faixa-primeira-visita';

  const titulo = document.createElement('p');
  titulo.className = 'titulo-display titulo-display--4';
  titulo.textContent = t('compartilhado.primeira_visita.titulo');
  faixa.appendChild(titulo);

  const texto = document.createElement('p');
  texto.className = 'texto-2';
  texto.textContent = t('compartilhado.primeira_visita.texto');
  faixa.appendChild(texto);

  const link = document.createElement('a');
  link.className = 'botao botao--fantasma';
  link.href = '/cookies';
  link.textContent = t('compartilhado.primeira_visita.saiba_mais');
  faixa.appendChild(link);

  const botaoFechar = document.createElement('button');
  botaoFechar.type = 'button';
  botaoFechar.className = 'botao botao--primario';
  botaoFechar.textContent = t('compartilhado.primeira_visita.ok');
  botaoFechar.addEventListener('click', () => {
    gravarValorArmazenado();
    faixa.remove();
  });
  faixa.appendChild(botaoFechar);

  return faixa;
}

export function iniciarPrimeiraVisita() {
  if (typeof document === 'undefined') return;
  if (!deveMostrarFaixa(lerValorArmazenado())) return;
  document.body.appendChild(criarFaixa());
}

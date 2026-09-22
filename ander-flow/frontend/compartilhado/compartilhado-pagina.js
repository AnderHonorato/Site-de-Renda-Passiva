// compartilhado-pagina.js — inicialização comum de toda página: aplica textos, monta a região
// de avisos, liga o cabeçalho, mostra a faixa de primeira visita e tenta carregar o popup (A8b).

import { aplicarTextos } from './compartilhado-idioma.js';
import { iniciarCabecalho } from './compartilhado-cabecalho.js';
import { iniciarPrimeiraVisita } from './compartilhado-primeira-visita.js';

function criarRegiaoDeAvisos() {
  if (document.querySelector('.avisos-flutuantes')) return;
  const regiao = document.createElement('div');
  regiao.className = 'avisos-flutuantes';
  regiao.setAttribute('aria-live', 'polite');
  document.body.appendChild(regiao);
}

export async function iniciarPagina() {
  if (typeof document === 'undefined') return;
  aplicarTextos(document);
  criarRegiaoDeAvisos();
  iniciarCabecalho();
  iniciarPrimeiraVisita();
  try {
    await import('/estatico/compartilhado/compartilhado-popup.js');
  } catch {
    // A8b ainda não escreveu compartilhado-popup.js (ou a página não quer popup); ignorar.
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
  } else {
    iniciarPagina();
  }
}

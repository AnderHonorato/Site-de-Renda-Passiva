/** A apresentação pública funciona independentemente do carregamento da ferramenta paga. */
import { montarDemonstracao } from './demonstracoes.js';
import { isolarBloco } from './isolar-bloco.js';

for (const alvo of document.querySelectorAll('[data-demonstracao]')) {
  void isolarBloco('demonstracao', () => montarDemonstracao(alvo), { alvo, preservar: true, discreto: true });
}

/** Página inicial, bloco "contagens": quantas prontas há em cada categoria e o número do topo. */
import { ferramentas, ferramentasProntas } from '../../../dados/catálogo.js';
import { categorias } from '../../../dados/categorias.js';
import { contarAté } from '../../núcleo/movimento.js';

export function montar() {
  for (const c of categorias) {
    const alvo = document.querySelector(`[data-contagem="${c.id}"]`);
    if (!alvo) continue;
    const total = ferramentas.filter((f) => f.cat === c.id).length;
    const prontas = ferramentasProntas.filter((f) => f.cat === c.id).length;
    alvo.textContent = `${prontas} de ${total} prontas`;
  }

  // O número do topo conta até o valor real (o HTML já traz o valor final, para quem não tem JavaScript).
  for (const número of document.querySelectorAll('[data-conta]')) {
    const alvo = Number(número.dataset.conta);
    if (Number.isFinite(alvo)) contarAté(número, alvo, { duração: 900 });
  }
}

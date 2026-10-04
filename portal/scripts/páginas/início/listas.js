/** Página inicial, bloco "listas": ferramentas prontas e recentes. */
import { ferramentas, ferramentasProntas, ferramentaPorSlug } from '../../../dados/catálogo.js';
import { desenharLista, ligarLista } from '../../núcleo/lista.js';
import { lerRecentes, limparRecentes } from '../../núcleo/preferências.js';
import { entrarEmCascata } from '../../núcleo/movimento.js';

export function montar() {
  const listaProntas = document.getElementById('lista-prontas');
  const seçãoRecentes = document.getElementById('recentes');
  const listaRecentes = document.getElementById('lista-recentes');
  if (!listaProntas || !seçãoRecentes || !listaRecentes) throw new Error('As listas da página inicial não estão no HTML.');

  function desenharRecentes() {
    const lista = lerRecentes().map((slug) => ferramentaPorSlug[slug]).filter(Boolean).slice(0, 4);
    seçãoRecentes.hidden = lista.length === 0;
    if (lista.length > 0) desenharLista(listaRecentes, lista);
  }

  desenharLista(listaProntas, ferramentasProntas);
  desenharRecentes();
  ligarLista(listaProntas, ferramentas, desenharRecentes);
  ligarLista(listaRecentes, ferramentas, desenharRecentes);

  document.getElementById('limpar-recentes')?.addEventListener('click', () => {
    limparRecentes();
    desenharRecentes();
  });
  entrarEmCascata(listaProntas);
}

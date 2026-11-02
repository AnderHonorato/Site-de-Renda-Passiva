/**
 * Divisória do portal: uma só forma de onda, usada em todo lugar.
 *
 * `faixa()` envolve um bloco de ferramentas (lista, grade) numa faixa de fundo com a onda em cima
 * e em baixo, então a divisória "dá a volta" nas ferramentas em vez de aparecer como uma linha
 * reta numa página e uma curva em outra. O topo do rodapé usa a mesma onda.
 */

const CAMINHO_DE_BAIXO = 'M0,0 C240,28 480,0 720,14 C960,28 1200,4 1440,18 L1440,28 L0,28 Z';
const CAMINHO_DE_CIMA = 'M0,28 C240,0 480,28 720,14 C960,0 1200,24 1440,10 L1440,0 L0,0 Z';

/**
 * @param {boolean} [invertida] false: a cor fica embaixo (abre a faixa); true: a cor fica em cima (fecha a faixa)
 * @param {string} [classe] classe extra, por exemplo "onda--rodapé"
 */
export function onda(invertida = false, classe = '') {
  const caminho = invertida ? CAMINHO_DE_CIMA : CAMINHO_DE_BAIXO;
  return `<div class="onda${classe ? ` ${classe}` : ''}" aria-hidden="true"><svg viewBox="0 0 1440 28" preserveAspectRatio="none"><path d="${caminho}" fill="currentColor"/></svg></div>`;
}

/** Faixa de fundo com a onda em cima e embaixo, em volta de `interior`. */
export function faixa(interior) {
  return `${onda()}
    <div class="faixa-fundo">
      <div class="largura faixa-fundo__interior">
${interior}
      </div>
    </div>
    ${onda(true)}`;
}

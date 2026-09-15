// Mostra, junto aos botões de baixar, um aviso (".aviso") com quantas folhas A4 o molde vai
// ocupar na impressão em tamanho real — sempre visível, antes de qualquer download, para
// quem for imprimir um molde grande não ser surpreendido por dezenas de folhas. Efeito
// colateral sobre o DOM; não é uma função pura.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { criarElementoSvg } from './criar-elemento-svg.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';

// "quantidadeMínima" é o menor número de folhas fisicamente possível para este molde: 1
// para uma peça só, ou o número de peças quando o molde tem várias (cada peça ocupa ao
// menos uma folha própria, como base e tampa, ou cada tira das divisórias). Só a partir daí
// dividir em mais folhas do que isso é motivo de alerta.
export function mostrarAvisoDeFolhas(contêiner, quantidadeDeFolhas, quantidadeMínima = 1) {
  const passaDoMínimo = quantidadeDeFolhas > quantidadeMínima;
  const raiz = obterRaiz();
  const nomeDoÍcone = passaDoMínimo ? 'alerta' : 'informação';
  const texto = passaDoMínimo
    ? `Este molde ocupa ${quantidadeDeFolhas} folhas A4 com sobreposição de montagem, em escala real. Considere papel maior ou reduzir as medidas.`
    : quantidadeMínima === 1
      ? 'Este molde cabe em 1 folha A4, em escala real.'
      : `Este molde cabe em ${quantidadeDeFolhas} folhas A4 (uma por peça), em escala real.`;

  const ícone = criarElementoSvg('svg', { class: 'ícone', 'aria-hidden': 'true', focusable: 'false' }, [
    criarElementoSvg('use', { href: `${raiz}recursos/ícones/ícones.svg#${nomeDoÍcone}` }),
  ]);
  const aviso = criarElemento('div', { classe: `aviso ${passaDoMínimo ? 'aviso-alerta' : 'aviso-informação'}`, atributos: { role: 'status' } }, [
    ícone,
    criarElemento('p', { texto }),
  ]);
  contêiner.replaceChildren(aviso);
  return aviso;
}

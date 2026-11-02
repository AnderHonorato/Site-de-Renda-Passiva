/**
 * Atualização enquanto a pessoa digita, para as ferramentas de texto.
 *
 * Contar, trocar a caixa e tirar acento são instantâneos: esperar o clique em
 * um botão só atrasa. O recálculo vai sem mover o foco (senão o teclado do
 * celular fecharia a cada letra) e espera uma pausa curta na digitação, para
 * um texto grande não travar a página a cada tecla. Com a caixa vazia, o
 * resultado some em vez de acusar erro: apagar tudo não é engano de ninguém.
 */
import { limparErros } from '../../núcleo/interface.js';

const PAUSA_DA_DIGITAÇÃO_EM_MS = 120;

/**
 * @param {HTMLElement} elemento raiz da ferramenta, já montada
 * @param {(opções?: {focar?: boolean}) => Promise<void>} recalcular
 * @param {{campo: string, opções?: string[]}} nomes campo de texto e controles que também recalculam
 */
export function ligarTextoAoVivo(elemento, recalcular, { campo, opções = [] }) {
  const área = elemento.querySelector(`#campo-${campo}`);
  const formulário = elemento.querySelector('form');
  const resultado = elemento.querySelector('#resultado');
  if (!área || !formulário || !resultado) return;

  let espera;
  const atualizar = () => {
    clearTimeout(espera);
    if (!área.value.trim()) {
      limparErros(formulário);
      resultado.hidden = true;
      return;
    }
    recalcular({ focar: false });
  };

  área.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(atualizar, PAUSA_DA_DIGITAÇÃO_EM_MS);
  });
  for (const nome of opções) {
    elemento.querySelector(`#campo-${nome}`)?.addEventListener('change', atualizar);
  }
  // O "Limpar" do formulário não pode ser desfeito por um recálculo atrasado.
  formulário.addEventListener('reset', () => clearTimeout(espera));
}

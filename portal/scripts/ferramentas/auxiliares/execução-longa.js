/**
 * Cerca de uma execução demorada (processar um PDF): barra de progresso, botão
 * "Cancelar", botão principal desligado e lista de arquivos travada enquanto roda.
 */
import { criarProgresso } from '../../núcleo/interface.js';
import { ícone } from '../../núcleo/ícones.js';

/**
 * @param {HTMLElement} elemento raiz da ferramenta, já montada por `montarFerramenta`
 * @param {{escolha?: {travar: (travada: boolean) => void}[] | {travar: (travada: boolean) => void}, aoLimpar?: () => void}} [opções]
 */
export function prepararExecução(elemento, { escolha } = {}) {
  const formulário = elemento.querySelector('#formulário');
  const progresso = criarProgresso(elemento.querySelector('#progresso'));
  const botãoPrincipal = formulário.querySelector('button[type="submit"]');
  const escolhas = [escolha].flat().filter(Boolean);
  let cancelar = false;

  const botãoCancelar = document.createElement('button');
  botãoCancelar.type = 'button';
  botãoCancelar.className = 'botão botão--linha';
  botãoCancelar.hidden = true;
  botãoCancelar.innerHTML = `${ícone('fechar')}Cancelar`;
  botãoCancelar.addEventListener('click', () => { cancelar = true; });
  formulário.querySelector('.ações').append(botãoCancelar);
  formulário.addEventListener('reset', () => { cancelar = true; });

  return {
    progresso,
    cancelado: () => cancelar,
    /**
     * Roda `trabalho` com a tela travada e destrava no fim, com erro ou sem.
     * @template T
     * @param {() => Promise<T>} trabalho
     * @returns {Promise<T>}
     */
    async executar(trabalho) {
      cancelar = false;
      botãoPrincipal.disabled = true;
      botãoCancelar.hidden = false;
      for (const e of escolhas) e.travar(true);
      try {
        return await trabalho();
      } finally {
        botãoPrincipal.disabled = false;
        botãoCancelar.hidden = true;
        for (const e of escolhas) e.travar(false);
      }
    },
  };
}

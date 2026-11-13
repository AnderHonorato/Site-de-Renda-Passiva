/**
 * Cerca de uma execução demorada (processar um PDF): barra de progresso, botão
 * "Cancelar", botão principal desligado e lista de arquivos travada enquanto roda.
 */
import { criarProgresso } from '../../núcleo/interface.js';
import { ícone } from '../../núcleo/ícones.js';

function erroCancelado(erro) {
  const resultado = new Error(erro instanceof Error ? erro.message : 'Operação cancelada.');
  resultado.cancelado = true;
  return resultado;
}

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
        const resultado = await trabalho();
        // A função pode concluir entre duas checagens cooperativas; não transforme
        // um cancelamento tardio em resultado concluído.
        if (cancelar) throw erroCancelado();
        return resultado;
      } catch (erro) {
        // Preserve a mensagem específica do operador (por exemplo, GIF) e passe o
        // estado por propriedade, nunca inferindo cancelamento pelo texto.
        if (cancelar) throw erroCancelado(erro);
        throw erro;
      } finally {
        botãoPrincipal.disabled = false;
        botãoCancelar.hidden = true;
        for (const e of escolhas) e.travar(false);
      }
    },
  };
}

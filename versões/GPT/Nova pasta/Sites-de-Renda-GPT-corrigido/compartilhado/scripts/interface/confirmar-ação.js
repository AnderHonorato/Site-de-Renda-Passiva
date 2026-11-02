// compartilhado/scripts/interface/confirmar-ação.js
import { criarElemento } from './criar-elemento.js';
import { abrirDiálogo } from './abrir-diálogo.js';
import { fecharDiálogo } from './fechar-diálogo.js';

let contador = 0;
function idÚnico(prefixo) {
  contador += 1;
  return `${prefixo}-${Date.now().toString(36)}-${contador}`;
}

/**
 * Substitui `confirm()` por um <dialog> acessível construído na hora.
 * @param {object} opções
 * @param {string} [opções.título]
 * @param {string} [opções.mensagem]
 * @param {string} [opções.confirmar] Rótulo do botão de confirmação.
 * @param {string} [opções.cancelar] Rótulo do botão de cancelamento.
 * @param {boolean} [opções.perigosa] Usa `.botão-perigo` na confirmação.
 * @returns {Promise<boolean>} `true` se a pessoa confirmou.
 */
export function confirmarAção({ título = 'Confirmar ação', mensagem = '', confirmar = 'Confirmar', cancelar = 'Cancelar', perigosa = false } = {}) {
  return new Promise((resolve) => {
    const idTítulo = idÚnico('confirmar-título');

    const botãoFechar = criarElemento('button', {
      classe: 'botão botão-ícone botão-fantasma',
      atributos: { type: 'button', 'aria-label': 'Fechar' },
    });

    const botãoCancelar = criarElemento('button', {
      classe: 'botão botão-secundário',
      texto: cancelar,
      atributos: { type: 'button' },
    });

    const botãoConfirmar = criarElemento('button', {
      classe: perigosa ? 'botão botão-primário botão-perigo' : 'botão botão-primário',
      texto: confirmar,
      atributos: { type: 'button' },
    });

    const diálogo = criarElemento(
      'dialog',
      { classe: 'diálogo', atributos: { 'aria-labelledby': idTítulo } },
      [
        criarElemento('div', { classe: 'diálogo-cabeçalho' }, [
          criarElemento('h2', { classe: 'diálogo-título', texto: título, atributos: { id: idTítulo } }),
          botãoFechar,
        ]),
        mensagem ? criarElemento('div', { classe: 'diálogo-corpo' }, [criarElemento('p', { texto: mensagem })]) : null,
        criarElemento('div', { classe: 'diálogo-ações' }, [botãoCancelar, botãoConfirmar]),
      ].filter(Boolean),
    );

    diálogo.addEventListener(
      'close',
      () => {
        resolve(diálogo.returnValue === 'confirmar');
        diálogo.remove();
      },
      { once: true },
    );

    botãoFechar.addEventListener('click', () => fecharDiálogo(diálogo, 'cancelar'));
    botãoCancelar.addEventListener('click', () => fecharDiálogo(diálogo, 'cancelar'));
    botãoConfirmar.addEventListener('click', () => fecharDiálogo(diálogo, 'confirmar'));

    document.body.append(diálogo);
    abrirDiálogo(diálogo);
  });
}

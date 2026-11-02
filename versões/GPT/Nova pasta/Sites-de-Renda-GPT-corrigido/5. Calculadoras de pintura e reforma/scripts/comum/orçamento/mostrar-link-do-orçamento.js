// Sincronizado de compartilhado/scripts/orçamento/mostrar-link-do-orçamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Quando não é possível compartilhar nem copiar automaticamente, mostra o link numa
// janela com o texto já selecionado, para a pessoa copiar à mão. Resolve ao fechar.
import { abrirDiálogo } from '../interface/abrir-diálogo.js';
import { criarElemento } from '../interface/criar-elemento.js';
import { fecharDiálogo } from '../interface/fechar-diálogo.js';

export function mostrarLinkDoOrçamento(link) {
  return new Promise((resolver) => {
    const campo = criarElemento('textarea', { classe: 'entrada área-de-texto', texto: link, atributos: { id: 'link-do-orçamento-manual', rows: '4', readonly: true } });
    const fechar = criarElemento('button', { classe: 'botão botão-primário', texto: 'Fechar', atributos: { type: 'button' } });
    const diálogo = criarElemento('dialog', { classe: 'diálogo', atributos: { 'aria-labelledby': 'link-do-orçamento-título' } }, [
      criarElemento('div', { classe: 'diálogo-cabeçalho' }, [criarElemento('h2', { classe: 'diálogo-título', texto: 'Copie o link do orçamento', atributos: { id: 'link-do-orçamento-título' } })]),
      criarElemento('div', { classe: 'diálogo-corpo' }, [
        criarElemento('p', { texto: 'Não foi possível copiar automaticamente. O link está selecionado abaixo: copie e envie para o cliente. Quem receber o link poderá ver este orçamento.' }),
        criarElemento('label', { classe: 'visualmente-oculto', texto: 'Link do orçamento', atributos: { for: 'link-do-orçamento-manual' } }),
        campo,
      ]),
      criarElemento('div', { classe: 'diálogo-ações' }, [fechar]),
    ]);
    diálogo.addEventListener(
      'close',
      () => {
        diálogo.remove();
        resolver();
      },
      { once: true },
    );
    fechar.addEventListener('click', () => fecharDiálogo(diálogo));
    document.body.append(diálogo);
    abrirDiálogo(diálogo);
    campo.focus();
    campo.select();
  });
}

// compartilhado-aviso.js — avisos flutuantes de retorno e diálogo de confirmação.

import { t } from './compartilhado-idioma.js';

const DURACAO_PADRAO_MS = 5000;

function obterRegiaoAvisos() {
  let regiao = document.querySelector('.avisos-flutuantes');
  if (!regiao) {
    regiao = document.createElement('div');
    regiao.className = 'avisos-flutuantes';
    regiao.setAttribute('aria-live', 'polite');
    document.body.appendChild(regiao);
  }
  return regiao;
}

/** Mostra `mensagem` na região `.avisos-flutuantes` (criando-a se preciso) e a remove sozinha. */
export function mostrarAviso(mensagem, tipo = 'sucesso') {
  if (typeof document === 'undefined') return;
  const classeTipo = tipo === 'erro' ? 'aviso-flutuante--erro' : 'aviso-flutuante--sucesso';
  const regiao = obterRegiaoAvisos();
  const aviso = document.createElement('div');
  aviso.className = `aviso-flutuante ${classeTipo}`;
  aviso.textContent = mensagem;
  regiao.appendChild(aviso);
  setTimeout(() => aviso.remove(), DURACAO_PADRAO_MS);
  return aviso;
}

/** `<dialog class="modal">` de confirmação; resolve `true`/`false` conforme o botão clicado. */
export function confirmar({ titulo, texto, rotuloConfirmar, perigo = false } = {}) {
  if (typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'modal';

    const elementoTitulo = document.createElement('p');
    elementoTitulo.className = 'modal__titulo';
    elementoTitulo.textContent = titulo ?? t('compartilhado.confirmacao.titulo');
    dialogo.appendChild(elementoTitulo);

    const elementoTexto = document.createElement('p');
    elementoTexto.className = 'modal__texto';
    elementoTexto.textContent = texto ?? t('compartilhado.confirmacao.texto_excluir');
    dialogo.appendChild(elementoTexto);

    const acoes = document.createElement('div');
    acoes.className = 'modal__acoes';

    const botaoCancelar = document.createElement('button');
    botaoCancelar.type = 'button';
    botaoCancelar.className = 'botao botao--secundario';
    botaoCancelar.textContent = t('compartilhado.acoes.cancelar');

    const botaoConfirmar = document.createElement('button');
    botaoConfirmar.type = 'button';
    botaoConfirmar.className = perigo ? 'botao botao--perigo' : 'botao botao--primario';
    botaoConfirmar.textContent = rotuloConfirmar ?? t('compartilhado.acoes.confirmar');

    acoes.appendChild(botaoCancelar);
    acoes.appendChild(botaoConfirmar);
    dialogo.appendChild(acoes);
    document.body.appendChild(dialogo);

    function finalizar(resultado) {
      dialogo.close();
      dialogo.remove();
      resolver(resultado);
    }

    botaoCancelar.addEventListener('click', () => finalizar(false));
    botaoConfirmar.addEventListener('click', () => finalizar(true));
    dialogo.addEventListener('cancel', () => finalizar(false));

    dialogo.showModal();
  });
}

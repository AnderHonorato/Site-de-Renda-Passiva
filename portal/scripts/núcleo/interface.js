/** Peças de interface compartilhadas: aviso flutuante, progresso e erros de campo. */

let tempoDoAviso;

/**
 * Mostra um aviso curto no rodapé. Não interrompe o trabalho e some sozinho.
 * @param {string} mensagem
 * @param {{duração?: number}} [opções]
 */
export function avisar(mensagem, { duração = 3200 } = {}) {
  let caixa = document.getElementById('aviso');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'aviso';
    caixa.className = 'notificação';
    caixa.setAttribute('role', 'status');
    caixa.setAttribute('aria-live', 'polite');
    document.body.append(caixa);
  }
  caixa.textContent = mensagem;
  caixa.dataset.visível = 'sim';
  clearTimeout(tempoDoAviso);
  tempoDoAviso = setTimeout(() => { caixa.dataset.visível = 'não'; }, duração);
}

/**
 * Controla o bloco de progresso de uma operação.
 *
 * Só existe estado de progresso quando há trabalho de verdade: nada de barra
 * falsa para fingir demora. Operações instantâneas usam direto `concluir()`.
 * @param {HTMLElement} elemento contêiner com a classe `progresso`
 */
export function criarProgresso(elemento) {
  const texto = elemento.querySelector('.progresso__texto');
  const barra = elemento.querySelector('.progresso__barra');

  function pintar(rótulo, porcentagem, estado) {
    elemento.hidden = false;
    elemento.dataset.estado = estado;
    if (texto) texto.textContent = rótulo;
    if (barra) {
      barra.style.width = `${Math.max(0, Math.min(100, porcentagem))}%`;
      barra.parentElement?.setAttribute('role', 'progressbar');
      barra.parentElement?.setAttribute('aria-valuenow', String(Math.round(porcentagem)));
    }
  }

  return {
    /** @param {string} rótulo */
    iniciar(rótulo = 'Preparando…') { pintar(rótulo, 5, 'processando'); },
    /** @param {number} porcentagem @param {string} rótulo */
    andar(porcentagem, rótulo = 'Processando…') { pintar(rótulo, porcentagem, 'processando'); },
    /** @param {string} rótulo */
    concluir(rótulo = 'Concluído') {
      pintar(rótulo, 100, 'concluído');
      setTimeout(() => { elemento.hidden = true; }, 1600);
    },
    /** @param {string} rótulo */
    falhar(rótulo = 'Não foi possível concluir') { pintar(rótulo, 100, 'erro'); },
    esconder() { elemento.hidden = true; },
  };
}

/**
 * Mostra o erro de um campo, ligando-o ao input por `aria-describedby`.
 * @param {HTMLElement} campo elemento com a classe `campo`
 * @param {string} mensagem
 */
export function mostrarErro(campo, mensagem) {
  const entrada = campo.querySelector('input, select, textarea');
  let erro = campo.querySelector('.campo__erro');
  if (!erro) {
    erro = document.createElement('p');
    erro.className = 'campo__erro';
    erro.dataset.dinâmico = 'sim';
    campo.append(erro);
  }
  if (entrada && !erro.id) erro.id = `erro-${entrada.id || Math.random().toString(36).slice(2, 8)}`;
  erro.textContent = mensagem;
  erro.hidden = false;
  if (entrada) {
    entrada.setAttribute('aria-invalid', 'true');
    entrada.setAttribute('aria-describedby', erro.id);
  }
}

/**
 * Limpa os erros de um formulário.
 *
 * Mensagens fixas escritas no HTML são apenas esvaziadas e escondidas; só as
 * criadas dinamicamente são removidas do documento. Apagar as fixas quebraria
 * a próxima validação.
 * @param {HTMLFormElement} formulário
 */
export function limparErros(formulário) {
  for (const erro of formulário.querySelectorAll('.campo__erro')) {
    if (erro.dataset.dinâmico === 'sim') { erro.remove(); continue; }
    erro.textContent = '';
    erro.hidden = true;
  }
  for (const entrada of formulário.querySelectorAll('[aria-invalid="true"]')) {
    entrada.removeAttribute('aria-invalid');
    entrada.removeAttribute('aria-describedby');
  }
}

/**
 * Lê os valores de um formulário como objeto simples.
 * @param {HTMLFormElement} formulário
 * @returns {Record<string, string>}
 */
export function lerFormulário(formulário) {
  const dados = {};
  for (const [chave, valor] of new FormData(formulário).entries()) {
    if (typeof valor === 'string') dados[chave] = valor;
  }
  for (const caixa of formulário.querySelectorAll('input[type="checkbox"]')) {
    dados[caixa.name] = caixa.checked ? 'sim' : 'não';
  }
  return dados;
}

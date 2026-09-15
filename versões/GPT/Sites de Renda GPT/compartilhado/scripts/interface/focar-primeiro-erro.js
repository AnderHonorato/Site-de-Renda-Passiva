// compartilhado/scripts/interface/focar-primeiro-erro.js

/**
 * Leva o foco para o primeiro campo inválido de um formulário e garante que
 * ele fique visível — usado depois de uma validação malsucedida.
 * @param {HTMLFormElement} formulário
 * @returns {boolean} `true` se algum campo inválido foi encontrado e focado.
 */
export function focarPrimeiroErro(formulário) {
  if (!formulário) return false;
  const primeiroInválido = formulário.querySelector('[aria-invalid="true"]');
  if (!(primeiroInválido instanceof HTMLElement)) return false;

  primeiroInválido.focus({ preventScroll: true });
  primeiroInválido.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

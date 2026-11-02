// admin-formulario.js — aplica erros de validação do servidor (400 dados_invalidos.campos) em
// formulários da administração. Cada campo marcado no HTML com `data-campo="<nome>"` envolve um
// `.campo__entrada` e um `.campo__erro` (docs/contratos.md §6.2).

let proximoId = 0;

export function limparErrosCampos(form) {
  for (const campo of form.querySelectorAll('[data-campo]')) {
    campo.classList.remove('campo--erro');
    const entrada = campo.querySelector('.campo__entrada');
    if (entrada) {
      entrada.removeAttribute('aria-invalid');
      entrada.removeAttribute('aria-describedby');
    }
    const erro = campo.querySelector('.campo__erro');
    if (erro) erro.textContent = '';
  }
}

/**
 * Marca em `form` os campos presentes em `campos` (mapa `nome -> código`), traduzindo cada
 * código com `traduzir(codigo)`. Devolve `true` se algum campo reconhecido foi marcado.
 */
export function aplicarErrosCampos(form, campos, traduzir) {
  limparErrosCampos(form);
  let algumMarcado = false;
  for (const [nome, codigo] of Object.entries(campos ?? {})) {
    const campo = form.querySelector(`[data-campo="${nome}"]`);
    if (!campo) continue;
    algumMarcado = true;
    campo.classList.add('campo--erro');
    const entrada = campo.querySelector('.campo__entrada');
    const erro = campo.querySelector('.campo__erro');
    if (erro) {
      if (!erro.id) erro.id = `admin-erro-campo-${(proximoId += 1)}`;
      erro.textContent = traduzir(codigo);
    }
    if (entrada) {
      entrada.setAttribute('aria-invalid', 'true');
      if (erro?.id) entrada.setAttribute('aria-describedby', erro.id);
    }
  }
  return algumMarcado;
}

// servidor-erros.js — erro com código, usado por todas as rotas e middlewares.
// A resposta é montada pelo tratador de erros (servidor-tratador-erros.js).

export class ErroComCodigo extends Error {
  constructor(status, codigo, extras = {}) {
    super(codigo);
    this.name = 'ErroComCodigo';
    this.status = status;
    this.codigo = codigo;
    this.extras = extras;
  }
}

/** criarErro(400, 'dados_invalidos', { campos: { email: 'formato_invalido' } }) */
export function criarErro(status, codigo, extras = {}) {
  return new ErroComCodigo(status, codigo, extras);
}

export function ehErroComCodigo(erro) {
  return erro instanceof ErroComCodigo;
}

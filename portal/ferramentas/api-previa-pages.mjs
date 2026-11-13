// Este módulo substitui api.js SOMENTE no pacote de prévia do GitHub Pages.
// O servidor local e a publicação completa continuam usando a API real.
export class ErroApi extends Error {
  constructor(mensagem, status = 503, indisponivel = true) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.indisponivel = indisponivel;
  }
}

export async function api(caminho, { metodo = 'GET' } = {}) {
  if (metodo === 'GET') {
    if (caminho === '/api/autenticacao/sessao') {
      return { usuario: null, chat_habilitado: false, chat_aceito: false };
    }
    if (caminho === '/api/anuncios') return { permitido: false };
  }
  const en = globalThis.document?.documentElement?.lang === 'en';
  throw new ErroApi(en
    ? 'This feature requires the account server, which is unavailable at this address.'
    : 'Esta função precisa do servidor de conta, indisponível neste endereço.');
}

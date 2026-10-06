const prazo = 8000;

export class ErroApi extends Error {
  constructor(mensagem, status = 0, indisponivel = false) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.indisponivel = indisponivel;
  }
}

function csrf() {
  const valor = document.cookie.split('; ').find((parte) => parte.startsWith('__Host-csrf='))?.slice('__Host-csrf='.length)
    || document.cookie.split('; ').find((parte) => parte.startsWith('csrf='))?.slice(5);
  try { return decodeURIComponent(valor || ''); } catch { return ''; }
}

export async function api(caminho, { metodo = 'GET', dados, signal } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), prazo);
  const cancelar = () => controlador.abort();
  signal?.addEventListener('abort', cancelar, { once: true });
  try {
    const headers = { Accept: 'application/json' };
    if (dados !== undefined) headers['Content-Type'] = 'application/json';
    if (metodo !== 'GET' && metodo !== 'HEAD') headers['X-CSRF-Token'] = csrf();
    const resposta = await fetch(caminho, {
      method: metodo, headers, credentials: 'same-origin',
      body: dados === undefined ? undefined : JSON.stringify(dados),
      signal: controlador.signal,
    });
    let corpo;
    try { corpo = await resposta.json(); }
    catch { throw new ErroApi('O serviço não respondeu corretamente.', resposta.status, true); }
    if (!resposta.ok) throw new ErroApi(corpo.mensagem || corpo.erro || 'Não foi possível concluir.', resposta.status,
      [502, 503, 504].includes(resposta.status));
    return corpo;
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi('Serviço indisponível. Tente novamente em instantes.', 0, true);
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener('abort', cancelar);
  }
}

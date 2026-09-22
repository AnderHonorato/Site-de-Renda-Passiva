// servidor-controle.js — rota interna POST /__controle/desligar, usada por scripts-parar.js.
// Só aceita de 127.0.0.1/::1 e só com o token certo. Fica fora do CSRF (o caminho não começa com /api/).
// Ver docs/contratos.md §8.5.

const ENDERECOS_LOCAIS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Regra pura de autorização — testável sem soquete real.
 * @param {{ enderecoRemoto: string, tokenRecebido: string | undefined, tokenEsperado: string }} dados
 * @returns {boolean}
 */
export function autorizadoParaDesligar({ enderecoRemoto, tokenRecebido, tokenEsperado }) {
  if (!ENDERECOS_LOCAIS.has(enderecoRemoto)) return false;
  if (!tokenRecebido || tokenRecebido !== tokenEsperado) return false;
  return true;
}

/**
 * @param {import('express').Express} app
 * @param {{ token: string, desligar: () => void, registrarLog?: Function }} opcoes
 */
export function registrarControle(app, { token, desligar, registrarLog }) {
  app.post('/__controle/desligar', (req, res) => {
    const enderecoRemoto = req.socket?.remoteAddress ?? req.ip ?? '';
    const tokenRecebido = req.get('X-Token-Controle');
    const autorizado = autorizadoParaDesligar({ enderecoRemoto, tokenRecebido, tokenEsperado: token });

    if (!autorizado) {
      registrarLog?.('aviso', 'controle_desligar_negado', {});
      res.status(403).end();
      return;
    }

    registrarLog?.('info', 'controle_desligar_aceito', {});
    res.status(204).end();
    // Encerra depois de a resposta sair, para o cliente (scripts-parar.js) receber o 204.
    setImmediate(() => desligar());
  });
}

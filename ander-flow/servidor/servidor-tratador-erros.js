// servidor-tratador-erros.js — último middleware da cadeia; transforma qualquer erro numa resposta.
// Ver docs/contratos.md §8.2 e §8.3.
import { ehErroComCodigo } from './servidor-erros.js';

/**
 * @param {object} contexto — precisa de `montador` (renderizarErro) e `registrarLog`.
 * @returns {(erro: Error, req: import('express').Request, res: import('express').Response, next: Function) => void}
 */
export function criarTratadorErros(contexto) {
  return function tratadorErros(erro, req, res, next) {
    if (res.headersSent) {
      next(erro);
      return;
    }

    const comCodigo = ehErroComCodigo(erro);
    const status = comCodigo ? erro.status : 500;
    const codigo = comCodigo ? erro.codigo : 'erro_interno';
    const extras = comCodigo ? erro.extras ?? {} : {};

    if (!comCodigo && typeof contexto?.registrarLog === 'function') {
      contexto.registrarLog('erro', 'erro_nao_tratado', {
        mensagem: erro?.message ?? String(erro),
        pilha: erro?.stack,
        caminho: req.originalUrl,
      });
    }

    if (status === 429) {
      const segundos = Number(extras.tentar_de_novo_em_segundos ?? extras.segundos ?? 0);
      res.set('Retry-After', String(Math.max(0, Math.trunc(segundos))));
    }

    const ehApi = req.originalUrl.startsWith('/api/');
    if (ehApi) {
      res.status(status).json({ erro: codigo, ...extras });
      return;
    }

    if (contexto?.montador && typeof contexto.montador.renderizarErro === 'function') {
      // `codigo` da página é o número HTTP (contrato §3.3); o código textual vai separado.
      contexto.montador.renderizarErro(req, res, status, { ...extras, codigo_erro: codigo });
      return;
    }

    // Sem montador disponível (ex.: testes de núcleo) — resposta mínima ainda correta.
    res.status(status).type('text/plain').send(codigo);
  };
}

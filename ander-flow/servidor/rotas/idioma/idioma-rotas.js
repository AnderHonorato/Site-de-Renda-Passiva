// idioma-rotas.js — API de dicionário de idioma para o navegador (docs/contratos.md §4.2, §11).

import { criarErro } from '../../servidor-erros.js';

const REGEX_PAGINA = /^[a-z0-9-]+$/;

export default function registrarRotas(app, contexto) {
  const { idioma, montador } = contexto;

  app.get('/api/idioma/:codigo/:pagina', (req, res, next) => {
    try {
      const { pagina } = req.params;
      if (!REGEX_PAGINA.test(pagina)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { pagina: 'formato_invalido' } }));
      }

      const codigo = idioma.normalizarCodigo(req.params.codigo);
      const textos = idioma.dicionario(codigo, pagina);
      const variaveis = montador.variaveisGlobais(req);

      res.json({ idioma: codigo, textos, variaveis });
    } catch (erro) {
      next(erro);
    }
  });
}

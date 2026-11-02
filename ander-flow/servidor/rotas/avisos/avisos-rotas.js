// avisos-rotas.js — API de avisos do sistema e popup (docs/contratos.md §7, §11).

import { criarErro } from '../../servidor-erros.js';
import { avisoParaApi, criarConsultasAvisos } from './avisos-controle.js';
import { idValido } from './avisos-validacao.js';

export default function registrarRotas(app, contexto) {
  const { banco, idioma, sessao } = contexto;
  const { exigirSessao } = sessao;
  const consultas = criarConsultasAvisos(banco);

  app.get('/api/avisos', (req, res, next) => {
    try {
      const codigo = idioma.idiomaDaRequisicao(req);
      const vigentes = consultas.listarVigentes('sistema', req.usuario);
      const lidos = consultas.conjuntoDeLidos(req.usuario);

      const avisos = vigentes.map((linha) => avisoParaApi(linha, codigo, lidos));
      const naoLidos = avisos.filter((aviso) => !aviso.lido).length;

      res.json({ avisos, nao_lidos: naoLidos });
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/api/avisos/popup', (req, res, next) => {
    try {
      const codigo = idioma.idiomaDaRequisicao(req);
      const [maisRecente] = consultas.listarVigentes('popup', req.usuario);
      if (!maisRecente) return res.json({ aviso: null });

      const lidos = consultas.conjuntoDeLidos(req.usuario);
      res.json({ aviso: avisoParaApi(maisRecente, codigo, lidos) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/avisos/:id/lido', exigirSessao, (req, res, next) => {
    try {
      const id = idValido(req.params.id);
      const aviso = id ? consultas.obterPorId(id) : null;
      if (!aviso) return next(criarErro(404, 'aviso_inexistente'));

      consultas.marcarLido(req.usuario.id, id);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/avisos/marcar-todos', exigirSessao, (req, res, next) => {
    try {
      const vigentes = consultas.listarVigentes('sistema', req.usuario);
      for (const aviso of vigentes) {
        consultas.marcarLido(req.usuario.id, aviso.id);
      }
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });
}

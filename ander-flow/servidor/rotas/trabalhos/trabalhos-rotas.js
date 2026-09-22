// trabalhos-rotas.js — API dos trabalhos salvos do usuário (docs/contratos.md §7, §10.3, §11).

import { criarErro } from '../../servidor-erros.js';
import {
  limiteDeTrabalhos,
  situacaoValida,
  validarEdicaoTrabalho,
  validarNovoTrabalho,
} from './trabalhos-validacao.js';

function paraApi(linha) {
  return {
    id: linha.id,
    ferramenta_slug: linha.ferramenta_slug,
    titulo: linha.titulo,
    situacao: linha.situacao,
    dados: JSON.parse(linha.dados),
    criado_em: linha.criado_em,
    atualizado_em: linha.atualizado_em,
  };
}

export default function registrarRotas(app, contexto) {
  const { banco, configuracao, sessao } = contexto;
  const { exigirSessao } = sessao;

  const buscarTrabalhos = banco.prepare(
    'SELECT * FROM trabalhos WHERE usuario_id = ? ORDER BY atualizado_em DESC',
  );
  const buscarTrabalhosPorSituacao = banco.prepare(
    'SELECT * FROM trabalhos WHERE usuario_id = ? AND situacao = ? ORDER BY atualizado_em DESC',
  );
  const contarTrabalhos = banco.prepare('SELECT COUNT(*) AS total FROM trabalhos WHERE usuario_id = ?');
  const buscarUmTrabalho = banco.prepare('SELECT * FROM trabalhos WHERE id = ?');
  const inserirTrabalho = banco.prepare(`
    INSERT INTO trabalhos (usuario_id, ferramenta_slug, titulo, dados, situacao)
    VALUES (?, ?, ?, ?, ?)
  `);
  const apagarTrabalho = banco.prepare('DELETE FROM trabalhos WHERE id = ?');

  function limiteDoUsuario(usuario) {
    return limiteDeTrabalhos(configuracao.planos, usuario.plano);
  }

  function trabalhoDoDonoOu404(id, usuarioId) {
    const linha = buscarUmTrabalho.get(id);
    if (!linha || linha.usuario_id !== usuarioId) return null;
    return linha;
  }

  app.get('/api/trabalhos', exigirSessao, (req, res, next) => {
    try {
      const { situacao } = req.query;
      if (situacao !== undefined && !situacaoValida(situacao)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { situacao: 'formato_invalido' } }));
      }

      const linhas = situacao
        ? buscarTrabalhosPorSituacao.all(req.usuario.id, situacao)
        : buscarTrabalhos.all(req.usuario.id);

      res.json({ trabalhos: linhas.map(paraApi), limite: limiteDoUsuario(req.usuario) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/trabalhos', exigirSessao, (req, res, next) => {
    try {
      const corpo = req.body ?? {};
      const { campos } = validarNovoTrabalho(corpo);
      if (Object.keys(campos).length) {
        return next(criarErro(400, 'dados_invalidos', { campos }));
      }

      const limite = limiteDoUsuario(req.usuario);
      const { total } = contarTrabalhos.get(req.usuario.id);
      if (total >= limite) {
        return next(criarErro(403, 'limite_do_plano', { limite, plano_necessario: 'plus' }));
      }

      const situacao = corpo.situacao ?? 'em_aberto';
      const info = inserirTrabalho.run(
        req.usuario.id,
        corpo.ferramenta_slug,
        corpo.titulo.trim(),
        JSON.stringify(corpo.dados),
        situacao,
      );

      const linha = buscarUmTrabalho.get(info.lastInsertRowid);
      res.status(201).json({ trabalho: paraApi(linha) });
    } catch (erro) {
      next(erro);
    }
  });

  app.patch('/api/trabalhos/:id', exigirSessao, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const linha = Number.isInteger(id) ? trabalhoDoDonoOu404(id, req.usuario.id) : null;
      if (!linha) return next(criarErro(404, 'trabalho_inexistente'));

      const { mudancas, campos } = validarEdicaoTrabalho(req.body ?? {});
      if (Object.keys(campos).length) {
        return next(criarErro(400, 'dados_invalidos', { campos }));
      }

      if (Object.keys(mudancas).length) {
        const colunas = Object.keys(mudancas).map((coluna) => `${coluna} = ?`).join(', ');
        banco
          .prepare(
            `UPDATE trabalhos SET ${colunas}, atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
          )
          .run(...Object.values(mudancas), id);
      }

      res.json({ trabalho: paraApi(buscarUmTrabalho.get(id)) });
    } catch (erro) {
      next(erro);
    }
  });

  app.delete('/api/trabalhos/:id', exigirSessao, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const linha = Number.isInteger(id) ? trabalhoDoDonoOu404(id, req.usuario.id) : null;
      if (!linha) return next(criarErro(404, 'trabalho_inexistente'));

      apagarTrabalho.run(id);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });
}

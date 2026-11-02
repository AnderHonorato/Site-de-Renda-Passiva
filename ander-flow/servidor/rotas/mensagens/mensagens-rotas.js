// mensagens-rotas.js — API de mensagens do usuário com o admin (docs/contratos.md §7, §11).

import { criarErro } from '../../servidor-erros.js';
import { corpoValido } from './mensagens-validacao.js';

function paraApi(linha) {
  return {
    id: linha.id,
    autor: linha.autor,
    corpo: linha.corpo,
    criado_em: linha.criado_em,
    lida: linha.lida_em !== null,
  };
}

export default function registrarRotas(app, contexto) {
  const { banco, sessao } = contexto;
  const { exigirSessao } = sessao;

  const buscarMensagens = banco.prepare(
    'SELECT * FROM mensagens WHERE usuario_id = ? ORDER BY criado_em ASC',
  );
  const contarNaoLidasDoAdmin = banco.prepare(
    "SELECT COUNT(*) AS total FROM mensagens WHERE usuario_id = ? AND autor = 'admin' AND lida_em IS NULL",
  );
  const inserirMensagem = banco.prepare(`
    INSERT INTO mensagens (usuario_id, autor, corpo) VALUES (?, 'usuario', ?)
  `);
  const buscarUmaMensagem = banco.prepare('SELECT * FROM mensagens WHERE id = ?');
  const marcarLidasDoAdmin = banco.prepare(`
    UPDATE mensagens SET lida_em = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE usuario_id = ? AND autor = 'admin' AND lida_em IS NULL
  `);

  app.get('/api/mensagens', exigirSessao, (req, res, next) => {
    try {
      const mensagens = buscarMensagens.all(req.usuario.id).map(paraApi);
      const naoLidas = contarNaoLidasDoAdmin.get(req.usuario.id).total;
      res.json({ mensagens, nao_lidas: naoLidas });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/mensagens', exigirSessao, (req, res, next) => {
    try {
      const corpo = req.body?.corpo;
      if (!corpoValido(corpo)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { corpo: 'formato_invalido' } }));
      }

      const info = inserirMensagem.run(req.usuario.id, corpo);
      res.status(201).json({ mensagem: paraApi(buscarUmaMensagem.get(info.lastInsertRowid)) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/mensagens/lidas', exigirSessao, (req, res, next) => {
    try {
      marcarLidasDoAdmin.run(req.usuario.id);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });
}

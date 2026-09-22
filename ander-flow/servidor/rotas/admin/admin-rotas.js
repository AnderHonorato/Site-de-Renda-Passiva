// admin-rotas.js — API da administração (docs/contratos.md §11, bloco "Admin").
// Toda rota exige `exigirAdmin` + limite de tráfego do grupo "admin"; toda alteração grava `registros_admin`.

import { criarErro } from '../../servidor-erros.js';
import { resumirChave } from '../../seguranca/seguranca-limite-trafego.js';
import {
  ajustarFerramenta,
  avisoPublicoAdmin,
  colunasAvisoPresentes,
  listarFerramentasAdmin,
  mensagemPublicaAdmin,
  obterFerramentaAdmin,
  registrarAcaoAdmin,
  resumoAdmin,
  usuarioPublicoAdmin,
} from './admin-controle.js';
import {
  buscaValida,
  corpoMensagemValido,
  escaparCoringasLike,
  grupoEChaveValidos,
  idValido,
  paginaValida,
  validarAjusteFerramenta,
  validarAtualizacaoUsuario,
  validarAviso,
} from './admin-validacao.js';

const ITENS_POR_PAGINA = 20;

export default function registrarRotas(app, contexto) {
  const { banco, catalogo, limitador, sessao } = contexto;
  const { exigirAdmin, encerrarTodas } = sessao;

  const limitarAdmin = limitador.middleware('admin', { chave: (req) => String(req.usuario.id) });
  app.use('/api/admin', exigirAdmin, limitarAdmin);

  const lerUsuarioPorId = banco.prepare('SELECT * FROM usuarios WHERE id = ?');
  const lerAvisoPorId = banco.prepare('SELECT * FROM avisos WHERE id = ?');

  function registrar(req, { acao, alvo, detalhes }) {
    registrarAcaoAdmin(banco, { usuarioId: req.usuario.id, acao, alvo, detalhes });
  }

  // --- Resumo ---------------------------------------------------------

  app.get('/api/admin/resumo', (req, res, next) => {
    try {
      res.json(resumoAdmin(banco, { catalogo, limitador }));
    } catch (erro) {
      next(erro);
    }
  });

  // --- Ferramentas -----------------------------------------------------

  app.get('/api/admin/ferramentas', (req, res, next) => {
    try {
      res.json({ ferramentas: listarFerramentasAdmin(banco, catalogo) });
    } catch (erro) {
      next(erro);
    }
  });

  app.patch('/api/admin/ferramentas/:slug', (req, res, next) => {
    try {
      const { slug } = req.params;
      if (!catalogo.obter(slug, { idioma: 'pt-BR' })) {
        return next(criarErro(404, 'ferramenta_inexistente'));
      }

      const { mudancas, campos } = validarAjusteFerramenta(req.body ?? {});
      if (Object.keys(campos).length) return next(criarErro(400, 'dados_invalidos', { campos }));

      if (Object.keys(mudancas).length) {
        ajustarFerramenta(banco, { slug, mudancas, adminId: req.usuario.id });
        catalogo.recarregar();
        registrar(req, { acao: 'ferramenta_ajustada', alvo: slug, detalhes: mudancas });
      }

      res.json({ ferramenta: obterFerramentaAdmin(banco, catalogo, slug) });
    } catch (erro) {
      next(erro);
    }
  });

  // --- Usuários ----------------------------------------------------------

  app.get('/api/admin/usuarios', (req, res, next) => {
    try {
      const pagina = paginaValida(req.query.pagina);
      const busca = buscaValida(req.query.busca) ? req.query.busca.trim() : '';

      let condicao = '';
      let parametros = [];
      if (busca) {
        const termo = `%${escaparCoringasLike(busca)}%`;
        condicao = "WHERE nome LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\'";
        parametros = [termo, termo];
      }

      const total = banco.prepare(`SELECT COUNT(*) AS total FROM usuarios ${condicao}`).get(...parametros).total;
      const linhas = banco
        .prepare(`SELECT * FROM usuarios ${condicao} ORDER BY criado_em DESC LIMIT ? OFFSET ?`)
        .all(...parametros, ITENS_POR_PAGINA, (pagina - 1) * ITENS_POR_PAGINA);

      res.json({ usuarios: linhas.map(usuarioPublicoAdmin), total, pagina });
    } catch (erro) {
      next(erro);
    }
  });

  app.patch('/api/admin/usuarios/:id', (req, res, next) => {
    try {
      const id = idValido(req.params.id);
      const linha = id ? lerUsuarioPorId.get(id) : null;
      if (!linha) return next(criarErro(404, 'usuario_inexistente'));

      const { mudancas, campos } = validarAtualizacaoUsuario(req.body ?? {});
      if (Object.keys(campos).length) return next(criarErro(400, 'dados_invalidos', { campos }));

      const ehSiMesmo = id === req.usuario.id;
      if (ehSiMesmo && mudancas.papel === 'usuario') {
        return next(criarErro(400, 'acao_nao_permitida'));
      }
      if (ehSiMesmo && mudancas.situacao === 'suspenso') {
        return next(criarErro(400, 'acao_nao_permitida'));
      }

      if (Object.keys(mudancas).length) {
        const colunas = Object.keys(mudancas).map((coluna) => `${coluna} = ?`).join(', ');
        banco
          .prepare(`UPDATE usuarios SET ${colunas}, atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
          .run(...Object.values(mudancas), id);

        if (mudancas.situacao === 'suspenso') encerrarTodas(id);
        registrar(req, { acao: 'usuario_atualizado', alvo: id, detalhes: mudancas });
      }

      res.json({ usuario: usuarioPublicoAdmin(lerUsuarioPorId.get(id)) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/admin/usuarios/:id/encerrar-sessoes', (req, res, next) => {
    try {
      const id = idValido(req.params.id);
      if (!id || !lerUsuarioPorId.get(id)) return next(criarErro(404, 'usuario_inexistente'));

      encerrarTodas(id);
      registrar(req, { acao: 'sessoes_encerradas', alvo: id });
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  // --- Avisos --------------------------------------------------------------

  app.get('/api/admin/avisos', (req, res, next) => {
    try {
      const linhas = banco.prepare('SELECT * FROM avisos ORDER BY criado_em DESC').all();
      res.json({ avisos: linhas.map(avisoPublicoAdmin) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/admin/avisos', (req, res, next) => {
    try {
      const { mudancas, campos } = validarAviso(req.body ?? {}, { parcial: false });
      if (Object.keys(campos).length) return next(criarErro(400, 'dados_invalidos', { campos }));

      const colunas = colunasAvisoPresentes(mudancas);
      const listaColunas = ['criado_por', ...colunas].join(', ');
      const listaValores = ['@criado_por', ...colunas.map((coluna) => `@${coluna}`)].join(', ');
      const parametros = { criado_por: req.usuario.id, ...mudancas };

      const resultado = banco
        .prepare(`INSERT INTO avisos (${listaColunas}) VALUES (${listaValores})`)
        .run(parametros);

      registrar(req, {
        acao: 'aviso_criado',
        alvo: resultado.lastInsertRowid,
        detalhes: { tipo: mudancas.tipo, publico: mudancas.publico },
      });

      res.status(201).json({ aviso: avisoPublicoAdmin(lerAvisoPorId.get(resultado.lastInsertRowid)) });
    } catch (erro) {
      next(erro);
    }
  });

  app.patch('/api/admin/avisos/:id', (req, res, next) => {
    try {
      const id = idValido(req.params.id);
      const atual = id ? lerAvisoPorId.get(id) : null;
      if (!atual) return next(criarErro(404, 'aviso_inexistente'));

      const { mudancas, campos } = validarAviso(req.body ?? {}, { parcial: true });
      if (Object.keys(campos).length) return next(criarErro(400, 'dados_invalidos', { campos }));

      const colunas = colunasAvisoPresentes(mudancas);
      if (colunas.length) {
        const listaColunas = colunas.map((coluna) => `${coluna} = @${coluna}`).join(', ');
        banco
          .prepare(`UPDATE avisos SET ${listaColunas}, atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = @id`)
          .run({ ...mudancas, id });
        registrar(req, { acao: 'aviso_atualizado', alvo: id, detalhes: { campos: colunas } });
      }

      res.json({ aviso: avisoPublicoAdmin(lerAvisoPorId.get(id)) });
    } catch (erro) {
      next(erro);
    }
  });

  app.delete('/api/admin/avisos/:id', (req, res, next) => {
    try {
      const id = idValido(req.params.id);
      if (id && lerAvisoPorId.get(id)) {
        banco.prepare('DELETE FROM avisos WHERE id = ?').run(id);
        registrar(req, { acao: 'aviso_excluido', alvo: id });
      }
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  // --- Mensagens -----------------------------------------------------------

  app.get('/api/admin/mensagens', (req, res, next) => {
    try {
      const conversas = banco
        .prepare(
          `SELECT m.usuario_id AS usuario_id, u.nome AS nome, u.email AS email,
                  MAX(m.criado_em) AS ultima_em,
                  SUM(CASE WHEN m.autor = 'usuario' AND m.lida_em IS NULL THEN 1 ELSE 0 END) AS nao_lidas
           FROM mensagens m
           JOIN usuarios u ON u.id = m.usuario_id
           GROUP BY m.usuario_id, u.nome, u.email
           ORDER BY ultima_em DESC`,
        )
        .all();
      res.json({ conversas });
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/api/admin/mensagens/:usuario_id', (req, res, next) => {
    try {
      const usuarioId = idValido(req.params.usuario_id);
      if (!usuarioId || !lerUsuarioPorId.get(usuarioId)) return next(criarErro(404, 'usuario_inexistente'));

      banco
        .prepare(
          "UPDATE mensagens SET lida_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE usuario_id = ? AND autor = 'usuario' AND lida_em IS NULL",
        )
        .run(usuarioId);

      const mensagens = banco
        .prepare('SELECT * FROM mensagens WHERE usuario_id = ? ORDER BY criado_em ASC')
        .all(usuarioId)
        .map(mensagemPublicaAdmin);

      res.json({ mensagens });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/admin/mensagens/:usuario_id', (req, res, next) => {
    try {
      const usuarioId = idValido(req.params.usuario_id);
      if (!usuarioId || !lerUsuarioPorId.get(usuarioId)) return next(criarErro(404, 'usuario_inexistente'));

      const corpo = req.body?.corpo;
      if (!corpoMensagemValido(corpo)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { corpo: 'formato_invalido' } }));
      }

      const resultado = banco
        .prepare("INSERT INTO mensagens (usuario_id, autor, admin_id, corpo) VALUES (?, 'admin', ?, ?)")
        .run(usuarioId, req.usuario.id, corpo.trim());

      registrar(req, { acao: 'mensagem_respondida', alvo: usuarioId });

      const linha = banco.prepare('SELECT * FROM mensagens WHERE id = ?').get(resultado.lastInsertRowid);
      res.status(201).json({ mensagem: mensagemPublicaAdmin(linha) });
    } catch (erro) {
      next(erro);
    }
  });

  // --- Bloqueios de tráfego --------------------------------------------------

  app.get('/api/admin/bloqueios', (req, res, next) => {
    try {
      res.json({ bloqueios: limitador.listarBloqueios() });
    } catch (erro) {
      next(erro);
    }
  });

  app.delete('/api/admin/bloqueios', (req, res, next) => {
    try {
      const { grupo, chave } = req.body ?? {};
      if (!grupoEChaveValidos({ grupo, chave })) {
        return next(criarErro(400, 'dados_invalidos', { campos: { chave: 'formato_invalido' } }));
      }

      limitador.desbloquear(grupo, chave);
      registrar(req, { acao: 'bloqueio_removido', alvo: `${grupo}:${resumirChave(chave)}` });
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });
}

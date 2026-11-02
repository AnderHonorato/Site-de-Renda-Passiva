// conta-rotas.js — API da conta: dados, preferências, senha, exportação e exclusão (LGPD).
import { criarErro } from '../../servidor-erros.js';
import { gerarHashSenha, verificarSenha } from '../../seguranca/seguranca-senha.js';
import { mesAtual, senhaValida, validarPreferencias } from './conta-validacao.js';

function limiteDoPlano(planos, plano, chave) {
  const encontrado = planos?.planos?.find((item) => item.id === plano);
  return encontrado?.limites?.[chave] ?? 0;
}

export default function registrarRotas(app, contexto) {
  const { banco, configuracao, sessao } = contexto;
  const { exigirSessao, encerrarTodas, encerrarSessao } = sessao;

  const contarFavoritos = banco.prepare('SELECT COUNT(*) AS total FROM favoritos WHERE usuario_id = ?');
  const contarTrabalhos = banco.prepare('SELECT COUNT(*) AS total FROM trabalhos WHERE usuario_id = ?');
  const lerUsuario = banco.prepare('SELECT * FROM usuarios WHERE id = ?');
  const apagarUsuario = banco.prepare('DELETE FROM usuarios WHERE id = ?');

  function usuarioPublico(linha) {
    return {
      id: linha.id,
      nome: linha.nome,
      email: linha.email,
      plano: linha.plano,
      papel: linha.papel,
      idioma: linha.idioma,
      tema: linha.tema,
      criado_em: linha.criado_em,
    };
  }

  function limites(plano) {
    return {
      favoritos: limiteDoPlano(configuracao.planos, plano, 'favoritos'),
      trabalhos: limiteDoPlano(configuracao.planos, plano, 'trabalhos'),
      lote_arquivos: limiteDoPlano(configuracao.planos, plano, 'lote_arquivos'),
    };
  }

  app.get('/api/conta', exigirSessao, (req, res, next) => {
    try {
      const linha = lerUsuario.get(req.usuario.id);
      if (!linha) return next(criarErro(404, 'nao_encontrado'));
      res.json({
        usuario: usuarioPublico(linha),
        uso: {
          favoritos: contarFavoritos.get(req.usuario.id).total,
          trabalhos: contarTrabalhos.get(req.usuario.id).total,
        },
        limites: limites(linha.plano),
      });
    } catch (erro) {
      next(erro);
    }
  });

  app.patch('/api/conta', exigirSessao, (req, res, next) => {
    try {
      const { mudancas, campos } = validarPreferencias(req.body ?? {});
      if (Object.keys(campos).length) return next(criarErro(400, 'dados_invalidos', { campos }));
      if (!Object.keys(mudancas).length) {
        return res.json({ usuario: usuarioPublico(lerUsuario.get(req.usuario.id)) });
      }

      const colunas = Object.keys(mudancas).map((coluna) => `${coluna} = ?`).join(', ');
      banco
        .prepare(`UPDATE usuarios SET ${colunas}, atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
        .run(...Object.values(mudancas), req.usuario.id);

      res.json({ usuario: usuarioPublico(lerUsuario.get(req.usuario.id)) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/conta/senha', exigirSessao, async (req, res, next) => {
    try {
      const atual = req.body?.senha_atual;
      const nova = req.body?.senha_nova;
      if (typeof atual !== 'string' || !senhaValida(nova)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { senha_nova: 'senha_fraca' } }));
      }

      const linha = lerUsuario.get(req.usuario.id);
      if (!(await verificarSenha(atual, linha.senha_hash))) {
        return next(criarErro(400, 'senha_atual_incorreta'));
      }

      const hash = await gerarHashSenha(nova);
      banco
        .prepare("UPDATE usuarios SET senha_hash = ?, atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
        .run(hash, req.usuario.id);
      encerrarTodas(req.usuario.id, { excetoAtual: req });

      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/api/conta/exportar', exigirSessao, (req, res, next) => {
    try {
      const id = req.usuario.id;
      const linha = lerUsuario.get(id);
      const dados = {
        gerado_em: new Date().toISOString(),
        usuario: usuarioPublico(linha),
        favoritos: banco.prepare('SELECT ferramenta_slug, criado_em FROM favoritos WHERE usuario_id = ?').all(id),
        trabalhos: banco
          .prepare('SELECT ferramenta_slug, titulo, dados, situacao, criado_em, atualizado_em FROM trabalhos WHERE usuario_id = ?')
          .all(id),
        mensagens: banco.prepare('SELECT autor, corpo, criado_em, lida_em FROM mensagens WHERE usuario_id = ?').all(id),
        avisos_lidos: banco.prepare('SELECT aviso_id, lido_em FROM avisos_lidos WHERE usuario_id = ?').all(id),
        uso: banco
          .prepare('SELECT ferramenta_slug, mes, tipo, contagem FROM usos_usuarios WHERE usuario_id = ?')
          .all(id),
      };

      res.setHeader('Content-Disposition', 'attachment; filename="ander-flow-meus-dados.json"');
      res.json(dados);
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/conta/excluir', exigirSessao, async (req, res, next) => {
    try {
      const senha = req.body?.senha;
      const linha = lerUsuario.get(req.usuario.id);
      if (typeof senha !== 'string' || !(await verificarSenha(senha, linha.senha_hash))) {
        return next(criarErro(400, 'senha_atual_incorreta'));
      }

      // As demais tabelas caem por ON DELETE CASCADE (migração 001).
      const usuarioId = req.usuario.id;
      apagarUsuario.run(usuarioId);
      encerrarSessao(req, res); // zera req.usuario, por isso o id foi guardado antes
      contexto.registrarLog?.('info', 'conta_excluida', { usuario_id: usuarioId });
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/api/conta/uso-mensal', exigirSessao, (req, res, next) => {
    try {
      const mes = mesAtual();
      const linhas = banco
        .prepare('SELECT ferramenta_slug, tipo, contagem FROM usos_usuarios WHERE usuario_id = ? AND mes = ?')
        .all(req.usuario.id, mes);

      const documentos = linhas
        .filter((linha) => linha.tipo === 'documento')
        .reduce((soma, linha) => soma + linha.contagem, 0);
      const ferramentasUsadas = new Set(linhas.map((linha) => linha.ferramenta_slug)).size;

      res.json({ mes, documentos, ferramentas_usadas: ferramentasUsadas });
    } catch (erro) {
      next(erro);
    }
  });
}

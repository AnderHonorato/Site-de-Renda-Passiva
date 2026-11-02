// favoritos-rotas.js — API de favoritos do usuário (docs/contratos.md §7, §10.3, §11).

import { criarErro } from '../../servidor-erros.js';
import { limiteDeFavoritos, listaDeSlugsValida, slugValido } from './favoritos-validacao.js';

export default function registrarRotas(app, contexto) {
  const { banco, catalogo, configuracao, sessao } = contexto;
  const { exigirSessao } = sessao;

  const buscarFavoritos = banco.prepare(
    'SELECT ferramenta_slug AS slug, criado_em FROM favoritos WHERE usuario_id = ? ORDER BY criado_em DESC',
  );
  const contarFavoritos = banco.prepare('SELECT COUNT(*) AS total FROM favoritos WHERE usuario_id = ?');
  const buscarUmFavorito = banco.prepare(
    'SELECT 1 FROM favoritos WHERE usuario_id = ? AND ferramenta_slug = ?',
  );
  const inserirFavorito = banco.prepare(
    'INSERT OR IGNORE INTO favoritos (usuario_id, ferramenta_slug) VALUES (?, ?)',
  );
  const apagarFavorito = banco.prepare(
    'DELETE FROM favoritos WHERE usuario_id = ? AND ferramenta_slug = ?',
  );

  function limiteDoUsuario(usuario) {
    return limiteDeFavoritos(configuracao.planos, usuario.plano);
  }

  app.get('/api/favoritos', exigirSessao, (req, res, next) => {
    try {
      const favoritos = buscarFavoritos.all(req.usuario.id);
      res.json({ favoritos, limite: limiteDoUsuario(req.usuario) });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/favoritos', exigirSessao, (req, res, next) => {
    try {
      const slug = req.body?.slug;
      if (!slugValido(slug)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { slug: 'formato_invalido' } }));
      }
      if (!catalogo.obter(slug, { idioma: 'pt-BR' })) {
        return next(criarErro(404, 'ferramenta_inexistente'));
      }

      const jaFavoritado = Boolean(buscarUmFavorito.get(req.usuario.id, slug));
      if (!jaFavoritado) {
        const { total } = contarFavoritos.get(req.usuario.id);
        const limite = limiteDoUsuario(req.usuario);
        if (total >= limite) {
          return next(criarErro(403, 'limite_do_plano', { limite, plano_necessario: 'plus' }));
        }
        inserirFavorito.run(req.usuario.id, slug);
      }

      const linha = buscarFavoritos.all(req.usuario.id).find((item) => item.slug === slug);
      res.status(201).json({ favorito: linha ?? { slug, criado_em: new Date().toISOString() } });
    } catch (erro) {
      next(erro);
    }
  });

  app.delete('/api/favoritos/:slug', exigirSessao, (req, res, next) => {
    try {
      apagarFavorito.run(req.usuario.id, req.params.slug);
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/favoritos/juntar', exigirSessao, (req, res, next) => {
    try {
      const slugs = req.body?.slugs;
      if (!listaDeSlugsValida(slugs)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { slugs: 'formato_invalido' } }));
      }

      const limite = limiteDoUsuario(req.usuario);
      let { total } = contarFavoritos.get(req.usuario.id);
      const ignorados = [];
      const jaProcessados = new Set();

      for (const slug of slugs) {
        if (jaProcessados.has(slug)) continue;
        jaProcessados.add(slug);

        if (!slugValido(slug)) {
          ignorados.push(slug);
          continue;
        }
        if (buscarUmFavorito.get(req.usuario.id, slug)) {
          continue; // já favoritado — idempotente, não conta como ignorado.
        }
        if (!catalogo.obter(slug, { idioma: 'pt-BR' })) {
          ignorados.push(slug);
          continue;
        }
        if (total >= limite) {
          ignorados.push(slug);
          continue;
        }
        inserirFavorito.run(req.usuario.id, slug);
        total += 1;
      }

      res.json({ favoritos: buscarFavoritos.all(req.usuario.id), ignorados });
    } catch (erro) {
      next(erro);
    }
  });
}

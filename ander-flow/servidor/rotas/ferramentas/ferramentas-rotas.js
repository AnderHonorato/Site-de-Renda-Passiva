// ferramentas-rotas.js — API do catálogo de ferramentas e arquivos /plus (docs/contratos.md §11).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarErro } from '../../servidor-erros.js';
import { recursoValido, slugValido, tipoUsoValido } from './ferramentas-validacao.js';

function lerManifesto(raiz, slug) {
  const caminho = join(raiz, 'frontend', 'ferramentas', slug, `${slug}-manifesto.json`);
  if (!existsSync(caminho)) return null;
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch {
    return null;
  }
}

export default function registrarRotas(app, contexto) {
  const { catalogo, idioma, banco, configuracao, registrarLog } = contexto;
  const raiz = configuracao?.raiz;

  app.get('/api/ferramentas', (req, res, next) => {
    try {
      const codigo = idioma.idiomaDaRequisicao(req);
      const ferramentas = catalogo.listar({ idioma: codigo });
      const categorias = catalogo.categorias({ idioma: codigo });
      const contagens = catalogo.contagens();
      res.json({ ferramentas, categorias, contagens });
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/api/ferramentas/:slug', (req, res, next) => {
    try {
      if (!slugValido(req.params.slug)) return next(criarErro(404, 'ferramenta_inexistente'));
      const codigo = idioma.idiomaDaRequisicao(req);
      const ferramenta = catalogo.obter(req.params.slug, { idioma: codigo });
      if (!ferramenta) return next(criarErro(404, 'ferramenta_inexistente'));
      res.json({ ferramenta });
    } catch (erro) {
      next(erro);
    }
  });

  app.post('/api/ferramentas/:slug/uso', (req, res, next) => {
    try {
      const { slug } = req.params;
      if (!slugValido(slug)) return next(criarErro(404, 'ferramenta_inexistente'));

      const tipo = req.body?.tipo;
      if (!tipoUsoValido(tipo)) {
        return next(criarErro(400, 'dados_invalidos', { campos: { tipo: 'formato_invalido' } }));
      }

      const ferramenta = catalogo.obter(slug, { idioma: 'pt-BR' });
      if (!ferramenta) return next(criarErro(404, 'ferramenta_inexistente'));

      const agora = new Date().toISOString();
      const dia = agora.slice(0, 10);

      banco
        .prepare(
          `INSERT INTO usos_ferramentas (ferramenta_slug, dia, tipo, contagem)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(ferramenta_slug, dia, tipo) DO UPDATE SET contagem = contagem + 1`,
        )
        .run(slug, dia, tipo);

      if (req.usuario) {
        const mes = dia.slice(0, 7);
        banco
          .prepare(
            `INSERT INTO usos_usuarios (usuario_id, ferramenta_slug, mes, tipo, contagem)
             VALUES (?, ?, ?, ?, 1)
             ON CONFLICT(usuario_id, ferramenta_slug, mes, tipo) DO UPDATE SET contagem = contagem + 1`,
          )
          .run(req.usuario.id, slug, mes, tipo);
      }

      registrarLog?.('info', 'ferramenta_uso', { ferramenta_slug: slug, tipo });
      res.status(204).end();
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/plus/:slug/:recurso', (req, res, next) => {
    try {
      const { slug, recurso } = req.params;
      if (!slugValido(slug) || !recursoValido(recurso)) {
        return next(criarErro(404, 'nao_encontrado'));
      }
      if (!req.usuario) return next(criarErro(401, 'sessao_necessaria'));
      if (req.usuario.plano !== 'plus') return next(criarErro(403, 'plano_insuficiente'));

      const manifesto = lerManifesto(raiz, slug);
      const recursosPlus = Array.isArray(manifesto?.recursos_plus) ? manifesto.recursos_plus : [];
      if (!manifesto || !recursosPlus.includes(recurso)) {
        return next(criarErro(404, 'nao_encontrado'));
      }

      const caminhoArquivo = join(raiz, 'frontend', 'ferramentas', slug, `${slug}-plus-${recurso}.js`);
      if (!existsSync(caminhoArquivo)) return next(criarErro(404, 'nao_encontrado'));

      res.set('Content-Type', 'text/javascript; charset=utf-8');
      res.send(readFileSync(caminhoArquivo, 'utf8'));
    } catch (erro) {
      next(erro);
    }
  });
}

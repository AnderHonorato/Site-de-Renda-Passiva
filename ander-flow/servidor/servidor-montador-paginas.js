// servidor-montador-paginas.js — descoberta de páginas, inclusões, tradução no servidor e
// acesso (docs/contratos.md §3, §8.8). Substituição em texto, sem biblioteca de parser de HTML.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarErro } from './servidor-erros.js';
import { obterPorCaminho, substituirVariaveisTexto } from './servidor-idioma.js';

const LIMITE_NIVEIS_INCLUSAO = 3;

const REGEX_INCLUSAO = /<!--\s*incluir:\s*([a-zA-Z0-9-]+)\s*-->/g;
const REGEX_TAG_ABERTURA = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/g;
const REGEX_CONTEUDO_VAZIO =
  /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*"[^"]*")?)*)\s*>\s*<\/\1\s*>/g;
const REGEX_CHAVE_DUPLA = /\{\{([a-zA-Z0-9_]+)\}\}/g;

const MAPA_ATRIBUTOS_TEXTO = {
  placeholder: 'placeholder',
  'aria-label': 'aria-label',
  title: 'title',
  alt: 'alt',
  content: 'content',
  value: 'value',
};

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Converte **trecho** em <strong>trecho</strong>; substitui variáveis e escapa todo o resto. */
function traduzirParaConteudo(valorBruto, variaveis) {
  const partes = [];
  const regexNegrito = /\*\*([^*]+)\*\*/g;
  let ultimo = 0;
  let correspondencia;
  while ((correspondencia = regexNegrito.exec(valorBruto))) {
    partes.push({ texto: valorBruto.slice(ultimo, correspondencia.index), negrito: false });
    partes.push({ texto: correspondencia[1], negrito: true });
    ultimo = correspondencia.index + correspondencia[0].length;
  }
  partes.push({ texto: valorBruto.slice(ultimo), negrito: false });

  return partes
    .map((parte) => {
      const substituido = substituirVariaveisTexto(parte.texto, variaveis);
      const escapado = escaparHtml(substituido);
      return parte.negrito ? `<strong>${escapado}</strong>` : escapado;
    })
    .join('');
}

/** Substitui variáveis e escapa; sem negrito (não é permitido em atributos). */
function traduzirParaAtributo(valorBruto, variaveis) {
  return escaparHtml(substituirVariaveisTexto(valorBruto, variaveis));
}

function definirAtributo(attrsTexto, nomeAtributo, valor) {
  const regexExistente = new RegExp(`(\\s${nomeAtributo}\\s*=\\s*")([^"]*)(")`);
  if (regexExistente.test(attrsTexto)) {
    return attrsTexto.replace(regexExistente, (_m, inicio, _antigo, fim) => `${inicio}${valor}${fim}`);
  }
  return `${attrsTexto} ${nomeAtributo}="${valor}"`;
}

function analisarAtributos(textoAtributos) {
  const mapa = new Map();
  const regex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let correspondencia;
  while ((correspondencia = regex.exec(textoAtributos || ''))) {
    mapa.set(correspondencia[1], correspondencia[2]);
  }
  return mapa;
}

function criarResolvedor({ dicionario, variaveis, ambiente }) {
  function resolverChave(chaveModelo) {
    const chave = substituirVariaveisTexto(chaveModelo, variaveis);
    const valor = obterPorCaminho(dicionario, chave);
    if (typeof valor !== 'string') {
      if (ambiente === 'desenvolvimento') {
        // eslint-disable-next-line no-console
        console.warn(`[af-montador] chave de idioma ausente: ${chave}`);
      }
      return chave;
    }
    return valor;
  }
  return {
    conteudo(chaveModelo) {
      return traduzirParaConteudo(resolverChave(chaveModelo), variaveis);
    },
    atributo(chaveModelo) {
      return traduzirParaAtributo(resolverChave(chaveModelo), variaveis);
    },
  };
}

function aplicarAtributosTraduzidos(html, resolvedor) {
  return html.replace(REGEX_TAG_ABERTURA, (tagCompleta, nomeTag, attrsTexto, autoFecho) => {
    let novoAttrsTexto = attrsTexto;
    let alterou = false;
    for (const sufixo of Object.keys(MAPA_ATRIBUTOS_TEXTO)) {
      const regexBusca = new RegExp(`data-texto-${sufixo}="([^"]*)"`);
      const encontrado = regexBusca.exec(novoAttrsTexto);
      if (!encontrado) continue;
      alterou = true;
      const valorTraduzido = resolvedor.atributo(encontrado[1]);
      novoAttrsTexto = definirAtributo(novoAttrsTexto, MAPA_ATRIBUTOS_TEXTO[sufixo], valorTraduzido);
    }
    if (!alterou) return tagCompleta;
    return `<${nomeTag}${novoAttrsTexto}${autoFecho}>`;
  });
}

function aplicarConteudoTraduzido(html, resolvedor) {
  return html.replace(REGEX_CONTEUDO_VAZIO, (matchCompleto, nomeTag, attrsTexto) => {
    const encontrado = /(?:^|\s)data-texto="([^"]*)"/.exec(attrsTexto);
    if (!encontrado) return matchCompleto;
    const conteudo = resolvedor.conteudo(encontrado[1]);
    return `<${nomeTag}${attrsTexto}>${conteudo}</${nomeTag}>`;
  });
}

function substituirChavesDuplas(html, variaveis) {
  return html.replace(REGEX_CHAVE_DUPLA, (correspondencia, nome) => {
    if (variaveis && Object.prototype.hasOwnProperty.call(variaveis, nome)) {
      return escaparHtml(variaveis[nome]);
    }
    return correspondencia;
  });
}

function aplicarTraducoes(html, dicionario, variaveis, ambiente) {
  const resolvedor = criarResolvedor({ dicionario, variaveis, ambiente });
  let resultado = aplicarAtributosTraduzidos(html, resolvedor);
  resultado = aplicarConteudoTraduzido(resultado, resolvedor);
  resultado = substituirChavesDuplas(resultado, variaveis);
  return resultado;
}

function jsonSeguro(objeto) {
  return JSON.stringify(objeto ?? {}).replace(/</g, '\\u003c');
}

function injetarBlocosJson(html, dicionario, variaveisGlobaisObjeto) {
  const blocos =
    `<script type="application/json" id="af-textos">${jsonSeguro(dicionario)}</script>\n` +
    `<script type="application/json" id="af-variaveis">${jsonSeguro(variaveisGlobaisObjeto)}</script>\n`;
  if (html.includes('</head>')) return html.replace('</head>', `${blocos}</head>`);
  return html + blocos;
}

function reescreverTagHtml(html, atributos) {
  return html.replace(/<html([^>]*)>/i, (_m, attrsExistentes) => {
    const mapa = analisarAtributos(attrsExistentes);
    for (const [chave, valor] of Object.entries(atributos)) {
      mapa.set(chave, valor ?? '');
    }
    const partes = [...mapa.entries()].map(([chave, valor]) => `${chave}="${escaparHtml(valor)}"`);
    return `<html ${partes.join(' ')}>`;
  });
}

function formatarMoedaServidor(valor, idiomaCodigo) {
  const locale = idiomaCodigo === 'en' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

function extrairMeta(html, nomeMeta) {
  const regex = new RegExp(`<meta\\s+name="${nomeMeta}"\\s+content="([^"]*)"`, 'i');
  const correspondencia = regex.exec(html);
  return correspondencia ? correspondencia[1] : null;
}

export function criarMontador({ raiz, idioma, catalogo, configuracao }) {
  function montarHtml(caminhoArquivo, pastaAtual, nivel) {
    if (nivel > LIMITE_NIVEIS_INCLUSAO) {
      throw new Error(`Inclusão excede ${LIMITE_NIVEIS_INCLUSAO} níveis a partir de ${caminhoArquivo}`);
    }
    if (!existsSync(caminhoArquivo)) {
      throw new Error(`Arquivo não encontrado para montagem: ${caminhoArquivo}`);
    }
    const html = readFileSync(caminhoArquivo, 'utf8');
    return html.replace(REGEX_INCLUSAO, (_match, nome) => {
      const pastaInclusao = nome.startsWith('compartilhado-') ? join(raiz, 'frontend', 'compartilhado') : pastaAtual;
      const caminhoInclusao = join(pastaInclusao, `${nome}.html`);
      return montarHtml(caminhoInclusao, pastaAtual, nivel + 1);
    });
  }

  function variaveisGlobais(req) {
    const contagens = catalogo.contagens();
    const planos = configuracao?.planos?.planos ?? [];
    const planoGratis = planos.find((plano) => plano.id === 'gratis');
    const planoPlus = planos.find((plano) => plano.id === 'plus');
    const idiomaCodigo = idioma.idiomaDaRequisicao(req);
    const usuario = req?.usuario ?? null;

    return {
      ferramentas_total: contagens.total,
      ferramentas_prontas: contagens.prontas,
      ferramentas_planejadas: contagens.planejadas,
      ferramentas_plus: contagens.plus,
      ano: new Date().getFullYear(),
      usuario_nome: usuario?.nome ?? '',
      usuario_inicial: usuario?.nome ? usuario.nome.trim().charAt(0).toUpperCase() : '',
      usuario_plano: usuario?.plano ?? '',
      preco_plus_mensal: formatarMoedaServidor(planoPlus?.preco_mensal, idiomaCodigo),
      preco_plus_anual: formatarMoedaServidor(planoPlus?.preco_anual, idiomaCodigo),
      limite_lote_gratis: planoGratis?.limites?.lote_arquivos ?? 0,
      limite_lote_plus: planoPlus?.limites?.lote_arquivos ?? 0,
      limite_favoritos_gratis: planoGratis?.limites?.favoritos ?? 0,
      limite_trabalhos_gratis: planoGratis?.limites?.trabalhos ?? 0,
    };
  }

  function atributosHtml(req, idiomaCodigo, nomeOuSlug) {
    const usuario = req?.usuario ?? null;
    return {
      lang: idiomaCodigo,
      'data-idioma': idiomaCodigo,
      'data-pagina': nomeOuSlug,
      'data-sessao': usuario ? 'ativa' : 'anonima',
      'data-plano': usuario ? usuario.plano ?? '' : '',
      'data-papel': usuario ? usuario.papel ?? '' : '',
      'data-ambiente': configuracao?.ambiente ?? 'desenvolvimento',
    };
  }

  function pastaDoNome(nome) {
    const pastaPagina = join(raiz, 'frontend', 'paginas', nome);
    if (existsSync(pastaPagina)) return pastaPagina;
    return join(raiz, 'frontend', 'ferramentas', nome);
  }

  function renderizarComHtmlBase(req, res, nome, variaveisExtra, htmlBase, statusCode) {
    const pastaAtual = pastaDoNome(nome);
    let html = htmlBase ?? montarHtml(join(pastaAtual, `${nome}.html`), pastaAtual, 0);

    const idiomaCodigo = idioma.idiomaDaRequisicao(req);
    const dicionario = idioma.dicionario(idiomaCodigo, nome);
    const globais = variaveisGlobais(req);
    const variaveisFinal = { ...globais, ...variaveisExtra };
    const ambiente = configuracao?.ambiente;

    html = aplicarTraducoes(html, dicionario, variaveisFinal, ambiente);
    html = reescreverTagHtml(html, atributosHtml(req, idiomaCodigo, nome));
    // Vão as variáveis finais, não só as globais: o navegador reaplica `data-texto` e precisa
    // resolver chaves com variável, como `erro.{codigo}.titulo`, sem apagar o texto do servidor.
    html = injetarBlocosJson(html, dicionario, variaveisFinal);

    res
      .status(statusCode)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(html);
  }

  function renderizar(req, res, nome, variaveis = {}) {
    renderizarComHtmlBase(req, res, nome, variaveis, null, 200);
  }

  function renderizarErro(req, res, status, variaveis = {}) {
    const nome = 'erro';
    const pastaAtual = join(raiz, 'frontend', 'paginas', nome);
    const arquivoPrincipal = join(pastaAtual, `${nome}.html`);
    const html = montarHtml(arquivoPrincipal, pastaAtual, 0);
    renderizarComHtmlBase(req, res, nome, { codigo: status, ...variaveis }, html, status);
  }

  function paginas() {
    const pastaPaginas = join(raiz, 'frontend', 'paginas');
    if (!existsSync(pastaPaginas)) return [];
    const nomes = readdirSync(pastaPaginas, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name);

    const resultado = [];
    for (const nome of nomes) {
      const caminho = join(pastaPaginas, nome, `${nome}.html`);
      if (!existsSync(caminho)) continue;
      const html = readFileSync(caminho, 'utf8');
      const rota = extrairMeta(html, 'af-rota');
      if (!rota) continue;
      const acesso = extrairMeta(html, 'af-acesso') || 'publico';
      resultado.push({ nome, rota, acesso });
    }
    return resultado;
  }

  function criarMiddlewareAcesso(acesso) {
    return function middlewareAcesso(req, res, next) {
      if (acesso === 'sessao' && !req.usuario) {
        return res.redirect(302, `/entrar?volta=${encodeURIComponent(req.originalUrl)}`);
      }
      if (acesso === 'admin' && req.usuario?.papel !== 'admin') {
        return renderizarErro(req, res, 403);
      }
      if (acesso === 'dev' && configuracao?.ambiente !== 'desenvolvimento') {
        return renderizarErro(req, res, 404);
      }
      return next();
    };
  }

  function registrar(app, _contexto) {
    for (const { nome, rota, acesso } of paginas()) {
      app.get(rota, criarMiddlewareAcesso(acesso), (req, res, next) => {
        try {
          renderizar(req, res, nome);
        } catch (erro) {
          next(erro);
        }
      });
    }

    app.get('/ferramentas/:slug', (req, res, next) => {
      try {
        const idiomaCodigo = idioma.idiomaDaRequisicao(req);
        const ferramenta = catalogo.obter(req.params.slug, { idioma: idiomaCodigo });
        if (!ferramenta || ferramenta.estado !== 'pronta' || !ferramenta.ativa) {
          return next(criarErro(404, 'nao_encontrado'));
        }
        renderizar(req, res, req.params.slug);
      } catch (erro) {
        next(erro);
      }
    });
  }

  return { paginas, registrar, renderizar, renderizarErro, variaveisGlobais };
}

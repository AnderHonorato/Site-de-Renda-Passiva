// servidor-catalogo.js — catálogo de ferramentas a partir dos manifestos (docs/contratos.md §8.6).
// Lê frontend/ferramentas/*/*-manifesto.json + ferramentas-categorias.json e cruza com a
// tabela ferramentas_ajustes (lida a cada chamada, para refletir ajustes do admin de imediato).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function lerJson(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

function lerJsonSeguro(caminho) {
  if (!existsSync(caminho)) return null;
  try {
    return lerJson(caminho);
  } catch {
    return null;
  }
}

function validarManifesto(dados, slug) {
  const arquivo = `${slug}-manifesto.json`;
  if (!dados || typeof dados !== 'object') throw new Error(`Manifesto inválido: ${arquivo}`);
  if (dados.slug !== slug) throw new Error(`Manifesto inválido: ${arquivo} (slug não corresponde à pasta)`);
  if (dados.estado !== 'pronta' && dados.estado !== 'planejada') {
    throw new Error(`Manifesto inválido: ${arquivo} (estado deve ser "pronta" ou "planejada")`);
  }
  if (typeof dados.categoria !== 'string' || dados.categoria === '') {
    throw new Error(`Manifesto inválido: ${arquivo} (categoria ausente)`);
  }
  if (dados.plano !== 'gratis' && dados.plano !== 'plus') {
    throw new Error(`Manifesto inválido: ${arquivo} (plano deve ser "gratis" ou "plus")`);
  }
  if (!dados.nome || typeof dados.nome['pt-BR'] !== 'string') {
    throw new Error(`Manifesto inválido: ${arquivo} (nome.pt-BR ausente)`);
  }
}

function carregarManifestos(raiz) {
  const pastaFerramentas = join(raiz, 'frontend', 'ferramentas');
  if (!existsSync(pastaFerramentas)) return [];
  const nomes = readdirSync(pastaFerramentas, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name);

  const manifestos = [];
  for (const slug of nomes) {
    const caminho = join(pastaFerramentas, slug, `${slug}-manifesto.json`);
    if (!existsSync(caminho)) continue;
    let dados;
    try {
      dados = lerJson(caminho);
    } catch (erro) {
      throw new Error(`Manifesto inválido: ${slug}-manifesto.json (${erro.message})`);
    }
    validarManifesto(dados, slug);
    manifestos.push(dados);
  }
  return manifestos;
}

function carregarCategorias(raiz) {
  const caminho = join(raiz, 'frontend', 'ferramentas', 'ferramentas-categorias.json');
  if (!existsSync(caminho)) return [];
  return lerJson(caminho)?.categorias ?? [];
}

function carregarTextosCategorias(raiz, sufixo) {
  const caminho = join(raiz, 'frontend', 'compartilhado', `compartilhado-idioma-${sufixo}.json`);
  return lerJsonSeguro(caminho)?.compartilhado?.categorias ?? {};
}

function localizarTexto(campo, idioma) {
  if (!campo || typeof campo !== 'object') return '';
  return campo[idioma] ?? campo['pt-BR'] ?? '';
}

function localizarLista(campo, idioma) {
  if (!campo || typeof campo !== 'object') return [];
  return campo[idioma] ?? campo['pt-BR'] ?? [];
}

export function criarCatalogo({ raiz, banco }) {
  let manifestosCache = null;
  let categoriasCache = null;

  function garantirCarregado() {
    if (manifestosCache === null) manifestosCache = carregarManifestos(raiz);
    if (categoriasCache === null) categoriasCache = carregarCategorias(raiz);
  }

  function recarregar() {
    manifestosCache = carregarManifestos(raiz);
    categoriasCache = carregarCategorias(raiz);
  }

  function obterAjustesMapa() {
    const mapa = new Map();
    if (!banco) return mapa;
    const linhas = banco.prepare('SELECT * FROM ferramentas_ajustes').all();
    for (const linha of linhas) mapa.set(linha.ferramenta_slug, linha);
    return mapa;
  }

  function obterAjuste(slug) {
    if (!banco) return null;
    return banco.prepare('SELECT * FROM ferramentas_ajustes WHERE ferramenta_slug = ?').get(slug) ?? null;
  }

  function ativaPeloAjuste(ajuste) {
    return ajuste ? Boolean(ajuste.ativa) : true;
  }

  function planoEfetivo(slug) {
    garantirCarregado();
    const manifesto = manifestosCache.find((item) => item.slug === slug);
    if (!manifesto) return null;
    const ajuste = obterAjuste(slug);
    return ajuste?.plano ?? manifesto.plano;
  }

  function localizarFerramenta(manifesto, idioma, ajustesMapa) {
    const ajuste = ajustesMapa.get(manifesto.slug) ?? null;
    const ativa = ativaPeloAjuste(ajuste);
    const plano = ajuste?.plano ?? manifesto.plano;
    const destaque = ajuste ? Boolean(ajuste.destaque) : false;
    const pronta = manifesto.estado === 'pronta';
    return {
      slug: manifesto.slug,
      estado: manifesto.estado,
      categoria: manifesto.categoria,
      plano,
      icone: manifesto.icone,
      nome: localizarTexto(manifesto.nome, idioma),
      descricao: localizarTexto(manifesto.descricao, idioma),
      intencoes: localizarLista(manifesto.intencoes, idioma),
      etiquetas: localizarLista(manifesto.etiquetas, idioma),
      relacionadas: Array.isArray(manifesto.relacionadas) ? manifesto.relacionadas : [],
      destaque,
      ativa,
      url: pronta && ativa ? `/ferramentas/${manifesto.slug}` : null,
    };
  }

  function listar({ idioma = 'pt-BR', incluirInativas = false } = {}) {
    garantirCarregado();
    const ajustesMapa = obterAjustesMapa();
    const ordemCategoria = new Map(categoriasCache.map((categoria) => [categoria.id, categoria.ordem]));

    let lista = manifestosCache.map((manifesto) => localizarFerramenta(manifesto, idioma, ajustesMapa));
    if (!incluirInativas) lista = lista.filter((ferramenta) => ferramenta.ativa);

    const ordemManifestoPorSlug = new Map(manifestosCache.map((manifesto) => [manifesto.slug, manifesto.ordem ?? 0]));
    const localeOrdenacao = idioma === 'en' ? 'en' : 'pt-BR';

    lista.sort((a, b) => {
      const ordemA = ordemCategoria.get(a.categoria) ?? Number.MAX_SAFE_INTEGER;
      const ordemB = ordemCategoria.get(b.categoria) ?? Number.MAX_SAFE_INTEGER;
      if (ordemA !== ordemB) return ordemA - ordemB;

      const ordemManifestoA = ordemManifestoPorSlug.get(a.slug) ?? 0;
      const ordemManifestoB = ordemManifestoPorSlug.get(b.slug) ?? 0;
      if (ordemManifestoA !== ordemManifestoB) return ordemManifestoA - ordemManifestoB;

      return a.nome.localeCompare(b.nome, localeOrdenacao);
    });

    return lista;
  }

  function obter(slug, { idioma = 'pt-BR' } = {}) {
    garantirCarregado();
    const manifesto = manifestosCache.find((item) => item.slug === slug);
    if (!manifesto) return null;
    const ajustesMapa = obterAjustesMapa();
    return localizarFerramenta(manifesto, idioma, ajustesMapa);
  }

  function categorias({ idioma = 'pt-BR' } = {}) {
    garantirCarregado();
    const ajustesMapa = obterAjustesMapa();

    const sufixo = idioma === 'en' ? 'en' : 'pt-br';
    const textos = carregarTextosCategorias(raiz, sufixo);
    const textosPt = idioma === 'en' ? carregarTextosCategorias(raiz, 'pt-br') : textos;

    const contagemPorCategoria = new Map();
    for (const manifesto of manifestosCache) {
      const ajuste = ajustesMapa.get(manifesto.slug) ?? null;
      if (!ativaPeloAjuste(ajuste)) continue;
      contagemPorCategoria.set(manifesto.categoria, (contagemPorCategoria.get(manifesto.categoria) ?? 0) + 1);
    }

    return categoriasCache
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((categoria) => ({
        id: categoria.id,
        ordem: categoria.ordem,
        icone: categoria.icone,
        nome: textos[categoria.id]?.nome ?? textosPt[categoria.id]?.nome ?? categoria.id,
        resumo: textos[categoria.id]?.resumo ?? textosPt[categoria.id]?.resumo ?? '',
        total: contagemPorCategoria.get(categoria.id) ?? 0,
      }));
  }

  function contagens() {
    garantirCarregado();
    const ajustesMapa = obterAjustesMapa();
    let total = 0;
    let prontas = 0;
    let planejadas = 0;
    let plus = 0;

    for (const manifesto of manifestosCache) {
      const ajuste = ajustesMapa.get(manifesto.slug) ?? null;
      if (!ativaPeloAjuste(ajuste)) continue;
      total += 1;
      if (manifesto.estado === 'pronta') prontas += 1;
      if (manifesto.estado === 'planejada') planejadas += 1;
      const plano = ajuste?.plano ?? manifesto.plano;
      if (plano === 'plus') plus += 1;
    }

    return { total, prontas, planejadas, plus };
  }

  garantirCarregado();

  return { listar, obter, categorias, contagens, planoEfetivo, recarregar };
}

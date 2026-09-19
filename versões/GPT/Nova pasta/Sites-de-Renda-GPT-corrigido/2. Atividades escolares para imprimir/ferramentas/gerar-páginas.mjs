// Sincronizado de compartilhado/ferramentas/gerar-páginas.mjs — edite a origem e rode "npm run sincronizar" na raiz.
// Gera as páginas finais do produto (index.html, páginas/*.html), a folha de estilos
// concatenada (estilos/site.css), robots.txt e sitemap.xml.
// Uso, dentro da pasta do produto: npm run gerar
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { escaparHtml } from './escapar-html.mjs';
import { montarPágina } from './modelo-de-layout.mjs';

const CHAVES_DE_NAVEGAÇÃO = ['início', 'ferramentas', 'salvos', 'apoiar', 'mais', 'nenhuma'];
const TIPOS = ['ferramenta', 'catálogo', 'institucional'];

function lerTexto(caminho) {
  return fs.readFileSync(caminho, 'utf8').replace(/^﻿/, '');
}

function listarHtml(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta).filter((nome) => nome.endsWith('.html')).map((nome) => path.join(pasta, nome));
}

function listarCss(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((nome) => nome.endsWith('.css'))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((nome) => path.join(pasta, nome));
}

function blocosGerados(resultado) {
  const { configuração, apoioDisponível, publicidadeDisponível } = resultado;
  const { contatoVálido, portfólioVálido } = configuração.criador;
  const contatoDePrivacidade = configuração.privacidade.contatoDePrivacidadeVálido;
  const link = (url, rótulo) => `<a href="${escaparHtml(url)}" rel="noopener noreferrer">${escaparHtml(rótulo)}</a>`;
  const rótuloDeContato = (url) => (url.startsWith('mailto:') ? url.slice(7) : url);
  return {
    contato: contatoVálido
      ? `<p class="destaque-de-contato">${link(contatoVálido, rótuloDeContato(contatoVálido))}</p>`
      : '<p class="aviso aviso-informação">O canal público de contato ainda está sendo configurado pelo responsável. Enquanto isso, nenhuma mensagem pode ser enviada por aqui.</p>',
    'contato-de-privacidade': contatoDePrivacidade
      ? link(contatoDePrivacidade, rótuloDeContato(contatoDePrivacidade))
      : 'o canal de contato informado na página Contato, assim que for publicado',
    portfólio: portfólioVálido ? `<p>Conheça outros trabalhos no ${link(portfólioVálido, 'portfólio de Anderson')}.</p>` : '',
    'estado-da-publicidade': publicidadeDisponível
      ? '<p>Este site exibe anúncios do Google AdSense somente depois que você aceita a publicidade opcional. O Google pode usar cookies e identificadores para veicular e medir anúncios, conforme as <a href="https://policies.google.com/technologies/ads?hl=pt-BR" rel="noopener noreferrer">políticas de publicidade do Google</a>. Você pode revogar a qualquer momento em “Preferências de privacidade”.</p>'
      : '<p>No momento, este site <strong>não exibe anúncios</strong> e não carrega nenhum código de publicidade. Se isso mudar, os anúncios só serão carregados depois do seu consentimento, e esta política será atualizada antes.</p>',
    'aviso-de-apoio': apoioDisponível
      ? ''
      : '<div class="aviso aviso-informação" data-apoio-indisponível><p><strong>O apoio por Pix ainda não está disponível.</strong> O responsável pelo site ainda não configurou os dados de recebimento. Nenhum código é gerado até lá, e todas as ferramentas continuam gratuitas.</p></div>',
  };
}

function substituirMarcadores(texto, contexto, origem, erros) {
  let resultado = texto.replace(/\{\{bloco:([\p{L}\p{N}-]+)\}\}/gu, (_, nome) => {
    const arquivo = path.join(contexto.raizDoProduto, 'conteúdo', 'blocos', `${nome}.html`);
    if (!fs.existsSync(arquivo)) {
      erros.push(`${origem}: bloco "${nome}" não encontrado em conteúdo/blocos/.`);
      return '';
    }
    return lerTexto(arquivo).trim();
  });
  resultado = resultado.replace(/\{\{gerado:([\p{L}\p{N}-]+)\}\}/gu, (_, nome) => {
    if (!(nome in contexto.gerados)) {
      erros.push(`${origem}: bloco gerado desconhecido "${nome}".`);
      return '';
    }
    return contexto.gerados[nome];
  });
  const simples = {
    raiz: contexto.raiz,
    marca: escaparHtml(contexto.configuração.site.marca),
    ano: String(contexto.ano),
    versão: escaparHtml(contexto.configuração.site.versão),
    versãoDaPolítica: escaparHtml(contexto.configuração.privacidade.versãoDaPolítica),
    recebedor: escaparHtml(contexto.configuração.apoio.nomeDoRecebedor || 'não configurado'),
  };
  resultado = resultado.replace(/\{\{([\p{L}\p{N}]+)\}\}/gu, (trecho, nome) => (nome in simples ? simples[nome] : trecho));
  for (const restante of resultado.match(/\{\{[^}]*\}\}/g) ?? []) erros.push(`${origem}: marcador não resolvido ${restante}.`);
  return resultado;
}

function lerFragmento(arquivo, erros) {
  const texto = lerTexto(arquivo);
  const correspondência = /^\s*<!--página\s*([\s\S]*?)-->\s*/.exec(texto);
  const nome = path.basename(arquivo, '.html').normalize('NFC');
  if (!correspondência) {
    erros.push(`${arquivo}: falta o cabeçalho <!--página {…}-->.`);
    return null;
  }
  let metadados;
  try {
    metadados = JSON.parse(correspondência[1]);
  } catch (erro) {
    erros.push(`${arquivo}: cabeçalho JSON inválido (${erro.message}).`);
    return null;
  }
  for (const campo of ['título', 'descrição', 'destaque', 'navegação']) {
    if (typeof metadados[campo] !== 'string' || !metadados[campo].trim()) erros.push(`${arquivo}: campo "${campo}" obrigatório.`);
  }
  if (metadados.navegação && !CHAVES_DE_NAVEGAÇÃO.includes(metadados.navegação)) erros.push(`${arquivo}: navegação "${metadados.navegação}" inválida.`);
  if (metadados.tipo && !TIPOS.includes(metadados.tipo)) erros.push(`${arquivo}: tipo "${metadados.tipo}" inválido.`);
  return { nome, arquivo, metadados: { ...metadados, nome }, corpo: texto.slice(correspondência[0].length) };
}

function concatenarEstilos(raizDoProduto) {
  const estilos = path.join(raizDoProduto, 'estilos');
  const comum = path.join(estilos, 'comum');
  const produto = path.join(estilos, 'produto');
  const ordem = [
    path.join(comum, 'fontes.css'),
    path.join(comum, 'base.css'),
    path.join(produto, 'cores.css'),
    path.join(comum, 'tipografia.css'),
    path.join(comum, 'movimentos.css'),
    path.join(comum, 'utilitários.css'),
    ...listarCss(path.join(comum, 'componentes')),
    ...listarCss(produto).filter((arquivo) => !['cores.css', 'impressão.css'].includes(path.basename(arquivo))),
    path.join(comum, 'impressão.css'),
    path.join(produto, 'impressão.css'),
  ].filter((arquivo) => fs.existsSync(arquivo));
  const partes = ordem.map((arquivo) => {
    const relativo = path.relative(estilos, arquivo).split(path.sep).join('/');
    const conteúdo = lerTexto(arquivo).replace(/^@charset "UTF-8";\s*/i, '');
    return `/* ===== ${relativo} ===== */\n${conteúdo.trim()}\n`;
  });
  const saída = `@charset "UTF-8";\n/* Gerado por npm run gerar a partir de estilos/comum e estilos/produto. Não editar. */\n\n${partes.join('\n')}`;
  fs.writeFileSync(path.join(estilos, 'site.css'), saída, 'utf8');
  return ordem.length;
}

export async function gerarPáginas(raizInformada = process.cwd()) {
  const raizDoProduto = path.resolve(raizInformada);
  const erros = [];
  const { validarConfiguração } = await import(pathToFileURL(path.join(raizDoProduto, 'scripts', 'comum', 'configuração', 'validar-configuração.js')).href);
  const resultado = validarConfiguração(JSON.parse(lerTexto(path.join(raizDoProduto, 'configurações', 'configuração-pública.json'))));
  const { configuração } = resultado;
  const identidade = JSON.parse(lerTexto(path.join(raizDoProduto, 'configurações', 'identidade-visual.json')));
  const gerados = blocosGerados(resultado);
  const ano = new Date().getFullYear();

  const fragmentos = new Map();
  for (const arquivo of [...listarHtml(path.join(raizDoProduto, 'conteúdo', 'comum')), ...listarHtml(path.join(raizDoProduto, 'conteúdo', 'páginas'))]) {
    const fragmento = lerFragmento(arquivo, erros);
    if (fragmento) fragmentos.set(fragmento.nome, fragmento);
  }
  for (const obrigatória of ['início', 'ferramentas', 'metodologia', 'sobre', 'apoiar', 'salvos', 'contato', 'política-de-privacidade', 'termos-de-uso', 'página-não-encontrada']) {
    if (!fragmentos.has(obrigatória)) erros.push(`Página obrigatória ausente: conteúdo/páginas/${obrigatória}.html`);
  }

  const pastaDePáginas = path.join(raizDoProduto, 'páginas');
  fs.rmSync(pastaDePáginas, { recursive: true, force: true });
  fs.mkdirSync(pastaDePáginas, { recursive: true });

  const títulos = new Map();
  const páginasGeradas = [];
  for (const fragmento of fragmentos.values()) {
    const { nome } = fragmento;
    const caminhoDeSaída = nome === 'início' ? 'index.html' : `páginas/${nome}.html`;
    let raiz = nome === 'início' ? './' : '../';
    if (nome === 'página-não-encontrada' && configuração.publicação.endereçoBaseVálido) raiz = configuração.publicação.endereçoBaseVálido;
    const contexto = { raizDoProduto, raiz, configuração, gerados, ano };
    const origem = path.relative(raizDoProduto, fragmento.arquivo);
    const metadados = {
      ...fragmento.metadados,
      título: substituirMarcadores(fragmento.metadados.título ?? '', contexto, origem, erros),
      descrição: substituirMarcadores(fragmento.metadados.descrição ?? '', contexto, origem, erros),
    };
    if (nome === 'página-não-encontrada') metadados.indexar = false;
    if (metadados.script && !fs.existsSync(path.join(raizDoProduto, 'scripts', metadados.script))) erros.push(`${origem}: script ${metadados.script} não existe.`);
    if (metadados.descrição.length > 170) erros.push(`${origem}: descrição com mais de 170 caracteres.`);
    if (títulos.has(metadados.título)) erros.push(`${origem}: título repetido em ${títulos.get(metadados.título)}.`);
    títulos.set(metadados.título, origem);

    const conteúdo = substituirMarcadores(fragmento.corpo, contexto, origem, erros);
    const html = montarPágina({
      metadados,
      conteúdo,
      configuração,
      raiz,
      caminhoDeSaída,
      versão: configuração.site.versão,
      ano,
      corDoTema: identidade.fundo,
      incluirFaixaDeApoio: resultado.apoioDisponível && metadados.faixaDeApoio !== false && nome !== 'apoiar',
    });
    fs.writeFileSync(path.join(raizDoProduto, caminhoDeSaída), html, 'utf8');
    páginasGeradas.push({ caminhoDeSaída, indexar: metadados.indexar !== false });
  }

  const arquivosCss = concatenarEstilos(raizDoProduto);

  const base = configuração.publicação.endereçoBaseVálido;
  const robôs = ['User-agent: *', 'Allow: /'];
  const caminhoDoMapa = path.join(raizDoProduto, 'sitemap.xml');
  if (base) {
    robôs.push(`Sitemap: ${new URL('sitemap.xml', base).href}`);
    const hoje = new Date().toISOString().slice(0, 10);
    const endereços = páginasGeradas
      .filter((página) => página.indexar)
      .map((página) => `  <url><loc>${escaparHtml(new URL(página.caminhoDeSaída === 'index.html' ? '' : página.caminhoDeSaída, base).href)}</loc><lastmod>${hoje}</lastmod></url>`);
    fs.writeFileSync(caminhoDoMapa, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${endereços.join('\n')}\n</urlset>\n`, 'utf8');
  } else {
    fs.rmSync(caminhoDoMapa, { force: true });
  }
  fs.writeFileSync(path.join(raizDoProduto, 'robots.txt'), `${robôs.join('\n')}\n`, 'utf8');

  return { páginas: páginasGeradas.map((página) => página.caminhoDeSaída), arquivosCss, erros, pendências: resultado.problemas };
}

const executadoDiretamente = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (executadoDiretamente) {
  const relatório = await gerarPáginas(process.argv[2] ?? process.cwd());
  console.log(`${relatório.páginas.length} páginas geradas; site.css com ${relatório.arquivosCss} arquivos.`);
  if (relatório.pendências.length) {
    console.log('Pendências de configuração (não impedem o desenvolvimento):');
    for (const problema of relatório.pendências) console.log(`  - ${problema.campo}: ${problema.mensagem}`);
  }
  if (relatório.erros.length) {
    console.error('Erros:');
    for (const erro of relatório.erros) console.error(`  - ${erro}`);
    process.exit(1);
  }
}

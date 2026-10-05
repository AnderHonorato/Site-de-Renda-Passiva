/**
 * Páginas do portal que existem nos dois idiomas: início, catálogo, salvos, ajuda, privacidade,
 * termos e 404. Cada função recebe o contexto do idioma (textos, categorias, catálogo) e devolve o
 * HTML. A estrutura é uma só; só os textos mudam, e é por isso que as duas versões não divergem.
 *
 * Caminhos: as páginas ficam na raiz do idioma (pt na raiz do site; en em /en/). `raiz` é o
 * prefixo até a raiz do SITE, onde ficam recursos/, scripts/ e f/ (as páginas das ferramentas,
 * que por enquanto só existem em português).
 */
import { ícone } from '../scripts/núcleo/ícones.js';
import { imagemDoTema } from '../scripts/núcleo/ícone-animado.js';
import { site } from '../dados/site.js';
import { blocosEmHtml, emLinha } from '../scripts/núcleo/texto-rico.js';
import { montarPágina, escapar } from './modelo-de-página.mjs';

/** Caminho (sem extensão) da ilustração animada de uma categoria; "mini" é o recorte para cartões pequenos. */
export function arteDaCategoria(id, mini = false) {
  return `recursos/ilustrações/categorias/${mini ? 'mini/' : ''}${id.normalize('NFD').replace(/[̀-ͯ]/g, '')}`;
}

/** Divisória ondulada — evita a linha reta em toda seção. */
function onda(invertida = false) {
  const caminho = invertida
    ? 'M0,28 C240,0 480,28 720,14 C960,0 1200,24 1440,10 L1440,0 L0,0 Z'
    : 'M0,0 C240,28 480,0 720,14 C960,28 1200,4 1440,18 L1440,28 L0,28 Z';
  return `<div class="onda" aria-hidden="true"><svg viewBox="0 0 1440 28" preserveAspectRatio="none"><path d="${caminho}" fill="currentColor"/></svg></div>`;
}

/**
 * Endereços de uma página nos dois idiomas, relativos a ela. Português na raiz, inglês em en/.
 * @param {string} arquivo nome da página ("ferramentas.html"; "" para o início)
 * @param {object} ctx contexto do idioma da página que está sendo montada
 */
export function alternativasDe(arquivo, ctx) {
  const noInglês = ctx.código === 'en';
  return {
    'pt-BR': noInglês ? `../${arquivo}` : arquivo,
    en: noInglês ? arquivo : `en/${arquivo}`,
  };
}

/** Prefixos de caminho de uma página na raiz do idioma. */
function prefixos(ctx) {
  return { base: '', raiz: ctx.código === 'en' ? '../' : '' };
}

/* ---------------------------------------------------------------- início */

export function páginaInicial(ctx) {
  const { t } = ctx;
  const { base, raiz } = prefixos(ctx);
  const prontas = ctx.ferramentasProntas.length;
  // Ferramentas só existem em português por enquanto: em inglês o link leva à página em português.
  const atalhos = ctx.ferramentasProntas.slice(0, 5)
    .map((f) => `<a class="categoria-cartão" href="${raiz}f/${f.slug}/"${ctx.código === 'en' ? ' hreflang="pt-BR"' : ''}><span class="categoria-cartão__ícone">${ícone(f.ícone)}</span><span><b>${escapar(f.nome)}</b><small>${escapar(f.categoriaNome)}</small></span></a>`)
    .join('');

  const grade = ctx.categorias.map((c) => `<a class="categoria-cartão" href="${base}ferramentas.html?categoria=${encodeURIComponent(c.id)}">
      <span class="ícone-vivo categoria-cartão__arte" data-estado="carregando">
        <span class="categoria-cartão__ícone">${ícone(c.ícone)}</span>
        ${imagemDoTema(`${raiz}${arteDaCategoria(c.id, true)}`, { classe: 'ícone-vivo__animado', largura: 300, altura: 200 })}
      </span>
      <span><b>${escapar(c.nome)}</b><small data-contagem="${escapar(c.id)}"></small></span>
    </a>`).join('');

  // O número do topo conta até o valor real: o HTML já traz o valor final, para quem não tem JavaScript.
  const marcaDoNúmero = '@@PRONTAS@@';
  const linha = escapar(t('início.linha', { prontas: marcaDoNúmero }))
    .replace(marcaDoNúmero, `<b data-conta="${prontas}">${prontas}</b>`);

  const perguntas = ctx.lista('início.faq').map((item) => {
    const corte = item.indexOf('|');
    return `<details><summary>${escapar(item.slice(0, corte))}</summary><p>${escapar(item.slice(corte + 1))}</p></details>`;
  }).join('\n      ');

  const conteúdo = `    <section class="largura abertura">
      <div class="abertura__grade">
        <div class="cascata">
          <h1 class="abertura__título">${emLinha(t('início.pergunta'))}</h1>
          <p class="abertura__linha">${linha}</p>
          <div id="bloco-busca">
          <div class="busca">
            ${ícone('busca')}
            <input id="busca" type="search" autocomplete="off" enterkeyhint="search"
              placeholder="${escapar(t('início.buscaMarcador'))}" aria-label="${escapar(t('início.buscaRótulo'))}"
              role="combobox" aria-expanded="false" aria-controls="sugestões" aria-autocomplete="list">
            <kbd>/</kbd>
            <div class="sugestões" id="sugestões" role="listbox" aria-label="${escapar(t('início.sugestões'))}" hidden></div>
          </div>
          <div class="intenções">
            <p class="rótulo">${escapar(t('início.pedem'))}</p>
            <div class="intenções__lista" id="intenções"></div>
          </div>
          </div>
        </div>
        <aside class="acesso-rápido entra atraso-3" aria-label="${escapar(t('início.acessoRápido'))}">
          <p class="acesso-rápido__título">${escapar(t('início.comeceAqui'))}</p>
          ${atalhos}
        </aside>
      </div>
    </section>

    <div class="largura" id="bloco-vitrine">
      <section class="vitrine" data-vitrine data-vitrine-manual data-idioma="${ctx.código}" aria-label="${escapar(t('início.vitrineRótulo'))}">
        <canvas class="vitrine__tela"></canvas>
        <button class="vitrine__controle" type="button" data-vitrine-controle aria-label="${escapar(t('início.vitrinePausar'))}"></button>
        <noscript>
          <picture>
            <source media="(max-width: 640px)" srcset="${raiz}vitrine/imagens/vitrine-capa-retrato.webp">
            <img class="vitrine__capa" src="${raiz}vitrine/imagens/vitrine-capa-paisagem.webp" alt="${escapar(t('início.vitrineCapa', { prontas }))}" width="1280" height="720">
          </picture>
        </noscript>
      </section>
    </div>

    <section class="largura seção" id="recentes" hidden>
      <div class="seção__topo">
        <h2>${ícone('relógio')} ${escapar(t('início.recentes'))}</h2>
        <button class="botão botão--texto" type="button" id="limpar-recentes">${escapar(t('início.limpar'))}</button>
      </div>
      <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-recentes"></div>
    </section>

    ${onda()}
    <div class="faixa-fundo">
      <section class="largura seção">
        <div class="seção__topo">
          <h2>${ícone('grade')} ${escapar(t('início.categoriasTítulo'))}</h2>
          <a class="botão botão--texto" href="${base}ferramentas.html">${escapar(t('início.verTudo'))} ${ícone('seta', { tamanho: 14 })}</a>
        </div>
        <div class="grade-categorias">${grade}</div>
      </section>
    </div>
    ${onda(true)}

    <section class="largura seção">
      <div class="seção__topo">
        <h2>${ícone('confere-círculo')} ${escapar(t('início.prontasTítulo'))}</h2>
        <p class="filtros__contagem">${escapar(t('início.prontasContagem', { prontas, total: ctx.ferramentas.length }))}</p>
      </div>
      <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-prontas"></div>
      <p class="pequeno suave t-2">${escapar(t('início.prontasNota'))}</p>
    </section>

    <section class="largura seção prosa">
      <h2>${escapar(t('início.faqTítulo'))}</h2>
      ${perguntas}
    </section>`;

  return montarPágina({
    ctx,
    título: t('início.título'),
    descrição: t('início.descrição', { prontas }),
    base,
    raiz,
    atual: 'início',
    conteúdo,
    alternativas: alternativasDe('', ctx),
    estilos: ['./vitrine/vitrine.css'],
    scripts: ['páginas/início.js'],
  });
}

/* -------------------------------------------------------------- catálogo */

export function páginaDeCatálogo(ctx) {
  const { t } = ctx;
  const { base, raiz } = prefixos(ctx);
  const pílulasCategorias = [{ id: 'todas', nome: t('catálogo.todas'), ícone: 'grade' }, ...ctx.categorias]
    .map((c, i) => `<button type="button" data-categoria="${escapar(c.id)}" aria-pressed="${i === 0}">${ícone(c.ícone ?? 'grade', { tamanho: 14 })}${escapar(c.nome)}</button>`)
    .join('');
  const opçõesTarefa = [`<option value="todas">${escapar(t('catálogo.qualquerTarefa'))}</option>`,
    ...ctx.tarefas.map((tarefa) => `<option value="${escapar(tarefa.id)}">${escapar(tarefa.nome)}</option>`)].join('');

  const conteúdo = `    <section class="largura topo-página">
      <h1 class="b-1">${escapar(t('catálogo.h1'))}</h1>
      <p class="suave b-2">${escapar(t('catálogo.contagem', { total: ctx.ferramentas.length, prontas: ctx.ferramentasProntas.length }))}</p>
      <div class="busca b-2">
        ${ícone('busca')}
        <input id="busca" type="search" autocomplete="off" placeholder="${escapar(t('catálogo.buscaMarcador'))}" aria-label="${escapar(t('catálogo.buscaRótulo'))}">
        <kbd>/</kbd>
      </div>
      <div class="filtros">
        <div class="pílulas" id="pílulas-categorias" role="group" aria-label="${escapar(t('catálogo.filtrarCategoria'))}">${pílulasCategorias}</div>
        <div class="filtros__linha">
          <label class="sr-só" for="filtro-tarefa">${escapar(t('catálogo.tipoDeTarefa'))}</label>
          <select id="filtro-tarefa">${opçõesTarefa}</select>
          <label class="sr-só" for="filtro-status">${escapar(t('catálogo.situação'))}</label>
          <select id="filtro-status">
            <option value="todas">${escapar(t('catálogo.prontasEPlanejadas'))}</option>
            <option value="pronta">${escapar(t('catálogo.sóProntas'))}</option>
            <option value="favoritas">${escapar(t('catálogo.sóFavoritos'))}</option>
          </select>
          <p class="filtros__contagem" id="contagem" role="status" aria-live="polite"></p>
        </div>
      </div>
      <div class="lista-ferramentas lista-ferramentas--colunas" id="lista"></div>
    </section>`;

  return montarPágina({
    ctx,
    título: t('catálogo.título'),
    descrição: t('catálogo.descrição', { total: ctx.ferramentas.length }),
    base,
    raiz,
    atual: 'ferramentas',
    conteúdo,
    alternativas: alternativasDe('ferramentas.html', ctx),
    scripts: ['páginas/catálogo.js'],
  });
}

/* ---------------------------------------------------------------- salvos */

export function páginaDeSalvos(ctx) {
  const { t } = ctx;
  const { base, raiz } = prefixos(ctx);
  const conteúdo = `    <section class="largura topo-página">
      <h1 class="b-1">${escapar(t('salvos.h1'))}</h1>
      <p class="suave b-3">${escapar(t('salvos.texto'))}</p>
      <div class="ações b-4">
        <button class="botão botão--linha" type="button" id="exportar-cópia">${ícone('baixar')}${escapar(t('salvos.exportar'))}</button>
        <label class="botão botão--linha" for="importar-cópia">${ícone('pasta')}${escapar(t('salvos.importar'))}</label>
        <input class="sr-só" id="importar-cópia" type="file" accept="application/json,.json">
      </div>
      <div class="seção">
        <div class="seção__topo"><h2>${ícone('marcador')} ${escapar(t('salvos.favoritos'))}</h2></div>
        <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-favoritos"></div>
      </div>
      <div class="seção">
        <div class="seção__topo">
          <h2>${ícone('relógio')} ${escapar(t('salvos.abertas'))}</h2>
          <button class="botão botão--texto" type="button" id="limpar-recentes">${escapar(t('salvos.limparHistórico'))}</button>
        </div>
        <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-recentes"></div>
      </div>
    </section>`;

  return montarPágina({
    ctx,
    título: t('salvos.título'),
    descrição: t('salvos.descrição'),
    base,
    raiz,
    atual: 'salvos',
    conteúdo,
    alternativas: alternativasDe('salvos.html', ctx),
    scripts: ['páginas/salvos.js'],
    semÍndice: true,
  });
}

/* ------------------------------------------------------ páginas de texto */

function páginaDeTexto(ctx, { chave, arquivo, atual }) {
  const { t } = ctx;
  const { base, raiz } = prefixos(ctx);
  const título = t(`${chave}.título`);
  return {
    arquivo,
    html: montarPágina({
      ctx,
      título: `${título} — ${site.nome}`,
      descrição: t(`${chave}.descrição`),
      base,
      raiz,
      atual,
      alternativas: alternativasDe(arquivo, ctx),
      conteúdo: `    <section class="largura prosa topo-página">\n      <h1>${escapar(título)}</h1>\n${blocosEmHtml(ctx.lista(`${chave}.corpo`))}\n    </section>`,
    }),
  };
}

export function páginasInstitucionais(ctx) {
  return [
    páginaDeTexto(ctx, { chave: 'ajuda', arquivo: 'ajuda.html', atual: 'ajuda' }),
    páginaDeTexto(ctx, { chave: 'privacidade', arquivo: 'privacidade.html', atual: '' }),
    páginaDeTexto(ctx, { chave: 'termos', arquivo: 'termos.html', atual: '' }),
  ];
}

/* ------------------------------------------------------------------- 404 */

/**
 * A 404 usa raiz absoluta: o servidor a entrega em qualquer caminho inexistente (/a/b/c), então
 * os caminhos relativos não servem. A do inglês fica em /en/404.html e é entregue para /en/*.
 */
export function página404(ctx) {
  const { t } = ctx;
  const prefixo = ctx.idioma.pasta ? `/${ctx.idioma.pasta}` : '/';
  return montarPágina({
    ctx,
    título: t('erro404.título'),
    descrição: t('erro404.descrição'),
    base: prefixo,
    raiz: '/',
    semÍndice: true,
    conteúdo: `    <section class="largura topo-página--folgado página-de-erro">
      ${imagemDoTema('/recursos/ilustrações/erro-404', { classe: 'ilustração entra atraso-1', largura: 320, altura: 240, carregar: 'eager' })}
      <div class="prosa cascata">
        <h1>${escapar(t('erro404.h1'))}</h1>
        <p>${escapar(t('erro404.texto'))}</p>
        <p class="ações t-3">
          <a class="botão" href="${prefixo}">${escapar(t('erro404.irInício'))}</a>
          <a class="botão botão--linha" href="${prefixo}ferramentas.html">${escapar(t('erro404.verCatálogo'))}</a>
        </p>
      </div>
    </section>`,
  });
}

/**
 * Gera o HTML do portal a partir do catálogo e do modelo de página.
 *
 * Nada de HTML escrito à mão em duplicidade: cabeçalho, rodapé e barra inferior
 * vêm de `modelo-de-página.mjs`, e as páginas de ferramenta vêm do catálogo.
 *
 * Uso: node portal/ferramentas/gerar.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarPágina, escapar } from './modelo-de-página.mjs';
import { ícone } from '../scripts/núcleo/ícones.js';
import { ferramentas, ferramentasProntas, conferirCatálogo } from '../dados/catálogo.js';
import { categorias, tarefas } from '../dados/categorias.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const RÓTULO_DE_EXPORTAÇÃO = {
  copiar: 'copiar', baixar: 'baixar arquivo', pdf: 'PDF', xlsx: 'planilha Excel',
  csv: 'CSV', json: 'JSON', png: 'PNG', svg: 'SVG', link: 'link para compartilhar', imprimir: 'impressão',
};

/** Divisória ondulada — evita a linha reta em toda seção. */
function onda(invertida = false) {
  const caminho = invertida
    ? 'M0,28 C240,0 480,28 720,14 C960,0 1200,24 1440,10 L1440,0 L0,0 Z'
    : 'M0,0 C240,28 480,0 720,14 C960,28 1200,4 1440,18 L1440,28 L0,28 Z';
  return `<div class="onda" aria-hidden="true"><svg viewBox="0 0 1440 28" preserveAspectRatio="none"><path d="${caminho}" fill="currentColor"/></svg></div>`;
}

/* ---------------------------------------------------------------- início */

function páginaInicial() {
  const prontas = ferramentasProntas.length;
  const atalhos = ferramentasProntas.slice(0, 5)
    .map((f) => `<a class="categoria-cartão" href="f/${f.slug}/"><span class="categoria-cartão__ícone">${ícone(f.ícone)}</span><span><b>${escapar(f.nome)}</b><small>${escapar(f.categoriaNome)}</small></span></a>`)
    .join('');

  const grade = categorias.map((c) => `<a class="categoria-cartão" href="ferramentas.html?categoria=${encodeURIComponent(c.id)}">
      <span class="categoria-cartão__ícone">${ícone(c.ícone)}</span>
      <span><b>${escapar(c.nome)}</b><small data-contagem="${escapar(c.id)}"></small></span>
    </a>`).join('');

  const conteúdo = `    <section class="largura abertura">
      <div class="abertura__grade">
        <div>
          <h1 class="abertura__título">O que você precisa <em>resolver</em> agora?</h1>
          <p class="abertura__linha">Escreva a tarefa, não o nome da ferramenta. ${prontas} ferramentas prontas, sem cadastro, rodando no seu navegador.</p>
          <div class="busca">
            ${ícone('busca')}
            <input id="busca" type="search" autocomplete="off" enterkeyhint="search"
              placeholder="Ex.: preciso saber quanto cobrar" aria-label="Buscar ferramenta"
              role="combobox" aria-expanded="false" aria-controls="sugestões" aria-autocomplete="list">
            <kbd>/</kbd>
            <div class="sugestões" id="sugestões" role="listbox" aria-label="Sugestões" hidden></div>
          </div>
          <div class="intenções">
            <p class="rótulo">Pessoas costumam pedir</p>
            <div class="intenções__lista" id="intenções"></div>
          </div>
        </div>
        <aside class="acesso-rápido" aria-label="Acesso rápido">
          <p class="acesso-rápido__título">Comece por aqui</p>
          ${atalhos}
        </aside>
      </div>
    </section>

    <section class="largura seção" id="recentes" hidden>
      <div class="seção__topo">
        <h2>${ícone('relógio')} Continue de onde parou</h2>
        <button class="botão botão--texto" type="button" id="limpar-recentes">Limpar</button>
      </div>
      <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-recentes"></div>
    </section>

    ${onda()}
    <div class="faixa-fundo">
      <section class="largura seção">
        <div class="seção__topo">
          <h2>${ícone('grade')} Categorias</h2>
          <a class="botão botão--texto" href="ferramentas.html">Ver tudo ${ícone('seta', { tamanho: 14 })}</a>
        </div>
        <div class="grade-categorias">${grade}</div>
      </section>
    </div>
    ${onda(true)}

    <section class="largura seção">
      <div class="seção__topo">
        <h2>${ícone('confere-círculo')} Prontas para usar</h2>
        <p class="filtros__contagem">${prontas} de ${ferramentas.length} ferramentas do catálogo</p>
      </div>
      <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-prontas"></div>
      <p class="pequeno suave t-2">As demais estão no catálogo com a ficha completa do que farão. Nenhuma abre uma tela vazia.</p>
    </section>

    <section class="largura seção prosa">
      <h2>Perguntas de quem chega agora</h2>
      <details><summary>Preciso criar conta?</summary><p>Não. Todas as ferramentas do portal funcionam sem cadastro. Favoritos e histórico ficam guardados no seu próprio navegador.</p></details>
      <details><summary>Meus arquivos são enviados para algum servidor?</summary><p>Não. O portal é um site estático: o processamento acontece no seu navegador. Cada ferramenta informa isso na ficha, e se alguma vier a precisar de servidor, o aviso aparecerá antes de você enviar qualquer coisa.</p></details>
      <details><summary>Por que algumas ferramentas aparecem como "planejada"?</summary><p>Porque ainda não estão implementadas. Preferimos mostrar a ficha do que elas vão fazer a abrir uma tela vazia. Só recebe o selo de pronta a ferramenta que abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste automático.</p></details>
      <details><summary>Posso usar no celular?</summary><p>Sim. O portal foi desenhado primeiro para a tela pequena, com navegação inferior e campos que o teclado não cobre.</p></details>
    </section>`;

  return montarPágina({
    título: 'Ferramentas do Ander — resolva a tarefa, não procure o botão',
    descrição: `Portal com ${prontas} ferramentas prontas para calcular, criar e organizar. Funciona no navegador, sem cadastro e sem enviar seus dados.`,
    atual: 'início',
    conteúdo,
    scripts: ['páginas/início.js'],
  });
}

/* -------------------------------------------------------------- catálogo */

function páginaDeCatálogo() {
  const pílulasCategorias = [{ id: 'todas', nome: 'Todas', ícone: 'grade' }, ...categorias]
    .map((c, i) => `<button type="button" data-categoria="${escapar(c.id)}" aria-pressed="${i === 0}">${ícone(c.ícone ?? 'grade', { tamanho: 14 })}${escapar(c.nome)}</button>`)
    .join('');
  const opçõesTarefa = ['<option value="todas">Qualquer tarefa</option>',
    ...tarefas.map((t) => `<option value="${escapar(t.id)}">${escapar(t.nome)}</option>`)].join('');

  const conteúdo = `    <section class="largura topo-página">
      <h1 class="b-1">Catálogo de ferramentas</h1>
      <p class="suave b-2">${ferramentas.length} ferramentas no catálogo, ${ferramentasProntas.length} já prontas para usar.</p>
      <div class="busca b-2">
        ${ícone('busca')}
        <input id="busca" type="search" autocomplete="off" placeholder="Busque por tarefa, nome ou categoria" aria-label="Buscar no catálogo">
        <kbd>/</kbd>
      </div>
      <div class="filtros">
        <div class="pílulas" id="pílulas-categorias" role="group" aria-label="Filtrar por categoria">${pílulasCategorias}</div>
        <div class="filtros__linha">
          <label class="sr-só" for="filtro-tarefa">Tipo de tarefa</label>
          <select id="filtro-tarefa">${opçõesTarefa}</select>
          <label class="sr-só" for="filtro-status">Situação</label>
          <select id="filtro-status">
            <option value="todas">Prontas e planejadas</option>
            <option value="pronta">Só as prontas</option>
            <option value="favoritas">Só os favoritos</option>
          </select>
          <p class="filtros__contagem" id="contagem" role="status" aria-live="polite"></p>
        </div>
      </div>
      <div class="lista-ferramentas lista-ferramentas--colunas" id="lista"></div>
    </section>`;

  return montarPágina({
    título: 'Todas as ferramentas — Ferramentas do Ander',
    descrição: `Catálogo completo com ${ferramentas.length} ferramentas organizadas por categoria e tipo de tarefa.`,
    atual: 'ferramentas',
    conteúdo,
    scripts: ['páginas/catálogo.js'],
  });
}

/* ---------------------------------------------------------------- salvos */

function páginaDeSalvos() {
  const conteúdo = `    <section class="largura topo-página">
      <h1 class="b-1">Meus salvos</h1>
      <p class="suave b-3">Favoritos e histórico ficam guardados neste navegador. Nada é enviado para servidor. Exporte uma cópia antes de limpar os dados do navegador.</p>
      <div class="ações b-4">
        <button class="botão botão--linha" type="button" id="exportar-cópia">${ícone('baixar')}Exportar cópia</button>
        <label class="botão botão--linha" for="importar-cópia">${ícone('pasta')}Importar cópia</label>
        <input class="sr-só" id="importar-cópia" type="file" accept="application/json,.json">
      </div>
      <div class="seção">
        <div class="seção__topo"><h2>${ícone('marcador')} Favoritos</h2></div>
        <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-favoritos"></div>
      </div>
      <div class="seção">
        <div class="seção__topo">
          <h2>${ícone('relógio')} Abertas recentemente</h2>
          <button class="botão botão--texto" type="button" id="limpar-recentes">Limpar histórico</button>
        </div>
        <div class="lista-ferramentas lista-ferramentas--colunas" id="lista-recentes"></div>
      </div>
    </section>`;

  return montarPágina({
    título: 'Meus salvos — Ferramentas do Ander',
    descrição: 'Favoritos e histórico das ferramentas que você usa, guardados no seu próprio navegador.',
    atual: 'salvos',
    conteúdo,
    scripts: ['páginas/salvos.js'],
    semÍndice: true,
  });
}

/* ------------------------------------------------------ páginas de texto */

function páginaDeTexto({ título, descrição, atual, corpo, arquivo }) {
  return {
    arquivo,
    html: montarPágina({
      título: `${título} — Ferramentas do Ander`,
      descrição, atual,
      conteúdo: `    <section class="largura prosa topo-página">\n      <h1>${escapar(título)}</h1>\n${corpo}\n    </section>`,
    }),
  };
}

function páginasInstitucionais() {
  return [
    páginaDeTexto({
      arquivo: 'ajuda.html', título: 'Como usar o portal', atual: 'ajuda',
      descrição: 'Como encontrar a ferramenta certa, usar no celular, exportar resultados e guardar seus favoritos.',
      corpo: `      <p class="suave">Três passos e um princípio: você sempre vê o que vai acontecer antes de baixar qualquer coisa.</p>
      <h2>1. Descreva a tarefa</h2>
      <p>A busca entende intenção. Você pode escrever <em>“quanto preciso vender para pagar as despesas”</em> em vez de procurar por “ponto de equilíbrio”. Pressione <kbd>/</kbd> em qualquer página para ir direto para o campo de busca.</p>
      <h2>2. Preencha e confira as premissas</h2>
      <p>Cada ferramenta mostra, acima da dobra, o que ela faz, o que você precisa informar, o que vai receber, se existe limite e onde seus dados ficam. Quando o resultado depende de uma suposição — arredondamento, taxa, perda —, a suposição aparece escrita junto do resultado.</p>
      <h2>3. Leve o resultado</h2>
      <p>Copiar, baixar em PDF ou planilha, imprimir ou gerar um link para enviar ao cliente. O que cada ferramenta exporta está escrito na ficha dela.</p>
      <h2>Favoritos e histórico</h2>
      <p>O marcador ao lado de cada ferramenta salva o atalho neste navegador. A página <a href="salvos.html">Meus salvos</a> reúne favoritos e histórico, e permite exportar uma cópia em arquivo. Se você limpar os dados do navegador, essa lista se perde — por isso existe a exportação.</p>
      <h2>No celular</h2>
      <p>A navegação fica na barra inferior: Início, Ferramentas, Salvos e Ajuda. Os campos numéricos abrem o teclado numérico, e nenhum botão de ação fica escondido atrás do teclado.</p>
      <h2>Acessibilidade</h2>
      <p>Todo o portal funciona por teclado, os campos têm rótulo associado, os erros são anunciados por leitores de tela e as cores foram conferidas para contraste mínimo de 4,5:1. Se o seu sistema pede menos movimento, as animações são desligadas.</p>`,
    }),
    páginaDeTexto({
      arquivo: 'privacidade.html', título: 'Política de privacidade', atual: '',
      descrição: 'O que o portal guarda, onde guarda e como apagar. Sem cadastro e sem envio de arquivos.',
      corpo: `      <p class="suave">Última revisão: 19 de setembro de 2026.</p>
      <h2>O que o portal não faz</h2>
      <ul>
        <li>não pede cadastro, e-mail ou telefone;</li>
        <li>não envia os arquivos nem os números que você digita para nenhum servidor;</li>
        <li>não usa medição de audiência, rastreadores de terceiros nem anúncios nesta versão;</li>
        <li>não compartilha dados com terceiros, porque não coleta dados para compartilhar.</li>
      </ul>
      <h2>O que fica guardado</h2>
      <p>Só no armazenamento local do seu navegador, sob o prefixo <code>portal.</code>: favoritos, histórico das ferramentas abertas, preferência de tema e os rascunhos que você escolher salvar dentro de uma ferramenta. Esses dados não saem do aparelho e não são legíveis por outros sites.</p>
      <h2>Como apagar</h2>
      <p>Em <a href="salvos.html">Meus salvos</a> você limpa o histórico e remove favoritos. Limpar os dados do site pelo próprio navegador apaga tudo de uma vez. Antes disso, use a exportação de cópia se quiser guardar.</p>
      <h2>Hospedagem</h2>
      <p>O servidor que entrega as páginas pode registrar, por padrão, endereço de IP e data do acesso — é um registro técnico do provedor de hospedagem, não uma coleta do portal. Quando o endereço definitivo de publicação for escolhido, esta seção passará a nomear o provedor.</p>
      <h2>Direitos</h2>
      <p>Como não existe cadastro nem base de dados pessoal do lado do portal, não há dados seus para acessar, corrigir ou excluir em nosso poder. O controle é integralmente seu, no seu navegador. Dúvidas sobre este texto podem ser enviadas ao contato publicado no rodapé quando o endereço definitivo estiver no ar.</p>`,
    }),
    páginaDeTexto({
      arquivo: 'termos.html', título: 'Termos de uso', atual: '',
      descrição: 'Condições de uso das ferramentas, limites de responsabilidade e direitos sobre o conteúdo.',
      corpo: `      <p class="suave">Última revisão: 19 de setembro de 2026.</p>
      <h2>Uso das ferramentas</h2>
      <p>As ferramentas são oferecidas gratuitamente, no estado em que se encontram, para uso pessoal e profissional. Você pode usar os resultados livremente, inclusive comercialmente.</p>
      <h2>Conferência dos resultados</h2>
      <p>Os cálculos são testados, mas o resultado depende do que você informa. Para decisões financeiras, trabalhistas, fiscais ou de obra, confira com o profissional responsável. As ferramentas não substituem contador, advogado, engenheiro ou profissional de saúde, e nenhuma delas emite documento fiscal.</p>
      <h2>Disponibilidade</h2>
      <p>O portal pode sair do ar para manutenção, e ferramentas podem mudar de comportamento quando um erro é corrigido. Mudanças que alteram resultados são registradas no histórico de versões do projeto.</p>
      <h2>Conteúdo</h2>
      <p>O código, os textos, os ícones e o desenho do portal são de autoria de Anderson. Componentes de terceiros mantêm suas próprias licenças, listadas na documentação do projeto. O conteúdo que você digita continua seu.</p>`,
    }),
  ];
}

/* --------------------------------------------------- página de ferramenta */

function páginaDeFerramenta(f) {
  const categoria = categorias.find((c) => c.id === f.cat);
  const exporta = f.exporta.length
    ? f.exporta.map((e) => RÓTULO_DE_EXPORTAÇÃO[e] ?? e).join(', ')
    : 'resultado na tela';
  const relacionadas = ferramentas
    .filter((o) => o.slug !== f.slug && (o.cat === f.cat || o.tarefas.some((t) => f.tarefas.includes(t))))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'pronta' ? -1 : 1))
    .slice(0, 5)
    .map((o) => `<a href="${o.status === 'pronta' ? `../${o.slug}/` : `../../ferramentas.html#${o.slug}`}">${ícone(o.ícone)}${escapar(o.nome)}</a>`)
    .join('');

  const unificadas = f.unifica.length
    ? `<p class="pequeno suave">Esta ferramenta reúne: ${f.unifica.map(escapar).join(' · ')}.</p>`
    : '';

  const conteúdo = `    <div class="largura">
      <nav class="caminho" aria-label="Você está em">
        <a href="../../">Início</a>${ícone('chevron', { tamanho: 12 })}
        <a href="../../ferramentas.html?categoria=${encodeURIComponent(f.cat)}">${escapar(categoria.nome)}</a>${ícone('chevron', { tamanho: 12 })}
        <span aria-current="page">${escapar(f.nome)}</span>
      </nav>

      <header class="ferramenta-topo">
        <span class="ferramenta-topo__ícone">${ícone(f.ícone)}</span>
        <div>
          <h1>${escapar(f.nome)}</h1>
          <p>${escapar(f.resumo)}</p>
        </div>
        <div class="ferramenta-topo__ações">
          <button class="ícone-botão favorito" type="button" data-favorito="${escapar(f.slug)}" aria-pressed="false" aria-label="Salvar nos favoritos">${ícone('marcador')}</button>
        </div>
      </header>

      <div class="ferramenta-área">
      <dl class="ficha">
        <div><dt>Para que serve</dt><dd>${escapar(f.problema)}</dd></div>
        <div><dt>Você informa</dt><dd>${escapar(f.entra)}</dd></div>
        <div><dt>Você recebe</dt><dd>${escapar(f.sai)}</dd></div>
        <div><dt>Onde processa</dt><dd>${f.local ? 'No seu navegador. Nada é enviado.' : 'Exige servidor; o aviso aparece antes do envio.'}</dd></div>
        <div><dt>Você pode levar</dt><dd>${escapar(exporta)}</dd></div>
      </dl>

      <div class="ferramenta-corpo">
        <div class="painel" id="ferramenta" data-slug="${escapar(f.slug)}">
          <noscript><p>Esta ferramenta precisa de JavaScript para calcular. O processamento continua sendo feito no seu navegador.</p></noscript>
        </div>
        <aside class="ferramenta-lado">
          <div class="painel">
            <p class="rótulo">Como funciona a conta</p>
            <p class="pequeno t-1">${escapar(f.processa)}</p>
            ${unificadas}
          </div>
          ${relacionadas ? `<div class="painel"><p class="rótulo b-2">Ferramentas relacionadas</p><div class="relacionadas">${relacionadas}</div></div>` : ''}
        </aside>
      </div>

      </div>

      <section class="seção prosa" id="como-usar">
        <h2>Como usar</h2>
        <div id="instruções"></div>
      </section>
    </div>`;

  return montarPágina({
    título: `${f.nome} — Ferramentas do Ander`,
    descrição: f.resumo,
    base: '../../',
    atual: 'ferramentas',
    conteúdo,
    scripts: ['núcleo/página-de-ferramenta.js'],
  });
}

/* ------------------------------------------------------------- auxiliares */

function manifesto() {
  return JSON.stringify({
    name: 'Ferramentas do Ander',
    short_name: 'Ferramentas',
    description: 'Ferramentas para calcular, criar e organizar, direto no navegador.',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#f6f1ea',
    theme_color: '#9a3d28',
    lang: 'pt-BR',
    icons: [{ src: 'recursos/ícone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    shortcuts: ferramentasProntas.slice(0, 4).map((f) => ({
      name: f.nome, url: `f/${f.slug}/`,
    })),
  }, null, 2);
}

function íconeDoSite() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect width="24" height="24" rx="6" fill="#9a3d28"/>
  <g fill="none" stroke="#fffdfa" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 4.5 6 7.5v4.4c0 3.6 2.5 6.3 6 7.2 3.5-.9 6-3.6 6-7.2V7.5l-6-3Z"/>
    <path d="m9.6 12 1.7 1.8L15 10"/>
  </g>
</svg>
`;
}

function sitemap(base = 'https://exemplo.invalid/portal/') {
  const urls = ['', 'ferramentas.html', 'ajuda.html', 'privacidade.html', 'termos.html',
    ...ferramentasProntas.map((f) => `f/${f.slug}/`)];
  const corpo = urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`;
}

function página404() {
  return montarPágina({
    título: 'Página não encontrada — Ferramentas do Ander',
    descrição: 'O endereço pedido não existe no portal.',
    semÍndice: true,
    conteúdo: `    <section class="largura prosa topo-página--folgado">
      <h1>Esta página não existe</h1>
      <p>O endereço pode ter mudado ou a ferramenta ainda não foi publicada.</p>
      <p class="ações t-3">
        <a class="botão" href="./">Ir para o início</a>
        <a class="botão botão--linha" href="./ferramentas.html">Ver o catálogo</a>
      </p>
    </section>`,
  });
}

/* ------------------------------------------------------------- execução */

async function escrever(caminhoRelativo, conteúdo) {
  const destino = join(RAIZ, caminhoRelativo);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, conteúdo, 'utf8');
}

async function principal() {
  const problemas = conferirCatálogo();
  if (problemas.length > 0) {
    console.error('Catálogo inválido:');
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  await rm(join(RAIZ, 'f'), { recursive: true, force: true });

  const arquivos = [
    ['index.html', páginaInicial()],
    ['ferramentas.html', páginaDeCatálogo()],
    ['salvos.html', páginaDeSalvos()],
    ['404.html', página404()],
    ['manifesto.webmanifest', manifesto()],
    ['recursos/ícone.svg', íconeDoSite()],
    ['sitemap.xml', sitemap()],
    ['robots.txt', 'User-agent: *\nAllow: /\nDisallow: /salvos.html\n'],
    ...páginasInstitucionais().map((p) => [p.arquivo, p.html]),
    ...ferramentasProntas.map((f) => [`f/${f.slug}/index.html`, páginaDeFerramenta(f)]),
  ];

  for (const [caminho, conteúdo] of arquivos) await escrever(caminho, conteúdo);

  console.log(`Geradas ${arquivos.length} saídas: ${ferramentasProntas.length} páginas de ferramenta `
    + `+ ${arquivos.length - ferramentasProntas.length} arquivos do portal.`);
  console.log(`Catálogo: ${ferramentas.length} ferramentas, ${ferramentasProntas.length} prontas.`);
}

await principal();

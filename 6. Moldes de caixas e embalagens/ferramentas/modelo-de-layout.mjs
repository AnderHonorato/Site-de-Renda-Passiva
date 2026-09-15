// Sincronizado de compartilhado/ferramentas/modelo-de-layout.mjs — edite a origem e rode "npm run sincronizar" na raiz.
// Monta o HTML final de uma página a partir do fragmento e da configuração do produto.
// Usado somente na geração local (Node). Todo texto vindo de configuração é escapado.

import { escaparHtml } from './escapar-html.mjs';

const destinosInferiores = [
  { chave: 'início', rótulo: 'Início', ícone: 'início', caminho: 'index.html' },
  { chave: 'ferramentas', rótulo: 'Ferramentas', ícone: 'ferramentas', caminho: 'páginas/ferramentas.html' },
  { chave: 'salvos', rótulo: 'Salvos', ícone: 'salvos', caminho: 'páginas/salvos.html' },
  { chave: 'apoiar', rótulo: 'Apoiar', ícone: 'apoiar', caminho: 'páginas/apoiar.html' },
];

const linksDoCabeçalho = [
  { chave: 'ferramentas', rótulo: 'Ferramentas', caminho: 'páginas/ferramentas.html' },
  { chave: 'salvos', rótulo: 'Salvos', caminho: 'páginas/salvos.html' },
  { chave: 'metodologia', rótulo: 'Metodologia', caminho: 'páginas/metodologia.html' },
  { chave: 'sobre', rótulo: 'Sobre', caminho: 'páginas/sobre.html' },
];

const linksInstitucionais = [
  { rótulo: 'Sobre', caminho: 'páginas/sobre.html', ícone: 'informação' },
  { rótulo: 'Metodologia', caminho: 'páginas/metodologia.html', ícone: 'lista' },
  { rótulo: 'Contato', caminho: 'páginas/contato.html', ícone: 'contato' },
  { rótulo: 'Política de privacidade', caminho: 'páginas/política-de-privacidade.html', ícone: 'privacidade' },
  { rótulo: 'Termos de uso', caminho: 'páginas/termos-de-uso.html', ícone: 'documento' },
];

function ícone(raiz, nome, classe = 'ícone') {
  return `<svg class="${classe}" aria-hidden="true" focusable="false"><use href="${raiz}recursos/ícones/ícones.svg#${nome}"></use></svg>`;
}

function montarMarca(site) {
  const marca = site.marca;
  const destaque = site.marcaDestaque;
  if (destaque && marca.endsWith(destaque) && marca.length > destaque.length) {
    const início = marca.slice(0, marca.length - destaque.length);
    return `${escaparHtml(início)}<em>${escaparHtml(destaque)}</em>`;
  }
  return escaparHtml(marca);
}

function atributoAtual(chaveDaPágina, chave) {
  return chaveDaPágina === chave ? ' aria-current="page"' : '';
}

function montarLinkExterno(url, rótulo) {
  return `<a class="rodapé-link-externo" href="${escaparHtml(url)}" rel="noopener noreferrer">${escaparHtml(rótulo)}</a>`;
}

function montarFaixaDeApoio(raiz) {
  const valores = [
    { centavos: 100, rótulo: 'R$ 1' },
    { centavos: 500, rótulo: 'R$ 5' },
    { centavos: 1000, rótulo: 'R$ 10' },
    { centavos: 2000, rótulo: 'R$ 20' },
  ];
  const botões = valores
    .map((valor) => `<a class="botão botão-secundário" href="${raiz}páginas/apoiar.html?valor=${valor.centavos}">${valor.rótulo}</a>`)
    .join('\n        ');
  return `
  <aside class="faixa-de-apoio não-imprimir" aria-labelledby="faixa-de-apoio-título" data-faixa-de-apoio>
    <div class="faixa-de-apoio-texto">
      <h2 id="faixa-de-apoio-título" class="faixa-de-apoio-título">Gostou? Apoie com um Pix.</h2>
      <p>Este projeto é gratuito. Se ele ajudou você, pode apoiar sua manutenção com qualquer valor.</p>
    </div>
    <div class="faixa-de-apoio-valores">
        ${botões}
        <a class="botão botão-primário" href="${raiz}páginas/apoiar.html">Outro valor</a>
    </div>
    <button type="button" class="botão botão-ícone botão-fantasma faixa-de-apoio-dispensar" data-dispensar-apoio aria-label="Dispensar o pedido de apoio por 30 dias">${ícone(raiz, 'fechar')}</button>
  </aside>`;
}

function montarRodapé({ raiz, configuração, marcaHtml, ano, versão }) {
  const { criador, site } = configuração;
  const partesDeAutoria = [`Criado por <strong>${escaparHtml(criador.nome || 'Anderson')}</strong>`];
  if (criador.portfólioVálido) partesDeAutoria.push(montarLinkExterno(criador.portfólioVálido, 'Portfólio'));
  if (criador.contatoVálido) partesDeAutoria.push(montarLinkExterno(criador.contatoVálido, 'Contato'));
  const itens = linksInstitucionais
    .map((link) => `<li><a href="${raiz}${link.caminho}">${link.rótulo}</a></li>`)
    .join('\n          ');
  return `
  <footer class="rodapé-institucional">
    <div class="rodapé-conteúdo">
      <div class="rodapé-autoria">
        <p class="rodapé-marca logotipo">${ícone(raiz, 'marca', 'marca-símbolo')}<span>${marcaHtml}</span></p>
        <p class="rodapé-criador">${partesDeAutoria.join(' <span aria-hidden="true">·</span> ')}</p>
      </div>
      <nav class="rodapé-links não-imprimir" aria-label="Institucional">
        <ul>
          ${itens}
          <li><button type="button" class="botão-link" data-abrir-preferências-de-privacidade>Preferências de privacidade</button></li>
        </ul>
      </nav>
      <p class="rodapé-direitos">© ${ano} ${escaparHtml(site.marca)} · versão ${escaparHtml(versão)} · Ferramentas gratuitas. Resultados são estimativas baseadas nos dados informados.</p>
    </div>
  </footer>`;
}

function montarNavegaçãoInferior(raiz, chaveDaPágina) {
  const links = destinosInferiores
    .map(
      (destino) => `<a class="navegação-inferior-item" href="${raiz}${destino.caminho}"${atributoAtual(chaveDaPágina, destino.chave)}>${ícone(raiz, destino.ícone)}<span>${destino.rótulo}</span></a>`,
    )
    .join('\n    ');
  const maisAtivo = chaveDaPágina === 'mais' ? ' data-ativo' : '';
  return `
  <nav class="navegação-inferior não-imprimir" aria-label="Navegação do aplicativo">
    ${links}
    <button type="button" class="navegação-inferior-item" data-abrir-menu-mais aria-haspopup="dialog" aria-controls="menu-mais"${maisAtivo}>${ícone(raiz, 'mais')}<span>Mais</span></button>
  </nav>`;
}

function montarMenuMais(raiz) {
  const itens = linksInstitucionais
    .map((link) => `<li><a class="menu-mais-link" href="${raiz}${link.caminho}">${ícone(raiz, link.ícone)}<span>${link.rótulo}</span></a></li>`)
    .join('\n        ');
  return `
  <dialog id="menu-mais" class="diálogo menu-mais" aria-labelledby="menu-mais-título">
    <div class="diálogo-cabeçalho">
      <h2 id="menu-mais-título" class="diálogo-título">Mais opções</h2>
      <button type="button" class="botão botão-ícone botão-fantasma" data-fechar-diálogo aria-label="Fechar menu">${ícone(raiz, 'fechar')}</button>
    </div>
    <nav aria-label="Mais opções">
      <ul class="menu-mais-lista">
        ${itens}
        <li><button type="button" class="menu-mais-link" data-abrir-preferências-de-privacidade>${ícone(raiz, 'privacidade')}<span>Preferências de privacidade</span></button></li>
      </ul>
    </nav>
  </dialog>`;
}

function montarConsentimento(raiz) {
  return `
  <section id="consentimento" class="consentimento não-imprimir" aria-labelledby="consentimento-título" hidden>
    <div class="consentimento-texto">
      <h2 id="consentimento-título" class="consentimento-título">Sua privacidade</h2>
      <p>Guardamos no seu aparelho apenas o necessário para lembrar suas escolhas e os dados que você decidir salvar. Recursos opcionais, como publicidade, só são carregados se você permitir. Rejeitar não limita nenhuma ferramenta. <a href="${raiz}páginas/política-de-privacidade.html">Política de privacidade</a>.</p>
    </div>
    <div class="consentimento-ações">
      <button type="button" class="botão botão-secundário" data-consentimento="rejeitar">Rejeitar opcionais</button>
      <button type="button" class="botão botão-secundário" data-consentimento="personalizar">Personalizar</button>
      <button type="button" class="botão botão-primário" data-consentimento="aceitar">Aceitar opcionais</button>
    </div>
  </section>
  <dialog id="preferências-de-privacidade" class="diálogo" aria-labelledby="preferências-título">
    <form method="dialog" class="diálogo-formulário" data-formulário-de-privacidade>
      <div class="diálogo-cabeçalho">
        <h2 id="preferências-título" class="diálogo-título">Preferências de privacidade</h2>
        <button type="button" class="botão botão-ícone botão-fantasma" data-fechar-diálogo aria-label="Fechar preferências">${ícone(raiz, 'fechar')}</button>
      </div>
      <div class="diálogo-corpo">
        <div class="opção-de-privacidade">
          <p class="opção-de-privacidade-título">Necessário <span class="etiqueta etiqueta-secundária">Sempre ativo</span></p>
          <p class="campo-ajuda">Armazenamento local para guardar esta escolha e os itens que você salvar. Não é enviado a servidores.</p>
        </div>
        <div class="opção-de-privacidade">
          <label class="interruptor">
            <input type="checkbox" name="publicidade" role="switch" data-preferência="publicidade">
            <span class="interruptor-trilho" aria-hidden="true"></span>
            <span class="opção-de-privacidade-título">Publicidade</span>
          </label>
          <p class="campo-ajuda" data-estado-da-publicidade>Permite carregar anúncios do Google AdSense, que podem usar cookies e identificadores. Enquanto a publicidade não estiver ativa neste site, nada é carregado.</p>
        </div>
        <p class="campo-ajuda">Este site não usa ferramentas de medição de audiência. Você pode mudar sua escolha a qualquer momento em “Preferências de privacidade”, no rodapé ou no menu Mais.</p>
      </div>
      <div class="diálogo-ações">
        <button type="submit" value="rejeitar" class="botão botão-secundário">Rejeitar opcionais</button>
        <button type="submit" value="salvar" class="botão botão-primário">Salvar escolhas</button>
      </div>
    </form>
  </dialog>`;
}

export function montarPágina({ metadados, conteúdo, configuração, raiz, caminhoDeSaída, versão, ano, corDoTema, incluirFaixaDeApoio }) {
  const { site, publicação } = configuração;
  const marcaHtml = montarMarca(site);
  const títuloCompleto = metadados.título === site.marca ? site.marca : `${metadados.título} — ${site.marca}`;
  const endereçoBase = publicação.endereçoBaseVálido;
  const canônico = endereçoBase && metadados.indexar !== false
    ? `\n  <link rel="canonical" href="${escaparHtml(new URL(caminhoDeSaída === 'index.html' ? '' : caminhoDeSaída, endereçoBase).href)}">`
    : '';
  const robôs = metadados.indexar === false ? '\n  <meta name="robots" content="noindex">' : '';
  const scriptDaPágina = metadados.script
    ? `\n  <script type="module" src="${raiz}scripts/${escaparHtml(metadados.script)}"></script>`
    : '';
  const chaveDaPágina = metadados.navegação || '';
  const linksDesktop = linksDoCabeçalho
    .map((link) => `<a class="cabeçalho-link" href="${raiz}${link.caminho}"${atributoAtual(metadados.chaveDoLinkDoCabeçalho || chaveDaPágina, link.chave)}>${link.rótulo}</a>`)
    .join('\n      ');
  const permiteAnúncios = metadados.anúncios === false ? 'não' : 'sim';

  return `<!doctype html>
<html lang="pt-BR" data-raiz="${raiz}" data-prefixo="${escaparHtml(site.prefixoDeArmazenamento)}" data-destaque="${escaparHtml(metadados.destaque || 'principal')}" data-tipo="${escaparHtml(metadados.tipo || 'institucional')}" data-anúncios="${permiteAnúncios}" data-página="${escaparHtml(metadados.nome)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escaparHtml(títuloCompleto)}</title>
  <meta name="description" content="${escaparHtml(metadados.descrição)}">
  <meta name="author" content="${escaparHtml(configuração.criador.nome || 'Anderson')}">
  <meta name="theme-color" content="${escaparHtml(corDoTema)}">${canônico}${robôs}
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="icon" href="${raiz}recursos/ícones/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="${raiz}recursos/fontes/figtree-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${raiz}estilos/site.css">
  <script type="module" src="${raiz}scripts/iniciar-aplicação.js"></script>${scriptDaPágina}
</head>
<body>
  <a class="pular-para-conteúdo" href="#conteúdo">Pular para o conteúdo</a>
  <header class="cabeçalho não-imprimir">
    <a class="cabeçalho-marca logotipo" href="${raiz}index.html" aria-label="${escaparHtml(site.marca)} — página inicial">${ícone(raiz, 'marca', 'marca-símbolo')}<span>${marcaHtml}</span></a>
    <nav class="cabeçalho-navegação" aria-label="Navegação principal">
      ${linksDesktop}
      <a class="botão botão-primário cabeçalho-apoiar" href="${raiz}páginas/apoiar.html"${atributoAtual(chaveDaPágina, 'apoiar')}>${ícone(raiz, 'apoiar')}<span>Apoiar por Pix</span></a>
    </nav>
  </header>
  <main id="conteúdo" class="conteúdo" tabindex="-1">
${conteúdo.trim()}
  </main>${incluirFaixaDeApoio ? montarFaixaDeApoio(raiz) : ''}
${montarRodapé({ raiz, configuração, marcaHtml, ano, versão })}
${montarNavegaçãoInferior(raiz, chaveDaPágina)}
${montarMenuMais(raiz)}
${montarConsentimento(raiz)}
  <div class="região-de-mensagens não-imprimir" role="status" aria-live="polite" data-região-de-mensagens></div>
</body>
</html>
`;
}

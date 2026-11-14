/** Página pública e marcação do painel para o registro de atualizações. */
import { ícone } from '../scripts/núcleo/ícones.js';
const esc = (value) => String(value ?? '').replace(/[&<>"']/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function gerarPaginaAtualizacoes(ctx = {}, { itens = [] } = {}) {
  const en = ctx.código === 'en' || ctx.codigo === 'en';
  const título = en ? 'Updates and improvements' : 'Atualizações e melhorias';
  const descrição = en
    ? 'Follow new tools, improvements and fixes across the portal.'
    : 'Acompanhe ferramentas novas, melhorias e correções do portal.';
  const posts = (Array.isArray(itens) ? itens : []).filter((item) => (item?.estado === undefined || item.estado === 'publicado') && (!item?.publicado_em || Date.parse(item.publicado_em) <= Date.now())).map((item) => {
    const lingua = en ? item.en : null;
    const tituloPost = lingua?.titulo || item.pt?.titulo || '';
    const resumoPost = lingua?.resumo || item.pt?.resumo || '';
    const conteudoPost = lingua?.conteudo || item.pt?.conteudo || '';
    const data = item.publicado_em && !Number.isNaN(Date.parse(item.publicado_em)) ? new Date(item.publicado_em).toISOString() : '';
    const dataVisivel = data ? new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(data)) : '';
    const parágrafos = conteudoPost.split(/\n\s*\n|\r?\n/u).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
    const nomeCategoria = { novo: en ? 'New' : 'Novidade', melhoria: en ? 'Improvement' : 'Melhoria', correcao: en ? 'Fix' : 'Correção' }[item.categoria] || (en ? 'Update' : 'Atualização');
    return `<li class="atualizacoes__item" data-categoria="${esc(item.categoria)}"><article class="atualizacoes__cartao" id="${esc(item.slug)}"><div class="atualizacoes__meta"><span class="atualizacoes__categoria atualizacoes__categoria--${esc(item.categoria)}">${nomeCategoria}</span><span class="atualizacoes__versao">${item.versao ? `v${esc(item.versao)}` : ''}</span></div><time class="atualizacoes__data"${data ? ` datetime="${esc(data)}"` : ''}>${esc(dataVisivel)}</time><h3>${esc(tituloPost)}</h3><p class="atualizacoes__resumo">${esc(resumoPost)}</p><details class="atualizacoes__detalhes"><summary>${en ? 'Read update' : 'Ler atualização'}</summary><div class="atualizacoes__texto">${parágrafos}</div></details></article></li>`;
  }).join('');
  const conteúdo = `<section class="largura atualizacoes" id="atualizacoes">
    <header class="atualizacoes__abertura">
      <div class="atualizacoes__intro">
        <p class="rótulo">${en ? 'FIELD NOTES · PORTAL' : 'CADERNO DE BORDO · PORTAL'}</p>
        <h1>${esc(título)}</h1>
        <p>${esc(descrição)}</p>
        <a class="atualizacoes__atalho" href="#lista-atualizacoes">${en ? 'Browse the timeline' : 'Percorrer a linha do tempo'} ${ícone('seta-baixo', { tamanho: 16 })}</a>
      </div>
      <div class="atualizacoes__ilustracao" aria-hidden="true">
        <div class="atualizacoes__folha">
          <span class="atualizacoes__folha-cabecalho"><i></i><i></i><i></i></span>
          <span class="atualizacoes__grafico"><i></i><i></i><i></i><i></i><i></i><b></b></span>
          <span class="atualizacoes__traco"></span><span class="atualizacoes__traco atualizacoes__traco--curto"></span>
          <span class="atualizacoes__selo">${ícone('seta-diagonal', { tamanho: 20 })}</span>
        </div>
        <span class="atualizacoes__nota">${en ? 'small steps, useful tools' : 'passos pequenos, ferramentas úteis'}</span>
      </div>
    </header>
    <section class="atualizacoes__corpo" aria-labelledby="titulo-lista-atualizacoes">
      <div class="atualizacoes__barra">
        <div><p class="rótulo">${en ? 'CHANGELOG' : 'REGISTRO DE MUDANÇAS'}</p><h2 id="titulo-lista-atualizacoes">${en ? 'What changed' : 'O que mudou'}</h2></div>
        <div class="atualizacoes__filtros" role="group" aria-label="${en ? 'Filter updates' : 'Filtrar atualizações'}">
          <button type="button" data-filtro="todas" aria-pressed="true">${en ? 'All' : 'Todas'}</button>
          <button type="button" data-filtro="novo" aria-pressed="false">${en ? 'New' : 'Novidades'}</button>
          <button type="button" data-filtro="melhoria" aria-pressed="false">${en ? 'Improved' : 'Melhorias'}</button>
          <button type="button" data-filtro="correcao" aria-pressed="false">${en ? 'Fixed' : 'Correções'}</button>
        </div>
      </div>
      <p class="atualizacoes__estado" id="estado-atualizacoes" role="status" aria-live="polite">${posts ? '' : (en ? 'No published updates yet.' : 'Ainda não há atualizações publicadas.')}</p>
      <button class="botão botão--linha atualizacoes__tentar" id="tentar-atualizacoes" type="button" hidden>${en ? 'Try again' : 'Tentar novamente'}</button>
      <ol class="atualizacoes__linha" id="lista-atualizacoes" aria-label="${en ? 'Portal updates' : 'Atualizações do portal'}">${posts}</ol>
      <div class="atualizacoes__vazio" id="vazio-atualizacoes"${posts ? ' hidden' : ''}><span aria-hidden="true">${ícone('estrela', { tamanho: 24 })}</span><p>${en ? 'No updates in this category yet.' : 'Ainda não há atualizações nesta categoria.'}</p></div>
    </section>
    <footer class="atualizacoes__rodape"><span>${en ? 'A living log of the work behind the tools.' : 'Um registro vivo do trabalho por trás das ferramentas.'}</span><a href="./ferramentas.html">${en ? 'Explore the tools' : 'Explorar as ferramentas'} ${ícone('seta-diagonal', { tamanho: 14 })}</a></footer>
  </section>`;
  return { título, descrição, conteúdo, scripts: ['páginas/atualizacoes.js'], estilos: ['atualizacoes.css'] };
}

/** Conteúdo interno do painel; inserir dentro do quadro padrão de conta/admin. */
export function gerarConteudoAdminAtualizacoes(ctx = {}) {
  const en = ctx.código === 'en' || ctx.codigo === 'en';
  const t = en ? {
    lista: 'Published and draft entries', novo: 'New update', exportar: 'Export blog JSON',
    orientação: 'When the API is unavailable, changes stay in this browser. Export the JSON, review it, and publish it with the site.',
    pt: 'Português · obrigatório', inglês: 'English · optional', título: 'Title', resumo: 'Summary', conteúdo: 'Content · one paragraph per line',
    categoria: 'Category', versão: 'Version', slug: 'URL slug', rascunho: 'Draft', publicado: 'Published', salvar: 'Save draft', publicar: 'Publish',
    atualizar: 'Save changes', cancelar: 'Cancel', prévia: 'Preview', excluir: 'Remove', conflito: 'Revision', local: 'Local draft',
  } : {
    lista: 'Publicações e rascunhos', novo: 'Nova atualização', exportar: 'Exportar JSON do blog',
    orientação: 'Se a API estiver indisponível, as alterações ficam neste navegador. Exporte o JSON, revise e publique junto com o site.',
    pt: 'Português · obrigatório', inglês: 'English · opcional', título: 'Título', resumo: 'Resumo', conteúdo: 'Conteúdo · um parágrafo por linha',
    categoria: 'Categoria', versão: 'Versão', slug: 'Slug do endereço', rascunho: 'Rascunho', publicado: 'Publicado', salvar: 'Salvar rascunho', publicar: 'Publicar',
    atualizar: 'Salvar alterações', cancelar: 'Cancelar', prévia: 'Pré-visualizar', excluir: 'Remover', conflito: 'Revisão', local: 'Rascunho local',
  };
  const field = (name, label, max, area = false, required = false) => `<label class="conta__campo"><span>${esc(label)}</span>${area
    ? `<textarea name="${name}" rows="${name.includes('conteudo') ? 7 : 3}" maxlength="${max}"${required ? ' required' : ''}></textarea>`
    : `<input name="${name}" maxlength="${max}"${required ? ' required' : ''}>`}</label>`;
  return `<section class="admin-atualizacoes" id="admin-atualizacoes">
    <p class="suave pequeno admin-atualizacoes__orientacao">${esc(t.orientação)}</p>
    <div class="ações admin-atualizacoes__topo"><button class="botão botão--linha" type="button" id="nova-atualizacao">${esc(t.novo)}</button><button class="botão botão--texto" type="button" id="exportar-atualizacoes">${esc(t.exportar)}</button><a class="botão botão--texto" href="https://github.com/AnderHonorato/Site-de-Renda-Passiva/edit/ander-flow/v1/portal/dados/atualizacoes.json" target="_blank" rel="noopener noreferrer">${en ? 'Edit source on GitHub' : 'Editar fonte no GitHub'}</a></div>
    <p class="admin-atualizacoes__conexao" id="status-admin-atualizacoes" role="status" aria-live="polite"></p>
    <div class="admin-atualizacoes__lista" id="lista-admin-atualizacoes" aria-label="${esc(t.lista)}"></div>
    <form id="form-admin-atualizacao" class="conta__form admin-atualizacoes__form" hidden>
      <fieldset><legend>${esc(t.pt)}</legend>${field('titulo_pt',t.título,120,false,true)}${field('resumo_pt',t.resumo,300,true,true)}${field('conteudo_pt',t.conteúdo,12000,true,true)}</fieldset>
      <fieldset><legend>${esc(t.inglês)}</legend>${field('titulo_en',t.título,120)}${field('resumo_en',t.resumo,300,true)}${field('conteudo_en',t.conteúdo,12000,true)}</fieldset>
      <div class="admin-atualizacoes__grid">
        <label class="conta__campo"><span>${esc(t.categoria)}</span><select name="categoria" required><option value="novo">${en ? 'New' : 'Novidade'}</option><option value="melhoria">${en ? 'Improvement' : 'Melhoria'}</option><option value="correcao">${en ? 'Fix' : 'Correção'}</option></select></label>
        <label class="conta__campo"><span>${esc(t.versão)}</span><input name="versao" maxlength="40" placeholder="1.2.0" required></label>
        <label class="conta__campo"><span>${esc(t.slug)}</span><input name="slug" maxlength="80" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required></label>
      </div>
      <label class="conta__campo"><span>${en ? 'Publication date and time' : 'Data e hora da publicação'}</span><input name="publicado_em" type="datetime-local" required></label>
      <p class="admin-atualizacoes__revisao" id="revisao-atualizacao"></p>
      <div class="ações"><button class="botão" type="submit" name="acao" value="rascunho">${esc(t.salvar)}</button><button class="botão" type="submit" name="acao" value="publicado">${esc(t.publicar)}</button><button class="botão botão--linha" type="button" id="prever-atualizacao">${esc(t.prévia)}</button><button class="botão botão--texto" type="button" id="cancelar-atualizacao">${esc(t.cancelar)}</button></div>
    </form>
    <section class="admin-atualizacoes__preview" id="preview-atualizacao" aria-label="${esc(t.prévia)}" hidden></section>
    <p class="admin-atualizacoes__semantica pequeno suave">${esc(t.conflito)}: alterações concorrentes são detectadas pela revisão. ${esc(t.local)}.</p>
  </section>`;
}

import { api, en, estado, obterSessao, mensagemErro } from './comum.js';
import { carregarAtualizacoes } from '../../núcleo/atualizacoes.js';

const form = document.getElementById('form-admin-atualizacao');
const lista = document.getElementById('lista-admin-atualizacoes');
const informacao = document.getElementById('status-admin-atualizacoes');
const preview = document.getElementById('preview-atualizacao');
const LOCAL = 'portal.atualizacoes.rascunhos.v1';
const idioma = en ? 'en' : 'pt-BR';
const t = (pt, english) => en ? english : pt;
let itens = [], editando = null, offline = false, ocupado = false;

function avisar(texto, erro = false) {
  informacao.textContent = texto;
  informacao.dataset.erro = erro ? 'sim' : 'não';
  estado(texto, erro);
}
function localLer() {
  try { const valor = JSON.parse(localStorage.getItem(LOCAL) || '[]'); return Array.isArray(valor) ? valor : []; }
  catch { return []; }
}
function localSalvar() { localStorage.setItem(LOCAL, JSON.stringify(itens.filter((item) => item.alteradoLocal || String(item.id).startsWith('local-')))); }
function erroOffline(erro) {
  if ([401, 403].includes(erro?.status)) return false;
  return erro?.indisponivel === true || erro?.status === 404 || !navigator.onLine;
}
function getItem(retorno) { return retorno?.item || retorno?.atualizacao || retorno; }

function rotulo(item) {
  return item?.[idioma]?.titulo || item?.pt?.titulo || t('Atualização sem título', 'Untitled update');
}
function renderizar() {
  form.querySelector('[type="submit"][value="publicado"]').textContent = offline
    ? t('Preparar para publicação', 'Prepare for publication') : t('Publicar', 'Publish');
  lista.replaceChildren();
  const visiveis = itens.filter((item) => !item.deletedLocal);
  if (!visiveis.length) {
    const vazio = document.createElement('p'); vazio.className = 'suave';
    vazio.textContent = t('Nenhum item criado. As publicações do site continuam disponíveis.', 'No entries yet. The published site content remains available.');
    lista.append(vazio); return;
  }
  for (const item of [...visiveis].sort((a, b) => String(b.atualizado_em || '').localeCompare(String(a.atualizado_em || '')))) {
    const cartão = document.createElement('article'); cartão.className = 'admin-atualizacoes__item';
    const info = document.createElement('div');
    const nome = document.createElement('strong'); nome.textContent = rotulo(item);
    const meta = document.createElement('p'); meta.className = 'suave pequeno';
    const situação = offline
      ? item.alteradoLocal ? (item.estado === 'publicado' ? t('Pronto para exportar · não publicado no site', 'Ready to export · not published on the site') : t('Rascunho local · não publicado no site', 'Local draft · not published on the site'))
        : t('Feed estático publicado · cópia local', 'Published static feed · local copy')
      : item.estado === 'publicado'
        ? Date.parse(item.publicado_em) > Date.now() ? t('Agendado', 'Scheduled') : t('Publicado', 'Published')
        : t('Rascunho', 'Draft');
    meta.textContent = `${situação} · ${item.categoria || 'novo'} · v${item.versao || '—'} · ${t('revisão', 'revision')} ${item.revisao ?? 0} · #${item.slug || 'sem-slug'}`;
    info.append(nome, meta);
    const acoes = document.createElement('div'); acoes.className = 'ações';
    const editar = document.createElement('button'); editar.type = 'button'; editar.className = 'botão botão--linha'; editar.textContent = t('Editar', 'Edit'); editar.addEventListener('click', () => abrir(item));
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'botão botão--texto'; remover.textContent = t('Remover', 'Remove');
    remover.addEventListener('click', async () => {
      if (ocupado) return;
      if (remover.dataset.confirmar !== 'sim') { remover.dataset.confirmar = 'sim'; remover.textContent = t('Confirmar remoção', 'Confirm removal'); return; }
      ocupado = true; remover.disabled = true;
      try {
        if (offline || String(item.id).startsWith('local-')) {
          if (item.origemEstatica || item.alteradoLocal) {
            itens = itens.map((x) => x.id === item.id ? { id: x.id, deletedLocal: true, alteradoLocal: true } : x);
          } else itens = itens.filter((x) => x.id !== item.id);
          localSalvar();
        } else {
          await api(`/api/admin/atualizacoes/${encodeURIComponent(item.id)}`, { metodo: 'DELETE', dados: { revisao: item.revisao } });
          itens = itens.filter((x) => x.id !== item.id);
        }
        if (editando?.id === item.id) fechar();
        renderizar(); avisar(offline
          ? t('Remoção preparada neste aparelho. Exporte e publique o JSON para alterar o site.', 'Removal prepared on this device. Export and publish the JSON to change the site.')
          : t('Item removido.', 'Entry removed.'));
      } catch (erro) { await falha(erro); remover.disabled = false; }
      finally { ocupado = false; }
    });
    acoes.append(editar, remover); cartão.append(info, acoes); lista.append(cartão);
  }
}

function abrir(item = null) {
  if (ocupado) return;
  editando = item; form.reset(); form.hidden = false; preview.hidden = true; preview.replaceChildren();
  if (!item) delete form.elements.slug.dataset.manual;
  const v = item || {};
  for (const campo of ['titulo', 'resumo', 'conteudo']) {
    form.elements[`${campo}_pt`].value = v.pt?.[campo] || '';
    form.elements[`${campo}_en`].value = v.en?.[campo] || '';
  }
  form.elements.categoria.value = v.categoria || 'novo';
  form.elements.versao.value = v.versao || '';
  form.elements.slug.value = v.slug || '';
  form.elements.publicado_em.value = dataLocal(v.publicado_em || new Date().toISOString());
  document.getElementById('revisao-atualizacao').textContent = item
    ? `${t('Revisão atual', 'Current revision')}: ${item.revisao ?? 0}${offline ? ` · ${t('salvo apenas neste navegador', 'stored in this browser only')}` : ''}`
    : t('Novo item · a revisão começa ao salvar.', 'New entry · revision starts when saved.');
  form.querySelector('[name="titulo_pt"]').focus();
}
function fechar() { form.hidden = true; editando = null; preview.hidden = true; preview.replaceChildren(); }
function dataLocal(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.valueOf())) return '';
  return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function campos() {
  const lido = (nome) => String(form.elements[nome].value || '').trim();
  const item = {
    slug: lido('slug').toLowerCase(), categoria: form.elements.categoria.value,
    versao: lido('versao'), publicado_em: form.elements.publicado_em.value ? new Date(form.elements.publicado_em.value).toISOString() : '',
    pt: { titulo: lido('titulo_pt'), resumo: lido('resumo_pt'), conteudo: lido('conteudo_pt') },
  };
  const english = { titulo: lido('titulo_en'), resumo: lido('resumo_en'), conteudo: lido('conteudo_en') };
  if (Object.values(english).some(Boolean)) item.en = english;
  return item;
}
function guardarLocal(item, statusAlvo = 'rascunho') {
  const agora = new Date().toISOString();
  const salvo = { ...editando, ...item, estado: statusAlvo, id: editando?.id || `local-${crypto.randomUUID()}`,
    revisao: Number(editando?.revisao || 0) + 1, publicado_em: item.publicado_em || editando?.publicado_em || agora, atualizado_em: agora, alteradoLocal: true, origemEstatica: false };
  const pos = itens.findIndex((x) => x.id === salvo.id);
  if (pos < 0) itens.push(salvo); else itens[pos] = salvo;
  offline = true; localSalvar();
  avisar(statusAlvo === 'publicado'
    ? t('Marcado para inclusão no JSON local. Ainda não foi publicado no site; exporte e publique o arquivo.', 'Marked for inclusion in the local JSON. It has not been published on the site; export and publish the file.')
    : t('Rascunho salvo apenas neste navegador. Ele ainda não foi publicado no site.', 'Draft saved in this browser only. It has not been published on the site.'), true);
}
function validar(item) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.slug) || item.slug.length > 80) return t('Use um slug minúsculo com letras, números e hífens (até 80 caracteres).', 'Use a lowercase slug with letters, numbers and hyphens (up to 80 characters).');
  if (!item.publicado_em || !Number.isFinite(Date.parse(item.publicado_em))) return t('Informe uma data de publicação válida.', 'Enter a valid publication date.');
  if (!item.pt.titulo || !item.pt.resumo || !item.pt.conteudo) return t('Preencha título, resumo e conteúdo em português.', 'Fill in the Portuguese title, summary and content.');
  if (item.en && Object.values(item.en).some(Boolean) && Object.values(item.en).some((valor) => !valor)) return t('Preencha título, resumo e conteúdo em inglês ou deixe os três vazios.', 'Fill in all English fields or leave all three blank.');
  if (offline && itens.some((existente) => existente.id !== editando?.id && !existente.deletedLocal && existente.slug === item.slug)) return t('Esse slug já está em uso no feed ou nos rascunhos locais.', 'That slug is already used in the feed or local drafts.');
  for (const [idioma, campos] of [['pt', item.pt], ['en', item.en]]) if (campos) {
    if (campos.titulo.length > 120 || campos.resumo.length > 300 || campos.conteudo.length > 12000) return t(`Confira os limites de texto em ${idioma}.`, `Check the ${idioma} text limits.`);
  }
  return '';
}
function prévia() {
  const item = campos(); const lng = item[idioma] || item.pt;
  preview.replaceChildren();
  const topo = document.createElement('p'); topo.className = 'rótulo'; topo.textContent = `${item.categoria.toUpperCase()} · v${item.versao || '—'}`;
  const título = document.createElement('h3'); título.textContent = lng.titulo || t('Título da atualização', 'Update title');
  const resumo = document.createElement('p'); resumo.textContent = lng.resumo || '';
  preview.append(topo, título, resumo);
  for (const paragrafo of lng.conteudo.split(/\n\s*\n|\r?\n/u).map((s) => s.trim()).filter(Boolean)) { const p = document.createElement('p'); p.textContent = paragrafo; preview.append(p); }
  preview.hidden = false;
}
function baixarExportacao() {
  const pacote = { itens: itens.filter((item) => !item.deletedLocal && item.estado === 'publicado').map((item) => ({
    id: item.id, slug: item.slug, categoria: item.categoria, versao: item.versao,
    publicado_em: item.publicado_em, atualizado_em: item.atualizado_em || item.publicado_em,
    pt: item.pt, ...(item.en ? { en: item.en } : {}),
  })) };
  const arquivo = new Blob([`${JSON.stringify(pacote, null, 2)}\n`], { type: 'application/json' });
  const href = URL.createObjectURL(arquivo), link = document.createElement('a');
  link.href = href; link.download = 'atualizacoes.json'; link.click(); URL.revokeObjectURL(href);
  avisar(t('JSON exportado com itens marcados para publicação. Revise e publique o arquivo no GitHub; exportar não publica no site.', 'JSON exported with entries marked for publication. Review and publish the file on GitHub; exporting does not publish on the site.'));
}
async function falha(erro) {
  if (erro?.message === 'atualizacao_duplicada') {
    avisar(t('Esse slug já está em uso. Escolha outro endereço para a atualização.', 'That slug is already used. Choose another update address.'), true);
    return;
  }
  if (erroOffline(erro)) {
    offline = true;
    avisar(t('API indisponível. Você está editando rascunhos locais; eles não são publicados no site.', 'API unavailable. You are editing local drafts; they are not published on the site.'), true);
    return;
  }
  if (erro?.status === 409 || ['atualizacao_desatualizada', 'revisao_desatualizada'].includes(erro?.message)) {
    try { const resultado = await api('/api/admin/atualizacoes'); itens = resultado.itens || []; renderizar(); }
    catch { /* O item continua aberto para cópia e exportação local manual. */ }
    avisar(t('Este item mudou em outra edição. A lista foi atualizada; reabra a versão mais recente antes de salvar.', 'This entry changed elsewhere. The list was refreshed; reopen the latest version before saving.'), true);
    return;
  }
  avisar(mensagemErro(erro), true);
}
async function carregar() {
  try {
    const resultado = await api('/api/admin/atualizacoes');
    itens = Array.isArray(resultado.itens) ? resultado.itens : [];
    offline = false;
    const locais = localLer();
    if (locais.length) avisar(t(`${locais.length} rascunho(s) local(is) continuam neste navegador e podem ser exportados.`, `${locais.length} local draft(s) remain in this browser and can be exported.`));
  } catch (erro) {
    if (!erroOffline(erro)) throw erro;
    const locais = localLer();
    let estáticos = [];
    try { estáticos = (await carregarAtualizacoes()).itens.map((item) => ({ ...item, estado: 'publicado', origemEstatica: true })); }
    catch { /* Exportação ainda funciona com os rascunhos armazenados localmente. */ }
    const alteracoes = new Map(locais.map((item) => [item.id, item]));
    itens = [...estáticos.filter((item) => !alteracoes.has(item.id)), ...locais];
    offline = true;
    avisar(t('API indisponível. Feed estático e alterações locais exibidos para exportação; o que for exportado não foi publicado no site.', 'API unavailable. Static feed and local changes are shown for export; exported changes are not published on the site.'), true);
  }
  renderizar();
}

try {
  let sessao = null, erroSessao = null;
  try { sessao = await obterSessao(); } catch (erro) { erroSessao = erro; }
  if (sessao?.usuario?.papel === 'admin') await carregar();
  else {
    // Sem sessão, só abrir o editor local se o endpoint administrativo realmente não estiver disponível.
    // Respostas 401/403 significam que a API está presente e mantêm a exigência de autenticação.
    let indisponivel = false;
    try { await api('/api/admin/atualizacoes'); }
    catch (erro) { indisponivel = erroOffline(erro); }
    if (!indisponivel) { location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`); throw new Error('admin_required'); }
    offline = true;
    const locais = localLer();
    let estáticos = [];
    try { estáticos = (await carregarAtualizacoes()).itens.map((item) => ({ ...item, estado: 'publicado', origemEstatica: true })); } catch { /* A cópia local ainda pode ser gerenciada e exportada. */ }
    const alteracoes = new Map(locais.map((item) => [item.id, item]));
    itens = [...estáticos.filter((item) => !alteracoes.has(item.id)), ...locais];
    avisar(t('API administrativa indisponível. Editor local: nada aqui altera o site até exportar e publicar o JSON.', 'Admin API unavailable. Local editor: nothing here changes the site until you export and publish the JSON.'), true);
  }
  if (offline || sessao?.usuario?.papel === 'admin') {
    renderizar();
    document.getElementById('nova-atualizacao').addEventListener('click', () => abrir());
    document.getElementById('exportar-atualizacoes').addEventListener('click', baixarExportacao);
    document.getElementById('cancelar-atualizacao').addEventListener('click', fechar);
    document.getElementById('prever-atualizacao').addEventListener('click', prévia);
    form.addEventListener('input', (event) => {
      if (event.target.name?.endsWith('_pt') && event.target.name !== 'conteudo_pt') {
        const slug = form.elements.slug;
        if (!editando && event.target.name === 'titulo_pt' && !slug.dataset.manual) slug.value = event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 80);
      }
    });
    form.elements.slug.addEventListener('input', () => { form.elements.slug.dataset.manual = 'sim'; });
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault(); if (ocupado) return;
      const item = campos(), erro = validar(item);
      if (erro) { avisar(erro, true); return; }
      const estadoNovo = evento.submitter?.value === 'publicado' ? 'publicado' : 'rascunho';
      const corpo = { ...item, estado: estadoNovo, ...(editando?.revisao !== undefined ? { revisao: editando.revisao } : {}) };
      ocupado = true; const botão = evento.submitter; if (botão) botão.disabled = true;
      try {
        if (offline || editando && String(editando.id).startsWith('local-')) {
          guardarLocal(corpo, estadoNovo);
        } else {
          const caminho = editando ? `/api/admin/atualizacoes/${encodeURIComponent(editando.id)}` : '/api/admin/atualizacoes';
          const resultado = await api(caminho, { metodo: editando ? 'PUT' : 'POST', dados: corpo });
          const salvo = getItem(resultado);
          if (!salvo?.id) throw new Error('resposta_invalida');
          if (editando) itens = itens.map((x) => x.id === salvo.id ? salvo : x); else itens.push(salvo);
          editando = salvo;
          avisar(estadoNovo === 'publicado'
            ? Date.parse(salvo.publicado_em) > Date.now() ? t('Atualização agendada.', 'Update scheduled.') : t('Atualização publicada.', 'Update published.')
            : t('Rascunho salvo.', 'Draft saved.'));
        }
        fechar(); renderizar();
      } catch (e) {
        if (erroOffline(e)) {
          offline = true;
          try { guardarLocal(corpo, estadoNovo); fechar(); renderizar(); }
          catch { avisar(t('Não foi possível salvar neste aparelho. O texto continua no formulário para você copiar ou tentar novamente.', 'This device could not save the draft. Your text is still in the form to copy or retry.'), true); }
        }
        else await falha(e);
      }
      finally { ocupado = false; if (botão) botão.disabled = false; }
    });
  }
} catch (erro) { if (erro.message !== 'admin_required') avisar(mensagemErro(erro), true); }

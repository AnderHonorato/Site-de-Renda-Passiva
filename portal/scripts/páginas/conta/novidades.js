import { api, dados, en, estado, mensagemErro, obterSessao } from './comum.js';

const texto = (pt,english)=>en ? english : pt;
const form = document.getElementById('form-novidade');
const lista = document.getElementById('lista-novidades');
let editando = null, ocupado = false;
const campos = ['titulo_pt','texto_pt','titulo_en','texto_en','botao_pt','botao_en','alt_pt','alt_en','url','ordem'];
const dataLocal = valor => {
  if (!valor) return '';
  const data = new Date(valor); return new Date(data.getTime()-data.getTimezoneOffset()*60000).toISOString().slice(0,16);
};

function editar(item = null) {
  if (ocupado) return;
  editando = item; form.reset(); form.hidden = false;
  for (const campo of campos) form.elements[campo].value = item?.[campo] ?? (campo === 'ordem' ? 0 : '');
  for (const campo of ['publicar_em','retirar_em']) form.elements[campo].value = dataLocal(item?.[campo]);
  form.elements.ativo.checked = !!item?.ativo;
  form.elements.titulo_pt.focus();
}

function valores() {
  const b = dados(form);
  return { ...Object.fromEntries(campos.map(c=>[c,b[c]])),ordem:Number(b.ordem),ativo:form.elements.ativo.checked,versao:editando?.versao,
    publicar_em:b.publicar_em ? new Date(b.publicar_em).toISOString() : null, retirar_em:b.retirar_em ? new Date(b.retirar_em).toISOString() : null };
}

function erroClaro(e) {
  const mensagens = {
    novidade_desatualizada: texto('Outra alteração foi salva. Atualize a lista e abra novamente o item.','Another change was saved. Refresh the list and reopen the item.'),
    limite_novidades: texto('Desative um item antes de ultrapassar 20 novidades ligadas.','Disable an item before exceeding 20 enabled news items.'),
    alt_obrigatorio: texto('Descreva a imagem nos dois idiomas.','Describe the image in both languages.'),
    link_invalido: texto('Use um endereço interno começando com /, fora do admin e da API.','Use an internal address starting with /, outside admin and API.'),
    data_invalida: texto('Confira as datas; a retirada precisa acontecer depois da publicação.','Check dates; withdrawal must be after publication.'),
  };
  return mensagens[e.message] || mensagemErro(e);
}

async function imagem(item, arquivo, remover) {
  const csrf = document.cookie.split('; ').find(x=>/^(__Host-)?csrf=/u.test(x))?.split('=')[1] || '';
  const r = await fetch(`/api/admin/novidades/${item.id}/imagem`, { method:remover ? 'DELETE' : 'POST',credentials:'same-origin',signal:AbortSignal.timeout(10000),
    headers:{'X-CSRF-Token':decodeURIComponent(csrf),'X-Novidade-Versao':String(item.versao),...(arquivo ? {'Content-Type':arquivo.type} : {})},body:remover ? undefined : arquivo });
  const b = await r.json(); if (!r.ok) throw new Error(b.erro); return b.item;
}

async function atualizar() {
  const b = await api('/api/admin/novidades'); lista.replaceChildren();
  if (!b.itens.length) { const p = document.createElement('p'); p.textContent = texto('Nenhuma novidade criada. A apresentação atual continua disponível.','No news created. The existing presentation remains available.'); lista.append(p); }
  for (const item of b.itens) {
    const artigo = document.createElement('article'); artigo.className = 'painel conta__denuncia';
    const titulo = document.createElement('b'); titulo.textContent = `${item.ordem} · ${en ? item.titulo_en : item.titulo_pt}`;
    const status = document.createElement('p');
    const situacao = !item.ativo ? texto('Rascunho','Draft') : item.retirar_em && Date.parse(item.retirar_em) <= Date.now() ? texto('Retirada','Withdrawn') : item.publicar_em && Date.parse(item.publicar_em) > Date.now() ? texto('Agendada','Scheduled') : texto('Publicada','Published');
    status.textContent = `${situacao}${item.publicar_em ? ' · '+new Date(item.publicar_em).toLocaleString(en ? 'en' : 'pt-BR') : ''}`;
    const acoes = document.createElement('div'); acoes.className = 'ações';
    const abrir = document.createElement('button'); abrir.type = 'button'; abrir.className = 'botão botão--linha'; abrir.textContent = texto('Editar','Edit'); abrir.addEventListener('click',()=>editar(item));
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'botão botão--texto'; remover.textContent = texto('Remover','Remove');
    remover.addEventListener('click',async()=>{
      if (ocupado) return;
      if (remover.dataset.confirmar !== 'sim') { remover.dataset.confirmar = 'sim'; remover.textContent = texto('Confirmar remoção','Confirm removal'); return; }
      ocupado = true; remover.disabled = true;
      try { await api(`/api/admin/novidades/${item.id}`,{metodo:'DELETE',dados:{versao:item.versao}}); if (editando?.id === item.id) { editando = null; form.hidden = true; } await atualizar(); estado(texto('Novidade removida.','News removed.')); }
      catch (e) { estado(erroClaro(e),true); remover.disabled = false; }
      finally { ocupado = false; }
    });
    acoes.append(abrir,remover); artigo.append(titulo,status,acoes); lista.append(artigo);
  }
}

try {
  if ((await obterSessao()).usuario?.papel !== 'admin') location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`);
  else {
    await atualizar();
    document.getElementById('nova-novidade').addEventListener('click',()=>editar());
    document.getElementById('cancelar-novidade').addEventListener('click',()=>{ if (!ocupado) { form.hidden = true; editando = null; } });
    form.addEventListener('submit',async ev=>{
      ev.preventDefault(); if (ocupado) return;
      const arquivo = form.elements.imagem.files[0];
      if (arquivo && (arquivo.size > 1048576 || !['image/png','image/jpeg','image/webp'].includes(arquivo.type))) { estado(texto('Use PNG, JPEG ou WebP até 1 MB.','Use PNG, JPEG or WebP up to 1 MB.'),true); return; }
      const b = valores(), remover = form.elements.remover_imagem.checked;
      if (arquivo && (!b.alt_pt || !b.alt_en)) { estado(erroClaro(new Error('alt_obrigatorio')),true); return; }
      ocupado = true; const botao = form.querySelector('[type="submit"]'); botao.disabled = true;
      try {
        // Com imagem, salva primeiro como rascunho. Uma falha no envio não publica um item incompleto.
        const precisaImagem = arquivo || remover;
        let r = await api(editando ? `/api/admin/novidades/${editando.id}` : '/api/admin/novidades',{metodo:editando ? 'PUT' : 'POST',dados:{...b,ativo:precisaImagem ? false : b.ativo}});
        editando = r.item;
        if (precisaImagem) {
          editando = await imagem(editando,arquivo,remover && !arquivo);
          if (b.ativo) { r = await api(`/api/admin/novidades/${editando.id}`,{metodo:'PUT',dados:{...b,versao:editando.versao}}); editando = r.item; }
        }
        form.hidden = true; editando = null; await atualizar(); estado(texto('Novidade salva.','News saved.'));
      } catch (e) { estado(erroClaro(e),true); if (editando) form.elements.ativo.checked = editando.ativo; }
      finally { ocupado = false; botao.disabled = false; }
    });
    document.getElementById('prever-novidade').addEventListener('click',async()=>{
      try { const b = valores(),lingua = en ? 'en' : 'pt'; const { abrirBoasVindas } = await import('../início/boas-vindas.js');
        abrirBoasVindas({lembrar:false,itens:[{titulo:b[`titulo_${lingua}`],texto:b[`texto_${lingua}`],botao:b[`botao_${lingua}`],url:b.url,alt:b[`alt_${lingua}`],imagem_url:form.elements.remover_imagem.checked ? null : editando?.imagem_url}]});
      } catch (e) { estado(erroClaro(e),true); }
    });
  }
} catch (e) { estado(erroClaro(e),true); }

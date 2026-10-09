import { api, en, estado, mensagemErro, obterSessao } from './comum.js';
let limiteAtual = 0;
let paginaAtual = 1;

try {
  const sessao = await obterSessao();
  if (!sessao.usuario) location.replace(`../entrar.html?volta=${encodeURIComponent(location.pathname)}`);
  else await carregar();
} catch (erro) {
  estado(mensagemErro(erro), true);
}

function dataCurta(valor) {
  try {
    return new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
  } catch {
    return valor || '';
  }
}

function botao(rotulo, classe = 'botão botão--linha') {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = classe;
  item.textContent = rotulo;
  return item;
}

function cartão(trabalho) {
  const item = document.createElement('article');
  item.className = 'painel conta__trabalho';

  const topo = document.createElement('div');
  topo.className = 'conta__trabalho-topo';
  const textos = document.createElement('div');
  const titulo = document.createElement('h2');
  titulo.textContent = trabalho.titulo;
  const meta = document.createElement('p');
  meta.className = 'pequeno suave';
  meta.textContent = `${trabalho.ferramenta_nome} · ${en ? 'updated' : 'atualizado'} ${dataCurta(trabalho.atualizado_em)}`;
  textos.append(titulo, meta);

  const ações = document.createElement('div');
  ações.className = 'conta__ações';
  const reabrir = document.createElement('a');
  reabrir.className = 'botão';
  const raizSite = document.documentElement.dataset.raiz || '../';
  reabrir.href = `${raizSite}f/${trabalho.ferramenta_slug}/?trabalho=${trabalho.id}`;
  reabrir.textContent = en ? 'Reopen' : 'Reabrir';
  const renomear = botao(en ? 'Rename' : 'Renomear');
  const apagar = botao(en ? 'Delete' : 'Apagar', 'botão botão--texto');
  ações.append(reabrir, renomear, apagar);
  topo.append(textos, ações);

  const form = document.createElement('form');
  form.className = 'conta__form conta__renomear';
  form.hidden = true;
  const label = document.createElement('label');
  label.className = 'conta__campo';
  const span = document.createElement('span');
  span.textContent = en ? 'Work name' : 'Nome do trabalho';
  const input = document.createElement('input');
  input.name = 'titulo';
  input.maxLength = 120;
  input.required = true;
  input.value = trabalho.titulo;
  label.append(span, input);
  const salvar = document.createElement('button');
  salvar.className = 'botão';
  salvar.type = 'submit';
  salvar.textContent = en ? 'Save name' : 'Salvar nome';
  const cancelar = botao(en ? 'Cancel' : 'Cancelar');
  form.append(label, salvar, cancelar);

  renomear.addEventListener('click', () => {
    form.hidden = false;
    input.focus();
    input.select();
  });
  cancelar.addEventListener('click', () => {
    input.value = trabalho.titulo;
    form.hidden = true;
  });
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    salvar.disabled = true;
    try {
      const resposta = await api(`/api/trabalhos/${trabalho.id}`, { metodo: 'PATCH', dados: { titulo: input.value } });
      trabalho.titulo = resposta.trabalho.titulo;
      titulo.textContent = trabalho.titulo;
      form.hidden = true;
      estado(en ? 'Work renamed.' : 'Trabalho renomeado.');
    } catch (erro) {
      estado(mensagemErro(erro), true);
    } finally {
      salvar.disabled = false;
    }
  });
  apagar.addEventListener('click', async () => {
    const confirmar = window.confirm(en ? 'Delete this saved work? This cannot be undone.' : 'Apagar este trabalho salvo? Esta ação não pode ser desfeita.');
    if (!confirmar) return;
    apagar.disabled = true;
    try {
      await api(`/api/trabalhos/${trabalho.id}`, { metodo: 'DELETE' });
      item.remove();
      estado(en ? 'Work deleted.' : 'Trabalho apagado.');
      await carregar();
    } catch (erro) {
      estado(mensagemErro(erro), true);
      apagar.disabled = false;
    }
  });

  item.append(topo, form);
  return item;
}

async function atualizarResumo() {
  const resposta = await api(`/api/trabalhos?pagina=${paginaAtual}`);
  limiteAtual = resposta.limite ?? 0;
  const resumo = document.getElementById('trabalhos-resumo');
  if (resumo) resumo.textContent = en
    ? `${resposta.total??resposta.trabalhos.length} of ${limiteAtual} saved works used.`
    : `${resposta.total??resposta.trabalhos.length} de ${limiteAtual} trabalhos salvos usados.`;
  if(resumo&&resposta.armazenamento){const a=resposta.armazenamento;resumo.textContent+=` · ${(a.usado/1024).toLocaleString(en?'en':'pt-BR',{maximumFractionDigits:1})} / ${(a.maximo/1024).toLocaleString(en?'en':'pt-BR')} KiB`;}
  return resposta;
}

async function carregar() {
  const area = document.getElementById('lista-trabalhos');
  area.replaceChildren();
  const resposta = await atualizarResumo();
  if(paginaAtual>1&&paginaAtual>(resposta.paginas||1)){paginaAtual--;return carregar();}
  let paginas=document.getElementById('trabalhos-paginas');if(!paginas){paginas=document.createElement('div');paginas.id='trabalhos-paginas';paginas.className='ações';area.after(paginas);}paginas.replaceChildren();
  if((resposta.paginas||1)>1){
    const anterior=botao(en?'Previous':'Anterior'),proxima=botao(en?'Next':'Próxima'),info=document.createElement('span');info.textContent=`${paginaAtual} / ${resposta.paginas}`;anterior.disabled=paginaAtual===1;proxima.disabled=paginaAtual===resposta.paginas;
    for(const [b,delta]of [[anterior,-1],[proxima,1]])b.onclick=async()=>{anterior.disabled=proxima.disabled=true;paginaAtual+=delta;try{await carregar();}catch(e){paginaAtual-=delta;estado(mensagemErro(e),true);anterior.disabled=paginaAtual===1;proxima.disabled=paginaAtual===resposta.paginas;}};
    paginas.append(anterior,info,proxima);
  }
  for (const trabalho of resposta.trabalhos) area.append(cartão(trabalho));
  if (!resposta.trabalhos.length) {
    const vazio = document.createElement('div');
    vazio.className = 'conta__vazio';
    const titulo = document.createElement('h2');
    titulo.textContent = en ? 'Nothing saved yet' : 'Nada salvo ainda';
    const texto = document.createElement('p');
    texto.className = 'suave';
    texto.textContent = en
      ? 'Finish a tool result and use “Save work” to keep its values here.'
      : 'Conclua o resultado de uma ferramenta e use “Salvar trabalho” para guardar os valores aqui.';
    vazio.append(titulo, texto);
    area.append(vazio);
  }
}

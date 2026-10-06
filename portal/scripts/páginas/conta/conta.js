import { api, dados, en, estado, ligar, mensagemErro, obterSessao } from './comum.js';
import { aplicarTema, lerTema } from '../../núcleo/preferências.js';
import { criarAvatar } from '../../núcleo/nível.js';

let usuario;
try {
  const sessao = await obterSessao();
  if (!sessao.usuario) location.replace(`../entrar.html?volta=${encodeURIComponent(location.pathname)}`);
  else {
    usuario = sessao.usuario;
    document.getElementById('conta-conteudo').hidden = false;
    if (usuario.papel === 'admin') document.getElementById('conta-admin').hidden = false;
    const contaResposta = await api('/api/conta');
    const conta = contaResposta.usuario || contaResposta.conta || contaResposta;
    const perfilResposta = await api('/api/perfil/' + encodeURIComponent(usuario.usuario)).catch(() => ({}));
    const perfil = perfilResposta.perfil || perfilResposta;
    const form = document.getElementById('form-perfil');
    for (const chave of ['nome', 'usuario', 'bio', 'local']) {
      if (form.elements[chave]) form.elements[chave].value = perfil[chave] ?? conta[chave] ?? usuario[chave] ?? '';
    }
    form.elements.bioVisivel.checked = perfil.visibilidade?.bio === true;
    form.elements.localVisivel.checked = perfil.visibilidade?.local === true;
    form.elements.avatar.value = ['sol', 'folha', 'estrela'].includes(perfil.avatar) ? perfil.avatar : 'sol';
    const atualizarAvatar = () => document.getElementById('avatar-preview').replaceChildren(criarAvatar(form.elements.avatar.value));
    form.elements.avatar.addEventListener('change', atualizarAvatar);
    atualizarAvatar();
    const opcoes = document.getElementById('opcoes-recomendadas');
    const usados = perfil.ferramentas_mais_usadas || [];
    const marcados = new Set(perfil.ferramentas_recomendadas || []);
    for (const ferramenta of usados) {
      const rotulo = document.createElement('label'); rotulo.className = 'conta__aceite';
      const caixa = document.createElement('input'); caixa.type = 'checkbox'; caixa.name = 'ferramenta'; caixa.value = ferramenta.slug; caixa.checked = marcados.has(ferramenta.slug);
      const nome = document.createElement('span'); nome.textContent = `${ferramenta.slug} (${ferramenta.total})`;
      rotulo.append(caixa, nome); opcoes.append(rotulo);
    }
    if (!usados.length) opcoes.textContent = en ? 'Use a tool to make recommendations.' : 'Use uma ferramenta para poder recomendá-la.';
    const preferencias = document.getElementById('form-preferencias');
    preferencias.elements.idioma.value = conta.idioma || document.documentElement.lang;
    preferencias.elements.tema.value = conta.tema || lerTema();
    await carregarAmizades();
  }
} catch (erro) { estado(mensagemErro(erro), true); }

ligar('form-perfil', async (form) => {
  const { nome, bio, local, avatar } = dados(form);
  const visibilidade = { bio: form.elements.bioVisivel.checked, local: form.elements.localVisivel.checked };
  await api('/api/perfil', { metodo: 'PATCH', dados: { nome, bio, local, avatar, visibilidade } });
  estado(en ? 'Profile saved.' : 'Perfil salvo.');
});
ligar('form-recomendadas', async (form) => {
  const selecionadas = [...form.querySelectorAll('input[name="ferramenta"]:checked')].map((item) => item.value);
  if (selecionadas.length > 5) throw new Error('dados_invalidos');
  await api('/api/perfil', { metodo: 'PATCH', dados: { ferramentas_recomendadas: selecionadas } });
  estado(en ? 'Recommendations saved.' : 'Recomendações salvas.');
});
ligar('form-senha', async (form) => {
  await api('/api/conta/senha', { metodo: 'PATCH', dados: dados(form) });
  form.reset();
  estado(en ? 'Password changed.' : 'Senha alterada.');
});
ligar('form-preferencias', async (form) => {
  const preferencias = dados(form);
  await api('/api/conta', { metodo: 'PATCH', dados: preferencias });
  aplicarTema(preferencias.tema);
  estado(en ? 'Preferences saved. Language changes when you open the matching page.' : 'Preferências salvas. O idioma muda ao abrir a página correspondente.');
});
ligar('form-amizade', async (form) => {
  const amigo = dados(form).amigo.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(amigo)) throw new Error('dados_invalidos');
  await api('/api/amizades', { metodo: 'POST', dados: { usuario: amigo } });
  form.reset();
  estado(en ? 'Friend request sent.' : 'Pedido de amizade enviado.');
  await carregarAmizades();
});

async function carregarAmizades() {
  const area = document.getElementById('amizades');
  area.replaceChildren();
  try {
    const resposta = await api('/api/amizades');
    for (const amizade of resposta.amizades || []) {
      const linha = document.createElement('p');
      const nome = document.createElement('a');
      nome.href = `../perfil.html?usuario=${encodeURIComponent(amizade.usuario)}`;
      nome.textContent = `@${amizade.usuario}`;
      linha.append(nome, ` · ${amizade.estado}`);
      if (amizade.estado === 'pendente' && amizade.destino === usuario.id) {
        const aceitar = document.createElement('button'); aceitar.type = 'button'; aceitar.className = 'botão';
        aceitar.textContent = en ? 'Accept' : 'Aceitar';
        aceitar.addEventListener('click', async () => {
          aceitar.disabled = true;
          try { await api('/api/amizades/aceitar', { metodo: 'POST', dados: { usuario: amizade.usuario } }); await carregarAmizades(); }
          catch (erro) { estado(mensagemErro(erro), true); aceitar.disabled = false; }
        });
        linha.append(' ', aceitar);
      }
      area.append(linha);
    }
  } catch (erro) { area.textContent = mensagemErro(erro); }
}

document.getElementById('sair-conta')?.addEventListener('click', async () => {
  try { await api('/api/autenticacao/sair', { metodo: 'POST' }); location.assign('../'); }
  catch (erro) { estado(mensagemErro(erro), true); }
});
document.getElementById('exportar-conta')?.addEventListener('click', async () => {
  try {
    const dadosConta = await api('/api/conta/exportar');
    const url = URL.createObjectURL(new Blob([JSON.stringify(dadosConta, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'meus-dados.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (erro) { estado(mensagemErro(erro), true); }
});
document.getElementById('excluir-conta')?.addEventListener('click', () => {
  const form = document.getElementById('form-excluir');
  form.hidden = false;
  form.elements.senhaExclusao.focus();
});
document.getElementById('cancelar-exclusao')?.addEventListener('click', () => {
  const form = document.getElementById('form-excluir'); form.reset(); form.hidden = true;
});
ligar('form-excluir', async (form) => {
  await api('/api/conta', { metodo: 'DELETE', dados: { senha: form.elements.senhaExclusao.value } });
  form.reset(); location.assign('../');
});

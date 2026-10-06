import { api, en, estado, mensagemErro, obterSessao } from './comum.js';

let permitido = false;
let adminId;
try { const sessao = await obterSessao(); permitido = sessao.usuario?.papel === 'admin'; adminId = sessao.usuario?.id; if (!permitido) location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`); }
catch (erro) { estado(mensagemErro(erro), true); }

if (permitido) {
  try {
    const resposta = await api('/api/admin/usuarios');
    const area = document.getElementById('lista-usuarios');
    for (const u of resposta.usuarios || []) {
      const item = document.createElement('article'); item.className = 'painel conta__denuncia';
      const titulo = document.createElement('b'); titulo.textContent = `${u.nome} · @${u.usuario} · ${u.email}`;
      const form = document.createElement('form'); form.className = 'conta__ações';
      const plano = document.createElement('select'); plano.name = 'plano';
      for (const valor of ['gratuito', 'plus', 'premium']) { const opcao = new Option(valor, valor); plano.add(opcao); }
      plano.value = u.plano;
      const situacao = document.createElement('select'); situacao.name = 'situacao';
      for (const valor of ['ativo', 'suspenso']) { const opcao = new Option(valor, valor); situacao.add(opcao); }
      situacao.value = u.situacao;
      const salvar = document.createElement('button'); salvar.type = 'submit'; salvar.className = 'botão'; salvar.textContent = en ? 'Save' : 'Salvar';
      if (u.id === adminId) { salvar.disabled = true; salvar.title = en ? 'Your own admin account cannot be changed here.' : 'Sua própria conta admin não pode ser alterada aqui.'; }
      form.append(plano, situacao, salvar);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault(); salvar.disabled = true;
        try { await api(`/api/admin/usuarios/${u.id}`, { metodo: 'PATCH', dados: { plano: plano.value, situacao: situacao.value } }); estado(en ? 'User updated.' : 'Usuário atualizado.'); }
        catch (erro) { estado(mensagemErro(erro), true); }
        finally { salvar.disabled = false; }
      });
      item.append(titulo, form); area.append(item);
    }
  } catch (erro) { estado(mensagemErro(erro), true); }
}

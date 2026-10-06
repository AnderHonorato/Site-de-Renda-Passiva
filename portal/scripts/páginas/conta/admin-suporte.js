import { api, en, estado, mensagemErro, obterSessao } from './comum.js';

let permitido = false;
try { permitido = (await obterSessao()).usuario?.papel === 'admin'; if (!permitido) location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`); }
catch (erro) { estado(mensagemErro(erro), true); }

if (permitido) {
  try {
    const resposta = await api('/api/admin/suporte');
    const area = document.getElementById('lista-admin-suporte');
    for (const mensagem of resposta.mensagens || []) {
      const item = document.createElement('article'); item.className = 'painel conta__denuncia';
      const titulo = document.createElement('b'); titulo.textContent = `@${mensagem.usuario} · ${mensagem.assunto}`;
      const texto = document.createElement('p'); texto.textContent = mensagem.texto;
      item.append(titulo, texto);
      if (mensagem.resposta) { const respostaTexto = document.createElement('p'); respostaTexto.textContent = mensagem.resposta; item.append(respostaTexto); }
      else {
        const form = document.createElement('form'); form.className = 'conta__form';
        const campo = document.createElement('textarea'); campo.name = 'resposta'; campo.required = true; campo.minLength = 2; campo.maxLength = 2000; campo.rows = 3;
        campo.setAttribute('aria-label', en ? 'Reply' : 'Resposta');
        const enviar = document.createElement('button'); enviar.className = 'botão'; enviar.type = 'submit'; enviar.textContent = en ? 'Send reply' : 'Enviar resposta';
        form.append(campo, enviar);
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault(); enviar.disabled = true;
          try { await api(`/api/admin/suporte/${mensagem.id}`, { metodo: 'PATCH', dados: { resposta: campo.value } }); form.replaceWith(document.createTextNode(campo.value)); estado(en ? 'Reply sent.' : 'Resposta enviada.'); }
          catch (erro) { estado(mensagemErro(erro), true); enviar.disabled = false; }
        });
        item.append(form);
      }
      area.append(item);
    }
  } catch (erro) { estado(mensagemErro(erro), true); }
}

import { api, dados, en, estado, ligar, mensagemErro, obterSessao } from './comum.js';

try { const sessao = await obterSessao(); if (!sessao.usuario) location.replace(`../entrar.html?volta=${encodeURIComponent(location.pathname)}`); }
catch (erro) { estado(mensagemErro(erro), true); }

async function carregar() {
  const area = document.getElementById('lista-suporte');
  area.replaceChildren();
  try {
    const resposta = await api('/api/suporte');
    for (const mensagem of resposta.mensagens || []) {
      const item = document.createElement('article'); item.className = 'painel conta__denuncia';
      const assunto = document.createElement('h2'); assunto.textContent = mensagem.assunto;
      const texto = document.createElement('p'); texto.textContent = mensagem.texto;
      item.append(assunto, texto);
      if (mensagem.resposta) {
        const respostaTexto = document.createElement('p'); respostaTexto.textContent = `${en ? 'Reply' : 'Resposta'}: ${mensagem.resposta}`;
        item.append(respostaTexto);
      }
      area.append(item);
    }
    if (!area.childElementCount) area.textContent = en ? 'No messages yet.' : 'Nenhuma mensagem ainda.';
  } catch (erro) { estado(mensagemErro(erro), true); }
}
ligar('form-suporte', async (form) => {
  await api('/api/suporte', { metodo: 'POST', dados: dados(form) });
  form.reset(); estado(en ? 'Message sent.' : 'Mensagem enviada.'); await carregar();
});
await carregar();

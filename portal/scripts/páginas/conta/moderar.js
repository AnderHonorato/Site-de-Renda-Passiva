import { api, en, estado, mensagemErro, obterSessao } from './comum.js';

let permitido = false;
try {
  const sessao = await obterSessao();
  permitido = sessao.usuario?.papel === 'admin';
  if (!permitido) location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`);
} catch (erro) { estado(mensagemErro(erro), true); }

async function carregar() {
  if (!permitido) return;
  const lista = document.getElementById('denuncias');
  lista.replaceChildren();
  try {
    const resposta = await api('/api/admin/chat/denuncias');
    const denuncias = resposta.denuncias || [];
    if (!denuncias.length) { lista.textContent = en ? 'No pending reports.' : 'Nenhuma denúncia pendente.'; return; }
    for (const denuncia of denuncias) {
      const item = document.createElement('article'); item.className = 'painel conta__denuncia';
      const titulo = document.createElement('b'); titulo.textContent = `${denuncia.motivo || (en ? 'Report' : 'Denúncia')} · @${denuncia.usuario || '?'} · #${denuncia.id}`;
      const texto = document.createElement('p'); texto.textContent = denuncia.texto || '';
      const midia = denuncia.midia_id ? document.createElement('a') : null;
      if (midia) { midia.className = 'botão botão--linha'; midia.href = `/api/admin/chat/midias/${encodeURIComponent(denuncia.midia_id)}`; midia.target = '_blank'; midia.rel = 'noopener'; midia.textContent = `${en ? 'Reported file' : 'Arquivo denunciado'}: ${denuncia.midia_nome || '#' + denuncia.midia_id}`; }
      const ações = document.createElement('div'); ações.className = 'conta__ações';
      const opcoes = [[en ? 'Dismiss' : 'Dispensar', 'dispensar'], [en ? 'Mute user' : 'Silenciar usuário', 'silenciar'], [en ? 'Ban user' : 'Banir usuário', 'banir']];
      if (denuncia.mensagem_id) opcoes.splice(1, 0, [en ? 'Remove message' : 'Remover mensagem', 'remover']);
      for (const [rotulo, acao] of opcoes) {
        const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'botão'; botao.textContent = rotulo;
        botao.addEventListener('click', async () => {
          botao.disabled = true;
          try { await api(`/api/admin/chat/denuncias/${encodeURIComponent(denuncia.id)}`, { metodo: 'PATCH', dados: { acao } }); await carregar(); }
          catch (erro) { estado(mensagemErro(erro), true); botao.disabled = false; }
        });
        ações.append(botao);
      }
      item.append(titulo, texto); if (midia) item.append(midia); item.append(ações); lista.append(item);
    }
  } catch (erro) { estado(mensagemErro(erro), true); }
}
document.getElementById('atualizar-denuncias')?.addEventListener('click', carregar);
await carregar();

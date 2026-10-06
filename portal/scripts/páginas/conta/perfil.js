import { api, en, estado, mensagemErro, obterSessao } from './comum.js';
import { criarAvatar, criarIconeNivel, criarTempoNaComunidade } from '../../núcleo/nível.js';

const usuario = new URLSearchParams(location.search).get('usuario');
const area = document.getElementById('perfil-pessoa');
const naoEncontrado = en ? 'We could not find this user. They may have deleted their account, changed their name, or blocked you.' : 'Não conseguimos localizar este usuário. Ele pode ter apagado a conta, mudado de nome ou ter bloqueado você.';

if (!usuario || !/^[a-z0-9_]{3,20}$/.test(usuario)) estado(naoEncontrado, true);
else {
  try {
    const sessao = await obterSessao();
    if (!sessao.usuario) location.replace(`entrar.html?volta=${encodeURIComponent(location.pathname + location.search)}`);
    else {
      const resposta = await api(`/api/perfil/${encodeURIComponent(usuario)}`);
      const perfil = resposta.perfil || resposta;
      const nome = document.createElement('h2'); nome.textContent = perfil.nome || `@${usuario}`;
      const handle = document.createElement('p'); handle.textContent = `@${perfil.usuario || usuario}`;
      const bio = document.createElement('p'); bio.textContent = perfil.bio || '';
      const local = document.createElement('p'); local.textContent = perfil.local || '';
      const detalhes = document.createElement('p');
      detalhes.textContent = `${perfil.papel || (en ? 'Member' : 'Membro')} · ${en ? 'Level' : 'Nível'} ${perfil.nivel || 1}`;
      const selos = document.createElement('div'); selos.className = 'conta__selos';
      const avatar = criarAvatar(perfil.avatar || 'sol'); if (avatar) selos.append(avatar);
      selos.append(criarIconeNivel(perfil.nivel || 1));
      if (perfil.criado_em) selos.append(criarTempoNaComunidade(perfil.criado_em));
      area.append(selos, nome, handle, bio, local, detalhes);
      const listas = [[en ? 'Recommended tools' : 'Ferramentas recomendadas', perfil.ferramentas_recomendadas || []],
        [en ? 'Most used tools' : 'Ferramentas mais usadas', (perfil.ferramentas_mais_usadas || []).map((f) => f.slug)]];
      for (const [tituloLista, slugs] of listas) {
        if (!slugs.length) continue;
        const secao = document.createElement('section');
        const cabecalho = document.createElement('h3'); cabecalho.textContent = tituloLista;
        const links = document.createElement('div'); links.className = 'conta__links';
        for (const slug of slugs) {
          const link = document.createElement('a'); link.href = `${document.documentElement.dataset.raiz}f/${encodeURIComponent(slug)}/`;
          link.textContent = slug; links.append(link);
        }
        secao.append(cabecalho, links); area.append(secao);
      }
      if (perfil.usuario !== sessao.usuario.usuario) {
        const acoes = document.createElement('div'); acoes.className = 'conta__ações';
        const amizade = document.createElement('button'); amizade.type = 'button'; amizade.className = 'botão';
        amizade.textContent = en ? 'Add friend' : 'Adicionar aos amigos';
        amizade.addEventListener('click', async () => {
          amizade.disabled = true;
          try { await api('/api/amizades', { metodo: 'POST', dados: { usuario } }); amizade.textContent = en ? 'Following' : 'Seguindo'; }
          catch (erro) { estado(mensagemErro(erro), true); amizade.disabled = false; }
        });
        const bloquear = document.createElement('button'); bloquear.type = 'button'; bloquear.className = 'botão';
        bloquear.textContent = en ? 'Block' : 'Bloquear';
        bloquear.addEventListener('click', async () => {
          if (!confirm(en ? 'Block this person?' : 'Bloquear esta pessoa?')) return;
          bloquear.disabled = true;
          try { await api('/api/bloqueios', { metodo: 'POST', dados: { usuario } }); area.replaceChildren(); estado(naoEncontrado, true); }
          catch (erro) { estado(mensagemErro(erro), true); bloquear.disabled = false; }
        });
        const denunciar = document.createElement('button'); denunciar.type = 'button'; denunciar.className = 'botão botão--linha';
        denunciar.textContent = en ? 'Report profile' : 'Denunciar perfil';
        denunciar.addEventListener('click', async () => {
          const motivo = prompt(en ? 'Reason for report:' : 'Motivo da denúncia:');
          if (!motivo) return;
          denunciar.disabled = true;
          try { await api('/api/chat/denuncias', { metodo: 'POST', dados: { usuarioId: perfil.id, motivo } }); estado(en ? 'Profile reported.' : 'Perfil denunciado.'); }
          catch (erro) { estado(mensagemErro(erro), true); denunciar.disabled = false; }
        });
        acoes.append(amizade, bloquear);
        if (sessao.chat_habilitado && sessao.chat_aceito) acoes.append(denunciar);
        area.append(acoes);
      }
    }
  } catch (erro) { estado(erro.status === 404 ? naoEncontrado : mensagemErro(erro), true); }
}

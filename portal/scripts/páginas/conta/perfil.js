import { api, en, estado, mensagemErro, obterSessao } from './comum.js';
import { criarAvatar, criarIconeNivel, criarTempoNaComunidade } from '../../núcleo/nível.js';
import { ícone } from '../../núcleo/ícones.js';

const usuario = new URLSearchParams(location.search).get('usuario');
const area = document.getElementById('perfil-pessoa');
const raiz = document.documentElement.dataset.raiz || './';
const naoEncontrado = en
  ? 'We could not find this user. They may have deleted their account, changed their name, or blocked you.'
  : 'Não conseguimos localizar este usuário. Ele pode ter apagado a conta, mudado de nome ou ter bloqueado você.';

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

function adicionarIcone(no, nome) {
  const caixa = elemento('span', 'perfil-comunidade__icone');
  caixa.innerHTML = ícone(nome);
  no.prepend(caixa);
}

function criarFerramentas(titulo, slugs) {
  if (!slugs.length) return null;
  const secao = elemento('section', 'perfil-comunidade__secao');
  const cabecalho = elemento('div', 'perfil-comunidade__secao-topo');
  cabecalho.append(
    elemento('span', 'perfil-comunidade__secao-marca', ''),
    elemento('h3', '', titulo),
    elemento('small', '', String(slugs.length))
  );
  const grade = elemento('div', 'perfil-comunidade__ferramentas');
  for (const slug of slugs) {
    const link = elemento('a', 'perfil-comunidade__ferramenta');
    link.href = `${raiz}f/${encodeURIComponent(slug)}/`;
    const simbolo = elemento('span', 'perfil-comunidade__ferramenta-icone');
    simbolo.innerHTML = ícone('engrenagem');
    const texto = elemento('span', '', String(slug).replaceAll('-', ' '));
    const seta = elemento('span', 'perfil-comunidade__ferramenta-seta');
    seta.innerHTML = ícone('seta-diagonal');
    link.append(simbolo, texto, seta);
    grade.append(link);
  }
  secao.append(cabecalho, grade);
  return secao;
}

async function carregar() {
  if (!usuario || !/^[a-z0-9_]{3,20}$/.test(usuario)) {
    estado(naoEncontrado, true);
    return;
  }

  try {
    const sessao = await obterSessao();
    if (!sessao.usuario) {
      location.replace(`entrar.html?volta=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    const resposta = await api(`/api/perfil/${encodeURIComponent(usuario)}`);
    const perfil = resposta.perfil || resposta;
    area.replaceChildren();
    area.className = 'perfil-comunidade';

    const hero = elemento('section', 'perfil-comunidade__hero');
    const fundo = elemento('div', 'perfil-comunidade__fundo');
    const visual = elemento('div', 'perfil-comunidade__visual');
    const moldura = elemento('div', 'perfil-comunidade__avatar');
    const avatar = criarAvatar(perfil.avatar || 'sol');
    if (avatar) moldura.append(avatar);
    const nivel = elemento('span', 'perfil-comunidade__nivel');
    nivel.append(criarIconeNivel(perfil.nivel || 1));
    nivel.title = `${en ? 'Level' : 'Nível'} ${perfil.nivel || 1}`;
    moldura.append(nivel);
    visual.append(moldura);

    const identidade = elemento('div', 'perfil-comunidade__identidade');
    const superior = elemento('div', 'perfil-comunidade__superior');
    const papel = elemento('span', 'perfil-comunidade__papel', perfil.papel === 'admin' ? 'Admin' : (en ? 'Member' : 'Membro'));
    if (perfil.papel === 'admin') papel.dataset.admin = 'sim';
    superior.append(papel);
    if (perfil.criado_em) {
      const tempo = elemento('span', 'perfil-comunidade__tempo');
      tempo.append(criarTempoNaComunidade(perfil.criado_em));
      tempo.append(elemento('span', '', en ? 'Community time' : 'Tempo na comunidade'));
      superior.append(tempo);
    }

    const nome = elemento('h2', '', perfil.nome || `@${usuario}`);
    const handle = elemento('p', 'perfil-comunidade__handle', `@${perfil.usuario || usuario}`);
    const bio = elemento('p', 'perfil-comunidade__bio', perfil.bio || (en ? 'No bio yet.' : 'Ainda sem biografia.'));
    identidade.append(superior, nome, handle, bio);

    const meta = elemento('div', 'perfil-comunidade__meta');
    const chipNivel = elemento('span', 'perfil-comunidade__chip', `${en ? 'Level' : 'Nível'} ${perfil.nivel || 1}`);
    adicionarIcone(chipNivel, 'estrela');
    meta.append(chipNivel);
    if (perfil.local) {
      const chipLocal = elemento('span', 'perfil-comunidade__chip', perfil.local);
      adicionarIcone(chipLocal, 'marcador');
      meta.append(chipLocal);
    }
    identidade.append(meta);

    const acoes = elemento('div', 'perfil-comunidade__acoes');
    if (perfil.usuario === sessao.usuario.usuario) {
      const editar = elemento('a', 'botão botão--primário', en ? 'Edit my profile' : 'Editar meu perfil');
      editar.href = `${raiz}conta/`;
      acoes.append(editar);
    } else {
      const amizade = elemento('button', 'botão botão--primário', en ? 'Add friend' : 'Adicionar aos amigos');
      amizade.type = 'button';
      amizade.addEventListener('click', async () => {
        amizade.disabled = true;
        try {
          await api('/api/amizades', { metodo: 'POST', dados: { usuario } });
          amizade.textContent = en ? 'Request sent' : 'Pedido enviado';
        } catch (erro) {
          estado(mensagemErro(erro), true);
          amizade.disabled = false;
        }
      });

      const mais = elemento('details', 'perfil-comunidade__mais');
      const resumo = elemento('summary', '', en ? 'More' : 'Mais');
      const menu = elemento('div', 'perfil-comunidade__mais-menu');
      const bloquear = elemento('button', '', en ? 'Block' : 'Bloquear');
      bloquear.type = 'button';
      bloquear.addEventListener('click', async () => {
        if (!confirm(en ? 'Block this person?' : 'Bloquear esta pessoa?')) return;
        bloquear.disabled = true;
        try {
          await api('/api/bloqueios', { metodo: 'POST', dados: { usuario } });
          area.replaceChildren();
          estado(naoEncontrado, true);
        } catch (erro) {
          estado(mensagemErro(erro), true);
          bloquear.disabled = false;
        }
      });
      menu.append(bloquear);

      if (sessao.chat_habilitado && sessao.chat_aceito) {
        const denunciar = elemento('button', '', en ? 'Report profile' : 'Denunciar perfil');
        denunciar.type = 'button';
        denunciar.addEventListener('click', async () => {
          const motivo = prompt(en ? 'Reason for report:' : 'Motivo da denúncia:');
          if (!motivo) return;
          denunciar.disabled = true;
          try {
            await api('/api/chat/denuncias', { metodo: 'POST', dados: { usuarioId: perfil.id, motivo } });
            estado(en ? 'Profile reported.' : 'Perfil denunciado.');
            mais.removeAttribute('open');
          } catch (erro) {
            estado(mensagemErro(erro), true);
            denunciar.disabled = false;
          }
        });
        menu.append(denunciar);
      }
      mais.append(resumo, menu);
      acoes.append(amizade, mais);
    }

    hero.append(fundo, visual, identidade, acoes);
    area.append(hero);

    const recomendadas = perfil.ferramentas_recomendadas || [];
    const usadas = (perfil.ferramentas_mais_usadas || []).map((f) => f.slug);
    const gradeSecoes = elemento('div', 'perfil-comunidade__grade');
    const secaoRecomendadas = criarFerramentas(en ? 'Recommended tools' : 'Ferramentas recomendadas', recomendadas);
    const secaoUsadas = criarFerramentas(en ? 'Most used tools' : 'Ferramentas mais usadas', usadas);
    if (secaoRecomendadas) gradeSecoes.append(secaoRecomendadas);
    if (secaoUsadas) gradeSecoes.append(secaoUsadas);
    if (gradeSecoes.childElementCount) area.append(gradeSecoes);
    else {
      const vazio = elemento('section', 'perfil-comunidade__vazio');
      vazio.innerHTML = ícone('engrenagem');
      vazio.append(
        elemento('h3', '', en ? 'This profile is just getting started' : 'Este perfil está só começando'),
        elemento('p', '', en ? 'Used and recommended tools will appear here over time.' : 'As ferramentas usadas e recomendadas vão aparecer aqui com o tempo.')
      );
      area.append(vazio);
    }
  } catch (erro) {
    estado(erro.status === 404 ? naoEncontrado : mensagemErro(erro), true);
  }
}

carregar();

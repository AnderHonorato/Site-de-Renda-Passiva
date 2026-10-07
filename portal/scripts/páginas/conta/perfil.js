import { api, en, estado, mensagemErro, obterSessao } from './comum.js';
import { criarAvatarDoPerfil, criarIconeNivel, criarTempoNaComunidade, resumoTempoNaComunidade } from '../../núcleo/nível.js';
import { ícone } from '../../núcleo/ícones.js';
import { ferramentaPorSlug } from '../../../dados/catálogo.js';
import { aplicarPrestigio } from '../../núcleo/prestígio.js';
import { criarIconeMedalha } from '../../núcleo/emblemas.js';

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

function instanteComunidade(valor) {
  if (!valor) return NaN;
  if (typeof valor === 'number') return valor;
  const texto = String(valor).trim();
  const normal = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)
    ? texto.replace(' ', 'T') + 'Z'
    : texto;
  return Date.parse(normal);
}

function dataEntrada(valor) {
  const instante = instanteComunidade(valor);
  if (!Number.isFinite(instante)) return null;
  return new Intl.DateTimeFormat(en ? 'en-US' : 'pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(instante));
}

function adicionarIcone(no, nome) {
  const caixa = elemento('span', 'perfil-comunidade__icone');
  caixa.innerHTML = ícone(nome);
  no.prepend(caixa);
}

function siglaMedalha(nome) {
  return String(nome || '').split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

function criarMedalha(medalha) {
  const item = elemento('div', 'medalha');
  item.dataset.tier = String(medalha.tier || 0);
  item.dataset.desbloqueada = medalha.desbloqueada ? 'sim' : 'nao';
  item.tabIndex = 0;

  const simbolo = elemento('span', 'medalha__simbolo');
  simbolo.append(criarIconeMedalha(medalha));
  item.append(simbolo);

  const dica = elemento('div', 'medalha__tooltip');
  dica.append(
    elemento('b', '', medalha.nome),
    elemento(
      'p',
      '',
      medalha.desbloqueada
        ? medalha.patamar + ' · ' + medalha.valor + (medalha.completa ? '' : ' / ' + medalha.meta)
        : medalha.valor + ' / ' + medalha.meta
    ),
    elemento('p', '', medalha.descricao)
  );

  const link = elemento('a', '', en ? 'How to earn it' : 'Como ganhar');
  link.href = raiz + 'niveis.html#' + encodeURIComponent(medalha.id);
  dica.append(link);
  item.append(dica);
  return item;
}

function urlSocial(chave, valor) {
  if (!valor) return null;
  if (chave === 'site') return valor;
  if (chave === 'instagram') return 'https://www.instagram.com/' + encodeURIComponent(valor);
  if (chave === 'facebook') return 'https://www.facebook.com/' + encodeURIComponent(valor);
  if (chave === 'tiktok') return 'https://www.tiktok.com/@' + encodeURIComponent(valor);
  if (chave === 'x') return 'https://x.com/' + encodeURIComponent(valor);
  if (chave === 'whatsapp') return 'https://wa.me/' + encodeURIComponent(valor);
  return null;
}

function criarSociais(sociais) {
  const areaSociais = elemento('div', 'perfil-comunidade__sociais');
  const nomes = {
    site: 'Site',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    x: 'X',
    whatsapp: 'WhatsApp',
  };

  for (const chave of Object.keys(nomes)) {
    const valor = sociais && sociais[chave];
    const href = urlSocial(chave, valor);
    if (!href) continue;

    const link = elemento('a', 'perfil-comunidade__social');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = nomes[chave];
    link.setAttribute('aria-label', nomes[chave]);
    link.innerHTML = ícone(chave);
    areaSociais.append(link);
  }

  return areaSociais;
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
    const ficha = ferramentaPorSlug[slug];
    const link = elemento('a', 'perfil-comunidade__ferramenta');
    link.href = raiz + 'f/' + encodeURIComponent(slug) + '/';

    const simbolo = elemento('span', 'perfil-comunidade__ferramenta-icone');
    simbolo.innerHTML = ícone(ficha && ficha.ícone ? ficha.ícone : 'engrenagem');

    const texto = elemento('span', '', ficha && ficha.nome ? ficha.nome : String(slug).replaceAll('-', ' '));

    const seta = elemento('span', 'perfil-comunidade__ferramenta-seta');
    seta.innerHTML = ícone('seta-diagonal');

    link.append(simbolo, texto, seta);
    grade.append(link);
  }

  secao.append(cabecalho, grade);
  return secao;
}

function criarPlano(perfil) {
  const plano = perfil.plano || 'gratuito';
  const nomes = {
    gratuito: en ? 'Free plan' : 'Plano Gratuito',
    plus: 'Plus',
    premium: 'Premium',
  };
  const link = elemento('a', 'perfil-comunidade__plano', nomes[plano] || nomes.gratuito);
  link.href = raiz + 'planos.html';
  link.dataset.plano = plano;
  link.title = plano === 'gratuito'
    ? (en ? 'View available plans' : 'Ver planos disponíveis')
    : (en ? 'Active plan' : 'Plano ativo');
  link.prepend(elemento('span', 'perfil-comunidade__plano-ponto'));
  return link;
}

async function carregar() {
  if (!usuario || !/^[a-z0-9_]{3,20}$/.test(usuario)) {
    estado(naoEncontrado, true);
    return;
  }

  try {
    const sessao = await obterSessao();
    if (!sessao.usuario) {
      location.replace('entrar.html?volta=' + encodeURIComponent(location.pathname + location.search));
      return;
    }

    const resposta = await api('/api/perfil/' + encodeURIComponent(usuario));
    const perfil = resposta.perfil || resposta;

    area.replaceChildren();
    area.className = 'perfil-comunidade';
    area.dataset.moldura = perfil.moldura || 'basica';
    aplicarPrestigio(area,perfil);

    const hero = elemento('section', 'perfil-comunidade__hero');
    hero.dataset.banner = perfil.banner || 'brisa';
    hero.dataset.moldura = perfil.moldura || 'basica';

    const fundo = elemento('div', 'perfil-comunidade__fundo');
    const visual = elemento('div', 'perfil-comunidade__visual');

    const moldura = elemento('div', 'perfil-comunidade__avatar');
    moldura.dataset.moldura = perfil.moldura || 'basica';
    const avatar = criarAvatarDoPerfil(perfil);
    if (avatar) moldura.append(avatar);

    const nivel = elemento('a', 'perfil-comunidade__nivel');
    nivel.href = raiz + 'niveis.html';
    nivel.append(criarIconeNivel(perfil.nivel || 1));
    nivel.title = (en ? 'Level ' : 'Nível ') + (perfil.nivel || 1) + (en ? ' · Learn how it works' : ' · Ver como funciona');
    moldura.append(nivel);
    visual.append(moldura);

    const identidade = elemento('div', 'perfil-comunidade__identidade');
    const superior = elemento('div', 'perfil-comunidade__superior');

    const papel = elemento(
      'span',
      'perfil-comunidade__papel',
      perfil.papel === 'admin' ? 'Admin' : (en ? 'Member' : 'Membro')
    );
    if (perfil.papel === 'admin') papel.dataset.admin = 'sim';
    superior.append(papel, criarPlano(perfil));

    const entrada = dataEntrada(perfil.criado_em);
    if (perfil.criado_em && entrada) {
      const tempo = elemento('span', 'perfil-comunidade__tempo');
      tempo.append(criarTempoNaComunidade(perfil.criado_em));
      const resumo = resumoTempoNaComunidade(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(perfil.criado_em))
          ? String(perfil.criado_em).replace(' ', 'T') + 'Z'
          : perfil.criado_em
      );
      tempo.title = resumo.título;
      tempo.append(elemento('span', '', (en ? 'Since ' : 'Desde ') + entrada + ' · ' + resumo.título.replace(/^Na comunidade /, '')));
      superior.append(tempo);
    }

    const nome = elemento('h2', '', perfil.nome || '@' + usuario);
    const handle = elemento('p', 'perfil-comunidade__handle', '@' + (perfil.usuario || usuario));
    const bio = elemento(
      'p',
      'perfil-comunidade__bio',
      perfil.bio || (en ? 'No bio yet.' : 'Ainda sem biografia.')
    );

    identidade.append(superior, nome, handle, bio);

    const medalhas = elemento('div', 'perfil-comunidade__medalhas');
    for (const medalha of (perfil.medalhas || []).filter(m => m.desbloqueada).slice(-5)) {
      medalhas.append(criarMedalha(medalha));
    }
    if (medalhas.childElementCount) identidade.append(medalhas);

    const meta = elemento('div', 'perfil-comunidade__meta');
    const chipNivel = elemento('a', 'perfil-comunidade__chip', (en ? 'Level ' : 'Nível ') + (perfil.nivel || 1));
    chipNivel.href = raiz + 'niveis.html';
    adicionarIcone(chipNivel, 'estrela');
    meta.append(chipNivel);

    if (perfil.local) {
      const chipLocal = elemento('span', 'perfil-comunidade__chip', perfil.local);
      adicionarIcone(chipLocal, 'marcador');
      meta.append(chipLocal);
    }
    identidade.append(meta);

    const sociais = criarSociais(perfil.sociais || {});
    if (sociais.childElementCount) identidade.append(sociais);

    const acoes = elemento('div', 'perfil-comunidade__acoes');
    if (perfil.usuario === sessao.usuario.usuario) {
      const editar = elemento('a', 'botão botão--primário', en ? 'Edit my profile' : 'Editar meu perfil');
      editar.href = raiz + 'conta/';
      editar.innerHTML = ícone('engrenagem') + editar.textContent;
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
            await api('/api/chat/denuncias', {
              metodo: 'POST',
              dados: { usuarioId: perfil.id, motivo },
            });
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
    const usadas = (perfil.ferramentas_mais_usadas || []).map(f => f.slug);
    const gradeSecoes = elemento('div', 'perfil-comunidade__grade');

    const secaoRecomendadas = criarFerramentas(
      en ? 'Recommended tools' : 'Ferramentas recomendadas',
      recomendadas
    );
    const secaoUsadas = criarFerramentas(
      en ? 'Most used tools' : 'Ferramentas mais usadas',
      usadas
    );

    if (secaoRecomendadas) gradeSecoes.append(secaoRecomendadas);
    if (secaoUsadas) gradeSecoes.append(secaoUsadas);

    if (gradeSecoes.childElementCount) {
      area.append(gradeSecoes);
    } else {
      const vazio = elemento('section', 'perfil-comunidade__vazio');
      vazio.innerHTML = ícone('engrenagem');
      vazio.append(
        elemento('h3', '', en ? 'This profile is just getting started' : 'Este perfil está só começando'),
        elemento(
          'p',
          '',
          en
            ? 'Used and recommended tools will appear here over time.'
            : 'As ferramentas usadas e recomendadas vão aparecer aqui com o tempo.'
        )
      );
      area.append(vazio);
    }
  } catch (erro) {
    estado(erro.status === 404 ? naoEncontrado : mensagemErro(erro), true);
  }
}

carregar();

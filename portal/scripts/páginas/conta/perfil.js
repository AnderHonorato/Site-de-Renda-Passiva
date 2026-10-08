import { api, en, estado, mensagemErro, obterSessao } from './comum.js';
import { criarAvatarDoPerfil, criarIconeNivel, criarTempoNaComunidade, resumoTempoNaComunidade } from '../../núcleo/nível.js';
import { ícone } from '../../núcleo/ícones.js';
import { ferramentaPorSlug } from '../../../dados/catálogo.js';
import { aplicarPrestigio } from '../../núcleo/prestígio.js';
import { criarIconeMedalha } from '../../núcleo/emblemas.js';
import { criarSeloRank } from '../../núcleo/ranks.js';
import { progressoDeRank, rankDoNivel } from '../../../dados/recompensas.js';
import { escolherDestaques, montarColecao } from './colecao-conquistas.js';

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

function criarMedalha(medalha) {
  const item = elemento('div', 'medalha');
  item.dataset.tier = String(medalha.tier || 0);
  item.dataset.desbloqueada = medalha.desbloqueada ? 'sim' : 'nao';
  item.tabIndex = 0;
  item.setAttribute('role','button');
  item.setAttribute('aria-label',`${medalha.nome} · ${medalha.patamar}`);
  item.dataset.conquista=medalha.id;

  const simbolo = elemento('span', 'medalha__simbolo');
  simbolo.append(criarIconeMedalha(medalha));
  const rotulo = elemento('span', 'medalha__rotulo', medalha.nome);
  item.append(simbolo, rotulo);

  item.addEventListener('click',evento=>{if(!evento.target.closest('a'))mostrarDetalhe(item,medalha);});
  item.addEventListener('keydown',evento=>{if(evento.key==='Enter'||evento.key===' '){evento.preventDefault();mostrarDetalhe(item,medalha);}});
  return item;
}

let detalheAtual,temporizadorDestaque;
function mostrarDetalhe(alvo,medalha,{breve=false,nivel}={}) {
  detalheAtual?.remove();
  if(!breve){clearTimeout(temporizadorDestaque);alvo.classList.remove('conquista-destacada');}
  const balao=elemento('div','insignia-detalhe');balao.setAttribute('popover','auto');balao.setAttribute('role','status');
  const selo=elemento('span','insignia-detalhe__selo');selo.append(medalha?criarIconeMedalha(medalha):criarIconeNivel(nivel));
  const texto=elemento('div','insignia-detalhe__texto');
  texto.append(elemento('b','',medalha?medalha.nome:(en?'Level ':'Nível ')+nivel));
  texto.append(elemento('p','',medalha?`${medalha.patamar} · ${medalha.descricao}`:(en?'Your activity earns points and unlocks new profile styles.':'Sua atividade gera pontos e desbloqueia novos visuais do perfil.')));
  if(medalha)texto.append(elemento('small','',`${medalha.valor} / ${medalha.meta} · ${medalha.completa?(en?'Completed':'Concluída'):(en?'Keep exploring':'Continue explorando')}`));
  const fechar=elemento('button','insignia-detalhe__fechar','×');fechar.type='button';fechar.setAttribute('aria-label',en?'Close details':'Fechar detalhes');fechar.addEventListener('click',()=>balao.remove());
  balao.append(selo,texto,fechar);document.body.append(balao);balao.showPopover?.();
  const rect=alvo.getBoundingClientRect(),altura=balao.offsetHeight,largura=balao.offsetWidth;
  balao.style.left=Math.max(10,Math.min(innerWidth-largura-10,rect.left+rect.width/2-largura/2))+'px';
  balao.style.top=Math.max(10,Math.min(innerHeight-altura-10,rect.top-altura-12))+'px';
  detalheAtual=balao;
  if(breve)setTimeout(()=>{if(detalheAtual===balao)balao.remove();},6000);
}

function destacarConquista(perfil){
  const chave=new URLSearchParams(location.search).get('conquista');
  if(!chave||!/^([a-z]+):(\d{1,9})$/.test(chave))return;
  const [tipo,patamar]=chave.split(':');
  const medalha=(perfil.medalhas||[]).find(m=>m.id===tipo&&m.desbloqueada&&m.tier>=Number(patamar));
  if(tipo==='nivel'?Number(patamar)>perfil.nivel:!medalha)return;
  const alvo=area.querySelector(`[data-conquista="${tipo}"]`);if(!alvo)return;
  const colecao=alvo.closest('details');if(colecao)colecao.open=true;
  alvo.scrollIntoView({block:'center',behavior:'instant'});alvo.classList.add('conquista-destacada');
  temporizadorDestaque=setTimeout(()=>alvo.classList.remove('conquista-destacada'),7000);
  requestAnimationFrame(()=>mostrarDetalhe(alvo,medalha,{breve:true,nivel:perfil.nivel}));
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

    const nivel = elemento('button', 'perfil-comunidade__nivel');nivel.type='button';nivel.dataset.conquista='nivel';
    nivel.addEventListener('click',()=>mostrarDetalhe(nivel,null,{nivel:perfil.nivel||1}));
    nivel.append(criarIconeNivel(perfil.nivel || 1));
    nivel.title = (en ? 'Level ' : 'Nível ') + (perfil.nivel || 1) + (en ? ' · Learn how it works' : ' · Ver como funciona');
    moldura.append(nivel);
    visual.append(moldura);

    const identidade = elemento('div', 'perfil-comunidade__identidade');
    const superior = elemento('div', 'perfil-comunidade__superior');
    const rank=perfil.rank||progressoDeRank(perfil.progresso_nivel?.pontos??10*((perfil.nivel||1)-1)**2);
    hero.dataset.rank=rank.id;
    const distintivo=elemento('span','perfil-comunidade__rank');
    distintivo.append(criarSeloRank(perfil.nivel||1,{ingles:en}),elemento('b','',(en?rank.nome_en:rank.nome)+' '+rank.subnivel));
    identidade.append(distintivo);

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

    const progresso=perfil.progresso_nivel;
    if(progresso){
      const jornada=elemento('div','perfil-comunidade__jornada');
      jornada.append(elemento('b','',`${progresso.pontos || 0} XP`));
      jornada.append(elemento('span','',en?`${progresso.faltam || 0} XP to the next level`:`Faltam ${progresso.faltam || 0} XP para o próximo nível`));
      const barra=elemento('progress');barra.max=100;barra.value=Math.max(0,Math.min(100,Number(progresso.percentual)||0));barra.setAttribute('aria-label',en?'Progress to the next level':'Progresso para o próximo nível');
      jornada.append(barra);identidade.append(jornada);
      const proximo=elemento('small','perfil-comunidade__proximo',rank.proximo
        ? (en?`${rank.faltam} XP to ${rankDoNivel(rank.nivel_proximo_rank).nome_en} I`:`${rank.faltam} XP para ${rank.proximo} I`)
        : (en?'Highest rank reached':'Rank máximo alcançado'));
      jornada.append(proximo);
    }

    const desbloqueadas = (perfil.medalhas || []).filter(m => m.desbloqueada)
      .sort((a, b) => (Number(b.tier) - Number(a.tier)) || (Number(b.valor) - Number(a.valor)));
    const destaques=escolherDestaques(perfil);
    if (destaques.length) {
      const conquistas = elemento('section', 'perfil-comunidade__conquistas');
      const topoConquistas = elemento('div', 'perfil-comunidade__conquistas-topo');
      topoConquistas.append(elemento('h3', '', en ? 'Featured achievements' : 'Conquistas em destaque'));
      const medalhas = elemento('div', 'perfil-comunidade__medalhas');
      medalhas.dataset.quantidade=String(destaques.length);
      for (const medalha of destaques) medalhas.append(criarMedalha(medalha));
      const resumo = elemento('p', 'perfil-comunidade__conquistas-resumo', desbloqueadas.length > destaques.length
        ? (en ? `+${desbloqueadas.length - destaques.length} in your collection` : `+${desbloqueadas.length - destaques.length} na sua coleção`)
        : (en ? 'Open one to see the details.' : 'Abra uma para ver os detalhes.'));
      conquistas.append(topoConquistas, medalhas, resumo);
      const verColecao=elemento('a','perfil-comunidade__colecao',en?'View full collection':'Ver coleção completa');
      verColecao.href='#colecao-conquistas';conquistas.append(verColecao);
      identidade.append(conquistas);
    }

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
      editar.href = raiz + 'conta/perfil.html';
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
    const estatisticas=elemento('div','perfil-comunidade__estatisticas');
    for(const [id,pt,english]of [['explorador','Ferramentas exploradas','Tools explored'],['pratica','Resultados concluídos','Completed results'],['projetos','Trabalhos salvos','Saved works'],['colecao','Favoritos','Favorites']]){
      const dado=elemento('div');dado.append(elemento('b','',String((perfil.medalhas||[]).find(m=>m.id===id)?.valor||0)),elemento('span','',en?english:pt));estatisticas.append(dado);
    }
    area.append(estatisticas);
    area.append(montarColecao(perfil,{proprio:perfil.usuario===sessao.usuario.usuario,ingles:en,detalhe:mostrarDetalhe,aoSalvar:async selecionadas=>{perfil.conquistas_destaque=selecionadas;await carregar();}}));

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
    destacarConquista(perfil);
  } catch (erro) {
    estado(erro.status === 404 ? naoEncontrado : mensagemErro(erro), true);
  }
}

carregar();

import { api } from './api.js';
import { criarAvatarDoPerfil } from './nível.js';
import { ícone } from './ícones.js';

const txt = (idioma, pt, en) => idioma === 'en' ? en : pt;
const escutas = new WeakMap();

function link(texto, href, iconeNome) {
  const a = document.createElement('a');
  a.className = 'conta-topo__item';
  a.href = href;
  a.innerHTML = ícone(iconeNome);
  const span = document.createElement('span');
  span.textContent = texto;
  a.append(span);
  return a;
}

function fecharAoClicarFora(raiz, painel, botao, signal) {
  const fechar = () => {
    painel.hidden = true;
    raiz.removeAttribute('data-aberta');
    botao.setAttribute('aria-expanded', 'false');
  };
  document.addEventListener('click', (evento) => {
    const alvo = evento.target;
    if (painel.hidden || !(alvo instanceof Node) || raiz.contains(alvo)) return;
    fechar();
  }, { signal });
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || painel.hidden) return;
    fechar();
    botao.focus();
  }, { signal });
  return fechar;
}

export function renderizarContaTopo(fim, sessao, { base = './', idioma = 'pt' } = {}) {
  const preferencias=document.querySelector('.preferencias-topo__conteudo');
  const visitante=document.getElementById('preferencias-visitante');
  if(preferencias&&visitante)visitante.querySelector('.preferencias-topo__painel').append(preferencias);
  if(visitante)visitante.hidden=Boolean(sessao?.usuario);
  const anterior = fim.querySelector('.conta-topo');
  if (anterior) { escutas.get(anterior)?.abort(); anterior.remove(); }

  const raiz = document.createElement('div');
  raiz.className = 'conta-topo';
  const controlador = new AbortController();
  escutas.set(raiz, controlador);

  if (!sessao?.usuario) {
    raiz.classList.add('conta-topo--visitante');
    const entrar = link(txt(idioma, 'Entrar', 'Sign in'), `${base}entrar.html?volta=${encodeURIComponent(location.pathname + location.search)}`, 'pessoas');
    entrar.classList.add('conta-topo__entrar');
    const criar = link(txt(idioma, 'Criar conta', 'Create account'), `${base}criar-conta.html`, 'mais');
    criar.classList.add('conta-topo__criar');
    raiz.append(entrar, criar);
    fim.append(raiz);
    return;
  }

  raiz.classList.add('conta-topo--usuario');
  const botao = document.createElement('button');
  botao.className = 'conta-topo__gatilho';
  botao.type = 'button';
  botao.setAttribute('aria-haspopup', 'menu');
  botao.setAttribute('aria-expanded', 'false');

  const avatar = criarAvatarDoPerfil(sessao.usuario);
  if (avatar) {
    avatar.classList.add('conta-topo__avatar');
    botao.append(avatar);
  }

  const texto = document.createElement('span');
  texto.className = 'conta-topo__identidade';
  const nome = document.createElement('strong');
  nome.textContent = String(sessao.usuario.nome || sessao.usuario.usuario || txt(idioma, 'Conta', 'Account')).trim().split(/\s+/)[0];
  const handle = document.createElement('small');
  handle.textContent = sessao.usuario.usuario ? `@${sessao.usuario.usuario}` : txt(idioma, 'Minha conta', 'My account');
  texto.append(nome, handle);
  botao.append(texto);

  const seta = document.createElement('span');
  seta.className = 'conta-topo__seta';
  seta.innerHTML = ícone('chevron-baixo');
  botao.append(seta);

  const painel = document.createElement('div');
  painel.className = 'conta-topo__painel';
  painel.hidden = true;
  painel.setAttribute('role', 'menu');

  const topo = document.createElement('div');
  topo.className = 'conta-topo__resumo';
  const avatarResumo = criarAvatarDoPerfil(sessao.usuario);
  if (avatarResumo) topo.append(avatarResumo);
  const dados = document.createElement('span');
  const nomeCompleto = document.createElement('b');
  nomeCompleto.textContent = sessao.usuario.nome || sessao.usuario.usuario || txt(idioma, 'Minha conta', 'My account');
  const identificador = document.createElement('small');
  identificador.textContent = sessao.usuario.usuario ? `@${sessao.usuario.usuario}` : '';
  dados.append(nomeCompleto, identificador);
  topo.append(dados);

  const navegacao = document.createElement('nav');
  navegacao.className = 'conta-topo__navegacao';
  navegacao.append(
    link(txt(idioma, 'Minha conta', 'My account'), `${base}conta/`, 'engrenagem'),
    link(txt(idioma, 'Meu perfil', 'My profile'), `${base}perfil.html?usuario=${encodeURIComponent(sessao.usuario.usuario || '')}`, 'pessoas'),
    link(txt(idioma, 'Meus trabalhos', 'My works'), `${base}conta/trabalhos.html`, 'pasta'),
    link(txt(idioma, 'Mensagens', 'Messages'), `${base}conta/mensagens.html`, 'balão'),
    link(txt(idioma, 'Planos', 'Plans'), `${base}planos.html`, 'estrela')
  );

  const sair = document.createElement('button');
  if(sessao.usuario.papel==='admin')navegacao.append(link(txt(idioma,'Eventos e missões','Events and missions'),`${base}admin/eventos/`,'estrela'));
  if(sessao.usuario.papel==='admin')navegacao.append(link(txt(idioma,'Catálogo e regras','Catalog and rules'),`${base}admin/editorial/`,'grade'),link(txt(idioma,'Tráfego e registros','Traffic and logs'),`${base}admin/operacao/`,'escudo'));
  sair.type = 'button';
  sair.className = 'conta-topo__item conta-topo__sair';
  sair.innerHTML = ícone('seta');
  const sairTexto = document.createElement('span');
  sairTexto.textContent = txt(idioma, 'Sair', 'Sign out');
  sair.append(sairTexto);
  sair.addEventListener('click', async () => {
    sair.disabled = true;
    try {
      await api('/api/autenticacao/sair', { metodo: 'POST' });
      location.assign(base);
    } catch {
      sair.disabled = false;
    }
  });

  painel.append(topo, navegacao);
  if(preferencias)painel.append(preferencias);
  painel.append(sair);
  raiz.append(botao, painel);
  fim.append(raiz);

  const fechar = fecharAoClicarFora(raiz, painel, botao, controlador.signal);
  const abrir=()=>{painel.hidden=false;raiz.setAttribute('data-aberta','sim');botao.setAttribute('aria-expanded','true');};
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){
    let espera;
    controlador.signal.addEventListener('abort', () => clearTimeout(espera), { once: true });
    raiz.addEventListener('pointerenter',()=>{clearTimeout(espera);espera=setTimeout(abrir,90);});
    raiz.addEventListener('pointerleave',()=>{clearTimeout(espera);espera=setTimeout(fechar,240);});
  }
  botao.addEventListener('click', () => {
    if (!painel.hidden) {
      fechar();
      return;
    }
    abrir();
  });
}

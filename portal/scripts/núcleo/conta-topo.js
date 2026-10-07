import { api } from './api.js';
import { criarAvatarDoPerfil } from './nível.js';
import { ícone } from './ícones.js';

const txt = (idioma, pt, en) => idioma === 'en' ? en : pt;

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

function fecharAoClicarFora(raiz, painel, botao) {
  const fechar = () => {
    painel.hidden = true;
    raiz.removeAttribute('data-aberta');
    botao.setAttribute('aria-expanded', 'false');
  };
  document.addEventListener('click', (evento) => {
    const alvo = evento.target;
    if (painel.hidden || !(alvo instanceof Node) || raiz.contains(alvo)) return;
    fechar();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || painel.hidden) return;
    fechar();
    botao.focus();
  });
  return fechar;
}

export function renderizarContaTopo(fim, sessao, { base = './', idioma = 'pt' } = {}) {
  fim.querySelector('.conta-topo')?.remove();

  const raiz = document.createElement('div');
  raiz.className = 'conta-topo';

  if (!sessao?.usuario) {
    raiz.classList.add('conta-topo--visitante');
    const entrar = link(txt(idioma, 'Entrar', 'Sign in'), `${base}entrar.html?volta=${encodeURIComponent(location.pathname + location.search)}`, 'pessoas');
    entrar.classList.add('conta-topo__entrar');
    const criar = link(txt(idioma, 'Criar conta', 'Create account'), `${base}criar-conta.html`, 'mais');
    criar.classList.add('conta-topo__criar');
    raiz.append(entrar, criar);
    fim.prepend(raiz);
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

  painel.append(topo, navegacao, sair);
  raiz.append(botao, painel);
  fim.prepend(raiz);

  const fechar = fecharAoClicarFora(raiz, painel, botao);
  botao.addEventListener('click', () => {
    if (!painel.hidden) {
      fechar();
      return;
    }
    painel.hidden = false;
    raiz.setAttribute('data-aberta', 'sim');
    botao.setAttribute('aria-expanded', 'true');
  });
}

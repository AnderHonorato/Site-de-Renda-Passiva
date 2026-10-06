import { api } from '../api.js';
import { ícone } from '../ícones.js';
import { criarAvatar, criarIconeNivel, criarTempoNaComunidade } from '../nível.js';
import { atualizarNivel } from '../evolução.js';

const en = document.documentElement.lang === 'en';
const txt = (pt, ingles) => en ? ingles : pt;
const base = document.documentElement.dataset.raizIdioma || './';
let salaAtual;
let eventos;
let mensagemIds = new Set();

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function ligarChat(sessao) {
  if (document.getElementById('chat-bolha')) return;
  const bolha = elemento('button', 'chat__bolha');
  bolha.innerHTML = ícone('balão');
  bolha.id = 'chat-bolha'; bolha.type = 'button';
  bolha.setAttribute('aria-label', txt('Abrir chat', 'Open chat'));
  bolha.setAttribute('aria-expanded', 'false');
  const painel = elemento('section', 'chat__painel');
  painel.id = 'chat-painel'; painel.hidden = true;
  painel.setAttribute('aria-label', txt('Chat da comunidade', 'Community chat'));
  const topo = elemento('div', 'chat__topo');
  const titulo = elemento('b', '', txt('Comunidade', 'Community'));
  const meuNivel = elemento('span', 'chat__meu-nivel');
  meuNivel.append(criarIconeNivel(sessao.usuario?.nivel || 1));
  meuNivel.title = txt('Seu nível', 'Your level');
  const fechar = elemento('button', 'chat__fechar', '×'); fechar.type = 'button';
  fechar.setAttribute('aria-label', txt('Fechar chat', 'Close chat'));
  topo.append(titulo, meuNivel, fechar);
  const corpo = elemento('div', 'chat__corpo');
  const aviso = elemento('p', 'chat__aviso', txt('Não compartilhe dados pessoais no chat.', 'Do not share personal information in chat.'));
  aviso.id = 'chat-aviso';
  painel.append(topo, aviso, corpo);
  document.body.append(bolha, painel);
  document.addEventListener('portal:nivel-alterado', (evento) => {
    if (evento.detail?.usuarioId !== sessao.usuario?.id) return;
    meuNivel.replaceChildren(criarIconeNivel(evento.detail.atual));
    for (const item of painel.querySelectorAll('.chat__mensagem')) {
      if (item.dataset.autorId !== String(sessao.usuario.id)) continue;
      item.querySelector('.ícone-nível')?.replaceWith(criarIconeNivel(evento.detail.atual));
    }
  });
  const ocultar = () => { painel.hidden = true; bolha.setAttribute('aria-expanded', 'false'); eventos?.close(); };
  fechar.addEventListener('click', ocultar);
  bolha.addEventListener('click', async () => {
    if (!painel.hidden) { ocultar(); return; }
    painel.hidden = false; bolha.setAttribute('aria-expanded', 'true');
    if (!sessao.chat_aceito && !sessao.usuario?.chat_aceito) mostrarAceite(corpo, sessao);
    else await carregarSalas(corpo, sessao);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !painel.hidden) ocultar(); });
}

function mostrarAceite(corpo, sessao) {
  corpo.replaceChildren();
  const cartão = elemento('div', 'chat__aceite');
  cartão.append(elemento('h2', '', txt('Antes de começar', 'Before you start')),
    elemento('p', '', txt('O chat é visível a outras pessoas. Mensagens podem ser denunciadas e moderadas. Não compartilhe dados pessoais. Você precisa ter pelo menos 13 anos.',
      'Others can see this chat. Messages can be reported and moderated. Do not share personal information. You must be at least 13.')));
  const botao = elemento('button', 'botão botão--primário', txt('Li e aceito', 'I agree'));
  botao.type = 'button';
  botao.addEventListener('click', async () => {
    botao.disabled = true;
    try { await api('/api/chat/aceite', { metodo: 'POST', dados: { aceito: true } }); sessao.chat_aceito = true; await carregarSalas(corpo, sessao); }
    catch { botao.disabled = false; cartão.append(elemento('p', 'chat__erro', txt('Não foi possível abrir o chat.', 'Could not open chat.'))); }
  });
  cartão.append(botao); corpo.append(cartão);
}

async function carregarSalas(corpo, sessao) {
  corpo.replaceChildren(elemento('p', 'chat__estado', txt('Carregando conversas…', 'Loading conversations…')));
  try {
    const resposta = await api('/api/chat/salas');
    const salas = resposta.salas || [];
    corpo.replaceChildren();
    const layout = elemento('div', 'chat__layout');
    const lista = elemento('nav', 'chat__salas');
    const conversa = elemento('div', 'chat__conversa');
    const alternarSalas = elemento('button', 'chat__alternar-salas', txt('Salas', 'Rooms'));
    alternarSalas.type = 'button';
    alternarSalas.setAttribute('aria-expanded', 'true');
    alternarSalas.addEventListener('click', () => {
      const recolhida = layout.classList.toggle('chat__layout--recolhida');
      alternarSalas.setAttribute('aria-expanded', String(!recolhida));
    });
    conversa.append(alternarSalas);
    for (const sala of salas) {
      const botao = elemento('button', '', sala.nome || sala.titulo || String(sala.id));
      botao.type = 'button';
      botao.addEventListener('click', () => abrirSala(sala, conversa, sessao));
      lista.append(botao);
    }
    if (!salas.length) lista.append(elemento('p', 'chat__estado', txt('Nenhuma sala disponível.', 'No rooms available.')));
    layout.append(lista, conversa); corpo.append(layout);
    if (salas[0]) await abrirSala(salas[0], conversa, sessao);
  } catch { corpo.replaceChildren(elemento('p', 'chat__erro', txt('Chat indisponível. Tente novamente depois.', 'Chat unavailable. Please try later.'))); }
}

async function abrirSala(sala, conversa, sessao) {
  eventos?.close();
  salaAtual = sala.id;
  mensagemIds = new Set();
  const alternarSalas = conversa.querySelector('.chat__alternar-salas');
  conversa.replaceChildren();
  if (alternarSalas) conversa.append(alternarSalas);
  const titulo = elemento('h2', 'chat__título', sala.nome || sala.titulo || String(sala.id));
  const mensagens = elemento('div', 'chat__mensagens');
  mensagens.setAttribute('role', 'log');
  const form = elemento('form', 'chat__form');
  const input = elemento('input'); input.name = 'texto'; input.maxLength = 500; input.required = true;
  input.placeholder = txt('Escreva uma mensagem', 'Write a message'); input.setAttribute('aria-label', input.placeholder);
  const enviar = elemento('button', 'botão botão--primário', txt('Enviar', 'Send')); enviar.type = 'submit';
  form.append(input, enviar); conversa.append(titulo, mensagens, form);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const texto = input.value.trim(); if (!texto || salaAtual !== sala.id) return;
    enviar.disabled = true;
    try {
      const resposta = await api(`/api/chat/salas/${encodeURIComponent(sala.id)}/mensagens`, { metodo: 'POST', dados: { texto } });
      input.value = '';
      if (resposta.mensagem) mostrarMensagem(resposta.mensagem, mensagens, sessao);
      api('/api/conta').then(({ usuario }) => {
        if (!usuario) return;
        atualizarNivel(sessao, usuario.nivel);
      }).catch(() => {});
    }
    catch { mensagens.append(elemento('p', 'chat__erro', txt('Não foi possível enviar.', 'Could not send.'))); }
    finally { enviar.disabled = false; }
  });
  try {
    const resposta = await api(`/api/chat/salas/${encodeURIComponent(sala.id)}/mensagens`);
    if (salaAtual !== sala.id) return;
    (resposta.mensagens || []).forEach((msg) => mostrarMensagem(msg, mensagens, sessao));
    ouvirEventos(sala.id, mensagens, sessao);
  } catch { mensagens.append(elemento('p', 'chat__erro', txt('Não foi possível carregar as mensagens.', 'Could not load messages.'))); }
}

function mostrarMensagem(msg, lista, sessao) {
  if (mensagemIds.has(msg.id)) return;
  mensagemIds.add(msg.id);
  const item = elemento('article', 'chat__mensagem');
  item.dataset.id = String(msg.id);
  item.dataset.autorId = String(msg.autor?.id ?? '');
  if (msg.autor?.id === sessao.usuario?.id) item.classList.add('chat__mensagem--minha');
  const nome = elemento('a', 'chat__nome', `@${msg.usuario || msg.autor?.usuario || 'usuario'}`);
  nome.href = `${base}perfil.html?usuario=${encodeURIComponent(msg.usuario || msg.autor?.usuario || '')}`;
  if (msg.autor?.papel === 'admin') nome.classList.add('chat__nome--admin');
  const selos = elemento('span', 'chat__selos');
  const avatar = criarAvatar(msg.autor?.avatar || 'sol'); if (avatar) selos.append(avatar);
  const cargo = elemento('span', 'chat__cargo');
  cargo.innerHTML = ícone(msg.autor?.papel === 'admin' ? 'escudo' : 'pessoas');
  cargo.title = msg.autor?.papel === 'admin' ? 'Admin' : txt('Membro', 'Member');
  selos.append(cargo);
  selos.append(criarIconeNivel(msg.autor?.nivel || 1));
  if (msg.autor?.criado_em) selos.append(criarTempoNaComunidade(msg.autor.criado_em));
  const texto = elemento('p', '', msg.texto || '');
  const tempo = elemento('small', '', msg.criado_em ? new Date(msg.criado_em).toLocaleString(en ? 'en-US' : 'pt-BR') : '');
  const denunciar = elemento('button', 'chat__denunciar', txt('Denunciar', 'Report'));
  denunciar.type = 'button';
  denunciar.addEventListener('click', async () => {
    const motivo = prompt(txt('Motivo da denúncia:', 'Reason for report:'));
    if (!motivo) return;
    try { await api('/api/chat/denuncias', { metodo: 'POST', dados: { mensagemId: msg.id, motivo } }); denunciar.textContent = txt('Denunciado', 'Reported'); denunciar.disabled = true; }
    catch { denunciar.textContent = txt('Falha ao denunciar', 'Report failed'); }
  });
  item.append(selos, nome, texto, tempo, denunciar); lista.append(item);
  lista.scrollTop = lista.scrollHeight;
}

function ouvirEventos(id, lista, sessao) {
  if (!('EventSource' in window)) return;
  eventos = new EventSource('/api/chat/eventos', { withCredentials: true });
  eventos.addEventListener('mensagem', (ev) => {
    try { const dado = JSON.parse(ev.data); if (salaAtual === id && String(dado.salaId || dado.sala) === String(id)) mostrarMensagem(dado.mensagem || dado, lista, sessao); }
    catch { /* Evento inválido não afeta a sala. */ }
  });
  eventos.addEventListener('remocao', (ev) => {
    try {
      const dado = JSON.parse(ev.data);
      if (String(dado.salaId || dado.sala) !== String(id)) return;
      for (const item of lista.querySelectorAll('.chat__mensagem')) if (item.dataset.id === String(dado.removidaId)) item.remove();
    } catch { /* Evento inválido não afeta a sala. */ }
  });
  eventos.onerror = () => {
    eventos?.close();
    document.getElementById('chat-painel')?.setAttribute('hidden', '');
    document.getElementById('chat-bolha')?.remove();
  };
}

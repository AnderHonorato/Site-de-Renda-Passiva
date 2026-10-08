import { api } from '../api.js';
import { ícone } from '../ícones.js';
import { criarAvatarDoPerfil } from '../nível.js';
import { atualizarNivel } from '../evolução.js';
import { tocarSom } from '../sons.js';
import { rankDoNivel } from '../../../dados/recompensas.js';

const en = document.documentElement.lang === 'en';
const txt = (pt, ingles) => en ? ingles : pt;
const base = document.documentElement.dataset.raizIdioma || './';

let salaAtual = null;
let salaAtualDados = null;
let eventos = null;
let mensagemIds = new Set();
let salasCache = [];
let sessaoAtual = null;
let corpoAtual = null;
let listaSalasAtual = null;
let conversaAtual = null;
let bolhaAtual = null;
let badgeBolha = null;
let painelAtual = null;
let reconectarTimer = 0;
let replyAtual = null;
let formatacao = null;
let conversasRecolhidas = false;
let pesquisaSalas = '';
let participantesAtual = null;
let mensagensDados = new Map();

function atualizarParticipantes() {
  if (!participantesAtual) return;
  const pessoas = new Map();
  if (salaAtualDados?.tipo === 'direta' && salaAtualDados.outro) pessoas.set(salaAtualDados.outro.id, salaAtualDados.outro);
  for (const item of conversaAtual?.querySelectorAll('.chat__mensagem') || []) {
    const autor = mensagensDados.get(item.dataset.id)?.autor;
    if (autor?.usuario) pessoas.set(autor.id || autor.usuario, autor);
  }
  participantesAtual.replaceChildren();
  participantesAtual.append(elemento('h3', '', txt('Nesta conversa', 'In this conversation')),
    elemento('p', 'chat__participantes-aviso', txt('Pessoas das mensagens carregadas', 'People in the loaded messages')));
  for (const pessoa of pessoas.values()) {
    const link = elemento('a', 'chat__participante');
    link.href = base + 'perfil.html?usuario=' + encodeURIComponent(pessoa.usuario || '');
    const nome = elemento('span', 'chat__participante-nome');
    nome.append(elemento('strong', '', pessoa.nome || '@' + pessoa.usuario), elemento('small', '', '@' + pessoa.usuario));
    link.append(avatarDe(pessoa, 'chat__participante-avatar'), nome);
    if (Number(pessoa.nivel) > 0) {
      const rank = rankDoNivel(pessoa.nivel);
      const evolucao = elemento('span', 'chat__participante-evolucao');
      evolucao.append(
        elemento('span', 'chat__participante-rank', en ? rank.nome_en + (rank.subnivel ? ' ' + rank.subnivel : '') : rank.rotulo),
        elemento('small', 'chat__participante-nivel', txt('Nível ', 'Level ') + rank.nivel)
      );
      nome.append(evolucao);
    }
    participantesAtual.append(link);
  }
  if (!pessoas.size) participantesAtual.append(elemento('p', 'chat__estado', txt('Os participantes aparecem quando a conversa começa.', 'Participants appear when the conversation starts.')));
}

function organizarMensagens(lista) {
  lista.querySelectorAll('.chat__dia').forEach(item => item.remove());
  let anterior = null;
  let diaAnterior = '';
  for (const item of lista.querySelectorAll('.chat__mensagem')) {
    const data = dataSegura(item.dataset.criadoEm);
    const dia = data ? data.toLocaleDateString(en ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    if (dia && dia !== diaAnterior) {
      const separador = elemento('div', 'chat__dia', dia);
      lista.insertBefore(separador, item);
    }
    const intervalo = data && anterior?.data ? data - anterior.data : Infinity;
    const agrupada = anterior && item.dataset.autorId && anterior.autor === item.dataset.autorId && dia === diaAnterior && intervalo >= 0 && intervalo < 300000;
    item.classList.toggle('chat__mensagem--continuacao', Boolean(agrupada));
    anterior = { autor: item.dataset.autorId, data };
    diaAnterior = dia;
  }
}

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function csrf() {
  const partes = document.cookie.split('; ');
  const host = partes.find(p => p.startsWith('__Host-csrf='));
  const simples = partes.find(p => p.startsWith('csrf='));
  const valor = host ? host.slice('__Host-csrf='.length) : (simples ? simples.slice(5) : '');
  try { return decodeURIComponent(valor); } catch { return ''; }
}

function dataSegura(valor) {
  if (!valor) return null;
  const texto = String(valor);
  const normal = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)
    ? texto.replace(' ', 'T') + 'Z'
    : texto;
  const data = new Date(normal);
  return Number.isNaN(data.getTime()) ? null : data;
}

function horaCurta(valor) {
  const data = dataSegura(valor);
  if (!data) return '';
  const hoje = new Date();
  if (data.toDateString() === hoje.toDateString()) {
    return data.toLocaleTimeString(en ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return data.toLocaleDateString(en ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit' });
}

function tamanhoArquivo(bytes) {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return valor + ' B';
  if (valor < 1024 * 1024) return (valor / 1024).toFixed(valor < 10240 ? 1 : 0) + ' KB';
  return (valor / 1024 / 1024).toFixed(valor < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
}

function tempoMidia(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return min + ':' + String(seg).padStart(2, '0');
}

function avatarDe(perfil, classe = '') {
  const caixa = elemento('span', classe);
  const avatar = criarAvatarDoPerfil(perfil || {});
  if (avatar) caixa.append(avatar);
  return caixa;
}

function atualizarBadgeBolha(total) {
  if (!badgeBolha) return;
  const valor = Math.max(0, Number(total) || 0);
  badgeBolha.hidden = valor === 0;
  badgeBolha.textContent = valor > 99 ? '99+' : String(valor);
  bolhaAtual?.setAttribute(
    'aria-label',
    valor
      ? txt('Abrir chat, ' + valor + ' mensagens não lidas', 'Open chat, ' + valor + ' unread messages')
      : txt('Abrir chat', 'Open chat')
  );
}

async function buscarSalas() {
  try {
    const resposta = await api('/api/chat/salas');
    salasCache = resposta.salas || [];
    atualizarBadgeBolha(resposta.total_nao_lidas || 0);
    if (listaSalasAtual) renderListaSalas(listaSalasAtual);
    return salasCache;
  } catch {
    return salasCache;
  }
}

function nomeSala(sala) {
  if (sala.tipo === 'direta' && sala.outro) return sala.outro.nome || '@' + sala.outro.usuario;
  return sala.nome || sala.titulo || String(sala.id);
}

function subtituloSala(sala) {
  if (sala.ultima_mensagem) return sala.ultima_mensagem;
  if (sala.tipo === 'direta') return txt('Conversa privada · 48 h', 'Private chat · 48 h');
  return txt('Conversa pública', 'Public room');
}

function renderListaSalas(lista) {
  const scroll = lista.scrollTop;
  lista.replaceChildren();

  let grupoAtual = '';
  const salas = salasCache.filter(sala => nomeSala(sala).toLocaleLowerCase().includes(pesquisaSalas.toLocaleLowerCase()));
  const ordem = ['global', 'categoria', 'ferramenta', 'direta'];
  const grupos = { global: txt('Comunidade', 'Community'), categoria: txt('Categorias', 'Categories'), ferramenta: txt('Ferramentas', 'Tools'), direta: txt('Mensagens privadas', 'Private messages') };
  for (const sala of [...salas].sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo))) {
    if (sala.tipo !== grupoAtual) {
      lista.append(elemento('h3', 'chat__salas-grupo', grupos[sala.tipo] || txt('Conversas', 'Conversations')));
      grupoAtual = sala.tipo;
    }
    const botao = elemento('button', 'chat__sala');
    botao.type = 'button';
    botao.dataset.salaId = String(sala.id);
    if (String(salaAtual) === String(sala.id)) botao.dataset.ativa = 'sim';

    const avatar = sala.tipo === 'direta'
      ? avatarDe(sala.outro || { avatar: 'sol' }, 'chat__sala-avatar')
      : elemento('span', 'chat__sala-avatar chat__sala-avatar--sala');
    if (sala.tipo !== 'direta') avatar.innerHTML = ícone(sala.tipo === 'ferramenta' ? 'engrenagem' : 'balão');

    const texto = elemento('span', 'chat__sala-texto');
    const topo = elemento('span', 'chat__sala-topo');
    topo.append(
      elemento('strong', '', nomeSala(sala)),
      elemento('time', '', horaCurta(sala.ultima_em))
    );
    const resumo = elemento('small', '', subtituloSala(sala));
    texto.append(topo, resumo);

    const badge = elemento('span', 'chat__sala-badge', sala.nao_lidas > 99 ? '99+' : String(sala.nao_lidas || ''));
    badge.hidden = !sala.nao_lidas;

    botao.append(avatar, texto, badge);
    botao.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 700px)').matches) conversasRecolhidas = true;
      abrirSala(sala, conversaAtual, sessaoAtual, { marcar: true });
    });
    lista.append(botao);
  }

  if (!salas.length) {
    lista.append(elemento('p', 'chat__estado', txt('Nenhuma conversa disponível.', 'No conversations available.')));
  }

  lista.scrollTop = scroll;
}

function criarInterfaceChat(corpo, sessao) {
  corpo.replaceChildren();
  const layout = elemento('div', 'chat__layout');
  layout.dataset.recolhido = conversasRecolhidas ? 'sim' : 'nao';
  const lista = elemento('nav', 'chat__salas');
  lista.setAttribute('aria-label', txt('Conversas', 'Conversations'));
  const conversa = elemento('div', 'chat__conversa');
  const lateral = elemento('aside', 'chat__lateral');
  const pesquisa = elemento('input', 'chat__pesquisa-salas');
  pesquisa.type = 'search';
  pesquisa.placeholder = txt('Pesquisar conversas', 'Search conversations');
  pesquisa.setAttribute('aria-label', pesquisa.placeholder);
  pesquisa.value = pesquisaSalas;
  pesquisa.addEventListener('input', () => { pesquisaSalas = pesquisa.value.trim(); renderListaSalas(lista); });
  lateral.append(pesquisa, lista);
  participantesAtual = elemento('aside', 'chat__participantes');
  participantesAtual.setAttribute('aria-label', txt('Participantes da conversa', 'Conversation participants'));
  listaSalasAtual = lista;
  conversaAtual = conversa;
  layout.append(lateral, conversa, participantesAtual);
  corpo.append(layout);
  renderListaSalas(lista);
}

async function marcarLeitura(salaId, ultimoId) {
  if (!ultimoId) return;
  try {
    await api('/api/chat/salas/' + encodeURIComponent(salaId) + '/leitura', {
      metodo: 'PATCH',
      dados: { ultimoId },
    });
    await buscarSalas();
  } catch {}
}

function aplicarFormato(container, texto) {
  const partes = String(texto || '').split(/(\*\*[^*\n]+\*\*|_[^_\n]+_|\x60[^\x60\n]+\x60)/g);
  for (const parte of partes) {
    if (!parte) continue;
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      container.append(elemento('strong', '', parte.slice(2, -2)));
    } else if (parte.startsWith('_') && parte.endsWith('_') && parte.length > 2) {
      container.append(elemento('em', '', parte.slice(1, -1)));
    } else if (parte.charCodeAt(0) === 96 && parte.charCodeAt(parte.length - 1) === 96 && parte.length > 2) {
      container.append(elemento('code', '', parte.slice(1, -1)));
    } else {
      container.append(document.createTextNode(parte));
    }
  }
}

function denunciarMensagem(msg, botao) {
  return async () => {
    const motivo = prompt(txt('Motivo da denúncia:', 'Reason for report:'));
    if (!motivo) return;
    botao.disabled = true;
    try {
      await api('/api/chat/denuncias', {
        metodo: 'POST',
        dados: { mensagemId: msg.id, motivo },
      });
      botao.textContent = txt('Denunciado', 'Reported');
    } catch {
      botao.textContent = txt('Falha', 'Failed');
      botao.disabled = false;
    }
  };
}

function configurarReply(msg, composer) {
  replyAtual = {
    id: msg.id,
    usuario: msg.autor?.usuario || 'usuario',
    texto: msg.texto || (msg.midias?.[0]?.nome || txt('Arquivo', 'File')),
  };
  const barra = composer.querySelector('.chat__reply');
  if (!barra) return;
  barra.hidden = false;
  const nome = barra.querySelector('b');
  const texto = barra.querySelector('span');
  nome.textContent = '@' + replyAtual.usuario;
  texto.textContent = replyAtual.texto.slice(0, 100);
  composer.querySelector('textarea')?.focus();
}

function limparReply(composer) {
  replyAtual = null;
  const barra = composer?.querySelector('.chat__reply');
  if (barra) barra.hidden = true;
}

function criarPreviewMidia(midia, msg) {
  const botao = elemento('button', 'chat__midia-preview');
  botao.type = 'button';
  botao.dataset.tipo = midia.tipo;

  if (midia.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = midia.url;
    img.alt = midia.nome || txt('Imagem enviada', 'Sent image');
    img.loading = 'lazy';
    botao.append(img);
  } else if (midia.tipo === 'video') {
    const quadro = elemento('span', 'chat__video-preview');
    const video = document.createElement('video');
    video.src = midia.url;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    const play = elemento('span', 'chat__video-preview-play');
    play.innerHTML = ícone('seta');
    quadro.append(video, play);
    const texto = elemento('span', 'chat__midia-preview-texto');
    texto.append(
      elemento('b', '', midia.nome),
      elemento('small', '', [midia.duracao ? tempoMidia(midia.duracao) : '', tamanhoArquivo(midia.tamanho)].filter(Boolean).join(' · '))
    );
    botao.append(quadro, texto);
  } else if (midia.tipo === 'audio') {
    const onda = elemento('span', 'chat__audio-onda');
    for (let i = 0; i < 14; i++) {
      const barra = elemento('i');
      barra.style.setProperty('--onda', String(5 + ((i * 7) % 17)) + 'px');
      onda.append(barra);
    }
    const texto = elemento('span', 'chat__midia-preview-texto');
    texto.append(
      elemento('b', '', midia.nome),
      elemento('small', '', [midia.duracao ? tempoMidia(midia.duracao) : '', tamanhoArquivo(midia.tamanho)].filter(Boolean).join(' · '))
    );
    botao.append(onda, texto);
  } else {
    const icone = elemento('span', 'chat__midia-preview-icone');
    icone.innerHTML = ícone('documento');
    const texto = elemento('span', 'chat__midia-preview-texto');
    texto.append(
      elemento('b', '', midia.nome),
      elemento('small', '', tamanhoArquivo(midia.tamanho))
    );
    botao.append(icone, texto);
  }

  botao.addEventListener('click', () => abrirMidia(midia, msg));
  return botao;
}

function montarMensagem(msg, sessao, composer) {
  const item = elemento('article', 'chat__mensagem');
  item.dataset.id = String(msg.id);
  item.dataset.autorId = String(msg.autor?.id ?? '');
  item.dataset.criadoEm = String(msg.criado_em || '');
  mensagensDados.set(String(msg.id), msg);
  const minha = msg.autor?.id === sessao.usuario?.id;
  if (minha) item.classList.add('chat__mensagem--minha');

  const cabecalho = elemento('div', 'chat__mensagem-cabecalho');
  const avatarLink = elemento('a', 'chat__mensagem-avatar');
  avatarLink.href = base + 'perfil.html?usuario=' + encodeURIComponent(msg.autor?.usuario || '');
  avatarLink.setAttribute('aria-label', txt('Ver perfil de ', 'View profile of ') + (msg.autor?.nome || msg.autor?.usuario || ''));
  avatarLink.append(avatarDe(msg.autor || { avatar: 'sol' }, 'chat__autor-avatar'));
  item.append(avatarLink);
  const perfilLink = elemento('a', 'chat__autor');
  if (msg.autor?.papel === 'admin') perfilLink.dataset.admin = 'sim';
  perfilLink.href = base + 'perfil.html?usuario=' + encodeURIComponent(msg.autor?.usuario || '');
  perfilLink.append(elemento('span', '', msg.autor?.nome || '@' + (msg.autor?.usuario || 'usuario')));
  const horario = elemento('time', 'chat__horario', dataSegura(msg.criado_em)?.toLocaleTimeString(en ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' }) || '');
  horario.dateTime = dataSegura(msg.criado_em)?.toISOString() || '';
  const acoes = elemento('div', 'chat__mensagem-acoes');
  const responder = elemento('button', 'chat__responder');
  responder.type = 'button';
  responder.title = txt('Responder', 'Reply');
  responder.setAttribute('aria-label', responder.title);
  responder.innerHTML = ícone('voltar');
  responder.addEventListener('click', () => configurarReply(msg, composer));

  acoes.append(responder);
  cabecalho.append(perfilLink, horario, acoes);
  item.append(cabecalho);

  if (msg.resposta) {
    const citado = elemento('button', 'chat__citado');
    citado.type = 'button';
    citado.append(
      elemento('b', '', '@' + (msg.resposta.usuario || 'usuario')),
      elemento('span', '', msg.resposta.texto || txt('Arquivo', 'File'))
    );
    citado.addEventListener('click', () => {
      const original = item.parentElement?.querySelector('[data-id="' + msg.resposta.id + '"]');
      if (original) {
        original.scrollIntoView({ block: 'center', behavior: 'smooth' });
        original.classList.add('chat__mensagem--destacada');
        setTimeout(() => original.classList.remove('chat__mensagem--destacada'), 1200);
      }
    });
    item.append(citado);
  }

  if (msg.texto) {
    const texto = elemento('p', 'chat__texto');
    aplicarFormato(texto, msg.texto);
    item.append(texto);
  }

  if (Array.isArray(msg.midias) && msg.midias.length) {
    const midias = elemento('div', 'chat__midias');
    for (const midia of msg.midias) midias.append(criarPreviewMidia(midia, msg));
    item.append(midias);
  }

  return item;
}

function mostrarMensagem(msg, lista, sessao, composer, { rolar = true, inicio = false } = {}) {
  if (!msg || mensagemIds.has(msg.id)) return null;
  mensagemIds.add(msg.id);
  const item = montarMensagem(msg, sessao, composer);
  if (inicio) lista.prepend(item);
  else lista.append(item);
  organizarMensagens(lista);
  atualizarParticipantes();
  if (rolar) lista.scrollTop = lista.scrollHeight;
  return item;
}

function criarFormatacao(textarea) {
  if (!formatacao) {
    formatacao = elemento('div', 'chat__formatacao');
    formatacao.hidden = true;
    document.body.append(formatacao);
  }
  formatacao.replaceChildren();

  const opcoes = [
    ['B', '**', '**', txt('Negrito', 'Bold')],
    ['I', '_', '_', txt('Itálico', 'Italic')],
    ['<>', String.fromCharCode(96), String.fromCharCode(96), txt('Código', 'Code')],
  ];

  for (const [rotulo, antes, depois, titulo] of opcoes) {
    const botao = elemento('button', '', rotulo);
    botao.type = 'button';
    botao.title = titulo;
    botao.addEventListener('mousedown', evento => {
      evento.preventDefault();
      const inicio = textarea.selectionStart;
      const fim = textarea.selectionEnd;
      if (inicio === fim) return;
      const valor = textarea.value;
      textarea.value = valor.slice(0, inicio) + antes + valor.slice(inicio, fim) + depois + valor.slice(fim);
      textarea.focus();
      textarea.setSelectionRange(inicio + antes.length, fim + antes.length);
      formatacao.hidden = true;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    formatacao.append(botao);
  }

  textarea.addEventListener('mouseup', evento => {
    requestAnimationFrame(() => {
      if (textarea.selectionStart === textarea.selectionEnd) {
        formatacao.hidden = true;
        return;
      }
      formatacao.style.left = Math.max(8, Math.min(innerWidth - 145, evento.clientX - 55)) + 'px';
      formatacao.style.top = Math.max(8, evento.clientY - 44) + 'px';
      formatacao.hidden = false;
    });
  });

  textarea.addEventListener('keyup', () => {
    if (textarea.selectionStart === textarea.selectionEnd) formatacao.hidden = true;
  });
  textarea.addEventListener('blur', () => setTimeout(() => { if (formatacao) formatacao.hidden = true; }, 120));
}

function autoTamanho(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(112, Math.max(38, textarea.scrollHeight)) + 'px';
}

function configurarScroll(lista, descer) {
  const atualizar = () => {
    const distancia = lista.scrollHeight - lista.scrollTop - lista.clientHeight;
    descer.hidden = distancia < 120;
  };
  lista.addEventListener('scroll', atualizar, { passive: true });
  atualizar();
}

async function duracaoDoArquivo(arquivo) {
  if (!arquivo.type.startsWith('audio/') && !arquivo.type.startsWith('video/')) return null;
  const url = URL.createObjectURL(arquivo);
  try {
    const media = document.createElement(arquivo.type.startsWith('video/') ? 'video' : 'audio');
    media.preload = 'metadata';
    media.src = url;
    const duracao = await new Promise(resolve => {
      const fim = () => resolve(Number.isFinite(media.duration) && media.duration > 0 ? media.duration : null);
      media.addEventListener('loadedmetadata', fim, { once: true });
      media.addEventListener('error', () => resolve(null), { once: true });
      setTimeout(() => resolve(null), 4000);
    });
    media.removeAttribute('src');
    media.load();
    return duracao;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function enviarMidia(arquivo, sala, lista, sessao, composer, status) {
  const permitidos = new Set([
    'image/png','image/jpeg','image/webp','image/gif',
    'audio/mpeg','audio/wav','audio/ogg','audio/mp4',
    'video/mp4','video/webm',
    'application/pdf','text/plain','text/csv','application/zip',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);
  if (!permitidos.has(arquivo.type)) throw new Error(txt('Tipo de arquivo não aceito.', 'Unsupported file type.'));
  if (arquivo.size > 40 * 1024 * 1024) throw new Error(txt('O arquivo ultrapassa o limite permitido.', 'The file exceeds the allowed size.'));

  const headers = {
    'Content-Type': arquivo.type,
    'X-CSRF-Token': csrf(),
    'X-Arquivo-Nome': encodeURIComponent(arquivo.name),
    Accept: 'application/json',
  };
  const duracao = await duracaoDoArquivo(arquivo);
  if (duracao) headers['X-Midia-Duracao'] = String(duracao);
  if (replyAtual) headers['X-Resposta-A'] = String(replyAtual.id);

  const resposta = await fetch('/api/chat/salas/' + encodeURIComponent(sala.id) + '/midias', {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: arquivo,
  });

  let corpo = {};
  try { corpo = await resposta.json(); } catch {}
  if (!resposta.ok) throw new Error(corpo.erro || txt('Falha no envio.', 'Upload failed.'));

  if (corpo.mensagem) mostrarMensagem(corpo.mensagem, lista, sessao, composer);
  limparReply(composer);
  status.textContent = '';
  return corpo;
}

function criarComposer(sala, lista, sessao) {
  const form = elemento('form', 'chat__form');
  const reply = elemento('div', 'chat__reply');
  reply.hidden = true;
  const replyTexto = elemento('span', 'chat__reply-texto');
  replyTexto.append(elemento('b'), elemento('span'));
  const replyFechar = elemento('button', 'chat__reply-fechar');
  replyFechar.type = 'button';
  replyFechar.innerHTML = ícone('fechar');
  replyFechar.setAttribute('aria-label', txt('Cancelar resposta', 'Cancel reply'));
  replyFechar.addEventListener('click', () => limparReply(form));
  reply.append(replyTexto, replyFechar);

  const linha = elemento('div', 'chat__composer-linha');
  linha.dataset.anexo = sala.tipo === 'direta' ? 'sim' : 'nao';
  const status = elemento('small', 'chat__composer-status');

  if (sala.tipo === 'direta') {
    const anexo = elemento('label', 'chat__anexo');
    anexo.title = txt('Enviar arquivo, foto, áudio ou vídeo', 'Send file, photo, audio or video');
    anexo.innerHTML = ícone('mais');
    const inputArquivo = document.createElement('input');
    inputArquivo.type = 'file';
    inputArquivo.multiple = true;
    inputArquivo.hidden = true;
    inputArquivo.accept = 'image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,video/mp4,video/webm,application/pdf,text/plain,text/csv,application/zip,.xlsx,.docx';
    anexo.append(inputArquivo);

    inputArquivo.addEventListener('change', async () => {
      const arquivos = [...(inputArquivo.files || [])];
      inputArquivo.value = '';
      for (let i = 0; i < arquivos.length; i++) {
        status.textContent = txt('Enviando ', 'Sending ') + (i + 1) + '/' + arquivos.length + '…';
        try {
          await enviarMidia(arquivos[i], sala, lista, sessao, form, status);
        } catch (erro) {
          status.textContent = erro.message || txt('Falha no envio.', 'Upload failed.');
          break;
        }
      }
    });
    linha.append(anexo);
  }

  const textarea = document.createElement('textarea');
  textarea.name = 'texto';
  textarea.maxLength = 500;
  textarea.rows = 1;
  textarea.placeholder = txt('Escreva uma mensagem', 'Write a message');
  textarea.setAttribute('aria-label', textarea.placeholder);

  const enviar = elemento('button', 'chat__enviar');
  enviar.type = 'submit';
  enviar.innerHTML = ícone('seta');
  enviar.setAttribute('aria-label', txt('Enviar', 'Send'));

  linha.append(textarea, enviar);
  form.append(reply, linha, status);

  criarFormatacao(textarea);
  textarea.addEventListener('input', () => autoTamanho(textarea));
  textarea.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const texto = textarea.value.trim();
    if (!texto || salaAtual !== sala.id) return;

    enviar.disabled = true;
    try {
      const resposta = await api('/api/chat/salas/' + encodeURIComponent(sala.id) + '/mensagens', {
        metodo: 'POST',
        dados: {
          texto,
          respostaA: replyAtual ? replyAtual.id : null,
        },
      });
      textarea.value = '';
      autoTamanho(textarea);
      limparReply(form);
      if (resposta.mensagem) mostrarMensagem(resposta.mensagem, lista, sessao, form);
      api('/api/conta').then(({ usuario }) => {
        if (usuario) atualizarNivel(sessao, usuario.nivel);
      }).catch(() => {});
    } catch {
      status.textContent = txt('Não foi possível enviar.', 'Could not send.');
    } finally {
      enviar.disabled = false;
    }
  });

  return form;
}

async function carregarAnteriores(sala, lista, sessao, composer, botao) {
  const ids = [...mensagemIds].map(Number).filter(Number.isFinite);
  const primeiro = ids.length ? Math.min(...ids) : null;
  if (!primeiro) return;

  botao.disabled = true;
  try {
    const altura = lista.scrollHeight;
    const resposta = await api(
      '/api/chat/salas/' + encodeURIComponent(sala.id) + '/mensagens?antes=' + encodeURIComponent(primeiro)
    );
    const antigas = resposta.mensagens || [];
    for (let i = antigas.length - 1; i >= 0; i--) {
      mostrarMensagem(antigas[i], lista, sessao, composer, { rolar: false, inicio: true });
    }
    lista.scrollTop += lista.scrollHeight - altura;
    if (!antigas.length) botao.hidden = true;
  } catch {
    botao.textContent = txt('Não foi possível carregar', 'Could not load');
  } finally {
    botao.disabled = false;
  }
}

async function abrirSala(sala, conversa, sessao, { marcar = true } = {}) {
  if (!sala || !conversa) return;
  salaAtual = sala.id;
  salaAtualDados = sala;
  mensagemIds = new Set();
  mensagensDados = new Map();
  replyAtual = null;

  for (const botao of listaSalasAtual?.querySelectorAll('.chat__sala') || []) {
    if (botao.dataset.salaId === String(sala.id)) botao.dataset.ativa = 'sim';
    else delete botao.dataset.ativa;
  }

  conversa.replaceChildren();
  conversa.closest('.chat__layout').dataset.recolhido = conversasRecolhidas ? 'sim' : 'nao';
  atualizarParticipantes();

  const cabecalho = elemento('header', 'chat__conversa-topo');
  const alternar = elemento('button','chat__alternar-salas');
  alternar.type = 'button'; alternar.innerHTML = ícone('pessoas');
  alternar.setAttribute('aria-label',txt('Mostrar ou recolher conversas','Show or hide conversations'));
  alternar.setAttribute('aria-expanded',String(!conversasRecolhidas));
  alternar.addEventListener('click',()=>{
    conversasRecolhidas = !conversasRecolhidas;
    conversa.closest('.chat__layout').dataset.recolhido = conversasRecolhidas ? 'sim' : 'nao';
    alternar.setAttribute('aria-expanded',String(!conversasRecolhidas));
  });
  const titulo = elemento('div', 'chat__conversa-identidade');
  if (sala.tipo === 'direta') titulo.append(avatarDe(sala.outro || {}, 'chat__conversa-avatar'));
  else {
    const salaIcone = elemento('span', 'chat__conversa-avatar chat__conversa-avatar--sala');
    salaIcone.innerHTML = ícone('balão');
    titulo.append(salaIcone);
  }

  const tituloTexto = elemento('span');
  tituloTexto.append(
    elemento('strong', '', nomeSala(sala)),
    elemento(
      'small',
      '',
      sala.tipo === 'direta'
        ? txt('Privado · mensagens somem após 48 horas', 'Private · messages disappear after 48 hours')
        : txt('Público · apenas texto', 'Public · text only')
    )
  );
  titulo.append(tituloTexto);
  cabecalho.append(alternar,titulo);

  const mensagens = elemento('div', 'chat__mensagens');
  mensagens.setAttribute('role', 'log');
  mensagens.setAttribute('aria-live', 'polite');

  const carregarMais = elemento('button', 'chat__carregar-mais', txt('Ver mensagens anteriores', 'Load older messages'));
  carregarMais.type = 'button';
  mensagens.append(carregarMais);

  const descer = elemento('button', 'chat__descer');
  descer.type = 'button';
  descer.hidden = true;
  descer.innerHTML = ícone('seta-baixo');
  descer.setAttribute('aria-label', txt('Voltar para agora', 'Jump to newest'));
  descer.addEventListener('click', () => {
    mensagens.scrollTo({ top: mensagens.scrollHeight, behavior: 'smooth' });
  });

  const composer = criarComposer(sala, mensagens, sessao);
  carregarMais.addEventListener('click', () => carregarAnteriores(sala, mensagens, sessao, composer, carregarMais));
  configurarScroll(mensagens, descer);

  conversa.append(cabecalho, mensagens, descer, composer);

  try {
    const resposta = await api('/api/chat/salas/' + encodeURIComponent(sala.id) + '/mensagens');
    if (salaAtual !== sala.id) return;
    const listaMensagens = resposta.mensagens || [];
    for (const msg of listaMensagens) mostrarMensagem(msg, mensagens, sessao, composer, { rolar: false });
    mensagens.scrollTop = mensagens.scrollHeight;
    carregarMais.hidden = listaMensagens.length < 50;

    if (marcar && listaMensagens.length) {
      const ultimo = listaMensagens[listaMensagens.length - 1];
      await marcarLeitura(sala.id, ultimo.id);
    }
  } catch {
    mensagens.append(elemento('p', 'chat__erro', txt('Não foi possível carregar as mensagens.', 'Could not load messages.')));
  }
}

async function mostrarAceite(corpo, sessao) {
  corpo.replaceChildren();
  const cartao = elemento('div', 'chat__aceite');
  cartao.append(
    elemento('h2', '', txt('Antes de começar', 'Before you start')),
    elemento(
      'p',
      '',
      txt(
        'O chat público é visível a outras pessoas. Conversas privadas expiram em 48 horas. Mensagens podem ser denunciadas e moderadas. Não compartilhe dados pessoais.',
        'Public chat is visible to others. Private conversations expire after 48 hours. Messages can be reported and moderated. Do not share personal information.'
      )
    )
  );

  const botao = elemento('button', 'botão botão--primário', txt('Li e aceito', 'I agree'));
  botao.type = 'button';
  botao.addEventListener('click', async () => {
    botao.disabled = true;
    try {
      await api('/api/chat/aceite', { metodo: 'POST', dados: { aceito: true } });
      sessao.chat_aceito = true;
      await montarChat(corpo, sessao);
      iniciarEventos(sessao);
    } catch {
      botao.disabled = false;
      cartao.append(elemento('p', 'chat__erro', txt('Não foi possível abrir o chat.', 'Could not open chat.')));
    }
  });

  cartao.append(botao);
  corpo.append(cartao);
}

async function montarChat(corpo, sessao) {
  corpo.replaceChildren(elemento('p', 'chat__estado', txt('Carregando conversas…', 'Loading conversations…')));
  await buscarSalas();
  criarInterfaceChat(corpo, sessao);

  if (salaAtual) {
    const mesma = salasCache.find(s => String(s.id) === String(salaAtual));
    if (mesma) return abrirSala(mesma, conversaAtual, sessao, { marcar: true });
  }

  const primeira = salasCache.find(s => s.nao_lidas > 0) || salasCache[0];
  if (primeira) await abrirSala(primeira, conversaAtual, sessao, { marcar: true });
}

function iniciarEventos(sessao) {
  if (!('EventSource' in window) || eventos) return;
  clearTimeout(reconectarTimer);

  eventos = new EventSource('/api/chat/eventos', { withCredentials: true });

  eventos.addEventListener('mensagem', async evento => {
    try {
      const dado = JSON.parse(evento.data);
      const id = String(dado.salaId || dado.sala || '');
      const msg = dado.mensagem || dado;
      if (msg.autor?.id && Number(msg.autor.id) !== Number(sessao.usuario?.id)) tocarSom('notificacao');
      const painelVisivel = painelAtual && !painelAtual.hidden && painelAtual.dataset.fechando !== 'sim';

      if (painelVisivel && String(salaAtual) === id && conversaAtual) {
        const lista = conversaAtual.querySelector('.chat__mensagens');
        const composer = conversaAtual.querySelector('.chat__form');
        if (lista && composer) {
          mostrarMensagem(msg, lista, sessao, composer);
          if (msg.id) await marcarLeitura(id, msg.id);
        }
      } else {
        await buscarSalas();
      }
    } catch {}
  });

  eventos.addEventListener('remocao', evento => {
    try {
      const dado = JSON.parse(evento.data);
      const item = painelAtual?.querySelector('.chat__mensagem[data-id="' + String(dado.removidaId) + '"]');
      const lista = item?.closest('.chat__mensagens');
      item?.remove();
      if (lista) { organizarMensagens(lista); atualizarParticipantes(); }
      buscarSalas();
    } catch {}
  });

  eventos.onerror = () => {
    eventos?.close();
    eventos = null;
    clearTimeout(reconectarTimer);
    reconectarTimer = window.setTimeout(() => iniciarEventos(sessao), 5000);
  };
}

export function ligarChat(sessao) {
  if (document.getElementById('chat-bolha')) return;
  sessaoAtual = sessao;
  conversasRecolhidas = window.matchMedia('(max-width: 700px)').matches;

  const bolha = elemento('button', 'chat__bolha');
  bolha.id = 'chat-bolha';
  bolha.type = 'button';
  bolha.innerHTML = ícone('balão');
  bolha.setAttribute('aria-label', txt('Abrir chat', 'Open chat'));
  bolha.setAttribute('aria-expanded', 'false');

  const badge = elemento('span', 'chat__bolha-badge');
  badge.hidden = true;
  bolha.append(badge);

  const painel = elemento('section', 'chat__painel');
  painel.id = 'chat-painel';
  painel.hidden = true;
  painel.setAttribute('aria-label', txt('Chat da comunidade', 'Community chat'));

  const topo = elemento('div', 'chat__topo');
  const identidade = elemento('div', 'chat__identidade');
  identidade.append(avatarDe(sessao.usuario || {}, 'chat__topo-avatar'));

  const identidadeTexto = elemento('span', 'chat__identidade-texto');
  identidadeTexto.append(
    elemento('b', '', txt('Conversas', 'Messages')),
    elemento('small', '', sessao.usuario?.usuario ? '@' + sessao.usuario.usuario : txt('Você está online', 'You are online'))
  );
  identidade.append(identidadeTexto);

  const fechar = elemento('button', 'chat__fechar');
  fechar.type = 'button';
  fechar.innerHTML = ícone('fechar');
  fechar.setAttribute('aria-label', txt('Fechar chat', 'Close chat'));

  topo.append(identidade, fechar);

  const aviso = elemento(
    'p',
    'chat__aviso',
    txt('Público: só texto. Privado: mídia protegida e expira em 48 h.', 'Public: text only. Private: protected media, expires in 48 h.')
  );

  const corpo = elemento('div', 'chat__corpo');
  painel.append(topo, aviso, corpo);
  document.body.append(bolha, painel);

  bolhaAtual = bolha;
  badgeBolha = badge;
  painelAtual = painel;
  corpoAtual = corpo;

  let temporizadorFechar = 0;
  const ocultar = () => {
    if (painel.hidden || painel.dataset.fechando === 'sim') return;
    tocarSom('fechar');
    painel.dataset.fechando = 'sim';
    bolha.setAttribute('aria-expanded', 'false');
    if (formatacao) formatacao.hidden = true;
    clearTimeout(temporizadorFechar);
    temporizadorFechar = window.setTimeout(() => {
      painel.hidden = true;
      delete painel.dataset.fechando;
    }, 175);
  };

  fechar.addEventListener('click', ocultar);
  bolha.addEventListener('click', async () => {
    if (!painel.hidden) {
      ocultar();
      return;
    }

    clearTimeout(temporizadorFechar);
    delete painel.dataset.fechando;
    painel.hidden = false;
    tocarSom('abrir');
    bolha.setAttribute('aria-expanded', 'true');

    if (!sessao.chat_aceito && !sessao.usuario?.chat_aceito) {
      await mostrarAceite(corpo, sessao);
    } else {
      await montarChat(corpo, sessao);
    }
  });

  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && painel && !painel.hidden && !evento.defaultPrevented && !document.querySelector('dialog[open],:popover-open')) {
      ocultar();
    }
  });

  if (sessao.chat_aceito || sessao.usuario?.chat_aceito) {
    buscarSalas();
    iniciarEventos(sessao);
  }
}

function garantirModalMidia() {
  let modal = document.querySelector('.chat__midia-modal');
  if (modal) return modal;

  modal = document.createElement('dialog');
  modal.className = 'chat__midia-modal';
  modal.innerHTML =
    '<div class="chat__midia-modal-topo"><strong></strong><div class="chat__midia-modal-acoes"></div></div>'
    + '<div class="chat__midia-modal-corpo"></div>';
  document.body.append(modal);

  modal.addEventListener('cancel', evento => {
    evento.preventDefault();
    fecharModalMidia(modal);
  });
  return modal;
}

function fecharModalMidia(modal) {
  const player = modal.querySelector('audio,video');
  if (player && player.dataset.midiaId) {
    salvarProgressoPlayer(player, false);
    player.pause();
  }
  modal.close();
  modal.querySelector('.chat__midia-modal-corpo')?.replaceChildren();
}

async function salvarProgressoPlayer(player, concluida) {
  const id = Number(player.dataset.midiaId);
  if (!id) return;
  try {
    await api('/api/chat/midias/' + id + '/progresso', {
      metodo: 'PATCH',
      dados: {
        posicao: player.currentTime || 0,
        duracao: Number.isFinite(player.duration) ? player.duration : null,
        concluida: Boolean(concluida),
      },
    });
  } catch {}
}

function criarPlayer(midia) {
  const caixa = elemento('div', 'chat__player');
  const media = document.createElement(midia.tipo === 'video' ? 'video' : 'audio');
  media.src = midia.url;
  media.preload = 'metadata';
  media.dataset.midiaId = String(midia.id);
  media.playsInline = true;
  if (midia.tipo === 'video') media.className = 'chat__player-video';

  const controles = elemento('div', 'chat__player-controles');
  const play = elemento('button', 'chat__player-play');
  play.type = 'button';
  play.innerHTML = ícone('seta');
  play.setAttribute('aria-label', txt('Reproduzir ou pausar', 'Play or pause'));

  const progresso = document.createElement('input');
  progresso.type = 'range';
  progresso.min = '0';
  progresso.max = '1000';
  progresso.value = '0';
  progresso.className = 'chat__player-progresso';
  progresso.setAttribute('aria-label', txt('Progresso', 'Progress'));

  const tempo = elemento('span', 'chat__player-tempo', '0:00 / 0:00');

  const mute = elemento('button', 'chat__player-mute');
  mute.type = 'button';
  mute.textContent = '◖';
  mute.setAttribute('aria-label', txt('Silenciar', 'Mute'));

  const volume = document.createElement('input');
  volume.type = 'range';
  volume.min = '0';
  volume.max = '1';
  volume.step = '.05';
  volume.value = '1';
  volume.className = 'chat__player-volume';
  volume.setAttribute('aria-label', txt('Volume', 'Volume'));

  play.addEventListener('click', () => {
    if (media.paused) media.play().catch(() => {});
    else media.pause();
  });

  media.addEventListener('play', () => play.classList.add('is-playing'));
  media.addEventListener('pause', () => play.classList.remove('is-playing'));

  media.addEventListener('loadedmetadata', () => {
    tempo.textContent = '0:00 / ' + tempoMidia(media.duration);
  });

  media.addEventListener('timeupdate', () => {
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    progresso.value = String(Math.round((media.currentTime / media.duration) * 1000));
    tempo.textContent = tempoMidia(media.currentTime) + ' / ' + tempoMidia(media.duration);
  });

  progresso.addEventListener('input', () => {
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    media.currentTime = (Number(progresso.value) / 1000) * media.duration;
  });

  volume.addEventListener('input', () => {
    media.volume = Number(volume.value);
    media.muted = media.volume === 0;
  });

  mute.addEventListener('click', () => {
    media.muted = !media.muted;
    mute.dataset.muted = media.muted ? 'sim' : 'nao';
  });

  let ultimoSalvo = 0;
  media.addEventListener('timeupdate', () => {
    if (Math.abs(media.currentTime - ultimoSalvo) < 5) return;
    ultimoSalvo = media.currentTime;
    salvarProgressoPlayer(media, false);
  });
  media.addEventListener('ended', () => salvarProgressoPlayer(media, true));

  controles.append(play, progresso, tempo, mute, volume);
  caixa.append(media, controles);

  const anterior = midia.reproducao?.posicao || 0;
  if (anterior > 5 && !(midia.reproducao?.concluida)) {
    const retomar = elemento('div', 'chat__retomar');
    retomar.append(
      elemento('b', '', txt('Você já abriu esta mídia', 'You opened this media before')),
      elemento('span', '', txt('Continuar de ', 'Resume from ') + tempoMidia(anterior) + '?')
    );

    const botoes = elemento('div', 'ações');
    const continuar = elemento('button', 'botão botão--primário', txt('Continuar', 'Resume'));
    const inicio = elemento('button', 'botão botão--linha', txt('Do início', 'Start over'));
    continuar.type = inicio.type = 'button';

    continuar.addEventListener('click', () => {
      media.currentTime = anterior;
      retomar.remove();
      media.play().catch(() => {});
    });
    inicio.addEventListener('click', () => {
      media.currentTime = 0;
      retomar.remove();
      media.play().catch(() => {});
    });

    botoes.append(inicio, continuar);
    retomar.append(botoes);
    caixa.append(retomar);
  }

  return caixa;
}

function abrirMidia(midia, msg) {
  const modal = garantirModalMidia();
  const titulo = modal.querySelector('.chat__midia-modal-topo strong');
  const acoes = modal.querySelector('.chat__midia-modal-acoes');
  const corpo = modal.querySelector('.chat__midia-modal-corpo');

  titulo.textContent = midia.nome;
  acoes.replaceChildren();
  corpo.replaceChildren();

  const baixar = elemento('a', 'chat__modal-botao');
  baixar.href = midia.url + '?download=1';
  baixar.download = midia.nome;
  baixar.title = txt('Baixar', 'Download');
  baixar.innerHTML = ícone('baixar');

  const denunciar = elemento('button', 'chat__modal-botao');
  denunciar.type = 'button';
  denunciar.title = txt('Denunciar conteúdo', 'Report content');
  denunciar.innerHTML = ícone('alerta');
  denunciar.addEventListener('click', denunciarMensagem(msg, denunciar));

  const fechar = elemento('button', 'chat__modal-botao');
  fechar.type = 'button';
  fechar.title = txt('Fechar', 'Close');
  fechar.innerHTML = ícone('fechar');
  fechar.addEventListener('click', () => fecharModalMidia(modal));

  acoes.append(baixar, denunciar, fechar);

  if (midia.tipo === 'imagem') {
    const img = document.createElement('img');
    img.className = 'chat__modal-imagem';
    img.src = midia.url;
    img.alt = midia.nome;
    corpo.append(img);
  } else if (midia.tipo === 'audio' || midia.tipo === 'video') {
    corpo.append(criarPlayer(midia));
  } else {
    const arquivo = elemento('div', 'chat__modal-arquivo');
    const simbolo = elemento('span');
    simbolo.innerHTML = ícone('documento');
    arquivo.append(
      simbolo,
      elemento('strong', '', midia.nome),
      elemento('small', '', tamanhoArquivo(midia.tamanho))
    );
    corpo.append(arquivo);
  }

  modal.showModal();
}

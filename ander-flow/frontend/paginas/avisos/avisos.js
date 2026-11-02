// avisos.js — abas "Avisos do sistema" / "Mensagens": lista de avisos com lido/marcar-tudo,
// convite para entrar sem sessão e conversa com envio/marcação de lidas com sessão.
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { usuarioAtual } from '/estatico/compartilhado/compartilhado-sessao.js';
import { montarLinhaAviso, montarMensagem } from '/estatico/paginas/avisos/avisos-lista.js';

const abaSistema = document.getElementById('avisos-aba-sistema');
const abaMensagens = document.getElementById('avisos-aba-mensagens');
const painelSistema = document.getElementById('avisos-painel-sistema');
const painelMensagens = document.getElementById('avisos-painel-mensagens');
const contador = document.querySelector('.avisos__contador');

const sistemaCarregando = document.querySelector('.avisos__sistema-carregando');
const sistemaLista = document.querySelector('.avisos__lista');
const sistemaVazio = document.querySelector('.avisos__sistema-vazio');
const sistemaErro = document.querySelector('.avisos__sistema-erro');
const sistemaRecarregar = document.querySelector('.avisos__sistema-recarregar');
const botaoMarcarTodos = document.querySelector('.avisos__marcar-todos');

const mensagensCarregando = document.querySelector('.avisos__mensagens-carregando');
const mensagensLista = document.querySelector('.avisos__mensagens-lista');
const mensagensVazio = document.querySelector('.avisos__mensagens-vazio');
const mensagensErro = document.querySelector('.avisos__mensagens-erro');
const mensagensRecarregar = document.querySelector('.avisos__mensagens-recarregar');
const formaMensagem = document.querySelector('.avisos__forma-mensagem');
const entradaMensagem = document.querySelector('.avisos__mensagem-entrada');
const erroMensagem = document.querySelector('.avisos__mensagem-erro');

let mensagensCarregadas = false;

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

function atualizarContador(quantidade) {
  if (quantidade > 0) {
    contador.textContent = String(quantidade);
    contador.hidden = false;
  } else {
    contador.hidden = true;
  }
}

function selecionarAba(nome) {
  const sistemaAtiva = nome !== 'mensagens';
  abaSistema.setAttribute('aria-selected', String(sistemaAtiva));
  abaMensagens.setAttribute('aria-selected', String(!sistemaAtiva));
  painelSistema.hidden = !sistemaAtiva;
  painelMensagens.hidden = sistemaAtiva;
  if (!sistemaAtiva && usuarioAtual().sessaoAtiva && !mensagensCarregadas) carregarMensagens();
}

function ligarAbas() {
  abaSistema.addEventListener('click', () => selecionarAba('sistema'));
  abaMensagens.addEventListener('click', () => selecionarAba('mensagens'));
  for (const [aba, oposta] of [[abaSistema, abaMensagens], [abaMensagens, abaSistema]]) {
    aba.addEventListener('keydown', (evento) => {
      if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
      evento.preventDefault();
      oposta.focus();
      oposta.click();
    });
  }
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get('aba') === 'mensagens') selecionarAba('mensagens');
}

async function marcarLido(id) {
  try {
    await chamarApi(`/api/avisos/${id}/lido`, { metodo: 'POST' });
  } catch {
    // marcação individual é best-effort; não deve incomodar a leitura do aviso
  }
}

async function carregarSistema() {
  sistemaCarregando.hidden = false;
  sistemaLista.hidden = true;
  sistemaVazio.hidden = true;
  sistemaErro.hidden = true;
  try {
    const resposta = await chamarApi('/api/avisos');
    const avisos = resposta?.avisos ?? [];
    sistemaCarregando.hidden = true;
    limparFilhos(sistemaLista);

    if (!avisos.length) {
      sistemaVazio.hidden = false;
      return;
    }

    const sessaoAtiva = usuarioAtual().sessaoAtiva;
    for (const aviso of avisos) {
      sistemaLista.append(montarLinhaAviso(aviso, {
        aoAbrir: sessaoAtiva && !aviso.lido ? () => marcarLido(aviso.id) : null,
      }));
    }
    sistemaLista.hidden = false;
  } catch {
    sistemaCarregando.hidden = true;
    sistemaErro.hidden = false;
  }
}

async function marcarTodosLidos() {
  try {
    await chamarApi('/api/avisos/marcar-todos', { metodo: 'POST' });
    mostrarAviso(t('avisos.sistema.marcados'));
    await carregarSistema();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro), 'erro');
  }
}

async function marcarMensagensLidas() {
  try {
    await chamarApi('/api/mensagens/lidas', { metodo: 'POST' });
  } catch {
    // marcação de mensagens é best-effort
  }
}

async function carregarMensagens() {
  mensagensCarregando.hidden = false;
  mensagensLista.hidden = true;
  mensagensVazio.hidden = true;
  mensagensErro.hidden = true;
  try {
    const resposta = await chamarApi('/api/mensagens');
    const mensagens = resposta?.mensagens ?? [];
    mensagensCarregadas = true;
    mensagensCarregando.hidden = true;
    limparFilhos(mensagensLista);

    if (!mensagens.length) {
      mensagensVazio.hidden = false;
    } else {
      for (const mensagem of mensagens) mensagensLista.append(montarMensagem(mensagem));
      mensagensLista.hidden = false;
      mensagensLista.scrollTop = mensagensLista.scrollHeight;
    }

    atualizarContador(0);
    if (resposta?.nao_lidas) await marcarMensagensLidas();
  } catch {
    mensagensCarregando.hidden = true;
    mensagensErro.hidden = false;
  }
}

async function prepararContadorInicial() {
  if (!usuarioAtual().sessaoAtiva) return;
  try {
    const resposta = await chamarApi('/api/mensagens');
    atualizarContador(resposta?.nao_lidas ?? 0);
  } catch {
    // contador inicial é best-effort
  }
}

function corpoValido(texto) {
  const tamanho = texto.trim().length;
  return tamanho >= 1 && tamanho <= 2000;
}

function ligarFormaMensagem() {
  formaMensagem.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const corpo = entradaMensagem.value;
    if (!corpoValido(corpo)) {
      erroMensagem.textContent = t('compartilhado.erros.formato_invalido');
      erroMensagem.hidden = false;
      entradaMensagem.setAttribute('aria-invalid', 'true');
      return;
    }
    erroMensagem.hidden = true;
    entradaMensagem.removeAttribute('aria-invalid');

    try {
      const resposta = await chamarApi('/api/mensagens', { metodo: 'POST', corpo: { corpo } });
      if (resposta?.mensagem) {
        mensagensVazio.hidden = true;
        mensagensLista.append(montarMensagem(resposta.mensagem));
        mensagensLista.hidden = false;
        mensagensLista.scrollTop = mensagensLista.scrollHeight;
      }
      entradaMensagem.value = '';
    } catch (erro) {
      erroMensagem.textContent = mensagemDeErro(erro);
      erroMensagem.hidden = false;
    }
  });
}

sistemaRecarregar.addEventListener('click', carregarSistema);
mensagensRecarregar.addEventListener('click', carregarMensagens);
botaoMarcarTodos.addEventListener('click', marcarTodosLidos);
ligarFormaMensagem();
ligarAbas();

aoTrocarIdioma(() => {
  carregarSistema();
  if (mensagensCarregadas) carregarMensagens();
});

carregarSistema();
prepararContadorInicial();

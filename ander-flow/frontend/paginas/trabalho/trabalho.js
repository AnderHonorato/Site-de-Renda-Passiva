// trabalho.js — data de hoje, resumo, "Em aberto" com retomar/excluir, prévia de salvos e
// "Seu mês" (documentos, ferramentas usadas e limite de lote do plano).
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { confirmar, mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { formatarDataLonga } from '/estatico/compartilhado/compartilhado-formatar.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { montarLinhaSalvo, montarLinhaTrabalho } from '/estatico/paginas/trabalho/trabalho-lista.js';

const MAXIMO_SALVOS_PREVIA = 6;

const elementoData = document.querySelector('.trabalho__data');
const elementoResumo = document.querySelector('.trabalho__resumo');
const carregando = document.querySelector('.trabalho__carregando');
const lista = document.querySelector('.trabalho__lista');
const vazio = document.querySelector('.trabalho__vazio');
const blocoErro = document.querySelector('.trabalho__erro');
const botaoRecarregar = document.querySelector('.trabalho__recarregar');
const listaSalvos = document.querySelector('.trabalho__salvos-lista');
const salvosVazio = document.querySelector('.trabalho__salvos-vazio');
const mesDocumentos = document.querySelector('.trabalho__mes-documentos');
const mesFerramentas = document.querySelector('.trabalho__mes-ferramentas');
const mesLote = document.querySelector('.trabalho__mes-lote');

let ferramentasPorSlug = new Map();

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

/** Deixa a primeira letra maiúscula (o resto do texto de `formatarDataLonga` já vem certo). Função pura. */
export function capitalizarPrimeira(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

function mostrarData() {
  elementoData.textContent = capitalizarPrimeira(formatarDataLonga(new Date().toISOString()));
}

function mostrarResumo(quantidade) {
  elementoResumo.textContent = quantidade === 0
    ? t('trabalho.resumo_zero')
    : quantidade === 1
      ? t('trabalho.resumo_um')
      : t('trabalho.resumo', { quantidade });
}

function mostrarLimiteLote() {
  const chave = document.documentElement.dataset.plano === 'plus' ? 'trabalho.mes.lote_plus' : 'trabalho.mes.lote_gratis';
  mesLote.textContent = t(chave);
}

async function excluirTrabalho(trabalho, item) {
  const confirmou = await confirmar({
    titulo: t('trabalho.em_aberto.confirmar_titulo'),
    texto: t('trabalho.em_aberto.confirmar_texto', { titulo: trabalho.titulo }),
    rotuloConfirmar: t('compartilhado.acoes.excluir'),
    perigo: true,
  });
  if (!confirmou) return;
  try {
    await chamarApi(`/api/trabalhos/${trabalho.id}`, { metodo: 'DELETE' });
    item.remove();
    mostrarAviso(t('trabalho.em_aberto.excluido'));
    const restantes = lista.querySelectorAll('.trabalho__item').length;
    mostrarResumo(restantes);
    if (!restantes) {
      lista.hidden = true;
      vazio.hidden = false;
    }
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro), 'erro');
  }
}

async function carregarEmAberto() {
  carregando.hidden = false;
  lista.hidden = true;
  vazio.hidden = true;
  blocoErro.hidden = true;
  try {
    const resposta = await chamarApi('/api/trabalhos?situacao=em_aberto');
    const trabalhos = resposta?.trabalhos ?? [];
    mostrarResumo(trabalhos.length);
    carregando.hidden = true;
    limparFilhos(lista);

    if (!trabalhos.length) {
      vazio.hidden = false;
      return;
    }

    for (const trabalho of trabalhos) {
      const ferramenta = ferramentasPorSlug.get(trabalho.ferramenta_slug) ?? null;
      lista.append(montarLinhaTrabalho(trabalho, ferramenta, { aoExcluir: excluirTrabalho }));
    }
    lista.hidden = false;
  } catch {
    carregando.hidden = true;
    blocoErro.hidden = false;
  }
}

async function carregarSalvos() {
  try {
    const resposta = await chamarApi('/api/favoritos');
    const favoritos = (resposta?.favoritos ?? []).slice(0, MAXIMO_SALVOS_PREVIA);
    limparFilhos(listaSalvos);
    for (const favorito of favoritos) {
      const ferramenta = ferramentasPorSlug.get(favorito.slug);
      if (ferramenta) listaSalvos.append(montarLinhaSalvo(ferramenta));
    }
    const temItens = listaSalvos.childElementCount > 0;
    listaSalvos.hidden = !temItens;
    salvosVazio.hidden = temItens;
  } catch {
    listaSalvos.hidden = true;
    salvosVazio.hidden = false;
  }
}

async function carregarUsoMensal() {
  try {
    const resposta = await chamarApi('/api/conta/uso-mensal');
    mesDocumentos.textContent = String(resposta?.documentos ?? 0);
    mesFerramentas.textContent = String(resposta?.ferramentas_usadas ?? 0);
  } catch {
    mesDocumentos.textContent = t('compartilhado.simbolos.sem_valor');
    mesFerramentas.textContent = t('compartilhado.simbolos.sem_valor');
  }
}

async function carregarFerramentas() {
  try {
    const resposta = await chamarApi('/api/ferramentas');
    ferramentasPorSlug = new Map((resposta?.ferramentas ?? []).map((ferramenta) => [ferramenta.slug, ferramenta]));
  } catch {
    ferramentasPorSlug = new Map();
  }
}

async function carregar() {
  mostrarData();
  mostrarLimiteLote();
  await carregarFerramentas();
  await Promise.all([carregarEmAberto(), carregarSalvos(), carregarUsoMensal()]);
}

botaoRecarregar.addEventListener('click', carregarEmAberto);

aoTrocarIdioma(() => {
  mostrarData();
  mostrarLimiteLote();
  carregarEmAberto();
  carregarSalvos();
});

carregar();

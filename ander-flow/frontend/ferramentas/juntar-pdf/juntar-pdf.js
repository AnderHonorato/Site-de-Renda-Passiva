// juntar-pdf.js — interface: escolher, ordenar e juntar PDFs no próprio navegador.
import { ErroApi } from '/estatico/compartilhado/compartilhado-api.js';
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import {
  baixarArquivo, carregarRecursoPlus, iniciarFerramenta, mostrarBloqueioPlano, registrarUso,
} from '/estatico/compartilhado/compartilhado-ferramenta.js';
import { carregarRelacionadas } from '/estatico/compartilhado/compartilhado-ferramenta-formulario.js';
import { formatarNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { juntarPdfs, validarArquivo } from '/estatico/ferramentas/juntar-pdf/juntar-pdf-processamento.js';

const SLUG = 'juntar-pdf';

const areaSoltar = document.getElementById('area-soltar');
const campoArquivos = document.getElementById('campo-arquivos');
const listaArquivos = document.getElementById('lista-arquivos');
const caixaErro = document.getElementById('erro-arquivos');
const bloqueio = document.querySelector('.bloqueio-plano');
const botaoJuntar = document.getElementById('botao-juntar');
const formulario = document.querySelector('.ferramenta__formulario');
const blocoProgresso = document.querySelector('.juntar-pdf__progresso');
const textoProgresso = document.getElementById('progresso-texto');
const barraProgresso = document.getElementById('progresso-barra');
const blocoResumo = document.querySelector('.juntar-pdf__resumo');
const blocoVazio = document.querySelector('.juntar-pdf__vazio');

let arquivos = [];
let limiteDeArquivos = Number(document.documentElement.dataset.limiteLoteGratis || 3);
let cancelar = false;
let resultado = null;

function formatarTamanho(bytes) {
  const mega = bytes / (1024 * 1024);
  return mega >= 1
    ? t(`${SLUG}.tamanho.mb`, { valor: formatarNumero(mega, 1) })
    : t(`${SLUG}.tamanho.kb`, { valor: formatarNumero(bytes / 1024, 0) });
}

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

function criarIcone(nome, classe = 'icone icone--20') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${nome}`);
  svg.append(uso);
  return svg;
}

function mover(indice, passo) {
  const destino = indice + passo;
  if (destino < 0 || destino >= arquivos.length) return;
  [arquivos[indice], arquivos[destino]] = [arquivos[destino], arquivos[indice]];
  desenharLista();
  const botoes = listaArquivos.querySelectorAll(`[data-indice="${destino}"][data-acao="${passo < 0 ? 'subir' : 'descer'}"]`);
  botoes[0]?.focus();
}

function remover(indice) {
  arquivos.splice(indice, 1);
  desenharLista();
}

function desenharLista() {
  limparFilhos(listaArquivos);
  for (const [indice, arquivo] of arquivos.entries()) {
    const item = document.createElement('li');
    item.className = 'lista-arquivos__item';

    const posicao = document.createElement('span');
    posicao.className = 'lista-arquivos__posicao';
    posicao.textContent = formatarNumero(indice + 1, 0);

    const nome = document.createElement('span');
    nome.className = 'lista-arquivos__nome';
    nome.textContent = arquivo.nome;

    const detalhe = document.createElement('span');
    detalhe.className = 'texto-pequeno texto-2';
    detalhe.textContent = formatarTamanho(arquivo.bytes.length);

    const acoes = document.createElement('span');
    acoes.className = 'lista-arquivos__acoes';
    for (const [acao, icone, chave, passo] of [
      ['subir', 'seta-cima', 'compartilhado.acoes.subir', -1],
      ['descer', 'seta-baixo', 'compartilhado.acoes.descer', 1],
      ['remover', 'fechar', 'compartilhado.acoes.remover', 0],
    ]) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'botao-icone';
      botao.dataset.acao = acao;
      botao.dataset.indice = String(indice);
      botao.setAttribute('aria-label', `${t(chave)}: ${arquivo.nome}`);
      botao.disabled = (acao === 'subir' && indice === 0) || (acao === 'descer' && indice === arquivos.length - 1);
      botao.append(criarIcone(icone, 'icone icone--16'));
      botao.addEventListener('click', () => (acao === 'remover' ? remover(indice) : mover(indice, passo)));
      acoes.append(botao);
    }

    item.append(posicao, nome, detalhe, acoes);
    listaArquivos.append(item);
  }

  botaoJuntar.disabled = arquivos.length < 2;
  blocoVazio.hidden = arquivos.length > 0;
  atualizarLimite();
}

async function atualizarLimite() {
  caixaErro.textContent = '';
  if (arquivos.length <= limiteDeArquivos) {
    bloqueio.hidden = true;
    return;
  }
  try {
    const modulo = await carregarRecursoPlus('lote', SLUG);
    limiteDeArquivos = modulo.limiteDeArquivos;
    bloqueio.hidden = true;
    if (arquivos.length > limiteDeArquivos) {
      caixaErro.textContent = t(`${SLUG}.erros.limite_de_arquivos`, { limite: formatarNumero(limiteDeArquivos, 0) });
      botaoJuntar.disabled = true;
    }
  } catch (erro) {
    if (erro instanceof ErroApi && (erro.status === 401 || erro.status === 403)) {
      bloqueio.hidden = false;
      await mostrarBloqueioPlano(bloqueio, {
        titulo: t(`${SLUG}.plus.titulo`, { quantidade: formatarNumero(arquivos.length, 0) }),
        texto: t(`${SLUG}.plus.texto`, { limite: formatarNumero(limiteDeArquivos, 0) }),
      });
      botaoJuntar.disabled = true;
      return;
    }
    caixaErro.textContent = t('compartilhado.erros.erro_interno');
  }
}

async function adicionar(listaDeArquivos) {
  caixaErro.textContent = '';
  for (const arquivo of listaDeArquivos) {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const validacao = validarArquivo({ nome: arquivo.name, tamanho: arquivo.size, bytes });
    if (!validacao.ok) {
      caixaErro.textContent = t(`${SLUG}.erros.${validacao.erro}`, { nome: arquivo.name });
      continue;
    }
    arquivos.push({ nome: arquivo.name, bytes });
  }
  desenharLista();
}

function mostrarProgresso({ pagina, total }) {
  barraProgresso.max = total;
  barraProgresso.value = pagina;
  textoProgresso.textContent = t(`${SLUG}.progresso.pagina`, {
    pagina: formatarNumero(pagina, 0),
    total: formatarNumero(total, 0),
  });
}

async function juntar() {
  caixaErro.textContent = '';
  blocoResumo.hidden = true;
  blocoVazio.hidden = true;
  blocoProgresso.hidden = false;
  cancelar = false;
  botaoJuntar.disabled = true;

  try {
    const biblioteca = await import('/estatico/compartilhado/bibliotecas/pdf-lib.esm.min.js');
    resultado = await juntarPdfs(arquivos, {
      biblioteca,
      limiteDeArquivos,
      aoProgredir: mostrarProgresso,
      cancelado: () => cancelar,
    });
  } catch {
    resultado = { ok: false, erro: 'pdf_corrompido' };
  }

  blocoProgresso.hidden = true;
  botaoJuntar.disabled = arquivos.length < 2;

  if (!resultado.ok) {
    if (resultado.erro !== 'cancelado') {
      caixaErro.textContent = t(`${SLUG}.erros.${resultado.erro}`, {
        nome: resultado.extras?.nome ?? '',
        limite: formatarNumero(resultado.extras?.limite ?? limiteDeArquivos, 0),
      });
    }
    blocoVazio.hidden = arquivos.length > 0;
    return;
  }

  document.getElementById('resultado-paginas').textContent = t(`${SLUG}.resultado.paginas`, {
    quantidade: formatarNumero(resultado.paginas, 0),
  });
  document.getElementById('resultado-arquivos').textContent = formatarNumero(resultado.arquivos, 0);
  document.getElementById('resultado-tamanho').textContent = formatarTamanho(resultado.bytes.length);
  blocoResumo.hidden = false;
  registrarUso(SLUG, 'documento');
  mostrarAviso(t(`${SLUG}.resultado.pronto`));
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  juntar();
});

campoArquivos.addEventListener('change', () => {
  adicionar([...campoArquivos.files]);
  campoArquivos.value = '';
});

for (const evento of ['dragenter', 'dragover']) {
  areaSoltar.addEventListener(evento, (e) => {
    e.preventDefault();
    areaSoltar.classList.add('soltar-arquivos--ativa');
  });
}
for (const evento of ['dragleave', 'drop']) {
  areaSoltar.addEventListener(evento, (e) => {
    e.preventDefault();
    areaSoltar.classList.remove('soltar-arquivos--ativa');
  });
}
areaSoltar.addEventListener('drop', (evento) => {
  const soltos = [...(evento.dataTransfer?.files ?? [])];
  if (soltos.length) adicionar(soltos);
});

document.querySelector('[data-acao="cancelar"]').addEventListener('click', () => {
  cancelar = true;
});

document.querySelector('[data-acao="limpar"]').addEventListener('click', () => {
  arquivos = [];
  resultado = null;
  blocoResumo.hidden = true;
  caixaErro.textContent = '';
  desenharLista();
});

document.querySelector('[data-acao="baixar"]').addEventListener('click', () => {
  if (!resultado?.ok) return;
  baixarArquivo(new Blob([resultado.bytes], { type: 'application/pdf' }), t(`${SLUG}.resultado.nome_arquivo`));
});

aoTrocarIdioma(() => desenharLista());

iniciarFerramenta({ slug: SLUG });
carregarRelacionadas(SLUG);
desenharLista();

// principal.js — Início: busca por intenção, "Onde você parou" e entrada do catálogo.
import { chamarApi } from '/estatico/compartilhado/compartilhado-api.js';
import { buscarFerramentas } from '/estatico/compartilhado/compartilhado-busca.js';
import { formatarTempoRelativo } from '/estatico/compartilhado/compartilhado-formatar.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { recentesLocais, usuarioAtual } from '/estatico/compartilhado/compartilhado-sessao.js';
import { montarLinhaFerramenta } from '/estatico/paginas/principal/principal-lista.js';

const CHAVES_SUGESTOES = ['um', 'dois', 'tres', 'quatro', 'cinco'];
const MAXIMO_RESULTADOS = 5;
const MAXIMO_CATEGORIAS = 8;

const campo = document.querySelector('.busca-intencao__entrada');
const caixaResultados = document.querySelector('.principal__resultados');
const listaResultados = document.querySelector('.principal__resultados-lista');
const contagemResultados = document.querySelector('.principal__resultados-contagem');
const ligacaoTodos = document.querySelector('.principal__resultados-todos');
const caixaSugestoes = document.querySelector('.principal__sugestoes');
const gradeCategorias = document.querySelector('.principal__grade-categorias');
const notaCategorias = document.querySelector('.principal__nota-categorias');
const blocoRetomar = document.querySelector('.principal__retomar');
const listaRetomar = document.querySelector('.principal__retomar-lista');

let ferramentas = [];
let categorias = [];
let indiceAtivo = -1;

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

function montarSugestoes() {
  limparFilhos(caixaSugestoes);
  for (const chave of CHAVES_SUGESTOES) {
    const texto = t(`principal.sugestoes.${chave}`);
    const pilula = document.createElement('a');
    pilula.className = 'pilula';
    pilula.href = `/ferramentas?busca=${encodeURIComponent(texto)}`;
    pilula.textContent = texto;
    pilula.addEventListener('click', (evento) => {
      evento.preventDefault();
      campo.value = texto;
      campo.focus();
      mostrarResultados(texto);
    });
    caixaSugestoes.append(pilula);
  }
}

function mostrarResultados(consulta) {
  const termo = consulta.trim();
  indiceAtivo = -1;
  if (termo.length < 2 || !ferramentas.length) {
    caixaResultados.hidden = true;
    campo.setAttribute('aria-expanded', 'false');
    return;
  }

  const achados = buscarFerramentas(ferramentas, termo).slice(0, MAXIMO_RESULTADOS);
  limparFilhos(listaResultados);

  if (!achados.length) {
    contagemResultados.textContent = t('compartilhado.estados.sem_resultados', { consulta: termo });
  } else {
    contagemResultados.textContent = achados.length === 1
      ? t('principal.busca.resolve_uma')
      : t('principal.busca.resolvem', { quantidade: achados.length });
    for (const ferramenta of achados) listaResultados.append(montarLinhaFerramenta(ferramenta));
  }

  ligacaoTodos.href = `/ferramentas?busca=${encodeURIComponent(termo)}`;
  caixaResultados.hidden = false;
  campo.setAttribute('aria-expanded', 'true');
}

function ligacoesDosResultados() {
  return [...listaResultados.querySelectorAll('.lista-densa__ligacao[href]')];
}

function moverSelecao(passo) {
  const ligacoes = ligacoesDosResultados();
  if (!ligacoes.length) return;
  indiceAtivo = (indiceAtivo + passo + ligacoes.length) % ligacoes.length;
  ligacoes[indiceAtivo].focus();
}

function ligarTeclado() {
  campo.addEventListener('input', () => mostrarResultados(campo.value));
  campo.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      moverSelecao(1);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      moverSelecao(-1);
    } else if (evento.key === 'Escape') {
      caixaResultados.hidden = true;
      campo.setAttribute('aria-expanded', 'false');
    } else if (evento.key === 'Enter') {
      const primeira = ligacoesDosResultados()[0];
      if (primeira) {
        evento.preventDefault();
        window.location.assign(primeira.href);
      }
    }
  });
  document.addEventListener('click', (evento) => {
    if (!caixaResultados.contains(evento.target) && evento.target !== campo) caixaResultados.hidden = true;
  });
}

function montarCategorias() {
  limparFilhos(gradeCategorias);
  gradeCategorias.removeAttribute('data-estado');
  const visiveis = categorias.filter((categoria) => categoria.total > 0);
  for (const categoria of visiveis.slice(0, MAXIMO_CATEGORIAS)) {
    const item = document.createElement('li');
    const ligacao = document.createElement('a');
    ligacao.className = 'principal__categoria';
    ligacao.href = `/ferramentas?categoria=${encodeURIComponent(categoria.id)}`;

    const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icone.setAttribute('class', 'icone principal__categoria-icone');
    icone.setAttribute('aria-hidden', 'true');
    const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${categoria.icone}`);
    icone.append(uso);

    const textos = document.createElement('span');
    textos.className = 'principal__categoria-textos';
    const nome = document.createElement('b');
    nome.textContent = categoria.nome;
    const resumo = document.createElement('small');
    resumo.className = 'texto-2';
    resumo.textContent = categoria.resumo;
    textos.append(nome, resumo);

    const total = document.createElement('span');
    total.className = 'principal__categoria-total';
    total.textContent = String(categoria.total);
    total.setAttribute('aria-label', t('principal.categorias.contagem_rotulo', { quantidade: categoria.total }));

    ligacao.append(icone, textos, total);
    item.append(ligacao);
    gradeCategorias.append(item);
  }

  const restantes = visiveis.length - MAXIMO_CATEGORIAS;
  if (restantes > 0) {
    notaCategorias.textContent = t('principal.categorias.nota', { quantidade: restantes });
    notaCategorias.hidden = false;
  } else {
    notaCategorias.hidden = true;
  }
}

function montarRetomar(itens) {
  limparFilhos(listaRetomar);
  if (!itens.length) {
    blocoRetomar.hidden = true;
    return;
  }
  for (const item of itens) {
    const linha = document.createElement('li');
    const ligacao = document.createElement('a');
    ligacao.className = 'principal__retomar-item';
    ligacao.href = item.url;

    const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icone.setAttribute('class', 'icone icone--20');
    icone.setAttribute('aria-hidden', 'true');
    const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${item.icone}`);
    icone.append(uso);

    const nome = document.createElement('span');
    nome.className = 'principal__retomar-nome';
    nome.textContent = item.nome;

    const quando = document.createElement('span');
    quando.className = 'texto-pequeno texto-2';
    quando.textContent = item.quando;

    ligacao.append(icone, nome, quando);
    linha.append(ligacao);
    listaRetomar.append(linha);
  }
  blocoRetomar.hidden = false;
}

function porSlug(slug) {
  return ferramentas.find((ferramenta) => ferramenta.slug === slug) ?? null;
}

async function carregarRetomar() {
  const usuario = usuarioAtual();
  if (usuario.sessaoAtiva) {
    try {
      const resposta = await chamarApi('/api/trabalhos?situacao=em_aberto');
      const itens = (resposta?.trabalhos ?? []).slice(0, 4).map((trabalho) => {
        const ferramenta = porSlug(trabalho.ferramenta_slug);
        return {
          url: `/ferramentas/${trabalho.ferramenta_slug}?trabalho=${trabalho.id}`,
          icone: ferramenta?.icone ?? 'trabalho',
          nome: trabalho.titulo || ferramenta?.nome || trabalho.ferramenta_slug,
          quando: formatarTempoRelativo(trabalho.atualizado_em),
        };
      });
      if (itens.length) {
        montarRetomar(itens);
        return;
      }
    } catch {
      // Sem conta acessível agora: cai para o histórico deste aparelho.
    }
  }

  const locais = recentesLocais()
    .map((slug) => {
      const ferramenta = porSlug(slug);
      if (!ferramenta || !ferramenta.url) return null;
      return { url: ferramenta.url, icone: ferramenta.icone, nome: ferramenta.nome, quando: '' };
    })
    .filter(Boolean)
    .slice(0, 4);
  montarRetomar(locais);
}

function ligarLimparRecentes() {
  const botao = document.querySelector('[data-acao="limpar-recentes"]');
  if (!botao) return;
  botao.addEventListener('click', () => {
    try {
      window.localStorage.removeItem('af-recentes');
    } catch {
      // Armazenamento bloqueado: nada a limpar.
    }
    montarRetomar([]);
  });
}

async function carregar() {
  montarSugestoes();
  ligarTeclado();
  ligarLimparRecentes();
  try {
    const resposta = await chamarApi('/api/ferramentas');
    ferramentas = resposta?.ferramentas ?? [];
    categorias = resposta?.categorias ?? [];
    montarCategorias();
    await carregarRetomar();
  } catch {
    gradeCategorias.setAttribute('data-estado', 'erro');
    limparFilhos(gradeCategorias);
    const aviso = document.createElement('li');
    aviso.className = 'estado estado--erro';
    const titulo = document.createElement('p');
    titulo.className = 'estado__titulo';
    titulo.textContent = t('compartilhado.estados.erro_titulo');
    const texto = document.createElement('p');
    texto.className = 'estado__texto';
    texto.textContent = t('compartilhado.estados.erro_texto');
    aviso.append(titulo, texto);
    gradeCategorias.append(aviso);
  }

  const consultaInicial = new URLSearchParams(window.location.search).get('busca');
  if (consultaInicial) {
    campo.value = consultaInicial;
    mostrarResultados(consultaInicial);
  }
}

aoTrocarIdioma(() => {
  montarSugestoes();
  montarCategorias();
  carregarRetomar();
  if (campo.value) mostrarResultados(campo.value);
});

carregar();

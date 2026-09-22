// catalogo.js — lista densa das ferramentas, com busca, filtros e favoritos.
import { chamarApi, ErroApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { buscarFerramentas } from '/estatico/compartilhado/compartilhado-busca.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { definirSalvosLocais, salvosLocais, usuarioAtual } from '/estatico/compartilhado/compartilhado-sessao.js';
import { montarLinhaFerramenta } from '/estatico/paginas/catalogo/catalogo-lista.js';

const lista = document.querySelector('.catalogo__lista');
const carregando = document.querySelector('.catalogo__carregando');
const vazio = document.querySelector('.catalogo__vazio');
const vazioTitulo = document.querySelector('.catalogo__vazio-titulo');
const blocoErro = document.querySelector('.catalogo__erro');
const contagem = document.querySelector('.catalogo__contagem');
const campo = document.querySelector('.busca-intencao__entrada');
const navCategorias = document.querySelector('.catalogo__categorias');
const botaoLimpar = document.querySelector('.catalogo__limpar');
const botaoLimparVazio = document.querySelector('.catalogo__limpar-vazio');
const botaoRecarregar = document.querySelector('.catalogo__recarregar');
const formaBusca = document.querySelector('.catalogo__busca');

const estado = { ferramentas: [], categorias: [], categoria: '', situacao: 'todas', consulta: '', favoritos: new Set() };

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

function lerEndereco() {
  const parametros = new URLSearchParams(window.location.search);
  estado.consulta = parametros.get('busca') ?? '';
  estado.categoria = parametros.get('categoria') ?? '';
  const situacao = parametros.get('situacao');
  estado.situacao = ['pronta', 'planejada'].includes(situacao) ? situacao : 'todas';
  if (campo) campo.value = estado.consulta;
  const marcado = document.querySelector(`input[name="catalogo-estado"][value="${estado.situacao}"]`);
  if (marcado) marcado.checked = true;
}

function gravarEndereco() {
  const parametros = new URLSearchParams();
  if (estado.consulta) parametros.set('busca', estado.consulta);
  if (estado.categoria) parametros.set('categoria', estado.categoria);
  if (estado.situacao !== 'todas') parametros.set('situacao', estado.situacao);
  const texto = parametros.toString();
  window.history.replaceState(null, '', texto ? `/ferramentas?${texto}` : '/ferramentas');
}

function temFiltro() {
  return Boolean(estado.consulta || estado.categoria || estado.situacao !== 'todas');
}

function filtrar() {
  let resultado = estado.ferramentas;
  if (estado.categoria) resultado = resultado.filter((f) => f.categoria === estado.categoria);
  if (estado.situacao !== 'todas') resultado = resultado.filter((f) => f.estado === estado.situacao);
  if (estado.consulta.trim().length >= 2) resultado = buscarFerramentas(resultado, estado.consulta);
  return resultado;
}

async function alternarFavorito(slug, nome, botao) {
  const usuario = usuarioAtual();
  const jaTem = estado.favoritos.has(slug);

  if (usuario.sessaoAtiva) {
    try {
      if (jaTem) await chamarApi(`/api/favoritos/${slug}`, { metodo: 'DELETE' });
      else await chamarApi('/api/favoritos', { metodo: 'POST', corpo: { slug } });
    } catch (erro) {
      if (erro instanceof ErroApi && erro.codigo === 'limite_do_plano') {
        mostrarAviso(mensagemDeErro(erro), 'erro');
        return;
      }
      mostrarAviso(mensagemDeErro(erro), 'erro');
      return;
    }
  } else {
    const atuais = salvosLocais();
    if (jaTem) {
      definirSalvosLocais(atuais.filter((item) => item !== slug));
    } else {
      const limite = Number(document.documentElement.dataset.limiteSalvosLocais || 10);
      if (atuais.length >= limite) {
        mostrarAviso(t('catalogo.favorito.limite_texto', { limite }), 'erro');
        return;
      }
      definirSalvosLocais([...atuais, slug]);
    }
  }

  if (jaTem) estado.favoritos.delete(slug);
  else estado.favoritos.add(slug);
  atualizarBotaoFavorito(botao, slug, nome);
  mostrarAviso(t(jaTem ? 'catalogo.favorito.removido' : 'catalogo.favorito.guardado', { nome }));
}

function atualizarBotaoFavorito(botao, slug, nome) {
  const guardado = estado.favoritos.has(slug);
  botao.setAttribute('aria-pressed', guardado ? 'true' : 'false');
  botao.setAttribute('aria-label', t(guardado ? 'catalogo.favorito.tirar' : 'catalogo.favorito.guardar', { nome }));
  const uso = botao.querySelector('use');
  if (uso) uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${guardado ? 'estrela-cheia' : 'estrela'}`);
}

function desenhar() {
  const visiveis = filtrar();
  carregando.hidden = true;
  blocoErro.hidden = true;
  limparFilhos(lista);

  contagem.textContent = visiveis.length === estado.ferramentas.length
    ? t('catalogo.contagem.total', { total: estado.ferramentas.length })
    : t('catalogo.contagem.parcial', { visiveis: visiveis.length, total: estado.ferramentas.length });

  botaoLimpar.hidden = !temFiltro();

  if (!visiveis.length) {
    lista.hidden = true;
    vazioTitulo.textContent = estado.consulta
      ? t('compartilhado.estados.sem_resultados', { consulta: estado.consulta })
      : t('compartilhado.estados.vazio_titulo');
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  for (const ferramenta of visiveis) {
    lista.append(montarLinhaFerramenta(ferramenta, {
      guardado: estado.favoritos.has(ferramenta.slug),
      aoFavoritar: alternarFavorito,
    }));
  }
  lista.hidden = false;
}

function montarCategorias() {
  limparFilhos(navCategorias);
  const todas = document.createElement('button');
  todas.type = 'button';
  todas.className = 'catalogo__categoria';
  todas.textContent = t('catalogo.filtros.categoria_todas');
  todas.setAttribute('aria-pressed', estado.categoria ? 'false' : 'true');
  todas.addEventListener('click', () => {
    estado.categoria = '';
    gravarEndereco();
    montarCategorias();
    desenhar();
  });
  navCategorias.append(todas);

  for (const categoria of estado.categorias) {
    if (!categoria.total) continue;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'catalogo__categoria';
    botao.setAttribute('aria-pressed', estado.categoria === categoria.id ? 'true' : 'false');

    const nome = document.createElement('span');
    nome.textContent = categoria.nome;
    const total = document.createElement('span');
    total.className = 'catalogo__categoria-total';
    total.textContent = String(categoria.total);

    botao.append(nome, total);
    botao.addEventListener('click', () => {
      estado.categoria = estado.categoria === categoria.id ? '' : categoria.id;
      gravarEndereco();
      montarCategorias();
      desenhar();
    });
    navCategorias.append(botao);
  }
}

async function carregarFavoritos() {
  const usuario = usuarioAtual();
  if (usuario.sessaoAtiva) {
    try {
      const resposta = await chamarApi('/api/favoritos');
      estado.favoritos = new Set((resposta?.favoritos ?? []).map((favorito) => favorito.slug));
      return;
    } catch {
      // Sem conta acessível: usa os salvos deste aparelho.
    }
  }
  estado.favoritos = new Set(salvosLocais());
}

async function carregar() {
  carregando.hidden = false;
  lista.hidden = true;
  vazio.hidden = true;
  blocoErro.hidden = true;
  try {
    const resposta = await chamarApi('/api/ferramentas');
    estado.ferramentas = resposta?.ferramentas ?? [];
    estado.categorias = resposta?.categorias ?? [];
    await carregarFavoritos();
    montarCategorias();
    desenhar();
  } catch {
    carregando.hidden = true;
    blocoErro.hidden = false;
  }
}

function ligarControles() {
  formaBusca.addEventListener('submit', (evento) => evento.preventDefault());
  campo.addEventListener('input', () => {
    estado.consulta = campo.value;
    gravarEndereco();
    desenhar();
  });
  for (const radio of document.querySelectorAll('input[name="catalogo-estado"]')) {
    radio.addEventListener('change', () => {
      estado.situacao = radio.value;
      gravarEndereco();
      desenhar();
    });
  }
  const limpar = () => {
    estado.consulta = '';
    estado.categoria = '';
    estado.situacao = 'todas';
    campo.value = '';
    const todas = document.querySelector('input[name="catalogo-estado"][value="todas"]');
    if (todas) todas.checked = true;
    gravarEndereco();
    montarCategorias();
    desenhar();
  };
  botaoLimpar.addEventListener('click', limpar);
  botaoLimparVazio.addEventListener('click', limpar);
  botaoRecarregar.addEventListener('click', carregar);
}

aoTrocarIdioma(() => {
  montarCategorias();
  desenhar();
});

lerEndereco();
ligarControles();
carregar();

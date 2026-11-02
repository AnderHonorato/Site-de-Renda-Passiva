// salvos.js — lista de ferramentas salvas (conta ou este aparelho), oferta de juntar salvos
// locais com a conta ao entrar e estado vazio conforme docs/contratos.md §11, §12.
import { chamarApi, mensagemDeErro } from '/estatico/compartilhado/compartilhado-api.js';
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { aoTrocarIdioma, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { definirSalvosLocais, salvosLocais, usuarioAtual } from '/estatico/compartilhado/compartilhado-sessao.js';
import { montarLinhaSalvo } from '/estatico/paginas/salvos/salvos-lista.js';

const LIMITE_SALVOS_LOCAIS_PADRAO = 10;

const resumo = document.querySelector('.salvos__resumo');
const blocoJuntar = document.querySelector('.salvos__juntar');
const juntarTexto = document.querySelector('.salvos__juntar-texto');
const botaoJuntarConfirmar = document.querySelector('.salvos__juntar-confirmar');
const botaoJuntarIgnorar = document.querySelector('.salvos__juntar-ignorar');
const carregando = document.querySelector('.salvos__carregando');
const lista = document.querySelector('.salvos__lista');
const vazio = document.querySelector('.salvos__vazio');
const vazioTexto = document.querySelector('.salvos__vazio-texto');
const blocoErro = document.querySelector('.salvos__erro');
const botaoRecarregar = document.querySelector('.salvos__recarregar');

function limiteLocal() {
  return Number(document.documentElement.dataset.limiteSalvosLocais || LIMITE_SALVOS_LOCAIS_PADRAO);
}

function limparFilhos(elemento) {
  while (elemento.firstChild) elemento.firstChild.remove();
}

function atualizarResumoEVazio() {
  const total = lista.childElementCount;
  resumo.textContent = total === 0
    ? t('salvos.resumo_zero')
    : total === 1
      ? t('salvos.resumo_um')
      : t('salvos.resumo', { quantidade: total });
  vazio.hidden = total > 0;
  lista.hidden = total === 0;
}

async function removerFavorito(slug, nome, item) {
  const usuario = usuarioAtual();
  try {
    if (usuario.sessaoAtiva) {
      await chamarApi(`/api/favoritos/${slug}`, { metodo: 'DELETE' });
    } else {
      definirSalvosLocais(salvosLocais().filter((atual) => atual !== slug));
    }
    item.remove();
    mostrarAviso(t('salvos.favorito.removido', { nome }));
    atualizarResumoEVazio();
  } catch (erro) {
    mostrarAviso(mensagemDeErro(erro), 'erro');
  }
}

function desenharFerramentas(itens, ferramentasPorSlug) {
  limparFilhos(lista);
  for (const slug of itens) {
    const ferramenta = ferramentasPorSlug.get(slug);
    if (ferramenta) lista.append(montarLinhaSalvo(ferramenta, { aoRemover: removerFavorito }));
  }
}

function ofertarJuntar(ferramentasPorSlug) {
  const locais = salvosLocais();
  if (!locais.length) {
    blocoJuntar.hidden = true;
    return;
  }

  juntarTexto.textContent = locais.length === 1
    ? t('salvos.juntar.texto_um')
    : t('salvos.juntar.texto', { quantidade: locais.length });
  blocoJuntar.hidden = false;

  botaoJuntarConfirmar.onclick = async () => {
    try {
      const resposta = await chamarApi('/api/favoritos/juntar', { metodo: 'POST', corpo: { slugs: locais } });
      definirSalvosLocais([]);
      blocoJuntar.hidden = true;
      mostrarAviso(
        resposta?.ignorados?.length
          ? t('salvos.juntar.parcial', { quantidade: resposta.ignorados.length })
          : t('salvos.juntar.juntado'),
      );
      desenharFerramentas((resposta?.favoritos ?? []).map((favorito) => favorito.slug), ferramentasPorSlug);
      atualizarResumoEVazio();
    } catch (erro) {
      mostrarAviso(mensagemDeErro(erro), 'erro');
    }
  };
  botaoJuntarIgnorar.onclick = () => {
    blocoJuntar.hidden = true;
  };
}

async function carregar() {
  carregando.hidden = false;
  lista.hidden = true;
  vazio.hidden = true;
  blocoErro.hidden = true;
  blocoJuntar.hidden = true;

  try {
    const respostaFerramentas = await chamarApi('/api/ferramentas');
    const ferramentasPorSlug = new Map((respostaFerramentas?.ferramentas ?? []).map((ferramenta) => [ferramenta.slug, ferramenta]));
    const usuario = usuarioAtual();

    if (usuario.sessaoAtiva) {
      const respostaFavoritos = await chamarApi('/api/favoritos');
      desenharFerramentas((respostaFavoritos?.favoritos ?? []).map((favorito) => favorito.slug), ferramentasPorSlug);
      vazioTexto.textContent = t('salvos.vazio.texto_conta');
      ofertarJuntar(ferramentasPorSlug);
    } else {
      desenharFerramentas(salvosLocais(), ferramentasPorSlug);
      vazioTexto.textContent = t('salvos.vazio.texto_local', { limite: limiteLocal() });
    }

    carregando.hidden = true;
    atualizarResumoEVazio();
  } catch {
    carregando.hidden = true;
    blocoErro.hidden = false;
  }
}

botaoRecarregar.addEventListener('click', carregar);
aoTrocarIdioma(carregar);
carregar();

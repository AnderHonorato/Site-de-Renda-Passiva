// compartilhado-ferramenta.js — comportamento comum da página de ferramenta: favoritar,
// registrar uso, salvar trabalho, copiar/baixar, exportar PDF e carregar recurso Plus.

import { chamarApi, ErroApi } from './compartilhado-api.js';
import { t } from './compartilhado-idioma.js';
import { formatarMoeda } from './compartilhado-formatar.js';
import { mostrarAviso } from './compartilhado-aviso.js';
import { usuarioAtual, salvosLocais, definirSalvosLocais, registrarRecente } from './compartilhado-sessao.js';

const usosJaRegistrados = new Set();

function slugDaPagina() {
  try {
    return document.documentElement.dataset.pagina || '';
  } catch {
    return '';
  }
}

/** Marca uma vez por visita que a ferramenta foi usada (ou gerou documento). */
export function registrarUso(slug, tipo = 'uso') {
  const chave = `${slug}:${tipo}`;
  if (usosJaRegistrados.has(chave)) return Promise.resolve();
  usosJaRegistrados.add(chave);
  return chamarApi(`/api/ferramentas/${slug}/uso`, { metodo: 'POST', corpo: { tipo } }).catch(() => {
    // contagem de uso é best-effort; falha não deve incomodar quem está usando a ferramenta
  });
}

function ligarPrimeiroCalculo(slug) {
  const formulario = document.querySelector('.ferramenta__formulario');
  if (!formulario) return;
  const registrarNoPrimeiroCalculo = () => registrarUso(slug, 'uso');
  formulario.addEventListener('input', registrarNoPrimeiroCalculo, { once: true });
  formulario.addEventListener('submit', registrarNoPrimeiroCalculo, { once: true });
}

async function alternarFavoritoComSessao(slug, botao) {
  const jaFavoritado = botao.getAttribute('aria-pressed') === 'true';
  try {
    if (jaFavoritado) {
      await chamarApi(`/api/favoritos/${slug}`, { metodo: 'DELETE' });
    } else {
      await chamarApi('/api/favoritos', { metodo: 'POST', corpo: { slug } });
    }
    marcarBotaoFavorito(botao, !jaFavoritado);
    mostrarAviso(t(jaFavoritado ? 'compartilhado.ferramenta.desfavoritar' : 'compartilhado.ferramenta.favoritada'));
  } catch (erro) {
    if (erro instanceof ErroApi && erro.codigo === 'limite_do_plano') {
      const bloqueio = document.querySelector('.bloqueio-plano');
      if (bloqueio) await mostrarBloqueioPlano(bloqueio, {});
      return;
    }
    mostrarAviso(t(`compartilhado.erros.${erro?.codigo ?? 'erro_interno'}`), 'erro');
  }
}

function alternarFavoritoLocal(slug, botao) {
  const jaFavoritado = botao.getAttribute('aria-pressed') === 'true';
  const lista = salvosLocais();
  const proxima = jaFavoritado ? lista.filter((item) => item !== slug) : [...lista, slug];
  definirSalvosLocais(proxima);
  marcarBotaoFavorito(botao, !jaFavoritado);
}

function marcarBotaoFavorito(botao, favoritado) {
  botao.setAttribute('aria-pressed', String(favoritado));
  botao.setAttribute('aria-label', t(favoritado ? 'compartilhado.ferramenta.desfavoritar' : 'compartilhado.ferramenta.favoritar'));
}

function ligarFavoritar(slug) {
  const botoes = document.querySelectorAll('[data-acao="favoritar"]');
  for (const botao of botoes) {
    const favoritadoInicial = usuarioAtual().sessaoAtiva
      ? botao.getAttribute('aria-pressed') === 'true'
      : salvosLocais().includes(slug);
    marcarBotaoFavorito(botao, favoritadoInicial);
    botao.addEventListener('click', () => {
      if (usuarioAtual().sessaoAtiva) alternarFavoritoComSessao(slug, botao);
      else alternarFavoritoLocal(slug, botao);
    });
  }
}

/** Inicializa a página de ferramenta: favoritar, recente e contagem de uso. */
export function iniciarFerramenta({ slug } = {}) {
  if (typeof document === 'undefined' || !slug) return;
  registrarRecente(slug);
  ligarFavoritar(slug);
  ligarPrimeiroCalculo(slug);
}

/** `POST /api/trabalhos`; usa `data-pagina` como slug quando não informado. */
export async function salvarTrabalho({ slug, titulo, dados, situacao } = {}) {
  const ferramentaSlug = slug || slugDaPagina();
  return chamarApi('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: ferramentaSlug, titulo, dados, ...(situacao ? { situacao } : {}) },
  });
}

/** Copia `texto` para a área de transferência; devolve `true`/`false`. */
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const areaTemporaria = document.createElement('textarea');
      areaTemporaria.value = texto;
      areaTemporaria.setAttribute('readonly', '');
      areaTemporaria.style.position = 'fixed';
      areaTemporaria.style.opacity = '0';
      document.body.appendChild(areaTemporaria);
      areaTemporaria.select();
      const copiou = document.execCommand('copy');
      areaTemporaria.remove();
      return copiou;
    } catch {
      return false;
    }
  }
}

/** Baixa `blob` como `nomeArquivo`, via link temporário. */
export function baixarArquivo(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Troca o sinal menos tipográfico (−, U+2212) pelo hífen comum, que o WinAnsi do pdf-lib aceita. Função pura. */
export function normalizarTextoParaPdf(texto) {
  return String(texto ?? '').replace(/−/g, '-');
}

/** Gera um PDF simples (Helvetica) com título, linhas rótulo/valor e rodapé; devolve um `Blob`. */
export async function gerarPdfResumo({ titulo, linhas = [], rodape } = {}) {
  const { PDFDocument, StandardFonts, rgb: corPdf } = await import('/estatico/compartilhado/bibliotecas/pdf-lib.esm.min.js');
  const documento = await PDFDocument.create();
  const fonteRegular = await documento.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await documento.embedFont(StandardFonts.HelveticaBold);
  const pagina = documento.addPage([595.28, 841.89]); // A4
  const margem = 56;
  let y = pagina.getHeight() - margem;
  const preto = corPdf(0.16, 0.15, 0.14);

  pagina.drawText(normalizarTextoParaPdf(titulo), { x: margem, y, size: 20, font: fonteNegrito, color: preto });
  y -= 36;

  for (const [rotulo, valor] of linhas) {
    pagina.drawText(normalizarTextoParaPdf(rotulo), { x: margem, y, size: 11, font: fonteRegular, color: preto });
    pagina.drawText(normalizarTextoParaPdf(valor), {
      x: pagina.getWidth() - margem - fonteNegrito.widthOfTextAtSize(normalizarTextoParaPdf(valor), 12),
      y,
      size: 12,
      font: fonteNegrito,
      color: preto,
    });
    y -= 20;
  }

  if (rodape) {
    pagina.drawText(normalizarTextoParaPdf(rodape), { x: margem, y: margem / 2, size: 9, font: fonteRegular, color: preto });
  }

  const bytes = await documento.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

/** Carrega `/plus/<slug>/<recurso>`; lança `ErroApi` (401/403) sem sessão Plus. */
export async function carregarRecursoPlus(recurso, slug) {
  const ferramentaSlug = slug || slugDaPagina();
  try {
    return await import(`/plus/${ferramentaSlug}/${recurso}`);
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi({ status: 403, codigo: 'plano_insuficiente' });
  }
}

/** Cria as partes do bloqueio quando a página traz só a caixa vazia. */
function montarEstruturaDoBloqueio(elemento) {
  const partes = [
    ['p', 'bloqueio-plano__titulo'],
    ['p', 'bloqueio-plano__texto'],
    ['p', 'bloqueio-plano__preco'],
    ['a', 'bloqueio-plano__acao botao botao--secundario botao--pequeno'],
  ];
  for (const [etiqueta, classe] of partes) {
    const seletor = `.${classe.split(' ')[0]}`;
    if (elemento.querySelector(seletor)) continue;
    const parte = document.createElement(etiqueta);
    parte.className = classe;
    elemento.append(parte);
  }
}

/** Preenche `.bloqueio-plano` com o preço do Plus vindo de `/api/planos`. */
export async function mostrarBloqueioPlano(elemento, { titulo, texto } = {}) {
  if (!elemento) return;
  montarEstruturaDoBloqueio(elemento);
  const elementoTitulo = elemento.querySelector('.bloqueio-plano__titulo');
  const elementoTexto = elemento.querySelector('.bloqueio-plano__texto');
  const elementoPreco = elemento.querySelector('.bloqueio-plano__preco');
  const elementoAcao = elemento.querySelector('.bloqueio-plano__acao');

  if (elementoTitulo) elementoTitulo.textContent = titulo ?? t('compartilhado.plano.recurso_plus');
  if (elementoTexto) elementoTexto.textContent = texto ?? t('compartilhado.plano.sessao_necessaria');

  if (elementoPreco) {
    try {
      const resposta = await chamarApi('/api/planos');
      const plus = resposta?.planos?.find((plano) => plano.id === 'plus' || plano.codigo === 'plus');
      if (plus?.preco_mensal != null) {
        elementoPreco.textContent = t('compartilhado.plano.preco_mensal', { valor: formatarMoeda(plus.preco_mensal) });
      }
    } catch {
      // sem preço disponível agora; o texto genérico já ficou preenchido
    }
  }

  if (elementoAcao) {
    elementoAcao.textContent = t('compartilhado.plano.ver_plus');
    elementoAcao.setAttribute('href', '/planos');
  }

  elemento.hidden = false;
}

/**
 * Escolha de UM PDF para as ferramentas de páginas (remover, extrair, dividir, girar, organizar).
 *
 * Troca o campo de arquivo nativo (que não segue o tema) por um botão do portal, aceita
 * arrastar e soltar, e confere o arquivo NA HORA da escolha: vazio, não é PDF, grande demais,
 * com senha ou danificado aparecem no campo, antes de a pessoa digitar qualquer coisa.
 * Depois da escolha mostra nome, tamanho e número de páginas.
 *
 * O arquivo é lido no navegador e nunca sai do aparelho.
 */
import { mostrarErro, limparErros } from '../../núcleo/interface.js';
import { escapar } from '../../núcleo/texto.js';
import { ícone } from '../../núcleo/ícones.js';
import {
  abrirPdf, mensagemDeErro, formatarTamanho, páginas, TAMANHO_MÁXIMO_POR_ARQUIVO, LIMITE_DE_PÁGINAS,
} from '../../cálculos/páginas-do-pdf.js';

/** Build ES module da pdf-lib 1.17.1 (MIT), baixado só quando uma ferramenta precisa. */
const CAMINHO_DA_BIBLIOTECA = '../../../recursos/pdf-lib.esm.min.js';

let bibliotecaCarregando;
/** Carrega a pdf-lib uma vez só; a primeira escolha de arquivo já adianta o download. */
export function carregarBiblioteca() {
  bibliotecaCarregando ??= import(CAMINHO_DA_BIBLIOTECA).catch((erro) => {
    bibliotecaCarregando = undefined;
    throw erro;
  });
  return bibliotecaCarregando;
}

export const ERRO_DA_BIBLIOTECA = 'Não foi possível carregar o leitor de PDF. Confira a conexão e tente de novo.';

/**
 * Nome de arquivo com pontos de quebra (<wbr>) depois de ".", "_" e "-" e a cada 12 letras de
 * um trecho sem espaço. No celular, "RG_escaneado_2024.pdf" era cortado no meio.
 * @param {string} nome
 * @returns {string} HTML já escapado
 */
export function nomeQuebrável(nome) {
  return String(nome).split(' ').map((palavra) => {
    const pedaços = palavra.match(/[^._-]*[._-]?/g).filter(Boolean)
      .flatMap((pedaço) => pedaço.match(/.{1,12}/gu));
    return pedaços.map(escapar).join('<wbr>');
  }).join(' ');
}

/**
 * @typedef {{nome: string, tamanho: number, bytes: Uint8Array, documento: any, total: number}} PdfEscolhido
 */

/**
 * @param {HTMLElement} elemento raiz da ferramenta (já montada por `montarFerramenta`)
 * @param {{
 *   campo?: string,
 *   limiteDePáginas?: number,
 *   aoMudar?: (escolhido: PdfEscolhido | null) => void,
 * }} [opções]
 * @returns {{atual: () => PdfEscolhido | null, limpar: () => void, travar: (travado: boolean) => void}}
 */
export function prepararEscolhaDePdf(elemento, { campo: nomeDoCampo = 'arquivo', limiteDePáginas = LIMITE_DE_PÁGINAS, aoMudar = () => {} } = {}) {
  const formulário = elemento.querySelector('#formulário');
  const entrada = elemento.querySelector(`#campo-${nomeDoCampo}`);
  const campo = entrada.closest('.campo');

  // O campo de arquivo ocupa a linha inteira, em vez de dividir a grade com os outros campos.
  elemento.querySelector('.campos').before(campo);
  campo.classList.add('b-3');

  entrada.accept = 'application/pdf,.pdf';
  entrada.multiple = false;
  entrada.hidden = true;

  const botão = document.createElement('button');
  botão.type = 'button';
  botão.className = 'botão botão--linha';
  botão.setAttribute('aria-describedby', `campo-${nomeDoCampo}-dica`);
  const pintarBotão = (trocar) => { botão.innerHTML = `${ícone('pasta')}${trocar ? 'Trocar o PDF' : 'Escolher PDF'}`; };
  pintarBotão(false);
  entrada.after(botão);
  botão.addEventListener('click', () => entrada.click());

  const cartão = document.createElement('div');
  cartão.className = 'ferramenta-linha t-2';
  cartão.setAttribute('role', 'group');
  cartão.setAttribute('aria-label', 'PDF escolhido');
  cartão.hidden = true;

  const TEXTO_DO_VAZIO = 'Nenhum PDF escolhido ainda. Arraste o arquivo para este quadro ou use o botão "Escolher PDF".';
  const vazio = document.createElement('p');
  vazio.className = 'vazio t-2';
  vazio.textContent = TEXTO_DO_VAZIO;

  // Avisa leitores de tela e quem está com a conexão lenta de que o arquivo está sendo lido.
  const estado = document.createElement('p');
  estado.className = 'pequeno suave t-1';
  estado.setAttribute('role', 'status');
  estado.hidden = true;

  botão.after(cartão, vazio, estado);

  /** @type {PdfEscolhido | null} */
  let escolhido = null;
  let travado = false;
  /** Cada escolha ganha um número; resposta de uma escolha antiga (arquivo grande) é ignorada. */
  let rodada = 0;

  function desenhar() {
    cartão.hidden = !escolhido;
    vazio.hidden = !!escolhido;
    pintarBotão(!!escolhido);
    if (!escolhido) return;
    const nome = escapar(escolhido.nome);
    cartão.innerHTML = `<span class="ferramenta-linha__ícone">${ícone('documento')}</span>
      <span class="ferramenta-linha__texto">
        <span class="ferramenta-linha__nome" title="${nome}">${nomeQuebrável(escolhido.nome)}</span>
        <span class="ferramenta-linha__resumo">${escapar(formatarTamanho(escolhido.tamanho))} · ${escapar(páginas(escolhido.total))}</span>
      </span>
      <span class="ferramenta-linha__fim">
        <button type="button" class="ícone-botão" data-tirar aria-label="Tirar o PDF ${nome}"${travado ? ' disabled' : ''}>${ícone('fechar')}</button>
      </span>`;
  }

  function limpar() {
    rodada++;
    escolhido = null;
    estado.hidden = true;
    desenhar();
    aoMudar(null);
  }

  /** @param {File[]} arquivos */
  async function adicionar(arquivos) {
    if (travado || arquivos.length === 0) return;
    const minha = ++rodada;
    limparErros(formulário);
    const arquivo = arquivos[0];
    const avisoDeSobra = arquivos.length > 1
      ? ` Um PDF por vez: usei "${arquivo.name}" e deixei os outros de fora.` : '';

    const recusar = (erro, extras = {}) => {
      if (minha !== rodada) return;
      estado.hidden = true;
      mostrarErro(campo, mensagemDeErro(erro, { nome: arquivo.name, ...extras }));
    };

    if (arquivo.size === 0) { recusar('arquivo_vazio'); return; }
    if (arquivo.size > TAMANHO_MÁXIMO_POR_ARQUIVO) { recusar('arquivo_grande_demais'); return; }

    estado.textContent = `Lendo "${arquivo.name}"…`;
    estado.hidden = false;
    // Biblioteca e arquivo chegam em paralelo; cada falha tem a sua mensagem.
    const baixandoBiblioteca = carregarBiblioteca();
    const lendoArquivo = arquivo.arrayBuffer();
    baixandoBiblioteca.catch(() => {});
    lendoArquivo.catch(() => {});
    let biblioteca;
    let bytes;
    try {
      bytes = new Uint8Array(await lendoArquivo);
    } catch {
      if (minha !== rodada) return;
      estado.hidden = true;
      mostrarErro(campo, `Não foi possível ler "${arquivo.name}". Escolha o arquivo de novo.`);
      return;
    }
    try {
      biblioteca = await baixandoBiblioteca;
    } catch {
      if (minha !== rodada) return;
      estado.hidden = true;
      mostrarErro(campo, ERRO_DA_BIBLIOTECA);
      return;
    }
    const r = await abrirPdf({ nome: arquivo.name, bytes }, { biblioteca, limiteDePáginas });
    if (minha !== rodada) return;
    if (!r.ok) { recusar(r.erro, r.extras); return; }

    estado.hidden = true;
    escolhido = { nome: arquivo.name, tamanho: arquivo.size, bytes, documento: r.documento, total: r.total };
    desenhar();
    aoMudar(escolhido);
    if (avisoDeSobra) mostrarErro(campo, avisoDeSobra.trim());
  }

  entrada.addEventListener('change', () => {
    adicionar([...entrada.files]);
    entrada.value = '';
  });

  cartão.addEventListener('click', (evento) => {
    if (!evento.target.closest('[data-tirar]') || travado) return;
    limparErros(formulário);
    limpar();
    botão.focus();
  });

  // Arrastar e soltar em qualquer ponto da ferramenta.
  let profundidade = 0;
  const temArquivos = (evento) => [...(evento.dataTransfer?.types ?? [])].includes('Files');
  const terminarArraste = () => {
    profundidade = 0;
    vazio.textContent = TEXTO_DO_VAZIO;
    vazio.hidden = !!escolhido;
  };
  elemento.addEventListener('dragenter', (evento) => {
    if (!temArquivos(evento) || travado) return;
    evento.preventDefault();
    profundidade++;
    vazio.textContent = 'Solte o PDF para usar este arquivo.';
    vazio.hidden = false;
  });
  elemento.addEventListener('dragover', (evento) => { if (temArquivos(evento)) evento.preventDefault(); });
  elemento.addEventListener('dragleave', (evento) => {
    if (!temArquivos(evento)) return;
    profundidade = Math.max(0, profundidade - 1);
    if (profundidade === 0) terminarArraste();
  });
  elemento.addEventListener('drop', (evento) => {
    if (!temArquivos(evento)) return;
    evento.preventDefault();
    terminarArraste();
    adicionar([...evento.dataTransfer.files]);
  });

  formulário.addEventListener('reset', () => { limpar(); });

  desenhar();

  return {
    atual: () => escolhido,
    limpar,
    travar(valor) {
      travado = valor;
      botão.disabled = valor;
      cartão.querySelector('[data-tirar]')?.toggleAttribute('disabled', valor);
    },
  };
}

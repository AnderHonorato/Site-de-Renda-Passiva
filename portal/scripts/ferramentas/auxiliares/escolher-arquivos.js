/**
 * Escolha de arquivos das ferramentas de PDF e imagem: botão do portal no lugar
 * da entrada nativa, arrastar e soltar em qualquer ponto da ferramenta, lista
 * acessível (um ou vários arquivos, com setas para reordenar) e recusa dos
 * arquivos inválidos já na escolha, com a mensagem no campo.
 *
 * Só o começo do arquivo é lido na escolha; o resto, na hora de processar.
 * Mesmo comportamento da lista de Juntar PDF, que tem a própria implementação.
 */
import { mostrarErro, limparErros } from '../../núcleo/interface.js';
import { escapar } from '../../núcleo/texto.js';
import { ícone } from '../../núcleo/ícones.js';
import { formatarTamanho, validarArquivoPdf } from '../../cálculos/pdf.js';
import { mensagemDeErroDoPdfÚnico } from '../../cálculos/pdf-páginas.js';

/** Bytes lidos do começo de cada arquivo para conferir o formato. */
const BYTES_DO_COMEÇO = 1024;

/** Seta para cima: a seta para baixo do conjunto do portal, girada. */
const SETA_PARA_CIMA = ícone('seta-baixo')
  .replace('focusable="false">', 'focusable="false"><g transform="rotate(180 12 12)">')
  .replace('</svg>', '</g></svg>');

/**
 * Conferência de um PDF na hora da escolha: vazio, grande demais e assinatura
 * %PDF (pelo conteúdo, não pela extensão). Senha e dano só aparecem ao abrir.
 * @param {File} arquivo
 * @param {Uint8Array} começo
 * @returns {Promise<{erro?: string}>}
 */
export async function validarPdfDaEscolha(arquivo, começo) {
  const nome = arquivo.name;
  if (arquivo.size === 0) return { erro: mensagemDeErroDoPdfÚnico('arquivo_vazio', { nome }) };
  const validação = validarArquivoPdf({ nome, tamanho: arquivo.size, bytes: começo });
  return validação.ok ? {} : { erro: mensagemDeErroDoPdfÚnico(validação.erro, { nome }) };
}

/**
 * Nome de arquivo com pontos de quebra depois de ".", "_" e "-" e a cada 12
 * letras de um trecho sem espaço, para não ser cortado no meio no celular.
 * @returns {string} HTML já escapado
 */
export function nomeQuebrável(nome) {
  return nome.split(' ').map((palavra) => {
    const pedaços = palavra.match(/[^._-]*[._-]?/g).filter(Boolean)
      .flatMap((pedaço) => pedaço.match(/.{1,12}/gu));
    return pedaços.map(escapar).join('<wbr>');
  }).join(' ');
}

/**
 * @typedef {{nome: string, tamanho: number, arquivo: File, extra?: string}} Item
 *
 * @param {HTMLElement} elemento raiz da ferramenta, já montada por `montarFerramenta`
 * @param {{
 *   campo: string, rótuloDoBotão: string, accept: string, múltiplo?: boolean, limite?: number,
 *   mensagemDeLimite?: string, rótuloDaLista: string, textoDoVazio: string, textoDeSolte: string,
 *   ícone?: string, soltar?: boolean,
 *   validar: (arquivo: File, começo: Uint8Array) => Promise<{erro?: string, extra?: string}>,
 *   aoMudar?: (itens: Item[]) => void,
 * }} opções
 * @returns {{
 *   itens: () => Item[], limpar: () => void, travar: (travada: boolean) => void,
 *   botãoEscolher: HTMLButtonElement, adicionar: (arquivos: File[]) => Promise<void>,
 * }}
 */
export function montarEscolhaDeArquivos(elemento, opções) {
  const {
    campo: nomeDoCampo, rótuloDoBotão, accept, múltiplo = false, limite = 1, mensagemDeLimite = 'Limite de arquivos atingido.',
    rótuloDaLista, textoDoVazio, textoDeSolte, ícone: nomeDoÍcone = 'documento', validar, aoMudar, soltar = true,
  } = opções;

  const formulário = elemento.querySelector('#formulário');
  const entrada = elemento.querySelector(`#campo-${nomeDoCampo}`);
  const campo = entrada.closest('.campo');
  const resultado = elemento.querySelector('#resultado');

  /** @type {Item[]} */
  let itens = [];
  let travada = false;
  let visível = true;

  // A entrada de arquivo nativa não segue o tema; quem abre a escolha é um botão do portal.
  entrada.multiple = múltiplo;
  entrada.accept = accept;
  entrada.hidden = true;
  const botãoEscolher = document.createElement('button');
  botãoEscolher.type = 'button';
  botãoEscolher.className = 'botão botão--linha';
  botãoEscolher.innerHTML = `${ícone('pasta')}${escapar(rótuloDoBotão)}`;
  if (entrada.getAttribute('aria-describedby')) botãoEscolher.setAttribute('aria-describedby', entrada.getAttribute('aria-describedby'));
  entrada.after(botãoEscolher);
  botãoEscolher.addEventListener('click', () => entrada.click());

  // Lista sem <ul>: o recuo padrão da lista roubava 40px da linha no celular.
  const lista = document.createElement('div');
  lista.className = 'lista-ferramentas t-2';
  lista.setAttribute('role', 'list');
  lista.setAttribute('aria-label', rótuloDaLista);
  const vazio = document.createElement('p');
  vazio.className = 'vazio t-2';
  vazio.textContent = textoDoVazio;
  campo.after(lista, vazio);

  function desenhar() {
    lista.innerHTML = itens.map((a, i) => {
      const nome = escapar(a.nome);
      const botão = (ação, conteúdo, rótulo, desligado) => `<button type="button" class="ícone-botão${desligado ? ' campo--inativo' : ''}"`
        + ` data-ação="${ação}" data-índice="${i}" aria-label="${rótulo}: ${nome}"${desligado ? ' disabled' : ''}>${conteúdo}</button>`;
      const numeração = múltiplo ? `${i + 1}. ` : '';
      const resumo = [formatarTamanho(a.tamanho), a.extra].filter(Boolean).join(' · ');
      return `<div class="ferramenta-linha" role="listitem">
        <span class="ferramenta-linha__ícone">${ícone(nomeDoÍcone)}</span>
        <span class="ferramenta-linha__texto">
          <span class="ferramenta-linha__nome" title="${nome}">${numeração}${nomeQuebrável(a.nome)}</span>
          <span class="ferramenta-linha__resumo">${escapar(resumo)}</span>
        </span>
        <span class="ferramenta-linha__fim">
          ${múltiplo ? botão('subir', SETA_PARA_CIMA, 'Subir', i === 0) : ''}
          ${múltiplo ? botão('descer', ícone('seta-baixo'), 'Descer', i === itens.length - 1) : ''}
          ${botão('remover', ícone('lixeira'), 'Remover', false)}
        </span>
      </div>`;
    }).join('');
    lista.hidden = !visível || itens.length === 0;
    vazio.hidden = !visível || itens.length > 0;
  }

  /** A lista mudou: o arquivo gerado antes não corresponde mais a ela. */
  function mudou() {
    resultado.hidden = true;
    desenhar();
    aoMudar?.(itens);
  }

  async function adicionar(arquivos) {
    if (travada) return;
    limparErros(formulário);
    const recusas = [];
    // Em modo de um arquivo só, a nova escolha troca a anterior (mas só se for válida).
    const escolhidos = múltiplo ? arquivos : arquivos.slice(0, 1);
    if (!múltiplo && arquivos.length > 1) recusas.push('Esta ferramenta trabalha com um arquivo por vez. Usei o primeiro.');
    for (const arquivo of escolhidos) {
      if (múltiplo && itens.length >= limite) {
        recusas.push(`"${arquivo.name}" ficou de fora: ${mensagemDeLimite}`);
        continue;
      }
      let validação;
      try {
        const começo = new Uint8Array(await arquivo.slice(0, BYTES_DO_COMEÇO).arrayBuffer());
        validação = await validar(arquivo, começo);
      } catch {
        validação = { erro: `Não foi possível ler "${arquivo.name}". Tente escolher o arquivo de novo.` };
      }
      if (validação.erro) {
        recusas.push(validação.erro);
        continue;
      }
      const item = { nome: arquivo.name, tamanho: arquivo.size, arquivo, extra: validação.extra };
      if (múltiplo) itens.push(item);
      else itens = [item];
    }
    mudou();
    if (recusas.length) mostrarErro(campo, recusas.join(' '));
  }

  entrada.addEventListener('change', () => {
    adicionar([...entrada.files]);
    entrada.value = '';
  });

  lista.addEventListener('click', (evento) => {
    const botão = evento.target.closest('button[data-ação]');
    if (!botão || botão.disabled || travada) return;
    const índice = Number(botão.dataset.índice);
    const ação = botão.dataset.ação;
    if (ação === 'remover') {
      itens.splice(índice, 1);
      limparErros(formulário);
      mudou();
      (lista.querySelector(`[data-ação="remover"][data-índice="${Math.min(índice, itens.length - 1)}"]`) ?? botãoEscolher).focus();
      return;
    }
    const destino = índice + (ação === 'subir' ? -1 : 1);
    [itens[índice], itens[destino]] = [itens[destino], itens[índice]];
    mudou();
    // O foco acompanha o arquivo que mudou de lugar.
    const mesmo = lista.querySelector(`[data-ação="${ação}"][data-índice="${destino}"]`);
    (mesmo && !mesmo.disabled ? mesmo : lista.querySelector(`[data-ação="${ação === 'subir' ? 'descer' : 'subir'}"][data-índice="${destino}"]`))?.focus();
  });

  // Arrastar e soltar em qualquer ponto da ferramenta.
  let profundidade = 0;
  const temArquivos = (evento) => soltar && [...(evento.dataTransfer?.types ?? [])].includes('Files');
  elemento.addEventListener('dragenter', (evento) => {
    if (!temArquivos(evento)) return;
    evento.preventDefault();
    profundidade++;
    vazio.textContent = textoDeSolte;
    vazio.hidden = false;
  });
  elemento.addEventListener('dragover', (evento) => { if (temArquivos(evento)) evento.preventDefault(); });
  const terminarArraste = () => {
    profundidade = 0;
    vazio.textContent = textoDoVazio;
    vazio.hidden = !visível || itens.length > 0;
  };
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

  function limpar() {
    itens = [];
    desenhar();
    aoMudar?.(itens);
  }
  formulário.addEventListener('reset', limpar);

  desenhar();

  return {
    itens: () => itens,
    limpar,
    adicionar,
    botãoEscolher,
    /** Mostra ou esconde o campo inteiro (botão, lista e aviso de vazio), para escolhas que dependem de outra. */
    mostrar(valor) {
      visível = valor;
      campo.hidden = !valor;
      desenhar();
    },
    /** Liga e desliga a edição da lista: durante o processamento, ela não pode mudar. */
    travar(valor) {
      travada = valor;
      lista.inert = valor;
      botãoEscolher.disabled = valor;
    },
  };
}

/**
 * Escolha de arquivos para as ferramentas avançadas (ler QR Code, converter planilha, ZIP).
 *
 * Mesmo desenho de `escolher-pdf.js`: troca o campo de arquivo nativo (que não segue o tema) por um botão do
 * portal, aceita arrastar e soltar em qualquer ponto da ferramenta, e CONFERE cada arquivo na hora da escolha
 * (vazio, grande demais, tipo errado, corrompido), mostrando o motivo no campo antes de a pessoa digitar qualquer
 * coisa. A conferência de cada ferramenta entra pela função `conferir`; aqui só mora a parte de tela.
 *
 * Os arquivos são lidos no navegador e nunca saem do aparelho.
 */
import { mostrarErro, limparErros } from '../../núcleo/interface.js';
import { escapar } from '../../núcleo/texto.js';
import { ícone } from '../../núcleo/ícones.js';

/** "12,3 KB", "4,5 MB" no padrão brasileiro. */
export function formatarBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${(bytes / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`;
}

/**
 * Nome de arquivo com pontos de quebra (<wbr>) depois de ".", "_" e "-" e a cada 12 letras de um trecho sem
 * espaço: no celular, um nome longo sem espaços estourava a largura.
 * @returns {string} HTML já escapado
 */
export function nomeQuebrável(nome) {
  return String(nome).split(' ').map((palavra) => {
    const pedaços = (palavra.match(/[^._-]*[._-]?/g) ?? []).filter(Boolean)
      .flatMap((pedaço) => pedaço.match(/.{1,12}/gu) ?? []);
    return pedaços.map(escapar).join('<wbr>');
  }).join(' ');
}

/**
 * @typedef {{arquivo: File, nome: string, tamanho: number, detalhe: string, dados: any}} ArquivoEscolhido
 * @typedef {{ok: true, detalhe?: string, dados?: any} | {ok: false, mensagem: string}} Conferência
 */

/**
 * @param {HTMLElement} elemento raiz da ferramenta (já montada por `montarFerramenta`)
 * @param {{
 *   campo?: string,
 *   aceitar?: string,
 *   múltiplos?: boolean,
 *   máximoDeArquivos?: number,
 *   rótuloDoBotão: string,
 *   rótuloParaTrocar?: string,
 *   rótuloDaFoto?: string,
 *   textoDoVazio: string,
 *   textoDeSolte: string,
 *   ícone?: string,
 *   conferir: (arquivo: File, jáEscolhidos: ArquivoEscolhido[]) => Promise<Conferência> | Conferência,
 *   aoMudar?: (lista: ArquivoEscolhido[]) => void,
 * }} opções
 */
export function prepararEscolhaDeArquivos(elemento, opções) {
  const {
    campo: nomeDoCampo = 'arquivo', aceitar = '', múltiplos = false, máximoDeArquivos = 1,
    rótuloDoBotão, rótuloParaTrocar = rótuloDoBotão, rótuloDaFoto, textoDoVazio, textoDeSolte,
    ícone: nomeDoÍcone = 'documento', conferir, aoMudar = () => {},
  } = opções;
  const formulário = elemento.querySelector('#formulário');
  const entrada = elemento.querySelector(`#campo-${nomeDoCampo}`);
  const campo = entrada.closest('.campo');

  // O campo de arquivo ocupa a linha inteira, em vez de dividir a grade com os outros campos.
  elemento.querySelector('.campos').before(campo);
  campo.classList.add('b-3');

  entrada.accept = aceitar;
  entrada.multiple = múltiplos;
  entrada.hidden = true;

  const botão = document.createElement('button');
  botão.type = 'button';
  botão.className = 'botão botão--linha';
  botão.setAttribute('aria-describedby', `campo-${nomeDoCampo}-dica`);
  const pintarBotão = () => { botão.innerHTML = `${ícone('pasta')}${escolhidos.length && !múltiplos ? rótuloParaTrocar : rótuloDoBotão}`; };
  entrada.after(botão);
  botão.addEventListener('click', () => entrada.click());

  // No celular, `capture` abre a câmera do aparelho e devolve a foto: dispensa a permissão de câmera da página.
  let entradaDaFoto = null;
  let botãoDaFoto = null;
  if (rótuloDaFoto) {
    entradaDaFoto = document.createElement('input');
    entradaDaFoto.type = 'file';
    entradaDaFoto.accept = 'image/*';
    entradaDaFoto.setAttribute('capture', 'environment');
    entradaDaFoto.hidden = true;
    entradaDaFoto.tabIndex = -1;
    entradaDaFoto.setAttribute('aria-hidden', 'true');
    botãoDaFoto = document.createElement('button');
    botãoDaFoto.type = 'button';
    botãoDaFoto.className = 'botão botão--linha';
    botãoDaFoto.innerHTML = `${ícone('imagem')}${escapar(rótuloDaFoto)}`;
    botãoDaFoto.addEventListener('click', () => entradaDaFoto.click());
    botão.after(botãoDaFoto, entradaDaFoto);
  }

  const lista = document.createElement('div');
  lista.setAttribute('role', 'list');
  lista.setAttribute('aria-label', 'Arquivos escolhidos');
  lista.hidden = true;

  const vazio = document.createElement('p');
  vazio.className = 'vazio t-2';
  vazio.textContent = textoDoVazio;

  // Avisa leitores de tela e quem está com a conexão lenta de que o arquivo está sendo lido.
  const estado = document.createElement('p');
  estado.className = 'pequeno suave t-1';
  estado.setAttribute('role', 'status');
  estado.hidden = true;

  (botãoDaFoto ?? botão).after(lista);
  lista.after(vazio, estado);

  /** @type {ArquivoEscolhido[]} */
  let escolhidos = [];
  let travado = false;
  /** Cada rodada de escolha ganha um número; resposta de uma rodada antiga é ignorada. */
  let rodada = 0;

  function desenhar() {
    lista.hidden = escolhidos.length === 0;
    vazio.hidden = escolhidos.length > 0;
    pintarBotão();
    lista.replaceChildren(...escolhidos.map((item, i) => {
      const linha = document.createElement('div');
      linha.setAttribute('role', 'listitem');
      linha.className = 'ferramenta-linha t-2';
      const nome = escapar(item.nome);
      linha.innerHTML = `<span class="ferramenta-linha__ícone">${ícone(nomeDoÍcone)}</span>
        <span class="ferramenta-linha__texto">
          <span class="ferramenta-linha__nome" title="${nome}">${nomeQuebrável(item.nome)}</span>
          <span class="ferramenta-linha__resumo">${escapar([formatarBytes(item.tamanho), item.detalhe].filter(Boolean).join(' · '))}</span>
        </span>
        <span class="ferramenta-linha__fim">
          <button type="button" class="ícone-botão" data-tirar="${i}" aria-label="Tirar ${nome} da lista"${travado ? ' disabled' : ''}>${ícone('fechar')}</button>
        </span>`;
      return linha;
    }));
  }

  function notificar() {
    desenhar();
    aoMudar(escolhidos);
  }

  function limpar() {
    rodada += 1;
    escolhidos = [];
    estado.hidden = true;
    notificar();
  }

  /** @param {File[]} arquivos */
  async function adicionar(arquivos) {
    if (travado || arquivos.length === 0) return;
    const minha = ++rodada;
    limparErros(formulário);
    const recusas = [];
    let candidatos = arquivos;
    if (!múltiplos && candidatos.length > 1) {
      recusas.push(`Um arquivo por vez: usei "${candidatos[0].name}" e deixei os outros de fora.`);
      candidatos = candidatos.slice(0, 1);
    }
    const novos = múltiplos ? [...escolhidos] : [];
    for (const arquivo of candidatos) {
      if (novos.length >= máximoDeArquivos) {
        recusas.push(`Limite de ${máximoDeArquivos} arquivos: "${arquivo.name}" e os seguintes ficaram de fora.`);
        break;
      }
      if (múltiplos && novos.some((e) => e.nome === arquivo.name && e.tamanho === arquivo.size)) {
        recusas.push(`"${arquivo.name}" já estava na lista.`);
        continue;
      }
      estado.textContent = `Conferindo "${arquivo.name}"…`;
      estado.hidden = false;
      let resultado;
      try {
        resultado = await conferir(arquivo, novos);
      } catch (erro) {
        console.error(erro);
        resultado = { ok: false, mensagem: `Não foi possível ler "${arquivo.name}". Escolha o arquivo de novo.` };
      }
      if (minha !== rodada) return;
      if (resultado.ok) {
        novos.push({ arquivo, nome: arquivo.name, tamanho: arquivo.size, detalhe: resultado.detalhe ?? '', dados: resultado.dados });
      } else {
        recusas.push(`"${arquivo.name}": ${resultado.mensagem}`);
      }
    }
    estado.hidden = true;
    if (novos.length !== escolhidos.length || novos.some((n, i) => n !== escolhidos[i])) {
      escolhidos = novos;
      notificar();
    }
    if (recusas.length) mostrarErro(campo, recusas.slice(0, 3).join(' ') + (recusas.length > 3 ? ` (e mais ${recusas.length - 3} recusado${recusas.length - 3 === 1 ? '' : 's'}.)` : ''));
  }

  const aoEscolher = (origem) => () => {
    adicionar([...origem.files]);
    origem.value = '';
  };
  entrada.addEventListener('change', aoEscolher(entrada));
  entradaDaFoto?.addEventListener('change', aoEscolher(entradaDaFoto));

  lista.addEventListener('click', (evento) => {
    const tirar = evento.target.closest('[data-tirar]');
    if (!tirar || travado) return;
    limparErros(formulário);
    rodada += 1;
    escolhidos = escolhidos.filter((_, i) => i !== Number(tirar.dataset.tirar));
    notificar();
    botão.focus();
  });

  // Arrastar e soltar em qualquer ponto da ferramenta.
  let profundidade = 0;
  const temArquivos = (evento) => [...(evento.dataTransfer?.types ?? [])].includes('Files');
  const terminarArraste = () => {
    profundidade = 0;
    vazio.textContent = textoDoVazio;
    vazio.hidden = escolhidos.length > 0;
  };
  elemento.addEventListener('dragenter', (evento) => {
    if (!temArquivos(evento) || travado) return;
    evento.preventDefault();
    profundidade += 1;
    vazio.textContent = textoDeSolte;
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
    atuais: () => escolhidos,
    limpar,
    adicionar,
    travar(valor) {
      travado = valor;
      botão.disabled = valor;
      if (botãoDaFoto) botãoDaFoto.disabled = valor;
      for (const tirar of lista.querySelectorAll('[data-tirar]')) tirar.toggleAttribute('disabled', valor);
    },
  };
}

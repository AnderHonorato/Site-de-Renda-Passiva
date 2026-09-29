/** Juntar PDF: escolher, ordenar e juntar PDFs no próprio navegador. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { criarProgresso, mostrarErro, limparErros } from '../núcleo/interface.js';
import { escapar } from '../núcleo/texto.js';
import { ícone } from '../núcleo/ícones.js';
import {
  juntarPdfs, validarArquivoPdf, mensagemDeErroDoPdf, formatarTamanho,
  LIMITE_DE_ARQUIVOS, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../cálculos/pdf.js';

/** Build ES module da pdf-lib 1.17.1 (MIT), baixado só quando esta ferramenta precisa. */
const CAMINHO_DA_BIBLIOTECA = '../../recursos/pdf-lib.esm.min.js';

/** Bytes lidos do começo do arquivo para conferir a assinatura %PDF. */
const BYTES_DA_ASSINATURA = 1024;

const número = (valor) => valor.toLocaleString('pt-BR');
const páginas = (quantidade) => `${número(quantidade)} ${quantidade === 1 ? 'página' : 'páginas'}`;

/** Seta para cima: a mesma seta para baixo do conjunto do portal, girada. */
const SETA_PARA_CIMA = ícone('seta-baixo')
  .replace('focusable="false">', 'focusable="false"><g transform="rotate(180 12 12)">')
  .replace('</svg>', '</g></svg>');

/**
 * Nome de arquivo com pontos de quebra (<wbr>) depois de ".", "_" e "-" e a
 * cada 12 letras de um trecho sem espaço. No celular, os botões da linha tomam
 * boa parte da largura, e "RG_escaneado_2024.pdf" era cortado no meio.
 * @param {string} nome
 * @returns {string} HTML já escapado
 */
function nomeQuebrável(nome) {
  return nome.split(' ').map((palavra) => {
    const pedaços = palavra.match(/[^._-]*[._-]?/g).filter(Boolean)
      .flatMap((pedaço) => pedaço.match(/.{1,12}/gu));
    return pedaços.map(escapar).join('<wbr>');
  }).join(' ');
}

let bibliotecaCarregando;
/** Carrega a pdf-lib uma vez só; a primeira escolha de arquivo já adianta o download. */
function carregarBiblioteca() {
  bibliotecaCarregando ??= import(CAMINHO_DA_BIBLIOTECA).catch((erro) => {
    bibliotecaCarregando = undefined;
    throw erro;
  });
  return bibliotecaCarregando;
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDFs" ou arraste os arquivos para o quadro. Eles são lidos no seu navegador, sem envio para servidor.',
      'Use as setas de cada linha para deixar os arquivos na ordem que o documento final deve ter. A lixeira tira o arquivo da lista.',
      'Toque em "Juntar PDFs" e acompanhe o progresso página a página. Se estiver demorando, dá para cancelar.',
      'Baixe o PDF juntado. Os arquivos originais continuam intactos no seu aparelho.',
    ],
    exemplo: {
      texto: 'Para mandar a documentação de um cadastro num arquivo só: o RG escaneado (1 página), o comprovante de residência '
        + '(1 página) e o contrato (4 páginas) viram um único PDF de 6 páginas, na ordem da lista.',
    },
    limites: `Até ${LIMITE_DE_ARQUIVOS} arquivos por vez, cada um com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser juntado. '
      + 'As páginas entram como estão, sem recompressão: o tamanho final fica perto da soma dos originais. '
      + 'A junção usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meus arquivos são enviados para algum servidor?',
        r: 'Não. A biblioteca que junta os PDFs é baixada com a página e roda no seu navegador; os arquivos não saem do aparelho.',
      },
      {
        p: 'E se o PDF tiver senha?',
        r: 'PDF protegido não pode ser juntado sem a senha. Abra o arquivo no leitor de PDF, salve uma cópia sem proteção e use essa cópia aqui.',
      },
      {
        p: `Preciso juntar mais de ${LIMITE_DE_ARQUIVOS} arquivos. E agora?`,
        r: `Junte em etapas: junte os ${LIMITE_DE_ARQUIVOS} primeiros, baixe o resultado e junte esse arquivo com os próximos. A ordem das páginas se mantém.`,
      },
    ],
  },

  montar(raiz, ferramenta) {
    /** @type {{nome: string, tamanho: number, arquivo: File}[]} */
    let escolhidos = [];
    let cancelar = false;
    let progresso;
    let botãoJuntar;
    let botãoCancelar;
    /** Liga e desliga a edição da lista: durante a junção, a ordem não pode mudar. */
    let travarLista = () => {};

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Juntar PDFs',
      demorada: true,
      campos: [
        {
          nome: 'arquivos', rótulo: 'Arquivos PDF', tipo: 'file',
          dica: `Até ${LIMITE_DE_ARQUIVOS} arquivos, com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} cada. A ordem da lista é a ordem do PDF final.`,
        },
      ],
      async calcular() {
        if (escolhidos.length < 2) throw new ErroDeEntrada(mensagemDeErroDoPdf('poucos_arquivos'), 'arquivos');
        if (escolhidos.length > LIMITE_DE_ARQUIVOS) {
          throw new ErroDeEntrada(mensagemDeErroDoPdf('limite_de_arquivos'), 'arquivos');
        }

        cancelar = false;
        botãoJuntar.disabled = true;
        botãoCancelar.hidden = false;
        travarLista(true);
        try {
          progresso.andar(4, 'Preparando o leitor de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error('Não foi possível carregar o leitor de PDF. Confira a conexão e tente de novo.');
          }

          progresso.andar(8, 'Lendo os arquivos…');
          const arquivos = [];
          for (const { nome, arquivo } of escolhidos) {
            arquivos.push({ nome, bytes: new Uint8Array(await arquivo.arrayBuffer()) });
          }

          const r = await juntarPdfs(arquivos, {
            biblioteca,
            limiteDeArquivos: LIMITE_DE_ARQUIVOS,
            cancelado: () => cancelar,
            aoProgredir: ({ página, total }) => progresso.andar(10 + (85 * página) / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdf('cancelado'));
            throw new ErroDeEntrada(mensagemDeErroDoPdf(r.erro, { nome: r.extras?.nome }), 'arquivos');
          }

          return {
            valor: `PDF pronto: ${páginas(r.páginas)}`,
            resumo: `${número(r.arquivos)} arquivos juntados na ordem da lista · ${formatarTamanho(r.bytes.length)}.`,
            linhas: r.detalhes.map((d, i) => [`${i + 1}. ${d.nome}`, páginas(d.páginas)]),
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, 'juntado') }],
            observações: ['Os arquivos foram lidos no seu navegador e nada foi enviado. Os originais continuam intactos no seu aparelho.'],
          };
        } finally {
          botãoJuntar.disabled = false;
          botãoCancelar.hidden = true;
          travarLista(false);
        }
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        const entrada = elemento.querySelector('#campo-arquivos');
        const campo = entrada.closest('.campo');
        const resultado = elemento.querySelector('#resultado');
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        botãoJuntar = formulário.querySelector('button[type="submit"]');

        // A entrada de arquivo nativa não segue o tema; quem abre a escolha é um botão do portal.
        entrada.multiple = true;
        entrada.accept = 'application/pdf,.pdf';
        entrada.hidden = true;
        const botãoEscolher = document.createElement('button');
        botãoEscolher.type = 'button';
        botãoEscolher.className = 'botão botão--linha';
        botãoEscolher.innerHTML = `${ícone('pasta')}Escolher PDFs`;
        botãoEscolher.setAttribute('aria-describedby', 'campo-arquivos-dica');
        entrada.after(botãoEscolher);
        botãoEscolher.addEventListener('click', () => entrada.click());

        // Lista sem <ul>: o recuo padrão da lista roubava 40px da linha no celular.
        const lista = document.createElement('div');
        lista.className = 'lista-ferramentas t-2';
        lista.setAttribute('role', 'list');
        lista.setAttribute('aria-label', 'PDFs escolhidos, na ordem da junção');
        const vazio = document.createElement('p');
        vazio.className = 'vazio t-2';
        const TEXTO_DO_VAZIO = 'Nenhum PDF escolhido ainda. Arraste os arquivos para este quadro ou use o botão "Escolher PDFs".';
        vazio.textContent = TEXTO_DO_VAZIO;
        elemento.querySelector('.campos').after(lista, vazio);

        botãoCancelar = document.createElement('button');
        botãoCancelar.type = 'button';
        botãoCancelar.className = 'botão botão--linha';
        botãoCancelar.hidden = true;
        botãoCancelar.innerHTML = `${ícone('fechar')}Cancelar`;
        botãoCancelar.addEventListener('click', () => { cancelar = true; });
        formulário.querySelector('.ações').append(botãoCancelar);

        let juntando = false;
        travarLista = (travada) => {
          lista.inert = travada;
          botãoEscolher.disabled = travada;
          juntando = travada;
        };

        function desenhar() {
          lista.innerHTML = escolhidos.map((a, i) => {
            const nome = escapar(a.nome);
            const botão = (ação, conteúdo, rótulo, desligado) => `<button type="button" class="ícone-botão${desligado ? ' campo--inativo' : ''}"`
              + ` data-ação="${ação}" data-índice="${i}" aria-label="${rótulo}: ${nome}"${desligado ? ' disabled' : ''}>${conteúdo}</button>`;
            return `<div class="ferramenta-linha" role="listitem">
              <span class="ferramenta-linha__ícone">${ícone('documento')}</span>
              <span class="ferramenta-linha__texto">
                <span class="ferramenta-linha__nome" title="${nome}">${i + 1}. ${nomeQuebrável(a.nome)}</span>
                <span class="ferramenta-linha__resumo">${escapar(formatarTamanho(a.tamanho))}</span>
              </span>
              <span class="ferramenta-linha__fim">
                ${botão('subir', SETA_PARA_CIMA, 'Subir', i === 0)}
                ${botão('descer', ícone('seta-baixo'), 'Descer', i === escolhidos.length - 1)}
                ${botão('remover', ícone('lixeira'), 'Remover', false)}
              </span>
            </div>`;
          }).join('');
          lista.hidden = escolhidos.length === 0;
          vazio.hidden = escolhidos.length > 0;
        }

        /** A lista mudou: o PDF juntado antes não corresponde mais a ela. */
        function listaMudou() {
          resultado.hidden = true;
          desenhar();
        }

        async function adicionar(arquivos) {
          if (juntando) return;
          limparErros(formulário);
          const recusas = [];
          for (const arquivo of arquivos) {
            if (escolhidos.length >= LIMITE_DE_ARQUIVOS) {
              recusas.push(`"${arquivo.name}" ficou de fora: ${mensagemDeErroDoPdf('limite_de_arquivos')}`);
              continue;
            }
            // Só o começo do arquivo é lido agora; o resto, na hora de juntar.
            const começo = new Uint8Array(await arquivo.slice(0, BYTES_DA_ASSINATURA).arrayBuffer());
            const validação = validarArquivoPdf({ nome: arquivo.name, tamanho: arquivo.size, bytes: começo });
            if (!validação.ok) {
              recusas.push(mensagemDeErroDoPdf(validação.erro, { nome: arquivo.name }));
              continue;
            }
            escolhidos.push({ nome: arquivo.name, tamanho: arquivo.size, arquivo });
          }
          listaMudou();
          if (recusas.length) mostrarErro(campo, recusas.join(' '));
          if (escolhidos.length) carregarBiblioteca().catch(() => { /* o erro aparece ao juntar */ });
        }

        entrada.addEventListener('change', () => {
          adicionar([...entrada.files]);
          entrada.value = '';
        });

        lista.addEventListener('click', (evento) => {
          const botão = evento.target.closest('button[data-ação]');
          if (!botão || botão.disabled) return;
          const índice = Number(botão.dataset.índice);
          const ação = botão.dataset.ação;
          if (ação === 'remover') {
            escolhidos.splice(índice, 1);
            listaMudou();
            (lista.querySelector(`[data-ação="remover"][data-índice="${Math.min(índice, escolhidos.length - 1)}"]`) ?? botãoEscolher).focus();
            return;
          }
          const destino = índice + (ação === 'subir' ? -1 : 1);
          [escolhidos[índice], escolhidos[destino]] = [escolhidos[destino], escolhidos[índice]];
          listaMudou();
          // O foco acompanha o arquivo que mudou de lugar.
          const mesmo = lista.querySelector(`[data-ação="${ação}"][data-índice="${destino}"]`);
          (mesmo && !mesmo.disabled ? mesmo : lista.querySelector(`[data-ação="${ação === 'subir' ? 'descer' : 'subir'}"][data-índice="${destino}"]`))?.focus();
        });

        // Arrastar e soltar em qualquer ponto da ferramenta.
        let profundidade = 0;
        const temArquivos = (evento) => [...(evento.dataTransfer?.types ?? [])].includes('Files');
        elemento.addEventListener('dragenter', (evento) => {
          if (!temArquivos(evento)) return;
          evento.preventDefault();
          profundidade++;
          vazio.textContent = 'Solte os PDFs para colocar na lista.';
          vazio.hidden = false;
        });
        elemento.addEventListener('dragover', (evento) => { if (temArquivos(evento)) evento.preventDefault(); });
        const terminarArraste = () => {
          profundidade = 0;
          vazio.textContent = TEXTO_DO_VAZIO;
          vazio.hidden = escolhidos.length > 0;
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

        formulário.addEventListener('reset', () => {
          escolhidos = [];
          cancelar = true;
          desenhar();
        });

        desenhar();
      },
    });
  },
};

/** Extrair texto do PDF: o texto de cada página, para ler, copiar ou baixar, lido no próprio navegador com o pdf.js. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { textoDePáginas, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import {
  extrairTextoDoPdf, mensagemDeErroDeExtração, listaDePáginas, LIMITE_DE_CARACTERES, LIMITE_DA_PRÉVIA,
} from '../cálculos/extrair-texto-de-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { abrirComPdfjsParaTexto } from './auxiliares/pdfjs-textos.js';

const número = (valor) => valor.toLocaleString('pt-BR');

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro) {
  if (erro.startsWith('faixa_') || erro === 'texto_grande') return 'páginas';
  return 'arquivo';
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Se quiser só parte do documento, escreva as páginas em "Páginas", como 1-3 ou 5. Em branco, vale o PDF todo. Escolha também se as linhas ficam como no PDF ou se são unidas em parágrafos.',
      'Toque em "Extrair texto". O texto aparece na tela, página por página.',
      'Copie o texto ou baixe um arquivo .txt para abrir em qualquer editor.',
    ],
    exemplo: {
      texto: 'Um contrato de 3 páginas vira um texto com os títulos "--- Página 1 ---", "--- Página 2 ---" e "--- Página 3 ---", cada um seguido do que está escrito na página. '
        + 'Escrevendo "2" em "Páginas", só o texto da página 2 sai. Um PDF que é só foto de documento escaneado não tem texto: a ferramenta avisa em vez de entregar um arquivo vazio.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas; texto de até ${LIMITE_DE_CARACTERES.toLocaleString('pt-BR')} caracteres. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser lido: salve uma cópia sem proteção. '
      + 'A ferramenta só pega o texto que está dentro do arquivo. PDF ESCANEADO (cada página é uma foto) não tem texto, e esta ferramenta não faz OCR: o reconhecimento de caracteres é outra ferramenta. '
      + 'A ordem é a que o arquivo guarda, que costuma ser a de leitura; em páginas com colunas, tabelas ou formulários o texto pode sair fora de ordem ou com os espaços trocados. '
      + 'Letras decorativas, fórmulas e fontes sem mapeamento correto podem sair trocadas por outros símbolos. Imagens e gráficos não viram texto. '
      + `Na tela aparecem só os primeiros ${LIMITE_DA_PRÉVIA.toLocaleString('pt-BR')} caracteres; copiar e baixar levam o texto inteiro. `
      + 'A leitura usa o leitor de PDF pdf.js (licença Apache 2.0), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu PDF é enviado para algum servidor?',
        r: 'Não. O leitor que extrai o texto é baixado com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'O aviso diz que meu PDF não tem texto. E agora?',
        r: 'Ele provavelmente é um documento escaneado ou fotografado: cada página é uma imagem. Para transformar a imagem em texto é preciso OCR, que é outra ferramenta e não está nesta.',
      },
      {
        p: 'O texto saiu com as linhas quebradas no meio das frases. Dá para arrumar?',
        r: 'Sim: escolha "Unir as linhas de cada parágrafo". As linhas seguidas viram uma só, e as palavras partidas com hífen no fim da linha são recompostas.',
      },
      {
        p: 'E se o PDF tiver senha?',
        r: 'Ele não pode ser lido sem a senha. Abra o arquivo no leitor de PDF, salve uma cópia sem proteção e use essa cópia aqui.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;
    let blocoDoTexto;
    let áreaDoTexto;
    let notaDoTexto;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Extrair texto',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        {
          nome: 'páginas', rótulo: 'Páginas', tipo: 'text', exemplo: 'Todas',
          dica: 'Em branco, todas. Exemplos: 1-3, 5, 8-, pares.',
        },
        {
          nome: 'quebras', rótulo: 'Linhas', tipo: 'seleção', padrão: 'linhas',
          opções: [{ valor: 'linhas', rótulo: 'Manter as linhas como no PDF' }, { valor: 'parágrafos', rótulo: 'Unir as linhas de cada parágrafo' }],
        },
        { nome: 'títulos', rótulo: 'Escrever o título de cada página', tipo: 'caixa', padrão: true },
      ],

      async calcular(dados) {
        blocoDoTexto.hidden = true;
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando o leitor de PDF…');
          const { nome, arquivo } = itens[0];
          progresso.andar(undefined, 'Lendo o arquivo…');
          const bytes = new Uint8Array(await arquivo.arrayBuffer());

          progresso.andar(undefined, 'Abrindo o PDF…');
          const r = await extrairTextoDoPdf({ nome, bytes }, {
            abrir: abrirComPdfjsParaTexto, páginas: dados.páginas ?? '', parágrafos: dados.quebras === 'parágrafos', títulos: dados.títulos === 'sim',
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(100 * página / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            // O leitor que não carregou é falha de rede, não do que a pessoa digitou.
            if (r.erro === 'leitor_indisponível') throw new Error(mensagemDeErroDeExtração(r.erro));
            throw new ErroDeEntrada(mensagemDeErroDeExtração(r.erro, { nome, ...r.extras }), campoDoErro(r.erro));
          }

          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const observações = [];
          if (r.semTexto.length) {
            observações.unshift(`${r.semTexto.length === 1 ? 'A página' : 'As páginas'} ${listaDePáginas(r.semTexto)} ${r.semTexto.length === 1 ? 'não tem' : 'não têm'} texto: `
              + `${r.semTexto.length === 1 ? 'parece uma imagem escaneada' : 'parecem imagens escaneadas'}. Esta ferramenta não faz OCR; o reconhecimento de caracteres é outra ferramenta.`);
          }
          observações.push('O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.');

          // O texto inteiro vai para copiar e baixar; a tela mostra só o começo.
          const longo = r.texto.length > LIMITE_DA_PRÉVIA;
          áreaDoTexto.value = longo ? r.texto.slice(0, LIMITE_DA_PRÉVIA) : r.texto;
          notaDoTexto.textContent = longo
            ? `Mostrando os primeiros ${número(LIMITE_DA_PRÉVIA)} de ${número(r.texto.length)} caracteres. Copiar e baixar levam o texto inteiro.`
            : '';
          notaDoTexto.hidden = !longo;
          blocoDoTexto.hidden = false;

          const comTexto = r.páginas.length - r.semTexto.length;
          return {
            valor: `Texto de ${textoDePáginas(comTexto)}`,
            resumo: `${nome}: ${número(r.caracteres)} caracteres (sem contar espaços) em ${textoDePáginas(r.páginas.length)} lidas de ${textoDePáginas(r.totalDePáginas)}.`,
            linhas: r.páginas.slice(0, 5).map((p) => [`Página ${p.página}`, p.vazia ? 'sem texto' : `${número(p.caracteres)} caracteres`])
              .concat(r.páginas.length > 5 ? [['…', `e mais ${número(r.páginas.length - 5)}`]] : []),
            texto: r.texto,
            arquivos: [{ rótulo: 'Baixar .txt', ícone: 'baixar', gerar: () => baixar(r.texto, `${base}-texto.txt`, 'text/plain;charset=utf-8') }],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo',
          rótuloDoBotão: 'Escolher PDF',
          accept: 'application/pdf,.pdf',
          rótuloDaLista: 'PDF escolhido',
          textoDoVazio: 'Nenhum PDF escolhido ainda. Arraste o arquivo para este quadro ou use o botão "Escolher PDF".',
          textoDeSolte: 'Solte o PDF para escolher.',
          validar: validarPdfDaEscolha,
          // Outro arquivo (ou nenhum): o texto mostrado deixa de valer.
          aoMudar: () => { if (blocoDoTexto) blocoDoTexto.hidden = true; },
        });
        execução = prepararExecução(elemento, { escolha });

        // O texto lido fica numa área só para leitura logo abaixo do resultado, com rótulo para o leitor de tela.
        blocoDoTexto = document.createElement('div');
        blocoDoTexto.className = 'campo t-3';
        blocoDoTexto.hidden = true;
        const rótulo = document.createElement('label');
        rótulo.htmlFor = 'texto-extraído';
        rótulo.textContent = 'Texto extraído';
        áreaDoTexto = document.createElement('textarea');
        áreaDoTexto.id = 'texto-extraído';
        áreaDoTexto.readOnly = true;
        áreaDoTexto.rows = 14;
        áreaDoTexto.spellcheck = false;
        notaDoTexto = document.createElement('p');
        notaDoTexto.className = 'campo__dica';
        notaDoTexto.hidden = true;
        blocoDoTexto.append(rótulo, áreaDoTexto, notaDoTexto);
        elemento.querySelector('#resultado').after(blocoDoTexto);

        // Mudar uma opção ou "Limpar" também invalida o texto mostrado.
        const esconder = () => { blocoDoTexto.hidden = true; };
        elemento.querySelector('#formulário').addEventListener('reset', esconder);
        for (const nome of ['páginas', 'quebras', 'títulos']) elemento.querySelector(`#campo-${nome}`).addEventListener('input', esconder);
      },
    });
  },
};

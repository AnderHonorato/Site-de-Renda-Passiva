/** PDF para JPG: cada página vira uma imagem, desenhada no próprio navegador com o pdf.js. */
import { montarFerramenta, ErroDeEntrada, baixar, número as lerNúmero } from '../núcleo/montador.js';
import { nomeDeArquivo } from '../núcleo/exportar.js';
import { compactarZip } from '../comum/exportação/compactar-zip.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { textoDePáginas, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import {
  converterPdfEmImagens, mensagemDeErroDePdfParaImagem, FORMATOS, DPI_MÍN, DPI_MÁX, DPI_PADRÃO,
  LIMITE_DE_PÁGINAS_CONVERTIDAS, LADO_MÁXIMO_EM_PIXELS,
} from '../cálculos/pdf-para-jpg.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { abrirComPdfjs } from './auxiliares/leitor-pdfjs.js';

const número = (valor) => valor.toLocaleString('pt-BR');

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro) {
  if (erro.startsWith('faixa_') || erro === 'páginas_demais') return 'páginas';
  const direto = { formato_inválido: 'formato', dpi_inválido: 'dpi', qualidade_inválida: 'qualidade' };
  return direto[erro] ?? 'arquivo';
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Escolha o formato (JPG ou PNG), a resolução em dpi (150 serve para tela; 300 para imprimir) e, se for o caso, só algumas páginas, como 1-3 ou 5.',
      'Toque em "Converter em imagens" e acompanhe o progresso, página a página. Se estiver demorando, dá para cancelar.',
      'Baixe o resultado: uma página vira uma imagem solta; várias viram um ZIP com as imagens em ordem.',
    ],
    exemplo: {
      texto: 'Um PDF A4 de 3 páginas em JPG a 150 dpi vira um ZIP com 3 imagens de 1240 × 1754 pixels, chamadas nome-pagina-001.jpg, '
        + 'nome-pagina-002.jpg e nome-pagina-003.jpg. A 72 dpi, a mesma página sai com 595 × 842 pixels.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas; até ${LIMITE_DE_PÁGINAS_CONVERTIDAS} páginas convertidas por vez. `
      + `Resolução de ${DPI_MÍN} a ${DPI_MÁX} dpi. Página muito grande tem a resolução reduzida para a imagem não passar de ${LADO_MÁXIMO_EM_PIXELS.toLocaleString('pt-BR')} pixels de lado (o resultado avisa). `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser convertido: salve uma cópia sem proteção. '
      + 'O fundo das imagens é sempre branco. Fontes que não vêm dentro do PDF são trocadas pelas do seu aparelho, então o desenho pode variar um pouco. '
      + 'PDFs que usam fontes asiáticas não embutidas podem sair com letras faltando. '
      + 'Só as páginas viram imagem: esta ferramenta não extrai as fotos que estão dentro do PDF. '
      + 'A conversão usa o leitor de PDF pdf.js (licença Apache 2.0), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu PDF é enviado para algum servidor?',
        r: 'Não. O leitor que desenha as páginas é baixado com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'Qual a diferença entre JPG e PNG?',
        r: 'JPG gera arquivos menores e serve para fotos e páginas com imagem. PNG não perde qualidade e fica melhor em texto e desenhos, mas os arquivos são maiores.',
      },
      {
        p: 'Que resolução devo escolher?',
        r: '72 dpi é para miniaturas; 150 dpi serve para ver na tela e mandar por mensagem; 300 dpi é para imprimir. Quanto maior, maior e mais lento o arquivo.',
      },
      {
        p: 'E se o PDF tiver senha?',
        r: 'Ele não pode ser convertido sem a senha. Abra o arquivo no leitor de PDF, salve uma cópia sem proteção e use essa cópia aqui.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter em imagens',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        {
          nome: 'formato', rótulo: 'Formato da imagem', tipo: 'seleção', padrão: 'jpg',
          opções: [{ valor: 'jpg', rótulo: 'JPG (menor)' }, { valor: 'png', rótulo: 'PNG (sem perda)' }],
        },
        { nome: 'dpi', rótulo: 'Resolução (dpi)', tipo: 'número', padrão: String(DPI_PADRÃO), dica: `De ${DPI_MÍN} a ${DPI_MÁX}. 150 serve para tela; 300, para imprimir.` },
        {
          nome: 'qualidade', rótulo: 'Qualidade do JPG', tipo: 'seleção', padrão: '80',
          opções: [{ valor: '60', rótulo: 'Menor arquivo (60)' }, { valor: '80', rótulo: 'Normal (80)' }, { valor: '95', rótulo: 'Alta (95)' }],
        },
        {
          nome: 'páginas', rótulo: 'Páginas', tipo: 'text', exemplo: 'Todas',
          dica: `Em branco, todas (até ${LIMITE_DE_PÁGINAS_CONVERTIDAS}). Exemplos: 1-3, 5, 8-, pares.`,
        },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        // A resolução é lida antes de abrir o PDF: erro de digitação não deve custar a leitura de 100 MB.
        const dpi = lerNúmero(dados, 'dpi', { rótulo: 'Resolução', inteiro: true, mín: DPI_MÍN, máx: DPI_MÁX });

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando o leitor de PDF…');
          const { nome, arquivo } = itens[0];
          progresso.andar(undefined, 'Lendo o arquivo…');
          const bytes = new Uint8Array(await arquivo.arrayBuffer());

          progresso.andar(undefined, 'Abrindo o PDF…');
          const r = await converterPdfEmImagens({ nome, bytes }, {
            abrir: abrirComPdfjs, formato: dados.formato, dpi, qualidade: Number(dados.qualidade), páginas: dados.páginas ?? '',
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(100 * página / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            // O leitor que não carregou é falha de rede, não do que a pessoa digitou.
            if (r.erro === 'leitor_indisponível') throw new Error(mensagemDeErroDePdfParaImagem(r.erro));
            throw new ErroDeEntrada(mensagemDeErroDePdfParaImagem(r.erro, r.extras), campoDoErro(r.erro));
          }

          const { extensão, tipo } = FORMATOS[dados.formato];
          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const várias = r.imagens.length > 1;
          const zip = várias ? compactarZip(r.imagens.map((i) => ({ nome: i.nome, conteúdo: i.bytes }))) : null;
          const total = r.imagens.reduce((soma, i) => soma + i.bytes.length, 0);
          const observações = ['O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.'];
          if (r.reduzidas.length) {
            observações.unshift(`A resolução foi reduzida ${r.reduzidas.length === 1 ? 'na página' : 'nas páginas'} ${r.reduzidas.slice(0, 8).join(', ')}${r.reduzidas.length > 8 ? '…' : ''} para a imagem caber nos limites do navegador.`);
          }
          return {
            valor: várias ? `${número(r.imagens.length)} imagens prontas` : 'Imagem pronta',
            resumo: `${nome}: ${textoDePáginas(r.páginas)} no total · ${formatarTamanho(várias ? zip.length : total)}.`,
            linhas: r.imagens.slice(0, 5).map((i) => [i.nome, `${número(i.largura)} × ${número(i.altura)} px · ${formatarTamanho(i.bytes.length)}`])
              .concat(r.imagens.length > 5 ? [['…', `e mais ${número(r.imagens.length - 5)}`]] : []),
            arquivos: [várias
              ? { rótulo: 'Baixar ZIP', ícone: 'baixar', gerar: () => baixar(zip, `${base}-imagens.zip`, 'application/zip') }
              : { rótulo: `Baixar ${extensão.toUpperCase()}`, ícone: 'baixar', gerar: () => baixar(r.imagens[0].bytes, r.imagens[0].nome, tipo) }],
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
        });
        execução = prepararExecução(elemento, { escolha });

        // A qualidade só existe para JPG; o PNG não perde nada.
        const formato = elemento.querySelector('#campo-formato');
        const qualidade = elemento.querySelector('[data-campo="qualidade"]');
        const atualizar = () => { qualidade.hidden = formato.value !== 'jpg'; };
        formato.addEventListener('change', atualizar);
        elemento.querySelector('#formulário').addEventListener('reset', () => setTimeout(atualizar, 0));
        atualizar();
      },
    });
  },
};

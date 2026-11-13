/** Extrair páginas do PDF: cria um PDF novo só com as páginas escolhidas, na ordem pedida. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { criarProgresso } from '../núcleo/interface.js';
import { extrairPáginas } from '../cálculos/extrair-paginas-do-pdf.js';
import {
  páginas, formatarTamanho, condensarPáginas, mensagemDeErro, folga, LIMITE_DE_PÁGINAS, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../cálculos/páginas-do-pdf.js';
import { prepararEscolhaDePdf, carregarBiblioteca, ERRO_DA_BIBLIOTECA } from './auxiliares/escolher-pdf.js';
import { criarMarcadorDePáginas } from './auxiliares/marcar-paginas.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const DICA_DAS_PÁGINAS = 'A ordem que você digitar é a ordem do PDF novo. Use hífen para intervalos, como em 2, 4-7, 10.';

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Digite as páginas que você quer levar (por exemplo 2, 4-7, 10) ou toque nos números do bloco "Marcar as páginas tocando nos números".',
      'Toque em "Extrair páginas". O PDF novo terá só essas páginas, na ordem em que você digitou.',
      'Baixe o PDF novo. O arquivo original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'De um relatório de 40 páginas você só precisa do resumo (página 3), da tabela de preços (páginas 12 a 14) e da capa, que vai por último. '
        + 'Digitando 3, 12-14, 1, o PDF novo tem 5 páginas, nessa ordem: 3, 12, 13, 14 e 1.',
    },
    limites: `Um PDF por vez, com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e até ${número(LIMITE_DE_PÁGINAS)} páginas. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser editado. '
      + 'A ordem digitada é respeitada, e uma página escrita duas vezes sai duas vezes. As páginas entram como estão, sem recompressão. '
      + 'O PDF novo é montado do zero com as páginas escolhidas, então o resto do original não vai escondido dentro do arquivo; '
      + 'em troca, marcadores (sumário) e campos de formulário do original podem não ser mantidos, e links para páginas que não foram levadas deixam de funcionar. '
      + 'Não há miniaturas: as páginas são escolhidas pelo número. A cópia usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu arquivo é enviado para algum servidor?',
        r: 'Não. A biblioteca que monta o PDF é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'Posso mudar a ordem das páginas ao extrair?',
        r: 'Pode: o PDF novo segue a ordem do que você digitou. "8, 2-3" dá as páginas 8, 2 e 3, nessa ordem. Para reordenar com mais liberdade, use "Organizar PDF".',
      },
      {
        p: 'Quero um arquivo separado para cada página. Como faço?',
        r: 'Use "Dividir PDF" com a opção de uma página por arquivo. Aqui sai sempre um PDF só, com todas as páginas que você escolheu.',
      },
      {
        p: 'E se o PDF tiver senha?',
        r: 'Ele não pode ser aberto aqui sem a senha. Abra no leitor de PDF, salve uma cópia sem proteção e use essa cópia.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let progresso;
    let marcador;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Extrair páginas',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele não sai do seu aparelho.`,
        },
        {
          nome: 'páginas', rótulo: 'Páginas a extrair', tipo: 'text', exemplo: '2, 4-7, 10',
          dica: DICA_DAS_PÁGINAS,
        },
      ],

      async calcular(dados) {
        const pdf = escolha.atual();
        if (!pdf) throw new ErroDeEntrada(mensagemDeErro('sem_arquivo'), 'arquivo');

        escolha.travar(true);
        try {
          progresso.andar(undefined, 'Montando o PDF novo…');
          await folga();
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DA_BIBLIOTECA);
          }
          const r = await extrairPáginas(pdf, dados.páginas, { biblioteca });
          if (!r.ok) throw new ErroDeEntrada(r.mensagem, r.campo);
          progresso.andar(undefined, 'Gravando o arquivo…');
          await folga();

          const lista = condensarPáginas(r.extraídas);
          const observações = [
            'O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.',
          ];
          if (r.repetidas.length) {
            const quais = r.repetidas.length > 1
              ? `As páginas ${r.repetidas.join(', ')} apareceram mais de uma vez`
              : `A página ${r.repetidas[0]} apareceu mais de uma vez`;
            observações.push(`${quais} no que você digitou e ${r.repetidas.length > 1 ? 'foram repetidas' : 'foi repetida'} no PDF novo. Se foi engano, corrija o campo e extraia de novo.`);
          }
          return {
            valor: `PDF pronto: ${páginas(r.extraídas.length)}`,
            resumo: `Páginas ${lista}, na ordem digitada · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Páginas no original', número(r.total)],
              ['Páginas no PDF novo', número(r.extraídas.length)],
              ['Ordem das páginas', lista],
              ['Tamanho do PDF novo', formatarTamanho(r.bytes.length)],
            ],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, r.nomeSugerido) }],
            observações,
          };
        } finally {
          escolha.travar(false);
        }
      },

      aoMontar(elemento) {
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        const resultado = elemento.querySelector('#resultado');
        const campoPáginas = elemento.querySelector('#campo-páginas');
        const dicaDasPáginas = elemento.querySelector('#campo-páginas-dica');

        campoPáginas.setAttribute('autocapitalize', 'none');
        campoPáginas.setAttribute('spellcheck', 'false');

        marcador = criarMarcadorDePáginas({
          depoisDe: campoPáginas.closest('.campo'), entrada: campoPáginas, ordem: 'digitada',
        });

        escolha = prepararEscolhaDePdf(elemento, {
          aoMudar(pdf) {
            resultado.hidden = true;
            marcador.definirTotal(pdf?.total ?? 0);
            dicaDasPáginas.textContent = pdf ? `${DICA_DAS_PÁGINAS} Este PDF tem ${páginas(pdf.total)}.` : DICA_DAS_PÁGINAS;
          },
        });

        campoPáginas.addEventListener('input', () => { resultado.hidden = true; });
      },
    });
  },
};

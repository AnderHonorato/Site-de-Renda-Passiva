/** Remover páginas do PDF: tira as páginas marcadas e devolve o resto, tudo no navegador. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { criarProgresso } from '../núcleo/interface.js';
import { removerPáginas } from '../cálculos/remover-paginas-do-pdf.js';
import {
  páginas, formatarTamanho, condensarPáginas, mensagemDeErro, folga, LIMITE_DE_PÁGINAS, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../cálculos/páginas-do-pdf.js';
import { prepararEscolhaDePdf, carregarBiblioteca, ERRO_DA_BIBLIOTECA } from './auxiliares/escolher-pdf.js';
import { criarMarcadorDePáginas } from './auxiliares/marcar-paginas.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const DICA_DAS_PÁGINAS = 'Números separados por vírgula; use hífen para intervalos, como em 1, 3-5, 9.';

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Digite as páginas que devem sair (por exemplo 1, 3-5, 9) ou toque nos números do bloco "Marcar as páginas tocando nos números".',
      'Toque em "Remover páginas" e confira a contagem: quantas páginas tinha, quantas saíram e quantas ficaram.',
      'Baixe o PDF novo. O arquivo original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um contrato de 10 páginas veio com a folha de rosto (página 1), uma página em branco (4) e dois anexos que não valem '
        + '(9 e 10). Digitando 1, 4, 9-10, o PDF novo fica com 6 páginas: as originais 2, 3, 5, 6, 7 e 8, na mesma ordem.',
    },
    limites: `Um PDF por vez, com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e até ${número(LIMITE_DE_PÁGINAS)} páginas. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser editado. '
      + 'Não dá para remover todas as páginas: pelo menos uma precisa ficar. As páginas que ficam entram como estão, sem recompressão. '
      + 'O PDF novo é montado do zero com as páginas que ficaram, então o conteúdo das removidas não fica escondido dentro do arquivo; '
      + 'em troca, marcadores (sumário) e campos de formulário do original podem não ser mantidos, e links que apontavam para uma página removida deixam de funcionar. '
      + 'Não há miniaturas: as páginas são escolhidas pelo número. A cópia usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu arquivo é enviado para algum servidor?',
        r: 'Não. A biblioteca que monta o PDF é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'O conteúdo das páginas removidas continua dentro do arquivo?',
        r: 'Não. O PDF novo é uma cópia só das páginas que ficaram; o que estava nas outras não vai junto. Mesmo assim, confira o resultado antes de enviar um documento sensível.',
      },
      {
        p: 'E se o PDF tiver senha?',
        r: 'Ele não pode ser aberto aqui sem a senha. Abra no leitor de PDF, salve uma cópia sem proteção e use essa cópia.',
      },
      {
        p: 'Como removo só as páginas pares ou só as ímpares?',
        r: 'Abra o bloco "Marcar as páginas tocando nos números" e use os botões "Pares" ou "Ímpares". O campo de páginas é preenchido sozinho.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let progresso;
    let marcador;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Remover páginas',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele não sai do seu aparelho.`,
        },
        {
          nome: 'páginas', rótulo: 'Páginas a remover', tipo: 'text', exemplo: '1, 3-5, 9',
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
          const r = await removerPáginas(pdf, dados.páginas, { biblioteca });
          if (!r.ok) throw new ErroDeEntrada(r.mensagem, r.campo);
          progresso.andar(undefined, 'Gravando o arquivo…');
          await folga();

          const removidas = condensarPáginas(r.removidas);
          return {
            valor: `PDF pronto: ${páginas(r.depois)}`,
            resumo: `Saíram ${páginas(r.removidas.length)} (${removidas}) e ficaram ${r.depois} de ${r.antes} · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Páginas no original', número(r.antes)],
              ['Páginas removidas', `${número(r.removidas.length)} (${removidas})`],
              ['Páginas no PDF novo', número(r.depois)],
              ['Tamanho do PDF novo', formatarTamanho(r.bytes.length)],
            ],
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, r.nomeSugerido) }],
            observações: [
              'O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.',
              'Links que apontavam para uma página removida deixam de funcionar no PDF novo.',
            ],
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
          depoisDe: campoPáginas.closest('.campo'), entrada: campoPáginas, ordem: 'crescente',
        });

        escolha = prepararEscolhaDePdf(elemento, {
          aoMudar(pdf) {
            // O PDF baixado antes não corresponde mais ao arquivo escolhido.
            resultado.hidden = true;
            marcador.definirTotal(pdf?.total ?? 0);
            dicaDasPáginas.textContent = pdf ? `${DICA_DAS_PÁGINAS} Este PDF tem ${páginas(pdf.total)}.` : DICA_DAS_PÁGINAS;
          },
        });

        // Mudou o que será removido: o resultado antigo não vale mais.
        campoPáginas.addEventListener('input', () => { resultado.hidden = true; });
      },
    });
  },
};

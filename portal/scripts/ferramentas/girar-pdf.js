/** Girar PDF: gira o arquivo todo, as páginas pares, as ímpares ou páginas escolhidas, tudo no navegador. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { criarProgresso } from '../núcleo/interface.js';
import { planejarGiro, girarPdf, RÓTULO_DOS_ÂNGULOS } from '../cálculos/girar-pdf.js';
import {
  páginas, formatarTamanho, condensarPáginas, mensagemDeErro, folga, LIMITE_DE_PÁGINAS, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../cálculos/páginas-do-pdf.js';
import { prepararEscolhaDePdf, carregarBiblioteca, ERRO_DA_BIBLIOTECA } from './auxiliares/escolher-pdf.js';
import { criarMarcadorDePáginas } from './auxiliares/marcar-paginas.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const DICA_DAS_PÁGINAS = 'Números separados por vírgula; use hífen para intervalos, como em 2, 4-6.';

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Escolha o giro (90° para a direita, 180° ou 90° para a esquerda) e quais páginas girar: todas, só as ímpares, só as pares ou páginas escolhidas por você.',
      'Se escolheu "Páginas escolhidas", digite os números (por exemplo 2, 4-6) ou toque neles no bloco "Marcar as páginas tocando nos números".',
      'Toque em "Girar PDF", confira o resumo e baixe o arquivo. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um escaneamento de 6 páginas saiu com as páginas 2 e 5 deitadas, viradas para a esquerda. Em "Páginas escolhidas", digitando 2, 5 com giro de '
        + '90° para a direita, só essas duas voltam para a posição certa; as outras quatro ficam como estavam.',
    },
    limites: `Um PDF por vez, com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e até ${número(LIMITE_DE_PÁGINAS)} páginas. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser editado. '
      + 'O giro é somado ao que a página já tinha: uma página que já estava a 90° e recebe mais 90° fica a 180°. '
      + 'Nada é recomprimido nem redesenhado: só a marca de rotação da página muda, então não há perda de qualidade. '
      + 'O PDF é gravado de novo, mas marcadores, links e campos de formulário continuam no lugar. '
      + 'Não há miniaturas para conferir: o resumo diz quais páginas foram giradas. A gravação usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu arquivo é enviado para algum servidor?',
        r: 'Não. A biblioteca que grava o PDF é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'O giro piora a qualidade das páginas?',
        r: 'Não. O conteúdo da página não é tocado: o PDF só ganha a indicação de que aquela página deve ser mostrada girada.',
      },
      {
        p: 'Girei e o leitor ainda mostra a página de lado. O que houve?',
        r: 'Confira se escolheu o sentido certo: "para a direita" é o sentido do relógio. Se a página ficou pior, gire de novo com 180° ou use o sentido contrário; os giros se somam.',
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
      rótuloDaAção: 'Girar PDF',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele não sai do seu aparelho.`,
        },
        {
          nome: 'ângulo', rótulo: 'Giro', tipo: 'seleção', padrão: '90',
          opções: [
            { valor: '90', rótulo: RÓTULO_DOS_ÂNGULOS[90] },
            { valor: '180', rótulo: RÓTULO_DOS_ÂNGULOS[180] },
            { valor: '270', rótulo: RÓTULO_DOS_ÂNGULOS[270] },
          ],
        },
        {
          nome: 'quais', rótulo: 'Quais páginas girar', tipo: 'seleção', padrão: 'todas',
          opções: [
            { valor: 'todas', rótulo: 'Todas as páginas' },
            { valor: 'ímpares', rótulo: 'Só as páginas ímpares' },
            { valor: 'pares', rótulo: 'Só as páginas pares' },
            { valor: 'escolhidas', rótulo: 'Páginas escolhidas' },
          ],
        },
        {
          nome: 'páginas', rótulo: 'Páginas a girar', tipo: 'text', exemplo: '2, 4-6',
          dica: DICA_DAS_PÁGINAS,
        },
      ],

      async calcular(dados) {
        const pdf = escolha.atual();
        if (!pdf) throw new ErroDeEntrada(mensagemDeErro('sem_arquivo'), 'arquivo');

        const plano = planejarGiro(pdf.total, { quais: dados.quais, páginas: dados.páginas });
        if (!plano.ok) throw new ErroDeEntrada(plano.mensagem, plano.campo);
        const ângulo = Number(dados.ângulo);

        escolha.travar(true);
        try {
          progresso.andar(10, 'Girando as páginas…');
          await folga();
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DA_BIBLIOTECA);
          }
          const r = await girarPdf(pdf, plano.páginas, ângulo, { biblioteca });
          if (!r.ok) throw new ErroDeEntrada(r.mensagem, 'arquivo');
          progresso.andar(90, 'Gravando o arquivo…');
          await folga();

          const lista = r.giradas.length === r.total ? 'todas' : condensarPáginas(r.giradas);
          const observações = ['O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.'];
          if (r.jáGiradas > 0) {
            observações.push(`${r.jáGiradas === 1 ? 'Uma página já estava girada' : `${número(r.jáGiradas)} páginas já estavam giradas`} no original; o giro novo foi somado ao que ela já tinha.`);
          }
          return {
            valor: `PDF girado: ${páginas(r.giradas.length)}`,
            resumo: `${RÓTULO_DOS_ÂNGULOS[ângulo]} em ${lista === 'todas' ? 'todas as páginas' : `páginas ${lista}`} · ${formatarTamanho(r.bytes.length)}.`,
            linhas: [
              ['Páginas no PDF', número(r.total)],
              ['Páginas giradas', `${número(r.giradas.length)} (${lista})`],
              ['Giro aplicado', RÓTULO_DOS_ÂNGULOS[ângulo]],
              ['Páginas que ficaram como estavam', número(r.total - r.giradas.length)],
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
        const formulário = elemento.querySelector('#formulário');
        const resultado = elemento.querySelector('#resultado');
        const campoQuais = elemento.querySelector('#campo-quais');
        const campoPáginas = elemento.querySelector('#campo-páginas');
        const dicaDasPáginas = elemento.querySelector('#campo-páginas-dica');

        campoPáginas.setAttribute('autocapitalize', 'none');
        campoPáginas.setAttribute('spellcheck', 'false');

        marcador = criarMarcadorDePáginas({
          depoisDe: campoPáginas.closest('.campo'), entrada: campoPáginas, ordem: 'crescente',
        });

        /** O campo e o marcador de páginas só existem no modo "Páginas escolhidas". */
        const mostrarCampos = () => {
          const escolhidas = campoQuais.value === 'escolhidas';
          campoPáginas.closest('.campo').hidden = !escolhidas;
          marcador.mostrar(escolhidas);
        };
        mostrarCampos();

        escolha = prepararEscolhaDePdf(elemento, {
          aoMudar(pdf) {
            resultado.hidden = true;
            marcador.definirTotal(pdf?.total ?? 0);
            dicaDasPáginas.textContent = pdf ? `${DICA_DAS_PÁGINAS} Este PDF tem ${páginas(pdf.total)}.` : DICA_DAS_PÁGINAS;
          },
        });

        // Mudou o pedido: o resultado antigo não vale mais.
        for (const campo of elemento.querySelectorAll('#campo-ângulo, #campo-quais, #campo-páginas')) {
          campo.addEventListener('input', () => { resultado.hidden = true; });
        }
        campoQuais.addEventListener('change', mostrarCampos);
        // O reset nativo devolve o valor padrão depois do evento.
        formulário.addEventListener('reset', () => { setTimeout(mostrarCampos, 0); });
      },
    });
  },
};

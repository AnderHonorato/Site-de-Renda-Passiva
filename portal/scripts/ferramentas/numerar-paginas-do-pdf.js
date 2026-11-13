/** Números de página no PDF: escolher posição e formato e numerar, no próprio navegador. */
import { montarFerramenta, ErroDeEntrada, número as lerNúmero } from '../núcleo/montador.js';
import { baixarPdf, nomeDeArquivo } from '../núcleo/exportar.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { textoDePáginas, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../cálculos/pdf-páginas.js';
import {
  numerarPáginas, mensagemDeErroDeNumeração, MARGENS_MM, MODELOS, TAMANHO_MÍN, TAMANHO_MÁX, NÚMERO_MÁXIMO, LIMITE_DO_MODELO,
} from '../cálculos/numerar-paginas-do-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';

const número = (valor) => valor.toLocaleString('pt-BR');

/** Em que campo da tela cada recusa do cálculo aparece. */
function campoDoErro(erro, personalizado) {
  if (erro.startsWith('modelo_')) return personalizado ? 'personalizado' : 'texto';
  if (erro.startsWith('primeiro_') || erro === 'romano_estoura') return 'primeiro';
  if (erro.startsWith('faixa_')) return 'páginas';
  const direto = {
    tamanho_inválido: 'tamanho', texto_largo: 'tamanho', opacidade_inválida: 'opacidade', posição_inválida: 'posição',
    formato_inválido: 'formato', margem_inválida: 'margem', cor_inválida: 'cor', fonte_inválida: 'fonte',
  };
  return direto[erro] ?? 'arquivo';
}

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Escolha onde o número fica, o texto ("Página 3 de 10", só "3"…) e a numeração (1, 2, 3 ou i, ii, iii ou a, b, c).',
      'Se quiser numerar só algumas páginas, escreva quais em "Páginas a numerar", como 2-10 ou pares. Em branco, vale o PDF todo.',
      'Toque em "Numerar páginas" e baixe o PDF. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Uma apostila de 5 páginas, com o texto "Página {n} de {p}", embaixo e no centro, em letra tamanho 12: a página 3 sai com '
        + '"Página 3 de 5" centralizado, a 12 mm da borda de baixo. Com "Páginas a numerar" 2-4 e primeiro número 10, as páginas 2, 3 e 4 '
        + 'saem com "Página 10 de 5", "Página 11 de 5" e "Página 12 de 5": o {p} é sempre o total de páginas do PDF.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e ${LIMITE_DE_PÁGINAS.toLocaleString('pt-BR')} páginas. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser numerado. '
      + 'O número é desenhado com uma fonte padrão do PDF (Helvetica, Times ou Courier): letras com acento e a pontuação comum funcionam; '
      + 'setas, emojis e letras de outros alfabetos não. '
      + `Margem da borda até o número: ${MARGENS_MM.pequena} mm (pequena), ${MARGENS_MM.recomendada} mm (recomendada) ou ${MARGENS_MM.grande} mm (grande). `
      + 'O número entra por cima do conteúdo e não muda o resto da página; se a página já tiver algo no mesmo lugar, escolha outra posição ou uma margem maior. '
      + 'Em página girada (como um escaneamento de lado) o número acompanha a leitura. '
      + 'Assinaturas digitais do PDF deixam de valer depois de numerar, porque o arquivo muda. '
      + 'A numeração usa a biblioteca pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu PDF é enviado para algum servidor?',
        r: 'Não. A biblioteca que numera o PDF é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'Quero que o número comece na página 3 do PDF, valendo 1. Como faço?',
        r: 'Em "Páginas a numerar" escreva 3- (da 3 até o fim) e deixe o primeiro número em 1. A capa e a folha de rosto ficam sem número.',
      },
      {
        p: 'Por que "Página 10 de 5"?',
        r: 'O {p} é o total de páginas do PDF, e não o último número escrito. Se o primeiro número não for 1, prefira o texto só com {n}.',
      },
      {
        p: 'O número saiu em cima de um texto da página. E agora?',
        r: 'Escolha outro canto ou aumente a margem. Para imprimir frente e verso, use "Espelhar nas páginas pares": o número fica sempre do lado de fora.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;

    const opçõesDePosição = [];
    for (const [v, vertical] of [['cima', 'No topo'], ['meio', 'No meio'], ['baixo', 'Embaixo']]) {
      for (const [h, horizontal] of [['esquerda', 'à esquerda'], ['centro', 'no centro'], ['direita', 'à direita']]) {
        opçõesDePosição.push({ valor: `${v}-${h}`, rótulo: `${vertical}, ${horizontal}` });
      }
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Numerar páginas',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        { nome: 'posição', rótulo: 'Posição do número', tipo: 'seleção', padrão: 'baixo-centro', opções: opçõesDePosição },
        {
          nome: 'texto', rótulo: 'Texto', tipo: 'seleção', padrão: 'número',
          opções: [
            { valor: 'número', rótulo: 'Só o número (3)' },
            { valor: 'página', rótulo: 'Página 3' },
            { valor: 'página-de', rótulo: 'Página 3 de 10' },
            { valor: 'personalizado', rótulo: 'Personalizado' },
          ],
        },
        {
          nome: 'personalizado', rótulo: 'Texto personalizado', tipo: 'text', padrão: 'Página {n} de {p}',
          dica: '{n} é o número da página e {p}, o total de páginas do PDF.',
        },
        {
          nome: 'formato', rótulo: 'Numeração', tipo: 'seleção', padrão: 'arábico',
          opções: [
            { valor: 'arábico', rótulo: '1, 2, 3' },
            { valor: 'romano-minúsculo', rótulo: 'i, ii, iii' },
            { valor: 'romano-maiúsculo', rótulo: 'I, II, III' },
            { valor: 'letra-minúscula', rótulo: 'a, b, c' },
            { valor: 'letra-maiúscula', rótulo: 'A, B, C' },
          ],
        },
        {
          nome: 'páginas', rótulo: 'Páginas a numerar', tipo: 'text', exemplo: 'Todas',
          dica: 'Em branco, todas. Exemplos: 2-10, 1-3 5 8-, pares, ímpares.',
        },
        {
          nome: 'primeiro', rótulo: 'Primeiro número', tipo: 'número', padrão: '1',
          dica: 'O número que aparece na primeira página numerada.',
        },
        { nome: 'tamanho', rótulo: 'Tamanho da letra (pt)', tipo: 'número', padrão: '12', dica: `De ${TAMANHO_MÍN} a ${TAMANHO_MÁX}.` },
        {
          nome: 'fonte', rótulo: 'Fonte', tipo: 'seleção', padrão: 'helvetica',
          opções: [
            { valor: 'helvetica', rótulo: 'Helvetica (sem serifa)' },
            { valor: 'helvetica-negrito', rótulo: 'Helvetica negrito' },
            { valor: 'times', rótulo: 'Times (com serifa)' },
            { valor: 'courier', rótulo: 'Courier (máquina de escrever)' },
          ],
        },
        {
          nome: 'cor', rótulo: 'Cor', tipo: 'seleção', padrão: 'preto',
          opções: [
            { valor: 'preto', rótulo: 'Preto' }, { valor: 'cinza', rótulo: 'Cinza' }, { valor: 'azul', rótulo: 'Azul' },
            { valor: 'vermelho', rótulo: 'Vermelho' }, { valor: 'verde', rótulo: 'Verde' },
          ],
        },
        { nome: 'opacidade', rótulo: 'Opacidade (%)', tipo: 'número', padrão: '100', dica: 'De 1 a 100. Menos que 100 deixa o número mais discreto.' },
        {
          nome: 'margem', rótulo: 'Margem da borda', tipo: 'seleção', padrão: 'recomendada',
          opções: [
            { valor: 'pequena', rótulo: `Pequena (${MARGENS_MM.pequena} mm)` },
            { valor: 'recomendada', rótulo: `Recomendada (${MARGENS_MM.recomendada} mm)` },
            { valor: 'grande', rótulo: `Grande (${MARGENS_MM.grande} mm)` },
          ],
        },
        { nome: 'espelhar', rótulo: 'Espelhar nas páginas pares (frente e verso)', tipo: 'caixa', padrão: false },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        const personalizado = dados.texto === 'personalizado';
        const modelo = personalizado ? dados.personalizado ?? '' : MODELOS[dados.texto] ?? MODELOS.número;
        // Os números são lidos antes de abrir o PDF: erro de digitação não deve custar a leitura de 100 MB.
        const primeiro = lerNúmero(dados, 'primeiro', { rótulo: 'Primeiro número', inteiro: true, mín: 0, máx: NÚMERO_MÁXIMO });
        const tamanho = lerNúmero(dados, 'tamanho', { rótulo: 'Tamanho da letra', mín: TAMANHO_MÍN, máx: TAMANHO_MÁX });
        const opacidade = lerNúmero(dados, 'opacidade', { rótulo: 'Opacidade', mín: 1, máx: 100 });

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(undefined, 'Preparando o leitor de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }

          progresso.andar(undefined, 'Lendo o arquivo…');
          const { nome, arquivo } = itens[0];
          const bytes = new Uint8Array(await arquivo.arrayBuffer());

          progresso.andar(undefined, 'Abrindo o PDF…');
          const r = await numerarPáginas({ nome, bytes }, {
            biblioteca, posição: dados.posição, formato: dados.formato, modelo, primeiro, páginas: dados.páginas ?? '',
            fonte: dados.fonte, tamanho, cor: dados.cor, opacidade, margem: dados.margem, espelhar: dados.espelhar === 'sim',
            cancelado: execução.cancelado,
            aoProgredir: ({ página, total }) => progresso.andar(100 * página / total, `Página ${número(página)} de ${número(total)}`),
          });

          if (!r.ok) {
            // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            throw new ErroDeEntrada(mensagemDeErroDeNumeração(r.erro, { nome, ...r.extras }), campoDoErro(r.erro, personalizado));
          }

          const amostra = r.numeradas.slice(0, 3).map((n) => [`Página ${n.página} do PDF`, n.texto]);
          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const observações = ['O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.'];
          if (r.avisos.includes('total_do_documento')) {
            observações.unshift(`O {p} do texto é o total de páginas do PDF (${número(r.páginas)}), mesmo numerando só algumas páginas ou começando em outro número.`);
          }
          return {
            valor: `${textoDePáginas(r.numeradas.length)} ${r.numeradas.length === 1 ? 'numerada' : 'numeradas'}`,
            resumo: `${nome}: ${textoDePáginas(r.páginas)} no total · ${formatarTamanho(r.bytes.length)}.`,
            linhas: amostra.concat(r.numeradas.length > 3 ? [['…', `e mais ${número(r.numeradas.length - 3)}`]] : []),
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${base}-numerado`) }],
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

        // O campo do texto próprio só aparece quando "Personalizado" está escolhido.
        const modelo = elemento.querySelector('#campo-texto');
        const campoPersonalizado = elemento.querySelector('[data-campo="personalizado"]');
        const atualizar = () => { campoPersonalizado.hidden = modelo.value !== 'personalizado'; };
        modelo.addEventListener('change', atualizar);
        elemento.querySelector('#formulário').addEventListener('reset', () => setTimeout(atualizar, 0));
        elemento.querySelector('#campo-personalizado').maxLength = LIMITE_DO_MODELO;
        atualizar();
      },
    });
  },
};

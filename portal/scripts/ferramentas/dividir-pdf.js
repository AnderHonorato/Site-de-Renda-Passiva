/** Dividir PDF: separa um PDF em vários, por intervalos ou a cada N páginas, tudo no navegador. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { baixar, baixarPdf } from '../núcleo/exportar.js';
import { criarProgresso } from '../núcleo/interface.js';
import { ícone } from '../núcleo/ícones.js';
import {
  planejarDivisão, dividirPdf, montarZipDasPartes, nomesDasPartes,
  LIMITE_DE_ARQUIVOS_DE_SAÍDA, LIMITE_TOTAL_DE_SAÍDA, PARTES_COM_BOTÃO_PRÓPRIO,
} from '../cálculos/dividir-pdf.js';
import {
  páginas, formatarTamanho, condensarPáginas, mensagemDeErro, nomeBase, folga, LIMITE_DE_PÁGINAS, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../cálculos/páginas-do-pdf.js';
import { prepararEscolhaDePdf, carregarBiblioteca, ERRO_DA_BIBLIOTECA } from './auxiliares/escolher-pdf.js';

const número = (valor) => valor.toLocaleString('pt-BR');
const arquivos = (quantidade) => `${número(quantidade)} ${quantidade === 1 ? 'arquivo' : 'arquivos'}`;
const LINHAS_NA_TABELA = 50;

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor.',
      'Escolha como dividir. "Por intervalos": cada intervalo vira um arquivo (por exemplo 1-3, 4-10). "A cada N páginas": todos os arquivos têm N páginas, e o último fica com o que sobrar.',
      'Toque em "Dividir PDF" e acompanhe o progresso. Se estiver demorando, dá para cancelar.',
      'Baixe tudo num arquivo ZIP, ou, quando são poucos arquivos, um por vez. O PDF original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um PDF de 10 páginas com o contrato (páginas 1 a 3) e os anexos (4 a 10). Em "Por intervalos", digitando 1-3, 4-10, saem dois arquivos: '
        + 'um de 3 páginas e um de 7. Em "A cada N páginas" com N = 4, saem três arquivos, de 4, 4 e 2 páginas. Com N = 1, sai um arquivo por página.',
    },
    limites: `Um PDF por vez, com até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)} e até ${número(LIMITE_DE_PÁGINAS)} páginas, e no máximo ${número(LIMITE_DE_ARQUIVOS_DE_SAÍDA)} arquivos de saída. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser dividido. '
      + 'Intervalos podem se sobrepor (a página aparece nos dois arquivos) e podem deixar páginas de fora; a tela avisa nos dois casos. '
      + 'Intervalo de trás para frente (8-3) e páginas além do fim do PDF são recusados, com a explicação do que corrigir. '
      + 'Cada parte é um PDF completo: fontes e imagens usadas em várias páginas são copiadas em cada parte que as usa, '
      + `então a soma das partes pode ficar maior que o original (o limite da soma é ${formatarTamanho(LIMITE_TOTAL_DE_SAÍDA)}). `
      + 'Marcadores (sumário) e campos de formulário do original podem não ser mantidos. O ZIP vem sem compressão, porque o PDF já é comprimido. '
      + 'A cópia usa a biblioteca pdf-lib (licença MIT), que roda dentro da página. Não há divisão por tamanho do arquivo.',
    perguntas: [
      {
        p: 'Meus arquivos são enviados para algum servidor?',
        r: 'Não. A biblioteca que corta o PDF é baixada com a página e roda no seu navegador; os arquivos, inclusive o ZIP, são montados no seu aparelho.',
      },
      {
        p: 'Quero um arquivo para cada página. Como faço?',
        r: 'Escolha "A cada N páginas" e use N = 1. Você recebe um ZIP com um PDF por página, com o número da página no nome.',
      },
      {
        p: 'O que acontece com as páginas que ficam fora dos intervalos?',
        r: 'Elas não entram em nenhum arquivo. A tela mostra quais páginas ficaram de fora, para você conferir se foi de propósito.',
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
    let botãoDividir;
    let botãoCancelar;
    let cancelar = false;

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Dividir PDF',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele não sai do seu aparelho.`,
        },
        {
          nome: 'modo', rótulo: 'Como dividir', tipo: 'seleção', padrão: 'intervalos',
          opções: [
            { valor: 'intervalos', rótulo: 'Por intervalos (um arquivo por intervalo)' },
            { valor: 'a-cada', rótulo: 'A cada N páginas' },
          ],
        },
        {
          nome: 'intervalos', rótulo: 'Intervalos', tipo: 'text', exemplo: '1-3, 4-10',
          dica: 'Cada intervalo vira um arquivo. Separe por vírgula; uma página sozinha também vale (7).',
        },
        {
          nome: 'tamanho', rótulo: 'Páginas por arquivo', tipo: 'número', exemplo: '4', padrão: '1',
          dica: 'Todos os arquivos terão este número de páginas, menos o último, que fica com o que sobrar. Use 1 para uma página por arquivo.',
        },
      ],

      async calcular(dados) {
        const pdf = escolha.atual();
        if (!pdf) throw new ErroDeEntrada(mensagemDeErro('sem_arquivo'), 'arquivo');

        const plano = planejarDivisão(pdf.total, { modo: dados.modo, intervalos: dados.intervalos, tamanho: dados.tamanho });
        if (!plano.ok) throw new ErroDeEntrada(plano.mensagem, plano.campo);

        cancelar = false;
        botãoDividir.disabled = true;
        botãoCancelar.hidden = false;
        escolha.travar(true);
        try {
          progresso.andar(undefined, 'Preparando o leitor de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DA_BIBLIOTECA);
          }

          const r = await dividirPdf(pdf, plano.partes, {
            biblioteca,
            cancelado: () => cancelar,
            aoProgredir: ({ parte, partes }) => progresso.andar(undefined, `Gerando arquivo ${número(parte)} de ${número(partes)}…`),
          });
          // Cancelar não é engano de ninguém: vira aviso, não erro no campo.
          if (!r.ok) {
            const erro = new Error(r.mensagem);
            if (r.erro === 'cancelado') erro.cancelado = true;
            throw erro;
          }

          progresso.andar(undefined, 'Reunindo os arquivos…');
          await folga();
          const base = nomeBase(pdf.nome);
          const vários = r.arquivos.length > 1;
          const zip = vários ? montarZipDasPartes(r.arquivos) : null;

          const botões = [];
          if (vários) {
            botões.push({
              rótulo: `Baixar tudo (ZIP, ${arquivos(r.arquivos.length)})`, ícone: 'baixar',
              gerar: () => baixar(zip, `${base}-dividido.zip`, 'application/zip'),
            });
          }
          if (r.arquivos.length <= PARTES_COM_BOTÃO_PRÓPRIO) {
            for (const arquivo of r.arquivos) {
              botões.push({
                rótulo: vários ? `Baixar ${arquivo.nome}` : 'Baixar PDF', ícone: 'documento',
                gerar: () => baixarPdf(arquivo.bytes, arquivo.nome.replace(/\.pdf$/, '')),
              });
            }
          }

          const observações = ['Os arquivos foram lidos no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.'];
          if (plano.fora.length) {
            observações.push(`Ficaram de fora, sem entrar em nenhum arquivo: páginas ${condensarPáginas(plano.fora)}. Se não foi de propósito, ajuste os intervalos e divida de novo.`);
          }
          if (plano.sobrepostas) {
            observações.push('Alguns intervalos se sobrepõem: as páginas em comum aparecem em mais de um arquivo.');
          }
          if (dados.modo === 'a-cada' && plano.partes.length === 1) {
            observações.push('O número de páginas por arquivo é igual ou maior que o total: saiu um único arquivo, com todas as páginas.');
          }
          if (r.arquivos.length > LINHAS_NA_TABELA) {
            observações.push(`A lista mostra os ${LINHAS_NA_TABELA} primeiros arquivos; o ZIP traz todos.`);
          }
          if (r.arquivos.length > PARTES_COM_BOTÃO_PRÓPRIO) {
            observações.push('Com muitos arquivos, o download é só pelo ZIP, para o navegador não pedir permissão para dezenas de downloads.');
          }

          return {
            valor: vários ? `${arquivos(r.arquivos.length)} prontos` : 'Um arquivo pronto',
            resumo: `${páginas(pdf.total)} divididas em ${arquivos(r.arquivos.length)} · ${formatarTamanho(r.bytesTotais)} no total.`,
            tabela: {
              cabeçalho: ['Arquivo', 'Páginas', 'Tamanho'],
              linhas: r.arquivos.slice(0, LINHAS_NA_TABELA).map((a) => [a.nome, número(a.páginas), formatarTamanho(a.bytes.length)]),
              semExportação: true,
            },
            arquivos: botões,
            observações,
          };
        } finally {
          botãoDividir.disabled = false;
          botãoCancelar.hidden = true;
          escolha.travar(false);
        }
      },

      aoMontar(elemento) {
        const formulário = elemento.querySelector('#formulário');
        progresso = criarProgresso(elemento.querySelector('#progresso'));
        botãoDividir = formulário.querySelector('button[type="submit"]');
        const resultado = elemento.querySelector('#resultado');
        const campoModo = elemento.querySelector('#campo-modo');
        const campoIntervalos = elemento.querySelector('#campo-intervalos');
        const campoTamanho = elemento.querySelector('#campo-tamanho');
        const dicaDosIntervalos = elemento.querySelector('#campo-intervalos-dica');
        const DICA_DOS_INTERVALOS = dicaDosIntervalos.textContent;

        campoIntervalos.setAttribute('autocapitalize', 'none');
        campoIntervalos.setAttribute('spellcheck', 'false');
        campoTamanho.inputMode = 'numeric';

        botãoCancelar = document.createElement('button');
        botãoCancelar.type = 'button';
        botãoCancelar.className = 'botão botão--linha';
        botãoCancelar.hidden = true;
        botãoCancelar.innerHTML = `${ícone('fechar')}Cancelar`;
        botãoCancelar.addEventListener('click', () => { cancelar = true; });
        formulário.querySelector('.ações').append(botãoCancelar);

        /** Só o campo do modo escolhido aparece; o outro sai da tela e do caminho do teclado. */
        const mostrarCampos = () => {
          const porIntervalos = campoModo.value === 'intervalos';
          campoIntervalos.closest('.campo').hidden = !porIntervalos;
          campoTamanho.closest('.campo').hidden = porIntervalos;
        };
        mostrarCampos();

        escolha = prepararEscolhaDePdf(elemento, {
          aoMudar(pdf) {
            resultado.hidden = true;
            dicaDosIntervalos.textContent = pdf ? `${DICA_DOS_INTERVALOS} Este PDF tem ${páginas(pdf.total)}.` : DICA_DOS_INTERVALOS;
          },
        });

        // Mudou o pedido: o resultado antigo não vale mais.
        for (const campo of [campoModo, campoIntervalos, campoTamanho]) {
          campo.addEventListener('input', () => { resultado.hidden = true; });
        }
        campoModo.addEventListener('change', mostrarCampos);
        formulário.addEventListener('reset', () => {
          cancelar = true;
          // O reset nativo devolve o valor padrão depois do evento.
          setTimeout(mostrarCampos, 0);
        });
      },
    });
  },
};

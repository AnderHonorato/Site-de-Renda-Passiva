/** Contador de texto: caracteres, palavras, frases, tempo de leitura e limites comuns. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import {
  contarTexto, formatarDuração, medirSms, situaçãoNoLimite, LIMITES_DE_DESTINO,
  PALAVRAS_POR_MINUTO_DE_LEITURA, PALAVRAS_POR_MINUTO_DE_FALA,
} from '../cálculos/textos.js';
import { ligarTextoAoVivo } from './auxiliares/texto-ao-vivo.js';

/** Acima disso a contagem ao vivo começa a pesar no celular. */
export const LIMITE_DE_CARACTERES = 200000;

/** Recado do exemplo de "Como usar", o mesmo do Ander Flow. */
export const TEXTO_DE_EXEMPLO = 'Bom dia! Segue o orçamento do serviço que conversamos.\n\n'
  + 'O valor inclui material e mão de obra, com prazo de sete dias úteis para começar. '
  + 'Qualquer dúvida, é só responder esta mensagem.';

const número = (valor) => valor.toLocaleString('pt-BR');
const plural = (quantidade, singular, plural_) => `${número(quantidade)} ${quantidade === 1 ? singular : plural_}`;

/** Situação num limite, em palavras: "restam 12" ou "passou 3". */
function descreverLimite(caracteres, máximo) {
  const { cabe, restam, passou } = situaçãoNoLimite(caracteres, máximo);
  return cabe ? `cabe, restam ${número(restam)}` : `passou ${número(passou)}`;
}

/** Linha do SMS, que depende de o texto caber no alfabeto de 7 bits. */
function linhaDoSms(texto) {
  const sms = medirSms(texto);
  const limite = sms.codificação === 'gsm' ? '160' : '70 (tem acento ou emoji)';
  const situação = sms.partes <= 1
    ? `cabe em 1 SMS, restam ${número(sms.limite - sms.usados)}`
    : `vira ${número(sms.partes)} SMS emendados`;
  return ['SMS', limite, situação];
}

export default {
  instruções: {
    passos: [
      'Cole ou escreva o texto na caixa. A contagem acompanha a digitação, sem precisar apertar nada.',
      'Use os caracteres sem espaço quando o limite for de sistema, e as palavras quando for de leitura.',
      'Confira na tabela se o texto cabe no post, no SMS, na descrição ou no título de página.',
      'Toque em Copiar para levar a contagem para outro lugar.',
    ],
    exemplo: {
      // Os números abaixo são conferidos contra TEXTO_DE_EXEMPLO no teste da ferramenta.
      texto: `Colando o recado "${TEXTO_DE_EXEMPLO.replace('\n\n', '" e, depois de uma linha em branco, "')}", `
        + 'a contagem dá 32 palavras, 184 caracteres, 4 frases e 2 parágrafos, com 0:10 de leitura e 0:15 de fala. '
        + 'Como tem acento, no SMS o limite cai para 70 caracteres e o recado vira 3 mensagens emendadas.',
    },
    limites: `Até ${número(LIMITE_DE_CARACTERES)} caracteres. A contagem segue o que a pessoa vê na tela: letra acentuada e emoji `
      + `contam como um caractere. O tempo de leitura usa a média de ${PALAVRAS_POR_MINUTO_DE_LEITURA} palavras por minuto e o de fala, `
      + `${PALAVRAS_POR_MINUTO_DE_FALA}; é estimativa, não medição. Os limites de título e descrição são a referência de corte `
      + 'na busca do Google, que na verdade mede em pixels. O texto fica só na memória desta página: não é enviado nem guardado.',
    perguntas: [
      {
        p: 'Emoji conta como quantos caracteres?',
        r: 'Como um. A contagem segue o que aparece na tela, e não o número de códigos internos: um emoji de família, que é composto por vários, conta como um só. '
          + 'Alguns sistemas contam diferente (o X conta emoji como dois e todo link como 23), então confira no destino quando estiver no limite.',
      },
      {
        p: 'Por que o limite do SMS muda para 70?',
        r: 'Uma mensagem leva 160 caracteres do alfabeto básico do SMS. Letras como ã, õ, ç, á e í, e qualquer emoji, ficam fora dele e obrigam outra codificação, '
          + 'em que cabem só 70. Passando do limite, o celular emenda partes de 153 (ou 67) caracteres.',
      },
      {
        p: 'O texto fica guardado em algum lugar?',
        r: 'Não. Esta ferramenta não guarda rascunho: quando você fecha ou recarrega a página, o texto some.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Contar',
      campos: [
        { nome: 'texto', rótulo: 'Seu texto', tipo: 'área', linhas: 10, exemplo: 'Cole ou escreva aqui' },
      ],
      calcular(dados) {
        // Sem aparar: espaço e quebra de linha nas pontas também são caracteres.
        const conteúdo = String(dados.texto ?? '');
        if (!conteúdo.trim()) throw new ErroDeEntrada('Cole ou escreva um texto para contar.', 'texto');
        if (conteúdo.length > LIMITE_DE_CARACTERES) {
          throw new ErroDeEntrada(`O texto passou de ${número(LIMITE_DE_CARACTERES)} caracteres. Divida em partes menores.`, 'texto');
        }

        const c = contarTexto(conteúdo);
        const leitura = formatarDuração(c.segundosDeLeitura);
        const fala = formatarDuração(c.segundosDeFala);

        const linhas = [
          ['Caracteres', número(c.caracteres)],
          ['Caracteres sem espaço', número(c.caracteresSemEspaço)],
          ['Frases', número(c.frases)],
          ['Parágrafos', número(c.parágrafos)],
          ['Linhas', número(c.linhas)],
          ['Média de palavras por frase', c.palavrasPorFrase.toLocaleString('pt-BR')],
          ['Tempo de leitura', leitura],
          ['Tempo de fala', fala],
        ];

        return {
          valor: plural(c.palavras, 'palavra', 'palavras'),
          resumo: `${plural(c.caracteres, 'caractere', 'caracteres')} · leitura de ${leitura} · fala de ${fala} (minutos:segundos).`,
          linhas,
          tabela: {
            cabeçalho: ['Destino', 'Limite', 'Situação'],
            linhas: [
              [LIMITES_DE_DESTINO[0].nome, número(LIMITES_DE_DESTINO[0].máximo), descreverLimite(c.caracteres, LIMITES_DE_DESTINO[0].máximo)],
              linhaDoSms(conteúdo),
              ...LIMITES_DE_DESTINO.slice(1)
                .map((l) => [l.nome, número(l.máximo), descreverLimite(c.caracteres, l.máximo)]),
            ],
            semExportação: true,
          },
          texto: [['Palavras', número(c.palavras)], ...linhas].map(([r, v]) => `${r}: ${v}`).join('\n'),
          observações: [
            `Tempo estimado com ${PALAVRAS_POR_MINUTO_DE_LEITURA} palavras por minuto na leitura e ${PALAVRAS_POR_MINUTO_DE_FALA} na fala.`,
          ],
        };
      },
      aoMontar(elemento, recalcular) {
        ligarTextoAoVivo(elemento, recalcular, { campo: 'texto' });
      },
    });
  },
};

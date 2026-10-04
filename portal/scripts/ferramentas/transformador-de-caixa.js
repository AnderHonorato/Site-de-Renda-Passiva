/** Maiúsculas e minúsculas: MAIÚSCULAS, minúsculas, Cada Palavra e Frase normal. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { transformarCaixa, estáTodoEmMaiúsculas, contarCaracteres, préviaDoTexto, MODOS_DE_CAIXA } from '../cálculos/textos.js';
import { ligarTextoAoVivo } from './auxiliares/texto-ao-vivo.js';

/** Limite da especificação do Ander Flow para as ferramentas de transformar texto. */
export const LIMITE_DE_CARACTERES = 50000;

/** Quanto do resultado aparece na tela; Copiar e Baixar levam o texto inteiro. */
export const TAMANHO_DA_PRÉVIA = 200;

const número = (valor) => valor.toLocaleString('pt-BR');

export default {
  instruções: {
    passos: [
      'Cole ou digite o texto no campo.',
      'Escolha o formato: MAIÚSCULAS, minúsculas, Cada Palavra ou Frase normal. O resultado acompanha a digitação.',
      'Marque "Manter siglas" quando o texto tiver CPF, ONU, RG e afins que precisam continuar em maiúsculas.',
      'Copie o resultado ou baixe como arquivo de texto.',
    ],
    exemplo: {
      texto: 'Um nome digitado como "MARIA DA silva SOUZA" vira "Maria Da Silva Souza" no formato Cada Palavra, '
        + 'e "SÃO PAULO" vira "são paulo" em minúsculas. Os acentos continuam no lugar: só a caixa das letras muda.',
    },
    limites: `Até ${número(LIMITE_DE_CARACTERES)} caracteres. A conversão segue as regras do português (à vira À). `
      + 'Cada Palavra põe maiúscula na primeira letra depois de cada espaço ou quebra de linha, inclusive em "da" e "de". '
      + 'Frase normal põe maiúscula só no começo do texto e depois de ponto final, exclamação ou interrogação seguidos de espaço. '
      + 'Com "Manter siglas", palavras inteiras em maiúsculas com duas letras ou mais ficam como estão. '
      + 'O texto não sai do seu navegador.',
    perguntas: [
      { p: 'Os acentos são mantidos?', r: 'Sim, só a caixa das letras muda. Para tirar os acentos, use a ferramenta Remover acentos.' },
      {
        p: 'Como funciona a Frase normal?',
        r: 'O texto fica em minúsculas e só a primeira letra de cada frase vira maiúscula. Nomes próprios no meio da frase ficam em minúsculas: revise antes de usar.',
      },
      {
        p: 'Por que "Manter siglas" não fez efeito?',
        r: 'Quando o texto inteiro está em maiúsculas não dá para distinguir sigla de palavra comum, então a opção é ignorada e o aviso aparece junto do resultado. '
          + 'Ela também preserva nomes escritos todos em maiúsculas no meio de um texto normal, porque eles têm a mesma cara de sigla.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter',
      campos: [
        { nome: 'texto', rótulo: 'Texto', tipo: 'área', linhas: 8, exemplo: 'Cole ou digite o texto aqui' },
        {
          nome: 'modo', rótulo: 'Formato', tipo: 'seleção', padrão: 'maiúsculas',
          opções: Object.entries(MODOS_DE_CAIXA).map(([valor, rótulo]) => ({ valor, rótulo })),
        },
        { nome: 'manterSiglas', rótulo: 'Manter siglas como estão (CPF, ONU)', tipo: 'caixa' },
      ],
      calcular(dados) {
        const conteúdo = String(dados.texto ?? '');
        if (!conteúdo.trim()) throw new ErroDeEntrada('Cole ou digite o texto que você quer converter.', 'texto');
        if (conteúdo.length > LIMITE_DE_CARACTERES) {
          throw new ErroDeEntrada(`O texto passou de ${número(LIMITE_DE_CARACTERES)} caracteres. Divida em partes menores.`, 'texto');
        }

        const modo = Object.hasOwn(MODOS_DE_CAIXA, dados.modo) ? dados.modo : 'maiúsculas';
        const pediuSiglas = dados.manterSiglas === 'sim' && modo !== 'maiúsculas';
        const siglasIgnoradas = pediuSiglas && estáTodoEmMaiúsculas(conteúdo);
        const saída = transformarCaixa(conteúdo, modo, { manterSiglas: pediuSiglas && !siglasIgnoradas });
        const prévia = préviaDoTexto(saída, TAMANHO_DA_PRÉVIA);
        const encurtado = prévia !== saída;

        const observações = [];
        if (encurtado) observações.push('A tela mostra o começo do resultado. Copiar e Baixar levam o texto inteiro.');
        if (siglasIgnoradas) {
          observações.push('O texto inteiro estava em maiúsculas, então não dá para separar siglas de palavras comuns: "Manter siglas" foi ignorado.');
        }
        if (saída === conteúdo) observações.push('O texto já estava neste formato: nada mudou.');

        return {
          valor: prévia,
          resumo: `${MODOS_DE_CAIXA[modo]} · ${número(contarCaracteres(saída))} caracteres.`,
          texto: saída,
          arquivos: [{
            rótulo: 'Baixar .txt',
            gerar: () => baixar(saída, `${nomeDeArquivo('texto-convertido')}.txt`, 'text/plain;charset=utf-8'),
          }],
          observações,
        };
      },
      aoMontar(elemento, recalcular) {
        ligarTextoAoVivo(elemento, recalcular, { campo: 'texto', opções: ['modo', 'manterSiglas'] });
      },
    });
  },
};

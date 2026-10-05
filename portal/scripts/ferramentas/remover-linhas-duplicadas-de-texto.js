/** Remover linhas duplicadas: deixa uma só ocorrência de cada linha da lista, mantendo a primeira. */
import { montarFerramenta, comCampo, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { préviaDoTexto } from '../cálculos/textos.js';
import {
  removerLinhasDuplicadas, LIMITE_DE_CARACTERES, LIMITE_DE_LINHAS,
} from '../cálculos/remover-linhas-duplicadas-de-texto.js';
import { ligarTextoAoVivo } from './auxiliares/texto-ao-vivo.js';

export { LIMITE_DE_CARACTERES, LIMITE_DE_LINHAS };

/** Quantas linhas da lista aparecem na tela; Copiar e Baixar levam a lista inteira. */
export const LINHAS_NA_TELA = 50;

/** Tamanho máximo de uma linha na tela, para uma linha enorme não esticar o quadro. */
export const TAMANHO_DA_LINHA_NA_TELA = 120;

const número = (valor) => valor.toLocaleString('pt-BR');
const plural = (quantidade, singular, outro) => (quantidade === 1 ? singular : outro);

export default {
  instruções: {
    passos: [
      'Cole a lista no campo, uma linha por item. O resultado acompanha a digitação.',
      'Escolha como comparar: "Maçã" e "maçã" contam como a mesma linha? Espaços no começo e no fim contam? As linhas vazias devem ficar todas?',
      'Confira a lista e quantas linhas saíram. A tela mostra as primeiras linhas, com quantas vezes cada uma apareceu.',
      'Copie a lista sem repetições ou baixe como arquivo de texto.',
    ],
    exemplo: {
      texto: 'A lista "banana, Maçã, banana, Uva, maçã" (uma por linha) fica "banana, Maçã, Uva", com 2 linhas removidas: '
        + 'a segunda "banana" e a "maçã" escrita em minúscula. A linha que fica é sempre a primeira, do jeito que você a escreveu. '
        + 'Desmarcando "Ignorar maiúsculas", só a segunda "banana" sai e a "maçã" minúscula continua na lista.',
    },
    limites: `Até ${número(LIMITE_DE_CARACTERES)} caracteres e ${número(LIMITE_DE_LINHAS)} linhas. `
      + 'Cada linha que fica é a original, sem trocar maiúsculas nem espaços; só a comparação ignora essas diferenças. '
      + 'Linhas com letras acentuadas iguais na tela são tratadas como iguais, mesmo que o acento tenha sido digitado separado da letra. '
      + 'Acento, porém, conta: "cafe" e "café" são linhas diferentes. '
      + 'Uma linha só com espaços só é considerada vazia quando "Ignorar espaços" está marcado. '
      + 'A quebra de linha no fim do texto não vira uma linha vazia. As quebras do resultado são sempre simples. '
      + 'O texto não sai do seu navegador.',
    perguntas: [
      {
        p: 'Qual das linhas repetidas fica?',
        r: 'A primeira. Se "Maçã" aparece antes de "maçã", a lista fica com "Maçã". As seguintes saem, mesmo que estejam escritas de outro jeito.',
      },
      {
        p: 'Por que sumiram linhas vazias da minha lista?',
        r: 'Com a opção "Manter todas as linhas vazias" desmarcada, a segunda linha vazia em diante conta como repetição da primeira. '
          + 'Marque a opção para não mexer em nenhuma linha vazia, por exemplo para preservar a separação entre blocos.',
      },
      {
        p: 'A ordem da lista muda?',
        r: 'Não. As linhas que ficam seguem a ordem em que apareceram. Esta ferramenta só tira repetições, não ordena.',
      },
      { p: 'A lista que eu colo é guardada?', r: 'Não. A comparação acontece no seu navegador e o texto não é enviado nem guardado.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Remover repetidas',
      campos: [
        {
          nome: 'texto', rótulo: 'Lista (uma linha por item)', tipo: 'área', linhas: 8,
          exemplo: 'Cole a lista aqui, uma linha por item',
        },
        { nome: 'ignorarMaiúsculas', rótulo: 'Ignorar maiúsculas e minúsculas ("Maçã" = "maçã")', tipo: 'caixa', padrão: true },
        { nome: 'ignorarEspaçosNasBordas', rótulo: 'Ignorar espaços no começo e no fim da linha', tipo: 'caixa', padrão: true },
        { nome: 'ignorarLinhasVazias', rótulo: 'Manter todas as linhas vazias', tipo: 'caixa' },
      ],
      calcular(dados) {
        const conteúdo = String(dados.texto ?? '');
        if (!conteúdo.trim()) throw new ErroDeEntrada('Cole a lista de que você quer tirar as linhas repetidas.', 'texto');

        const opções = {
          ignorarMaiúsculas: dados.ignorarMaiúsculas !== 'não',
          ignorarEspaçosNasBordas: dados.ignorarEspaçosNasBordas !== 'não',
          ignorarLinhasVazias: dados.ignorarLinhasVazias === 'sim',
        };
        const r = comCampo('texto', () => removerLinhasDuplicadas(conteúdo, opções));

        const observações = [];
        if (r.linhasRemovidas === 0) observações.push('Nenhuma linha se repetia: a lista saiu igual.');
        if (r.vaziasRemovidas > 0) {
          observações.push(`${número(r.vaziasRemovidas)} ${plural(r.vaziasRemovidas, 'linha vazia saiu', 'linhas vazias saíram')} junto. `
            + 'Marque "Manter todas as linhas vazias" para preservá-las.');
        }
        if (r.mantidas.length > LINHAS_NA_TELA) {
          observações.push(`A tela mostra as primeiras ${número(LINHAS_NA_TELA)} linhas da lista. Copiar e Baixar levam a lista inteira.`);
        }

        const naTela = r.mantidas.slice(0, LINHAS_NA_TELA).map(({ linha, vezes }) => [
          linha.trim() === '' ? '(linha vazia)' : préviaDoTexto(linha, TAMANHO_DA_LINHA_NA_TELA),
          vezes,
        ]);

        return {
          valor: r.linhasRemovidas === 0
            ? 'Nenhuma linha repetida'
            : `${número(r.linhasRemovidas)} ${plural(r.linhasRemovidas, 'linha repetida removida', 'linhas repetidas removidas')}`,
          resumo: `A lista tinha ${número(r.linhasNaEntrada)} ${plural(r.linhasNaEntrada, 'linha', 'linhas')}`
            + ` e ficou com ${número(r.linhasNaSaída)}.`,
          linhas: [
            ['Linhas na entrada', número(r.linhasNaEntrada)],
            ['Linhas na saída', número(r.linhasNaSaída)],
            ['Linhas removidas', número(r.linhasRemovidas)],
          ],
          tabela: { cabeçalho: ['Linha', 'Vezes'], linhas: naTela, semExportação: true },
          texto: r.texto,
          arquivos: [{
            rótulo: 'Baixar .txt',
            gerar: () => baixar(r.texto, `${nomeDeArquivo('lista-sem-repeticoes')}.txt`, 'text/plain;charset=utf-8'),
          }],
          observações,
        };
      },
      aoMontar(elemento, recalcular) {
        ligarTextoAoVivo(elemento, recalcular, {
          campo: 'texto',
          opções: ['ignorarMaiúsculas', 'ignorarEspaçosNasBordas', 'ignorarLinhasVazias'],
        });
      },
    });
  },
};

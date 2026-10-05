/** Limpeza de texto: espaços repetidos, linhas vazias em excesso e quebras de linha soltas. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { limparTexto } from '../cálculos/limpador-de-texto.js';
import { préviaDoTexto } from '../cálculos/textos.js';
import { ligarTextoAoVivo } from './auxiliares/texto-ao-vivo.js';

/** Limite da especificação do Ander Flow para a limpeza de texto. */
export const LIMITE_DE_CARACTERES = 200000;

/** Começo do resultado usado só quando a caixa de texto não puder ser montada. */
export const TAMANHO_DA_PRÉVIA = 200;

const número = (valor) => valor.toLocaleString('pt-BR');

/** Os marcadores, na ordem da tela, com o nome que a função de cálculo usa. */
const MARCADORES = [
  { nome: 'aparar', rótulo: 'Tirar espaços do começo e do fim das linhas', padrão: true },
  { nome: 'espaçosDuplos', rótulo: 'Trocar espaços repetidos por um só', padrão: true },
  { nome: 'linhasVazias', rótulo: 'Juntar linhas vazias seguidas em uma só', padrão: true },
  { nome: 'quebrasSoltas', rótulo: 'Juntar linhas partidas no meio da frase', padrão: false },
];

/**
 * O resultado padrão do montador é uma linha de destaque que perde as quebras
 * de linha, e aqui elas são o assunto. Troca esse destaque por uma caixa de
 * texto só de leitura com o texto limpo inteiro, no mesmo lugar do resultado.
 * Se a troca não acontecer, a prévia do destaque continua valendo.
 * @param {HTMLElement} raiz
 * @param {() => string} textoAtual
 */
function mostrarResultadoEmCaixa(raiz, textoAtual) {
  const resultado = raiz.querySelector('#resultado');
  if (!resultado) return;
  new MutationObserver(() => {
    const destaque = resultado.querySelector('.resultado__valor');
    if (!destaque) return;
    const campo = document.createElement('div');
    campo.className = 'campo';
    const rótulo = document.createElement('label');
    rótulo.htmlFor = 'texto-limpo';
    rótulo.textContent = 'Texto limpo';
    const área = document.createElement('textarea');
    área.id = 'texto-limpo';
    área.readOnly = true;
    área.rows = 8;
    área.value = textoAtual();
    campo.append(rótulo, área);
    destaque.replaceWith(campo);
  }).observe(resultado, { childList: true });
}

export default {
  instruções: {
    passos: [
      'Cole ou digite o texto no campo. O texto limpo acompanha a digitação.',
      'Confira as opções: espaços do começo e do fim, espaços repetidos e linhas vazias seguidas já vêm marcados. Marque "Juntar linhas partidas no meio da frase" para texto copiado de PDF.',
      'Copie o texto limpo ou baixe como arquivo de texto.',
    ],
    exemplo: {
      texto: 'O texto "Olá   mundo", seguido de várias linhas vazias e de "Tudo bem?", vira "Olá mundo", uma linha vazia e "Tudo bem?". '
        + 'Já "Isto é uma frase" numa linha e "que continua na linha de baixo." na seguinte, com a opção de juntar linhas marcada, '
        + 'viram uma frase só: "Isto é uma frase que continua na linha de baixo."',
    },
    limites: `Até ${número(LIMITE_DE_CARACTERES)} caracteres. Os parágrafos de verdade, separados por linha vazia, são mantidos: várias linhas vazias seguidas viram uma só, nunca nenhuma. `
      + 'Ao juntar linhas, uma linha só continua na seguinte se não terminar em ponto, exclamação, interrogação, dois-pontos, ponto e vírgula ou hífen, '
      + 'e a seguinte não começar como item de lista ("-", "•", "1."). Palavra partida com hífen no fim da linha não é juntada. '
      + 'Letras, acentos, pontuação e espaços únicos ficam como estão. O texto não sai do seu navegador.',
    perguntas: [
      {
        p: 'Para que serve juntar linhas partidas?',
        r: 'Texto copiado de PDF costuma vir com uma quebra de linha no fim de cada linha da página, mesmo no meio da frase. '
          + 'Com a opção marcada, essas linhas viram uma só; os parágrafos, separados por linha vazia, continuam separados.',
      },
      {
        p: 'Por que uma linha não foi juntada com a seguinte?',
        r: 'Porque ela termina em ponto, exclamação, interrogação, dois-pontos, ponto e vírgula ou hífen, ou a linha seguinte começa como item de lista. '
          + 'Nesses casos a quebra provavelmente é de propósito.',
      },
      { p: 'O texto que eu colo é guardado?', r: 'Não. A limpeza acontece no seu navegador e o texto não é enviado nem guardado.' },
    ],
  },

  montar(raiz, ferramenta) {
    let textoLimpo = '';
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Limpar texto',
      campos: [
        { nome: 'texto', rótulo: 'Texto', tipo: 'área', linhas: 8, exemplo: 'Cole ou digite o texto aqui' },
        ...MARCADORES.map(({ nome, rótulo, padrão }) => ({ nome, rótulo, tipo: 'caixa', padrão })),
      ],
      calcular(dados) {
        const conteúdo = String(dados.texto ?? '');
        if (!conteúdo.trim()) throw new ErroDeEntrada('Cole ou digite o texto que você quer limpar.', 'texto');
        if (conteúdo.length > LIMITE_DE_CARACTERES) {
          throw new ErroDeEntrada(`O texto passou de ${número(LIMITE_DE_CARACTERES)} caracteres. Divida em partes menores.`, 'texto');
        }

        const opções = Object.fromEntries(MARCADORES.map(({ nome }) => [nome, dados[nome] === 'sim']));
        const r = limparTexto(conteúdo, opções);
        textoLimpo = r.texto;
        const prévia = préviaDoTexto(r.texto, TAMANHO_DA_PRÉVIA);

        const observações = [];
        if (r.texto === conteúdo) observações.push('O texto já estava limpo com essas opções: saiu igual.');
        if (!Object.values(opções).some(Boolean)) observações.push('Nenhuma opção está marcada, então o texto não muda.');

        const removidos = r.caracteresRemovidos;
        return {
          valor: prévia,
          resumo: removidos === 1 ? '1 caractere removido.' : `${número(removidos)} caracteres removidos.`,
          linhas: [
            ['Caracteres removidos', número(removidos)],
            ['Linhas juntadas', número(r.linhasUnidas)],
            ['Linhas na entrada', número(r.linhasNaEntrada)],
            ['Linhas na saída', número(r.linhasNaSaída)],
          ],
          texto: r.texto,
          arquivos: [{
            rótulo: 'Baixar .txt',
            gerar: () => baixar(r.texto, `${nomeDeArquivo('texto-limpo')}.txt`, 'text/plain;charset=utf-8'),
          }],
          observações,
        };
      },
      aoMontar(elemento, recalcular) {
        ligarTextoAoVivo(elemento, recalcular, { campo: 'texto', opções: MARCADORES.map(({ nome }) => nome) });
        mostrarResultadoEmCaixa(elemento, () => textoLimpo);
      },
    });
  },
};

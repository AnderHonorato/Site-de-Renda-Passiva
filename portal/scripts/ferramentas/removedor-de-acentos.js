/** Remover acentos: tira acento, til e cedilha, mantendo ou não a pontuação. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { removerAcentos, contarAcentos, contarCaracteres, préviaDoTexto } from '../cálculos/textos.js';
import { ligarTextoAoVivo } from './auxiliares/texto-ao-vivo.js';

/** Limite da especificação do Ander Flow para as ferramentas de transformar texto. */
export const LIMITE_DE_CARACTERES = 50000;

/** Quanto do resultado aparece na tela; Copiar e Baixar levam o texto inteiro. */
export const TAMANHO_DA_PRÉVIA = 200;

/** Aviso de que tirar a pontuação também mexe nos números. */
export const AVISO_DOS_NÚMEROS = 'Sem pontuação, os números também perdem vírgula e ponto: "R$ 10,00" vira "R 1000".';

const número = (valor) => valor.toLocaleString('pt-BR');

export default {
  instruções: {
    passos: [
      'Cole ou digite o texto no campo. O resultado sem acentos acompanha a digitação.',
      'Deixe "Manter pontuação e símbolos" marcado para tirar só os acentos, ou desmarque para ficar só com letras, números e espaços.',
      'Copie o resultado ou baixe como arquivo de texto.',
    ],
    exemplo: {
      texto: '"São Paulo — Ação & Café" vira "Sao Paulo — Acao & Cafe", com o travessão e o & no lugar. '
        + 'Desmarcando a pontuação, "Preço: R$ 10,00!" vira "Preco R 1000".',
    },
    limites: `Até ${número(LIMITE_DE_CARACTERES)} caracteres. Saem acento agudo, grave e circunflexo, til, trema, cedilha e outros sinais sobre a letra; `
      + 'a letra fica. Com a pontuação desmarcada, sobram só as letras de A a Z sem acento, os números, o sublinhado e os espaços, '
      + `e letras de outros alfabetos também saem. ${AVISO_DOS_NÚMEROS} O texto não sai do seu navegador.`,
    perguntas: [
      { p: 'O ç também muda?', r: 'Sim. A cedilha é tratada como acento: "ação" vira "acao".' },
      {
        p: 'Por que os números perderam a vírgula?',
        r: 'Porque "Manter pontuação e símbolos" estava desmarcado: aí vírgula, ponto e cifrão também saem, e "R$ 10,00" vira "R 1000". Marque a opção para manter os números como estavam.',
      },
      { p: 'O texto que eu digito é guardado?', r: 'Não. A troca acontece no seu navegador e o texto não é enviado nem guardado.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Remover acentos',
      campos: [
        { nome: 'texto', rótulo: 'Texto', tipo: 'área', linhas: 8, exemplo: 'Cole ou digite o texto aqui' },
        { nome: 'manterPontuação', rótulo: 'Manter pontuação e símbolos', tipo: 'caixa', padrão: true },
      ],
      calcular(dados) {
        const conteúdo = String(dados.texto ?? '');
        if (!conteúdo.trim()) throw new ErroDeEntrada('Cole ou digite o texto de que você quer tirar os acentos.', 'texto');
        if (conteúdo.length > LIMITE_DE_CARACTERES) {
          throw new ErroDeEntrada(`O texto passou de ${número(LIMITE_DE_CARACTERES)} caracteres. Divida em partes menores.`, 'texto');
        }

        const manterPontuação = dados.manterPontuação !== 'não';
        const saída = removerAcentos(conteúdo, { manterPontuação });
        const acentos = contarAcentos(conteúdo);
        const prévia = préviaDoTexto(saída, TAMANHO_DA_PRÉVIA);

        const observações = [];
        if (prévia !== saída) observações.push('A tela mostra o começo do resultado. Copiar e Baixar levam o texto inteiro.');
        if (!manterPontuação && /\d[.,]\d/.test(conteúdo)) observações.push(AVISO_DOS_NÚMEROS);
        if (saída === conteúdo) observações.push('O texto não tinha acentos: saiu igual.');

        return {
          valor: prévia,
          resumo: `${acentos === 1 ? '1 acento removido' : `${número(acentos)} acentos removidos`}`
            + `${manterPontuação ? '' : ', e a pontuação também'}.`,
          linhas: [
            ['Caracteres na entrada', número(contarCaracteres(conteúdo))],
            ['Caracteres na saída', número(contarCaracteres(saída))],
          ],
          texto: saída,
          arquivos: [{
            rótulo: 'Baixar .txt',
            gerar: () => baixar(saída, `${nomeDeArquivo('texto-sem-acentos')}.txt`, 'text/plain;charset=utf-8'),
          }],
          observações,
        };
      },
      aoMontar(elemento, recalcular) {
        ligarTextoAoVivo(elemento, recalcular, { campo: 'texto', opções: ['manterPontuação'] });
      },
    });
  },
};

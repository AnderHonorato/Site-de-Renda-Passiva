/** Número e valor em reais por extenso. */
import { montarFerramenta, número, comCampo } from '../núcleo/montador.js';
import { inteiroPorExtenso, reaisPorExtenso } from '../cálculos/por-extenso.js';
import { emCentavos } from '../cálculos/dinheiro.js';

export default {
  instruções: {
    passos: [
      'Digite o número. Pode usar vírgula para os centavos.',
      'Escolha se é um valor em dinheiro ou um número comum.',
      'Copie o texto gerado direto para o recibo, o cheque ou o contrato.',
    ],
    exemplo: {
      texto: '1234,56 em modo dinheiro vira "mil duzentos e trinta e quatro reais e cinquenta e seis centavos".',
    },
    limites: 'Escreve até 999.999.999.999.999. Em modo dinheiro, trabalha com reais e centavos.',
    perguntas: [
      { p: 'Por que 1000 vira "mil" e não "um mil"?', r: 'Porque "mil" é a forma corrente em português. "Um mil" aparece em alguns documentos por ênfase, mas não é a norma.' },
      { p: 'E se eu digitar um número com mais de duas casas decimais?', r: 'No modo dinheiro o valor é arredondado para centavos. No modo número comum, a parte decimal é lida com duas casas e isso vem avisado no resultado.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Escrever por extenso',
      campos: [
        { nome: 'valor', rótulo: 'Número', tipo: 'número', exemplo: '1234,56' },
        {
          nome: 'modo', rótulo: 'Tipo', tipo: 'seleção', padrão: 'dinheiro',
          opções: [{ valor: 'dinheiro', rótulo: 'Valor em reais' }, { valor: 'comum', rótulo: 'Número comum' }],
        },
      ],
      calcular(dados) {
        const valor = número(dados, 'valor', { rótulo: 'Número' });

        if (dados.modo === 'dinheiro') {
          const texto = comCampo('valor', () => reaisPorExtenso(emCentavos(valor)));
          return { valor: texto, texto, resumo: 'Pronto para copiar no documento.' };
        }

        if (!Number.isInteger(valor)) {
          const inteiro = Math.trunc(valor);
          const decimais = Math.round(Math.abs(valor - inteiro) * 100);
          const texto = comCampo('valor',
            () => `${inteiroPorExtenso(inteiro)} vírgula ${inteiroPorExtenso(decimais)}`);
          return {
            valor: texto,
            texto,
            observações: ['A parte decimal foi lida com duas casas. Para dinheiro, use o modo "Valor em reais".'],
          };
        }

        const texto = comCampo('valor', () => inteiroPorExtenso(valor));
        return { valor: texto, texto };
      },
    });
  },
};

/** Barras de rodapé a comprar, pelo perímetro do cômodo. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { barrasDeRodapé } from '../cálculos/obra.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/**
 * Lê uma lista de medidas.
 *
 * O separador é ponto e vírgula ou quebra de linha, nunca vírgula: em português
 * a vírgula é o separador decimal, e aceitar os dois papéis faria "1,5" virar
 * duas medidas.
 */
function lerMedidas(valor, rótulo, campo, { obrigatório = true } = {}) {
  const partes = String(valor ?? '').split(/[\n;]/).map((p) => p.trim()).filter(Boolean);
  if (partes.length === 0) {
    if (obrigatório) throw new ErroDeEntrada(`Informe ${rótulo}.`, campo);
    return [];
  }
  return partes.map((p, i) => {
    const medida = paraNúmero(p);
    if (!Number.isFinite(medida) || medida <= 0) {
      throw new ErroDeEntrada(`A medida ${i + 1} de ${rótulo} não é um número válido: "${p}".`, campo);
    }
    return medida;
  });
}

export default {
  instruções: {
    passos: [
      'Escreva os lados do cômodo em metros, separados por ponto e vírgula. Um cômodo retangular tem quatro lados.',
      'Informe os vãos a descontar: portas e armários embutidos que não levam rodapé.',
      'Diga o comprimento da barra vendida na loja, normalmente 2,40 m.',
      'Ajuste a perda: 10% cobre os cortes de canto.',
    ],
    exemplo: {
      texto: 'Cômodo de 4 × 3 m (lados 4; 3; 4; 3), uma porta de 0,80 m, barras de 2,40 m e 10% de perda: '
        + '14 m de perímetro, 13,20 m úteis, 14,52 m com perda, 7 barras.',
    },
    limites: 'O perímetro é a soma dos lados que você informar: em cômodo com recuo ou em formato de L, '
      + 'liste cada trecho reto separadamente. Os vãos são descontados antes da perda, porque não faz sentido '
      + 'aplicar perda de corte sobre um trecho que não será instalado. Use ponto e vírgula para separar as medidas, '
      + 'assim a vírgula continua livre para os decimais.',
    perguntas: [
      { p: 'Desconto a porta do banheiro?', r: 'Desconte todo vão onde o rodapé não passa: portas, closets abertos e móveis embutidos que encostam no chão.' },
      { p: 'E se o cômodo não for retangular?', r: 'Liste cada trecho reto de parede como um lado. A ferramenta soma o que você informar.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular barras',
      campos: [
        { nome: 'lados', rótulo: 'Lados do cômodo (m)', padrão: '4; 3; 4; 3', dica: 'Separe por ponto e vírgula. Cômodo em L: liste cada trecho reto.' },
        { nome: 'vãos', rótulo: 'Vãos a descontar (m)', padrão: '0,80', dica: 'Portas e móveis embutidos. Deixe em branco se não houver.' },
        { nome: 'barra', rótulo: 'Comprimento da barra (m)', tipo: 'número', padrão: '2,40' },
        { nome: 'perda', rótulo: 'Perda de corte (%)', tipo: 'número', padrão: '10' },
      ],
      calcular(dados) {
        const lados = lerMedidas(dados.lados, 'os lados do cômodo', 'lados');
        if (lados.length < 3) throw new ErroDeEntrada('Um cômodo tem pelo menos três lados.', 'lados');
        const vãos = lerMedidas(dados.vãos, 'os vãos', 'vãos', { obrigatório: false });
        const barra = número(dados, 'barra', { rótulo: 'Comprimento da barra', mín: 0.1 });
        const perda = número(dados, 'perda', { rótulo: 'Perda', mín: 0, máx: 100 });

        const r = barrasDeRodapé({ lados, vãos, comprimentoDaBarra: barra, perda });
        const m = (v) => `${formatarNúmero(v, { casas: 2 })} m`;

        return {
          valor: `${r.barras} barra${r.barras === 1 ? '' : 's'}`,
          resumo: `${m(r.metrosComPerda)} necessários, em barras de ${m(barra)}.`,
          linhas: [
            ['Perímetro', m(r.perímetro)],
            ['Vãos descontados', m(r.perímetro - r.metrosÚteis)],
            ['Metros úteis', m(r.metrosÚteis)],
            [`Com ${formatarNúmero(perda, { casas: 0 })}% de perda`, m(r.metrosComPerda)],
            ['Barras a comprar', String(r.barras)],
            ['Sobra', m(r.sobra)],
          ],
        };
      },
    });
  },
};

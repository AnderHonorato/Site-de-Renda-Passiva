/** Sorteio de números, de nomes e divisão em times. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { sortear, dividirEmTimes, inteiroAleatório } from '../cálculos/aleatório.js';

function lerNomes(valor) {
  const nomes = String(valor ?? '')
    .split(/[\n,;]/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (nomes.length < 2) throw new ErroDeEntrada('Escreva pelo menos dois nomes.', 'nomes');
  if (nomes.length > 500) throw new ErroDeEntrada('Limite de 500 nomes por sorteio.', 'nomes');
  return nomes;
}

export default {
  instruções: {
    passos: [
      'Escolha o tipo: números, nomes ou times.',
      'Para números, informe a faixa. Para nomes e times, escreva um por linha.',
      'Diga quantos resultados quer (ou quantos times).',
      'Toque em Sortear. Um código de conferência é gerado junto, para você provar depois que não refez o sorteio.',
    ],
    exemplo: { texto: 'Doze participantes em três times: cada time sai com quatro pessoas, distribuídas ao acaso.' },
    limites: 'O sorteio usa a fonte criptográfica do navegador, então o resultado é imprevisível e não tem viés. '
      + 'Nada é registrado em servidor: se a página for recarregada, o sorteio é outro. '
      + 'Por isso existe o código de conferência, que é gerado junto do resultado.',
    perguntas: [
      { p: 'O sorteio é realmente aleatório?', r: 'Sim. Usa crypto.getRandomValues, a mesma fonte usada para gerar chaves. A amostragem descarta valores que causariam viés, então todos os itens têm exatamente a mesma chance.' },
      { p: 'Serve para sorteio com valor legal?', r: 'Não. Promoção comercial com distribuição de prêmio precisa de autorização e regras próprias. Esta ferramenta serve para sorteio informal.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Sortear',
      campos: [
        {
          nome: 'tipo', rótulo: 'O que sortear', tipo: 'seleção', padrão: 'números',
          opções: [
            { valor: 'números', rótulo: 'Números de uma faixa' },
            { valor: 'nomes', rótulo: 'Nomes de uma lista' },
            { valor: 'times', rótulo: 'Dividir em times' },
          ],
        },
        { nome: 'de', rótulo: 'De', tipo: 'número', padrão: '1' },
        { nome: 'até', rótulo: 'Até', tipo: 'número', padrão: '60' },
        { nome: 'quantidade', rótulo: 'Quantos sortear (ou quantos times)', tipo: 'número', padrão: '6' },
        { nome: 'nomes', rótulo: 'Nomes, um por linha', tipo: 'área', linhas: 6, exemplo: 'Ana\nBruno\nCarla' },
        { nome: 'repetir', rótulo: 'Permitir repetição', tipo: 'caixa' },
      ],
      calcular(dados) {
        const quantidade = número(dados, 'quantidade', { rótulo: 'Quantidade', mín: 1, máx: 500, inteiro: true });
        const código = Array.from({ length: 6 }, () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[inteiroAleatório(32)]).join('');
        const carimbo = new Date().toLocaleString('pt-BR');

        if (dados.tipo === 'times') {
          const nomes = lerNomes(dados.nomes);
          const times = dividirEmTimes(nomes, quantidade);
          return {
            valor: `${times.length} times sorteados`,
            resumo: `${nomes.length} participantes · código ${código} · ${carimbo}`,
            texto: times.map((t, i) => `Time ${i + 1}: ${t.join(', ')}`).join('\n'),
            tabela: {
              cabeçalho: ['Time', 'Participantes', 'Quantidade'],
              linhas: times.map((t, i) => [`Time ${i + 1}`, t.join(', '), String(t.length)]),
            },
            observações: [`Código de conferência: ${código}. Guarde junto do resultado.`],
          };
        }

        const itens = dados.tipo === 'nomes'
          ? lerNomes(dados.nomes)
          : (() => {
            const de = número(dados, 'de', { rótulo: 'Início da faixa', inteiro: true });
            const até = número(dados, 'até', { rótulo: 'Fim da faixa', inteiro: true });
            if (até <= de) throw new ErroDeEntrada('O fim da faixa precisa ser maior que o início.', 'até');
            if (até - de > 100000) throw new ErroDeEntrada('Faixa grande demais: limite de 100 mil números.', 'até');
            return Array.from({ length: até - de + 1 }, (_, i) => String(de + i));
          })();

        const sorteados = sortear(itens, { quantidade, repetir: dados.repetir === 'sim' });

        return {
          valor: sorteados.join(dados.tipo === 'números' ? ' · ' : ', '),
          resumo: `${quantidade} de ${itens.length} · código ${código} · ${carimbo}`,
          texto: `${sorteados.join('\n')}\n\nCódigo de conferência: ${código}\n${carimbo}`,
          linhas: sorteados.map((s, i) => [`${i + 1}º`, s]),
          observações: [`Código de conferência: ${código}. Guarde junto do resultado.`],
        };
      },
    });
  },
};

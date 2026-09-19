/** Jornada, horas extras e saldo de banco de horas. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { jornadaDoDia, lerHora, formatarMinutos } from '../cálculos/tempo.js';

/**
 * Lê as linhas do ponto: "dia; entrada; saída; intervalo".
 * @param {string} valor
 * @returns {{rótulo: string, minutos: number}[]}
 */
function lerPonto(valor) {
  const linhas = String(valor ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) throw new ErroDeEntrada('Escreva pelo menos um dia.', 'ponto');
  if (linhas.length > 62) throw new ErroDeEntrada('Limite de 62 dias por cálculo.', 'ponto');

  return linhas.map((linha, índice) => {
    const partes = linha.split(/\s*[;|]\s*|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (partes.length < 3) {
      throw new ErroDeEntrada(
        `A linha ${índice + 1} precisa ter dia, entrada e saída. Exemplo: 01/10; 08:00; 17:00; 60`,
        'ponto',
      );
    }
    const [rótulo, entrada, saída, intervalo = '0'] = partes;
    const intervaloMinutos = /^\d{1,2}:\d{2}$/.test(intervalo)
      ? lerHora(intervalo)
      : Number(intervalo.replace(/\D/g, '') || 0);
    try {
      return { rótulo, minutos: jornadaDoDia({ entrada, saída, intervaloMinutos }) };
    } catch (erro) {
      throw new ErroDeEntrada(`Linha ${índice + 1} (${rótulo}): ${erro.message}`, 'ponto');
    }
  });
}

export default {
  instruções: {
    passos: [
      'Escreva um dia por linha: identificação, entrada, saída e intervalo em minutos.',
      'Separe os campos com ponto e vírgula. O intervalo é opcional.',
      'Informe a jornada contratual do dia para ver extras e saldo.',
      'O total do período e o saldo aparecem no fim, e você pode baixar a planilha.',
    ],
    exemplo: {
      texto: '01/10; 08:00; 18:00; 60 — dez horas entre entrada e saída, menos uma hora de intervalo, dão 9h00 trabalhadas. '
        + 'Com jornada de 8h00, o saldo do dia é +1h00.',
    },
    limites: 'Saída anterior à entrada é lida como turno que vira o dia, não como erro. '
      + 'O cálculo é de horas brutas: não aplica adicional noturno, percentual de hora extra, DSR nem regra de convenção coletiva. '
      + 'Para fechamento de folha, confira com o setor pessoal.',
    perguntas: [
      { p: 'A ferramenta calcula o valor da hora extra?', r: 'Não. Ela entrega a quantidade de horas. O percentual de extra e o adicional noturno dependem da convenção coletiva da categoria.' },
      { p: 'Como lanço um turno da noite?', r: 'Normalmente: 22:00 como entrada e 06:00 como saída. A virada de dia é reconhecida sozinha.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Somar horas',
      campos: [
        {
          nome: 'ponto', rótulo: 'Dias trabalhados', tipo: 'área', linhas: 8,
          padrão: '01/10; 08:00; 18:00; 60\n02/10; 08:00; 17:00; 60\n03/10; 09:00; 18:30; 60',
          dica: 'dia; entrada; saída; intervalo em minutos',
        },
        { nome: 'jornada', rótulo: 'Jornada contratual por dia (HH:MM)', padrão: '08:00' },
      ],
      calcular(dados) {
        const dias = lerPonto(dados.ponto);
        const jornada = lerHora(String(dados.jornada || '08:00'));
        const total = dias.reduce((soma, d) => soma + d.minutos, 0);
        const esperado = jornada * dias.length;
        const saldo = total - esperado;

        return {
          valor: formatarMinutos(total),
          resumo: `${dias.length} dia(s) · esperado ${formatarMinutos(esperado)} · saldo ${formatarMinutos(saldo)}`,
          linhas: [
            ['Total trabalhado', formatarMinutos(total)],
            ['Total esperado', formatarMinutos(esperado)],
            ['Saldo do período', formatarMinutos(saldo)],
            ['Média por dia', formatarMinutos(total / dias.length)],
          ],
          tabela: {
            cabeçalho: ['Dia', 'Trabalhado', 'Saldo do dia'],
            linhas: dias.map((d) => [d.rótulo, formatarMinutos(d.minutos), formatarMinutos(d.minutos - jornada)]),
          },
          observações: [
            saldo === 0 ? 'O período fechou exatamente na jornada contratual.'
              : saldo > 0 ? `Há ${formatarMinutos(saldo)} a mais que a jornada contratual no período.`
                : `Faltam ${formatarMinutos(-saldo)} para fechar a jornada contratual do período.`,
            'Horas brutas: sem adicional noturno, percentual de extra ou regra de convenção coletiva.',
          ],
        };
      },
    });
  },
};

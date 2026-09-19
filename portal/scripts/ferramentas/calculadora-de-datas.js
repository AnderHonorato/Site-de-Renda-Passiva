/** Datas: diferença, prazo, dias úteis, idade e dia da semana. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import {
  lerData, formatarData, diaDaSemana, diferençaEntreDatas,
  somarDias, diasÚteisEntre, idade,
} from '../cálculos/tempo.js';

/** Lê a lista de feriados escrita pela pessoa, em dd/mm/aaaa ou aaaa-mm-dd. */
function lerFeriados(valor) {
  return String(valor ?? '')
    .split(/[\n,;]/)
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => {
      const brasileiro = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f);
      const texto = brasileiro ? `${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}` : f;
      lerData(texto); // valida e lança erro legível se estiver errado
      return texto;
    });
}

export default {
  instruções: {
    passos: [
      'Escolha a operação: diferença entre datas, somar ou subtrair prazo, ou calcular idade.',
      'Preencha as datas. O campo abre o calendário do seu aparelho.',
      'Para prazos em dias úteis, marque a opção e liste os feriados que valem no seu caso.',
      'O resultado mostra o dia da semana, porque prazo que cai em sábado costuma mudar tudo.',
    ],
    exemplo: {
      texto: 'Um prazo de 15 dias úteis a partir de 01/10/2026, sem feriados: vence em 22/10/2026, uma quinta-feira.',
    },
    limites: 'As contas usam data civil, sem horário e sem fuso: o horário de verão e o relógio do aparelho não alteram a contagem. '
      + 'Dias úteis excluem sábados, domingos e os feriados que você listar — a ferramenta não conhece feriados municipais nem pontos facultativos, '
      + 'porque eles mudam de cidade para cidade. Limite de 100 anos por cálculo.',
    perguntas: [
      { p: 'A contagem inclui o dia inicial?', r: 'Não. A diferença conta os dias entre as datas, como é o padrão de prazo: de 1 a 2 de outubro é um dia.' },
      { p: 'Por que preciso digitar os feriados?', r: 'Porque não existe uma lista única: além dos nacionais, cada estado e cada cidade tem os seus, e pontos facultativos variam por empresa. Digitar é o único jeito honesto de acertar o seu caso.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular',
      campos: [
        {
          nome: 'operação', rótulo: 'O que calcular', tipo: 'seleção', padrão: 'diferença',
          opções: [
            { valor: 'diferença', rótulo: 'Diferença entre duas datas' },
            { valor: 'somar', rótulo: 'Somar ou subtrair dias' },
            { valor: 'idade', rótulo: 'Idade a partir do nascimento' },
          ],
        },
        { nome: 'inicial', rótulo: 'Data inicial', tipo: 'date' },
        { nome: 'final', rótulo: 'Data final', tipo: 'date' },
        { nome: 'dias', rótulo: 'Dias a somar (negativo subtrai)', tipo: 'número', padrão: '15' },
        { nome: 'úteis', rótulo: 'Contar apenas dias úteis', tipo: 'caixa' },
        {
          nome: 'feriados', rótulo: 'Feriados a excluir', tipo: 'área', linhas: 3,
          exemplo: '12/10/2026\n02/11/2026',
          dica: 'Um por linha, em dd/mm/aaaa. Só vale quando "apenas dias úteis" está marcado.',
        },
      ],
      calcular(dados) {
        const úteis = dados.úteis === 'sim';
        const feriados = úteis ? lerFeriados(dados.feriados) : [];

        if (dados.operação === 'idade') {
          if (!dados.inicial) throw new ErroDeEntrada('Informe a data de nascimento no campo "Data inicial".', 'inicial');
          const nascimento = lerData(dados.inicial);
          const referência = dados.final ? lerData(dados.final) : undefined;
          const r = idade(nascimento, referência);
          return {
            valor: `${r.anos} anos, ${r.meses} meses e ${r.dias} dias`,
            resumo: `Nascimento em ${formatarData(nascimento)}, uma ${diaDaSemana(nascimento)}.`,
            linhas: [
              ['Idade completa', `${r.anos} anos`],
              ['Total de dias vividos', r.totalDeDias.toLocaleString('pt-BR')],
              ['Total de semanas', Math.trunc(r.totalDeDias / 7).toLocaleString('pt-BR')],
              ['Total de meses', String(r.anos * 12 + r.meses)],
            ],
          };
        }

        if (dados.operação === 'somar') {
          if (!dados.inicial) throw new ErroDeEntrada('Informe a data inicial.', 'inicial');
          const inicial = lerData(dados.inicial);
          const dias = número(dados, 'dias', { rótulo: 'Dias', inteiro: true });
          const final = somarDias(inicial, dias, { úteis, feriados });
          return {
            valor: formatarData(final),
            resumo: `${dias >= 0 ? 'Somando' : 'Subtraindo'} ${Math.abs(dias)} ${úteis ? 'dias úteis' : 'dias corridos'}.`,
            texto: formatarData(final),
            linhas: [
              ['Data inicial', `${formatarData(inicial)} (${diaDaSemana(inicial)})`],
              ['Data final', `${formatarData(final)} (${diaDaSemana(final)})`],
              ['Dias corridos entre elas', String(Math.abs(diferençaEntreDatas(inicial, final).dias))],
            ],
            observações: úteis && feriados.length === 0
              ? ['Nenhum feriado foi informado: só sábados e domingos foram pulados.'] : [],
          };
        }

        if (!dados.inicial || !dados.final) {
          throw new ErroDeEntrada('Informe as duas datas.', dados.inicial ? 'final' : 'inicial');
        }
        const inicial = lerData(dados.inicial);
        const final = lerData(dados.final);
        const d = diferençaEntreDatas(inicial, final);

        return {
          valor: `${Math.abs(d.dias).toLocaleString('pt-BR')} dias`,
          resumo: `De ${formatarData(inicial)} (${diaDaSemana(inicial)}) a ${formatarData(final)} (${diaDaSemana(final)}).`,
          linhas: [
            ['Dias corridos', Math.abs(d.dias).toLocaleString('pt-BR')],
            ['Semanas completas', String(Math.abs(d.semanas))],
            ['Em anos, meses e dias', `${Math.abs(d.anos)} anos, ${Math.abs(d.meses)} meses e ${Math.abs(d.restoDeDias)} dias`],
            ['Dias úteis', String(Math.abs(diasÚteisEntre(inicial, final, feriados)))],
          ],
          observações: [
            d.dias < 0 ? 'A data final é anterior à inicial: os valores estão em módulo.' : 'A contagem não inclui o dia inicial.',
            úteis && feriados.length > 0 ? `${feriados.length} feriado(s) excluído(s) da contagem de dias úteis.` : '',
          ].filter(Boolean),
        };
      },
    });
  },
};

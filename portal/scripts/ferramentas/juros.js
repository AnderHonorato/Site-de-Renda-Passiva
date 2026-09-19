/** Juros simples e compostos, com aportes e tabela de evolução. */
import { montarFerramenta, número, baixarPlanilha, nomeDeArquivo } from '../núcleo/montador.js';
import { juros, emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';

const PERÍODOS = [
  { valor: 'mês', rótulo: 'meses' },
  { valor: 'ano', rótulo: 'anos' },
  { valor: 'dia', rótulo: 'dias' },
];

export default {
  instruções: {
    passos: [
      'Informe o valor inicial e a taxa por período.',
      'Diga quantos períodos e se a taxa é mensal, anual ou diária.',
      'Se você deposita todo mês, preencha o aporte: ele entra no fim de cada período.',
      'Escolha juros compostos (o normal em investimento e dívida) ou simples.',
      'Baixe a tabela de evolução em planilha se quiser acompanhar período a período.',
    ],
    exemplo: {
      texto: 'R$ 1.000,00 a 1% ao mês por 12 meses, com aporte de R$ 100,00: o montante fica em R$ 2.395,07, '
        + 'sendo R$ 1.200,00 de aportes e R$ 195,07 de juros.',
    },
    limites: 'A taxa é por período e não é convertida automaticamente: 12% ao ano não é a mesma coisa que 1% ao mês em juros compostos. '
      + 'Os aportes entram no fim de cada período. Não há desconto de imposto de renda nem de inflação.',
    perguntas: [
      { p: 'Qual a diferença entre simples e compostos?', r: 'Nos juros simples, o rendimento incide sempre sobre o valor inicial. Nos compostos, incide sobre o saldo, então os juros também rendem juros. Praticamente todo investimento e toda dívida usam compostos.' },
      { p: 'Este resultado já desconta imposto?', r: 'Não. É o rendimento bruto. Para renda fixa, o imposto de renda incide sobre os juros conforme o prazo da aplicação.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular',
      demorada: true,
      campos: [
        { nome: 'principal', rótulo: 'Valor inicial (R$)', tipo: 'número', exemplo: '1000,00' },
        { nome: 'taxa', rótulo: 'Taxa por período (%)', tipo: 'número', exemplo: '1' },
        { nome: 'períodos', rótulo: 'Quantidade de períodos', tipo: 'número', exemplo: '12' },
        { nome: 'unidade', rótulo: 'Período', tipo: 'seleção', opções: PERÍODOS, padrão: 'mês' },
        { nome: 'aporte', rótulo: 'Aporte por período (R$)', tipo: 'número', padrão: '0' },
        {
          nome: 'tipo', rótulo: 'Tipo de juros', tipo: 'seleção', padrão: 'composto',
          opções: [{ valor: 'composto', rótulo: 'Compostos' }, { valor: 'simples', rótulo: 'Simples' }],
        },
      ],
      calcular(dados) {
        const principal = número(dados, 'principal', { rótulo: 'Valor inicial', mín: 0 });
        const taxa = número(dados, 'taxa', { rótulo: 'Taxa', mín: -99 });
        const períodos = número(dados, 'períodos', { rótulo: 'Períodos', mín: 1, máx: 1200, inteiro: true });
        const aporte = número(dados, 'aporte', { rótulo: 'Aporte', mín: 0, obrigatório: false, padrão: 0 });
        const unidade = PERÍODOS.find((p) => p.valor === dados.unidade)?.rótulo ?? 'períodos';

        const r = juros({
          principalCentavos: emCentavos(principal),
          taxa,
          períodos,
          composto: dados.tipo === 'composto',
          aporteCentavos: emCentavos(aporte),
        });

        // A tabela completa pode ter 1200 linhas; mostramos um recorte legível
        // e o arquivo exportado leva tudo.
        const passo = Math.max(1, Math.ceil(r.evolução.length / 24));
        const amostra = r.evolução.filter((e, i) => i % passo === 0 || i === r.evolução.length - 1);

        return {
          valor: formatarMoeda(r.montanteCentavos / 100),
          resumo: `Depois de ${períodos} ${unidade}, a ${taxa}% por período.`,
          linhas: [
            ['Valor inicial', formatarMoeda(principal)],
            ['Total aportado', formatarMoeda(r.aportadoCentavos / 100)],
            ['Juros acumulados', formatarMoeda(r.jurosCentavos / 100)],
            ['Montante final', formatarMoeda(r.montanteCentavos / 100)],
          ],
          tabela: {
            semExportação: true,
            cabeçalho: ["Período", "Juros do período", "Saldo"],
            linhas: amostra.map((e) => [
              String(e.período),
              formatarMoeda(e.jurosCentavos / 100),
              formatarMoeda(e.saldoCentavos / 100),
            ]),
          },
          arquivos: [{
            rótulo: 'Planilha com todos os períodos',
            ícone: 'planilha',
            gerar: () => baixarPlanilha(
              [['Período', 'Juros do período (R$)', 'Saldo (R$)'],
                ...r.evolução.map((e) => [e.período, e.jurosCentavos / 100, e.saldoCentavos / 100])],
              nomeDeArquivo(`juros-${períodos}-${dados.unidade}`),
              { aba: 'Evolução', larguras: [10, 22, 16] },
            ),
          }],
          observações: [
            amostra.length < r.evolução.length
              ? `A tabela na tela mostra ${amostra.length} de ${r.evolução.length} períodos. A planilha completa está no botão acima.`
              : 'Valor bruto: não estão descontados imposto de renda nem inflação.',
            dados.tipo === 'simples'
              ? 'Nos juros simples o rendimento incide sempre sobre o valor inicial.'
              : 'Nos juros compostos o rendimento incide sobre o saldo acumulado.',
          ],
        };
      },
    });
  },
};

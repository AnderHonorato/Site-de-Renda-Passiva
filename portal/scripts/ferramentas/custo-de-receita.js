/** Custo de uma receita, por ingrediente e por unidade produzida. */
import { montarFerramenta, número, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { custoDeInsumos } from '../cálculos/produção.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/**
 * Lê os ingredientes no formato:
 * "nome; quantidade do pacote; preço do pacote; quantidade usada".
 *
 * A quantidade do pacote e a usada precisam estar na mesma unidade — a
 * ferramenta não adivinha se "1" é um quilo ou uma grama, e por isso avisa
 * em vez de chutar.
 */
function lerIngredientes(valor) {
  const linhas = String(valor ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) throw new ErroDeEntrada('Informe pelo menos um ingrediente.', 'ingredientes');
  if (linhas.length > 60) throw new ErroDeEntrada('Limite de 60 ingredientes.', 'ingredientes');

  return linhas.map((linha, índice) => {
    const partes = linha.split(/\s*[;|]\s*/).map((p) => p.trim());
    if (partes.length < 4) {
      throw new ErroDeEntrada(
        `A linha ${índice + 1} precisa ter nome, quantidade do pacote, preço e quantidade usada. `
        + 'Exemplo: Farinha; 1000; 5,90; 500',
        'ingredientes',
      );
    }
    const [nome, pacoteBruto, preçoBruto, usadoBruto] = partes;
    const quantidadeDoPacote = paraNúmero(pacoteBruto);
    const preço = paraNúmero(preçoBruto);
    const quantidadeUsada = paraNúmero(usadoBruto);

    if (!Number.isFinite(quantidadeDoPacote) || quantidadeDoPacote <= 0) {
      throw new ErroDeEntrada(`Quantidade do pacote inválida na linha ${índice + 1}.`, 'ingredientes');
    }
    if (!Number.isFinite(preço) || preço < 0) {
      throw new ErroDeEntrada(`Preço inválido na linha ${índice + 1}.`, 'ingredientes');
    }
    if (!Number.isFinite(quantidadeUsada) || quantidadeUsada < 0) {
      throw new ErroDeEntrada(`Quantidade usada inválida na linha ${índice + 1}.`, 'ingredientes');
    }
    if (quantidadeUsada > quantidadeDoPacote * 100) {
      throw new ErroDeEntrada(
        `Na linha ${índice + 1} o consumo é mais de cem pacotes. Confira se as duas quantidades estão na mesma unidade.`,
        'ingredientes',
      );
    }

    return {
      nome: nome || `Ingrediente ${índice + 1}`,
      quantidadeDoPacote,
      preçoDoPacoteCentavos: emCentavos(preço),
      quantidadeUsada,
    };
  });
}

export default {
  instruções: {
    passos: [
      'Escreva um ingrediente por linha: nome; quantidade do pacote; preço do pacote; quantidade usada.',
      'Use a MESMA unidade nas duas quantidades. Se o pacote tem 1 kg e você usa 500 g, escreva 1000 e 500.',
      'Informe quantas unidades a receita rende: fatias, potes, porções.',
      'O custo por unidade é o que você leva para a ferramenta de preço de venda.',
    ],
    exemplo: {
      texto: 'Farinha; 1000; 5,90; 500\nAçúcar; 1000; 4,50; 300\nOvos; 12; 12,00; 4\n\n'
        + 'Rendendo 12 fatias: custo total de R$ 8,30 e R$ 0,70 por fatia.',
    },
    limites: 'A conta é proporcional ao consumo: meio pacote custa metade do pacote. '
      + 'Ela cobre o custo de ingrediente, não a embalagem, a energia do forno nem o seu tempo — '
      + 'esses entram como despesa fixa e valor da hora na formação do preço. '
      + 'A ferramenta não converte unidades sozinha, de propósito: converter errado silenciosamente é pior que avisar.',
    perguntas: [
      { p: 'Por que preciso usar a mesma unidade?', r: 'Porque a ferramenta não tem como saber se "1" é um quilo, uma grama ou uma unidade. Padronizar em gramas e mililitros resolve quase todos os casos.' },
      { p: 'O custo por unidade já é o preço de venda?', r: 'Não. É só o custo de ingrediente. Leve esse valor para a ferramenta de preço de venda e acrescente a margem, as taxas e o seu tempo.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular custo',
      campos: [
        {
          nome: 'ingredientes', rótulo: 'Ingredientes', tipo: 'área', linhas: 8,
          padrão: 'Farinha; 1000; 5,90; 500\nAçúcar; 1000; 4,50; 300\nOvos; 12; 12,00; 4',
          dica: 'nome; quantidade do pacote; preço do pacote; quantidade usada',
        },
        { nome: 'rendimento', rótulo: 'Rendimento (unidades)', tipo: 'número', padrão: '12' },
        { nome: 'nomeDaReceita', rótulo: 'Nome da receita', exemplo: 'Bolo de fubá' },
      ],
      calcular(dados) {
        const ingredientes = lerIngredientes(dados.ingredientes);
        const rendimento = número(dados, 'rendimento', { rótulo: 'Rendimento', mín: 1, máx: 100000 });
        const nomeDaReceita = String(dados.nomeDaReceita ?? '').trim().slice(0, 80) || 'Receita';
        const r = custoDeInsumos(ingredientes, { rendimento });

        const linhasDaTabela = r.detalhe.map((d) => [
          d.nome,
          formatarMoeda(d.custoCentavos / 100),
          `${formatarNúmero(d.parteDoTotal, { casas: 1 })}%`,
        ]);

        const gerarPdf = () => {
          const documento = montarDocumentoPdf({
            título: `Custo de ${nomeDaReceita}`,
            subtítulo: `${formatarNúmero(rendimento, { casas: 0 })} unidades`,
          });
          documento.seção('Ingredientes');
          documento.tabela(['Ingrediente', 'Custo', 'Parte do total'], linhasDaTabela, [55, 25, 20]);
          documento.destaque('Custo total', formatarMoeda(r.totalCentavos / 100));
          documento.campo('Custo por unidade', formatarMoeda(r.porUnidadeCentavos / 100));
          documento.espaço(4);
          documento.parágrafo('Custo de ingrediente apenas. Embalagem, energia e mão de obra entram na formação do preço.',
            { tamanho: 8.5, cor: '#6d5d55' });
          baixar(documento.gerarBytes(), `${nomeDeArquivo(`custo-${nomeDaReceita}`)}.pdf`, 'application/pdf');
        };

        const maisCaro = [...r.detalhe].sort((a, b) => b.custoCentavos - a.custoCentavos)[0];

        return {
          valor: formatarMoeda(r.totalCentavos / 100),
          resumo: `${formatarMoeda(r.porUnidadeCentavos / 100)} por unidade, em ${formatarNúmero(rendimento, { casas: 0 })} unidades.`,
          linhas: [
            ['Custo total da receita', formatarMoeda(r.totalCentavos / 100)],
            ['Rendimento', `${formatarNúmero(rendimento, { casas: 0 })} unidades`],
            ['Custo por unidade', formatarMoeda(r.porUnidadeCentavos / 100)],
          ],
          tabela: { cabeçalho: ['Ingrediente', 'Custo', 'Parte do total'], linhas: linhasDaTabela },
          arquivos: [{ rótulo: 'Baixar ficha em PDF', ícone: 'documento', gerar: gerarPdf }],
          observações: [
            maisCaro
              ? `${maisCaro.nome} é o ingrediente de maior peso: ${formatarNúmero(maisCaro.parteDoTotal, { casas: 1 })}% do custo.`
              : '',
            'Só custo de ingrediente. Embalagem, energia e o seu tempo entram na formação do preço de venda.',
          ].filter(Boolean),
        };
      },
    });
  },
};

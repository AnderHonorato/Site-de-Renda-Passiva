// preco-de-venda-plus-xlsx.js — recurso do Plus: planilha com o preço para cada margem.
// Servido só em /plus/preco-de-venda/xlsx, para sessão com plano Plus.
import { montarCenarios } from '/estatico/ferramentas/preco-de-venda/preco-de-venda-calculo.js';

export async function exportarCenariosXlsx(entradas, traduzir) {
  const { utils, write } = await import('/estatico/compartilhado/bibliotecas/xlsx.mjs');
  const cenarios = montarCenarios(entradas);

  const cabecalho = [
    traduzir('preco-de-venda.campos.margem'),
    traduzir('preco-de-venda.resultado.titulo'),
    traduzir('preco-de-venda.resultado.custo_total'),
    traduzir('preco-de-venda.resultado.taxa_imposto'),
    traduzir('preco-de-venda.resultado.sobra'),
    traduzir('preco-de-venda.resultado.minimo'),
  ];

  const linhas = cenarios.map((cenario) => [
    cenario.margem,
    cenario.preco,
    cenario.custoTotal,
    cenario.taxaEImposto,
    cenario.sobra,
    cenario.precoMinimo,
  ]);

  const planilha = utils.aoa_to_sheet([cabecalho, ...linhas]);
  planilha['!cols'] = cabecalho.map(() => ({ wch: 22 }));
  for (let linha = 1; linha <= linhas.length; linha++) {
    const celulaMargem = planilha[utils.encode_cell({ r: linha, c: 0 })];
    if (celulaMargem) celulaMargem.z = '0%';
    for (let coluna = 1; coluna < cabecalho.length; coluna++) {
      const celula = planilha[utils.encode_cell({ r: linha, c: coluna })];
      if (celula) celula.z = '#,##0.00';
    }
  }

  const livro = utils.book_new();
  utils.book_append_sheet(livro, planilha, traduzir('preco-de-venda.titulo').slice(0, 31));
  const bytes = write(livro, { bookType: 'xlsx', type: 'array' });
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

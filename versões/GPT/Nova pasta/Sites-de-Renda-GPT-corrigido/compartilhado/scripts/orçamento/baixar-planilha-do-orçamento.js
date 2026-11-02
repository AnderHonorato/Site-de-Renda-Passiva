// Baixa o orçamento como planilha Excel (.xlsx), gerada no navegador.
import { baixarArquivo } from '../armazenamento/baixar-arquivo.js';
import { obterIdentidadeDaPágina } from './obter-identidade-da-página.js';

export async function baixarPlanilhaDoOrçamento(orçamento) {
  const [{ gerarPlanilhaXlsx }, { montarPlanilhaDoOrçamento }] = await Promise.all([
    import('../exportação/gerar-planilha-xlsx.js'),
    import('./montar-planilha-do-orçamento.js'),
  ]);
  const identidade = obterIdentidadeDaPágina();
  const marca = identidade.marca || orçamento.marca;
  const { linhas, largurasDasColunas } = montarPlanilhaDoOrçamento(orçamento, { marca });
  const bytes = gerarPlanilhaXlsx({ nomeDaAba: 'Orçamento', linhas, largurasDasColunas, corDoCabeçalho: identidade.cores.principal, título: orçamento.título, autor: orçamento.emissor.nome });
  baixarArquivo(`orçamento-${orçamento.criadoEm.slice(0, 10)}.xlsx`, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

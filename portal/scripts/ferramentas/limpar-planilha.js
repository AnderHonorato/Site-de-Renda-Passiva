/** Limpeza em etapas: carregar, configurar, revisar e exportar, no navegador. */
import { montarFerramenta, ErroDeEntrada, baixarCsv, baixarPlanilha, nomeDeArquivo } from '../núcleo/montador.js';
import { limparTabela } from '../cálculos/tabular.js';
import { lerDadosTexto } from '../cálculos/importar-planilha.js';
import { ligarEtapasPlanilha } from './auxiliares/etapas-planilha.js';

const numero = n => n.toLocaleString('pt-BR');
export function limparNaTela(dados, fonte = {}) {
  let tabela, colunas;
  try { ({ linhas: tabela, colunas } = lerDadosTexto(dados.conteúdo)); }
  catch (erro) { throw new ErroDeEntrada(erro.message, 'conteúdo'); }
  let colunasChave;
  try { colunasChave = dados.colunasChave ? JSON.parse(dados.colunasChave) : undefined; }
  catch { throw new ErroDeEntrada('Escolha colunas válidas para comparar as duplicadas.', 'colunasChave'); }
  let r;
  try {
    r = limparTabela(tabela, {
      comCabeçalho: dados.comCabeçalho === 'sim', removerDuplicadas: dados.removerDuplicadas === 'sim',
      removerVazias: dados.removerVazias === 'sim', aparar: dados.aparar === 'sim', espaçosDuplos: dados.espaçosDuplos === 'sim',
      caixa: dados.caixa, colunasChave, manter: dados.manter || 'primeira',
    });
  } catch (erro) { throw new ErroDeEntrada(erro.message, 'colunasChave'); }
  const cabecalho = r.cabeçalho ?? Array.from({ length: colunas }, (_, i) => `Coluna ${i+1}`);
  const finais = r.cabeçalho ? [r.cabeçalho, ...r.linhas] : r.linhas;
  const nome = nomeDeArquivo((fonte.nome || 'planilha').replace(/\.[^.]*$/, '') + '-limpa');
  const chaves = colunasChave ?? Array.from({ length: colunas }, (_, i) => i);
  const descricaoChaves = chaves.length === colunas && new Set(chaves).size === colunas
    ? `Todas as ${colunas} colunas`
    : `${chaves.slice(0, 4).map(i => cabecalho[i] || `Coluna ${i+1}`).join(', ')}${chaves.length > 4 ? ` e mais ${chaves.length - 4}` : ''}`;
  const observacoes = [...(fonte.avisos || []), 'A prévia mostra até 20 linhas e 12 colunas. Os arquivos baixados incluem todas as linhas e colunas do resultado.', 'A importação e a limpeza ficam no navegador. Se tocar em Salvar trabalho, os dados e configurações são enviados à sua conta.'];
  if (!r.cabeçalho) observacoes.push('A saída não acrescenta cabeçalhos: a primeira linha original continua sendo dado.');
  if (!r.linhas.length) observacoes.push('Nenhuma linha de dados restou após a limpeza. Confira as opções antes de baixar.');
  return {
    valor: `${numero(r.linhas.length)} linhas limpas`,
    resumo: `De ${numero(tabela.length - (r.cabeçalho ? 1 : 0))} para ${numero(r.linhas.length)}${fonte.aba ? ` · aba ${fonte.aba}` : ''}.`,
    linhas: [['Linhas duplicadas removidas', numero(r.removidas.duplicadas)], ['Linhas vazias removidas', numero(r.removidas.vazias)], ['Colunas preservadas', String(colunas)], ['Comparação de duplicadas', dados.removerDuplicadas === 'sim' ? descricaoChaves : 'Desligada'], ['Ocorrência preservada', dados.manter === 'ultima' ? 'Última' : 'Primeira']],
    tabela: { cabeçalho: cabecalho.slice(0, 12), linhas: r.linhas.slice(0, 20).map(l => l.slice(0, 12)), semExportação: true },
    arquivos: [{ rótulo: 'Baixar CSV completo', gerar: () => baixarCsv(finais, nome) }, { rótulo: 'Baixar XLSX completo', ícone: 'planilha', gerar: () => baixarPlanilha(finais, nome, { aba: 'Dados limpos' }) }],
    observações: observacoes, tabelaCompleta: finais,
  };
}

export default {
  instruções: {
    passos: ['Escolha um XLSX, CSV ou TSV, ou cole as células da planilha. No XLSX, escolha a aba.', 'Configure as limpezas, as colunas que identificam duplicadas e se quer preservar a primeira ou a última ocorrência.', 'Revise as contagens e a amostra. Você pode voltar e ajustar as opções.', 'Confirme e baixe o resultado completo em CSV ou XLSX.'],
    exemplo: { texto: 'Em uma lista de clientes, selecione a coluna e-mail e mantenha a última ocorrência para preservar o cadastro mais recente de cada endereço. Nome, telefone e todas as outras colunas continuam na saída.' },
    limites: 'Até 10 MB por arquivo, 50.000 linhas, 256 colunas, 500.000 células e 5 milhões de caracteres por aba. A primeira linha conta no limite. Importa os valores exibidos de uma aba do XLSX, sem preservar fórmulas, estilos, gráficos ou macros. Arquivos com senha, XLS, ODS e ZIP64 não são aceitos; salve como XLSX simples ou CSV. Importar e limpar não envia os dados; Salvar trabalho envia dados e configurações para a sua conta.',
    perguntas: [{ p: 'Como identifico uma duplicata pelo e-mail?', r: 'Na etapa Configurar, marque somente a coluna e-mail. Todas as demais colunas serão preservadas na linha escolhida. A comparação usa os valores após as limpezas de texto configuradas.' }, { p: 'O que acontece com fórmulas?', r: 'A ferramenta importa os resultados já salvos no arquivo, sem recalcular ou exportar fórmulas. Fórmulas sem resultado salvo ficam vazias e a tela avisa; recalcule e salve o original no Excel antes de importar.' }, { p: 'A primeira linha sempre vira cabeçalho?', r: 'Você escolhe. Se desmarcar a opção, a primeira linha continua sendo dado e a exportação não acrescenta cabeçalhos.' }],
  },
  montar(raiz, ferramenta) {
    let fonte = {};
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Revisar limpeza', demorada: true,
      campos: [
        { nome: 'arquivo', rótulo: 'Arquivo XLSX, CSV ou TSV', tipo: 'file', dica: 'Até 10 MB. Importação no seu aparelho.' },
        { nome: 'conteúdo', rótulo: 'Ou cole os dados aqui', tipo: 'área', linhas: 6, exemplo: 'nome;email\nAna;ana@exemplo.com\nAna;ana@exemplo.com' },
        { nome: 'comCabeçalho', rótulo: 'A primeira linha é o cabeçalho', tipo: 'caixa', padrão: true },
        { nome: 'removerDuplicadas', rótulo: 'Remover linhas duplicadas', tipo: 'caixa', padrão: true },
        { nome: 'colunasChave', rótulo: 'Colunas que identificam uma duplicata', tipo: 'text', padrão: '' },
        { nome: 'manter', rótulo: 'Qual ocorrência preservar', tipo: 'seleção', padrão: 'primeira', opções: [{ valor: 'primeira', rótulo: 'Primeira ocorrência' }, { valor: 'ultima', rótulo: 'Última ocorrência' }] },
        { nome: 'removerVazias', rótulo: 'Remover linhas vazias', tipo: 'caixa', padrão: true },
        { nome: 'aparar', rótulo: 'Aparar espaços nas pontas', tipo: 'caixa', padrão: true },
        { nome: 'espaçosDuplos', rótulo: 'Reduzir espaços repetidos', tipo: 'caixa', padrão: true },
        { nome: 'caixa', rótulo: 'Padronizar maiúsculas e minúsculas', tipo: 'seleção', padrão: 'nenhuma', opções: [{ valor: 'nenhuma', rótulo: 'Não mexer' }, { valor: 'primeira', rótulo: 'Primeira letra maiúscula' }, { valor: 'maiúsculas', rótulo: 'TUDO MAIÚSCULO' }, { valor: 'minúsculas', rótulo: 'tudo minúsculo' }] },
      ],
      calcular: dados => limparNaTela(dados, fonte),
      aoMontar: () => { fonte = ligarEtapasPlanilha(raiz); },
    });
  },
};

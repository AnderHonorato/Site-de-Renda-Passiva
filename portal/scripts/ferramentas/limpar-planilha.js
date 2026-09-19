/** Limpeza de planilha: duplicadas, vazias, espaços e padronização de caixa. */
import { montarFerramenta, texto, ErroDeEntrada, baixarCsv, baixarPlanilha, nomeDeArquivo } from '../núcleo/montador.js';
import { lerCsv, limparTabela, detectarSeparador } from '../cálculos/tabular.js';

const LIMITE_DE_LINHAS = 50000;

export default {
  instruções: {
    passos: [
      'Copie as células direto da sua planilha e cole no campo, ou cole o conteúdo de um arquivo CSV.',
      'Marque o que você quer limpar. Por padrão, remove linhas duplicadas e vazias e apara espaços.',
      'Toque em Limpar. O resumo diz exatamente quantas linhas saíram e por quê.',
      'Baixe em CSV ou em planilha .xlsx e abra de volta no Excel ou no Google Planilhas.',
    ],
    exemplo: {
      texto: 'Uma lista exportada de um sistema com 1.200 linhas costuma voltar com dezenas de repetidas e espaços sobrando. '
        + 'Colar aqui e limpar resolve em um passo, e o arquivo baixado já abre certo com acentos.',
    },
    limites: `Até ${LIMITE_DE_LINHAS.toLocaleString('pt-BR')} linhas. O separador é detectado sozinho `
      + '(ponto e vírgula, vírgula, tabulação ou barra vertical), respeitando aspas e quebras de linha dentro das células. '
      + 'Tudo é processado no seu navegador: o arquivo não é enviado a lugar nenhum. '
      + 'A comparação de duplicadas é feita pela linha inteira, depois das outras limpezas.',
    perguntas: [
      { p: 'Por que o Excel abre o CSV com acentos errados?', r: 'Porque ele espera a marca de codificação no começo do arquivo. O CSV gerado aqui já inclui essa marca, então abre certo. Se ainda assim quiser garantir, baixe o .xlsx.' },
      { p: 'Duplicada é linha inteira igual ou só a primeira coluna?', r: 'Linha inteira. Duas pessoas com o mesmo nome mas telefones diferentes continuam sendo duas linhas.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Limpar',
      demorada: true,
      campos: [
        {
          nome: 'conteúdo', rótulo: 'Cole os dados aqui', tipo: 'área', linhas: 10,
          exemplo: 'nome;email\nAna;ana@exemplo.com\nAna;ana@exemplo.com',
        },
        { nome: 'comCabeçalho', rótulo: 'A primeira linha é o cabeçalho', tipo: 'caixa', padrão: true },
        { nome: 'removerDuplicadas', rótulo: 'Remover linhas duplicadas', tipo: 'caixa', padrão: true },
        { nome: 'removerVazias', rótulo: 'Remover linhas vazias', tipo: 'caixa', padrão: true },
        { nome: 'aparar', rótulo: 'Aparar espaços nas pontas', tipo: 'caixa', padrão: true },
        { nome: 'espaçosDuplos', rótulo: 'Reduzir espaços repetidos', tipo: 'caixa', padrão: true },
        {
          nome: 'caixa', rótulo: 'Padronizar maiúsculas e minúsculas', tipo: 'seleção', padrão: 'nenhuma',
          opções: [
            { valor: 'nenhuma', rótulo: 'Não mexer' },
            { valor: 'primeira', rótulo: 'Primeira Letra Maiúscula' },
            { valor: 'maiúsculas', rótulo: 'TUDO MAIÚSCULO' },
            { valor: 'minúsculas', rótulo: 'tudo minúsculo' },
          ],
        },
      ],
      calcular(dados) {
        const conteúdo = texto(dados, 'conteúdo', { rótulo: 'Dados', máximo: 5000000 });
        const separador = detectarSeparador(conteúdo);
        const tabela = lerCsv(conteúdo, { separador });

        if (tabela.length === 0) throw new ErroDeEntrada('Não encontrei dados no que foi colado.', 'conteúdo');
        if (tabela.length > LIMITE_DE_LINHAS) {
          throw new ErroDeEntrada(
            `São ${tabela.length.toLocaleString('pt-BR')} linhas e o limite é ${LIMITE_DE_LINHAS.toLocaleString('pt-BR')}. Divida o arquivo em partes.`,
            'conteúdo',
          );
        }

        const r = limparTabela(tabela, {
          comCabeçalho: dados.comCabeçalho === 'sim',
          removerDuplicadas: dados.removerDuplicadas === 'sim',
          removerVazias: dados.removerVazias === 'sim',
          aparar: dados.aparar === 'sim',
          espaçosDuplos: dados.espaçosDuplos === 'sim',
          caixa: dados.caixa,
        });

        const cabeçalho = r.cabeçalho ?? r.linhas[0]?.map((_, i) => `Coluna ${i + 1}`) ?? [];
        const linhasFinais = [cabeçalho, ...r.linhas];
        const nome = nomeDeArquivo('planilha-limpa');
        const amostra = r.linhas.slice(0, 20);

        const nomeDoSeparador = { ';': 'ponto e vírgula', ',': 'vírgula', '\t': 'tabulação', '|': 'barra vertical' }[separador];

        return {
          valor: `${r.linhas.length.toLocaleString('pt-BR')} linhas limpas`,
          resumo: `De ${(tabela.length - (r.cabeçalho ? 1 : 0)).toLocaleString('pt-BR')} para ${r.linhas.length.toLocaleString('pt-BR')} · separador detectado: ${nomeDoSeparador}.`,
          linhas: [
            ['Linhas duplicadas removidas', r.removidas.duplicadas.toLocaleString('pt-BR')],
            ['Linhas vazias removidas', r.removidas.vazias.toLocaleString('pt-BR')],
            ['Colunas', String(cabeçalho.length)],
            ['Linhas no resultado', r.linhas.length.toLocaleString('pt-BR')],
          ],
          tabela: { cabeçalho, linhas: amostra, semExportação: true },
          arquivos: [
            { rótulo: 'Baixar CSV', gerar: () => baixarCsv(linhasFinais, nome) },
            { rótulo: 'Baixar planilha', ícone: 'planilha', gerar: () => baixarPlanilha(linhasFinais, nome, { aba: 'Dados limpos' }) },
          ],
          observações: [
            amostra.length < r.linhas.length
              ? `A tabela na tela mostra as primeiras ${amostra.length} linhas. Os arquivos trazem todas as ${r.linhas.length.toLocaleString('pt-BR')}.`
              : 'Nada foi enviado a servidor: a limpeza aconteceu no seu navegador.',
          ],
        };
      },
    });
  },
};

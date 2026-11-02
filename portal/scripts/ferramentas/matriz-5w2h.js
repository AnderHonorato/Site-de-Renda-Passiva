/** Plano 5W2H compacto com exportação PDF e tabela CSV/XLSX. */
import { montarFerramenta, texto, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { pdfDoResumo } from './auxiliares/resumo-de-custos.js';

const perguntas = Object.freeze([
  ['oQue', 'O quê (What)'], ['porQue', 'Por quê (Why)'],
  ['quem', 'Quem (Who)'], ['quando', 'Quando (When)'],
  ['onde', 'Onde (Where)'], ['como', 'Como (How)'],
  ['quanto', 'Quanto custa (How much)'],
]);

export function organizar5W2H(dados) {
  const respostas = perguntas.map(([campo, rotulo]) => [
    rotulo,
    texto(dados, campo, { rótulo: rotulo, máximo: campo === 'como' ? 800 : 300 }),
  ]);
  return { respostas, objetivo: respostas[0][1], responsavel: respostas[2][1] };
}

export function calcular5W2HNaTela(dados) {
  const resultado = organizar5W2H(dados);
  const tabela = { cabeçalho: ['Pergunta', 'Resposta'], linhas: resultado.respostas };
  const observações = [
    'O campo “Quanto custa” é uma estimativa declarada, não uma cotação nem cálculo financeiro.',
    'O plano não cria compromissos em calendário nem dispara tarefas a outras pessoas.',
  ];
  return {
    valor: 'Plano 5W2H organizado',
    resumo: resultado.objetivo,
    linhas: [['Responsável', resultado.responsavel], ['Etapas respondidas', '7 de 7']],
    tabela, observações,
    texto: ['Plano 5W2H', ...resultado.respostas.map(([p, r]) => p + ': ' + r), ...observações].join('\n'),
    arquivos: [{
      rótulo: 'Plano em PDF', ícone: 'documento',
      gerar: () => baixar(pdfDoResumo({
        título: 'Plano de ação 5W2H', subtítulo: resultado.objetivo,
        destaque: ['Responsável', resultado.responsavel],
        resultados: [['Perguntas respondidas', '7 de 7']],
        dados: resultado.respostas, conta: observações,
      }), nomeDeArquivo('plano-5w2h') + '.pdf', 'application/pdf'),
    }],
  };
}

export default {
  instruções: {
    passos: [
      'Defina o que será realizado e por que a ação é importante.',
      'Preencha responsável, prazo ou data, local e como a tarefa será executada.',
      'Informe o custo estimado. Se não souber, escreva “A definir”, sem inventar valores.',
      'Gere o plano e copie ou exporte o documento em PDF, CSV ou Excel.',
    ],
    exemplo: { texto: 'O quê: reorganizar o estoque; Por quê: reduzir erros; Quem: equipe de expedição; Quando: até o fim do mês; Onde: depósito; Como: separar prateleiras por SKU; Quanto: a definir.' },
    limites: 'As sete respostas são obrigatórias. Valores e prazos são informações escritas por você, sem validação fiscal nem integração com sistemas. Processamento local no navegador.',
    perguntas: [
      { p: 'Preciso informar valor numérico?', r: 'Não. “Quanto custa” aceita valor ou texto como “A definir”.' },
      { p: 'O plano é enviado para alguém?', r: 'Não. Você pode baixar e compartilhar o arquivo quando desejar.' },
    ],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Montar plano',
      campos: [
        { nome: 'oQue', rótulo: 'O quê?', padrão: 'Reorganizar o estoque' },
        { nome: 'porQue', rótulo: 'Por quê?', padrão: 'Reduzir erros de separação' },
        { nome: 'quem', rótulo: 'Quem?', padrão: 'Equipe de expedição' },
        { nome: 'quando', rótulo: 'Quando?', padrão: 'Até o final do mês' },
        { nome: 'onde', rótulo: 'Onde?', padrão: 'Depósito' },
        { nome: 'como', rótulo: 'Como?', tipo: 'área', linhas: 3, padrão: 'Organizar prateleiras por SKU' },
        { nome: 'quanto', rótulo: 'Quanto custa?', padrão: 'A definir' },
      ], calcular: calcular5W2HNaTela,
    });
  },
};

/** Matriz de Eisenhower: classificação local para priorização de tarefas. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { pdfDoResumo } from './auxiliares/resumo-de-custos.js';

const quadrantes = [
  { chave: 'fazer', nome: '1. Fazer agora', breve: 'Urgente e importante' },
  { chave: 'planejar', nome: '2. Planejar', breve: 'Importante, não urgente' },
  { chave: 'delegar', nome: '3. Delegar ou negociar', breve: 'Urgente, não importante' },
  { chave: 'reavaliar', nome: '4. Reavaliar ou eliminar', breve: 'Nem urgente, nem importante' },
];

function booleano(valor, indice) {
  const normal = String(valor ?? '').trim().toLocaleLowerCase('pt-BR');
  if (['sim', 's', '1'].includes(normal)) return true;
  if (['não', 'nao', 'n', '0'].includes(normal)) return false;
  throw new ErroDeEntrada('Linha ' + indice + ': informe sim ou não para urgente e importante.', 'tarefas');
}

export function classificarEisenhower(itens) {
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > 80) {
    throw new ErroDeEntrada('Informe de 1 a 80 tarefas.', 'tarefas');
  }
  const nomes = new Set();
  const resultado = itens.map((it, indice) => {
    if (!it || typeof it.nome !== 'string' || it.nome.trim().length < 2 || it.nome.length > 120) {
      throw new ErroDeEntrada('Linha ' + (indice+1) + ': tarefa com 2 a 120 caracteres.', 'tarefas');
    }
    if (typeof it.urgente !== 'boolean' || typeof it.importante !== 'boolean') {
      throw new ErroDeEntrada('Linha ' + (indice+1) + ': urgente e importante devem ser sim ou não.', 'tarefas');
    }
    const chave = it.nome.trim().toLocaleLowerCase('pt-BR');
    if (nomes.has(chave)) throw new ErroDeEntrada('Tarefa repetida na linha ' + (indice+1) + '.', 'tarefas');
    nomes.add(chave);
    const grupo = it.importante ? (it.urgente ? 'fazer' : 'planejar') :
      (it.urgente ? 'delegar' : 'reavaliar');
    return { ...it, nome: it.nome.trim(), grupo, índice: indice };
  });
  const ordenados = [...resultado].sort((a,b) =>
    quadrantes.findIndex(q=>q.chave===a.grupo) - quadrantes.findIndex(q=>q.chave===b.grupo) ||
    a.índice - b.índice);
  return { itens: ordenados, grupos: quadrantes.map(q=>({ ...q,
    quantidade: resultado.filter(it=>it.grupo===q.chave).length })) };
}

export function calcularEisenhowerNaTela(dados) {
  const linhas = String(dados.tarefas ?? '').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if (linhas.length < 1 || linhas.length > 80) throw new ErroDeEntrada('Informe de 1 a 80 tarefas.', 'tarefas');
  const itens = linhas.map((linha,indice) => {
    const p=linha.split(';').map(x=>x.trim());
    if (p.length !== 3) throw new ErroDeEntrada('Linha ' + (indice+1) + ': use tarefa; urgente; importante.', 'tarefas');
    return { nome: p[0], urgente: booleano(p[1],indice+1), importante: booleano(p[2],indice+1) };
  });
  const r=classificarEisenhower(itens);
  const tabela={cabeçalho:['Quadrante','Tarefa','Urgente','Importante'],
    linhas:r.itens.map(it=>[
      quadrantes.find(q=>q.chave===it.grupo).nome, it.nome,
      it.urgente?'Sim':'Não', it.importante?'Sim':'Não'])};
  const linhasResumo=r.grupos.map(q=>[q.nome, q.quantidade + ' tarefa(s)']);
  const observações=[
    'A classificação usa as respostas de urgência e importância fornecidas. Não avalia automaticamente o contexto de trabalho.',
    'Delegar é uma sugestão de priorização, não uma ação automática; tarefas podem exigir responsabilidade pessoal.',
    'Antes de eliminar ou adiar uma tarefa, verifique exigências legais, contratuais e prazos reais.',
  ];
  return { valor: r.itens.length+' tarefa(s) classificadas',
    resumo: 'Organizadas nos quatro quadrantes por urgência e importância.',
    linhas:linhasResumo,tabela,observações,
    texto:['Matriz de Eisenhower',...linhasResumo.map(([k,v])=>k+': '+v),
      tabela.cabeçalho.join('; '),...tabela.linhas.map(x=>x.join('; ')),...observações].join('\n'),
    arquivos:[{rótulo:'Matriz em PDF',ícone:'documento',
      gerar:()=>baixar(pdfDoResumo({
        título:'Matriz de Eisenhower',subtítulo:'Priorização de tarefas',
        destaque:['Tarefas classificadas',String(r.itens.length)],
        resultados:linhasResumo,
        dados:r.itens.map(it=>[it.nome,quadrantes.find(q=>q.chave===it.grupo).nome]),
        conta:observações,
      }),nomeDeArquivo('matriz-eisenhower')+'.pdf','application/pdf')}],
  };
}

export default {
  instruções:{
    passos:[
      'Escreva uma tarefa por linha: nome; urgente (sim/não); importante (sim/não).',
      'Avalie as duas perguntas independentemente para cada tarefa.',
      'Calcule para reunir as ações em Fazer, Planejar, Delegar/negociar e Reavaliar.',
      'Copie a matriz ou baixe PDF, CSV e Excel para organizar o dia.',
    ],
    exemplo:{texto:'Corrigir site fora do ar; sim; sim entra em Fazer. Preparar curso; não; sim entra em Planejar. Notificação secundária; não; não entra em Reavaliar.'},
    limites:'Até 80 tarefas e sem repetição de nome. A análise depende da sua avaliação de urgência/importância, não elimina atividades automaticamente e não cria agenda. Processamento no navegador.',
    perguntas:[
      {p:'É obrigatório delegar tudo que é urgente e não importante?',r:'Não. O quadrante é um alerta para avaliar possibilidade de delegar ou renegociar.'},
      {p:'O que determina a prioridade?',r:'A combinação das respostas “urgente” e “importante” que você fornece.'},
    ],
  },
  montar(raiz,ferramenta) {
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Classificar tarefas',
      campos:[{nome:'tarefas',rótulo:'Tarefas e prioridades',tipo:'área',linhas:7,
        padrão:'Corrigir site fora do ar; sim; sim\nPreparar curso; não; sim\nResponder aviso secundário; sim; não\nArquivar referência antiga; não; não',
        dica:'Uma linha por tarefa: nome; urgente sim/não; importante sim/não.'}],
      calcular:calcularEisenhowerNaTela,
    });
  },
};

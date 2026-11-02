/** Conversão entre etapas de funil, com tabela e barras textuais acessíveis. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const n=(valor,casas=2)=>formatarNúmero(valor,{casas});

export function analisarFunil(etapas) {
  if (!Array.isArray(etapas)||etapas.length<2||etapas.length>20)
    throw new ErroDeEntrada('Informe de 2 a 20 etapas ordenadas.', 'etapas');
  const nomes=new Set();let anterior=null;
  const calculadas=etapas.map((e,i)=>{
    if(typeof e.nome!=='string'||e.nome.trim().length<2||e.nome.length>80)
      throw new ErroDeEntrada('Linha '+(i+1)+': nome com 2 a 80 caracteres.','etapas');
    const chave=e.nome.trim().toLocaleLowerCase('pt-BR');
    if(nomes.has(chave))throw new ErroDeEntrada('Linha '+(i+1)+': etapa repetida.','etapas');
    nomes.add(chave);
    if(!Number.isSafeInteger(e.pessoas)||e.pessoas<0||e.pessoas>100_000_000)
      throw new ErroDeEntrada('Linha '+(i+1)+': quantidade inteira entre zero e cem milhões.','etapas');
    if(i===0&&e.pessoas===0)throw new ErroDeEntrada('A primeira etapa deve ter ao menos uma pessoa.','etapas');
    if(anterior!==null&&e.pessoas>anterior)
      throw new ErroDeEntrada('Linha '+(i+1)+': em um funil de mesma coorte, a etapa não pode superar a anterior.','etapas');
    const taxaAnterior=anterior===null?1:anterior===0?null:e.pessoas/anterior;
    const retorno={nome:e.nome.trim(),pessoas:e.pessoas,indice:i,
      taxaAnterior, taxaInicial:e.pessoas/etapas[0].pessoas,
      perdidas:anterior===null?0:anterior-e.pessoas};
    anterior=e.pessoas;
    return retorno;
  });
  let pior=null;
  for(const e of calculadas.slice(1)){
    if(e.taxaAnterior===null)continue;
    if(pior===null||e.taxaAnterior<pior.taxaAnterior)pior=e;
  }
  return {etapas:calculadas,conversaoTotal:calculadas.at(-1).pessoas/etapas[0].pessoas,
    entradas:etapas[0].pessoas,fechadas:calculadas.at(-1).pessoas,
    gargalo:pior};
}

export function calcularFunilNaTela(dados){
  const linhas=String(dados.etapas??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(linhas.length<2||linhas.length>20)throw new ErroDeEntrada('Informe de 2 a 20 etapas.', 'etapas');
  const etapas=linhas.map((linha,i)=>{
    const p=linha.split(';').map(s=>s.trim());
    if(p.length!==2)throw new ErroDeEntrada('Linha '+(i+1)+': etapa; pessoas.','etapas');
    return {nome:p[0],pessoas:paraNúmero(p[1])};
  });
  const r=analisarFunil(etapas);
  const barra=x=>'█'.repeat(Math.min(20,Math.round(x*20)));
  const tabela={cabeçalho:['Etapa','Pessoas','Conversão anterior','Desde o início','Perdidas','Representação'],
    linhas:r.etapas.map(x=>[x.nome,n(x.pessoas,0),
      x.taxaAnterior===null?'Não calculável':n(100*x.taxaAnterior)+'%',
      n(100*x.taxaInicial)+'%',n(x.perdidas,0),barra(x.taxaInicial)])};
  const obs=[
    'Taxa entre etapas = pessoas nesta etapa ÷ pessoas da etapa anterior. Conversão geral = última ÷ primeira etapa.',
    'Todos os valores precisam acompanhar a MESMA coorte. A etapa seguinte não pode ter mais pessoas do que a anterior.',
    'Se a etapa anterior for zero, a taxa condicional é não calculável, não zero.',
    'O maior gargalo é a etapa com menor conversão condicional válida, não necessariamente a maior perda absoluta.',
    'Nenhum lead, cliente ou valor é enviado a sistemas de vendas; os cálculos usam apenas os números informados.',
  ];
  const linhasResumo=[
    ['Leads iniciais',n(r.entradas,0)],['Na última etapa',n(r.fechadas,0)],
    ['Conversão total',n(r.conversaoTotal*100)+'%'],
    ['Gargalo pela taxa entre etapas',r.gargalo?r.gargalo.nome:'Sem etapa comparável'],
  ];
  return {valor:n(r.conversaoTotal*100)+'%',
    resumo:'Conversão da primeira até a última etapa.',
    linhas:linhasResumo,tabela,observações:obs,
    texto:['Funil de vendas',...linhasResumo.map(([a,b])=>a+': '+b),
      tabela.cabeçalho.join('; '),...tabela.linhas.map(x=>x.join('; ')),...obs].join('\n')};
}

export default{
  instruções:{
    passos:[
      'Informe uma etapa por linha, na ordem do funil: nome; quantidade de pessoas.',
      'Use números da mesma coorte ou campanha, sem misturar períodos e origens.',
      'Confira taxa de passagem, conversão acumulada e o ponto com menor taxa.',
      'Copie os resultados ou exporte a tabela em CSV e Excel.',
    ],
    exemplo:{texto:'Visitantes; 1000, Leads; 200, Propostas; 40, Vendas; 10: conversão total de 1%. A taxa de Leads para Propostas é 20%.'},
    limites:'Até 20 etapas. A primeira deve ter ao menos uma pessoa; a quantidade de pessoas não pode aumentar de etapa para etapa. É análise de uma coorte, não previsão e não capta negócios que entram no meio do funil.',
    perguntas:[
      {p:'Por que uma etapa não pode ter mais contatos que a anterior?',r:'A ferramenta assume a mesma coorte fluindo de uma etapa para a seguinte. Novas entradas devem ser analisadas separadamente.'},
      {p:'Uma taxa com zero pessoas na etapa anterior vale zero?',r:'Não: não existe denominador positivo, então mostramos “Não calculável”.'},
    ],
  },
  montar(raiz,ferramenta){
    montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Analisar conversões',
      campos:[{nome:'etapas',rótulo:'Etapas do funil',tipo:'área',linhas:7,
        padrão:'Visitantes; 1000\nLeads; 200\nPropostas; 40\nVendas; 10',
        dica:'Uma linha por etapa: nome; quantidade na mesma coorte.'}],
      calcular:calcularFunilNaTela});
  },
};

/** Curva ABC de faturamento ou quantidades, sem dados externos ou classificação enganosa de extremos. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
const n=(v,casas=2)=>formatarNúmero(v,{casas});

export function classificarCurvaABC(itens) {
  if (!Array.isArray(itens)||itens.length<2||itens.length>150) {
    throw new ErroDeEntrada('Informe de 2 a 150 produtos.', 'produtos');
  }
  const total = itens.reduce((s,it,i)=>{
    if(typeof it.nome!=='string'||!it.nome.trim()||it.nome.length>90)
      throw new ErroDeEntrada('Linha '+(i+1)+': nome entre 1 e 90 caracteres.', 'produtos');
    if(!Number.isFinite(it.valor)||it.valor<0||it.valor>100_000_000)
      throw new ErroDeEntrada('Linha '+(i+1)+': valor entre zero e 100 milhões.', 'produtos');
    return s+it.valor;
  },0);
  if(total<=0||total>1_000_000_000)
    throw new ErroDeEntrada('O total precisa ser positivo e não ultrapassar um bilhão.', 'produtos');
  const nomes=new Set();
  for(const item of itens){
    const chave=item.nome.trim().toLocaleLowerCase('pt-BR');
    if(nomes.has(chave))throw new ErroDeEntrada('Produto repetido: '+item.nome+'. Consolide suas linhas.', 'produtos');
    nomes.add(chave);
  }
  const ordenados=itens.map((it,i)=>({...it,indice:i}))
    .sort((a,b)=>b.valor-a.valor||a.indice-b.indice);
  let acumulado=0;
  const classes={A:0,B:0,C:0};
  const classificado=ordenados.map((it)=>{
    const anterior=acumulado/total*100;
    // O item que cruza o limite integra a classe anterior (evita classificar o principal item como B).
    const classe=anterior<80?'A':anterior<95?'B':'C';
    acumulado+=it.valor;classes[classe]+=1;
    return {...it,participacao:it.valor/total*100,acumulado:acumulado/total*100,classe};
  });
  return { total,classes,itens:classificado };
}

export function calcularCurvaABCNaTela(dados) {
  const linhas=String(dados.produtos??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(linhas.length<2||linhas.length>150)throw new ErroDeEntrada('Informe de 2 a 150 produtos.', 'produtos');
  const itens=linhas.map((linha,i)=>{
    const partes=linha.split(';').map(x=>x.trim());
    if(partes.length!==2)throw new ErroDeEntrada('Linha '+(i+1)+': use produto; valor no período.', 'produtos');
    return {nome:partes[0],valor:paraNúmero(partes[1])};
  });
  const r=classificarCurvaABC(itens);
  const tipo=dados.tipo==='quantidade'?'Quantidade movimentada':'Valor vendido (R$)';
  if(!['valor','quantidade'].includes(dados.tipo))
    throw new ErroDeEntrada('Escolha entre valor vendido e quantidade movimentada.', 'tipo');
  if(dados.tipo==='quantidade'&&r.itens.some((it)=>!Number.isInteger(it.valor)))
    throw new ErroDeEntrada('Quantidade movimentada precisa ser um inteiro em cada linha.', 'produtos');
  const tabela={cabeçalho:['Produto',tipo,'Participação','Acumulado','Classe'],
    linhas:r.itens.map((it)=>[it.nome,n(it.valor),n(it.participacao)+'%',n(it.acumulado)+'%',it.classe])};
  const resumo=[
    ['Total informado',n(r.total)+(dados.tipo==='quantidade'?' unidades':' (R$)')],
    ['Classe A',String(r.classes.A)+' produto(s)'],
    ['Classe B',String(r.classes.B)+' produto(s)'],
    ['Classe C',String(r.classes.C)+' produto(s)'],
  ];
  const obs=[
    'A classificação ordena por maior contribuição e acumula a participação no total.',
    'Classes: A inclui os produtos até ultrapassar 80% acumulado; B, até ultrapassar 95%; C, os demais.',
    'O produto que cruza um limite entra na classe anterior. Em casos concentrados, A pode representar bem mais que 80%.',
    'Use a MESMA métrica para todos os produtos. Valor vendido e quantidade não são intercambiáveis.',
    'O resultado mostra concentração, não margem, lucratividade ou necessidade automática de reposição.',
  ];
  return {valor:n(r.classes.A,0)+' produto(s) A',resumo:'ABC de '+r.itens.length+' produtos.',
    linhas:resumo,tabela,observações:obs,
    texto:['Curva ABC — '+tipo,...resumo.map(([a,b])=>a+': '+b),
      tabela.cabeçalho.join('; '),...tabela.linhas.map(l=>l.join('; ')),...obs].join('\n')};
}

export default {
 instruções:{
  passos:[
    'Escolha se o ranking será por valor vendido ou quantidade movimentada.',
    'Cole os produtos no formato nome; valor total do período, uma linha por produto.',
    'Calcule para ordenar os produtos do maior para o menor e medir a participação acumulada.',
    'Compare as classes A, B e C e baixe a tabela em CSV ou Excel.',
  ],
  exemplo:{texto:'Produtos A 800, B 150 e C 50 somam 1.000. O produto A representa 80%, B 15% e C 5%. A classe é definida pela participação acumulada ANTES de cada produto.'},
  limites:'Até 150 produtos distintos, valores até R$ 100 milhões por item (ou unidades inteiras para quantidades). A curva usa faixas usuais de 80% e 95% e aloca o item que cruza o limite na classe anterior; outras metodologias podem variar. Cálculo local.',
  perguntas:[
    {p:'Qual a diferença entre ranking por valor e por quantidade?',r:'Por valor, produtos caros podem liderar. Por quantidade, lideram os que mais saíram. Escolha a métrica adequada.'},
    {p:'Produtos A são necessariamente os mais lucrativos?',r:'Não. Vendas e quantidades não medem margem nem lucro.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Classificar produtos',
   campos:[
    {nome:'tipo',rótulo:'Critério de análise',tipo:'seleção',padrão:'valor',opções:[
      {valor:'valor',rótulo:'Valor vendido no período (R$)'},
      {valor:'quantidade',rótulo:'Quantidade de unidades movimentadas'},
    ]},
    {nome:'produtos',rótulo:'Produtos e valor no período',tipo:'área',linhas:7,
      padrão:'Produto A; 800\nProduto B; 150\nProduto C; 50',
      dica:'Uma linha por produto: nome; valor total (ou quantidade, conforme o critério).'},
   ],calcular:calcularCurvaABCNaTela});
 },
};

/** Conferência de pedido: compara referências e quantidades sem API nem dados de cliente. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export function lerItensConferencia(texto, campo, { vazioPermitido = false } = {}) {
  const linhas=String(texto??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if ((!linhas.length && !vazioPermitido)||linhas.length>150)
    throw new ErroDeEntrada('Informe de '+(vazioPermitido?'0':'1')+' a 150 linhas.',campo);
  const mapa=new Map();
  for(const [indice,linha] of linhas.entries()){
    const partes=linha.split(';').map(x=>x.trim());
    if(partes.length!==2||!partes[0]||partes[0].length>80)
      throw new ErroDeEntrada('Linha '+(indice+1)+': use SKU ou nome; quantidade.',campo);
    const quantidade=paraNúmero(partes[1]);
    if(!Number.isSafeInteger(quantidade)||quantidade<1||quantidade>1_000_000)
      throw new ErroDeEntrada('Linha '+(indice+1)+': quantidade inteira de 1 a 1.000.000.',campo);
    const chave=partes[0].toLocaleUpperCase('pt-BR').replace(/\s+/g,' ');
    const anterior=mapa.get(chave);
    if(anterior)anterior.quantidade+=quantidade;
    else mapa.set(chave,{referencia:partes[0],quantidade});
    if(mapa.get(chave).quantidade>1_000_000_000)throw new ErroDeEntrada('Total por referência excedeu 1 bilhão.',campo);
  }
  return mapa;
}

export function conferirPedido({pedido,separado}){
  if(!(pedido instanceof Map)||pedido.size===0||!(separado instanceof Map))
    throw new ErroDeEntrada('Informe um pedido com referências e quantidades.','pedido');
  const chaves=[...new Set([...pedido.keys(),...separado.keys()])];
  let faltantes=0,excedentes=0,corretas=0;
  const itens=chaves.map(chave=>{
    const esperado=pedido.get(chave)?.quantidade??0;
    const recebido=separado.get(chave)?.quantidade??0;
    const falta=Math.max(0,esperado-recebido);
    const sobra=Math.max(0,recebido-esperado);
    faltantes+=falta;excedentes+=sobra;
    if(falta===0&&sobra===0)corretas++;
    return {referencia:pedido.get(chave)?.referencia??separado.get(chave).referencia,
      esperado,recebido,falta,sobra,
      situacao:falta?'Falta '+falta:sobra?(esperado?'Sobra '+sobra:'Item não pedido'):'Conferido'};
  });
  return {itens,corretas,faltantes,excedentes,aprovado:faltantes===0&&excedentes===0};
}
export function calcularConferenciaNaTela(dados){
  const r=conferirPedido({pedido:lerItensConferencia(dados.pedido,'pedido'),
    separado:lerItensConferencia(dados.separado,'separado',{vazioPermitido:true})});
  const tabela={cabeçalho:['Referência','Pedido','Separado','Falta','Sobra','Situação'],
    linhas:r.itens.map(x=>[x.referencia,String(x.esperado),String(x.recebido),
      String(x.falta),String(x.sobra),x.situacao])};
  const linhas=[['Referências conferidas',String(r.itens.length)],['Referências corretas',String(r.corretas)],
    ['Unidades faltantes',formatarNúmero(r.faltantes,{casas:0})],
    ['Unidades excedentes',formatarNúmero(r.excedentes,{casas:0})]];
  const obs=[
    'Cada linha é identificada por SKU ou nome: acentos são preservados e letras maiúsculas/minúsculas não diferenciam a referência.',
    'Linhas com o mesmo SKU são somadas antes de conferir. Itens não pedidos aparecem como excedentes.',
    'A ferramenta compara somente os dados colados, não confirma separação física, qualidade, nota fiscal ou expedição real.',
    'Revise toda divergência antes de despachar.',
  ];
  return {valor:r.aprovado?'Pedido conferido':'Divergências encontradas',
    resumo:r.aprovado?'Todos os itens e quantidades coincidem.':
      formatarNúmero(r.faltantes,{casas:0})+' unidades faltantes e '+formatarNúmero(r.excedentes,{casas:0})+' excedentes.',
    linhas,tabela,observações:obs,texto:['Conferência de pedido',...linhas.map(([a,b])=>a+': '+b),
      tabela.cabeçalho.join('; '),...tabela.linhas.map(x=>x.join('; ')),...obs].join('\n')};
}
export default {
 instruções:{
  passos:[
    'Cole a lista original: uma linha por SKU ou nome seguida de ponto e vírgula e quantidade.',
    'Cole a lista de itens realmente separados no mesmo formato (pode ficar vazia se nada foi separado).',
    'Calcule para ver referências conferidas, unidades faltantes e excedentes.',
    'Analise a tabela e copie ou exporte CSV/Excel antes de liberar a expedição.',
  ],
  exemplo:{texto:'Pedido: SKU-A; 3 e SKU-B; 2. Separação: SKU-A; 2 e SKU-B; 4. Resultado: falta 1 de A e sobram 2 de B.'},
  limites:'Até 150 linhas por lista; quantidades inteiras positivas. Duplicatas são consolidadas pelo nome ou SKU, sem consultar ERP. O relatório serve de apoio e não substitui a conferência física.',
  perguntas:[
    {p:'Se um item foi separado e não está no pedido?',r:'Ele aparece na tabela como “Item não pedido” e conta como excedente.'},
    {p:'Posso comparar uma lista completamente vazia?',r:'A lista de pedido deve ter itens; a separação pode estar vazia para mostrar tudo que ainda falta.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Conferir pedido',
   campos:[
    {nome:'pedido',rótulo:'Itens pedidos',tipo:'área',linhas:6,padrão:'SKU-A; 3\nSKU-B; 2',
      dica:'Uma linha por produto: SKU ou nome; quantidade.'},
    {nome:'separado',rótulo:'Itens separados',tipo:'área',linhas:6,padrão:'SKU-A; 2\nSKU-B; 4',
      dica:'Mesma referência e formato da lista original.'},
   ],calcular:calcularConferenciaNaTela});
 },
};

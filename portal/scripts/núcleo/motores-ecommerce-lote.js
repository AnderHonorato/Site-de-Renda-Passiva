/** F247–F251 — cálculos locais de operações e-commerce, sem envio de dados. */
export const DEFINICOES={
  "auditoria-margem-marketplace": {
    "id": "F247",
    "nome": "Auditoria de margem por marketplace",
    "exemplo": "sku;preco;cmv;comissao_pct;tarifa_fixa;frete_subsidiado;ads;imposto_pct\nCAM-01;120;55;16;4;12;8;6\nBON-02;80;32;14;3;7;4;6",
    "resumo": "Margem por SKU descontando comissão, tarifa fixa, frete, Ads e tributos."
  },
  "simulador-devolucoes": {
    "id": "F248",
    "nome": "Simulador de custos de devoluções",
    "exemplo": "sku;pedidos;taxa_devolucao_pct;frete_reverso;custo_inspecao;perda_produto\nCAM-01;200;8;18;5;12\nBON-02;150;4;12;4;6",
    "resumo": "Estima custo esperado de devoluções por SKU e por período."
  },
  "analise-ponto-equilibrio-canais": {
    "id": "F249",
    "nome": "Ponto de equilíbrio por canal de vendas",
    "exemplo": "canal;preco_medio;custo_variavel;despesa_fixa\nSite;120;75;6000\nMarketplace;110;80;4500",
    "resumo": "Calcula quantas vendas são necessárias para cobrir custos fixos por canal."
  },
  "simulador-reajuste-fornecedor": {
    "id": "F250",
    "nome": "Simulador de reajuste de fornecedores",
    "exemplo": "sku;custo_atual;reajuste_pct;preco_venda;taxas_pct\nCAM-01;50;12;100;15\nBON-02;30;8;65;12",
    "resumo": "Compara a contribuição unitária antes e depois de reajustes de compra."
  },
  "planejamento-meta-roas": {
    "id": "F251",
    "nome": "Planejamento de ROAS e CPA de campanhas",
    "exemplo": "campanha;investimento;receita;pedidos;meta_roas\nPesquisa;1500;6000;50;4\nSocial;900;2700;30;3,5",
    "resumo": "Calcula ROAS, CPA e diferença de receita para a meta por campanha."
  }
};
const COLUNAS={
 'auditoria-margem-marketplace':['sku','preco','cmv','comissao_pct','tarifa_fixa','frete_subsidiado','ads','imposto_pct'],
 'simulador-devolucoes':['sku','pedidos','taxa_devolucao_pct','frete_reverso','custo_inspecao','perda_produto'],
 'analise-ponto-equilibrio-canais':['canal','preco_medio','custo_variavel','despesa_fixa'],
 'simulador-reajuste-fornecedor':['sku','custo_atual','reajuste_pct','preco_venda','taxas_pct'],
 'planejamento-meta-roas':['campanha','investimento','receita','pedidos','meta_roas']
};
const dinheiro=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});
const arred=n=>Math.round((n+Number.EPSILON)*100)/100;
function numero(v){
 let s=String(v).trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
 else s=s.replace(',','.');
 if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s))throw Error('Número inválido: '+String(v).slice(0,30));
 const n=Number(s);if(!Number.isFinite(n)||n<0||n>1e9)throw Error('Número fora do limite.');
 return n;
}
export function calcularLote(slug,entrada){
 const colunas=COLUNAS[slug];if(!colunas)throw Error('Ferramenta desconhecida.');
 if(typeof entrada!=='string'||entrada.length>100000)throw Error('Arquivo vazio ou maior que 100 KB.');
 const linhas=entrada.trim().split(/\r?\n/);
 if(linhas.length<2||linhas.length>501)throw Error('Informe entre 1 e 500 registros.');
 const cab=linhas.shift().split(';').map(s=>s.trim().toLowerCase());
 if(cab.join('|')!==colunas.join('|'))throw Error('Cabeçalho inválido. Use o exemplo como modelo.');
 const vistos=new Set(),saida=[];let total=0;let investimentoTotal=0,receitaTotal=0;let pedidosTotal=0;let abaixoMeta=0;const alertas=[];
 for(const [i,linha] of linhas.entries()){
  const partes=linha.split(';');if(partes.length!==colunas.length)throw Error('Linha '+(i+2)+': quantidade incorreta de colunas.');
  const nome=partes[0].trim();if(!nome||nome.length>80||vistos.has(nome))throw Error('Identificador vazio, longo ou repetido na linha '+(i+2)+'.');
  vistos.add(nome);
  const v=partes.slice(1).map(numero);let resultado,detalhe;
  switch(slug){
   case 'auditoria-margem-marketplace':{
    const [preco,cmv,comissao,tarifa,frete,ads,imposto]=v;
    if(comissao>100||imposto>100)throw Error('Percentuais não podem superar 100.');
    resultado=preco-cmv-preco*(comissao+imposto)/100-tarifa-frete-ads;
    detalhe=preco?arred(resultado/preco*100)+'% de margem':'Sem receita';if(resultado<0){abaixoMeta++;alertas.push(nome+': contribuição negativa');}break;
   }
   case 'simulador-devolucoes':{
    const [pedidos,taxa,frete,inspecao,perda]=v;
    if(!Number.isInteger(pedidos)||taxa>100)throw Error('Pedidos devem ser inteiros e taxa até 100%.');
    resultado=pedidos*taxa/100*(frete+inspecao+perda);
    detalhe=arred(pedidos*taxa/100)+' devoluções esperadas';pedidosTotal+=pedidos;if(taxa>20){abaixoMeta++;alertas.push(nome+': devolução acima de 20%');}break;
   }
   case 'analise-ponto-equilibrio-canais':{
    const [preco,custo,fixo]=v;const margem=preco-custo;
    if(margem<=0)throw Error('Preço precisa superar custo variável para existir equilíbrio.');
    resultado=Math.ceil(fixo/margem);detalhe='Margem unitária '+dinheiro(margem)+' · receita de equilíbrio '+dinheiro(resultado*preco);break;
   }
   case 'simulador-reajuste-fornecedor':{
    const [custo,reajuste,preco,taxas]=v;
    if(reajuste>1000||taxas>100)throw Error('Percentual fora do limite.');
    const antes=preco*(1-taxas/100)-custo;
    resultado=preco*(1-taxas/100)-custo*(1+reajuste/100);
    detalhe='Antes '+dinheiro(antes)+' · variação '+dinheiro(resultado-antes);if(resultado<0){abaixoMeta++;alertas.push(nome+': contribuição após reajuste negativa');}break;
   }
   case 'planejamento-meta-roas':{
    const [investimento,receita,pedidos,meta]=v;
    if(investimento<=0||meta<=0||!Number.isInteger(pedidos))throw Error('Investimento e meta devem ser positivos; pedidos inteiros.');
    resultado=receita/investimento;investimentoTotal+=investimento;receitaTotal+=receita;pedidosTotal+=pedidos;detalhe='CPA '+(pedidos?dinheiro(investimento/pedidos):'sem pedidos')+' · receita até meta '+dinheiro(Math.max(0,investimento*meta-receita));if(resultado<meta){abaixoMeta++;alertas.push(nome+': ROAS abaixo da meta '+meta);}break;
   }
  }
  if(!Number.isFinite(resultado))throw Error('Resultado fora do limite.');
  total+=resultado;saida.push([nome,arred(resultado),detalhe]);
 }
 return {cabecalho:['Identificador',slug==='analise-ponto-equilibrio-canais'?'Pedidos para equilíbrio':slug==='planejamento-meta-roas'?'ROAS':'Resultado (R$)','Detalhe'],linhas:saida,total:arred(slug==='planejamento-meta-roas'?receitaTotal/investimentoTotal:total),unidade:slug==='analise-ponto-equilibrio-canais'?'pedidos':slug==='planejamento-meta-roas'?'ROAS agregado':'R$',observacao:slug==='planejamento-meta-roas'?'ROAS agregado calculado como receita total dividida pelo investimento total.':'Simulação gerencial com valores informados; confirme custos reais.',alertas,abaixoMeta,indicadores:slug==='planejamento-meta-roas'?[['Investimento total',dinheiro(investimentoTotal)],['Receita atribuída',dinheiro(receitaTotal)],['CPA agregado',pedidosTotal?dinheiro(investimentoTotal/pedidosTotal):'Sem pedidos']]:slug==='simulador-devolucoes'?[['Pedidos avaliados',String(pedidosTotal)],['Custo esperado',dinheiro(total)]]:[['Registros com alerta',String(abaixoMeta)]]};
}

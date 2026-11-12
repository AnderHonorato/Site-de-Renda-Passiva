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
/** Lê CSV com aspas duplas RFC 4180 ou TSV, inclusive campos com quebras de linha. */
export function lerTabelaOperacional(texto){
 if(typeof texto!=='string'||!texto.trim()||new TextEncoder().encode(texto).length>100000)
  throw Error('Informe CSV/TSV de até 100 KB.');
 const primeira=texto.split(/\r?\n/,1)[0];
 const separador=primeira.includes('\t')?'\t':';';
 const linhas=[];let linha=[],campo='',aspas=false,fechado=false;
 for(let i=0;i<texto.length;i++){
  const c=texto[i];
  if(aspas){
   if(c==='"'&&texto[i+1]==='"'){campo+='"';i++;}
   else if(c==='"') {aspas=false;fechado=true;}
   else campo+=c;
  }else if(c==='"'&&!campo&&!fechado){aspas=true;}
  else if(c===separador){linha.push(campo);campo='';fechado=false;}
  else if(c==='\n'||c==='\r'){
   if(c==='\r'&&texto[i+1]==='\n')i++;
   linha.push(campo);linhas.push(linha);linha=[];campo='';fechado=false;
   if(linhas.length>501)throw Error('Limite de 500 registros excedido.');
  }else{
   if(c==='"'||fechado)throw Error('Aspas fora do padrão CSV.');
   campo+=c;
  }
 }
 if(aspas)throw Error('Campo CSV com aspas não fechadas.');
 if(campo!==''||linha.length) {linha.push(campo);linhas.push(linha);}
 return linhas;
}
export function calcularLote(slug,entrada,opcoes={}){
 const margemPercentual=opcoes.margemPercentual===undefined?20:Number(String(opcoes.margemPercentual).replace(',','.'));
 const alertaDevolucao=opcoes.alertaDevolucao===undefined?20:Number(String(opcoes.alertaDevolucao).replace(',','.'));
 if(!Number.isFinite(margemPercentual)||margemPercentual<0||margemPercentual>99)throw Error('Meta de margem deve estar entre 0% e 99%.');
 if(!Number.isFinite(alertaDevolucao)||alertaDevolucao<0||alertaDevolucao>100)throw Error('Limite de devoluções deve estar entre 0% e 100%.');
 const variacaoCenario=opcoes.variacaoCenario===undefined?10:Number(String(opcoes.variacaoCenario).replace(',','.'));
 if(!Number.isFinite(variacaoCenario)||variacaoCenario<0||variacaoCenario>100)throw Error('Variação do cenário deve estar entre 0% e 100%.');
 const colunas=COLUNAS[slug];if(!colunas)throw Error('Ferramenta desconhecida.');
 const linhas=lerTabelaOperacional(entrada);
 if(linhas.length<2||linhas.length>501)throw Error('Informe entre 1 e 500 registros.');
 const cab=linhas.shift().map(s=>s.trim().toLowerCase());
 if(cab.join('|')!==colunas.join('|'))throw Error('Cabeçalho inválido. Use o exemplo como modelo.');
 const vistos=new Set(),saida=[];let total=0;let investimentoTotal=0,receitaTotal=0;let pedidosTotal=0;let abaixoMeta=0;const alertas=[];
 for(const [i,linha] of linhas.entries()){
  const partes=linha;if(partes.length!==colunas.length)throw Error('Linha '+(i+2)+': quantidade incorreta de colunas.');
  const nome=partes[0].trim();if(!nome||nome.length>80||/^[=+@\-\t\r\n]/.test(nome)||/[\x00-\x1f]/.test(nome)||vistos.has(nome))throw Error('Identificador vazio, longo ou repetido na linha '+(i+2)+'.');
  vistos.add(nome);
  const v=partes.slice(1).map(numero);let resultado,detalhe;
  switch(slug){
   case 'auditoria-margem-marketplace':{
    const [preco,cmv,comissao,tarifa,frete,ads,imposto]=v;
    if(comissao>100||imposto>100)throw Error('Percentuais não podem superar 100.');
    resultado=preco-cmv-preco*(comissao+imposto)/100-tarifa-frete-ads;
    const piso=100-comissao-imposto>0?(cmv+tarifa+frete+ads)/(1-(comissao+imposto)/100):null;
    const margemAlvo=margemPercentual/100;
    const divisorAlvo=1-(comissao+imposto)/100-margemAlvo;
    const precoMeta=divisorAlvo>0?(cmv+tarifa+frete+ads)/divisorAlvo:null;
    detalhe=(preco?arred(resultado/preco*100)+'% de margem':'Sem receita')+' · preço de equilíbrio '+(piso===null?'inviável':dinheiro(piso))+' · preço para margem de '+margemPercentual+'% '+(precoMeta===null?'inviável':dinheiro(precoMeta));if(resultado<0){abaixoMeta++;alertas.push(nome+': contribuição negativa');}break;
   }
   case 'simulador-devolucoes':{
    const [pedidos,taxa,frete,inspecao,perda]=v;
    if(!Number.isInteger(pedidos)||taxa>100)throw Error('Pedidos devem ser inteiros e taxa até 100%.');
    resultado=pedidos*taxa/100*(frete+inspecao+perda);
    detalhe=arred(pedidos*taxa/100)+' devoluções esperadas · custo por pedido '+dinheiro(pedidos?resultado/pedidos:0);pedidosTotal+=pedidos;if(taxa>alertaDevolucao){abaixoMeta++;alertas.push(nome+': devolução acima de '+alertaDevolucao+'%');}break;
   }
   case 'analise-ponto-equilibrio-canais':{
    const [preco,custo,fixo]=v;const margem=preco-custo;
    if(margem<=0)throw Error('Preço precisa superar custo variável para existir equilíbrio.');
    resultado=Math.ceil(fixo/margem);
    const cenarioMenos=Math.ceil((fixo*(1-variacaoCenario/100))/margem-1e-10);
    const cenarioMais=Math.ceil((fixo*(1+variacaoCenario/100))/margem-1e-10);
    detalhe='Margem unitária '+dinheiro(margem)+' · receita de equilíbrio '+dinheiro(resultado*preco)+
      ' · cenários de custo fixo -'+variacaoCenario+'%: '+cenarioMenos+' pedidos / +'+variacaoCenario+'%: '+cenarioMais+' pedidos';
    break;
   }
   case 'simulador-reajuste-fornecedor':{
    const [custo,reajuste,preco,taxas]=v;
    if(reajuste>1000||taxas>100)throw Error('Percentual fora do limite.');
    const antes=preco*(1-taxas/100)-custo;
    resultado=preco*(1-taxas/100)-custo*(1+reajuste/100);
    const precoParaPreservar=taxas<100?preco+(custo*reajuste/100)/(1-taxas/100):null;
    const reajusteAbsorvido=custo*reajuste/100;
    const percentualAumentoPreco=preco>0&&precoParaPreservar!==null?(precoParaPreservar/preco-1)*100:null;
    detalhe='Antes '+dinheiro(antes)+' · variação '+dinheiro(resultado-antes)+' · preço para manter contribuição '+(precoParaPreservar===null?'inviável':dinheiro(precoParaPreservar))+' · aumento mínimo do preço '+(percentualAumentoPreco===null?'não calculável':arred(percentualAumentoPreco)+'%')+' · custo adicional '+dinheiro(reajusteAbsorvido);if(resultado<0){abaixoMeta++;alertas.push(nome+': contribuição após reajuste negativa');}break;
   }
   case 'planejamento-meta-roas':{
    const [investimento,receita,pedidos,meta]=v;
    if(investimento<=0||meta<=0||!Number.isInteger(pedidos))throw Error('Investimento e meta devem ser positivos; pedidos inteiros.');
    resultado=receita/investimento;investimentoTotal+=investimento;receitaTotal+=receita;pedidosTotal+=pedidos;
    const receitaAlvo=investimento*meta;
    const faltaReceita=Math.max(0,receitaAlvo-receita);
    const pedidosAdicionais=pedidos>0&&receita>0?Math.ceil(faltaReceita/(receita/pedidos)):null;
    detalhe='CPA '+(pedidos?dinheiro(investimento/pedidos):'sem pedidos')+
      ' · receita até meta '+dinheiro(faltaReceita)+
      ' · pedidos adicionais ao ticket atual '+(pedidosAdicionais===null?'não estimável':pedidosAdicionais);if(resultado<meta){abaixoMeta++;alertas.push(nome+': ROAS abaixo da meta '+meta);}break;
   }
  }
  if(!Number.isFinite(resultado))throw Error('Resultado fora do limite.');
  total+=resultado;saida.push([nome,arred(resultado),detalhe]);
 }
 return {cabecalho:['Identificador',slug==='analise-ponto-equilibrio-canais'?'Pedidos para equilíbrio':slug==='planejamento-meta-roas'?'ROAS':'Resultado (R$)','Detalhe'],linhas:saida,total:arred(slug==='planejamento-meta-roas'?receitaTotal/investimentoTotal:total),unidade:slug==='analise-ponto-equilibrio-canais'?'pedidos':slug==='planejamento-meta-roas'?'ROAS agregado':'R$',observacao:slug==='planejamento-meta-roas'?'ROAS agregado calculado como receita total dividida pelo investimento total.':'Simulação gerencial com valores informados; confirme custos reais.',alertas,abaixoMeta,indicadores:slug==='planejamento-meta-roas'?[['Investimento total',dinheiro(investimentoTotal)],['Receita atribuída',dinheiro(receitaTotal)],['CPA agregado',pedidosTotal?dinheiro(investimentoTotal/pedidosTotal):'Sem pedidos']]:slug==='simulador-devolucoes'?[['Pedidos avaliados',String(pedidosTotal)],['Custo esperado',dinheiro(total)]]:[['Registros com alerta',String(abaixoMeta)]]};
}

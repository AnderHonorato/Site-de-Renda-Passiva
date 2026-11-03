/** F222–F226: modelos gerenciais Premium em lote, sem chamadas à rede ou persistência.
 * Dados e parâmetros pertencem ao operador; não oferecem decisão fiscal nem garantias.
 */
import {lerDadosTexto} from '../scripts/cálculos/importar-planilha.js';
export class ErroOperacoes extends Error{constructor(m){super(m);this.name='ErroOperacoes';}}
export const TIPOS_OPERACOES=Object.freeze([
 'planejamento-kits-combos','auditoria-sla-logistico','coortes-retencao-ltv',
 'transferencias-entre-cds','risco-concentracao-comercial'
]);
const arred=v=>Math.round((v+Number.EPSILON)*100)/100;
function texto(v,campo){const t=String(v??'').trim();if(!t||t.length>80||/[\\u0000-\\u001f]/.test(t))throw new ErroOperacoes(campo+': identificador ausente ou inválido.');return t;}
function valor(v,campo,max=1e10,positivo=false){
 let t=String(v??'').trim();
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?$/.test(t))t=t.replaceAll('.','').replace(',','.');
 else if(/^\d+(?:,\d{1,4})?$/.test(t))t=t.replace(',','.');
 if(!/^\d+(?:\.\d{1,4})?$/.test(t))throw new ErroOperacoes(campo+': número inválido.');
 const n=Number(t);
 if(!Number.isFinite(n)||n>max||n<0||(positivo&&n===0))throw new ErroOperacoes(campo+': fora dos limites.');
 return n;
}
const percentual=(v,campo)=>valor(v,campo,100);
function inteiro(v,campo,max=1e8,positivo=false){
 const n=valor(v,campo,max,positivo);
 if(!Number.isSafeInteger(n))throw new ErroOperacoes(campo+': informe um número inteiro.');
 return n;
}
function data(v){
 const d=String(v??'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new ErroOperacoes('Data inválida: informe AAAA-MM-DD.');
 const t=Date.parse(d+'T00:00:00Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==d)throw new ErroOperacoes('Data calendário inválida: '+d);
 return t;
}
const mes=d=>String(d).slice(0,7);
const diffMes=(a,b)=>(Number(b.slice(0,4))-Number(a.slice(0,4)))*12+
  Number(b.slice(5,7))-Number(a.slice(5,7));
const diffDias=(a,b)=>Math.floor((b-a)/86400000);
function importar(entrada,campo,cols){
 const str=entrada?.[campo];
 if(typeof str!=='string'||!str.trim()||Buffer.byteLength(str,'utf8')>270000)
  throw new ErroOperacoes(campo+': cole um CSV/TSV com no máximo 270 KB.');
 let matriz;
 try{matriz=lerDadosTexto(str).linhas;}catch(e){throw new ErroOperacoes(campo+': CSV inválido: '+e.message);}
 if(matriz.length<2||matriz.length>501)throw new ErroOperacoes(campo+': informe de 1 a 500 linhas de dados.');
 const cab=matriz[0].map(v=>v.trim().toLowerCase());
 if(new Set(cab).size!==cab.length)throw new ErroOperacoes('Cabeçalhos repetidos em '+campo+'.');
 const faltantes=cols.filter(c=>!cab.includes(c));
 if(faltantes.length)throw new ErroOperacoes('Colunas faltando em '+campo+': '+faltantes.join(', '));
 const idx=Object.fromEntries(cols.map(c=>[c,cab.indexOf(c)]));
 return matriz.slice(1).map((linha,k)=>{
  const obj=Object.fromEntries(cols.map(c=>[c,String(linha[idx[c]]??'').trim()]));
  if(Object.values(obj).some(c=>c.length>500))throw new ErroOperacoes('Campo extenso na linha '+(k+2)+' de '+campo);
  return obj;
 });
}
function relatorio(nome,cab,linhas,indicadores,avisos,alertas=[]){
 if(!linhas.length)throw new ErroOperacoes('Nenhum dado válido para o relatório.');
 return {nome,total:linhas.length,planilha:[cab,...linhas],indicadores,avisos,alertas:alertas.slice(0,150)};
}
function kits(d){
 const ofertas=importar(d,'kits',['kit','preco','unidades_previstas','comissao_pct','tarifa_fixa','embalagem','ads_unitario']);
 const componentes=importar(d,'componentes',['kit','componente','quantidade','estoque','cmv']);
 const kmap=new Map(),estoque=new Map(),alertas=[];
 for(const r of ofertas){
  const kit=texto(r.kit,'kit');if(kmap.has(kit))throw new ErroOperacoes('Kit duplicado: '+kit);
  const preco=valor(r.preco,'preço kit',1e8,true),comissao=percentual(r.comissao_pct,'comissão'),
   qtd=inteiro(r.unidades_previstas,'quantidade prevista',1e6),fixa=valor(r.tarifa_fixa,'tarifa fixa'),
   embal=valor(r.embalagem,'embalagem'),ads=valor(r.ads_unitario,'ads');
  kmap.set(kit,{kit,preco,comissao,qtd,fixa,embal,ads,bom:new Map(),custo:0});
 }
 for(const r of componentes){
  const kit=texto(r.kit,'kit'),id=texto(r.componente,'componente'),k=kmap.get(kit);
  if(!k)throw new ErroOperacoes('Componente referenciou kit inexistente: '+kit);
  if(k.bom.has(id))throw new ErroOperacoes('Componente repetido no kit: '+kit+'/'+id);
  const qtd=inteiro(r.quantidade,'unidades do componente',100000,true),saldo=inteiro(r.estoque,'estoque do componente'),
   cmv=valor(r.cmv,'custo do componente');
  const anterior=estoque.get(id);
  if(anterior&&(anterior.saldo!==saldo||anterior.cmv!==cmv))
   throw new ErroOperacoes('Estoque/custo inconsistente entre kits para componente '+id);
  if(!anterior)estoque.set(id,{saldo,cmv,restante:saldo});
  k.bom.set(id,qtd);k.custo+=qtd*cmv;
 }
 for(const k of kmap.values())if(!k.bom.size)throw new ErroOperacoes('Kit sem componentes: '+k.kit);
 const ranking=[...kmap.values()].map(k=>({...k,contrib:k.preco*(1-k.comissao/100)-k.custo-k.fixa-k.embal-k.ads}))
  .sort((a,b)=>b.contrib-a.contrib||a.kit.localeCompare(b.kit));
 let unidades=0,investimento=0,contribuicao=0,falta=0;
 const linhas=[];
 for(const k of ranking){
  const capacidade=Math.min(...[...k.bom].map(([id,q])=>Math.floor(estoque.get(id).restante/q)));
  const viavel=k.contrib>0?Math.min(k.qtd,capacidade):0;
  for(const [id,q] of k.bom)estoque.get(id).restante-=viavel*q;
  const deficit=k.qtd-viavel;if(deficit)falta+=deficit;
  if(k.contrib<=0)alertas.push(k.kit+': contribuição unitária não positiva, montagem sugerida zero.');
  else if(deficit)alertas.push(k.kit+': estoque compartilhado limita '+deficit+' kits previstos.');
  unidades+=viavel;investimento+=viavel*k.custo;contribuicao+=viavel*k.contrib;
  linhas.push([k.kit,k.qtd,capacidade,viavel,deficit,arred(k.preco),arred(k.custo),
   arred(k.contrib),arred(viavel*k.contrib),[...k.bom].map(([id,q])=>id+' × '+q).join(' | ')]);
 }
 return relatorio('Viabilidade e margem de kits',
 ['Kit','Demanda prevista','Capacidade após alocações','Montagem sugerida','Demanda não atendida',
 'Preço','Custo componentes','Contribuição/un.','Contribuição sugerida','Composição'],linhas,
 [['Kits diferentes',kmap.size],['Unidades montáveis sugeridas',unidades],['Demanda não atendida',falta],
  ['CMV das montagens',arred(investimento)],['Contribuição estimada',arred(contribuicao)]],
 ['Alocação gulosa por maior contribuição unitária positiva, não é otimização matemática global.',
  'O mesmo saldo de componente é compartilhado entre kits. Considere fabricação, perdas e embalagem reais.'],alertas);
}
function sla(d){
 const rows=importar(d,'pedidos',['pedido','canal','data_pagamento','prazo_postagem','data_postagem','prazo_entrega','data_entrega','valor']);
 const referencia=data(d.data_referencia),ids=new Set(),linhas=[],alertas=[];
 let atrasoPostagem=0,atrasoEntrega=0,emRisco=0,exposicao=0,entregues=0;
 for(const x of rows){
  const id=texto(x.pedido,'pedido'),canal=texto(x.canal,'canal');
  if(ids.has(id))throw new ErroOperacoes('Pedido repetido: '+id);ids.add(id);
  const pago=data(x.data_pagamento),promPost=data(x.prazo_postagem),promEnt=data(x.prazo_entrega);
  const post=x.data_postagem?data(x.data_postagem):null,ent=x.data_entrega?data(x.data_entrega):null;
  if(promPost<pago||promEnt<promPost||(post!==null&&post<pago)||
     (ent!==null&&(post===null||ent<post)))
   throw new ErroOperacoes(id+': sequência de pagamento, promessa e evento inconsistente.');
  const val=valor(x.valor,'valor do pedido');
  const delayPost=post===null?Math.max(0,diffDias(promPost,referencia)):Math.max(0,diffDias(promPost,post));
  const delayEnt=ent===null?Math.max(0,diffDias(promEnt,referencia)):Math.max(0,diffDias(promEnt,ent));
  const risco=ent===null&&diffDias(referencia,promEnt)>=0&&diffDias(referencia,promEnt)<=2;
  const atraso=delayPost>0||delayEnt>0;
  if(delayPost>0)atrasoPostagem++;if(delayEnt>0)atrasoEntrega++;if(risco)emRisco++;
  if(ent!==null)entregues++;
  if(ent===null&&(atraso||risco))exposicao+=val;
  const situacao=ent!==null?(atraso?'Entregue com violação':'Entregue no prazo'):
   atraso?'Atrasado':risco?'Próximo do prazo':'Em andamento';
  if(atraso)alertas.push(id+': '+situacao+' ('+delayEnt+' dia(s) de atraso na entrega).');
  linhas.push([id,canal,x.data_pagamento,x.prazo_postagem,x.data_postagem||'Pendente',
   x.prazo_entrega,x.data_entrega||'Pendente',delayPost,delayEnt,situacao,arred(val)]);
 }
 return relatorio('Auditoria de SLA de pedidos',['Pedido','Canal','Pagamento','Prazo postagem','Postagem',
  'Prazo entrega','Entrega','Dias atraso postagem','Dias atraso entrega','Situação','Valor'],linhas,
  [['Pedidos',linhas.length],['Entregues',entregues],['Postagens fora do prazo',atrasoPostagem],
   ['Entregas fora do prazo',atrasoEntrega],['Pedidos próximos do prazo',emRisco],
   ['Valor em pedidos abertos com risco/atraso',arred(exposicao)]],
  ['Prazos e atrasos usam dias corridos, não descontam feriados, nem são SLA oficial de transportadoras.',
   'A data de referência é definida manualmente. Nenhum pedido é rastreado ou alterado.'],alertas);
}
function coortes(d){
 const pedidos=importar(d,'pedidos',['pedido','cliente','data','receita','cmv','outros_custos']);
 const marketing=importar(d,'aquisicao',['mes','gasto_aquisicao']);
 const gastos=new Map(),clientes=new Map(),pedidosIds=new Set();
 for(const x of marketing){
  if(!/^\d{4}-\d{2}$/.test(x.mes))throw new ErroOperacoes('Mês de aquisição precisa ser AAAA-MM.');
  data(x.mes+'-01');
  if(gastos.has(x.mes))throw new ErroOperacoes('Mês de aquisição duplicado: '+x.mes);
  gastos.set(x.mes,valor(x.gasto_aquisicao,'gasto de aquisição'));
 }
 for(const x of pedidos){
  const pedido=texto(x.pedido,'pedido');
  if(pedidosIds.has(pedido))throw new ErroOperacoes('Pedido duplicado: '+pedido);pedidosIds.add(pedido);
  const cliente=texto(x.cliente,'cliente');
  if(!/^[a-zA-Z0-9_.-]{1,64}$/.test(cliente)||cliente.includes('@'))
   throw new ErroOperacoes('Cliente deve usar identificador pseudônimo, sem e-mail ou nome pessoal.');
  const dia=data(x.data),receita=valor(x.receita,'receita'),cmv=valor(x.cmv,'CMV'),outros=valor(x.outros_custos,'outros custos');
  if(!clientes.has(cliente))clientes.set(cliente,[]);
  clientes.get(cliente).push({dia,mes:mes(x.data),receita,contrib:receita-cmv-outros});
 }
 const grupos=new Map();
 for(const compras of clientes.values()){
  compras.sort((a,b)=>a.dia-b.dia);
  const primeiro=compras[0].mes;
  if(!grupos.has(primeiro))grupos.set(primeiro,{clientes:0,receita:0,contrib:0,
   retencao:Array.from({length:7},()=>new Set()),contribMensal:Array(7).fill(0)});
  const grupo=grupos.get(primeiro);grupo.clientes++;
  grupo.receita+=compras.reduce((t,p)=>t+p.receita,0);
  grupo.contrib+=compras.reduce((t,p)=>t+p.contrib,0);
  const unicos=new Set();
  for(const compra of compras){
   const m=diffMes(primeiro,compra.mes);
   if(m>=0&&m<=6){grupo.contribMensal[m]+=compra.contrib;unicos.add(m);}
  }
  for(const m of unicos)grupo.retencao[m].add(compras);
 }
 const linhas=[],avisos=[];let receitaTotal=0,contribTotal=0,retidos=0;
 for(const [periodo,c] of [...grupos].sort((a,b)=>a[0].localeCompare(b[0]))){
  const gasto=gastos.get(periodo)??0,cac=gasto/c.clientes;
  let acumulado=0,payback='Não atingido';
  for(let m=0;m<=6;m++){acumulado+=c.contribMensal[m];if(payback==='Não atingido'&&gasto>0&&acumulado>=gasto)payback='M'+m;}
  if(!gastos.has(periodo))payback='Sem CAC informado';
  const ret=(m)=>arred(c.retencao[m].size/c.clientes*100);
  const contribuicaoMedia=c.contrib/c.clientes;
  receitaTotal+=c.receita;contribTotal+=c.contrib;
  retidos+=c.retencao.slice(1).reduce((s,x)=>s+x.size,0);
  if(cac>contribuicaoMedia)avisos.push(periodo+': CAC por novo cliente excede a contribuição média da coorte.');
  linhas.push([periodo,c.clientes,arred(c.receita),arred(c.contrib),arred(c.contrib/c.clientes),
   arred(cac),ret(1),ret(2),ret(3),ret(6),payback]);
 }
 return relatorio('Retenção e LTV por coortes',['Coorte de aquisição','Novos clientes',
 'Receita acumulada','Contribuição acumulada','Contribuição média/cliente',
 'CAC manual/cliente','Retenção M1 (%)','M2 (%)','M3 (%)','M6 (%)','Payback estimado'],
 linhas,[['Clientes pseudônimos',clientes.size],['Receita total',arred(receitaTotal)],
  ['Contribuição antes do CAC',arred(contribTotal)],['Coortes',grupos.size]],
 ['Retenção M1–M6 representa compra no mês exato, não retenção cumulativa. Meses futuros ou ausentes do CSV são incompletos.',
  'Contribuição LTV não inclui publicidade, que aparece como CAC manual. Acompanhamento limitado aos pedidos fornecidos.',
  'Use IDs pseudônimos; não inclua nomes, e-mails, telefones nem CPFs.'],avisos);
}
function transferencias(d){
 const saldo=importar(d,'estoques',['sku','cd','estoque','reservado','demanda_diaria','prazo_fornecedor','dias_seguranca']);
 const rotas=importar(d,'rotas',['origem','destino','prazo_dias','custo_unitario','capacidade']);
 const cds=new Map(),routes=[],unique=new Set(),alertas=[];
 for(const row of saldo){
  const sku=texto(row.sku,'SKU'),cd=texto(row.cd,'CD'),key=sku+'|'+cd;
  if(cds.has(key))throw new ErroOperacoes('SKU/CD duplicado: '+key);
  const atual=inteiro(row.estoque,'estoque'),reservado=inteiro(row.reservado,'reservado'),
   demanda=valor(row.demanda_diaria,'demanda diária',1e5),lead=inteiro(row.prazo_fornecedor,'prazo fornecedor',365),
   safety=inteiro(row.dias_seguranca,'segurança',180);
  const posicao=atual-reservado,alvo=Math.ceil(demanda*(lead+safety));
  cds.set(key,{sku,cd,posicao,alvo,lead,excedente:Math.max(0,posicao-alvo),falta:Math.max(0,alvo-posicao)});
 }
 for(const row of rotas){
  const origem=texto(row.origem,'origem'),destino=texto(row.destino,'destino');
  if(origem===destino)throw new ErroOperacoes('Origem e destino não podem ser iguais.');
  const key=origem+'>'+destino;
  if(unique.has(key))throw new ErroOperacoes('Rota repetida: '+key);
  unique.add(key);
  routes.push({origem,destino,dias:inteiro(row.prazo_dias,'prazo transferir',365),
   custo:valor(row.custo_unitario,'custo transferir'),capacidade:inteiro(row.capacidade,'capacidade')});
 }
 const necessidades=[...cds.values()].filter(x=>x.falta>0).sort((a,b)=>b.falta-a.falta||a.sku.localeCompare(b.sku)||a.cd.localeCompare(b.cd));
 const planilha=[],pendencias=[],custos=0;let quantidade=0,valorTotal=0;
 for(const alvo of necessidades){
  const opcoes=routes.filter(r=>r.destino===alvo.cd&&r.dias<=alvo.lead&&r.capacidade>0&&cds.get(alvo.sku+'|'+r.origem)?.excedente>0)
   .sort((a,b)=>a.custo-b.custo||a.dias-b.dias||a.origem.localeCompare(b.origem));
  for(const rota of opcoes){
   if(alvo.falta<=0)break;
   const origem=cds.get(alvo.sku+'|'+rota.origem);
   const un=Math.min(alvo.falta,origem.excedente,rota.capacidade);
   if(!un)continue;
   origem.excedente-=un;alvo.falta-=un;rota.capacidade-=un;
   quantidade+=un;valorTotal+=un*rota.custo;
   planilha.push([alvo.sku,rota.origem,alvo.cd,un,rota.dias,arred(rota.custo),arred(un*rota.custo),alvo.falta,'Transferência sugerida']);
  }
  if(alvo.falta>0){pendencias.push(alvo);alertas.push(alvo.sku+' / '+alvo.cd+': faltam '+alvo.falta+' unidades sem rota viável.');}
 }
 for(const f of pendencias)planilha.push([f.sku,'Sem rota',f.cd,0,'—',0,0,f.falta,'Falta não atendida']);
 if(!planilha.length)planilha.push(['—','—','—',0,'—',0,0,0,'Nenhuma transferência necessária']);
 return relatorio('Transferências entre centros de distribuição',
 ['SKU','CD origem','CD destino','Unidades','Prazo transferência (dias)','Custo/unidade','Custo total','Falta remanescente','Situação'],planilha,
 [['CDs/SKUs informados',cds.size],['Unidades sugeridas',quantidade],
  ['Custo estimado das transferências',arred(valorTotal)],['Destinos com falta remanescente',pendencias.length]],
 ['Regras gulosa por menor custo de rota e prioridade de falta, não otimiza toda a malha globalmente.',
  'Capacidade de rota é compartilhada por todas as transferências do lote. Não movimenta estoques reais.',
  'Uma rota é viável se o prazo informado é menor ou igual ao de reposição do destino.'],alertas);
}
function concentracao(d){
 const rows=importar(d,'csv',['sku','canal','fornecedor','receita','custos_variaveis']);
 const quedaCanal=percentual(d.queda_top_canal_pct,'queda de canal');
 const quedaFornecedor=percentual(d.queda_top_fornecedor_pct,'queda de fornecedor');
 const grupos={Canal:new Map(),Fornecedor:new Map(),Produto:new Map()};
 let receita=0,contribuicao=0;
 for(const row of rows){
  const sku=texto(row.sku,'SKU'),canal=texto(row.canal,'canal'),forn=texto(row.fornecedor,'fornecedor'),
   rev=valor(row.receita,'receita'),cost=valor(row.custos_variaveis,'custos variáveis');
  receita+=rev;contribuicao+=rev-cost;
  for(const [tipo,id] of [['Canal',canal],['Fornecedor',forn],['Produto',sku]]){
   const map=grupos[tipo],prev=map.get(id)??{rev:0,contrib:0};
   prev.rev+=rev;prev.contrib+=rev-cost;map.set(id,prev);
  }
 }
 if(!receita)throw new ErroOperacoes('Receita total precisa ser positiva para calcular concentração.');
 const linhas=[],alertas=[],hhi={};const top={};
 for(const [tipo,map] of Object.entries(grupos)){
  const sorted=[...map].sort((a,b)=>b[1].rev-a[1].rev||a[0].localeCompare(b[0]));
  hhi[tipo]=arred(10000*sorted.reduce((s,[,v])=>s+(v.rev/receita)**2,0));
  top[tipo]={nome:sorted[0][0],...sorted[0][1]};
  for(const [nome,v] of sorted){
   const share=arred(v.rev/receita*100);
   if(share>=40)alertas.push(tipo+' '+nome+': '+share+'% da receita depende desta concentração.');
   linhas.push([tipo,nome,arred(v.rev),share,arred(v.contrib),hhi[tipo],
    share>=40?'Atenção à dependência':'Acompanhar']);
  }
 }
 const perdaCanal=top.Canal.contrib*quedaCanal/100,perdaFornecedor=top.Fornecedor.contrib*quedaFornecedor/100;
 return relatorio('Risco de concentração comercial',
 ['Dimensão','Identificador','Receita','Participação (%)','Contribuição estimada','HHI da dimensão','Diagnóstico'],linhas,
 [['Receita total',arred(receita)],['Contribuição antes de despesas fixas',arred(contribuicao)],
  ['Maior canal',top.Canal.nome],['Maior fornecedor',top.Fornecedor.nome],
  ['HHI por canal',hhi.Canal],['HHI por fornecedor',hhi.Fornecedor],
  ['Perda de contribuição no cenário do maior canal',arred(perdaCanal)],
  ['Perda de contribuição no cenário do maior fornecedor',arred(perdaFornecedor)]],
 ['HHI vai de 0 a 10.000 e mede concentração de receita apenas na amostra informada.',
  'Cenários de choque para maior canal e fornecedor são SEPARADOS: não some os impactos.',
  'Perda de contribuição assume redução proporcional de receita e custos variáveis; não mede causalidade nem perda de lucro contábil.'],alertas);
}
const OPERACOES=Object.freeze({
 'planejamento-kits-combos':kits,'auditoria-sla-logistico':sla,
 'coortes-retencao-ltv':coortes,'transferencias-entre-cds':transferencias,
 'risco-concentracao-comercial':concentracao,
});
export function executarOperacoes(tipo,dados){
 if(!Object.hasOwn(OPERACOES,tipo))throw new ErroOperacoes('Operação Premium não encontrada.');
 if(!dados||typeof dados!=='object'||Array.isArray(dados))throw new ErroOperacoes('Envie um objeto válido com os dados da análise.');
 return OPERACOES[tipo](dados);
}

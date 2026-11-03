/** Interface do lote comercial Premium F217-F221. Cálculos não são distribuídos no frontend. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {api,ErroApi} from '../núcleo/api.js';
const CONF={
 'precificacao-de-promocoes':{
  acao:'Simular promoção',descricao:'Compare descontos e margens, obtenha preço de equilíbrio e preço mínimo para a meta.',
  campos:[{nome:'csv',rótulo:'Tabela de promoções',tipo:'área',linhas:9,
   padrão:'sku;preco_normal;preco_promocional;cmv;comissao_pct;imposto_pct;frete;ads;unidades_previstas;meta_margem_pct\nCAM-01;150;129;65;13;6;9;4;80;18\nCAM-02;100;78;48;12;5;7;2;60;15'}],
  limites:'A mesma quantidade é usada no comparativo com e sem promoção. Não modela elasticidade nem custo fixo.'
 },
 'projecao-caixa-operacional':{
  acao:'Projetar caixa operacional',descricao:'Monte o saldo esperado e um cenário conservador a partir de recebíveis ponderados e pagamentos por data.',
  campos:[{nome:'saldo_inicial',rótulo:'Saldo inicial',tipo:'número',padrão:'4000'},
   {nome:'saldo_minimo',rótulo:'Reserva de caixa mínima',tipo:'número',padrão:'1000'},
   {nome:'recebiveis',rótulo:'Recebíveis (CSV/TSV)',tipo:'área',linhas:5,
    padrão:'data;origem;valor;probabilidade_pct\n2026-11-05;Marketplace;2200;100\n2026-11-08;Cliente B2B;3500;80'},
   {nome:'pagamentos',rótulo:'Pagamentos (CSV/TSV)',tipo:'área',linhas:5,
    padrão:'data;categoria;valor\n2026-11-06;Fornecedor;2600\n2026-11-10;Aluguel;1700'}],
  limites:'Probabilidades são hipóteses do operador; cenário conservador usa metade dos recebíveis ponderados. Sem ligação bancária.'
 },
 'comparador-de-fornecedores':{
  acao:'Comparar compras',descricao:'Compare cotações por custo posto, lote mínimo, orçamento informado e prazo de entrega.',
  campos:[{nome:'csv',rótulo:'Cotações de fornecedores',tipo:'área',linhas:9,
   padrão:'sku;fornecedor;quantidade;preco_unitario;frete_total;imposto_pct;prazo_dias;minimo_lote;orcamento\nSKU1;Fornecedor A;100;25;120;7;8;100;3500\nSKU1;Fornecedor B;100;23;250;8;12;120;3500\nSKU2;Fornecedor C;30;80;90;5;4;50;5000'}],
  limites:'Escolhe menor custo posto unitário entre cotações viáveis por SKU. Não resolve compras de múltiplos SKUs sob orçamento conjunto.'
 },
 'auditoria-de-cupons':{
  acao:'Auditar cupons',descricao:'Verifique custo real do cupom, teto de desconto sem prejuízo e contribuição depois dos custos.',
  campos:[{nome:'csv',rótulo:'Campanhas e cupons',tipo:'área',linhas:9,
   padrão:'campanha;sku;preco;cmv;comissao_pct;imposto_pct;frete;ads;desconto_pct;subsidio_fixo;unidades\nBlack Week;SKU1;129;65;13;6;8;5;15;0;100\nAniversário;SKU2;90;40;12;5;6;3;10;2;80'}],
  limites:'Subsídio entra por unidade e deve existir de fato. Teto cobre contribuição, não despesas fixas.'
 },
 'priorizacao-de-catalogo':{
  acao:'Priorizar catálogo',descricao:'Crie uma fila gerencial de SKUs por receita ABC, contribuição parcial, conversão, devoluções e risco de ruptura.',
  campos:[{nome:'csv',rótulo:'Indicadores por SKU',tipo:'área',linhas:9,
   padrão:'sku;visitas;pedidos;receita;cmv;ads;devolucoes;estoque;prazo_dias;dias_periodo\nSKU1;1200;45;5400;2600;700;2;18;8;30\nSKU2;400;8;960;490;250;3;2;10;30'}],
  limites:'Score é heurístico e não uma previsão. Contribuição parcial não contempla impostos, taxas e estornos.'
 }
};
export function apresentarEstrategia(r,slug){
 if(!r||!Array.isArray(r.planilha)||!r.indicadores)throw new ErroDeEntrada('Relatório Premium inválido.');
 const tabela=r.planilha,ind=r.indicadores.map(([a,b])=>[a,String(b)]);
 return {
  valor:String(ind[1]?.[1]??r.total),resumo:r.titulo+' · '+r.total+' linha(s).',
  linhas:ind,tabela:{cabeçalho:tabela[0].slice(0,10),linhas:tabela.slice(1,21).map(x=>x.slice(0,10)),semExportação:true},
  texto:[r.titulo,...ind.map(x=>x.join(': ')),...r.alertas,...r.avisos].join('\n'),
  observações:['Prévia de 20 linhas; exportações contêm todas as linhas processadas.',...r.avisos,...r.alertas.slice(0,10)],
  arquivos:[
   {rótulo:'Baixar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(tabela,slug)},
   {rótulo:'Baixar Excel completo',ícone:'planilha',gerar:()=>baixarPlanilha(tabela,slug,{aba:'Diagnóstico Premium'})},
  ],
 };
}
export function criarModuloEstrategia(slug){
 const c=CONF[slug];if(!c)throw new Error('Estratégia desconhecida.');
 return {
  instruções:{
   passos:[
    'Acesse o portal com uma conta Premium e API Node ativa. GitHub Pages é somente interface.',
    'Cole seus próprios dados em CSV/TSV usando os nomes de colunas e exemplos preenchidos. Não envie segredos.',
    c.descricao,
    'Confira limites e alertas da análise, revise premissas e critérios antes de tomar decisões.',
    'Exporte CSV ou Excel com todo o relatório para acompanhar suas ações.'
   ],
   exemplo:{texto:c.descricao+' Os dados exibidos no exemplo são fictícios e podem ser substituídos.'},
   limites:c.limites+' Até 500 registros por tabela e 270 KB por CSV. Nenhum dado é gravado como trabalho e o motor só roda na API Premium.',
   perguntas:[
    {p:'A ferramenta executa mudanças no marketplace?',r:'Não. Analisa os dados enviados e gera um plano de revisão.'},
    {p:'Posso utilizar sem o servidor Premium?',r:'Não, no GitHub Pages apenas o formulário está disponível.'},
    {p:'Os dados são valores oficiais consultados automaticamente?',r:'Não. São entradas manuais e estimativas gerenciais sujeitas a conferência.'}
   ]
  },
  montar(raiz,ferramenta){
   montarFerramenta(raiz,ferramenta,{
    rótuloDaAção:c.acao,demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
    campos:c.campos,
    calcular:async dados=>{
     for(const campo of c.campos){
      const valor=String(dados[campo.nome]??'');
      if(!valor.trim()||new TextEncoder().encode(valor).length>270000)
       throw new ErroDeEntrada('Preencha '+campo.rótulo+' respeitando o limite.',campo.nome);
     }
     try{
      const r=await api('/api/premium/estrategia/'+slug,{metodo:'POST',dados,prazoMs:25000});
      return apresentarEstrategia(r.relatorio,slug);
     }catch(e){
      if(e instanceof ErroApi&&e.status===401)throw new ErroDeEntrada('Entre na sua conta.','csv');
      if(e instanceof ErroApi&&e.status===403)throw new ErroDeEntrada('É necessário plano Premium ativo.','csv');
      if(e instanceof ErroApi&&e.status===400)throw new ErroDeEntrada('Entrada inválida: '+e.message,'csv');
      if(e instanceof ErroApi&&e.indisponivel)throw new ErroDeEntrada('Servidor Premium indisponível no GitHub Pages.','csv');
      throw e;
     }
    },
    aoMontar(){
     const aside=document.createElement('aside');aside.className='premium-recurso';
     const p=document.createElement('p');p.textContent='Premium · '+c.descricao+' Requer conta Premium e API Node.';
     const a=document.createElement('a');a.href='../../planos.html';a.className='botão botão--linha';a.textContent='Ver planos';
     aside.append(p,a);raiz.querySelector('#formulário').before(aside);
    }
   });
  }
 };
}

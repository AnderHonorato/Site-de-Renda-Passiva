/** Interface Premium reutilizada: processamento permanece somente na API Node. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {api,ErroApi} from '../núcleo/api.js';
const CONF={
 'planejamento-kits-combos':{
  acao:'Planejar kits e combos',explicacao:'Aloca componentes compartilhados em kits segundo a contribuição por montagem, identifica rupturas e calcula o custo dos combos.',
  campos:[
   {nome:'kits',rótulo:'Kits, preços e metas (CSV/TSV)',tipo:'área',linhas:5,
    padrão:'kit;preco;unidades_previstas;comissao_pct;tarifa_fixa;embalagem;ads_unitario\nCOMBO-A;189;40;12;3;5;4\nCOMBO-B;125;60;12;2;4;3'},
   {nome:'componentes',rótulo:'Lista de materiais e saldos compartilhados (CSV/TSV)',tipo:'área',linhas:7,
    padrão:'kit;componente;quantidade;estoque;cmv\nCOMBO-A;CAMISETA;2;100;38\nCOMBO-A;CANECA;1;80;22\nCOMBO-B;CAMISETA;1;100;38\nCOMBO-B;BONE;1;35;20'}
  ],
  ressalva:'A alocação é heurística, prioriza maior contribuição unitária, não faz otimização global e não move estoque real.',
  perguntas:'Por que o segundo kit pode ter menos estoque? Componentes compartilhados são consumidos na alocação do primeiro kit.'
 },
 'auditoria-sla-logistico':{
  acao:'Auditar SLAs de pedidos',explicacao:'Classifica postagem e entrega no prazo, em risco ou atrasadas por pedido e calcula valor financeiro exposto.',
  campos:[
   {nome:'data_referencia',rótulo:'Data de referência (AAAA-MM-DD)',tipo:'texto',padrão:'2026-11-03'},
   {nome:'pedidos',rótulo:'Pedidos e prazos (CSV/TSV)',tipo:'área',linhas:8,
    padrão:'pedido;canal;data_pagamento;prazo_postagem;data_postagem;prazo_entrega;data_entrega;valor\nP001;Loja A;2026-10-25;2026-10-27;2026-10-27;2026-11-01;;159\nP002;Loja B;2026-10-29;2026-10-31;2026-10-31;2026-11-05;;259'}
  ],
  ressalva:'Usa dias corridos informados por você e não verifica SLAs oficiais nem status de transportadoras.',
  perguntas:'Preciso fornecer datas reais? Sim. Deixe postagem/entrega em branco quando ainda não aconteceram.'
 },
 'coortes-retencao-ltv':{
  acao:'Analisar coortes e LTV',explicacao:'Agrupa clientes pseudônimos por mês da primeira compra, calcula retenção M1–M6, contribuição média e payback do CAC inserido.',
  campos:[
   {nome:'pedidos',rótulo:'Pedidos com identificadores pseudônimos (CSV/TSV)',tipo:'área',linhas:7,
    padrão:'pedido;cliente;data;receita;cmv;outros_custos\nP1;CLI-001;2026-07-03;160;65;20\nP2;CLI-002;2026-07-16;200;90;20\nP3;CLI-001;2026-08-13;120;55;15\nP4;CLI-003;2026-08-20;190;80;20'},
   {nome:'aquisicao',rótulo:'Investimento mensal em aquisição (CSV/TSV)',tipo:'área',linhas:5,
    padrão:'mes;gasto_aquisicao\n2026-07;120\n2026-08;80'}
  ],
  ressalva:'LTV é contribuição acumulada dos dados fornecidos, não previsão vitalícia; coortes incompletas exigem cautela.',
  perguntas:'Devo incluir dados pessoais de clientes? Não. Use IDs pseudônimos, nunca nomes, e-mails, telefone ou CPF.'
 },
 'transferencias-entre-cds':{
  acao:'Sugerir transferências entre CDs',explicacao:'Cruza necessidade de cada SKU/CD, saldo disponível, rotas, custos e limites de capacidade para sugerir transferências.',
  campos:[
   {nome:'estoques',rótulo:'Saldo, demanda e prazo por SKU/CD',tipo:'área',linhas:7,
    padrão:'sku;cd;estoque;reservado;demanda_diaria;prazo_fornecedor;dias_seguranca\nSKU-A;CD-SP;120;10;2;10;5\nSKU-A;CD-RJ;8;2;3;14;3\nSKU-B;CD-SP;60;5;1;7;5\nSKU-B;CD-RJ;3;0;1;10;5'},
   {nome:'rotas',rótulo:'Rotas e capacidade total',tipo:'área',linhas:5,
    padrão:'origem;destino;prazo_dias;custo_unitario;capacidade\nCD-SP;CD-RJ;3;2.50;60\nCD-RJ;CD-SP;4;3.50;40'}
  ],
  ressalva:'Sugestão gulosa por custo e prioridade de falta; não é otimização de rede global e não movimenta mercadorias.',
  perguntas:'A capacidade de rota é por SKU? Não. É compartilhada entre todos os SKUs da rota no lote.'
 },
 'risco-concentracao-comercial':{
  acao:'Mapear risco de concentração',explicacao:'Compara a dependência de canal, fornecedor e SKU por participação na receita e HHI; simula choques independentes.',
  campos:[
   {nome:'queda_top_canal_pct',rótulo:'Choque no maior canal (%)',tipo:'número',padrão:'30'},
   {nome:'queda_top_fornecedor_pct',rótulo:'Choque no maior fornecedor (%)',tipo:'número',padrão:'40'},
   {nome:'csv',rótulo:'Receita e custos por SKU, canal e fornecedor',tipo:'área',linhas:8,
    padrão:'sku;canal;fornecedor;receita;custos_variaveis\nCAM-A;Marketplace A;Fabrica 1;20000;11800\nCAM-A;Marketplace B;Fabrica 1;6000;3800\nCAM-B;Marketplace A;Fabrica 2;8000;4900\nCAM-C;Loja própria;Fabrica 3;7500;3600'}
  ],
  ressalva:'Contribuição não equivale a lucro líquido; os cenários são independentes e não devem ser somados.',
  perguntas:'O HHI é uma recomendação legal? Não. Ele mede concentração de receita na amostra e ajuda a visualizar dependências.'
 }
};
export function apresentarOperacao(r,slug){
 if(!r||!Array.isArray(r.planilha)||!Array.isArray(r.indicadores)||!Array.isArray(r.alertas)||!Array.isArray(r.avisos))
  throw new ErroDeEntrada('Relatório Premium incompleto.');
 const tab=r.planilha,indicadores=r.indicadores.map(([a,b])=>[String(a),String(b)]);
 return {
  valor:String(indicadores[1]?.[1]??r.total),resumo:r.nome+' · '+r.total+' linha(s).',
  linhas:indicadores,tabela:{cabeçalho:tab[0].slice(0,10),linhas:tab.slice(1,21).map(x=>x.slice(0,10)),semExportação:true},
  texto:[r.nome,...indicadores.map(x=>x.join(': ')),...r.alertas,...r.avisos].join('\n'),
  observações:['Prévia de até 20 linhas. Arquivos incluem todos os registros.',...r.avisos,...r.alertas.slice(0,10)],
  arquivos:[
   {rótulo:'Exportar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(tab,slug)},
   {rótulo:'Exportar Excel completo',ícone:'planilha',gerar:()=>baixarPlanilha(tab,slug,{aba:'Relatório Premium'})},
  ]
 };
}
export function criarModuloOperacoes(slug){
 const cfg=CONF[slug];if(!cfg)throw new Error('Ferramenta sem configuração.');
 return {
  instruções:{
   passos:[
    'Entre no portal com login Premium e servidor Node ativo; GitHub Pages exibe apenas a interface.',
    'Substitua os dados fictícios pelas tabelas exportadas do seu próprio ERP ou comércio. Use os mesmos nomes de coluna.',
    cfg.explicacao,
    'Revise hipóteses, limites e alertas do relatório; os cálculos são apenas apoio gerencial.',
    'Exporte o diagnóstico completo em CSV ou Excel e valide as ações antes de realizá-las.'
   ],
   exemplo:{texto:cfg.explicacao+' Os dados de demonstração não representam empresas reais.'},
   limites:cfg.ressalva+' Até 500 linhas por tabela, 270 KB por CSV e 570 KB no conjunto enviado. Os dados não são salvos como trabalhos.',
   perguntas:[
    {p:'Posso usar diretamente no GitHub Pages?',r:'Não. A análise precisa do servidor Node com sessão Premium; Pages é apenas prévia.'},
    {p:'Os dados são buscados na internet?',r:'Não. Tudo é calculado exclusivamente com os dados que você informar.'},
    {p:'Como interpretar os resultados?',r:cfg.perguntas}
   ]
  },
  montar(raiz,ferramenta){
   montarFerramenta(raiz,ferramenta,{
    rótuloDaAção:cfg.acao,demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
    campos:cfg.campos,
    calcular:async dados=>{
     for(const c of cfg.campos){
      const v=String(dados[c.nome]??'');
      if(!v.trim()||new TextEncoder().encode(v).length>270000)
       throw new ErroDeEntrada('Verifique o preenchimento e tamanho de '+c.rótulo,c.nome);
     }
     if(new TextEncoder().encode(JSON.stringify(dados)).length>570000)
      throw new ErroDeEntrada('O conjunto de dados excede 570 KB. Divida as análises em lotes.',cfg.campos[0].nome);
     try{
      const resultado=await api('/api/premium/operacoes/'+slug,{metodo:'POST',dados,prazoMs:30000});
      return apresentarOperacao(resultado.relatorio,slug);
     }catch(e){
      if(e instanceof ErroApi&&e.status===401)throw new ErroDeEntrada('Faça login para analisar.',cfg.campos[0].nome);
      if(e instanceof ErroApi&&e.status===403)throw new ErroDeEntrada('Recurso exclusivo do Premium.',cfg.campos[0].nome);
      if(e instanceof ErroApi&&e.status===400)throw new ErroDeEntrada('Corrija os dados: '+e.message,cfg.campos[0].nome);
      if(e instanceof ErroApi&&e.indisponivel)throw new ErroDeEntrada('Backend Premium não está disponível nesta prévia estática.',cfg.campos[0].nome);
      throw e;
     }
    },
    aoMontar(){
     const aside=document.createElement('aside');aside.className='premium-recurso';
     const txt=document.createElement('p');txt.textContent='Premium · '+cfg.explicacao+' Requer API com acesso Premium.';
     const a=document.createElement('a');a.href='../../planos.html';a.className='botão botão--linha';a.textContent='Ver planos';
     aside.append(txt,a);raiz.querySelector('#formulário').before(aside);
    }
   });
  }
 };
}

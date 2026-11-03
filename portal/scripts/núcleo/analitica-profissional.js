/** Relatórios Premium de diagnósticos; motores de cálculo privados na API. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from '../núcleo/montador.js';
import {api,ErroApi} from '../núcleo/api.js';
const CONFIG={
 'auditoria-faturas-frete':{
  titulo:'Auditar faturas de frete',
  objetivo:'Reconciliar peso real, cubagem, frete negociado, adicionais e faturamento das transportadoras.',
  campos:[{nome:'csv',rótulo:'Faturas e etiquetas (CSV/TSV)',tipo:'área',linhas:9,
   padrão:'etiqueta;pedido;transportadora;comprimento_cm;largura_cm;altura_cm;peso_real_kg;divisor_cubagem;peso_faturado_kg;frete_base;adicionais_autorizados;frete_faturado;frete_repassado\nET001;P001;Transp A;30;20;20;1.2;6000;2;18;3;28;12\nET002;P002;Transp B;40;40;30;3;6000;8;30;2;32;20'}],
  limite:'Pesos de referência não equivalem a uma contestação automática. Use contrato e tabelas próprios.'
 },
 'afinidade-cestas-pedidos':{
  titulo:'Descobrir associações de produtos',
  objetivo:'Encontrar pares úteis para venda cruzada por suporte, confiança e lift, com cestas do próprio e-commerce.',
  campos:[
   {nome:'suporte_min_pct',rótulo:'Suporte mínimo (%)',tipo:'número',padrão:'5'},
   {nome:'confianca_min_pct',rótulo:'Confiança mínima (%)',tipo:'número',padrão:'20'},
   {nome:'csv',rótulo:'Itens vendidos por pedido (CSV/TSV)',tipo:'área',linhas:9,
    padrão:'pedido;sku;unidades;receita\nP1;CAMISETA;1;75\nP1;BONE;1;50\nP2;CAMISETA;1;75\nP2;CANECA;1;25\nP3;CAMISETA;2;150\nP3;BONE;1;50\nP4;BONE;1;50\nP4;CAMISETA;1;75'}],
  limite:'Associação não significa causalidade e pares com poucos pedidos têm baixa confiança gerencial.'
 },
 'inadimplencia-recebiveis':{
  titulo:'Auditar contas a receber',
  objetivo:'Categorizar faturas por atraso, saldo em aberto e concentração, sem consultar crédito pessoal.',
  campos:[
   {nome:'data_referencia',rótulo:'Data de referência (AAAA-MM-DD)',tipo:'texto',padrão:'2026-11-03'},
   {nome:'csv',rótulo:'Faturas e pagamentos (CSV/TSV)',tipo:'área',linhas:9,
    padrão:'fatura;cliente;emissao;vencimento;valor;valor_pago;data_pagamento\nF001;CLI001;2026-09-01;2026-09-30;2000;500;2026-09-25\nF002;CLI002;2026-10-01;2026-10-30;900;0;\nF003;CLI001;2026-10-02;2026-11-10;1200;0;'}],
  limite:'Usa clientes pseudônimos. Não atribui score de crédito nem executa cobranças.'
 },
 'experimentos-ab-lote':{
  titulo:'Analisar testes A/B',
  objetivo:'Comparar controles e variações por taxa de conversão, intervalos de Wilson, teste z bilateral e ajuste Holm.',
  campos:[{nome:'csv',rótulo:'Experimentos e variações (CSV/TSV)',tipo:'área',linhas:9,
   padrão:'experimento;variacao;controle;visitantes;conversoes;receita;custos\nCheckout;Atual;1;1500;120;12000;7000\nCheckout;Novo;0;1500;180;18000;8500\nHero Home;Padrão;1;900;63;6000;3500\nHero Home;Alternativo;0;900;90;8800;4600'}],
  limite:'O teste z exige amostras adequadas; não corrige viés de alocação ou decisões por inspeções sequenciais.'
 },
 'diagnostico-checkout-segmentos':{
  titulo:'Diagnosticar checkout por segmento',
  objetivo:'Analisar estágios de sessão até pedido por período e segmento para identificar gargalos da jornada.',
  campos:[{nome:'csv',rótulo:'Etapas do checkout (CSV/TSV)',tipo:'área',linhas:9,
   padrão:'periodo;segmento;sessoes;visitas_produto;carrinhos;checkout;compras;receita\n2026-10;Mobile;15000;10000;3000;1600;800;75000\n2026-10;Desktop;9000;6800;2800;2000;1100;140000\n2026-11;Mobile;12000;8000;2300;1200;580;51000'}],
  limite:'Não atribui causalidade nem garante aumento de receita; as etapas precisam medir a mesma coorte.'
 }
};
export function apresentarAnalitica(r,slug){
 if(!r||!Array.isArray(r.planilha)||!Array.isArray(r.indicadores)||!Array.isArray(r.observacoes)||!Array.isArray(r.alertas))
  throw new ErroDeEntrada('Relatório Premium inválido.');
 const t=r.planilha,linhas=r.indicadores.map(([a,b])=>[String(a),String(b)]);
 return {
  valor:String(linhas[1]?.[1]??r.total),resumo:r.titulo+' · '+r.total+' linha(s).',
  linhas,tabela:{cabeçalho:t[0].slice(0,10),linhas:t.slice(1,21).map(x=>x.slice(0,10)),semExportação:true},
  texto:[r.titulo,...linhas.map(x=>x.join(': ')),...r.alertas,...r.observacoes].join('\n'),
  observações:['Prévia de até 20 linhas. Exportações incluem todas as linhas.',...r.observacoes,...r.alertas.slice(0,10)],
  arquivos:[
   {rótulo:'Baixar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(t,slug)},
   {rótulo:'Baixar Excel completo',ícone:'planilha',gerar:()=>baixarPlanilha(t,slug,{aba:'Análise Premium'})},
  ]
 };
}
export function criarModuloAnalitica(slug){
 const config=CONFIG[slug];if(!config)throw new Error('Análise sem configuração');
 return {
  instruções:{
   passos:[
    'Entre com uma conta Premium em servidor Node. A prévia estática do GitHub Pages não executa esta API.',
    'Cole tabelas de sua empresa com o mesmo cabeçalho do exemplo. Não envie nomes, CPFs ou informações bancárias.',
    config.objetivo,
    'Revise alertas, limites e interpretações gerenciais dos cálculos antes de tomar decisões.',
    'Exporte os dados completos em CSV ou Excel e concilie com a fonte original.'
   ],
   exemplo:{texto:config.objetivo+' Os registros fornecidos inicialmente são fictícios.'},
   limites:config.limite+' Até 500 linhas por CSV e 270 KB por tabela; o conjunto deve ter menos de 570 KB. Não persiste os dados fornecidos.',
   perguntas:[
    {p:'A ferramenta acessa minha loja ou banco?',r:'Não. Os dados precisam ser exportados por você e colados no formulário.'},
    {p:'A ferramenta é gratuita no GitHub Pages?',r:'O Pages mostra apenas a interface; a análise privada exige API e plano Premium.'},
    {p:'É um laudo oficial?',r:'Não. É uma análise gerencial, sujeita à qualidade das informações e às limitações declaradas.'}
   ]
  },
  montar(raiz,ferramenta){
   montarFerramenta(raiz,ferramenta,{
    rótuloDaAção:config.titulo,demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
    campos:config.campos,
    calcular:async dados=>{
     for(const campo of config.campos){
      const v=String(dados[campo.nome]??'');
      if(!v.trim()||new TextEncoder().encode(v).length>270000)
       throw new ErroDeEntrada('Revise '+campo.rótulo+' e seu tamanho.',campo.nome);
     }
     if(new TextEncoder().encode(JSON.stringify(dados)).length>570000)
      throw new ErroDeEntrada('O conjunto ultrapassa 570 KB. Divida o lote.',config.campos[0].nome);
     try{
      const r=await api('/api/premium/analitica/'+slug,{metodo:'POST',dados,prazoMs:30000});
      return apresentarAnalitica(r.relatorio,slug);
     }catch(e){
      if(e instanceof ErroApi&&e.status===401)throw new ErroDeEntrada('Entre na sua conta.',config.campos[0].nome);
      if(e instanceof ErroApi&&e.status===403)throw new ErroDeEntrada('Análise exclusiva do plano Premium.',config.campos[0].nome);
      if(e instanceof ErroApi&&e.status===400)throw new ErroDeEntrada('Corrija os dados: '+e.message,config.campos[0].nome);
      if(e instanceof ErroApi&&e.indisponivel)throw new ErroDeEntrada('Backend Premium indisponível no Pages.',config.campos[0].nome);
      throw e;
     }
    },
    aoMontar(){
     const box=document.createElement('aside');box.className='premium-recurso';
     const p=document.createElement('p');p.textContent='Premium · '+config.objetivo+' Requer servidor Node e conta Premium.';
     const a=document.createElement('a');a.href='../../planos.html';a.className='botão botão--linha';a.textContent='Ver planos';
     box.append(p,a);raiz.querySelector('#formulário').before(box);
    }
   });
  }
 };
}

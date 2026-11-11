/** F237–F246 — ferramentas Premium de análise de operações.
 * Sem cálculos financeiros secretos no navegador: a API Node retorna os relatórios.
 */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from './montador.js';
import {api,ErroApi} from './api.js';
const ITEMS=Object.freeze({
  "descontos-progressivos-lote": {
    "nome": "Simular descontos por volume",
    "explicacao": "Compare margem e contribuição total por SKU antes e depois de descontos por quantidade.",
    "exemplo": "sku;preco_normal;desconto_pct;quantidade;custo_unitario;taxas_pct;frete_total;meta_margem_pct\nCAM-01;100;15;50;55;12;100;10\nCAM-02;80;20;120;42;10;180;15",
    "limite": "O volume se mantém constante entre os cenários. Não presume aumento de vendas por desconto."
  },
  "estoque-parado-capital": {
    "nome": "Auditar estoque parado",
    "explicacao": "Descubra capital imobilizado, custo mensal de carregamento e itens sem giro.",
    "exemplo": "sku;estoque;dias_sem_venda;vendas_90_dias;custo_unitario;preco;custo_carrego_pct_mes\nCAM-01;120;120;0;50;95;2\nCAM-02;40;12;90;80;140;1,5",
    "limite": "Dias sem venda e custos são informados manualmente. Não estima valor recuperável de liquidação."
  },
  "ciclo-financeiro-capital-giro": {
    "nome": "Simular capital de giro",
    "explicacao": "Compare DIO, DSO, DPO e ciclo de conversão de caixa, com cenário de antecipação de recebíveis.",
    "exemplo": "unidade;cmv_anual;estoque_medio;receita_anual;contas_receber;compras_anuais;contas_pagar;reduzir_dso_dias\nLoja A;365000;50000;730000;60000;300000;28000;10\nLoja B;800000;100000;1300000;150000;720000;62000;12",
    "limite": "Capital estimado é gerencial; não equivale ao fluxo de caixa diário."
  },
  "auditoria-taxas-pagamentos": {
    "nome": "Conferir taxas de pagamentos",
    "explicacao": "Confronte taxas contratadas e cobradas de cartão, Pix e antecipações por transação.",
    "exemplo": "transacao;meio;valor_bruto;taxa_contratada_pct;taxa_cobrada_pct;fixa_contratada;fixa_cobrada;antecipacao_contratada;antecipacao_cobrada\nT-101;Cartao;200;2,5;3;0;0;0;1\nT-102;Pix;100;0;0;0;0;0;0",
    "limite": "Não acessa extratos bancários nem consulta tarifas oficiais. Confira contrato e conciliação."
  },
  "politica-frete-faixas": {
    "nome": "Simular frete grátis por ticket",
    "explicacao": "Compare faixas de ticket com frete cobrado e política de frete grátis.",
    "exemplo": "faixa;pedidos;ticket_medio;cmv_pct;taxas_pct;frete_pago;frete_cobrado;ads_por_pedido;meta_margem_pct\nAte 99;100;80;40;12;15;10;4;10\n100 a 199;80;150;45;10;18;0;6;15",
    "limite": "Não prevê mais conversões ou pedidos ao oferecer frete grátis."
  },
  "estoque-seguranca-estatistico": {
    "nome": "Calcular estoque de segurança",
    "explicacao": "Estime ponto de reposição a partir da demanda diária, do desvio e do fator Z.",
    "exemplo": "sku;media_dia;desvio_dia;prazo_dias;estoque;recebimentos;fator_z;custo_unitario\nCAM-01;10;4;9;70;10;1,65;55\nCAM-02;3;1,5;15;28;5;1,28;80",
    "limite": "Requer demanda independente e lead time fixo; o nível de serviço é teórico."
  },
  "custo-cancelamentos-pedidos": {
    "nome": "Auditar perdas por cancelamento",
    "explicacao": "Separe vendas potencialmente perdidas de tarifas, frete e publicidade efetivamente não recuperados.",
    "exemplo": "motivo;cancelados;recuperados;ticket_medio;tarifas_perdidas_total;frete_perdido_total;ads_perdidos_total\nPagamento recusado;50;12;100;70;0;150\nFalta estoque;20;3;180;0;30;100",
    "limite": "Custos são totais por motivo, não por pedido. Receita exposta não equivale a lucro perdido."
  },
  "ocupacao-armazenagem": {
    "nome": "Medir ocupação de armazenagem",
    "explicacao": "Projete capacidade cúbica utilizável, entrada futura e excesso por zona de estoque.",
    "exemplo": "zona;posicoes;largura_m;profundidade_m;altura_util_m;ocupado_m3;entrada_prevista_m3;reserva_pct\nA1;50;1,2;1;2;70;20;10\nB2;30;1;1;2;30;15;15",
    "limite": "O modelo é volumétrico e não substitui limites estruturais, normas de segurança ou cálculo de paletização."
  },
  "compras-priorizadas-orcamento": {
    "nome": "Distribuir orçamento de compras",
    "explicacao": "Monte plano de compras por urgência e lote mínimo com orçamento total limitado.",
    "exemplo": "sku;demanda_prazo;estoque;recebimentos;custo_unitario;prioridade;lote_minimo\nCAM-01;100;20;10;20;5;10\nCAM-02;120;35;5;35;3;10\nCAM-03;30;20;0;10;4;5",
    "limite": "Heurística por prioridade e custo; não resolve otimização global. Revise as quantidades propostas."
  },
  "projecao-assinaturas-recorrentes": {
    "nome": "Projetar receita recorrente",
    "explicacao": "Simule assinantes esperados, churn, receita, contribuição e payback de CAC.",
    "exemplo": "plano;assinantes_inicio;novos_mes;churn_pct;preco_mes;custo_mes;taxa_pct;cac_novo;meses\nEssencial;100;20;5;40;10;4;45;6\nPremium;40;8;3;90;25;5;80;6",
    "limite": "Cenários esperados podem ter números fracionários de assinantes; não prevê comportamento real."
  }
});
export const TIPOS_OPERACOES_INTERFACE=Object.freeze(Object.keys(ITEMS));

export function apresentarOperacaoAvancada(r,slug){
 if(!r||!Array.isArray(r.planilha)||r.planilha.length<2||
    !Array.isArray(r.planilha[0])||!Array.isArray(r.indicadores)||
    !Array.isArray(r.avisos)||!Array.isArray(r.alertas))
   throw new ErroDeEntrada('Relatório Premium incompleto ou inválido.');
 const tabela=r.planilha;
 if(tabela.some(l=>!Array.isArray(l)||l.length!==tabela[0].length))
   throw new ErroDeEntrada('O relatório tem colunas inconsistentes.');
 const metrics=r.indicadores.map(([chave,valor])=>[String(chave),String(valor)]);
 return {
  valor:metrics.find(([t])=>/Contribuição|Capital|Compra|Custo|Receita|Perdas|Divergência|Investimento/.test(t))?.[1]??String(r.total),
  resumo:r.titulo+' · '+r.total+' registro(s).',
  linhas:metrics,
  tabela:{cabeçalho:tabela[0].slice(0,10),linhas:tabela.slice(1,21).map(l=>l.slice(0,10)),semExportação:true},
  observações:['Prévia dos primeiros 20 registros. Exportações incluem todos os registros.',
   ...r.avisos,...r.alertas.slice(0,15)],
  texto:[r.titulo,...metrics.map(x=>x.join(': ')),...r.alertas,...r.avisos].join('\n'),
  arquivos:[
   {rótulo:'Exportar CSV completo',ícone:'baixar',
    gerar:()=>baixarCsv(tabela,slug)},
   {rótulo:'Exportar planilha Excel',ícone:'planilha',
    gerar:()=>baixarPlanilha(tabela,slug,{aba:'Análise Premium'})}
  ]
 };
}
export function criarModuloOperacaoAvancada(slug){
 const config=ITEMS[slug];if(!config)throw new Error('Recurso desconhecido: '+slug);
 const campos=[
  ...(slug==='compras-priorizadas-orcamento'?[{nome:'orcamento',rótulo:'Orçamento total disponível (R$)',
   tipo:'número',padrão:'1500',dica:'O algoritmo limita compras à verba informada.'}]:[]),
  {nome:'csv',rótulo:'Dados por item (CSV/TSV)',tipo:'área',linhas:11,
   padrão:config.exemplo,dica:'Cole o cabeçalho e substitua os números de exemplo. Máximo 500 linhas.'}
 ];
 return {
  instruções:{
   passos:[
    'Abra o Sites ADS com servidor HTTPS e entre em uma conta com plano Premium ou acesso administrativo.',
    'Prepare seu CSV/TSV com os nomes das colunas do exemplo; não informe nomes, CPF nem e-mails de consumidores.',
    config.explicacao,
    'Clique em analisar, leia os indicadores e confira os alertas para cada SKU ou grupo.',
    'Exporte CSV ou Excel completos para revisão externa antes de tomar qualquer decisão.'
   ],
   exemplo:{texto:config.explicacao+' O preenchimento inicial demonstra dados fictícios, não suas vendas reais.'},
   limites:config.limite+' Até 500 registros por arquivo e 270 KB de dados por análise. A ferramenta não modifica estoque, tarifas, pedidos ou pagamentos.',
   perguntas:[
    {p:'Preciso conectar banco ou marketplace?',r:'Não. Informe CSV/TSV exportado de sua própria operação, sem senhas.'},
    {p:'Funciona no GitHub Pages?',r:'A vitrine estática exibe a ferramenta, mas o processamento depende do servidor e da conta Premium.'},
    {p:'O relatório garante ganhos financeiros?',r:'Não. São indicadores e cenários com base nos valores fornecidos, que precisam de validação.'}
   ]
  },
  montar(raiz,ferramenta){
   montarFerramenta(raiz,ferramenta,{
    rótuloDaAção:config.nome,demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
    campos,
    calcular:async entrada=>{
     const csv=String(entrada.csv??'');
     if(!csv.trim()||new TextEncoder().encode(csv).length>270000)
      throw new ErroDeEntrada('Cole CSV/TSV de até 270 KB.','csv');
     const dados={csv};
     if(slug==='compras-priorizadas-orcamento'){
      const orcamento=String(entrada.orcamento??'').trim();
      if(!/^\d+(?:[.,]\d{1,4})?$/.test(orcamento))
       throw new ErroDeEntrada('Informe orçamento positivo com até 4 casas decimais.','orcamento');
      dados.orcamento=orcamento;
     }
     try{
      const resposta=await api('/api/premium/operacoes-avancadas/'+slug,{
       metodo:'POST',dados,prazoMs:30000
      });
      return apresentarOperacaoAvancada(resposta.relatorio,slug);
     }catch(e){
      if(e instanceof ErroApi&&e.status===401)
       throw new ErroDeEntrada('Entre na sua conta para usar a ferramenta.','csv');
      if(e instanceof ErroApi&&e.status===403)
       throw new ErroDeEntrada('A análise requer plano Premium ativo. Consulte os planos.','csv');
      if(e instanceof ErroApi&&e.status===400)
       throw new ErroDeEntrada('Dados inválidos: '+e.message,'csv');
      if(e instanceof ErroApi&&e.indisponivel)
       throw new ErroDeEntrada('O servidor Premium está indisponível nesta prévia.','csv');
      throw e;
     }
    },
    aoMontar(){
     const aviso=document.createElement('aside');aviso.className='premium-recurso';
     const p=document.createElement('p');
     p.textContent='Premium · '+config.explicacao+' Não conecta plataformas externas nem altera pedidos.';
     const a=document.createElement('a');a.href='../../planos.html';
     a.className='botão botão--linha';a.textContent='Planos do portal';
     aviso.append(p,a);
     raiz.querySelector('#formulário')?.before(aviso);
    }
   });
  }
 };
}
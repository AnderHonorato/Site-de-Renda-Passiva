/** F232–F236: interface compartilhada; métricas calculadas exclusivamente na API Premium. */
import {montarFerramenta,baixarCsv,baixarPlanilha,ErroDeEntrada} from './montador.js';
import {api,ErroApi} from './api.js';

const RECURSOS={
 'risco-ruptura-produtos':{
  nome:'Auditar ruptura e receita em risco',
  explicacao:'Calcule cobertura em dias, provável ruptura no prazo de compra e reposição sugerida por SKU.',
  exemplo:'sku;vendas_dia;estoque;recebimentos_confirmados;prazo_dias;seguranca_unidades;preco;custo\nCAM-01;10;15;5;5;10;30;15\nCAM-02;2;100;0;3;15;110;55',
  limite:'O recebimento informado é considerado disponível até o prazo; não há ligação com ERP, sazonalidade ou lotes mínimos.',
  faq:'Receita em risco é lucro perdido? Não. É preço de venda multiplicado pela falta estimada, sem garantia de demanda.'
 },
 'simulador-frete-gratis':{
  nome:'Simular custo do frete grátis',
  explicacao:'Compare contribuição por unidade com frete cobrado e frete grátis, incluindo taxas, CMV, mídia e volume.',
  exemplo:'sku;preco;cmv;comissao_pct;imposto_pct;frete_cobrado;frete_pago;ads;unidades;meta_margem_pct\nKIT-01;100;50;10;5;15;15;5;100;10\nCAM-02;80;44;13;5;10;16;3;50;12',
  limite:'Supõe o mesmo volume de pedidos, preço e custo de frete em ambos cenários. Não modela conversão adicional por frete grátis.',
  faq:'O preço mínimo inclui frete cobrado? Não. É preço de produto para sustentar frete grátis e a margem informada.'
 },
 'impacto-reajuste-fornecedores':{
  nome:'Simular reajustes de fornecedores',
  explicacao:'Recalcule contribuição, margem após aumento do custo e preço necessário para margem-alvo.',
  exemplo:'sku;custo_anterior;custo_novo;preco;comissao_pct;imposto_pct;unidades;meta_margem_pct\nSKU-01;40;52;100;10;5;20;20\nSKU-02;75;82;135;12;5;40;18',
  limite:'Sem frete de compra, devoluções, custos fixos ou elasticidade de demanda. Os volumes são mantidos constantes.',
  faq:'O preço para meta é uma recomendação automática? Não. É um piso matemático nas premissas que você informou.'
 },
 'capacidade-expedicao-turnos':{
  nome:'Planejar capacidade de expedição',
  explicacao:'Estime capacidade líquida de separação/expedição por turno e backlog, considerando operadores e retrabalho.',
  exemplo:'turno;operadores;horas_liquidas;produtividade_pedidos_hora;taxa_retrabalho_pct;demanda_pedidos;pendentes_anteriores\nManha;2;4;10;10;100;20\nNoite;3;5;8;5;90;0',
  limite:'Turnos são analisados separadamente; não inclui paradas imprevistas, restrições de transportadora ou disponibilidade de embalagem.',
  faq:'Horas adicionais são horas de relógio? Não. São horas de trabalho de operador, que precisam ser distribuídas pela equipe.'
 },
 'margem-pedidos-estornos':{
  nome:'Auditar margem de pedidos',
  explicacao:'Cruze receita, descontos, CMV, impostos, taxas, frete, mídia e estornos para identificar pedidos com contribuição negativa.',
  exemplo:'pedido;canal;receita_bruta;desconto;cmv;comissao;impostos;frete_pago;frete_recebido;ads;estorno;unidades\nP-001;Canal A;200;20;100;15;10;10;5;5;20;2\nP-002;Canal B;140;10;75;20;7;15;0;8;0;1',
  limite:'O estorno reduz receita, mas o CMV não é revertido automaticamente. Só use IDs de pedido pseudônimos, sem dados pessoais.',
  faq:'O sistema importa os pedidos automaticamente? Não. Analisa somente o CSV fornecido, sem acessar contas ou movimentar dinheiro.'
 }
};
export const TIPOS_INTERFACE=Object.freeze(Object.keys(RECURSOS));

export function apresentarResultadoPlanejamento(r,slug){
 if(!r||!Array.isArray(r.planilha)||r.planilha.length<2||
    !Array.isArray(r.planilha[0])||!Array.isArray(r.indicadores)||
    !Array.isArray(r.avisos)||!Array.isArray(r.alertas))
   throw new ErroDeEntrada('O servidor devolveu um relatório inesperado.');
 const tab=r.planilha;
 if(tab.some(row=>!Array.isArray(row)||row.length!==tab[0].length))
   throw new ErroDeEntrada('A tabela retornou colunas inconsistentes.');
 const indicadores=r.indicadores.map(([k,v])=>[String(k),String(v)]);
 const resumo=r.titulo+' · '+r.total+' registro(s).';
 return {
  valor:String(indicadores[1]?.[1]??r.total),
  resumo,linhas:indicadores,
  tabela:{cabeçalho:tab[0].slice(0,10),linhas:tab.slice(1,21).map(x=>x.slice(0,10)),semExportação:true},
  texto:[r.titulo,...indicadores.map(x=>x.join(': ')),...r.alertas,...r.avisos].join('\n'),
  observações:['A prévia mostra até 20 linhas; os arquivos incluem todos os registros.',...r.avisos,...r.alertas.slice(0,12)],
  arquivos:[
   {rótulo:'Exportar CSV completo',ícone:'baixar',gerar:()=>baixarCsv(tab,slug)},
   {rótulo:'Exportar Excel completo',ícone:'planilha',
    gerar:()=>baixarPlanilha(tab,slug,{aba:'Análise Premium'})}
  ]
 };
}
export function criarModuloPlanejamento(slug){
 const x=RECURSOS[slug];
 if(!x)throw new Error('Ferramenta não configurada: '+slug);
 return {
  instruções:{
   passos:[
    'Acesse o servidor Sites ADS e entre com uma conta Premium. O GitHub Pages é apenas uma prévia.',
    'Cole seus próprios dados CSV/TSV em um lote de até 500 registros, usando o cabeçalho do exemplo preenchido.',
    x.explicacao,
    'Execute e revise premissas, valores negativos e alertas por registro antes de tomar decisões financeiras.',
    'Exportar CSV ou Excel completo permite auditoria em sua planilha ou ERP, sem alterar pedidos automaticamente.'
   ],
   exemplo:{texto:x.explicacao+' Os números preenchidos são fictícios.'},
   limites:x.limite+' Máximo de 500 linhas e 270 KB de CSV; dados transitam pela API autenticada sem gravação permanente do lote. Sem integração bancária ou com marketplaces.',
   perguntas:[
    {p:'Por que a prévia GitHub Pages não calcula?',r:'A análise é privada e exige sessão Premium na API Node do servidor.'},
    {p:'Meus dados são enviados para algum serviço externo?',r:'O CSV vai apenas para o servidor Sites ADS configurado, sem ser enviado a serviços terceiros pela ferramenta.'},
    {p:x.faq.split('?')[0]+'?',r:x.faq.split('?').slice(1).join('?').trim()},
   ]
  },
  montar(raiz,ferramenta){
   montarFerramenta(raiz,ferramenta,{
    rótuloDaAção:x.nome,demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
    campos:[{nome:'csv',rótulo:'Dados operacionais (CSV/TSV)',tipo:'área',linhas:11,
      padrão:x.exemplo,dica:'Até 500 registros. Copie o cabeçalho exato e troque os números fictícios.'}],
    calcular:async dados=>{
     const value=String(dados.csv??'');
     if(!value.trim()||new TextEncoder().encode(value).length>270000)
      throw new ErroDeEntrada('Cole uma tabela CSV/TSV com até 270 KB.','csv');
     try{
      const resp=await api('/api/premium/planejamento/'+slug,{metodo:'POST',
        dados:{csv:value},prazoMs:25000});
      return apresentarResultadoPlanejamento(resp.relatorio,slug);
     }catch(e){
      if(e instanceof ErroApi&&e.status===401)
       throw new ErroDeEntrada('Entre na sua conta para usar esta ferramenta.','csv');
      if(e instanceof ErroApi&&e.status===403)
       throw new ErroDeEntrada('Esta análise exige plano Premium ativo. Consulte Planos.','csv');
      if(e instanceof ErroApi&&e.status===400)
       throw new ErroDeEntrada('Dados inválidos: '+e.message,'csv');
      if(e instanceof ErroApi&&e.indisponivel)
       throw new ErroDeEntrada('API Premium indisponível. Abra o servidor Sites ADS.','csv');
      throw e;
     }
    },
    aoMontar(){
     const aviso=document.createElement('aside');aviso.className='premium-recurso';
     const texto=document.createElement('p');
     texto.textContent='Premium · '+x.explicacao+' Não movimenta dinheiro nem altera estoque ou pedidos.';
     const link=document.createElement('a');link.href='../../planos.html';
     link.className='botão botão--linha';link.textContent='Comparar planos';
     aviso.append(texto,link);raiz.querySelector('#formulário')?.before(aviso);
    }
   });
  }
 };
}

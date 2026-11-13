/**
 * Amostras demonstrativas das ferramentas pagas anteriores ao lote F252.
 * Os motores são módulos privados de servidor importados apenas no build; este
 * arquivo não é incluído nos scripts entregues ao navegador.
 */
import { ferramentas } from '../../dados/catálogo.js';
import { analisarVendasPremium } from '../../servidor/analise-premium.mjs';
import { analisarLotePremium } from '../../servidor/analises-premium-lote.mjs';
import { planejarEstoque } from '../../servidor/estoque-abc-xyz.mjs';
import { EXEMPLO_ESTOQUE, lerEntradaEstoque, tabelaCompletaEstoque } from '../../scripts/ferramentas/planejamento-estoque-premium.js';
import { auditarFeedMerchant } from '../../servidor/auditoria-merchant.mjs';
import { auditarSeoProdutos } from '../../servidor/auditoria-seo-produtos.mjs';
import { executarPlanejamento } from '../../servidor/planejamento-premium-2.mjs';
import { executarEstrategiaPremium } from '../../servidor/estrategia-premium.mjs';
import { executarOperacoes } from '../../servidor/operacoes-profissionais.mjs';
import { executarAnalitica } from '../../servidor/analitica-profissional.mjs';
import { executarOperacaoAvancada } from '../../servidor/operacoes-avancadas-2.mjs';

const amostras = {
  'previsao-de-vendas': {historico: [
    'sku;mes;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_un;imposto_pct;perdas_pct;estoque;prazo_dias',
    'SKU1;2026-06;10;100;40;12;3;10;5;5;2;10;7', 'SKU1;2026-07;20;100;40;12;3;10;5;5;2;10;7',
    'SKU1;2026-08;30;100;40;12;3;10;5;5;2;10;7', 'SKU1;2026-09;40;100;40;12;3;10;5;5;2;10;7',
    'SKU1;2026-10;50;100;40;12;3;10;5;5;2;10;7', 'SKU2;2026-08;6;200;100;12;3;10;5;5;2;10;7',
    'SKU2;2026-09;8;200;100;12;3;10;5;5;2;10;7', 'SKU2;2026-10;12;200;100;12;3;10;5;5;2;10;7',
  ].join('\n'), cenario: 0, margemMeta: 15},
  'auditor-de-feed-merchant': {feed: [
    'id;title;description;link;image_link;availability;price;condition;brand;gtin',
    'SKU1;Camiseta algodão azul tamanho M;Camiseta 100 por cento algodão;https://loja.exemplo/p1;https://loja.exemplo/img/p1.jpg;in_stock;99.90 BRL;new;Marca Exemplo;7891234567895',
    'SKU2;Frete grátis;Descrição;ftp://site.exemplo/p2;https://loja.exemplo/img/p2.jpg;maybe;0,00 BRL;novo;;123',
  ].join('\n')},
  'planejamento-estoque-premium': {estoque: EXEMPLO_ESTOQUE},
  'auditoria-seo-produtos': {csv: [
    'sku;url;title;meta_description;h1;canonical;robots;image_url;image_alt;jsonld',
    'AZ-M;https://loja.exemplo/camiseta;Camiseta azul tamanho M | Loja Exemplo;Camiseta azul M de algodão com acabamento reforçado para uso diário.;Camiseta azul M;https://loja.exemplo/camiseta;index,follow;https://loja.exemplo/foto.jpg;Camiseta azul tamanho M;{"@type":"Product","name":"Camiseta azul M","image":"https://loja.exemplo/foto.jpg","sku":"AZ-M","offers":{"@type":"Offer","price":"79.90","priceCurrency":"BRL"}}',
    'AZ-P;https://loja.exemplo/camiseta-p;Camiseta azul | Loja Exemplo;Descrição da camiseta azul;Camiseta azul;https://loja.exemplo/outra;noindex;https://loja.exemplo/foto-p.jpg;;{"@type":"Product","name":"Camiseta azul","offers":{"@type":"Offer","priceCurrency":"BRL"}}',
  ].join('\n')},
  'simulador-margem-marketplaces': {csv: 'sku;canal;unidades;preco;cmv;comissao_pct;tarifa_fixa;frete;ads_unitario;imposto_pct;devolucao_pct;meta_margem_pct\nS1;CanalA;10;100;40;10;2;5;3;5;2;15'},
  'conciliacao-de-repasses': {pedidos: 'pedido;canal;previsto;status\nP1;Canal A;100;pago\nP2;Canal A;30;pago', repasses: 'pedido;recebido;taxas\nP1;90;10\nP2;20;5'},
  'auditoria-de-devolucoes': {vendas: 'sku;vendidas;preco;cmv;frete;taxas\nS1;10;100;40;20;30', devolucoes: 'sku;devolvidas;reembolsos;frete_reverso;perdas\nS1;2;200;20;30'},
  'divergencias-de-inventario': {csv: 'sku;erp;contagem;reservado;custo\nS1;30;28;5;40'},
  'analise-de-campanhas-ads': {csv: 'campanha;impressoes;cliques;pedidos;receita;gasto;cmv;taxas;meta_roas\nA;1000;100;10;1200;200;500;100;3'},
  'precificacao-de-promocoes': {csv: 'sku;preco_normal;preco_promocional;cmv;comissao_pct;imposto_pct;frete;ads;unidades_previstas;meta_margem_pct\nSKU1;120;100;50;10;5;4;3;10;15'},
  'projecao-caixa-operacional': {saldo_inicial: '100', saldo_minimo: '50', recebiveis: 'data;origem;valor;probabilidade_pct\n2026-11-08;Cliente;100;80', pagamentos: 'data;categoria;valor\n2026-11-09;Fornecedor;90'},
  'comparador-de-fornecedores': {csv: 'sku;fornecedor;quantidade;preco_unitario;frete_total;imposto_pct;prazo_dias;minimo_lote;orcamento\nSKU1;A;10;20;10;5;3;10;300\nSKU1;B;10;19;20;5;5;10;300'},
  'auditoria-de-cupons': {csv: 'campanha;sku;preco;cmv;comissao_pct;imposto_pct;frete;ads;desconto_pct;subsidio_fixo;unidades\nCampA;S1;100;50;10;5;5;5;10;2;10'},
  'priorizacao-de-catalogo': {csv: 'sku;visitas;pedidos;receita;cmv;ads;devolucoes;estoque;prazo_dias;dias_periodo\nSKU1;1000;40;4000;1700;500;2;5;7;30\nSKU2;500;10;900;400;200;1;30;10;30'},
  'planejamento-kits-combos': {kits: 'kit;preco;unidades_previstas;comissao_pct;tarifa_fixa;embalagem;ads_unitario\nK1;180;8;10;0;5;0\nK2;120;8;10;0;5;0', componentes: 'kit;componente;quantidade;estoque;cmv\nK1;A;2;20;20\nK1;B;1;15;10\nK2;A;1;20;20'},
  'auditoria-sla-logistico': {data_referencia: '2026-11-03', pedidos: 'pedido;canal;data_pagamento;prazo_postagem;data_postagem;prazo_entrega;data_entrega;valor\nP1;Loja;2026-10-01;2026-10-03;2026-10-04;2026-10-06;2026-10-09;100\nP2;Loja;2026-10-30;2026-11-01;;2026-11-02;;200'},
  'coortes-retencao-ltv': {pedidos: 'pedido;cliente;data;receita;cmv;outros_custos\nP1;C1;2026-07-03;100;40;10\nP2;C2;2026-07-11;80;30;10\nP3;C1;2026-08-04;150;60;20', aquisicao: 'mes;gasto_aquisicao\n2026-07;60'},
  'transferencias-entre-cds': {estoques: 'sku;cd;estoque;reservado;demanda_diaria;prazo_fornecedor;dias_seguranca\nS1;A;100;0;1;7;3\nS1;B;2;0;3;10;2', rotas: 'origem;destino;prazo_dias;custo_unitario;capacidade\nA;B;3;2;20'},
  'risco-concentracao-comercial': {csv: 'sku;canal;fornecedor;receita;custos_variaveis\nS1;Canal A;Fab1;1000;500\nS2;Canal A;Fab2;500;300\nS3;Canal B;Fab2;500;200', queda_top_canal_pct: 30, queda_top_fornecedor_pct: 40},
  'auditoria-faturas-frete': {csv: 'etiqueta;pedido;transportadora;comprimento_cm;largura_cm;altura_cm;peso_real_kg;divisor_cubagem;peso_faturado_kg;frete_base;adicionais_autorizados;frete_faturado;frete_repassado\nE1;P1;T1;30;20;20;1.2;6000;2;18;3;28;12'},
  'afinidade-cestas-pedidos': {suporte_min_pct: '10', confianca_min_pct: '20', csv: 'pedido;sku;unidades;receita\nP1;A;1;30\nP1;B;1;20\nP2;A;1;30\nP2;B;1;20\nP3;A;1;30\nP3;C;1;20'},
  'inadimplencia-recebiveis': {data_referencia: '2026-11-03', csv: 'fatura;cliente;emissao;vencimento;valor;valor_pago;data_pagamento\nF1;C1;2026-09-01;2026-09-30;1000;200;2026-09-15\nF2;C2;2026-10-01;2026-11-30;500;0;'},
  'experimentos-ab-lote': {csv: 'experimento;variacao;controle;visitantes;conversoes;receita;custos\nE1;A;1;1000;100;10000;5000\nE1;B;0;1000;200;16000;7000'},
  'diagnostico-checkout-segmentos': {csv: 'periodo;segmento;sessoes;visitas_produto;carrinhos;checkout;compras;receita\n2026-10;Mobile;1000;800;100;60;50;5000'},
  'risco-ruptura-produtos': {csv: 'sku;vendas_dia;estoque;recebimentos_confirmados;prazo_dias;seguranca_unidades;preco;custo\nA;10;15;5;5;10;30;15'},
  'simulador-frete-gratis': {csv: 'sku;preco;cmv;comissao_pct;imposto_pct;frete_cobrado;frete_pago;ads;unidades;meta_margem_pct\nA;100;50;10;5;15;15;5;100;10'},
  'impacto-reajuste-fornecedores': {csv: 'sku;custo_anterior;custo_novo;preco;comissao_pct;imposto_pct;unidades;meta_margem_pct\nA;40;52;100;10;5;20;20'},
  'capacidade-expedicao-turnos': {csv: 'turno;operadores;horas_liquidas;produtividade_pedidos_hora;taxa_retrabalho_pct;demanda_pedidos;pendentes_anteriores\nManha;2;4;10;10;100;20'},
  'margem-pedidos-estornos': {csv: 'pedido;canal;receita_bruta;desconto;cmv;comissao;impostos;frete_pago;frete_recebido;ads;estorno;unidades\nP1;Loja;200;20;100;15;10;10;5;5;20;2'},
  'descontos-progressivos-lote': {csv: 'sku;preco_normal;desconto_pct;quantidade;custo_unitario;taxas_pct;frete_total;meta_margem_pct\nA;100;15;50;55;12;100;10'},
  'estoque-parado-capital': {csv: 'sku;estoque;dias_sem_venda;vendas_90_dias;custo_unitario;preco;custo_carrego_pct_mes\nA;120;120;0;50;95;2'},
  'ciclo-financeiro-capital-giro': {csv: 'unidade;cmv_anual;estoque_medio;receita_anual;contas_receber;compras_anuais;contas_pagar;reduzir_dso_dias\nLoja A;365000;50000;730000;60000;300000;28000;10'},
  'auditoria-taxas-pagamentos': {csv: 'transacao;meio;valor_bruto;taxa_contratada_pct;taxa_cobrada_pct;fixa_contratada;fixa_cobrada;antecipacao_contratada;antecipacao_cobrada\nT1;Cartao;200;2,5;3;0;0;0;1'},
  'politica-frete-faixas': {csv: 'faixa;pedidos;ticket_medio;cmv_pct;taxas_pct;frete_pago;frete_cobrado;ads_por_pedido;meta_margem_pct\nAte 99;100;80;40;12;15;10;4;10'},
  'estoque-seguranca-estatistico': {csv: 'sku;media_dia;desvio_dia;prazo_dias;estoque;recebimentos;fator_z;custo_unitario\nA;10;4;9;70;10;1,65;55'},
  'custo-cancelamentos-pedidos': {csv: 'motivo;cancelados;recuperados;ticket_medio;tarifas_perdidas_total;frete_perdido_total;ads_perdidos_total\nPagamento recusado;50;12;100;70;0;150'},
  'ocupacao-armazenagem': {csv: 'zona;posicoes;largura_m;profundidade_m;altura_util_m;ocupado_m3;entrada_prevista_m3;reserva_pct\nA1;50;1,2;1;2;70;20;10'},
  'compras-priorizadas-orcamento': {csv: 'sku;demanda_prazo;estoque;recebimentos;custo_unitario;prioridade;lote_minimo\nCAM-01;100;20;10;20;5;10\nCAM-02;120;35;5;35;3;10\nCAM-03;30;20;0;10;4;5', orcamento: 1500},
  'projecao-assinaturas-recorrentes': {csv: 'plano;assinantes_inicio;novos_mes;churn_pct;preco_mes;custo_mes;taxa_pct;cac_novo;meses\nEssencial;100;20;5;40;10;4;45;1'},
};

const adaptadores = {
  'previsao-de-vendas': (d) => {
    const r = analisarVendasPremium(d);
    const cols = ['SKU', 'Unidades projetadas', 'Receita projetada', 'Lucro projetado'];
    const rows = r.itens.slice(0, 5).map(x => [x.sku, x.projecaoUnidades?.reduce((a, n) => a + n, 0) ?? 0, x.receitaProjetada, x.lucroProjetado]);
    return {indicadores: [['SKUs analisados', r.skuTotal], ['Receita projetada', r.receitaProjetada], ['Lucro projetado', r.lucroProjetado]], tabela: {colunas: cols, linhas: rows}, series: r.itens.slice(0, 6).map(x => ({rotulo: x.sku, valor: x.receitaProjetada})), metodo: 'Projeção de demanda por SKU a partir do histórico mensal e dos custos informados.', notas: ['Projeção baseada somente nos dados de entrada; não representa garantia de vendas.']};
  },
  'auditor-de-feed-merchant': (d) => {
    const r = auditarFeedMerchant(d);
    return {indicadores: [['Produtos verificados', r.produtos], ['Com bloqueio', r.produtosComBloqueio], ['Pontuação de saúde', r.saudePontuacao]], tabela: {colunas: ['Produto', 'Código', 'Gravidade', 'Problema'], linhas: r.problemas.slice(0, 5).map(p => [p.id || p.sku || 'Produto', p.codigo, p.gravidade, p.mensagem || p.descricao || p.codigo])}, series: [{rotulo: 'Produtos', valor: r.produtos}, {rotulo: 'Com bloqueio', valor: r.produtosComBloqueio}, {rotulo: 'Saúde do feed', valor: r.saudePontuacao}], metodo: 'Valida campos locais do feed e aponta problemas conforme as regras do formato Merchant.', notas: [...(r.avisos || []), ...(r.problemas.length ? [] : ['A amostra não contém problemas identificados.'])]};
  },
  'planejamento-estoque-premium': (d) => {
    const entrada = lerEntradaEstoque(d.estoque);
    const r = planejarEstoque(entrada), t = tabelaCompletaEstoque(r);
    return {indicadores: [['SKUs planejados', r.totalSkus], ['Investimento em reposição', r.investimentoReposicao], ['Horizonte (meses)', r.horizonteMeses]], tabela: {colunas: t[0], linhas: t.slice(1, 6)}, series: r.itens.slice(0, 6).map(x => ({rotulo: x.sku, valor: x.investimentoReposicao || 0})), metodo: 'Previsão sazonal de demanda e sugestão de reposição por SKU.', notas: ['Sazonalidade, demanda e custo vêm da amostra local; não há consulta a estoque externo.']};
  },
  'auditoria-seo-produtos': (d) => {
    const r = auditarSeoProdutos(d);
    return {indicadores: [['Páginas analisadas', r.paginas], ['Problemas críticos', r.criticas], ['Problemas encontrados', r.problemas.length]], tabela: {colunas: ['SKU', 'Código', 'Gravidade', 'Diagnóstico'], linhas: r.problemas.slice(0, 5).map(p => [p.sku || p.url || 'Página', p.codigo, p.gravidade, p.mensagem || p.descricao || p.codigo])}, series: [{rotulo: 'Páginas', valor: r.paginas}, {rotulo: 'Críticos', valor: r.criticas}, {rotulo: 'Problemas', valor: r.problemas.length}], metodo: 'Verifica metadados, links canônicos, indexação e dados estruturados presentes na planilha.', notas: ['Auditoria local da amostra; não consulta rastreamento ou índices de buscadores.']};
  },
};

function parseCsv(csv, limite = 3) {
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < csv.length && linhas.length <= limite; i++) {
    const c = csv[i];
    if (c === '"' && aspas && csv[i + 1] === '"') { campo += '"'; i++; }
    else if (c === '"') aspas = !aspas;
    else if (c === ';' && !aspas) { linha.push(campo); campo = ''; }
    else if ((c === '\n' || c === '\r') && !aspas) { if (c === '\r' && csv[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  }
  if (linhas.length <= limite && (campo || linha.length)) { linha.push(campo); linhas.push(linha); }
  return linhas.slice(0, limite + 1).map(row => row.slice(0, 4));
}

function entradaDemo(dados) {
  const chaves = Object.keys(dados);
  const tabelas = chaves.filter(k => typeof dados[k] === 'string' && dados[k].includes('\n'));
  if (tabelas.length > 1) {
    const texto = tabelas.map(k => `${k}: ${dados[k].split(/\r?\n/).slice(0, 2).join(' / ')}`).join(' · ');
    return {rotulo: 'Amostra fictícia de entrada', texto: texto.slice(0, 300)};
  }
  const chaveArquivo = chaves.find(k => ['csv', 'feed', 'historico', 'estoque', 'pedidos', 'kits', 'vendas'].includes(k) && typeof dados[k] === 'string');
  if (chaveArquivo) {
    const csv = dados[chaveArquivo];
    const p = parseCsv(csv);
    return {rotulo: 'Amostra fictícia de entrada', arquivo: `${chaveArquivo}.csv`, colunas: p[0] || [], linhas: p.slice(1, 4)};
  }
  const resumos = chaves.filter(k => typeof dados[k] === 'string').map(k => `${k}: ${dados[k].split('\n')[0]}`).join(' · ');
  return {rotulo: 'Entradas fictícias', texto: (resumos || 'Parâmetros demonstrativos').slice(0, 300)};
}

function normalizarRelatorio(r) {
  const planilha = r.planilha || [];
  const colunas = planilha[0] || ['Item', 'Resultado'];
  const linhas = planilha.slice(1, 6);
  const indicadores = (r.indicadores || []).slice(0, 3);
  let series = (r.series || []).slice(0, 6).map(x => ({rotulo: String(x.nome || x.rotulo || ''), valor: Number(x.valor) || 0}));
  if (!series.length) series = linhas.map((row, i) => {
    const index = row.findIndex(value => typeof value === 'number' && Number.isFinite(value));
    return index < 0 ? null : {rotulo: String(row[0] ?? `Item ${i + 1}`).slice(0, 70), valor: row[index]};
  }).filter(Boolean).slice(0, 6);
  return {indicadores, tabela: {colunas: colunas.slice(0, 4), linhas: linhas.map(row => row.slice(0, 4))}, series,
    metodo: String(r.metodo || r.titulo || 'Análise calculada a partir dos dados de entrada.').slice(0, 180),
    notas: (r.avisos || r.notas || []).slice(0, 4).map(String)};
}

function calcular(slug, dados) {
  if (adaptadores[slug]) return adaptadores[slug](dados);
  if (['simulador-margem-marketplaces', 'conciliacao-de-repasses', 'auditoria-de-devolucoes', 'divergencias-de-inventario', 'analise-de-campanhas-ads'].includes(slug)) return normalizarRelatorio(analisarLotePremium(slug, dados));
  if (['risco-ruptura-produtos', 'simulador-frete-gratis', 'impacto-reajuste-fornecedores', 'capacidade-expedicao-turnos', 'margem-pedidos-estornos'].includes(slug)) return normalizarRelatorio(executarPlanejamento(slug, dados));
  if (['precificacao-de-promocoes', 'projecao-caixa-operacional', 'comparador-de-fornecedores', 'auditoria-de-cupons', 'priorizacao-de-catalogo'].includes(slug)) return normalizarRelatorio(executarEstrategiaPremium(slug, dados));
  if (['planejamento-kits-combos', 'auditoria-sla-logistico', 'coortes-retencao-ltv', 'transferencias-entre-cds', 'risco-concentracao-comercial'].includes(slug)) return normalizarRelatorio(executarOperacoes(slug, dados));
  if (['auditoria-faturas-frete', 'afinidade-cestas-pedidos', 'inadimplencia-recebiveis', 'experimentos-ab-lote', 'diagnostico-checkout-segmentos'].includes(slug)) return normalizarRelatorio(executarAnalitica(slug, dados));
  if (['descontos-progressivos-lote', 'estoque-parado-capital', 'ciclo-financeiro-capital-giro', 'auditoria-taxas-pagamentos', 'politica-frete-faixas', 'estoque-seguranca-estatistico', 'custo-cancelamentos-pedidos', 'ocupacao-armazenagem', 'compras-priorizadas-orcamento', 'projecao-assinaturas-recorrentes'].includes(slug)) return normalizarRelatorio(executarOperacaoAvancada(slug, dados));
  throw new Error(`Sem demonstração legada para ${slug}`);
}

const exportacoes = slug => ferramentas.find(f => f.slug === slug)?.exporta || ['csv'];
const imagensIlustrativas = {
  indicadores: [],
  tabela: {colunas: ['Etapa', 'Ação', 'Formato', 'Execução'], linhas: [['Entrada', 'Selecionar imagens', 'PNG/JPG/WebP', 'No aparelho'], ['Configuração', 'Informar dimensões', 'Largura e altura', 'Ajustáveis'], ['Saída', 'Baixar imagens', 'Arquivos ou ZIP', 'No aparelho']]},
  series: [], metodo: 'Redimensionamento local no navegador usando as dimensões informadas pelo usuário.',
  notas: ['Fluxo ilustrativo sem arquivo binário: a animação mostra a ideia do redimensionamento. Dimensões e tamanho final dependem das imagens e configurações escolhidas.'],
};

export async function demonstracoesLegadas() {
  const demos = new Map();
  const elegiveis = ferramentas.filter(f => Number(f.id.slice(1)) < 252 && f.status === 'pronta' && ['plus', 'premium'].includes(f.plano));
  for (const ferramenta of elegiveis) {
    const {slug, nome, plano} = ferramenta;
    if (slug === 'redimensionar-imagens-em-lote') {
      demos.set(slug, {slug, nome, plano, entrada: {rotulo: 'Entrada local', texto: 'Selecionar imagens · dimensões desejadas · formato de saída'}, ...imagensIlustrativas, exporta: exportacoes(slug), tipo: 'ilustrativo'});
      continue;
    }
    const dados = amostras[slug];
    if (!dados) throw new Error(`Fixture legada ausente: ${slug}`);
    const r = calcular(slug, dados);
    demos.set(slug, {slug, nome, plano, entrada: entradaDemo(dados), indicadores: r.indicadores.slice(0, 3),
      tabela: {colunas: r.tabela.colunas.slice(0, 4), linhas: r.tabela.linhas.slice(0, 5)}, series: r.series.slice(0, 6),
      metodo: String(r.metodo).slice(0, 180), notas: (r.notas || []).slice(0, 4).map(x => String(x).slice(0, 180)),
      exporta: exportacoes(slug), tipo: 'calculado'});
  }
  return demos;
}

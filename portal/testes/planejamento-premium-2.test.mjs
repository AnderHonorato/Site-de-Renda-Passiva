import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {executarPlanejamento,ErroPlanejamento,TIPOS_PLANEJAMENTO} from '../servidor/planejamento-premium-2.mjs';
import {TIPOS_INTERFACE,criarModuloPlanejamento,apresentarResultadoPlanejamento} from '../scripts/núcleo/planejamento-premium-2.js';
import {ferramentaPorSlug} from '../dados/catálogo.js';

const EXEMPLOS={
 'risco-ruptura-produtos': 'sku;vendas_dia;estoque;recebimentos_confirmados;prazo_dias;seguranca_unidades;preco;custo\nA;10;15;5;5;10;30;15',
 'simulador-frete-gratis':'sku;preco;cmv;comissao_pct;imposto_pct;frete_cobrado;frete_pago;ads;unidades;meta_margem_pct\nA;100;50;10;5;15;15;5;100;10',
 'impacto-reajuste-fornecedores':'sku;custo_anterior;custo_novo;preco;comissao_pct;imposto_pct;unidades;meta_margem_pct\nA;40;52;100;10;5;20;20',
 'capacidade-expedicao-turnos':'turno;operadores;horas_liquidas;produtividade_pedidos_hora;taxa_retrabalho_pct;demanda_pedidos;pendentes_anteriores\nManha;2;4;10;10;100;20',
 'margem-pedidos-estornos':'pedido;canal;receita_bruta;desconto;cmv;comissao;impostos;frete_pago;frete_recebido;ads;estorno;unidades\nP1;Loja;200;20;100;15;10;10;5;5;20;2'
};

test('cinco ferramentas distintas, Premium e exportações completas',()=>{
 assert.deepEqual(TIPOS_PLANEJAMENTO,TIPOS_INTERFACE);
 assert.equal(TIPOS_PLANEJAMENTO.length,5);
 for(const slug of TIPOS_PLANEJAMENTO){
  const resultado=executarPlanejamento(slug,{csv:EXEMPLOS[slug]});
  assert.equal(resultado.planilha.length,2,slug);
  assert.ok(resultado.planilha[0].length>=9,slug);
  assert.equal(resultado.planilha[1].length,resultado.planilha[0].length,slug);
  assert.ok(resultado.avisos.length>=2,slug);
  const interfaceFerramenta=criarModuloPlanejamento(slug);
  assert.equal(typeof interfaceFerramenta.montar,'function',slug);
  assert.ok(interfaceFerramenta.instruções.passos.length>=5,slug);
  assert.equal(apresentarResultadoPlanejamento(resultado,slug).arquivos.length,2,slug);
  const cadastro=ferramentaPorSlug[slug];
  assert.equal(cadastro.plano,'premium',slug);
  assert.equal(cadastro.local,false,slug);
  assert.equal(cadastro.status,'pronta',slug);
 }
});

test('ruptura diferencia volume em risco e compra para segurança',()=>{
 const r=executarPlanejamento('risco-ruptura-produtos',{csv:EXEMPLOS['risco-ruptura-produtos']});
 const a=r.planilha[1];
 assert.equal(a[6],2);
 assert.equal(a[7],30);
 assert.equal(a[8],40);
 assert.equal(a[9],900);
 assert.equal(a[10],600);
 assert.equal(r.indicadores[1][1],1);
});

test('frete grátis remove recebimento de frete sem duplicar custo logístico',()=>{
 const r=executarPlanejamento('simulador-frete-gratis',{csv:EXEMPLOS['simulador-frete-gratis']});
 const a=r.planilha[1];
 assert.equal(a[3],30);
 assert.equal(a[4],15);
 assert.equal(a[5],15);
 assert.equal(a[6],-1500);
 assert.equal(a[7],93.33);
 assert.equal(r.indicadores[2][1],1500);
});

test('reajuste muda custo e contribuição mas preserva preço e volume',()=>{
 const r=executarPlanejamento('impacto-reajuste-fornecedores',{csv:EXEMPLOS['impacto-reajuste-fornecedores']});
 const a=r.planilha[1];
 assert.equal(a[6],45);
 assert.equal(a[7],33);
 assert.equal(a[8],33);
 assert.equal(a[9],-240);
 assert.equal(a[10],80);
});

test('capacidade de expedição aplica retrabalho e calcula backlog e horas-operador',()=>{
 const r=executarPlanejamento('capacidade-expedicao-turnos',{csv:EXEMPLOS['capacidade-expedicao-turnos']});
 const a=r.planilha[1];
 assert.equal(a[8],72);
 assert.equal(a[9],72);
 assert.equal(a[10],48);
 assert.equal(a[11],166.67);
 assert.equal(a[12],5.33);
});

test('margem por pedido deduz estorno uma única vez e separa custos',()=>{
 const r=executarPlanejamento('margem-pedidos-estornos',{csv:EXEMPLOS['margem-pedidos-estornos']});
 const a=r.planilha[1];
 assert.equal(a[6],160);
 assert.equal(a[9],5);
 assert.equal(a[11],25);
 assert.equal(a[12],13.51);
});

test('rejeita números negativos, decimais absurdos, duplicação e dados identificáveis',()=>{
 for(const slug of TIPOS_PLANEJAMENTO){
  assert.throws(()=>executarPlanejamento(slug,{}),ErroPlanejamento);
  assert.throws(()=>executarPlanejamento(slug,{csv:EXEMPLOS[slug]+'\n'+EXEMPLOS[slug].split('\n')[1]}),/repetido/);
  assert.throws(()=>executarPlanejamento(slug,{csv:EXEMPLOS[slug].replace(';10;',';-1;')}),ErroPlanejamento);
  assert.throws(()=>executarPlanejamento(slug,{csv:EXEMPLOS[slug].replace(/\n[^;\n]+;/,'\ncliente@email.com;')}),ErroPlanejamento);
 }
 assert.throws(()=>executarPlanejamento('outro',{csv:'a\nb'}),ErroPlanejamento);
 assert.throws(()=>executarPlanejamento('risco-ruptura-produtos',{csv:EXEMPLOS['risco-ruptura-produtos'].replace('vendas_dia;','')}),ErroPlanejamento);
});

test('limita tabelas, cabeçalhos repetidos e registros muito grandes',()=>{
 const base=EXEMPLOS['risco-ruptura-produtos'];
 const head=base.split('\n')[0];
 const sample=base.split('\n')[1].split(';');
 const huge=head+'\n'+Array.from({length:501},(_,i)=>[...sample.slice(0,0), 'SKU'+i, ...sample.slice(1)].join(';')).join('\n');
 assert.throws(()=>executarPlanejamento('risco-ruptura-produtos',{csv:huge}),/500/);
 assert.throws(()=>executarPlanejamento('risco-ruptura-produtos',{csv:head+';sku\n'+base.split('\n')[1]+';A'}),/duplicados/);
 assert.throws(()=>executarPlanejamento('risco-ruptura-produtos',{csv:base+' '.repeat(270001)}),ErroPlanejamento);
});

test('regras de segurança da API protegem as cinco análises antes de ler CSV',async()=>{
 const src=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const inicio=src.indexOf('const rotaPlanejamento=p.match(');
 const fim=src.indexOf("if(p==='/api/planos'&&m==='GET')",inicio);
 assert.ok(inicio>0&&fim>inicio);
 const trecho=src.slice(inicio,fim);
 const order=[
  'const u=exigir(req)',
  "u.plano!=='premium'",
  "conferirLimite('planejamento-profissional:'",
  'await corpo(req,300000)',
  'revalidarPremium(req,u.id)',
  'executarPlanejamento('
 ].map(x=>trecho.indexOf(x));
 assert.ok(order.every((n,i)=>n>=0&&(i===0||n>order[i-1])),JSON.stringify(order));
 assert.match(src,/proteger\(req\);/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planejarEstoque,ErroEstoque} from '../servidor/estoque-abc-xyz.mjs';

test('rota Premium exige autenticação, plano, rate limit e validação CSRF global',async()=>{
 const fonte=await readFile(new URL('../servidor/iniciar.mjs',import.meta.url),'utf8');
 const inicio=fonte.indexOf("if(p==='/api/premium/planejamento-estoque'&&m==='POST')");
 const fim=fonte.indexOf("if(p==='/api/premium/auditar-feed'",inicio);
 assert.ok(inicio>=0&&fim>inicio,'rota Premium deve existir');
 const rota=fonte.slice(inicio,fim);
 const autorizacao=rota.indexOf('const u=exigir(req)');
 const plano=rota.indexOf("u.plano!=='premium'");
 const limite=rota.indexOf("conferirLimite('planejamento-estoque:'");
 const corpo=rota.indexOf('await corpo(req,300000)');
 assert.ok(autorizacao>=0&&plano>autorizacao&&limite>plano&&corpo>limite,
  'autenticação, plano e limite devem anteceder leitura de dados comerciais');
 assert.match(rota,/ErroEstoque/);
 assert.match(fonte,/proteger\(req\);/);
});

test('ABC/XYZ não aceita valores não finitos, demanda incompleta ou estoque negativo',()=>{
 const base={sku:'ABC',demandaMensal:[20,10,30],preco:100,custo:30,estoque:10,prazoDias:7};
 for(const mudanca of [{custo:Infinity},{preco:NaN},{estoque:-1},{demandaMensal:[1,2]},{sazonalidade:[1,1]}])
  assert.throws(()=>planejarEstoque({itens:[{...base,...mudanca}]}),ErroEstoque);
});

test('previsão sazonal não altera demanda histórica e investimento é reproduzível',()=>{
 const entrada={horizonteMeses:3,itens:[{sku:'SKU-1',demandaMensal:[10,20,30],preco:80,custo:25,estoque:12,prazoDias:15,sazonalidade:[1,1.5,0.5]}]};
 const antes=JSON.stringify(entrada);
 const a=planejarEstoque(entrada),b=planejarEstoque(entrada);
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(entrada),antes);
 assert.deepEqual(a.itens[0].demandaPrevista,[20,30,10]);
 assert.equal(a.investimentoReposicao,a.itens[0].reposicaoSugerida*25);
});

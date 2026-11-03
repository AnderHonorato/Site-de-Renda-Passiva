import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EXEMPLO_ESTOQUE,lerEntradaEstoque,tabelaCompletaEstoque,exibirPlanejamentoEstoque} from '../scripts/ferramentas/planejamento-estoque-premium.js';
import {planejarEstoque} from '../servidor/estoque-abc-xyz.mjs';
test('lê CSV/TSV com números brasileiros e fatores sazonais',()=>{
 const r=lerEntradaEstoque(EXEMPLO_ESTOQUE,3);
 assert.equal(r.itens.length,3);
 assert.equal(r.itens[0].preco,119.9);
 assert.deepEqual(r.itens[1].sazonalidade,[1,1.2,0.8]);
 assert.deepEqual(r.itens[0].demandaMensal,[80,95,110]);
});
test('integra motor privado ao relatório completo de exportação',()=>{
 const r=planejarEstoque(lerEntradaEstoque(EXEMPLO_ESTOQUE));
 const t=tabelaCompletaEstoque(r),ui=exibirPlanejamentoEstoque(r);
 assert.equal(r.totalSkus,3);
 assert.equal(t.length,4);assert.equal(t[0].length,24);
 assert.equal(t[0].at(-1),'Alertas');
 assert.equal(ui.arquivos.length,2);
 assert.equal(ui.tabela.linhas.length,3);
 assert.ok(ui.texto.includes('CAMISETA-M'));
 assert.ok(t.slice(1).every(l=>l.length===t[0].length));
});
test('permite 12 meses projetados com fatores opcionais',()=>{
 const cab=EXEMPLO_ESTOQUE.split('\n')[0];
 const linha='UNI;'+Array(24).fill('10').join('|')+';10;5;0;7;5;0;0;';
 const dados=lerEntradaEstoque(cab+'\n'+linha,12);
 assert.equal(dados.itens[0].sazonalidade,undefined);
 const r=planejarEstoque(dados);
 assert.equal(r.itens[0].demandaPrevista.length,12);
 assert.equal(tabelaCompletaEstoque(r)[0].length,33);
});
test('rejeita erros de segurança, volume e sazonalidade incompleta',()=>{
 const l=EXEMPLO_ESTOQUE.split('\n');
 for(const entrada of [
  l[0]+'\n'+l[1]+'\n'+l[1],
  l[0]+'\n'+l[1].replace('CAMISETA-M','<script>'),
  l[0]+'\n'+l[1].replace('80|95|110','80|95'),
  l[0]+'\n'+l[1].replace('119,90','NaN'),
  'sku;preco\nA;10'
 ])assert.throws(()=>lerEntradaEstoque(entrada),/SKU|demanda|número|Colunas/);
 assert.throws(()=>lerEntradaEstoque(EXEMPLO_ESTOQUE,2),/sazonalidade/);
 assert.throws(()=>lerEntradaEstoque(EXEMPLO_ESTOQUE,13),/1 a 12/);
 assert.throws(()=>lerEntradaEstoque(l[0]+'\n'+l[1].replace(';10;7;',';999;7;')),/prazo/);
 const muitos=Array.from({length:501},(_,i)=>l[1].replace('CAMISETA-M','SKU'+i));
 assert.throws(()=>lerEntradaEstoque(l[0]+'\n'+muitos.join('\n')),/500/);
});

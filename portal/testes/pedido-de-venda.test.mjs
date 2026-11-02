import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPedido, calcularPedidoNaTela } from '../scripts/ferramentas/pedido-de-venda.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';

const dados={emissor:'Loja Alfa', cliente:'Cliente Beta',numero:'PV-102',data:'2026-11-02',
 itens:'Camiseta; 2; 35,00\nBermuda; 1; 50,00',desconto:'10',frete:'8',
 pagamento:'Pix',entrega:'5 dias úteis',observacao:''};
test('pedido soma subtotal, desconto e frete nos centavos corretos',()=>{
 const r=calcularPedido({itens:[{descricao:'A',quantidade:2,unitarioCentavos:3500},
  {descricao:'B',quantidade:1,unitarioCentavos:5000}],desconto:10,freteCentavos:800});
 assert.equal(r.subtotalCentavos,12000);
 assert.equal(r.descontoCentavos,1200);
 assert.equal(r.totalCentavos,11600);
 const tela=calcularPedidoNaTela(dados);
 assert.match(tela.valor,/116,00/);
 assert.equal(tela.tabela.linhas.length,2);
 assert.equal(tela.arquivos.length,2);
 assert.equal(tela.tabela.semExportação,true);
});
test('pedido aceita desconto total mas nunca produz valor negativo por isso',()=>{
 const r=calcularPedido({itens:[{descricao:'A',quantidade:1,unitarioCentavos:1000}],desconto:100,freteCentavos:0});
 assert.equal(r.totalCentavos,0);
});
test('pedido rejeita datas inexistentes, valores negativos, sintaxe e quantidade acima do limite',()=>{
 const casos=[
  ['data','2026-02-31','data'],
  ['desconto','101','desconto'],
  ['frete','-1','frete'],
  ['itens','Produto; -1; 10','itens'],
  ['itens','Produto; 1; -10','itens'],
  ['itens','Produto; 1','itens'],
  ['numero','PV 001','numero'],
  ['itens',Array(81).fill('Produto; 1; 1').join('\n'),'itens']
 ];
 for(const [campo,valor,esperado] of casos)
  assert.throws(()=>calcularPedidoNaTela({...dados,[campo]:valor}),
   e=>e instanceof ErroDeEntrada&&e.campo===esperado,campo);
});
test('PDF de pedido é realmente exportado no formato esperado',async()=>{
 const tela=calcularPedidoNaTela(dados);
 const {nome,tipo,bytes}=await arquivoBaixado(tela.arquivos[0].gerar);
 assert.equal(nome,'pedido-pv-102-cliente-beta.pdf');
 assert.equal(tipo,'application/pdf');
 assert.match(new TextDecoder('latin1').decode(bytes.slice(0,8)),/%PDF-1/);
});
test('planilha de pedido é exportada como arquivo XLSX',async()=>{
 const tela=calcularPedidoNaTela(dados);
 const {nome,tipo,bytes}=await arquivoBaixado(tela.arquivos[1].gerar);
 assert.equal(nome,'pedido-pv-102-cliente-beta.xlsx');
 assert.match(tipo,/spreadsheetml/);
 assert.equal(bytes[0],80);
 assert.equal(bytes[1],75);
});

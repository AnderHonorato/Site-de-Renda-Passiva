import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from '../recursos/bibliotecas/xlsx-0.20.3.mjs';
import { limparTabela, lerCsv } from '../scripts/cálculos/tabular.js';
import { limparNaTela } from '../scripts/ferramentas/limpar-planilha.js';
import { conferirPacoteXlsx, validarTabelaImportada, tabelaParaTexto, lerDadosTexto, LIMITES_IMPORTACAO } from '../scripts/cálculos/importar-planilha.js';
import { listarAbas, lerAba } from '../scripts/ferramentas/auxiliares/trabalhador-planilha.js';

const opcoes = { conteúdo: 'nome;email;codigo\nAna;a@x.com;007\nBruno;b@x.com;008\nAna Nova; a@x.com ;009', comCabeçalho: 'sim', removerDuplicadas: 'sim', removerVazias: 'sim', aparar: 'sim', espaçosDuplos: 'sim', caixa: 'nenhuma', colunasChave: '[1]', manter: 'primeira' };
function arquivo(abas, comprimido = true) {
  const livro = XLSX.utils.book_new();
  for (const [nome, folha] of abas) XLSX.utils.book_append_sheet(livro, Array.isArray(folha) ? XLSX.utils.aoa_to_sheet(folha) : folha, nome);
  return new Uint8Array(XLSX.write(livro, { type: 'array', bookType: 'xlsx', compression: comprimido }));
}

test('duplicatas por chave preservam todas as colunas, primeira ou última, e a ordem de sobreviventes', () => {
  const primeira = limparNaTela(opcoes).tabelaCompleta;
  assert.deepEqual(primeira.slice(1), [['Ana','a@x.com','007'],['Bruno','b@x.com','008']]);
  assert.deepEqual(limparNaTela({ ...opcoes, manter: 'ultima' }).tabelaCompleta.slice(1), [['Bruno','b@x.com','008'],['Ana Nova','a@x.com','009']]);
});
test('normalização acontece antes de comparar e não altera a tabela original', () => {
  const entrada = [['nome','obs'],[' Ana  MARIA ','antiga'],['ana maria','nova']];
  const copia = structuredClone(entrada);
  const r = limparTabela(entrada, { colunasChave: [0], manter: 'ultima', caixa: 'minúsculas' });
  assert.deepEqual(r.linhas, [['ana maria','nova']]);assert.deepEqual(entrada,copia);
});
test('linha inteira e coluna escolhida usam chaves sem colisão de caracteres de controle', () => {
  const r = limparTabela([['a','b'],['x\u0001y','z'],['x','y\u0001z']]);
  assert.equal(r.linhas.length,2);
  assert.equal(limparNaTela({ ...opcoes, colunasChave: '[0,1,2]' }).tabelaCompleta.length,4);
});
test('chaves vazias ou inválidas são recusadas, nunca fazem todas as linhas virarem uma duplicata', () => {
  for(const valor of ['[]','[3]','[-1]','[1.2]','"1"','{bad']) assert.throws(()=>limparNaTela({...opcoes,colunasChave:valor}),/coluna|comparar/);
  assert.equal(limparNaTela({...opcoes,colunasChave:'[]',removerDuplicadas:'nao'}).tabelaCompleta.length,4);
});
test('sem cabeçalho não acrescenta primeira linha fictícia na exportação', () => {
  assert.deepEqual(limparNaTela({...opcoes,conteúdo:'Ana;007\nBruno;008',comCabeçalho:'nao',colunasChave:'[0]'}).tabelaCompleta,[['Ana','007'],['Bruno','008']]);
});
test('a amostra é limitada mas a exportação continua completa em linhas e colunas', () => {
  const tabela = [Array.from({length:15},(_,i)=>'C'+i), ...Array.from({length:25},(_,i)=>Array.from({length:15},(_,j)=>`${i}:${j}`))];
  const r = limparNaTela({...opcoes,conteúdo:tabelaParaTexto(tabela),colunasChave:'[0]'});
  assert.equal(r.tabela.linhas.length,20);assert.equal(r.tabela.cabeçalho.length,12);
  assert.deepEqual(r.tabelaCompleta,tabela);
});
test('texto de trabalho preserva delimitadores, quebras, aspas e fórmulas como valores', () => {
  const tabela = [['nome','texto'],['Ana; B','linha 1\n"linha 2"'],['=1+1','007']];
  assert.deepEqual(lerCsv(tabelaParaTexto(tabela)),tabela);
  assert.throws(()=>lerDadosTexto('nome;obs\nAna;"aberta'),/aspas abertas/);
});
test('limites de tabela recusam largura, quantidade e célula excessivas', () => {
  assert.throws(()=>validarTabelaImportada([Array(257).fill('x')]),/256 colunas/);
  assert.throws(()=>validarTabelaImportada(Array.from({length:50001},()=>['x'])),/50.000 linhas/);
  assert.throws(()=>validarTabelaImportada(Array.from({length:2001},()=>Array(256).fill('x'))),/500.000 células/);
  assert.throws(()=>validarTabelaImportada([['x'.repeat(32768)]]),/32.767/);
  assert.deepEqual(validarTabelaImportada([['a','b'],['007']]).linhas,[['a','b'],['007','']]);
});
test('XLSX comprimido e sem compressão listam abas e preservam os valores formatados',async()=>{
  const aba=XLSX.utils.aoa_to_sheet([['Codigo','Data','Erro'],[7,46000,'texto']]);
  aba.A2.z='00000';aba.B2.z='dd/mm/yyyy';aba.C2={t:'e',v:7};
  for(const compressao of [true,false]){
    const bytes=arquivo([['Clientes',aba],['Estoque',[['sku'],['007']]]],compressao);
    assert.deepEqual(await listarAbas(bytes),['Clientes','Estoque']);
    assert.deepEqual(lerAba(1).linhas,[['sku'],['007']]);
    const dados=lerAba(0);assert.equal(dados.linhas[1][0],'00007');assert.match(dados.linhas[1][1],/^\d{2}\/\d{2}\/\d{4}$/);assert.equal(dados.linhas[1][2],'#DIV/0!');
  }
});
test('fórmulas usam o resultado salvo, avisam valor ausente e não são executadas',async()=>{
  const aba=XLSX.utils.aoa_to_sheet([['F','Sem cache'],[2,'']]);aba.A2.f='1+1';aba.B2={t:'n',f:'WEBSERVICE("https://example.com/")'};
  await listarAbas(arquivo([['Dados',aba]]));const r=lerAba(0);
  assert.deepEqual(r.linhas[1],['2','']);assert.match(r.avisos.join(' '),/1 fórmula.*sem resultado salvo/);
});
test('aba vazia ou dimensão que extrapola a leitura parcial não é aceita silenciosamente',async()=>{
  const tarde={A40000:{t:'s',v:'a'},A60000:{t:'s',v:'b'},'!ref':'A40000:A60000'};
  await listarAbas(arquivo([['Vazia',[]],['Tarde',tarde]]));
  assert.throws(()=>lerAba(0),/não tem dados/);assert.throws(()=>lerAba(1),/passa dos limites/);assert.throws(()=>lerAba(5),/aba válida/);
});
test('ZIP comum, truncado, com senha, tamanho mentiroso ou expansão excessiva é recusado',async()=>{
  await assert.rejects(conferirPacoteXlsx(new Uint8Array([80,75,3,4])),/XLSX/);
  const original=arquivo([['Dados',[['nome'],['Ana']]]]);
  await assert.rejects(conferirPacoteXlsx(original.subarray(0,original.length-4)),/XLSX/);
  const fim=original.length-22, central=new DataView(original.buffer).getUint32(fim+16,true);
  for(const [offset,valor,curto]of [[8,1,true],[24,LIMITES_IMPORTACAO.descompactado+1,false],[24,0,false]]){
    const b=original.slice(),v=new DataView(b.buffer);if(curto)v.setUint16(central+offset,valor,true);else v.setUint32(central+offset,valor,true);
    await assert.rejects(conferirPacoteXlsx(b),/XLSX|40 MB/);
  }
});

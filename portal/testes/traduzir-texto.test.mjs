import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDIOMAS,validarTraducao,obterDisponibilidade,contarCaracteres,exportarComparacaoCsv,validarArquivoTexto,validarConteudoImportado,exportarComparacaoJson,exportarComparacaoHtml,substituirTermoTraduzido} from '../scripts/ferramentas/traduzir-texto.js';
test('aceita pares de idioma distintos e texto válido',()=>{
 assert.equal(validarTraducao(' Olá ','pt','en'),'Olá');
 assert.equal(Object.keys(IDIOMAS).length,3);
});
test('rejeita vazio, excesso de caracteres, idioma inválido e idioma repetido',()=>{
 for(const args of [[' ','pt','en'],['a'.repeat(10001),'pt','en'],['Olá','xx','en'],['Olá','pt','pt']])
  assert.throws(()=>validarTraducao(...args));
});
test('não finge disponibilidade sem API local completa',()=>{
 assert.equal(obterDisponibilidade(undefined),false);
 assert.equal(obterDisponibilidade({create(){}}),false);
 assert.equal(obterDisponibilidade({create(){},availability(){}}),true);
});

test('contador considera caracteres Unicode completos',()=>{
 assert.equal(contarCaracteres('Olá'),3);
 assert.equal(contarCaracteres('A😀'),2);
 assert.equal(contarCaracteres(''),0);
});

test('exporta comparação CSV com aspas, Unicode e proteção contra fórmulas',()=>{
 const csv=exportarComparacaoCsv('=1+1; "teste"','Olá\nMundo','pt','en');
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/"'=1\+1; ""teste"""/);
 assert.match(csv,/"Olá\nMundo"/);
 assert.throws(()=>exportarComparacaoCsv('','texto','pt','en'));
});

test('importação TXT/Markdown local valida extensão, tamanho e conteúdo',()=>{
 assert.equal(validarArquivoTexto({name:'pedido.TXT',size:500}),true);
 assert.equal(validarArquivoTexto({name:'notas.md',size:0}),true);
 assert.throws(()=>validarArquivoTexto({name:'dados.exe',size:100}),/TXT/);
 assert.throws(()=>validarArquivoTexto({name:'grande.txt',size:40001}),/40 KB/);
 assert.equal(validarConteudoImportado('\uFEFFOlá'), 'Olá');
 assert.throws(()=>validarConteudoImportado('  '),/vazio/);
 assert.throws(()=>validarConteudoImportado('😀'.repeat(10001)),/10.000/);
});
test('limite de tradução respeita caracteres Unicode',()=>{
 assert.equal(validarTraducao('😀'.repeat(10000),'pt','en').length,20000);
 assert.throws(()=>validarTraducao('😀'.repeat(10001),'pt','en'),/10.000/);
});

test('exportação JSON bilíngue mantém Unicode, quebras de linha e campos estruturados',()=>{
 const dados=JSON.parse(exportarComparacaoJson('Olá 😀\\nPedido','Hello 😀\\nOrder','pt','en'));
 assert.deepEqual(dados,{idioma_origem:'pt',idioma_destino:'en',texto_original:'Olá 😀\\nPedido',texto_traduzido:'Hello 😀\\nOrder'});
 assert.throws(()=>exportarComparacaoJson('','Hello','pt','en'),/inválida/);
 assert.throws(()=>exportarComparacaoJson('Olá','Hello','pt','pt'),/inválida/);
});

test('HTML bilíngue imprimível preserva quebras e escapa conteúdo perigoso',()=>{
 const html=exportarComparacaoHtml('<script>alert(1)</script>\\nOlá','Hello & welcome','pt','en');
 assert.match(html,/&lt;script&gt;alert\\(1\\)&lt;\\/script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/Hello &amp; welcome/);
 assert.match(html,/white-space:pre-wrap/);
 assert.match(html,/Ander Flow/);
 assert.throws(()=>exportarComparacaoHtml('Olá','Hello','pt','pt'),/inválida/);
});

test('revisão terminológica substitui todas as ocorrências literais sem regex',()=>{
 assert.deepEqual(substituirTermoTraduzido('SKU A+B; SKU A+B','A+B','X'),{texto:'SKU X; SKU X',ocorrencias:2});
 assert.deepEqual(substituirTermoTraduzido('Pedido confirmado','inexistente','novo'),{texto:'Pedido confirmado',ocorrencias:0});
 assert.deepEqual(substituirTermoTraduzido('Preço R$ 10','R$','BRL'),{texto:'Preço BRL 10',ocorrencias:1});
 assert.throws(()=>substituirTermoTraduzido('abc','','x'),/termo/);
 assert.throws(()=>substituirTermoTraduzido('a'.repeat(20000),'a','bb'),/20.000/);
});

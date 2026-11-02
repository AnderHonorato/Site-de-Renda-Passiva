import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarUrlCampanha,criarCampanhaUtm,analisarCampanhaUtm,calcularUtmNaTela,normalizarParametro} from '../scripts/ferramentas/utm.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
const base={modo:'criar',url:'https://loja.exemplo/produto?ref=1#detalhes',origem:'Instagram',midia:'Social',campanha:'Black Friday',termo:'',conteudo:''};
test('link UTM preserva consulta e fragmento e codifica campos',()=>{
 const r=criarCampanhaUtm(base),url=new URL(r.url);
 assert.equal(url.searchParams.get('ref'),'1');
 assert.equal(url.hash,'#detalhes');
 assert.deepEqual(['instagram','social','black_friday'],
  ['utm_source','utm_medium','utm_campaign'].map(k=>url.searchParams.get(k)));
});
test('UTM repetida é substituída sem perder parâmetros externos',()=>{
 const r=criarCampanhaUtm({...base,url:'https://loja.exemplo/?utm_source=antigo&utm_source=outro&ref=2'});
 const url=new URL(r.url);
 assert.deepEqual(url.searchParams.getAll('utm_source'),['instagram']);
 assert.equal(url.searchParams.get('ref'),'2');
 assert.ok(r.anteriores.includes('utm_source'));
});
test('auditor identifica ausência, duplicatas e utm desconhecida',()=>{
 const r=analisarCampanhaUtm('https://loja.exemplo/?utm_source=a&utm_source=b&utm_extra=x');
 assert.deepEqual(r.ausentes,['utm_medium','utm_campaign']);
 assert.deepEqual(r.repetidos,['utm_source']);
 assert.deepEqual(r.desconhecidos,['utm_extra']);
});
test('rejeita protocolos inseguros, credenciais embutidas e URL relativa',()=>{
 for(const u of ['javascript:alert(1)','file:///tmp/a','https://user:pass@loja.exemplo','/produto','nota um link']){
  assert.throws(()=>validarUrlCampanha(u),e=>e instanceof ErroDeEntrada&&e.campo==='url',u);
 }
});
test('campos obrigatórios e tamanhos são validados',()=>{
 for(const [campo,valor] of [['origem',''],['midia',''],['campanha',''],['campanha','X'.repeat(121)]])
  assert.throws(()=>criarCampanhaUtm({...base,[campo]:valor}),e=>e instanceof ErroDeEntrada&&e.campo===campo);
});
test('montador produz tabela e link acessível para copiar',()=>{
 const r=calcularUtmNaTela(base);
 assert.equal(r.tabela.linhas.length,5);
 assert.match(r.texto,/utm_campaign=black_friday/);
 assert.equal(normalizarParametro('Black Friday'),'black_friday');
 const a=calcularUtmNaTela({modo:'analisar',url:'https://loja.exemplo/?utm_source=abc'});
 assert.equal(a.valor,'Revisão necessária');
});

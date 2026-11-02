import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarFollowUp,calcularFollowUpNaTela} from '../scripts/ferramentas/follow-up.js';
import {ErroDeEntrada} from '../scripts/núcleo/montador.js';
const dados={cliente:'Maria',assunto:'o orçamento do site',objetivo:'retomada',tom:'cordial',dataContato:'',detalhe:''};
test('follow-up cordial gera texto para copiar sem afirmar que foi enviado',()=>{
 const r=calcularFollowUpNaTela(dados);
 assert.match(r.texto,/Olá, Maria!/);
 assert.match(r.texto,/orçamento do site/);
 assert.match(r.observações[0],/não envia/);
 assert.equal(r.valor,'Mensagem pronta para copiar');
});
test('follow-up cobre cinco objetivos e três tons de modo distinto',()=>{
 for(const objetivo of ['proposta','retomada','agendamento','posvenda','pendencia']){
  const a=criarFollowUp({...dados,objetivo,tom:'formal'});
  const b=criarFollowUp({...dados,objetivo,tom:'objetivo'});
  assert.match(a,/Prezado\(a\)/);
  assert.match(b,/Aguardo seu retorno/);
  assert.notEqual(a,b);
 }
});
test('follow-up não aceita objetivo ou tom arbitrário e limita dados longos',()=>{
 for(const [campo,valor] of [['objetivo','fake'],['tom','foo'],['cliente','x'.repeat(81)]])
  assert.throws(()=>calcularFollowUpNaTela({...dados,[campo]:valor}),
   e=>e instanceof ErroDeEntrada&&e.campo===campo);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { especificacoes, especificacaoPorSlug, planoPermiteProfissional } from '../dados/profissionais.js';
import { executarProfissional } from '../servidor/profissionais/executar.mjs';

test('100 ferramentas avançam IDs, mantêm planos e não expõem algoritmos no registro', () => {
  assert.equal(especificacoes.length,100);
  assert.deepEqual(especificacoes.map(s=>s.id),Array.from({length:100},(_,i)=>`F${252+i}`));
  assert.equal(new Set(especificacoes.map(s=>s.slug)).size,100);
  assert.equal(especificacaoPorSlug.constructor,undefined);
  assert.ok(especificacoes.every(s=>['plus','premium'].includes(s.plano)));
  assert.equal(planoPermiteProfissional('plus','premium'),false);
  assert.equal(planoPermiteProfissional('premium','plus'),true);
  assert.equal(planoPermiteProfissional('gratuito','plus'),false);
});
test('worker executa algoritmo privado e respeita concorrência por usuário e global', async () => {
  const s = especificacoes.find(s=>s.id==='F277'), d = {csv:s.exemplo};
  const respostas = await Promise.allSettled([
    executarProfissional(s.slug,d,{usuario:'a'}),
    executarProfissional(s.slug,d,{usuario:'a'}),
    executarProfissional(s.slug,d,{usuario:'b'}),
    executarProfissional(s.slug,d,{usuario:'c'}),
  ]);
  assert.equal(respostas[0].status,'fulfilled');
  assert.equal(respostas[0].value.titulo,s.nome);
  assert.equal(respostas[1].reason.status,429);
  assert.equal(respostas[2].status,'fulfilled');
  assert.equal(respostas[3].reason.status,429);
  assert.equal((await executarProfissional(s.slug,d,{usuario:'a'})).titulo,s.nome,'vagas são liberadas após terminar');
});
test('cancelamento real encerra o worker e libera a vaga', async () => {
  const s=especificacoes.find(s=>s.id==='F282'),d={csv:s.exemplo,opcoes:{replicas:3000}};
  const controller=new AbortController();
  const p=executarProfissional(s.slug,d,{usuario:'cancelamento',signal:controller.signal});
  controller.abort();
  await assert.rejects(p,e=>e.status===499);
  assert.equal((await executarProfissional(s.slug,d,{usuario:'cancelamento'})).titulo,s.nome);
});
test('prazo encerra worker e não deixa execução pendurada', async () => {
  const s=especificacoes.find(s=>s.id==='F282');
  await assert.rejects(executarProfissional(s.slug,{csv:s.exemplo},{usuario:'prazo',prazoMs:1}),e=>e.status===503);
  const seguinte=await executarProfissional(s.slug,{csv:s.exemplo},{usuario:'prazo'});
  assert.equal(seguinte.titulo,s.nome);
});

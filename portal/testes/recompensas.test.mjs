import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS, rankDoNivel, progressoDeRank } from '../dados/recompensas.js';

test('ranks seguem os níveis existentes e passam de V para I sem alterar saldos',()=>{
  assert.equal(new Set(RANKS.map(r=>r.simbolo)).size,9);
  assert.equal(rankDoNivel(5).rotulo,'Iniciante V');
  assert.equal(rankDoNivel(6).rotulo,'Explorador I');
  assert.equal(rankDoNivel(40).rotulo,'Lenda V');
  assert.equal(rankDoNivel(41).rotulo,'Mítico');
  assert.equal(progressoDeRank(249).faltam,1);
  assert.equal(progressoDeRank(250).id,'explorador');
  assert.equal(progressoDeRank(250).pontos,250);
  assert.equal(progressoDeRank(16000).meta,null);
  assert.equal(progressoDeRank(-3).nivel,1);
});

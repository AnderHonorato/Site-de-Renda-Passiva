import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from '../servidor/banco.mjs';
import { periodoAtual,registrarAtividadeRecompensa,painelRecompensas,resgatarRecompensa,rankingRecompensas,validarEvento } from '../servidor/recompensas.mjs';
import { RANKS,rankDoNivel,progressoDeRank } from '../dados/recompensas.js';
test('ranks seguem os níveis existentes e passam de V para I sem alterar saldos',()=>{
  assert.equal(new Set(RANKS.map(r=>r.simbolo)).size,9);assert.equal(rankDoNivel(5).rotulo,'Iniciante V');assert.equal(rankDoNivel(6).rotulo,'Explorador I');assert.equal(rankDoNivel(40).rotulo,'Lenda V');assert.equal(rankDoNivel(41).rotulo,'Mítico');assert.equal(progressoDeRank(249).faltam,1);assert.equal(progressoDeRank(250).id,'explorador');assert.equal(progressoDeRank(250).pontos,250);assert.equal(progressoDeRank(16000).meta,null);assert.equal(progressoDeRank(-3).nivel,1);
});
const agora=new Date('2026-10-09T20:00:00Z');
function banco(){const db=abrirBanco(':memory:');for(let id=1;id<=6;id++)db.prepare('INSERT INTO usuarios(id,email,usuario,nome,senha_hash,idade,pontos) VALUES(?,?,?,?,?,18,?)').run(id,`${id}@example.test`,`pessoa${id}`,`Pessoa ${id}`,'teste',id*10);return db;}
const evento={titulo_pt:'Semana das ferramentas',titulo_en:'Tool week',texto_pt:'Explore o portal.',texto_en:'Explore the portal.',inicio:'2026-10-09',fim:'2026-10-15',meta:2,xp:10,ativo:true};
function publicar(db,v=evento){const e=validarEvento(v);return Number(db.prepare('INSERT INTO recompensas_eventos(titulo_pt,titulo_en,texto_pt,texto_en,inicio,fim,meta,xp,ativo) VALUES(?,?,?,?,?,?,?,?,?)').run(...Object.values(e)).lastInsertRowid);}
test('períodos UTC atravessam domingo, segunda, mês e ano sem usar o fuso do aparelho',()=>{
  assert.deepEqual(periodoAtual(agora),{hoje:'2026-10-09',inicioSemana:'2026-10-05',fimSemana:'2026-10-11'});
  assert.equal(periodoAtual(new Date('2026-10-12T00:00Z')).inicioSemana,'2026-10-12');assert.equal(periodoAtual(new Date('2026-01-01T00:00Z')).inicioSemana,'2025-12-29');
});
test('repetir uma ferramenta não avança missão e o resgate é único e atômico',()=>{
  const db=banco();try{registrarAtividadeRecompensa(db,1,'a',agora);registrarAtividadeRecompensa(db,1,'a',agora);assert.equal(painelRecompensas(db,1,agora).missoes[0].valor,1);
    assert.throws(()=>resgatarRecompensa(db,1,{tipo:'diaria'},agora),e=>e.codigo==='missao_incompleta');assert.equal(db.prepare('SELECT pontos FROM usuarios WHERE id=1').get().pontos,10);
    registrarAtividadeRecompensa(db,1,'b',agora);assert.equal(resgatarRecompensa(db,1,{tipo:'diaria',xp:9999,usuario_id:2},agora).resgatada,true);
    assert.equal(resgatarRecompensa(db,1,{tipo:'diaria'},agora).resgatada,false);assert.equal(db.prepare('SELECT pontos FROM usuarios WHERE id=1').get().pontos,15);assert.equal(db.prepare('SELECT pontos FROM usuarios WHERE id=2').get().pontos,20);
  }finally{db.close();}
});
test('dia seguinte renova a diária; semanal exige cinco diferentes e não renova a cada dia',()=>{
  const db=banco();try{for(const slug of ['a','b','c','d','e'])registrarAtividadeRecompensa(db,1,slug,agora);resgatarRecompensa(db,1,{tipo:'diaria'},agora);resgatarRecompensa(db,1,{tipo:'semanal'},agora);
    const amanha=new Date('2026-10-10T01:00Z'),p=painelRecompensas(db,1,amanha);assert.equal(p.missoes[0].valor,0);assert.equal(p.missoes[0].resgatada,false);assert.equal(p.missoes[1].resgatada,true);
    const proxima=painelRecompensas(db,1,new Date('2026-10-12T00:00Z'));assert.equal(proxima.missoes[1].valor,0);assert.equal(proxima.missoes[1].resgatada,false);
  }finally{db.close();}
});
test('eventos contam só datas elegíveis e evento agendado, pausado ou encerrado não pode ser recebido',()=>{
  const db=banco();try{const id=publicar(db);registrarAtividadeRecompensa(db,1,'antiga',new Date('2026-10-08T23:59Z'));registrarAtividadeRecompensa(db,1,'a',agora);assert.equal(painelRecompensas(db,1,agora).missoes.at(-1).valor,1);
    registrarAtividadeRecompensa(db,1,'b',agora);assert.equal(resgatarRecompensa(db,1,{tipo:'evento',evento_id:id},agora).resgatada,true);db.prepare('UPDATE recompensas_eventos SET xp=50 WHERE id=?').run(id);assert.equal(resgatarRecompensa(db,1,{tipo:'evento',evento_id:id},agora).resgatada,false);
    const futuro=publicar(db,{...evento,inicio:'2026-10-10'});assert.throws(()=>resgatarRecompensa(db,1,{tipo:'evento',evento_id:futuro},agora),e=>e.codigo==='missao_indisponivel');
    db.prepare('UPDATE recompensas_eventos SET ativo=0 WHERE id=?').run(id);assert.throws(()=>resgatarRecompensa(db,1,{tipo:'evento',evento_id:id},agora));assert.equal(painelRecompensas(db,1,new Date('2026-10-16T00:00Z')).missoes.length,2);
  }finally{db.close();}
});
test('ranking é opt-in, oculta suspensos/banidos e bloqueios em ambas direções e nunca expõe dados de cadastro',()=>{
  const db=banco();try{assert.deepEqual(rankingRecompensas(db,1),[]);assert.equal(painelRecompensas(db,1,agora).ranking,false);
    for(let id=1;id<=6;id++)db.prepare('INSERT INTO recompensas_preferencias(usuario_id,ranking) VALUES(?,1)').run(id);
    db.prepare("UPDATE usuarios SET situacao='suspenso' WHERE id=6").run();db.prepare("UPDATE usuarios SET banido_em=CURRENT_TIMESTAMP WHERE id=5").run();db.prepare('INSERT INTO bloqueios(origem,destino) VALUES(1,4),(3,1)').run();
    const lista=rankingRecompensas(db,1);assert.deepEqual(lista.map(p=>p.usuario),['pessoa2','pessoa1']);assert.deepEqual(Object.keys(lista[0]),['usuario','avatar','xp','posicao','proprio']);assert.equal(lista[1].proprio,true);
    db.prepare('UPDATE recompensas_preferencias SET ranking=0 WHERE usuario_id=2').run();assert.equal(rankingRecompensas(db,1).length,1);
  }finally{db.close();}
});
test('empates de XP têm a mesma posição e plano não altera os pontos',()=>{
  const db=banco();try{db.exec("UPDATE usuarios SET pontos=100,plano=CASE WHEN id=1 THEN 'premium' ELSE 'gratuito' END; INSERT INTO recompensas_preferencias(usuario_id,ranking) VALUES(1,1),(2,1)");assert.deepEqual(rankingRecompensas(db,1).map(p=>p.posicao),[1,1]);}finally{db.close();}
});
test('validação recusa datas impossíveis, metas inventadas, XP arbitrário e períodos excessivos',()=>{
  assert.equal(validarEvento(evento).ativo,1);
  for(const v of [{inicio:'2026-02-30'},{fim:'2026-10-08'},{fim:'2027-10-10'},{meta:31},{meta:0},{xp:51},{xp:1.5},{ativo:'true'},{titulo_en:''},{texto_pt:'a\u0000b'}])assert.throws(()=>validarEvento({...evento,...v}));
});

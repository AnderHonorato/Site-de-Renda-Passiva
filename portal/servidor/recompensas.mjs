import { erro } from './seguranca.mjs';

export function iniciarRecompensas(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS recompensas_usos (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    dia TEXT NOT NULL, slug TEXT NOT NULL, PRIMARY KEY(usuario_id,dia,slug)
  );
  CREATE TABLE IF NOT EXISTS recompensas_preferencias (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    ranking INTEGER NOT NULL DEFAULT 0 CHECK(ranking IN (0,1))
  );
  CREATE TABLE IF NOT EXISTS recompensas_eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, titulo_pt TEXT NOT NULL, titulo_en TEXT NOT NULL,
    texto_pt TEXT NOT NULL, texto_en TEXT NOT NULL, inicio TEXT NOT NULL, fim TEXT NOT NULL,
    meta INTEGER NOT NULL, xp INTEGER NOT NULL, ativo INTEGER NOT NULL DEFAULT 0,
    versao INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS recompensas_resgates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    chave TEXT NOT NULL, titulo_pt TEXT NOT NULL, titulo_en TEXT NOT NULL, xp INTEGER NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(usuario_id,chave)
  );`);
}

export function periodoAtual(agora = new Date()) {
  const hoje = agora.toISOString().slice(0,10), segunda = new Date(hoje+'T00:00:00Z');
  segunda.setUTCDate(segunda.getUTCDate()-((segunda.getUTCDay()+6)%7));
  const inicioSemana=segunda.toISOString().slice(0,10);segunda.setUTCDate(segunda.getUTCDate()+6);
  return { hoje,inicioSemana,fimSemana:segunda.toISOString().slice(0,10) };
}

function distintas(db,id,inicio,fim) { return Number(db.prepare('SELECT count(DISTINCT slug) total FROM recompensas_usos WHERE usuario_id=? AND dia>=? AND dia<=?').get(id,inicio,fim).total); }
export function registrarAtividadeRecompensa(db,id,slug,agora = new Date()) { db.prepare('INSERT OR IGNORE INTO recompensas_usos(usuario_id,dia,slug) VALUES(?,?,?)').run(id,periodoAtual(agora).hoje,slug); }

export function painelRecompensas(db,id,agora = new Date()) {
  const p=periodoAtual(agora),resgates=db.prepare('SELECT * FROM recompensas_resgates WHERE usuario_id=? ORDER BY id DESC LIMIT 30').all(id);
  const propostas=[
    {tipo:'diaria',chave:`diaria:${p.hoje}`,titulo_pt:'Dois desafios resolvidos',titulo_en:'Two challenges solved',texto_pt:'Conclua resultados em duas ferramentas diferentes hoje.',texto_en:'Complete results in two different tools today.',inicio:p.hoje,fim:p.hoje,meta:2,xp:5},
    {tipo:'semanal',chave:`semanal:${p.inicioSemana}`,titulo_pt:'Explore cinco ferramentas',titulo_en:'Explore five tools',texto_pt:'Conclua resultados em cinco ferramentas diferentes nesta semana.',texto_en:'Complete results in five different tools this week.',inicio:p.inicioSemana,fim:p.fimSemana,meta:5,xp:15},
    ...db.prepare('SELECT * FROM recompensas_eventos WHERE ativo=1 AND fim>=? ORDER BY inicio,id LIMIT 20').all(p.hoje).map(e=>({...e,tipo:'evento',evento_id:e.id,chave:`evento:${e.id}`}))
  ];
  const missoes=propostas.map(m=>{
    const valor=distintas(db,id,m.inicio,m.fim),resgate=db.prepare('SELECT id FROM recompensas_resgates WHERE usuario_id=? AND chave=?').get(id,m.chave);
    return {...m,valor:Math.min(valor,m.meta),resgatada:!!resgate,disponivel:m.inicio<=p.hoje&&m.fim>=p.hoje&&valor>=m.meta&&!resgate,agendada:m.inicio>p.hoje};
  });
  return {missoes,resgates,ranking:!!db.prepare('SELECT ranking FROM recompensas_preferencias WHERE usuario_id=?').get(id)?.ranking,hoje:p.hoje};
}

export function resgatarRecompensa(db,id,b,agora = new Date()) {
  if(!b||!['diaria','semanal','evento'].includes(b.tipo)||(b.tipo==='evento'&&(!Number.isSafeInteger(b.evento_id)||b.evento_id<1)))throw erro(400,'dados_invalidos');
  db.exec('BEGIN IMMEDIATE');
  try {
    const m=painelRecompensas(db,id,agora).missoes.find(m=>m.tipo===b.tipo&&(m.tipo!=='evento'||m.evento_id===b.evento_id));
    if(!m||m.agendada)throw erro(409,'missao_indisponivel');
    if(m.resgatada){db.exec('COMMIT');return {resgatada:false,missao:m};}
    if(!m.disponivel)throw erro(409,'missao_incompleta');
    const r=db.prepare('INSERT INTO recompensas_resgates(usuario_id,chave,titulo_pt,titulo_en,xp) VALUES(?,?,?,?,?)').run(id,m.chave,m.titulo_pt,m.titulo_en,m.xp);
    db.prepare('UPDATE usuarios SET pontos=pontos+? WHERE id=?').run(m.xp,id);
    db.exec('COMMIT');return {resgatada:true,missao:{...m,resgatada:true,disponivel:false},resgate_id:Number(r.lastInsertRowid)};
  } catch(e){db.exec('ROLLBACK');throw e;}
}

export function rankingRecompensas(db,id) {
  const participantes=db.prepare(`SELECT u.id,u.usuario,u.avatar,u.pontos FROM usuarios u
    JOIN recompensas_preferencias p ON p.usuario_id=u.id AND p.ranking=1
    WHERE u.situacao='ativo' AND u.banido_em IS NULL
    AND NOT EXISTS(SELECT 1 FROM bloqueios b WHERE (b.origem=? AND b.destino=u.id) OR (b.destino=? AND b.origem=u.id))
    ORDER BY u.pontos DESC,u.id LIMIT 50`).all(id,id);
  let anterior,posto=0;
  return participantes.map((u,i)=>{if(u.pontos!==anterior)posto=i+1;anterior=u.pontos;return {usuario:u.usuario,avatar:u.avatar,xp:u.pontos,posicao:posto,proprio:u.id===id};});
}

const dataValida=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function validarEvento(b) {
  if(!b||typeof b!=='object'||Array.isArray(b))throw erro(400,'dados_invalidos');
  const v={};for(const [k,max,min]of [['titulo_pt',100,2],['titulo_en',100,2],['texto_pt',500,0],['texto_en',500,0]]) {
    if(typeof b[k]!=='string'||b[k].trim().length<min||b[k].trim().length>max||/[\u0000-\u001f]/u.test(b[k]))throw erro(400,'dados_invalidos');v[k]=b[k].trim();
  }
  if(!dataValida(b.inicio)||!dataValida(b.fim)||b.fim<b.inicio||(Date.parse(b.fim)-Date.parse(b.inicio))/86400000>89||!Number.isInteger(b.meta)||b.meta<1||b.meta>30||!Number.isInteger(b.xp)||b.xp<1||b.xp>50||typeof b.ativo!=='boolean')throw erro(400,'dados_invalidos');
  return {...v,inicio:b.inicio,fim:b.fim,meta:b.meta,xp:b.xp,ativo:b.ativo?1:0};
}

export async function tratarRecompensas(req,res,{db,json,exigir,admin,corpo,registrarAdmin,nivelDoUsuario}) {
  const p=new URL(req.url,'http://localhost').pathname,m=req.method;
  if(p==='/api/recompensas'&&m==='GET'){const u=exigir(req);json(res,200,painelRecompensas(db,u.id));return true;}
  if(p==='/api/recompensas/ranking'&&m==='GET'){const u=exigir(req);json(res,200,{participantes:rankingRecompensas(db,u.id)});return true;}
  if(p==='/api/recompensas/preferencias'&&m==='PATCH'){
    exigir(req);const b=await corpo(req),u=exigir(req);if(typeof b.ranking!=='boolean')throw erro(400,'dados_invalidos');
    db.prepare('INSERT INTO recompensas_preferencias(usuario_id,ranking) VALUES(?,?) ON CONFLICT(usuario_id) DO UPDATE SET ranking=excluded.ranking').run(u.id,b.ranking?1:0);json(res,200,{ranking:b.ranking});return true;
  }
  if(p==='/api/recompensas/resgatar'&&m==='POST'){
    exigir(req);const b=await corpo(req),u=exigir(req),r=resgatarRecompensa(db,u.id,b);const atual=db.prepare('SELECT * FROM usuarios WHERE id=?').get(u.id);
    json(res,200,{...r,nivel:nivelDoUsuario(atual)});return true;
  }
  if(p==='/api/admin/recompensas/eventos'&&m==='GET'){admin(req);json(res,200,{eventos:db.prepare('SELECT * FROM recompensas_eventos ORDER BY id DESC LIMIT 100').all()});return true;}
  const rota=p.match(/^\/api\/admin\/recompensas\/eventos(?:\/(\d+))?$/);
  if(rota&&['POST','PUT'].includes(m)){
    admin(req);const b=await corpo(req),u=admin(req),v=validarEvento(b),id=rota[1]?Number(rota[1]):null;
    if((m==='PUT')!==!!id)throw erro(400,'dados_invalidos');
    db.exec('BEGIN IMMEDIATE');let evento;
    try {
      const velho=id?db.prepare('SELECT * FROM recompensas_eventos WHERE id=?').get(id):null;
      if(id&&!velho)throw erro(404,'evento_inexistente');
      if(velho&&b.versao!==velho.versao)throw erro(409,'evento_alterado');
      if(v.ativo&&db.prepare('SELECT count(*) total FROM recompensas_eventos WHERE ativo=1 AND id<>? AND fim>=?').get(id||0,periodoAtual().hoje).total>=20)throw erro(409,'limite_eventos');
      if(id){db.prepare('UPDATE recompensas_eventos SET titulo_pt=?,titulo_en=?,texto_pt=?,texto_en=?,inicio=?,fim=?,meta=?,xp=?,ativo=?,versao=versao+1 WHERE id=?').run(...Object.values(v),id);evento=db.prepare('SELECT * FROM recompensas_eventos WHERE id=?').get(id);}
      else{const r=db.prepare('INSERT INTO recompensas_eventos(titulo_pt,titulo_en,texto_pt,texto_en,inicio,fim,meta,xp,ativo) VALUES(?,?,?,?,?,?,?,?,?)').run(...Object.values(v));evento=db.prepare('SELECT * FROM recompensas_eventos WHERE id=?').get(Number(r.lastInsertRowid));}
      registrarAdmin(u,id?'editar_evento':'criar_evento',evento.id,{ativo:!!evento.ativo,meta:evento.meta,xp:evento.xp});db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    json(res,id?200:201,{evento});return true;
  }
  return false;
}

import { createHmac,randomBytes } from 'node:crypto';
import { erro } from './seguranca.mjs';

export function criarProtecao(db,{agora=Date.now}={}) {
  db.exec(`CREATE TABLE IF NOT EXISTS trafego_segredo(id INTEGER PRIMARY KEY CHECK(id=1),valor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS trafego_bloqueios(id TEXT PRIMARY KEY,grupo TEXT NOT NULL,reincidencias INTEGER NOT NULL,ultima INTEGER NOT NULL,bloqueado_ate INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS operacao_erros(id INTEGER PRIMARY KEY,metodo TEXT NOT NULL,codigo TEXT NOT NULL,criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  db.prepare('INSERT OR IGNORE INTO trafego_segredo VALUES(1,?)').run(randomBytes(32).toString('hex'));
  const segredo=db.prepare('SELECT valor FROM trafego_segredo WHERE id=1').get().valor,cache=new Map();
  function conferir(chave,max,janela){
    const id=createHmac('sha256',segredo).update(chave).digest('hex'),tempo=agora();
    let l=cache.get(id);if(!l){l={tempos:[],...(db.prepare('SELECT * FROM trafego_bloqueios WHERE id=?').get(id)||{})};cache.set(id,l);}
    const negar=ate=>{const e=erro(429,'muitas_tentativas');e.retryAfter=Math.max(1,Math.ceil((ate-tempo)/1000));throw e;};
    if(l.bloqueado_ate>tempo)negar(l.bloqueado_ate);
    l.tempos=l.tempos.filter(t=>t>tempo-janela);
    if(l.tempos.length>=max){
      // A espera de dois segundos do chat é controle de ritmo, não reincidência de abuso.
      if(chave.startsWith('chat2:'))negar(l.tempos[0]+janela);
      const reincidencias=l.ultima&&tempo-l.ultima<86400000?(l.reincidencias||0)+1:1;
      const bloqueado_ate=Math.max(l.tempos[0]+janela,tempo+[60000,1800000,7200000][Math.min(2,reincidencias-1)]);
      Object.assign(l,{id,grupo:chave.split(':')[0],reincidencias,ultima:tempo,bloqueado_ate});
      db.prepare('INSERT INTO trafego_bloqueios VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET reincidencias=excluded.reincidencias,ultima=excluded.ultima,bloqueado_ate=excluded.bloqueado_ate').run(id,l.grupo,reincidencias,tempo,bloqueado_ate);
      negar(bloqueado_ate);
    }
    l.tempos.push(tempo);
    if(cache.size>10000)for(const [k,v]of cache)if((v.tempos.at(-1)||0)<tempo-86400000&&!(v.bloqueado_ate>tempo))cache.delete(k);
    while(cache.size>10000)cache.delete(cache.keys().next().value);
  }
  function listar(){return db.prepare('SELECT * FROM trafego_bloqueios ORDER BY bloqueado_ate DESC LIMIT 100').all().map(b=>({...b,ativo:b.bloqueado_ate>agora()}));}
  function desbloquear(id,versao){
    if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||!Number.isSafeInteger(versao))throw erro(400,'dados_invalidos');
    const b=db.prepare('SELECT * FROM trafego_bloqueios WHERE id=?').get(id);if(!b)throw erro(404,'bloqueio_inexistente');if(b.bloqueado_ate!==versao)throw erro(409,'bloqueio_alterado');
    db.prepare('UPDATE trafego_bloqueios SET bloqueado_ate=0 WHERE id=?').run(id);cache.delete(id);return b;
  }
  function registrarErro(metodo){db.prepare('INSERT INTO operacao_erros(metodo,codigo) VALUES(?,?)').run(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(metodo)?metodo:'OUTRO','erro_interno');}
  return {conferir,listar,desbloquear,registrarErro};
}

import { erro } from './seguranca.mjs';

export function configuracaoPublicidade(db, env = process.env) {
  const salvo = db.prepare('SELECT dados FROM publicidade_config WHERE id=1').get();
  if (salvo) return JSON.parse(salvo.dados);
  return { ativo:env.PORTAL_ADS_ATIVO==='1',demonstracao:false,teste:env.PORTAL_ADS_TESTE==='1',editor:env.PORTAL_ADS_EDITOR||'',
    blocos:Object.fromEntries(['resultado','lista','rodape'].map(p=>[p,env[`PORTAL_ADS_${p.toUpperCase()}`]||''])) };
}

export function validarPublicidade(b, env = process.env) {
  if (!b || typeof b.ativo !== 'boolean' || typeof b.demonstracao !== 'boolean' || typeof b.teste !== 'boolean' || typeof b.editor !== 'string') throw erro(400,'dados_invalidos');
  if (b.demonstracao && env.NODE_ENV === 'production') throw erro(400,'demonstracao_local');
  const editor=b.editor.trim();
  if (editor && !/^ca-pub-\d{16}$/u.test(editor)) throw erro(400,'editor_invalido');
  const blocos={};
  for (const p of ['resultado','lista','rodape']) {
    const v=b.blocos?.[p] || '';
    if (typeof v !== 'string' || v && !/^\d{6,20}$/u.test(v)) throw erro(400,'bloco_invalido');
    blocos[p]=v;
  }
  if (b.ativo && !b.demonstracao && (!editor || !Object.values(blocos).some(Boolean))) throw erro(400,'configuracao_incompleta');
  return {ativo:b.ativo,demonstracao:b.demonstracao,teste:b.teste,editor,blocos};
}

export function salvarPublicidade(db,b,env = process.env) {
  const v=validarPublicidade(b,env);
  db.prepare('INSERT INTO publicidade_config(id,dados) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET dados=excluded.dados').run(JSON.stringify(v));
  return v;
}

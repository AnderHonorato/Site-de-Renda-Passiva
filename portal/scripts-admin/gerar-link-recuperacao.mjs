import { randomBytes, createHash } from 'node:crypto';
import { abrirBanco } from '../servidor/banco.mjs';

const email=process.argv[2]?.trim().toLowerCase();
const origem=process.env.URL_PUBLICA;
if(!email||!origem||!origem.startsWith('https://')){
  process.stderr.write('Uso: URL_PUBLICA=https://seu-dominio node portal/scripts-admin/gerar-link-recuperacao.mjs email@exemplo.com\n');
  process.exitCode=2;
}else{
  const db=abrirBanco();
  const u=db.prepare('SELECT id FROM usuarios WHERE email=?').get(email);
  if(!u){process.stderr.write('Conta não encontrada.\n');process.exitCode=1;}
  else{
    const t=randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO redefinicoes(usuario_id,token_hash,expira_em) VALUES(?,?,?)').run(u.id,createHash('sha256').update(t).digest('hex'),Date.now()+3600000);
    process.stdout.write(`${origem.replace(/\/$/,'')}/redefinir-senha.html#token=${t}\n`);
  }
  db.close();
}

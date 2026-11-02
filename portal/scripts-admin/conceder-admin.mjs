import { abrirBanco } from '../servidor/banco.mjs';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  process.stderr.write('Uso: node portal/scripts-admin/conceder-admin.mjs email@exemplo.com\n');
  process.exitCode = 2;
} else {
  const db = abrirBanco();
  const resultado = db.prepare("UPDATE usuarios SET papel='admin' WHERE email=? AND situacao='ativo'").run(email);
  if (!resultado.changes) {
    process.stderr.write('Conta ativa não encontrada. Crie a conta antes de conceder a função.\n');
    process.exitCode = 1;
  } else {
    const u = db.prepare('SELECT id FROM usuarios WHERE email=?').get(email);
    db.prepare('DELETE FROM sessoes WHERE usuario_id=?').run(u.id);
    db.prepare('INSERT INTO auditoria_admin(admin_id,acao,alvo_id) VALUES(?,?,?)').run(u.id,'concessao_admin_local',u.id);
    process.stdout.write(`Função admin concedida à conta ${email}. Entre novamente para aplicar.\n`);
  }
  db.close();
}

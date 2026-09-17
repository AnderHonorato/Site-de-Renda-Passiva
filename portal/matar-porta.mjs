import { execFileSync } from 'node:child_process';

const porta = Number(process.argv[2] || 4480);
if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
  console.error('Porta inválida.');
  process.exit(1);
}

try {
  if (process.platform === 'win32') {
    const saida = execFileSync('powershell.exe', ['-NoProfile','-Command', `(Get-NetTCPConnection -LocalPort ${porta} -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique`], {encoding:'utf8'}).trim();
    const pids = saida.split(/\s+/).filter(Boolean);
    if (!pids.length) { console.log(`Nenhum processo ouvindo a porta ${porta}.`); process.exit(0); }
    for (const pid of pids) execFileSync('taskkill.exe', ['/PID', pid, '/F'], {stdio:'ignore'});
    console.log(`Porta ${porta} liberada.`);
  } else {
    const saida = execFileSync('sh', ['-lc', `lsof -ti tcp:${porta} || true`], {encoding:'utf8'}).trim();
    const pids = saida.split(/\s+/).filter(Boolean);
    if (!pids.length) { console.log(`Nenhum processo ouvindo a porta ${porta}.`); process.exit(0); }
    for (const pid of pids) process.kill(Number(pid), 'SIGTERM');
    console.log(`Porta ${porta} liberada.`);
  }
} catch (erro) {
  console.error(`Não foi possível liberar a porta ${porta}:`, erro.message);
  process.exit(1);
}

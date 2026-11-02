// Executa um comando (gerar, testar, verificar, construir) nos seis produtos.
// "testar" roda antes os testes dos módulos comuns.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produtos } from './produtos.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const comando = process.argv[2];
const permitidos = ['gerar', 'testar', 'verificar', 'construir'];
if (!permitidos.includes(comando)) {
  console.error(`Use: node executar-em-todos.mjs <${permitidos.join('|')}>`);
  process.exit(2);
}

const falhas = [];

if (comando === 'testar') {
  const pastaDeTestes = path.join(raiz, 'compartilhado', 'testes');
  const arquivos = fs.readdirSync(pastaDeTestes).filter((nome) => nome.endsWith('.test.js')).map((nome) => path.join(pastaDeTestes, nome));
  console.log('\n=== Módulos comuns ===');
  const resultado = spawnSync(process.execPath, ['--test', ...arquivos], { stdio: 'inherit' });
  if (resultado.status !== 0) falhas.push('compartilhado');
}

for (const produto of produtos) {
  const pasta = path.join(raiz, produto.pasta);
  if (!fs.existsSync(path.join(pasta, 'package.json'))) continue;
  console.log(`\n=== ${produto.pasta}: ${comando} ===`);
  const resultado = spawnSync('npm', ['run', comando], { cwd: pasta, stdio: 'inherit', shell: process.platform === 'win32' });
  if (resultado.status !== 0) falhas.push(produto.pasta);
}

if (falhas.length) {
  console.error(`\nFalhou em: ${falhas.join(', ')}`);
  process.exit(1);
}
console.log(`\n"${comando}" concluído em todos os produtos.`);

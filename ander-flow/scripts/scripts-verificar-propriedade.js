// scripts-verificar-propriedade.js — confere se um agente só mexeu nos arquivos dele.
// Uso: node scripts/scripts-verificar-propriedade.js <agente> [--base <ref>] [--raiz-git <pasta>]
// Compara os arquivos alterados (git diff --name-only <base> + não rastreados) com os padrões
// do agente em .orquestracao/propriedade.json. Padrão começando com "!" exclui. Caminhos são relativos à pasta ander-flow/.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentos = process.argv.slice(2);
const agente = argumentos[0];
const base = valorDe('--base') ?? 'HEAD';
const pastaGit = resolve(valorDe('--raiz-git') ?? raizProjeto);

function valorDe(opcao) {
  const indice = argumentos.indexOf(opcao);
  return indice >= 0 ? argumentos[indice + 1] : undefined;
}

export function padraoParaExpressao(padrao) {
  let texto = '';
  for (let i = 0; i < padrao.length; i++) {
    const c = padrao[i];
    if (c === '*' && padrao[i + 1] === '*') {
      texto += '.*';
      i++;
      if (padrao[i + 1] === '/') i++;
    } else if (c === '*') texto += '[^/]*';
    else if (c === '?') texto += '[^/]';
    else if (c === '{') {
      const fim = padrao.indexOf('}', i);
      const opcoes = padrao.slice(i + 1, fim).split(',').map((o) => o.replace(/[.+^$()|[\]\\]/g, '\\$&'));
      texto += '(?:' + opcoes.join('|') + ')';
      i = fim;
    } else texto += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + texto + '$');
}

function git(...args) {
  return execFileSync('git', args, { cwd: pastaGit, encoding: 'utf8' }).split('\n').map((l) => l.trim()).filter(Boolean);
}

if (!agente) {
  console.error('Informe o agente. Ex.: node scripts/scripts-verificar-propriedade.js A6-autenticacao');
  process.exit(2);
}

const propriedade = JSON.parse(readFileSync(join(raizProjeto, '.orquestracao', 'propriedade.json'), 'utf8'));
const padroes = propriedade[agente];
if (!padroes) {
  console.error(`Agente "${agente}" não existe em .orquestracao/propriedade.json.`);
  process.exit(2);
}
const expressoes = padroes.filter((p) => !p.startsWith('!')).map(padraoParaExpressao);
const exclusoes = padroes.filter((p) => p.startsWith('!')).map((p) => padraoParaExpressao(p.slice(1)));

const topo = git('rev-parse', '--show-toplevel')[0];
const prefixo = relative(topo, raizProjeto).replace(/\\/g, '/');
const alterados = new Set([
  ...git('diff', '--name-only', base, '--', '.'),
  ...git('ls-files', '--others', '--exclude-standard', '--', '.'),
].map((c) => c.replace(/\\/g, '/')).map((c) => (prefixo && c.startsWith(prefixo + '/') ? c.slice(prefixo.length + 1) : c)));

const fora = [...alterados].filter((c) => !expressoes.some((e) => e.test(c)) || exclusoes.some((e) => e.test(c)));
if (fora.length) {
  console.error(`REPROVADO: ${agente} alterou ${fora.length} arquivo(s) fora do escopo:`);
  for (const c of fora) console.error('  - ' + c);
  process.exit(1);
}
console.log(`APROVADO: ${agente} alterou ${alterados.size} arquivo(s), todos dentro do escopo.`);

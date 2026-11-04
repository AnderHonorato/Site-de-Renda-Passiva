/** Snapshot SQLite privado. Não substitui um destino existente nem restaura em produção. */
import { DatabaseSync } from 'node:sqlite';
import { closeSync, openSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositorio = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const [origem, destino] = process.argv.slice(2);
let fonte, copia;
try {
  if (!origem || !destino || !isAbsolute(origem) || !isAbsolute(destino) || process.argv.length !== 4)
    throw new Error('Informe caminhos absolutos da origem e de um destino novo.');
  const arquivoOrigem = realpathSync(origem);
  if (!statSync(arquivoOrigem).isFile()) throw new Error('A origem precisa ser um arquivo existente.');
  const pastaDestino = realpathSync(dirname(destino));
  const rel = relative(realpathSync(repositorio), pastaDestino);
  if (!rel || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)))
    throw new Error('O destino deve ficar fora do repositório e de suas pastas públicas.');
  const arquivoDestino = join(pastaDestino, basename(destino));
  fonte = new DatabaseSync(arquivoOrigem, { readOnly: true });
  // A leitura falha para arquivos que não sejam bancos SQLite válidos.
  fonte.prepare('PRAGMA schema_version').get();
  closeSync(openSync(arquivoDestino, 'wx', 0o600));
  fonte.prepare('VACUUM INTO ?').run(arquivoDestino);
  copia = new DatabaseSync(arquivoDestino, { readOnly: true });
  if (copia.prepare('PRAGMA quick_check').get().quick_check !== 'ok')
    throw new Error('A cópia falhou na verificação de integridade.');
  console.log('Cópia criada e verificada. Proteja-a e teste a restauração isoladamente.');
} catch (e) {
  console.error('Backup não concluído: ' + e.message + '. Se um destino novo foi criado, ele pode estar incompleto e não deve ser utilizado.');
  process.exitCode = 1;
} finally {
  copia?.close(); fonte?.close();
}

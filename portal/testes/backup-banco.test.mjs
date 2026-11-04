import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { constants, copyFileSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve(import.meta.dirname, '../scripts-admin/backup-banco.mjs');
test('backup consistente inclui WAL, não sobrescreve destino e preserva banco original', () => {
  const dir = mkdtempSync(join(tmpdir(), 'portal-backup-teste-'));
  const origem = join(dir, 'origem.sqlite'), destino = join(dir, 'backup.sqlite');
  const db = new DatabaseSync(origem);
  try {
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE dados(valor TEXT); INSERT INTO dados VALUES('privado');");
    const executar = (origem, destino) => spawnSync(process.execPath, [script, origem, destino], { encoding: 'utf8' });
    const resultado = executar(origem, destino);
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.doesNotMatch(resultado.stdout, /privado/);
    assert.equal(statSync(destino).mode & 0o077, 0);
    const copia = new DatabaseSync(destino, { readOnly: true });
    try { assert.equal(copia.prepare('SELECT valor FROM dados').get().valor, 'privado'); assert.equal(copia.prepare('PRAGMA quick_check').get().quick_check, 'ok'); } finally { copia.close(); }
    assert.notEqual(executar(origem, resolve(import.meta.dirname, '../backup-proibido.sqlite')).status, 0);
    const restaurado = join(dir, 'restaurado.sqlite');
    copyFileSync(destino, restaurado, constants.COPYFILE_EXCL);
    const ensaio = new DatabaseSync(restaurado);
    try { assert.equal(ensaio.prepare('SELECT valor FROM dados').get().valor, 'privado'); ensaio.exec("INSERT INTO dados VALUES('ensaio')"); } finally { ensaio.close(); }
    assert.equal(db.prepare('SELECT count(*) AS total FROM dados').get().total, 1);
    const anterior = readFileSync(destino);
    assert.notEqual(executar(origem, destino).status, 0);
    assert.deepEqual(readFileSync(destino), anterior);
    assert.equal(db.prepare('SELECT valor FROM dados').get().valor, 'privado');
    const ausente = join(dir, 'ausente.sqlite'), naoCriado = join(dir, 'inexistente.sqlite');
    assert.notEqual(executar(ausente, naoCriado).status, 0);
    const invalido = join(dir, 'invalido.sqlite'); writeFileSync(invalido, 'não é sqlite');
    assert.notEqual(executar(invalido, join(dir, 'invalido-backup.sqlite')).status, 0);
  } finally { db.close(); }
});

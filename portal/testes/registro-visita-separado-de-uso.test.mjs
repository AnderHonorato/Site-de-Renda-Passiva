import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('abrir ferramenta marca visita sem registrar execução antecipada', async () => {
  const fonte = await readFile(new URL('../scripts/núcleo/página-de-ferramenta.js', import.meta.url), 'utf8');
  assert.match(fonte, /registrarVisualizacao\(slug\)/);
  assert.doesNotMatch(fonte, /registrarUso\(slug\)/);
  assert.match(fonte, /sinalizarVisualizadas\(\)/);
});

test('histórico de visitas continua persistente e separado dos recentes', async () => {
  const fonte = await readFile(new URL('../scripts/núcleo/preferências.js', import.meta.url), 'utf8');
  assert.match(fonte, /export function registrarVisualizacao\(slug\)/);
  assert.match(fonte, /gravar\('visualizadas'/);
  assert.match(fonte, /export function registrarUso\(slug\)/);
  assert.match(fonte, /gravar\('recentes'/);
});

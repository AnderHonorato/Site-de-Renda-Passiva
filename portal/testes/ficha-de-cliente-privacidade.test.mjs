import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ferramentaPorSlug } from '../dados/catálogo.js';
import ficha from '../scripts/ferramentas/ficha-de-cliente.js';

test('ficha de cliente é pronta, local e oferece backup JSON + Excel', () => {
  const r = ferramentaPorSlug['ficha-de-cliente'];
  assert.equal(r.status, 'pronta');
  assert.equal(r.local, true);
  assert.deepEqual(r.exporta, ['xlsx', 'json']);
  assert.equal(typeof ficha.montar, 'function');
  assert.ok(ficha.instruções.passos.length >= 4);
});

test('ficha desativa salvar na API e registro remoto de uso, sem alterar padrão das demais', async () => {
  const fonte = await readFile(new URL('../scripts/ferramentas/ficha-de-cliente.js', import.meta.url), 'utf8');
  const montador = await readFile(new URL('../scripts/núcleo/montador.js', import.meta.url), 'utf8');
  assert.match(fonte, /permitirSalvarTrabalho:\s*false/);
  assert.match(fonte, /registrarUsoAtivo:\s*false/);
  assert.match(fonte, /formulario\.addEventListener\('reset'/);
  assert.match(montador, /permitirSalvarTrabalho = true/);
  assert.match(montador, /registrarUsoAtivo = true/);
  assert.match(montador, /if \(permitirSalvarTrabalho\) botões\.push/);
  assert.match(montador, /if \(registrarUsoAtivo\) void registrarUso/);
});

test('a página gerada inclui estilo e documentação de backup privado', async () => {
  const html = await readFile(new URL('../f/ficha-de-cliente/index.html', import.meta.url), 'utf8');
  assert.match(html, /ficha-de-cliente\.css/);
  assert.match(html, /backup JSON/i);
  assert.match(html, /sem criptografia/i);
});

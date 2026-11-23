import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ferramentasProntas } from '../dados/catálogo.js';

const repo = new URL('../../', import.meta.url);
const inventario = JSON.parse(await readFile(new URL('portal/documentacao/inventario-evolucao-visual.json', repo), 'utf8'));

test('o inventário visual cobre exatamente o catálogo pronto, preservando nome e plano', () => {
  assert.equal(new Set(inventario.ferramentas.map(f => f.slug)).size, inventario.ferramentas.length);
  assert.deepEqual(inventario.ferramentas.map(f => f.slug).sort(), ferramentasProntas.map(f => f.slug).sort());
  assert.equal(inventario.total, ferramentasProntas.length);
  for (const ferramenta of ferramentasProntas) {
    const item = inventario.ferramentas.find(f => f.slug === ferramenta.slug);
    assert.equal(item.nome, ferramenta.nome, ferramenta.slug);
    assert.equal(item.plano, ferramenta.plano, ferramenta.slug);
    assert.ok(item.lotes.includes(4), `${ferramenta.slug} participa da revisão final`);
  }
});

test('cada ferramenta inventariada realmente monta uma das interfaces integradas, inclusive as fábricas', async () => {
  const fontes = new Map();
  async function fonte(caminho) {
    if (!fontes.has(caminho)) fontes.set(caminho, await readFile(new URL(caminho, repo), 'utf8'));
    return fontes.get(caminho);
  }
  for (const item of inventario.ferramentas) {
    const pagina = await fonte(item.moduloPagina);
    if (item.familia === 'servidor/estudio-midia') {
      const tipo = item.slug === 'estudio-video-servidor' ? 'video' : 'audio';
      assert.ok(pagina.includes(`criarEstudioVisual('${tipo}')`), item.slug);
      assert.match(await fonte(item.adaptadorCompartilhado), /montar\(raiz,\s*ferramenta\)/, item.slug);
      continue;
    }
    if (item.familia === 'local/ocr') {
      assert.match(pagina, /\bmontarOCR\(/, item.slug);
      assert.match(await fonte(item.adaptadorCompartilhado), /\bmontarFerramenta\(/, item.slug);
      continue;
    }
    if (item.familia === 'local/editor-office') {
      assert.match(pagina, /\bmountBase\(/, item.slug);
      assert.match(await fonte(item.adaptadorCompartilhado), /\bcriarProgresso\(/, item.slug);
      continue;
    }
    if (item.familia === 'local/editor-audio') {
      assert.match(pagina, /\bcriarExecucaoVisual\(/, item.slug);
      assert.match(await fonte(item.adaptadorCompartilhado), /duracaoMinimaMs/, item.slug);
      continue;
    }
    if (item.familia === 'profissional') {
      assert.match(pagina, /export default criarFerramentaProfissional\(/, item.slug);
      assert.ok(pagina.includes(`'${item.slug}'`), item.slug);
      continue;
    }
    if (item.adaptadorCompartilhado.endsWith('/montador.js')) {
      assert.match(pagina, /\bmontarFerramenta\(/, item.slug);
    } else {
      assert.match(pagina, /export default \w+\(/, `${item.slug} chama sua fábrica`);
      assert.match(await fonte(item.adaptadorCompartilhado), /\bmontarFerramenta\(/, `${item.slug}: fábrica monta a interface`);
    }
  }
});

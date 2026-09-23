import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

// Páginas que qualquer visitante abre; os links delas são os que alguém sem conta segue.
const PAGINAS_PUBLICAS = [
  '/',
  '/ferramentas',
  '/ferramentas/preco-de-venda',
  '/ferramentas/limpar-planilha',
  '/entrar',
  '/recuperar-senha',
  '/planos',
  '/privacidade',
  '/termos',
  '/cookies',
  '/salvos',
  '/avisos',
];

function ligacoesInternas(html) {
  const encontradas = new Set();
  for (const [, destino] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    if (destino.startsWith('/') && !destino.startsWith('//')) encontradas.add(destino.replace(/&amp;/g, '&'));
  }
  return encontradas;
}

test('nenhum link interno das páginas públicas leva a 404 ou erro do servidor', async (t) => {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-ligacoes-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  t.after(() => servidor.close());
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const destinos = new Map();
  for (const pagina of PAGINAS_PUBLICAS) {
    const resposta = await fetch(base + pagina);
    assert.equal(resposta.status, 200, `a página ${pagina} precisa abrir`);
    for (const destino of ligacoesInternas(await resposta.text())) {
      if (!destinos.has(destino)) destinos.set(destino, pagina);
    }
  }

  assert.ok(destinos.size > 10, 'o teste precisa achar os links do cabeçalho, rodapé e conteúdo');

  const quebrados = [];
  for (const [destino, origem] of destinos) {
    const resposta = await fetch(base + destino, { redirect: 'manual' });
    // 302 para /entrar e 403 no /admin são o comportamento esperado para visitante sem conta.
    if (resposta.status === 404 || resposta.status >= 500) quebrados.push(`${destino} (${resposta.status}, visto em ${origem})`);
  }
  assert.deepEqual(quebrados, [], `links quebrados:\n${quebrados.join('\n')}`);
});

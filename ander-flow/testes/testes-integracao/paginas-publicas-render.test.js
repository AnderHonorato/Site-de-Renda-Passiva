// paginas-publicas-render.test.js — as páginas públicas (planos, privacidade, termos, cookies)
// respondem 200, em português, montadas de verdade (sem chave de idioma crua no HTML).

import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

async function subirServidor() {
  const configuracao = carregarConfiguracao({ AMBIENTE: 'desenvolvimento' });
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { base, fechar: () => servidor.close() };
}

// Uma chave de idioma sem tradução aparece no HTML como texto solto no formato
// "<prefixo>.resto.da.chave" (ver §3.3 do contrato). Sem isso, a página está bem traduzida.
function temChaveCrua(html, prefixoRaiz) {
  return new RegExp(`>\\s*${prefixoRaiz}\\.[a-z0-9_.]+\\s*<`).test(html);
}

const PAGINAS = [
  { caminho: '/planos', prefixo: 'planos' },
  { caminho: '/privacidade', prefixo: 'privacidade' },
  { caminho: '/termos', prefixo: 'termos' },
  { caminho: '/cookies', prefixo: 'cookies' },
];

for (const { caminho, prefixo } of PAGINAS) {
  test(`GET ${caminho} responde 200, em pt-BR e sem chave de idioma crua`, async (t) => {
    const ambiente = await subirServidor();
    t.after(() => ambiente.fechar());

    const resposta = await fetch(ambiente.base + caminho);
    const html = await resposta.text();

    assert.equal(resposta.status, 200);
    assert.match(html, /<html[^>]*\slang="pt-BR"/);
    assert.equal(temChaveCrua(html, prefixo), false, `encontrou chave de idioma crua de "${prefixo}" no HTML`);
    assert.equal(temChaveCrua(html, 'compartilhado'), false, 'encontrou chave de idioma crua de "compartilhado" no HTML');
  });
}

test('GET /planos mostra o preço do Plus vindo da configuração, nunca fixo no HTML', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());

  const resposta = await fetch(ambiente.base + '/planos');
  const html = await resposta.text();

  assert.equal(resposta.status, 200);
  assert.match(html, /R\$\s*14,90/, 'preço mensal do Plus vem de configuracao.planos');
  assert.ok(!html.includes('150 ferramentas'), 'contagem de ferramentas não pode estar fixa no HTML');
});

test('GET /privacidade explica os cookies e a exportação/exclusão de dados em /conta', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());

  const resposta = await fetch(ambiente.base + '/privacidade');
  const html = await resposta.text();

  assert.equal(resposta.status, 200);
  assert.ok(html.includes('af_sessao'));
  assert.ok(html.includes('af_csrf'));
  assert.ok(html.includes('href="/conta"'));
});

test('GET /cookies lista os cookies próprios numa tabela, sem cookie de rastreamento', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());

  const resposta = await fetch(ambiente.base + '/cookies');
  const html = await resposta.text();

  assert.equal(resposta.status, 200);
  assert.ok(html.includes('class="tabela'));
  assert.ok(html.includes('af_csrf'));
  assert.ok(html.includes('af-tema'));
});

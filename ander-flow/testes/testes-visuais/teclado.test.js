// teclado.test.js — teste de teclado (docs/contratos.md §14): em /, /ferramentas/preco-de-venda
// e /entrar, navegando só com Tab, o foco precisa chegar ao campo principal e ao botão de ação,
// e o foco precisa ter indicador visível (outline ou box-shadow computado diferente de "none").
// Campo de texto não tem borda própria: quem desenha a caixa é o `.campo__controle` que o envolve,
// e é nele que o contorno de foco aparece (compartilhado-componentes.css:161-164, via :has()).
// Por isso o indicador conta se estiver no elemento focado ou no `.campo__controle` dele.

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

let ambiente;

before(async () => {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-teclado-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const browser = await chromium.launch({ channel: process.env.NAVEGADOR_TESTES ?? 'msedge' });
  ambiente = { banco, base, browser, fechar: async () => { await browser.close(); await new Promise((r) => servidor.close(r)); } };
});

after(async () => {
  await ambiente.fechar();
});

// Aperta Tab repetidamente a partir do topo da página, até encontrar todos os `seletores`
// (ou esgotar `maxTabs`). Devolve, para cada seletor encontrado, se o elemento QUE ESTAVA COM O
// FOCO naquele instante tinha contorno visível (outline ou box-shadow computado != "none").
async function tabularAte(pagina, seletores, maxTabs = 80) {
  const achados = new Map();
  for (let i = 0; i < maxTabs && achados.size < seletores.length; i += 1) {
    await pagina.keyboard.press('Tab');
    // eslint-disable-next-line no-await-in-loop
    const info = await pagina.evaluate((seletoresAvaliados) => {
      const ativo = document.activeElement;
      if (!ativo || ativo === document.body) return null;
      const seletorCasado = seletoresAvaliados.find((seletor) => ativo.matches(seletor));
      if (!seletorCasado) return null;
      const temIndicador = (elemento) => {
        if (!elemento) return false;
        const estilo = getComputedStyle(elemento);
        const temOutline = estilo.outlineStyle !== 'none' && estilo.outlineStyle !== '' && parseFloat(estilo.outlineWidth) > 0;
        return temOutline || estilo.boxShadow !== 'none';
      };
      const contornoVisivel = temIndicador(ativo) || temIndicador(ativo.closest('.campo__controle'));
      return { seletor: seletorCasado, contornoVisivel };
    }, seletores);
    if (info && !achados.has(info.seletor)) achados.set(info.seletor, info);
  }
  return achados;
}

async function abrirPagina(caminho) {
  const contexto = await ambiente.browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pagina = await contexto.newPage();
  await pagina.goto(ambiente.base + caminho, { waitUntil: 'networkidle' });
  return { contexto, pagina, fechar: () => contexto.close() };
}

test('foco por teclado em / alcança a busca e o botão de enviar, ambos com contorno visível', async () => {
  const SELETOR_CAMPO = '#principal-busca';
  const SELETOR_BOTAO = '.principal__forma-busca button[type="submit"]';
  const { pagina, fechar } = await abrirPagina('/');
  try {
    const achados = await tabularAte(pagina, [SELETOR_CAMPO, SELETOR_BOTAO]);
    assert.ok(achados.has(SELETOR_CAMPO), 'Tab não alcançou o campo principal da busca');
    assert.ok(achados.has(SELETOR_BOTAO), 'Tab não alcançou o botão de ação');
    assert.equal(achados.get(SELETOR_CAMPO).contornoVisivel, true, 'campo principal sem contorno visível ao focar');
    assert.equal(achados.get(SELETOR_BOTAO).contornoVisivel, true, 'botão de ação sem contorno visível ao focar');
  } finally {
    await fechar();
  }
});

test('foco por teclado em /entrar alcança o botão "Entrar" com contorno visível', async () => {
  const SELETOR_BOTAO = '.entrar__formulario[data-formulario="entrar"] button[type="submit"]';
  const { pagina, fechar } = await abrirPagina('/entrar');
  try {
    const achados = await tabularAte(pagina, ['#entrar-campo-email', SELETOR_BOTAO]);
    assert.ok(achados.has(SELETOR_BOTAO), 'Tab não alcançou o botão de ação de /entrar');
    assert.equal(achados.get(SELETOR_BOTAO).contornoVisivel, true, 'botão "Entrar" sem contorno visível ao focar');
  } finally {
    await fechar();
  }
});

test(
  'foco por teclado em /entrar: o campo de e-mail tem contorno visível no controle que o envolve',
  async () => {
    const SELETOR_CAMPO = '#entrar-campo-email';
    const { pagina, fechar } = await abrirPagina('/entrar');
    try {
      const achados = await tabularAte(pagina, [SELETOR_CAMPO]);
      assert.ok(achados.has(SELETOR_CAMPO));
      assert.equal(achados.get(SELETOR_CAMPO).contornoVisivel, true);
    } finally {
      await fechar();
    }
  },
);

test('foco por teclado em /ferramentas/preco-de-venda alcança o botão "Calcular" com contorno visível', async () => {
  const SELETOR_BOTAO = '.ferramenta__acoes button[type="submit"]';
  const { pagina, fechar } = await abrirPagina('/ferramentas/preco-de-venda');
  try {
    const achados = await tabularAte(pagina, ['#campo-custo', SELETOR_BOTAO]);
    assert.ok(achados.has(SELETOR_BOTAO), 'Tab não alcançou o botão "Calcular"');
    assert.equal(achados.get(SELETOR_BOTAO).contornoVisivel, true, 'botão "Calcular" sem contorno visível ao focar');
  } finally {
    await fechar();
  }
});

test(
  'foco por teclado em /ferramentas/preco-de-venda: o campo "Custo" tem contorno visível no controle que o envolve',
  async () => {
    const SELETOR_CAMPO = '#campo-custo';
    const { pagina, fechar } = await abrirPagina('/ferramentas/preco-de-venda');
    try {
      const achados = await tabularAte(pagina, [SELETOR_CAMPO]);
      assert.ok(achados.has(SELETOR_CAMPO));
      assert.equal(achados.get(SELETOR_CAMPO).contornoVisivel, true);
    } finally {
      await fechar();
    }
  },
);

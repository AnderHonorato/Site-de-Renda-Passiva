import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarPdfRelatorio } from '../scripts/comum/profissionais/pdf-relatorio.js';
import { abrirComPdfjsParaTexto } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import { montarTextoDaPágina } from '../scripts/cálculos/extrair-texto-de-pdf.js';
import { executar as executarFinanceiro } from '../servidor/profissionais/financeiro.mjs';

async function extrair(bytes) {
  const doc = await abrirComPdfjsParaTexto(bytes);
  try {
    const páginas = [];
    for (let i = 1; i <= doc.páginas; i++) {
      const pagina = await doc.texto(i);
      const texto = montarTextoDaPágina(pagina.itens);
      for (const item of pagina.itens) {
        assert.ok(item.oy >= 0 && item.oy < pagina.altura, `Texto saiu do limite vertical na página ${i}`);
        assert.ok(item.ox >= 0 && item.ox + item.ux <= pagina.largura + 1, `Texto saiu do limite horizontal na página ${i}: ${item.str}`);
      }
      páginas.push(texto);
    }
    return páginas;
  } finally { await doc.fechar(); }
}

test('PDF financeiro apresenta cabeçalho, resumo, método e barras assinadas sem inventar moeda', async () => {
  const relatorio = executarFinanceiro('fluxo-caixa-descontado', {
    csv: 'periodo;fluxo_caixa\n1;120000\n2;145000\n3;170000',
    opcoes: { wacc: 12, crescimento_terminal: 3, caixa_liquido: 0 },
  });
  const bytes = gerarPdfRelatorio(relatorio, { slug: 'fluxo-caixa-descontado' });
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const páginas = await extrair(bytes), texto = páginas.join('\n');
  assert.match(texto, /Valuation por fluxo de caixa descontado/);
  assert.match(texto, /Método e premissas/);
  assert.match(texto, /Indicadores/);
  assert.match(texto, /Dados das séries/);
  assert.match(texto, /120\.000,00/);
  assert.match(texto, /unidade.*entrada/i);
  assert.doesNotMatch(texto, /R\$/);
  assert.match(texto, /WACC 10%, g 2%/);
  assert.match(texto, /WACC 14%, g 4%/);
  assert.ok(páginas.length >= 2 && páginas.length <= 2, `Esperadas no máximo 2 páginas, recebidas ${páginas.length}`);
  assert.match(páginas[0], /Análise de sensibilidade · 9 cenários/);
  assert.match(páginas[0], /Sensibilidade 9/);
  assert.match(páginas[1], /Dados completos/);
  assert.match(páginas[1], /3 3 170\.000,00/);
});

test('PDF organiza tabelas largas em painéis, preserva células longas e representa Unicode', async () => {
  const colunas = Array.from({ length: 11 }, (_, i) => `Campo ${i + 1}`);
  const final = 'FINAL_DA_CELULA Ω';
  const longa = 'IdentificadorLongo '.repeat(240) + final;
  const relatorio = {
    titulo: 'Relatório de comparação',
    indicadores: [['Amostra', 3], ['Variação', -0.00000000012], ['Status', true]],
    colunas,
    linhas: Array.from({ length: 24 }, (_, i) => colunas.map((_, c) => `L${i + 1}C${c + 1}`)),
    series: [{ nome: 'Resultado negativo e longo', valor: -12.5 }, { nome: 'Resultado positivo', valor: 25 }],
    notas: ['Premissa da amostra.'],
    metodo: 'Comparação de valores sem moeda nem unidade declarada.',
  };
  relatorio.linhas[0][0] = longa;
  const bytes = gerarPdfRelatorio(relatorio);
  const páginas = await extrair(bytes), texto = páginas.join('\n');
  assert.match(texto, /FINAL_DA_CELULA/);
  assert.match(texto, /\[U\+03A9\]/);
  assert.match(texto, /Resultado negativo e longo/);
  assert.match(texto, /-12,5/);
  assert.match(texto, /Campo 11/);
  assert.match(texto, /L24C11/);
  assert.match(texto, /Representação de caracteres/);
  assert.ok(páginas.length >= 4);
  assert.ok(páginas.every((p) => p.trim().length > 0), 'Não deve gerar páginas vazias');
});

test('PDF aceita centenas de séries sem sobrepor o gráfico e marca amostragem de 20', async () => {
  const series = Array.from({ length: 27 }, (_, i) => ({ nome: `Série ${i + 1}`, valor: i - 13 }));
  const bytes = gerarPdfRelatorio({
    titulo: 'Resumo de séries', indicadores: [['Total', 0]], colunas: ['Nome', 'Valor'],
    linhas: [['Amostra', -13]], series, notas: [], metodo: 'Barras com zero explícito.',
  });
  const texto = (await extrair(bytes)).join('\n');
  assert.match(texto, /20 de 27 séries/);
  assert.match(texto, /primeiras 20 séries/);
  assert.match(texto, /Série 27/);
  assert.match(texto, /-13/);
});

test('barras vetoriais preservam escala para séries positivas, mistas e negativas', () => {
  const retangulos = (series, rgb) => {
    const bytes = gerarPdfRelatorio({
      titulo: 'Escala do gráfico', indicadores: [], colunas: ['Nome', 'Valor'], linhas: [],
      series: series.map((valor, i) => ({ nome: `Série ${i + 1}`, valor })), notas: [], metodo: 'Teste de escala.',
    });
    const pdf = new TextDecoder().decode(bytes);
    const rx = new RegExp(`${rgb} rg ([\\d.]+) ([\\d.]+) ([\\d.]+) ([\\d.]+) re f Q`, 'g');
    return [...pdf.matchAll(rx)].map((m) => ({ largura: Number(m[3]), altura: Number(m[4]) })).filter((r) => r.altura > 8 && r.altura < 10);
  };
  const terracota = '0\\.659 0\\.278 0\\.165';
  const negativo = '0\\.635 0\\.247 0\\.196';
  const positivos = retangulos([2, 4], terracota);
  assert.equal(positivos.length, 2);
  assert.ok(positivos[0].largura > 0 && positivos[1].largura > 0);
  assert.ok(Math.abs(positivos[1].largura / positivos[0].largura - 2) < 0.01);

  const mistosPositivos = retangulos([-2, 4], terracota);
  const mistosNegativos = retangulos([-2, 4], negativo);
  assert.equal(mistosPositivos.length, 1);
  assert.equal(mistosNegativos.length, 1);
  assert.ok(Math.abs(mistosPositivos[0].largura / mistosNegativos[0].largura - 2) < 0.01);

  const negativos = retangulos([-2, -4], negativo);
  assert.equal(negativos.length, 2);
  assert.ok(negativos[0].largura > 0 && negativos[1].largura > 0);
  assert.ok(Math.abs(negativos[1].largura / negativos[0].largura - 2) < 0.01);
});

test('indicador maior que uma página flui como texto e não desenha fora dos limites', async () => {
  const grande = `Valor inicial ${'conteúdo comprido '.repeat(1500)} VALOR FINAL`;
  const bytes = gerarPdfRelatorio({
    titulo: 'Indicador extenso', indicadores: [['Descrição completa', grande]], colunas: ['Item'],
    linhas: [['Amostra']], series: [], notas: [], metodo: 'Valor com detalhe completo.',
  });
  const páginas = await extrair(bytes);
  assert.ok(páginas.length >= 2);
  assert.match(páginas.join('\n'), /VALOR FINAL/);
});

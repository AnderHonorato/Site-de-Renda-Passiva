import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converterPdfParaMarkdown, estruturarLinhas, markdownDosBlocos, escaparMarkdown, LIMITE_BYTES_MARKDOWN, LIMITE_TEXTO_MARKDOWN } from '../scripts/cálculos/pdf-para-markdown.js';

const bytes = new TextEncoder().encode('%PDF-1.7\nfixture');
const item = (str, y, h = 12) => ({ str, ox: 20, oy: y, ux: str.length * h / 2, uy: 0, vx: 0, vy: -h, eol: true });

test('Markdown: reconhece títulos, une linhas do parágrafo e conserva listas', () => {
  const blocos = estruturarLinhas([
    { texto: 'Guia', y: 20, altura: 24 },
    { texto: 'Um parágrafo com muitas palavras que representam o corpo do documento.', y: 60, altura: 12 },
    { texto: 'A segunda linha continua a explicação.', y: 78, altura: 12 },
    { texto: '• Primeiro item', y: 110, altura: 12 },
    { texto: '• Segundo item', y: 128, altura: 12 },
    { texto: '3. Terceiro passo', y: 165, altura: 12 },
    { texto: '4. Quarto passo', y: 183, altura: 12 },
  ]);
  assert.equal(blocos[0].tipo, 'titulo');
  assert.equal(blocos[0].nível, 1);
  assert.equal(blocos[1].texto, 'Um parágrafo com muitas palavras que representam o corpo do documento. A segunda linha continua a explicação.');
  assert.deepEqual(blocos[2].itens, ['Primeiro item', 'Segundo item']);
  assert.equal(blocos[3].início, 3);
  assert.match(markdownDosBlocos(blocos), /^# Guia\n/);
  assert.match(markdownDosBlocos(blocos), /3\. Terceiro passo\n4\. Quarto passo/);
});

test('Markdown: conteúdo do PDF não cria HTML, imagem, link ou ênfase', () => {
  assert.equal(escaparMarkdown('<script>alert(1)</script> [site](https://x) ![img](x) **texto**'), '\\<script\\>alert(1)\\</script\\> \\[site\\](https://x) !\\[img\\](x) \\*\\*texto\\*\\*');
  assert.equal(escaparMarkdown('# literal'), '\\# literal');
  assert.equal(escaparMarkdown('1. literal'), '1\\. literal');
});

test('Markdown: opção sem estrutura mantém título e marcadores como texto literal', () => {
  const blocos = estruturarLinhas([{ texto: 'Título', y: 20, altura: 24 }, { texto: '- Item do documento', y: 65, altura: 12 }], { estrutura: false });
  assert.equal(blocos.every((b) => b.tipo === 'paragrafo'), true);
  assert.match(markdownDosBlocos(blocos), /\\- Item/);
});

test('Markdown: seleção de páginas, páginas sem texto e fechamento obrigatório', async () => {
  let fechou = 0;
  const lidas = [];
  const r = await converterPdfParaMarkdown({ bytes, nome: 'guia.pdf' }, { páginas: '2-3', abrir: async () => ({
    páginas: 3, texto: async (p) => { lidas.push(p); return { itens: p === 2 ? [item('Texto correto da segunda página.', 20)] : [] }; }, fechar: () => { fechou++; },
  }) });
  assert.equal(r.ok, true);
  assert.deepEqual(lidas, [2, 3]);
  assert.deepEqual(r.semTexto, [3]);
  assert.match(r.markdown, /<!-- Página 2 -->/);
  assert.doesNotMatch(r.markdown, /Página 1/);
  assert.match(r.texto, /^Página 2/);
  assert.equal(fechou, 1);
});

test('Markdown: sem texto dá orientação OCR; senha, limite e seleção são recusados', async () => {
  const abrir = async () => ({ páginas: 1, texto: async () => ({ itens: [] }), fechar() {} });
  assert.equal((await converterPdfParaMarkdown({ bytes }, { abrir })).erro, 'sem_texto');
  assert.equal((await converterPdfParaMarkdown({ bytes }, { abrir, páginas: '5' })).erro, 'faixa_fora');
  assert.equal((await converterPdfParaMarkdown({ bytes: new Uint8Array(LIMITE_BYTES_MARKDOWN + 1) }, { abrir })).erro, 'arquivo_grande_demais');
  assert.equal((await converterPdfParaMarkdown({ bytes }, { abrir: async () => ({ páginas: 101, fechar() {} }) })).erro, 'pdf_páginas_demais');
  const senha = new Error('senha'); senha.name = 'PasswordException';
  assert.equal((await converterPdfParaMarkdown({ bytes }, { abrir: async () => { throw senha; } })).erro, 'pdf_protegido');
});

test('Markdown: cancela entre páginas, fecha o leitor e limita o texto', async () => {
  let fechou = 0, cancelar = false;
  const abrir = async () => ({ páginas: 3, texto: async () => { cancelar = true; return { itens: [item('texto', 20)] }; }, fechar() { fechou++; } });
  assert.equal((await converterPdfParaMarkdown({ bytes }, { abrir, cancelado: () => cancelar })).erro, 'cancelado');
  assert.equal(fechou, 1);
  const grande = await converterPdfParaMarkdown({ bytes }, { abrir: async () => ({ páginas: 1, texto: async () => ({ itens: [item('a'.repeat(LIMITE_TEXTO_MARKDOWN + 1), 20)] }), fechar() {} }) });
  assert.equal(grande.erro, 'texto_grande');
});

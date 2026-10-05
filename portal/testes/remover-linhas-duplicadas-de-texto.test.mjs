/**
 * Testes de remover linhas duplicadas.
 *
 * Os três primeiros casos são os da especificação do Ander Flow
 * (docs/catalogo/catalogo-texto.md, "remover-linhas-duplicadas-de-texto").
 * O caso 3 da especificação devolve um objeto de erro com `texto_grande_demais`;
 * no portal a recusa é a mensagem mostrada no campo "texto", com o mesmo limite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { removerLinhasDuplicadas } from '../scripts/cálculos/remover-linhas-duplicadas-de-texto.js';
import ferramenta, {
  LIMITE_DE_CARACTERES, LIMITE_DE_LINHAS, LINHAS_NA_TELA,
} from '../scripts/ferramentas/remover-linhas-duplicadas-de-texto.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const FRUTAS = 'banana\nMaçã\nbanana\nUva\nmaçã';

/* ------------------------------------------------- casos do Ander Flow */

test('caso 1 do catálogo: padrão ignora maiúsculas → "banana\\nMaçã\\nUva", 2 removidas', () => {
  const r = removerLinhasDuplicadas(FRUTAS);
  assert.equal(r.texto, 'banana\nMaçã\nUva');
  assert.equal(r.linhasRemovidas, 2);
});

test('caso 2 do catálogo: sem ignorar maiúsculas só sai a "banana" igual → "banana\\nMaçã\\nUva\\nmaçã", 1 removida', () => {
  const r = removerLinhasDuplicadas(FRUTAS, { ignorarMaiúsculas: false });
  assert.equal(r.texto, 'banana\nMaçã\nUva\nmaçã');
  assert.equal(r.linhasRemovidas, 1);
});

test('caso 3 do catálogo: 20.001 linhas são recusadas, 20.000 passam', () => {
  // linhas curtas e todas diferentes (base 36), para o limite de linhas aparecer antes do de caracteres
  const linhas = (n) => Array.from({ length: n }, (_, i) => i.toString(36)).join('\n');
  assert.throws(() => removerLinhasDuplicadas(linhas(LIMITE_DE_LINHAS + 1)), /20\.001 linhas e o limite é 20\.000/);
  const r = removerLinhasDuplicadas(linhas(LIMITE_DE_LINHAS));
  assert.equal(r.linhasNaEntrada, 20000);
  assert.equal(r.linhasRemovidas, 0);
});

/* ------------------------------------------------------ só do portal */

test('o limite de linhas e o de caracteres seguem a especificação', () => {
  assert.equal(LIMITE_DE_LINHAS, 20000);
  assert.equal(LIMITE_DE_CARACTERES, 100000);
});

test('limite de caracteres: no limite passa, um acima é recusado', () => {
  const noLimite = 'a'.repeat(LIMITE_DE_CARACTERES);
  assert.equal(removerLinhasDuplicadas(noLimite).texto, noLimite);
  assert.throws(() => removerLinhasDuplicadas(`${noLimite}a`), /passou de 100\.000 caracteres/);
});

test('texto só de quebras de linha estoura o limite de linhas sem travar', () => {
  assert.throws(() => removerLinhasDuplicadas('\n'.repeat(LIMITE_DE_CARACTERES)), /linhas e o limite é 20\.000/);
});

test('vazio: nenhuma linha, saída vazia, sem erro', () => {
  for (const entrada of ['', undefined, null]) {
    const r = removerLinhasDuplicadas(entrada);
    assert.equal(r.texto, '');
    assert.equal(r.linhasNaEntrada, 0);
    assert.equal(r.linhasRemovidas, 0);
    assert.deepEqual(r.mantidas, []);
  }
});

test('a linha que fica é a primeira, com a caixa e os espaços originais', () => {
  const r = removerLinhasDuplicadas('  Maçã \nMAÇÃ\nmaçã  ');
  assert.equal(r.texto, '  Maçã ');
  assert.equal(r.linhasRemovidas, 2);
});

test('espaços nas bordas: ignorados por padrão, contam quando desmarcado', () => {
  assert.equal(removerLinhasDuplicadas('a\n a\na ').texto, 'a');
  const r = removerLinhasDuplicadas('a\n a\na ', { ignorarEspaçosNasBordas: false });
  assert.equal(r.texto, 'a\n a\na ');
  assert.equal(r.linhasRemovidas, 0);
});

test('espaços no meio da linha sempre contam', () => {
  assert.equal(removerLinhasDuplicadas('a  b\na b').texto, 'a  b\na b');
});

test('acento conta: "cafe" e "café" são linhas diferentes', () => {
  assert.equal(removerLinhasDuplicadas('cafe\ncafé').texto, 'cafe\ncafé');
});

test('acento solto da letra é a mesma linha que a letra composta', () => {
  const composta = 'café';
  const separada = 'café'.normalize('NFD');
  assert.notEqual(composta, separada);
  const r = removerLinhasDuplicadas(`${composta}\n${separada}`);
  assert.equal(r.texto, composta);
  assert.equal(r.linhasRemovidas, 1);
});

test('maiúsculas seguem o português: "É" e "é", "Ç" e "ç"', () => {
  assert.equal(removerLinhasDuplicadas('É\né\nÇ\nç').texto, 'É\nÇ');
});

test('linhas vazias repetidas são duplicadas por padrão: só a primeira fica', () => {
  const r = removerLinhasDuplicadas('a\n\nb\n\n\nc');
  assert.equal(r.texto, 'a\n\nb\nc');
  assert.equal(r.vaziasRemovidas, 2);
});

test('ignorarLinhasVazias mantém todas as linhas vazias', () => {
  const r = removerLinhasDuplicadas('a\n\nb\n\n\na', { ignorarLinhasVazias: true });
  assert.equal(r.texto, 'a\n\nb\n\n');
  assert.equal(r.linhasRemovidas, 1);
  assert.equal(r.vaziasRemovidas, 0);
});

test('linha só com espaços é vazia quando os espaços são ignorados, e comum quando não são', () => {
  const entrada = 'a\n  \n \nb';
  assert.equal(removerLinhasDuplicadas(entrada).texto, 'a\n  \nb');
  assert.equal(removerLinhasDuplicadas(entrada, { ignorarLinhasVazias: true }).texto, entrada);
  // sem ignorar espaços, "  " e " " são linhas diferentes e nenhuma é vazia
  const semEspaços = { ignorarEspaçosNasBordas: false, ignorarLinhasVazias: true };
  assert.equal(removerLinhasDuplicadas('a\n  \n  \nb', semEspaços).texto, 'a\n  \nb');
});

test('a quebra no fim do texto fecha a última linha e é preservada', () => {
  const r = removerLinhasDuplicadas('a\nb\na\n');
  assert.equal(r.texto, 'a\nb\n');
  assert.equal(r.linhasNaEntrada, 3);
  assert.equal(r.linhasNaSaída, 2);
});

test('um texto que é só uma quebra vira uma linha vazia', () => {
  const r = removerLinhasDuplicadas('\n');
  assert.equal(r.linhasNaEntrada, 1);
  assert.equal(r.texto, '\n');
});

test('quebras do Windows e do Mac antigo viram quebra simples na saída', () => {
  assert.equal(removerLinhasDuplicadas('a\r\nb\r\na\r\nc').texto, 'a\nb\nc');
  assert.equal(removerLinhasDuplicadas('a\rb\ra').texto, 'a\nb');
});

test('conta quantas vezes cada linha mantida apareceu', () => {
  const r = removerLinhasDuplicadas(FRUTAS);
  assert.deepEqual(r.mantidas, [
    { linha: 'banana', vezes: 2 },
    { linha: 'Maçã', vezes: 2 },
    { linha: 'Uva', vezes: 1 },
  ]);
});

test('caracteres especiais e emoji são comparados como estão', () => {
  const entrada = '<b>oi</b>\n"aspas"\n<b>oi</b>\n😀\n😀\n__proto__\n__proto__\nconstructor\nconstructor';
  assert.equal(removerLinhasDuplicadas(entrada).texto, '<b>oi</b>\n"aspas"\n😀\n__proto__\nconstructor');
});

test('propriedade: aplicar duas vezes dá o mesmo resultado que aplicar uma', () => {
  const entradas = [FRUTAS, 'a\n\n\nA\n a \nb\r\nB\n', 'x\nx\nx', '\n\n\n', 'é\né\nÉ'];
  for (const entrada of entradas) {
    for (const ignorarMaiúsculas of [true, false]) {
      for (const ignorarEspaçosNasBordas of [true, false]) {
        for (const ignorarLinhasVazias of [true, false]) {
          const opções = { ignorarMaiúsculas, ignorarEspaçosNasBordas, ignorarLinhasVazias };
          const uma = removerLinhasDuplicadas(entrada, opções);
          const duas = removerLinhasDuplicadas(uma.texto, opções);
          assert.equal(duas.texto, uma.texto, JSON.stringify([entrada, opções]));
          assert.equal(duas.linhasRemovidas, 0);
        }
      }
    }
  }
});

test('propriedade: entrada = saída + removidas, e as vezes somam as linhas da entrada', () => {
  const r = removerLinhasDuplicadas('a\nb\nA\nc\n\nb\n\nd');
  assert.equal(r.linhasNaEntrada, r.linhasNaSaída + r.linhasRemovidas);
  assert.equal(r.mantidas.reduce((soma, m) => soma + m.vezes, 0), r.linhasNaEntrada);
  assert.equal(r.mantidas.length, r.linhasNaSaída);
});

test('texto grande com milhares de repetições é rápido', () => {
  const entrada = Array.from({ length: LIMITE_DE_LINHAS }, (_, i) => `x${i % 100}`).join('\n');
  const inicio = performance.now();
  const r = removerLinhasDuplicadas(entrada);
  assert.equal(r.linhasNaSaída, 100);
  assert.ok(performance.now() - inicio < 1000);
});

/* ---------------------------------------------------- módulo da tela */

test('a tela mostra um número de linhas razoável', () => {
  assert.equal(LINHAS_NA_TELA, 50);
});

test('o exemplo de "Como usar" confere com a ferramenta', () => {
  const r = removerLinhasDuplicadas(FRUTAS);
  assert.equal(r.texto, 'banana\nMaçã\nUva');
  assert.equal(r.linhasRemovidas, 2);
  const semCaixa = removerLinhasDuplicadas(FRUTAS, { ignorarMaiúsculas: false });
  assert.equal(semCaixa.texto.split('\n').at(-1), 'maçã');
  assert.equal(semCaixa.linhasRemovidas, 1);
  const { texto } = ferramenta.instruções.exemplo;
  assert.match(texto, /2 linhas removidas/);
  assert.match(texto, /"banana, Maçã, Uva"/);
});

test('a seção "Como usar" está completa e cita os limites reais', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3);
  assert.ok(exemplo.texto.length > 0);
  assert.ok(limites.includes('100.000 caracteres'));
  assert.ok(limites.includes('20.000 linhas'));
  assert.ok(perguntas.length >= 3 && perguntas.every((q) => q.p && q.r));
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['remover-linhas-duplicadas-de-texto'];
  assert.equal(ficha.id, 'F056');
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['copiar', 'baixar']);
  assert.equal(ficha.local, true);
});

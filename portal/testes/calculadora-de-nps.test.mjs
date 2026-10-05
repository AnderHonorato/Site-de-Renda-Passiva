/**
 * Calculadora de NPS.
 *
 * Os casos de cálculo vêm da especificação (ander-flow/docs/catalogo/catalogo-vendas.md,
 * seção calculadora-de-nps). Todas as contas foram refeitas à mão; onde há
 * margem de erro, o valor esperado vem da fórmula escrita no teste, não do código.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  lerNotas, contarNotas, lerContagensPorNota, lerOnzeQuantidades, lerRespostas, calcularNps,
  arredondarQuociente, zonaDoNps, grupoDaNota,
  MÁXIMO_DE_NOTAS, MÁXIMO_DE_CARACTERES, MÁXIMO_POR_NOTA, QUANTIDADE_DE_NOTAS,
} from '../scripts/cálculos/calculadora-de-nps.js';
import { calcularNpsNaTela } from '../scripts/ferramentas/calculadora-de-nps.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';

/** Executa e devolve a recusa, falhando se não houver. */
function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  assert.fail('era esperada uma recusa');
}

const npsDeNotas = (texto) => calcularNps(lerRespostas(texto));

/** Contagem com `n` respostas na nota dada, o resto zero. */
function contagem(porNota) {
  const c = new Array(QUANTIDADE_DE_NOTAS).fill(0);
  for (const [nota, n] of Object.entries(porNota)) c[Number(nota)] = n;
  return c;
}

/* ------------------------------------------------- casos da especificação */

test('especificação 1: 10 respostas, 5 promotores, 3 neutros, 2 detratores, NPS 30', () => {
  const r = npsDeNotas('9,10,8,6,10,7,9,3,10,8');
  assert.equal(r.total, 10);
  assert.equal(r.promotores, 5);
  assert.equal(r.neutros, 3);
  assert.equal(r.detratores, 2);
  assert.equal(r.nps, 30);
  assert.deepEqual(r.percentuais, { promotores: 50, neutros: 30, detratores: 20 });
});

test('especificação 2: só promotores dão NPS 100', () => {
  const r = npsDeNotas('10,10,10');
  assert.equal(r.nps, 100);
  assert.equal(r.promotores, 3);
});

test('especificação 3: nota fora do intervalo é recusada com valor e posição', () => {
  const erro = recusaDe(() => lerRespostas('9,10,15'));
  assert.equal(erro.código, 'nota_invalida');
  assert.equal(erro.campo, 'notas');
  assert.deepEqual(erro.extras, { valor: 15, posição: 3 });
  assert.match(erro.message, /3ª nota, 15, está fora do intervalo/);
});

test('lista vazia depois de ler é recusada', () => {
  for (const vazio of ['', '   ', ' , ; \n\t ', '""']) {
    const erro = recusaDe(() => lerRespostas(vazio));
    assert.equal(erro.código, 'lista_vazia', JSON.stringify(vazio));
    assert.equal(erro.campo, 'notas');
  }
});

/* ------------------------------------------------------------- leitura */

test('aceita vírgula, ponto e vírgula, espaço, tabulação e quebra de linha, em qualquer mistura', () => {
  const esperado = [9, 10, 8, 6, 10, 7];
  assert.deepEqual(lerNotas('9,10,8,6,10,7'), esperado);
  assert.deepEqual(lerNotas('9, 10, 8, 6, 10, 7'), esperado);
  assert.deepEqual(lerNotas('9;10;8;6;10;7'), esperado);
  assert.deepEqual(lerNotas('9 10 8 6 10 7'), esperado);
  assert.deepEqual(lerNotas('9\n10\r\n8\n6\t10 ; 7\n'), esperado);
});

test('coluna copiada da planilha (aspas, BOM, espaço fixo) é lida', () => {
  assert.deepEqual(lerNotas('﻿"9"\r\n"10"\r\n 8\r\n'), [9, 10, 8]);
});

test('"9.0" e "+9" são o inteiro 9; "-0" é 0', () => {
  assert.deepEqual(lerNotas('9.0 +9 10.00 -0'), [9, 9, 10, 0]);
});

test('notas de 0 a 10 valem; -1 e 11 não', () => {
  assert.deepEqual(lerNotas('0 1 2 3 4 5 6 7 8 9 10'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(recusaDe(() => lerNotas('-1')).extras.valor, -1);
  assert.equal(recusaDe(() => lerNotas('11')).extras.valor, 11);
});

test('o que não é nota inteira é recusado no lugar certo, com mensagem própria', () => {
  const casos = [
    ['9 NaN 8', 2, /"NaN", não é um número/],
    ['Infinity', 1, /não é um número/],
    ['9 10 dez', 3, /"dez", não é um número/],
    ['9/10', 1, /não é um número/],
    ['10%', 1, /não é um número/],
    ['1e1', 1, /não é um número/],
    ['0x9', 1, /não é um número/],
    ['9 7.5', 2, /7\.5, não é um número inteiro/],
    ['10.5', 1, /fora do intervalo/],
  ];
  for (const [entrada, posição, mensagem] of casos) {
    const erro = recusaDe(() => lerNotas(entrada));
    assert.equal(erro.código, 'nota_invalida', entrada);
    assert.equal(erro.extras.posição, posição, entrada);
    assert.match(erro.message, mensagem, entrada);
  }
  // "8,5" não é recusa: a vírgula separa notas, e 8 e 5 são válidas (dito na tela).
  assert.deepEqual(lerNotas('8,5'), [8, 5]);
});

test('número com dígitos demais é "fora do intervalo", sem Infinity na mensagem', () => {
  const erro = recusaDe(() => lerNotas(`9 ${'9'.repeat(400)}`));
  assert.equal(erro.código, 'nota_invalida');
  assert.equal(erro.extras.posição, 2);
  assert.match(erro.message, /fora do intervalo/);
  assert.ok(erro.message.length < 200, 'a mensagem não pode carregar o pedaço inteiro');
  assert.ok(!/Infinity/.test(erro.message));
});

test('quem cola "10: 25" no modo de notas recebe a indicação da contagem por nota', () => {
  const erro = recusaDe(() => lerNotas('10: 25'));
  assert.match(erro.message, /escolha "Contagem por nota"/);
});

test('letras acentuadas e símbolos não quebram a leitura nem entram sem controle na mensagem', () => {
  const erro = recusaDe(() => lerNotas('nóta <b>9</b>'));
  assert.equal(erro.código, 'nota_invalida');
  assert.equal(erro.extras.posição, 1);
});

/* ------------------------------------------------------------- limites */

test('mil notas passam e mil e uma não', () => {
  const mil = Array.from({ length: MÁXIMO_DE_NOTAS }, (_, i) => i % 11).join(',');
  assert.equal(npsDeNotas(mil).total, MÁXIMO_DE_NOTAS);

  const erro = recusaDe(() => lerNotas(`${mil},5`));
  assert.equal(erro.código, 'notas_demais');
  assert.deepEqual(erro.extras, { total: MÁXIMO_DE_NOTAS + 1, limite: MÁXIMO_DE_NOTAS });
  assert.match(erro.message, /use a contagem por nota/);
});

test('texto no limite de caracteres passa e um acima é recusado antes de dividir', () => {
  const noLimite = `9${' '.repeat(MÁXIMO_DE_CARACTERES - 1)}`;
  assert.deepEqual(lerNotas(noLimite), [9]);

  const erro = recusaDe(() => lerNotas(`${noLimite} `));
  assert.equal(erro.código, 'texto_longo');
});

test('entrada hostil de 1 MB é recusada depressa, sem travar', () => {
  const inícioDoTeste = performance.now();
  for (const forma of ['notas', 'pares', 'onze']) {
    const erro = recusaDe(() => lerRespostas('9,'.repeat(500000), forma));
    assert.equal(erro.código, 'texto_longo');
  }
  assert.ok(performance.now() - inícioDoTeste < 1000);
});

test('texto que não é string é recusado como lista vazia', () => {
  assert.equal(recusaDe(() => lerNotas(undefined)).código, 'lista_vazia');
  assert.equal(recusaDe(() => lerNotas(null)).código, 'lista_vazia');
});

test('forma desconhecida é erro de programação, não de entrada', () => {
  assert.throws(() => lerRespostas('9', 'xyz'), RangeError);
});

/* ---------------------------------------------------- contagem por nota */

test('contagem por nota: uma linha por nota, com vários separadores', () => {
  const lida = lerContagensPorNota('10: 25\n9 = 18\n8;12\n7\t9\n6, 4\n3 2');
  assert.deepEqual(lida, contagem({ 10: 25, 9: 18, 8: 12, 7: 9, 6: 4, 3: 2 }));
});

test('contagem por nota: pula o cabeçalho, aceita milhar com ponto e notas ausentes valem zero', () => {
  const lida = lerContagensPorNota('Nota\tRespostas\n10\t1.250\n0\t3');
  assert.deepEqual(lida, contagem({ 10: 1250, 0: 3 }));
});

test('contagem por nota dá o mesmo resultado que as notas uma a uma', () => {
  const pares = calcularNps(lerRespostas('10: 3\n9: 2\n8: 2\n7: 1\n6: 1\n3: 1', 'pares'));
  const notas = npsDeNotas('9,10,8,6,10,7,9,3,10,8');
  assert.deepEqual(pares, notas);
});

test('contagem por nota: erros apontam a linha', () => {
  const casos = [
    ['10: 25\n9', 'contagem_invalida', 2, /Linha 2/],
    ['10: 25\n11: 3', 'nota_invalida', 2, /nota "11" é inválida/],
    ['10: 25\nabc: 3', 'nota_invalida', 2, /"abc"/],
    ['10: 25\n9.5: 3', 'nota_invalida', 2, /nota "9\.5" é inválida/],
    ['10: 25\n10: 3', 'nota_repetida', 2, /nota 10 já apareceu/],
    ['10: x', 'contagem_invalida', 1, /não é uma quantidade/],
    ['10: -3', 'contagem_invalida', 1, /não é uma quantidade/],
    ['10: 2,5', 'contagem_invalida', 1, /Linha 1/],
    ['10: 1e3', 'contagem_invalida', 1, /não é uma quantidade/],
    [`10: ${MÁXIMO_POR_NOTA + 1}`, 'contagem_grande', 1, /passa do limite/],
  ];
  for (const [entrada, código, posição, mensagem] of casos) {
    const erro = recusaDe(() => lerContagensPorNota(entrada));
    assert.equal(erro.código, código, entrada);
    assert.equal(erro.extras.posição, posição, entrada);
    assert.match(erro.message, mensagem, entrada);
    assert.equal(erro.campo, 'notas');
  }
});

test('contagem por nota: limite por nota passa; todas zeradas é lista vazia', () => {
  assert.equal(lerContagensPorNota(`10: ${MÁXIMO_POR_NOTA}`)[10], MÁXIMO_POR_NOTA);
  const erro = recusaDe(() => lerRespostas('10: 0\n9: 0', 'pares'));
  assert.equal(erro.código, 'lista_vazia');
  assert.equal(recusaDe(() => lerRespostas('Nota\tRespostas', 'pares')).código, 'lista_vazia');
});

test('somas no limite de todas as notas continuam exatas', () => {
  const tudo = Array.from({ length: 11 }, (_, nota) => `${nota}: ${MÁXIMO_POR_NOTA}`).join('\n');
  const r = calcularNps(lerRespostas(tudo, 'pares'));
  assert.equal(r.total, 11 * MÁXIMO_POR_NOTA);
  assert.equal(r.promotores, 2 * MÁXIMO_POR_NOTA);
  assert.equal(r.detratores, 7 * MÁXIMO_POR_NOTA);
  // (2 − 7) ÷ 11 × 100 = −45,45…
  assert.equal(r.nps, -45);
});

test('onze quantidades, da nota 0 à 10', () => {
  const r = calcularNps(lerRespostas('0 0 0 1 0 0 1 1 2 2 3', 'onze'));
  assert.equal(r.nps, 30);
  assert.equal(r.total, 10);

  const colunaDePlanilha = lerOnzeQuantidades('0\n0\n0\n1\n0\n0\n1\n1\n2\n2\n3');
  assert.deepEqual(colunaDePlanilha, contagem({ 3: 1, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3 }));
});

test('onze quantidades: contagem errada e valor inválido são recusados', () => {
  const poucas = recusaDe(() => lerOnzeQuantidades('1 2 3'));
  assert.equal(poucas.código, 'contagem_invalida');
  assert.match(poucas.message, /3 quantidades, e são esperadas 11/);
  assert.equal(recusaDe(() => lerOnzeQuantidades('1 2 3 4 5 6 7 8 9 10 11 12')).código, 'contagem_invalida');
  const inválida = recusaDe(() => lerOnzeQuantidades('1 2 3 4 5 6 7 x 9 10 11'));
  assert.match(inválida.message, /Nota 7: "x"/);
  assert.equal(recusaDe(() => lerRespostas('0 0 0 0 0 0 0 0 0 0 0', 'onze')).código, 'lista_vazia');
});

/* -------------------------------------------------------------- a conta */

test('o NPS vai de -100 a 100', () => {
  assert.equal(calcularNps(contagem({ 0: 4 })).nps, -100);
  assert.equal(calcularNps(contagem({ 6: 7 })).nps, -100);
  assert.equal(calcularNps(contagem({ 10: 4 })).nps, 100);
  assert.equal(calcularNps(contagem({ 7: 5, 8: 5 })).nps, 0);
});

test('neutros não entram na diferença, mas puxam o NPS para zero', () => {
  // 5 promotores e 0 detratores: 100 sem neutros; 50 com 5 neutros (5 ÷ 10).
  assert.equal(calcularNps(contagem({ 9: 5 })).nps, 100);
  assert.equal(calcularNps(contagem({ 9: 5, 7: 5 })).nps, 50);
});

test('arredondamento: 37,5 vira 38 e -37,5 vira -38 (meio vai para longe do zero)', () => {
  // 3 promotores, 0 detratores, 5 neutros → 3 ÷ 8 × 100 = 37,5.
  const meio = calcularNps(contagem({ 10: 3, 8: 5 }));
  assert.equal(meio.npsExato, 37.5);
  assert.equal(meio.nps, 38);
  // 0 promotores, 3 detratores, 5 neutros → −37,5.
  const negativoMeio = calcularNps(contagem({ 2: 3, 8: 5 }));
  assert.equal(negativoMeio.npsExato, -37.5);
  assert.equal(negativoMeio.nps, -38);
});

test('arredondamento por terços: 1 ÷ 3 × 100 é 33; 2 ÷ 3, 67', () => {
  assert.equal(calcularNps(contagem({ 10: 1, 8: 2 })).nps, 33);
  assert.equal(calcularNps(contagem({ 10: 2, 8: 1 })).nps, 67);
  assert.equal(calcularNps(contagem({ 3: 2, 8: 1 })).nps, -67);
});

test('arredondarQuociente é simétrico e exato', () => {
  assert.equal(arredondarQuociente(0, 7), 0);
  assert.equal(arredondarQuociente(5, 2), 3);
  assert.equal(arredondarQuociente(-5, 2), -3);
  assert.equal(arredondarQuociente(4, 3), 1);
  assert.equal(arredondarQuociente(-4, 3), -1);
  assert.equal(Object.is(arredondarQuociente(-1, 3), -0), false);
});

test('percentuais com uma casa: 1 em 8 vale 12,5 e 1 em 3 vale 33,3', () => {
  const oito = calcularNps(contagem({ 10: 1, 8: 7 }));
  assert.equal(oito.percentuais.promotores, 12.5);
  assert.equal(oito.percentuais.neutros, 87.5);
  const três = calcularNps(contagem({ 10: 1, 8: 1, 3: 1 }));
  assert.deepEqual(três.percentuais, { promotores: 33.3, neutros: 33.3, detratores: 33.3 });
});

test('fronteiras dos grupos: 6 detrata, 7 e 8 neutros, 9 promove', () => {
  assert.equal(grupoDaNota(0), 'detratores');
  assert.equal(grupoDaNota(6), 'detratores');
  assert.equal(grupoDaNota(7), 'neutros');
  assert.equal(grupoDaNota(8), 'neutros');
  assert.equal(grupoDaNota(9), 'promotores');
  assert.equal(grupoDaNota(10), 'promotores');
  const r = npsDeNotas('6 7 8 9');
  assert.deepEqual([r.detratores, r.neutros, r.promotores], [1, 2, 1]);
});

test('zonas nas fronteiras do NPS arredondado', () => {
  const casos = [[-100, 'crítica'], [-1, 'crítica'], [0, 'crítica'], [1, 'aperfeiçoamento'], [49, 'aperfeiçoamento'],
    [50, 'qualidade'], [74, 'qualidade'], [75, 'excelência'], [100, 'excelência']];
  for (const [nps, zona] of casos) assert.equal(zonaDoNps(nps).id, zona, `NPS ${nps}`);
  // 49,6 arredonda para 50: a zona acompanha o número que aparece.
  assert.equal(calcularNps(contagem({ 10: 62, 8: 63 })).nps, 50);
  assert.equal(calcularNps(contagem({ 10: 62, 8: 63 })).zona.id, 'qualidade');
});

test('contagem malformada é erro de programação', () => {
  assert.throws(() => calcularNps([1, 2, 3]), RangeError);
  assert.throws(() => calcularNps(new Array(11).fill(-1)), RangeError);
  assert.throws(() => calcularNps(new Array(11).fill(1.5)), RangeError);
  assert.throws(() => calcularNps(new Array(11).fill(MÁXIMO_POR_NOTA + 1)), RangeError);
  assert.throws(() => calcularNps(null), RangeError);
});

/* ------------------------------------------------------- margem de erro */

test('margem de erro de 95%: fórmula (P + D − (P − D)²) ÷ n', () => {
  // 1.000 respostas: 70% promotores, 10% detratores.
  const r = calcularNps(contagem({ 10: 700, 8: 200, 3: 100 }));
  const variância = (0.7 + 0.1 - (0.7 - 0.1) ** 2) / 1000;
  assert.ok(Math.abs(r.margemDeErro - 1.96 * Math.sqrt(variância) * 100) < 1e-9);
  assert.equal(Math.round(r.margemDeErro * 10) / 10, 4.1);
});

test('abaixo de 30 respostas não há margem; com 30 há', () => {
  assert.equal(calcularNps(contagem({ 10: 15, 8: 10, 3: 4 })).margemDeErro, null); // 29
  const trinta = calcularNps(contagem({ 10: 15, 8: 10, 3: 5 }));
  assert.equal(trinta.total, 30);
  assert.ok(trinta.margemDeErro > 0);
});

test('tudo no mesmo grupo não tem margem calculável, em qualquer tamanho', () => {
  assert.equal(calcularNps(contagem({ 10: 500 })).margemDeErro, null);
  assert.equal(calcularNps(contagem({ 2: 500 })).margemDeErro, null);
  assert.equal(calcularNps(contagem({ 8: 500 })).margemDeErro, null);
});

test('classificação do tamanho da amostra nas fronteiras', () => {
  assert.equal(calcularNps(contagem({ 9: 29 })).amostra, 'muito pequena');
  assert.equal(calcularNps(contagem({ 9: 30 })).amostra, 'pequena');
  assert.equal(calcularNps(contagem({ 9: 99 })).amostra, 'pequena');
  assert.equal(calcularNps(contagem({ 9: 100 })).amostra, 'razoável');
});

test('o peso de uma resposta é 200 ÷ total e bate com uma troca real de grupo', () => {
  const antes = calcularNps(contagem({ 10: 3, 8: 5, 2: 2 })); // total 10
  const depois = calcularNps(contagem({ 10: 4, 8: 5, 2: 1 }));  // um detrator virou promotor
  assert.equal(antes.pesoDeUmaResposta, 20);
  assert.equal(depois.npsExato - antes.npsExato, antes.pesoDeUmaResposta);
});

/* ------------------------------------------------------------ propriedades */

test('propriedade: grupos somam o total, as notas somam o total e o NPS fica entre -100 e 100', () => {
  let semente = 12345;
  const sorteio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  for (let rodada = 0; rodada < 200; rodada += 1) {
    const tamanho = 1 + Math.floor(sorteio() * 400);
    const notas = Array.from({ length: tamanho }, () => Math.floor(sorteio() * 11));
    const r = calcularNps(contarNotas(notas));
    assert.equal(r.promotores + r.neutros + r.detratores, tamanho);
    assert.equal(r.contagens.reduce((a, b) => a + b, 0), tamanho);
    assert.ok(r.nps >= -100 && r.nps <= 100);
    assert.equal(r.nps, arredondarQuociente((r.promotores - r.detratores) * 100, tamanho));
    assert.ok(Math.abs(r.nps - r.npsExato) <= 0.5 + 1e-9);
    const soma = r.percentuais.promotores + r.percentuais.neutros + r.percentuais.detratores;
    assert.ok(Math.abs(soma - 100) <= 0.15 + 1e-9, `percentuais somam ${soma}`);
  }
});

test('propriedade: a ordem das notas não muda o resultado', () => {
  const notas = [9, 10, 8, 6, 10, 7, 9, 3, 10, 8, 0, 5, 9];
  const invertidas = [...notas].reverse();
  const ordenadas = [...notas].sort((a, b) => a - b);
  const base = npsDeNotas(notas.join(','));
  assert.deepEqual(npsDeNotas(invertidas.join(' ')), base);
  assert.deepEqual(npsDeNotas(ordenadas.join('\n')), base);
});

test('propriedade: repetir as respostas não muda o NPS, só a margem', () => {
  const uma = npsDeNotas('9,10,8,6,10,7,9,3,10,8');
  const quatro = npsDeNotas('9,10,8,6,10,7,9,3,10,8,'.repeat(4));
  assert.equal(quatro.nps, uma.nps);
  assert.deepEqual(quatro.percentuais, uma.percentuais);
  assert.equal(quatro.total, 40);
  assert.ok(quatro.margemDeErro > 0);
});

/* ------------------------------------------------------------------ tela */

test('a tela mostra o caso da especificação com a conta feita', () => {
  const saída = calcularNpsNaTela({ notas: '9,10,8,6,10,7,9,3,10,8', forma: 'notas' });
  assert.equal(saída.valor, 'NPS 30');
  assert.match(saída.resumo, /Zona de aperfeiçoamento, com 10 respostas: 50,0% promotores, 30,0% neutros e 20,0% detratores\./);
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Promotores (notas 9 e 10)'], '5 · 50,0%');
  assert.equal(linhas['Neutros (notas 7 e 8)'], '3 · 30,0%');
  assert.equal(linhas['Detratores (notas 0 a 6)'], '2 · 20,0%');
  assert.equal(linhas['Total de respostas'], '10');
  assert.equal(linhas['Margem de erro (95%)'], 'não calculada (menos de 30 respostas)');
  assert.equal(saída.observações[0], 'A conta: NPS = (promotores − detratores) ÷ total × 100 = (5 − 2) ÷ 10 × 100 = 30.');
  assert.equal(saída.tabela.linhas.length, 11);
  assert.deepEqual(saída.tabela.linhas[10], ['10', '3', '30,0%', 'promotores']);
  assert.deepEqual(saída.tabela.linhas[0], ['0', '0', '0,0%', 'detratores']);
});

test('a conta escrita mostra o valor exato antes de arredondar', () => {
  const meio = calcularNpsNaTela({ notas: '10: 3\n8: 5', forma: 'pares' });
  assert.equal(meio.valor, 'NPS 38');
  assert.ok(meio.observações[0].endsWith('(3 − 0) ÷ 8 × 100 = 37,5; arredondando para o inteiro mais próximo, 38.'), meio.observações[0]);

  const terço = calcularNpsNaTela({ notas: '10 8 8' });
  assert.ok(terço.observações[0].endsWith('(1 − 0) ÷ 3 × 100 = 33,33; arredondando para o inteiro mais próximo, 33.'), terço.observações[0]);

  const negativo = calcularNpsNaTela({ notas: '2 2 2 8 8 8 8 8' });
  assert.ok(negativo.observações[0].endsWith('(0 − 3) ÷ 8 × 100 = -37,5; arredondando para o inteiro mais próximo, -38.'), negativo.observações[0]);
  assert.equal(negativo.valor, 'NPS -38');
});

test('a conta escrita não finge que um valor próximo é inteiro', () => {
  // 1 promotor em 100.000 respostas: 1 ÷ 100.000 × 100 = 0,001, que arredonda para 0 mas não é 0.
  const quase = calcularNpsNaTela({ notas: '10: 1\n8: 99999', forma: 'pares' });
  assert.equal(quase.valor, 'NPS 0');
  assert.ok(quase.observações[0].includes('= 0,001; arredondando para o inteiro mais próximo, 0.'), quase.observações[0]);
});

test('os três avisos de amostra aparecem conforme o tamanho', () => {
  const pequena = calcularNpsNaTela({ notas: '9,10,8,6,10,7,9,3,10,8' });
  assert.ok(pequena.observações.some((o) => /^Poucas respostas: com 10 respostas.*em 20 pontos\./.test(o)));

  const um = calcularNpsNaTela({ notas: '10' });
  assert.ok(um.observações.some((o) => /com 1 resposta,.*em 200 pontos/.test(o)));

  const média = calcularNpsNaTela({ notas: '10: 25\n8: 15\n3: 10', forma: 'pares' }); // 50 respostas
  assert.ok(média.observações.some((o) => /^Amostra pequena: com 50 respostas.*± \d+ pontos \(95% de confiança\)/.test(o)), média.observações.join('|'));
  assert.match(Object.fromEntries(média.linhas)['Margem de erro (95%)'], /^± \d+ pontos$/);

  const grande = calcularNpsNaTela({ notas: '10: 700\n8: 200\n3: 100', forma: 'pares' });
  assert.ok(grande.observações.some((o) => /^Com 1\.000 respostas, a margem de erro é de cerca de ± 4,1 pontos/.test(o)));
  assert.equal(Object.fromEntries(grande.linhas)['Margem de erro (95%)'], '± 4,1 pontos');
  assert.ok(!grande.observações.some((o) => /Poucas respostas|Amostra pequena/.test(o)));
});

test('amostra grande toda no mesmo grupo explica por que não há margem', () => {
  const saída = calcularNpsNaTela({ notas: '10: 500', forma: 'pares' });
  assert.equal(saída.valor, 'NPS 100');
  assert.equal(Object.fromEntries(saída.linhas)['Margem de erro (95%)'], 'não calculada (um só grupo)');
  assert.ok(saída.observações.some((o) => /todas caíram no mesmo grupo/.test(o)));
});

test('a forma de leitura vem do formulário; valor desconhecido cai nas notas', () => {
  assert.equal(calcularNpsNaTela({ notas: '10 10 3', forma: 'xyz' }).valor, 'NPS 33');
  assert.equal(calcularNpsNaTela({ notas: '10 10 3' }).valor, 'NPS 33');
  assert.equal(calcularNpsNaTela({ notas: '0 0 0 1 0 0 1 1 2 2 3', forma: 'onze' }).valor, 'NPS 30');
});

test('cada recusa chega ao campo das respostas, com a mensagem certa', () => {
  const casos = [
    [{ notas: '', forma: 'notas' }, /Cole ao menos uma nota de 0 a 10/],
    [{ notas: '   ', forma: 'pares' }, /Cole uma linha por nota/],
    [{ notas: '', forma: 'onze' }, /Cole as onze quantidades/],
    [{ notas: '9,10,15', forma: 'notas' }, /3ª nota, 15, está fora do intervalo/],
    [{ notas: '9 dez', forma: 'notas' }, /"dez", não é um número/],
    [{ notas: '10: 5\n10: 6', forma: 'pares' }, /nota 10 já apareceu/],
    [{ notas: '1 2 3', forma: 'onze' }, /3 quantidades, e são esperadas 11/],
    [{ notas: 'x'.repeat(MÁXIMO_DE_CARACTERES + 1) }, /passou de 100\.000 caracteres/],
  ];
  for (const [dados, mensagem] of casos) {
    const erro = recusaDe(() => calcularNpsNaTela(dados));
    assert.ok(erro instanceof ErroDeEntrada, `${JSON.stringify(dados).slice(0, 60)} deveria virar erro de campo`);
    assert.equal(erro.campo, 'notas');
    assert.match(erro.message, mensagem);
  }
});

test('o texto copiado traz resultado, conta e a distribuição completa', () => {
  const { texto } = calcularNpsNaTela({ notas: '9,10,8,6,10,7,9,3,10,8' });
  const linhas = texto.split('\n');
  assert.equal(linhas[0], 'Calculadora de NPS');
  assert.equal(linhas[1], 'NPS: 30 (Zona de aperfeiçoamento)');
  assert.equal(linhas[2], 'Respostas: 10');
  assert.equal(linhas[3], 'Promotores (notas 9 e 10): 5 (50,0%)');
  assert.ok(texto.includes('A conta: NPS = (promotores − detratores) ÷ total × 100 = (5 − 2) ÷ 10 × 100 = 30.'));
  assert.ok(texto.includes('Nota 3: 1 resposta (10,0%)'));
  assert.ok(texto.includes('Nota 10: 3 respostas (30,0%)'));
  assert.equal(linhas.filter((l) => l.startsWith('Nota ')).length, 11);
});

test('a planilha baixada traz as notas, os grupos e o NPS, com texto e número de verdade', async () => {
  const saída = calcularNpsNaTela({ notas: '9,10,8,6,10,7,9,3,10,8' });
  assert.equal(saída.arquivos.length, 1);
  assert.equal(saída.arquivos[0].rótulo, 'Baixar planilha (XLSX)');
  const arquivo = await arquivoBaixado(saída.arquivos[0].gerar);
  assert.equal(arquivo.nome, 'nps-30-10-respostas.xlsx');
  assert.equal(arquivo.tipo, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  // O .zip do portal guarda o XML sem compressão: dá para ler o conteúdo direto.
  const xml = new TextDecoder('utf-8').decode(arquivo.bytes);
  for (const trecho of ['Nota', 'Respostas', 'Percentual (%)', 'Grupo', 'promotores', 'detratores', 'neutros',
    'Promotores (notas 9 e 10)', 'Total de respostas', 'Zona de aperfeiçoamento', 'não calculada']) {
    assert.ok(xml.includes(`>${trecho}</t>`), `faltou "${trecho}" na planilha`);
  }
  // Nota 10: 3 respostas, 30%.
  assert.ok(xml.includes('<c r="A12" s="4"><v>10</v></c><c r="B12" s="4"><v>3</v></c><c r="C12" s="4"><v>30</v></c>'));
  // NPS 30 na célula B19: cabeçalho, 11 notas, linha em branco, total, 3 grupos, linha em branco.
  assert.ok(xml.includes('<c r="B19" s="4"><v>30</v></c>'));
  assert.ok(xml.includes('<c r="A1" s="5"'), 'o cabeçalho usa o estilo de cabeçalho');
});

test('palavras de terceiro nunca chegam à tela sem passar pela mensagem controlada', () => {
  const erro = recusaDe(() => calcularNpsNaTela({ notas: '<img src=x onerror=alert(1)>' }));
  assert.ok(erro instanceof ErroDeEntrada);
  assert.ok(erro.message.length < 200);
});

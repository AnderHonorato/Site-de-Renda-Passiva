/**
 * Testes de regressão dos defeitos encontrados pelos críticos.
 *
 * Cada teste aqui nasceu de um defeito real e reproduzido. Eles existem para
 * que o mesmo erro não volte sem ninguém perceber.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { montarCsv, neutralizarFórmula } from '../scripts/núcleo/exportar.js';
import { diferençaEntreDatas, idade, lerData, somarDias } from '../scripts/cálculos/tempo.js';
import { parcelamento, divisãoDeContas } from '../scripts/cálculos/dinheiro.js';
import { regraDeTrês } from '../scripts/cálculos/medidas.js';
import { paraNúmero } from '../scripts/núcleo/texto.js';
import { buscar } from '../scripts/núcleo/busca.js';
import { lerOrçamentoDoLink } from '../scripts/ferramentas/auxiliares/orcamento-compartilhado.js';
import { LIMITE_DE_ITENS, LIMITE_DO_LINK } from '../scripts/ferramentas/auxiliares/limites-do-orçamento.js';

/* ------------------------------------------- injeção de fórmula em planilha */

test('CSV exportado não entrega fórmula executável para a planilha', () => {
  const csv = montarCsv([['col'], ['=1+1'], ['@SUM(A1)'], ['=HYPERLINK("http://mau.example","clique")'], ['\tx']]);
  // Nenhuma célula pode começar com caractere que a planilha interpreta.
  for (const linha of csv.replace(/^﻿/, '').split('\r\n').slice(1)) {
    const primeiro = linha.startsWith('"') ? linha[1] : linha[0];
    assert.ok(!'=+-@\t\r'.includes(primeiro), `célula ainda começa com "${primeiro}": ${linha}`);
  }
  assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.includes("'@SUM(A1)"));
});

test('número com sinal continua número, não vira texto', () => {
  // Neutralizar "-1" quebraria toda planilha com valor negativo.
  assert.equal(neutralizarFórmula('-1'), '-1');
  assert.equal(neutralizarFórmula('+1'), '+1');
  assert.equal(neutralizarFórmula('-1,5'), '-1,5');
  assert.equal(neutralizarFórmula('1'), '1');
  // Já "-1+1" é expressão e precisa ser neutralizada.
  assert.equal(neutralizarFórmula('-1+1'), "'-1+1");
});

/* ------------------------------------------------ decomposição de datas */

test('diferença de datas nunca devolve dia negativo na decomposição', () => {
  // 31/01 → 01/03: o ajuste antigo devolvia "1 mês e −2 dias".
  const d = diferençaEntreDatas(lerData('2026-01-31'), lerData('2026-03-01'));
  assert.equal(d.anos, 0);
  assert.equal(d.meses, 1);
  assert.equal(d.restoDeDias, 1);

  // Mesma armadilha com mês de 30 dias.
  const abril = diferençaEntreDatas(lerData('2026-03-31'), lerData('2026-05-01'));
  assert.equal(abril.meses, 1);
  assert.equal(abril.restoDeDias, 1);
});

test('nenhum par de datas produz decomposição inválida', () => {
  // Varre um ano inteiro de combinações e exige decomposição sempre positiva.
  const base = Date.UTC(2024, 0, 1);
  for (let i = 0; i < 366; i += 1) {
    const inicial = new Date(base + i * 86400000);
    for (const salto of [1, 28, 29, 30, 31, 59, 365, 366, 730]) {
      const final = new Date(inicial.getTime() + salto * 86400000);
      const d = diferençaEntreDatas(inicial, final);
      assert.ok(d.anos >= 0 && d.meses >= 0 && d.restoDeDias >= 0,
        `decomposição negativa em ${inicial.toISOString()} + ${salto}d: ${JSON.stringify(d)}`);
      assert.ok(d.meses < 12, `meses fora da faixa: ${d.meses}`);
      assert.ok(d.restoDeDias < 31, `resto de dias fora da faixa: ${d.restoDeDias}`);
    }
  }
});

test('idade de quem nasceu em dia 31 não mostra dia negativo', () => {
  const r = idade(lerData('1990-01-31'), lerData('2026-03-01'));
  assert.equal(r.anos, 36);
  assert.equal(r.meses, 1);
  assert.equal(r.dias, 1);
  assert.ok(r.dias >= 0);
});

test('datas invertidas informam o sentido em vez de esconder o sinal', () => {
  const d = diferençaEntreDatas(lerData('2026-03-01'), lerData('2026-01-31'));
  assert.equal(d.invertido, true);
  assert.equal(d.dias, -29);
  // A decomposição continua sendo grandeza positiva.
  assert.equal(d.meses, 1);
  assert.equal(d.restoDeDias, 1);
});

test('dias úteis não giram para sempre quando tudo está bloqueado', () => {
  // Uma lista que bloqueia mais dias do que o teto de varredura precisa parar
  // com mensagem, não travar a aba da pessoa.
  const feriados = [];
  for (let i = 0; i < 600; i += 1) {
    feriados.push(new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10));
  }
  assert.throws(() => somarDias(lerData('2026-01-01'), 5, { úteis: true, feriados }), /feriados/);

  // E o caminho normal continua funcionando.
  assert.equal(
    somarDias(lerData('2026-01-01'), 5, { úteis: true, feriados: [] }).toISOString().slice(0, 10),
    '2026-01-08',
  );
});

/* ------------------------------------------------------- parcelamento */

test('parcelamento sem juros fecha exatamente e não inventa juros negativos', () => {
  const r = parcelamento({ valorCentavos: 100000, entradaCentavos: 30000, parcelas: 3, taxa: 0 });
  assert.equal(r.totalCentavos, 100000);
  assert.equal(r.jurosCentavos, 0);
  // A última parcela absorve o centavo que não divide.
  assert.equal(r.parcelaCentavos * 2 + r.últimaParcelaCentavos, 70000);
});

test('juros do parcelamento nunca são negativos, em nenhuma combinação', () => {
  for (const parcelas of [1, 2, 3, 6, 7, 12, 13, 24]) {
    for (const valor of [100, 999, 100000, 123457]) {
      for (const taxa of [0, 0.5, 1, 2.99]) {
        const r = parcelamento({ valorCentavos: valor, parcelas, taxa });
        assert.ok(r.jurosCentavos >= 0,
          `juros negativos em ${valor} em ${parcelas}x a ${taxa}%: ${r.jurosCentavos}`);
        if (taxa === 0) {
          assert.equal(r.totalCentavos, valor, `total não fecha sem juros: ${valor} em ${parcelas}x`);
        }
      }
    }
  }
});

/* ----------------------------------------------- entradas mal formadas */

test('regra de três inversa recusa divisor zero', () => {
  assert.throws(() => regraDeTrês(2, 10, 0, { inversa: true }), /não pode ser zero/);
  // A direta continua recusando o primeiro valor zero.
  assert.throws(() => regraDeTrês(0, 10, 2), /não pode ser zero/);
});

test('divisão de contas recusa peso inválido', () => {
  const participantes = [{ nome: 'A', pagouCentavos: 100 }, { nome: 'B', pagouCentavos: 0 }];
  assert.throws(() => divisãoDeContas([{ ...participantes[0], peso: NaN }, participantes[1]]), /Peso inválido/);
  assert.throws(() => divisãoDeContas([{ ...participantes[0], peso: -1 }, participantes[1]]), /Peso inválido/);
  assert.throws(() => divisãoDeContas([{ ...participantes[0], peso: 0 }, participantes[1]]), /Peso inválido/);
});

test('paraNúmero não aceita notação que ninguém digita num campo de preço', () => {
  assert.ok(Number.isNaN(paraNúmero('0x10')));
  assert.ok(Number.isNaN(paraNúmero('0b11')));
  assert.ok(Number.isNaN(paraNúmero('1e5')));
  assert.ok(Number.isNaN(paraNúmero('Infinity')));
  // E continua entendendo o que a pessoa escreve de verdade.
  assert.equal(paraNúmero('1.234,56'), 1234.56);
  assert.equal(paraNúmero('R$ 80,00'), 80);
  assert.equal(paraNúmero('-1,5'), -1.5);
});

/* ----------------------------------------- link do orçamento compartilhado */

/** Codifica um orçamento no mesmo formato que a ferramenta gera. */
function codificar(dados) {
  const bytes = new TextEncoder().encode(JSON.stringify(dados));
  let binário = '';
  for (const byte of bytes) binário += String.fromCharCode(byte);
  return btoa(binário).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const ORÇAMENTO_VÁLIDO = {
  v: 1, e: 'Ateliê', c: 'Maria', n: 7,
  i: [['Bolo', 2, 8500], ['Docinhos', 100, 180]],
  d: 10, t: 31500, em: '19/09/2026', va: '26/09/2026',
};

test('link válido é lido e o total bate com os itens', () => {
  const r = lerOrçamentoDoLink(codificar(ORÇAMENTO_VÁLIDO));
  assert.equal(r.totalCentavos, 31500);
  assert.equal(r.itens.length, 2);
});

test('link com total adulterado é recusado', () => {
  // Quem recebe o link não pode ver um total que não corresponde aos itens.
  assert.throws(
    () => lerOrçamentoDoLink(codificar({ ...ORÇAMENTO_VÁLIDO, t: 1 })),
    /não confere com a soma dos itens/,
  );
  assert.throws(
    () => lerOrçamentoDoLink(codificar({ ...ORÇAMENTO_VÁLIDO, d: 90 })),
    /não confere com a soma dos itens/,
  );
});

test('link malformado, truncado ou de outra versão é recusado', () => {
  assert.throws(() => lerOrçamentoDoLink(codificar(ORÇAMENTO_VÁLIDO).slice(0, -6)), /incompleto ou foi alterado/);
  assert.throws(() => lerOrçamentoDoLink('naoehbase64!!!'), /incompleto ou foi alterado/);
  assert.throws(() => lerOrçamentoDoLink(codificar({ ...ORÇAMENTO_VÁLIDO, v: 2 })), /não é de um orçamento/);
  assert.throws(() => lerOrçamentoDoLink(codificar({ ...ORÇAMENTO_VÁLIDO, i: [] })), /lista de itens/);
  assert.throws(() => lerOrçamentoDoLink(codificar({ ...ORÇAMENTO_VÁLIDO, i: [['x', 'muito', 100]] })), /valores inválidos/);
});

test('o limite de itens cabe no limite do link', () => {
  // Um orçamento cheio precisa gerar um link que a própria ferramenta aceite.
  const cheio = {
    v: 1, e: 'Ateliê com nome razoavelmente longo', c: 'Cliente com nome razoavelmente longo', n: 999,
    i: Array.from({ length: LIMITE_DE_ITENS }, (_, i) => [`Item de descrição média número ${i + 1}`, 10, 12345]),
    d: 0, em: '19/09/2026', va: '26/09/2026',
  };
  cheio.t = cheio.i.reduce((s, [, q, u]) => s + Math.round(u * q), 0);
  const codificado = codificar(cheio);
  // O link completo tem endereço na frente; sobra folga suficiente.
  assert.ok(codificado.length < LIMITE_DO_LINK - 200,
    `link de ${LIMITE_DE_ITENS} itens tem ${codificado.length} caracteres e o limite é ${LIMITE_DO_LINK}`);
  assert.equal(lerOrçamentoDoLink(codificado).itens.length, LIMITE_DE_ITENS);
});

/* ----------------------------------------- qualidade da busca (crítico UX) */

test('a busca devolve poucos resultados relevantes, não dezenas', async () => {
  const { ferramentas } = await import('../dados/catálogo.js');
  // Números medidos pelo crítico antes da correção, à direita.
  const limites = [
    ['rachar conta', 3, 'divisao-de-contas'],      // eram 22, com QR Code em 2º
    ['senha forte', 3, 'gerador-de-senhas'],        // eram 10, com CPF em 3º
    ['quantos dias faltam', 3, 'calculadora-de-datas'], // eram 7, com tinta entre os 5
    ['tirar duplicado da planilha', 4, 'limpar-planilha'], // eram 22
    ['quanto cobrar', 6, 'preco-de-venda'],         // eram 41
  ];
  for (const [consulta, máximo, esperado] of limites) {
    const achados = buscar(ferramentas, consulta);
    assert.ok(achados.length <= máximo,
      `"${consulta}" devolveu ${achados.length} resultados (máximo ${máximo}): ${achados.map((f) => f.nome).join(', ')}`);
    assert.ok(achados.some((f) => f.slug === esperado),
      `"${consulta}" deveria conter ${esperado}`);
  }
});

test('a busca tolera um erro de digitação', async () => {
  const { ferramentas } = await import('../dados/catálogo.js');
  for (const [errada, esperado] of [
    ['porcentagen', 'porcentagem'],
    ['orcamentos', 'orcamento'],
    ['divdir conta', 'divisao-de-contas'],
  ]) {
    const achados = buscar(ferramentas, errada, { limite: 5 });
    assert.ok(achados.some((f) => f.slug === esperado),
      `"${errada}" deveria achar ${esperado}, achou ${achados.map((f) => f.slug).join(', ') || 'nada'}`);
  }
});

test('palavra parecida não arrasta ferramenta sem relação', async () => {
  const { ferramentas } = await import('../dados/catálogo.js');
  // "conta" não pode casar com "Contador de texto" nem com "contato".
  const achados = buscar(ferramentas, 'rachar conta').map((f) => f.slug);
  assert.ok(!achados.includes('contador-de-texto'), 'Contador de texto entrou numa busca por conta');
  assert.ok(!achados.includes('qr-code'), 'QR Code entrou numa busca por conta');
});

test('consultas do público de confeitaria encontram as ferramentas de preço', async () => {
  const { ferramentas } = await import('../dados/catálogo.js');
  const achados = buscar(ferramentas, 'bolo', { limite: 5 }).map((f) => f.slug);
  assert.ok(achados.includes('preco-de-venda'), `"bolo" não achou preço de venda: ${achados.join(', ')}`);
});

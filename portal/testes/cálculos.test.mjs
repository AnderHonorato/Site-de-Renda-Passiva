/** Testes dos cálculos puros do portal. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  emCentavos, emReais, porcentagem, preçoDeVenda, juros,
  parcelamento, divisãoDeContas, preçoPorUnidade,
} from '../scripts/cálculos/dinheiro.js';
import { inteiroPorExtenso, reaisPorExtenso } from '../scripts/cálculos/por-extenso.js';
import {
  lerData, formatarData, diaDaSemana, diferençaEntreDatas,
  somarDias, diasÚteisEntre, idade, lerHora, formatarMinutos, jornadaDoDia,
} from '../scripts/cálculos/tempo.js';
import { validarCpf, validarCnpj, validarDocumento } from '../scripts/cálculos/documentos-br.js';
import { converter, regraDeTrês } from '../scripts/cálculos/medidas.js';
import { lerCsv, detectarSeparador, limparTabela, paraObjetos, deObjetos } from '../scripts/cálculos/tabular.js';
import { gerarSenha, entropiaDaSenha, sortear, dividirEmTimes, embaralhar, inteiroAleatório } from '../scripts/cálculos/aleatório.js';
import { paraNúmero, achatar, termos } from '../scripts/núcleo/texto.js';

/* ------------------------------------------------------------ dinheiro */

test('centavos e reais não se misturam', () => {
  assert.equal(emCentavos(80), 8000);
  assert.equal(emCentavos(0.1 + 0.2), 30); // evita 0.30000000000000004
  assert.equal(emReais(8000), 80);
  assert.throws(() => emReais(80.5), /inteiros/);
});

test('porcentagem cobre as cinco operações', () => {
  assert.equal(porcentagem('de', 15, 200).valor, 30);
  assert.equal(porcentagem('proporção', 80, 100).valor, 80);
  assert.equal(porcentagem('aumento', 100, 50).valor, 150);
  assert.equal(porcentagem('desconto', 249.9, 15).valor.toFixed(2), '212.42');
  assert.equal(porcentagem('variação', 80, 100).valor, 25);
  assert.equal(porcentagem('variação', 100, 80).valor, -20);
  assert.throws(() => porcentagem('variação', 0, 10), /zero/);
  assert.throws(() => porcentagem('proporção', 10, 0), /zero/);
});

test('preço de venda aplica margem sobre a receita, não sobre o custo', () => {
  const r = preçoDeVenda({ custoCentavos: 8000, margem: 30, unidades: 50 });
  assert.equal(r.preçoCentavos, 11429); // 80 / 0,7 = 114,2857 → arredonda para cima
  assert.equal(r.porUnidadeCentavos, 229);
  // A margem realizada precisa bater com a pedida.
  assert.ok(Math.abs((r.lucroCentavos / r.preçoCentavos) * 100 - 30) < 0.02);
  // Markup é maior que a margem: é a confusão que a ferramenta previne.
  assert.ok(r.markup > 30);
});

test('preço de venda soma taxas e imposto e recusa o impossível', () => {
  const r = preçoDeVenda({ custoCentavos: 8000, margem: 30, taxas: 4 });
  assert.equal(r.preçoCentavos, 12122);
  assert.throws(() => preçoDeVenda({ custoCentavos: 1000, margem: 70, taxas: 20, imposto: 15 }), /100%/);
});

test('juros compostos rendem sobre o saldo e simples sobre o principal', () => {
  const compostos = juros({ principalCentavos: 100000, taxa: 1, períodos: 12 });
  assert.equal(compostos.montanteCentavos, 112684); // arredondamento em centavos a cada período
  const simples = juros({ principalCentavos: 100000, taxa: 1, períodos: 12, composto: false });
  assert.equal(simples.montanteCentavos, 112000);
  assert.ok(compostos.montanteCentavos > simples.montanteCentavos);
});

test('juros com aporte somam os depósitos ao montante', () => {
  const r = juros({ principalCentavos: 100000, taxa: 1, períodos: 12, aporteCentavos: 10000 });
  assert.equal(r.aportadoCentavos, 120000);
  assert.equal(r.evolução.length, 12);
  assert.equal(r.montanteCentavos - r.aportadoCentavos - 100000, r.jurosCentavos);
});

test('parcelamento pela Tabela Price e sem juros', () => {
  const comJuros = parcelamento({ valorCentavos: 300000, parcelas: 10, taxa: 2 });
  assert.equal(comJuros.parcelaCentavos, 33398);
  const semJuros = parcelamento({ valorCentavos: 300000, parcelas: 10, taxa: 0 });
  assert.equal(semJuros.parcelaCentavos, 30000);
  assert.equal(semJuros.jurosCentavos, 0);
  assert.throws(() => parcelamento({ valorCentavos: 1000, entradaCentavos: 1000, parcelas: 2, taxa: 1 }), /entrada/);
});

test('divisão de contas fecha exatamente e reduz os acertos', () => {
  const r = divisãoDeContas([
    { nome: 'Ana', pagouCentavos: 30000 },
    { nome: 'Bruno', pagouCentavos: 9000 },
    { nome: 'Carla', pagouCentavos: 0 },
  ]);
  assert.equal(r.totalCentavos, 39000);
  // A soma do que cada um deveria pagar é sempre o total, sem centavo perdido.
  assert.equal(r.saldos.reduce((s, x) => s + x.deveriaPagarCentavos, 0), 39000);
  // A soma dos saldos é sempre zero.
  assert.equal(r.saldos.reduce((s, x) => s + x.saldoCentavos, 0), 0);
  assert.equal(r.acertos.length, 2);
  assert.equal(r.acertos.reduce((s, a) => s + a.valorCentavos, 0), 17000);
});

test('divisão de contas com peso e com centavo quebrado', () => {
  const r = divisãoDeContas([
    { nome: 'Ana', pagouCentavos: 10000, peso: 2 },
    { nome: 'Bruno', pagouCentavos: 0, peso: 1 },
    { nome: 'Carla', pagouCentavos: 0, peso: 1 },
  ]);
  assert.equal(r.saldos.reduce((s, x) => s + x.deveriaPagarCentavos, 0), 10000);
  assert.equal(r.saldos[0].deveriaPagarCentavos, 5000);
  // 10000 / 4 * 1 = 2500 para cada um dos outros dois.
  assert.equal(r.saldos[1].deveriaPagarCentavos, 2500);
  assert.throws(() => divisãoDeContas([{ nome: 'Só eu', pagouCentavos: 100 }]), /duas pessoas/);
});

test('preço por unidade escolhe a embalagem mais barata', () => {
  const r = preçoPorUnidade([
    { nome: '500 g', preçoCentavos: 1290, quantidade: 500, fator: 1 / 100 },
    { nome: '1 kg', preçoCentavos: 2250, quantidade: 1, fator: 1000 / 100 },
  ]);
  assert.equal(r.melhor, '1 kg');
  assert.equal(r.ordenadas[0].porBaseCentavos, 225);
  assert.equal(r.ordenadas[1].porBaseCentavos, 258);
  assert.ok(Math.abs(r.ordenadas[1].economia - 12.79) < 0.1);
});

/* ---------------------------------------------------------- por extenso */

test('inteiro por extenso segue a norma do português', () => {
  assert.equal(inteiroPorExtenso(0), 'zero');
  assert.equal(inteiroPorExtenso(16), 'dezesseis');
  assert.equal(inteiroPorExtenso(100), 'cem');
  assert.equal(inteiroPorExtenso(101), 'cento e um');
  assert.equal(inteiroPorExtenso(1000), 'mil');
  assert.equal(inteiroPorExtenso(2000), 'dois mil');
  assert.equal(inteiroPorExtenso(1234), 'mil, duzentos e trinta e quatro');
  assert.equal(inteiroPorExtenso(1000000), 'um milhão');
  assert.equal(inteiroPorExtenso(2000000), 'dois milhões');
});

test('reais por extenso trata singular, plural e centavos', () => {
  assert.equal(reaisPorExtenso(100), 'um real');
  assert.equal(reaisPorExtenso(200), 'dois reais');
  assert.equal(reaisPorExtenso(1), 'um centavo');
  assert.equal(reaisPorExtenso(123456), 'mil, duzentos e trinta e quatro reais e cinquenta e seis centavos');
  assert.equal(reaisPorExtenso(0), 'zero real');
});

/* ----------------------------------------------------------- data e hora */

test('data civil não depende de fuso nem de horário de verão', () => {
  const data = lerData('2026-10-01');
  assert.equal(formatarData(data), '01/10/2026');
  assert.equal(diaDaSemana(data), 'quinta-feira');
  assert.throws(() => lerData('2026-02-30'), /não existe/);
  assert.throws(() => lerData('01/10/2026'), /formato/);
});

test('diferença entre datas em dias, meses e anos', () => {
  const d = diferençaEntreDatas(lerData('2026-01-31'), lerData('2026-03-01'));
  assert.equal(d.dias, 29);
  assert.equal(d.anos, 0);
  assert.equal(d.meses, 1);
  const ano = diferençaEntreDatas(lerData('2024-02-29'), lerData('2025-02-28'));
  assert.equal(ano.dias, 365);
});

test('somar dias úteis pula fim de semana e feriado', () => {
  // 01/10/2026 é quinta. Dois dias úteis levam a segunda, 05/10.
  assert.equal(formatarData(somarDias(lerData('2026-10-01'), 2, { úteis: true })), '05/10/2026');
  // Com 05/10 como feriado, vai para terça 06/10.
  assert.equal(
    formatarData(somarDias(lerData('2026-10-01'), 2, { úteis: true, feriados: ['2026-10-05'] })),
    '06/10/2026',
  );
  assert.equal(formatarData(somarDias(lerData('2026-10-01'), -1)), '30/09/2026');
});

test('contagem de dias úteis entre datas', () => {
  // De quinta 01/10 a quinta 08/10: 5 dias úteis.
  assert.equal(diasÚteisEntre(lerData('2026-10-01'), lerData('2026-10-08')), 5);
  assert.equal(diasÚteisEntre(lerData('2026-10-08'), lerData('2026-10-01')), -5);
});

test('idade completa em anos, meses e dias', () => {
  const r = idade(lerData('1990-05-20'), lerData('2026-09-19'));
  assert.equal(r.anos, 36);
  assert.equal(r.meses, 3);
  assert.equal(r.dias, 30);
  assert.throws(() => idade(lerData('2030-01-01'), lerData('2026-01-01')), /posterior/);
});

test('jornada do dia desconta intervalo e entende turno da noite', () => {
  assert.equal(jornadaDoDia({ entrada: '08:00', saída: '18:00', intervaloMinutos: 60 }), 540);
  assert.equal(formatarMinutos(540), '9h00');
  assert.equal(jornadaDoDia({ entrada: '22:00', saída: '06:00' }), 480);
  assert.equal(formatarMinutos(-90), '−1h30');
  assert.throws(() => jornadaDoDia({ entrada: '08:00', saída: '09:00', intervaloMinutos: 120 }), /intervalo/);
  assert.equal(lerHora('8:30'), 510);
  assert.throws(() => lerHora('25:70'), /intervalo/);
});

/* ----------------------------------------------------------- documentos */

test('CPF válido, inválido e sequência repetida', () => {
  assert.equal(validarCpf('111.444.777-35').válido, true);
  assert.equal(validarCpf('11144477735').válido, true);
  assert.equal(validarCpf('111.444.777-36').válido, false);
  assert.equal(validarCpf('111.111.111-11').válido, false);
  assert.equal(validarCpf('123').válido, false);
  assert.equal(validarCpf('11144477735').formatado, '111.444.777-35');
});

test('CNPJ válido e inválido', () => {
  assert.equal(validarCnpj('11.222.333/0001-81').válido, true);
  assert.equal(validarCnpj('11.222.333/0001-82').válido, false);
  assert.equal(validarCnpj('00.000.000/0000-00').válido, false);
});

test('validador identifica o tipo pelo tamanho', () => {
  assert.equal(validarDocumento('11144477735').tipo, 'CPF');
  assert.equal(validarDocumento('11222333000181').tipo, 'CNPJ');
  assert.equal(validarDocumento('123456').tipo, 'indefinido');
});

/* -------------------------------------------------------------- medidas */

test('conversão de unidades ida e volta', () => {
  assert.equal(converter(1, 'massa', 'kg', 'g'), 1000);
  assert.ok(Math.abs(converter(2.5, 'massa', 'kg', 'lb') - 5.5115566) < 1e-6);
  assert.ok(Math.abs(converter(1, 'comprimento', 'pol', 'cm') - 2.54) < 1e-9);
  assert.equal(converter(1000, 'dados', 'B', 'KB'), 1);
  assert.equal(converter(1024, 'dados', 'B', 'KiB'), 1);
});

test('temperatura usa deslocamento, não fator', () => {
  assert.equal(converter(0, 'temperatura', 'C', 'F'), 32);
  assert.equal(converter(100, 'temperatura', 'C', 'F'), 212);
  assert.equal(converter(-40, 'temperatura', 'C', 'F'), -40);
  assert.ok(Math.abs(converter(0, 'temperatura', 'C', 'K') - 273.15) < 1e-9);
  assert.throws(() => converter(-300, 'temperatura', 'C', 'F'), /zero absoluto/);
});

test('regra de três direta e inversa', () => {
  assert.equal(regraDeTrês(3, 7.5, 8).x, 20);
  assert.equal(regraDeTrês(3, 10, 6, { inversa: true }).x, 5);
  assert.throws(() => regraDeTrês(0, 1, 2), /zero/);
});

/* -------------------------------------------------------------- tabular */

test('CSV respeita aspas, separador e quebra dentro da célula', () => {
  const csv = 'nome;obs\n"Silva; Ana";"linha 1\nlinha 2"\nBruno;ok';
  assert.equal(detectarSeparador(csv), ';');
  const tabela = lerCsv(csv);
  assert.equal(tabela.length, 3);
  assert.equal(tabela[1][0], 'Silva; Ana');
  assert.equal(tabela[1][1], 'linha 1\nlinha 2');
  assert.deepEqual(lerCsv('a,b\n1,2')[1], ['1', '2']);
  assert.deepEqual(lerCsv('x\ty\n1\t2')[0], ['x', 'y']);
});

test('aspas duplicadas dentro da célula viram uma aspa', () => {
  assert.equal(lerCsv('a\n"diz ""oi"""')[1][0], 'diz "oi"');
});

test('limpeza remove duplicadas e vazias e conta o que saiu', () => {
  const tabela = lerCsv('nome;email\nAna ;a@x.com\nAna;a@x.com\n;\nBruno;b@x.com');
  const r = limparTabela(tabela);
  assert.equal(r.cabeçalho[0], 'nome');
  assert.equal(r.linhas.length, 2);
  assert.equal(r.removidas.duplicadas, 1);
  assert.equal(r.removidas.vazias, 1);
});

test('padronização de caixa', () => {
  const r = limparTabela(lerCsv('n\nana MARIA'), { caixa: 'primeira' });
  assert.equal(r.linhas[0][0], 'Ana maria');
});

test('conversão entre tabela e objetos, sem poluir o protótipo', () => {
  const objetos = paraObjetos(['nome', '__proto__'], [['Ana', 'perigoso']]);
  assert.equal(objetos[0].nome, 'Ana');
  assert.equal(Object.keys(objetos[0]).includes('__proto__'), false);
  assert.equal({}.perigoso, undefined);

  const { cabeçalho, linhas } = deObjetos([{ a: 1 }, { b: 2 }]);
  assert.deepEqual(cabeçalho, ['a', 'b']);
  assert.deepEqual(linhas, [['1', ''], ['', '2']]);
  assert.throws(() => deObjetos([]), /pelo menos um item/);
});

/* ------------------------------------------------------------ aleatório */

test('senha respeita tamanho e contém todos os conjuntos pedidos', () => {
  const conjuntos = ['minúsculas', 'maiúsculas', 'números', 'símbolos'];
  for (let i = 0; i < 30; i += 1) {
    const senha = gerarSenha({ tamanho: 20, conjuntos });
    assert.equal(senha.length, 20);
    assert.match(senha, /[a-z]/);
    assert.match(senha, /[A-Z]/);
    assert.match(senha, /[0-9]/);
    assert.match(senha, /[!@#$%&*+\-=?]/);
    // Caracteres ambíguos ficam de fora, para não errar ao ditar.
    assert.doesNotMatch(senha, /[lIO01]/);
  }
  assert.throws(() => gerarSenha({ tamanho: 3, conjuntos }), /entre 4 e 128/);
  assert.throws(() => gerarSenha({ tamanho: 20, conjuntos: [] }), /pelo menos um tipo/);
});

test('entropia cresce com tamanho e variedade', () => {
  const curta = entropiaDaSenha(8, ['números']);
  const longa = entropiaDaSenha(20, ['minúsculas', 'maiúsculas', 'números', 'símbolos']);
  assert.ok(longa.bits > curta.bits);
  assert.equal(longa.bits, 122);
  assert.equal(longa.classificação, 'forte');
  assert.equal(curta.classificação, 'fraca');
});

test('sorteio sem repetição não repete e respeita o limite', () => {
  const itens = ['a', 'b', 'c', 'd', 'e'];
  const r = sortear(itens, { quantidade: 3 });
  assert.equal(r.length, 3);
  assert.equal(new Set(r).size, 3);
  assert.throws(() => sortear(itens, { quantidade: 9 }), /só existem 5/);
  assert.equal(sortear(itens, { quantidade: 9, repetir: true }).length, 9);
});

test('divisão em times é equilibrada e não perde ninguém', () => {
  const pessoas = Array.from({ length: 11 }, (_, i) => `P${i + 1}`);
  const times = dividirEmTimes(pessoas, 3);
  assert.equal(times.length, 3);
  assert.equal(times.flat().length, 11);
  assert.equal(new Set(times.flat()).size, 11);
  assert.ok(Math.max(...times.map((t) => t.length)) - Math.min(...times.map((t) => t.length)) <= 1);
  assert.throws(() => dividirEmTimes(pessoas, 1), /pelo menos dois/);
});

test('embaralhar preserva todos os elementos', () => {
  const original = Array.from({ length: 50 }, (_, i) => i);
  const misturado = embaralhar(original);
  assert.deepEqual([...misturado].sort((a, b) => a - b), original);
  assert.deepEqual(original, Array.from({ length: 50 }, (_, i) => i)); // não altera a entrada
});

test('inteiro aleatório fica dentro da faixa', () => {
  for (let i = 0; i < 200; i += 1) {
    const n = inteiroAleatório(7);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 7);
  }
  assert.throws(() => inteiroAleatório(0), /Limite/);
});

/* ---------------------------------------------------------------- texto */

test('números escritos por pessoa são interpretados corretamente', () => {
  assert.equal(paraNúmero('1.234,56'), 1234.56);
  assert.equal(paraNúmero('1234.56'), 1234.56);
  assert.equal(paraNúmero('1,5'), 1.5);
  assert.equal(paraNúmero('1.234'), 1234);
  assert.equal(paraNúmero('R$ 80,00'), 80);
  assert.equal(paraNúmero('15%'), 15);
  assert.ok(Number.isNaN(paraNúmero('abc')));
  assert.ok(Number.isNaN(paraNúmero('')));
});

test('achatar remove acento e caixa; termos descarta partículas', () => {
  assert.equal(achatar('Orçamento ÀS Pressas'), 'orcamento as pressas');
  assert.deepEqual(termos('quanto devo cobrar pela peça'), ['quanto', 'devo', 'cobrar', 'pela', 'peca']);
});

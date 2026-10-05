/**
 * IMC e faixa de peso (F045).
 *
 * Os casos 1 a 3 vêm da especificação (ander-flow/docs/catalogo/catalogo-calculo.md, seção "imc"),
 * conferidos à mão: 70 ÷ 1,75² = 22,857 → 22,9; 120 ÷ 1,70² = 41,522 → 41,5;
 * 18,5 × 1,75² = 56,656 → 56,7 e 24,9 × 1,75² = 76,256 → 76,3.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularImc, classificarImc, umaCasa, ErroDeImc, FAIXAS, LIMITES,
} from '../scripts/cálculos/imc.js';
import { calcularImcNaTela, AVISO_DE_USO } from '../scripts/ferramentas/imc.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';

/** Executa e devolve a recusa, falhando se não houver. */
function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  assert.fail('era esperada uma recusa');
}

/* ------------------------------------------------- casos da especificação */

test('caso 1: 70 kg e 175 cm dão IMC 22,9, peso normal, faixa normal de 56,7 a 76,3 kg', () => {
  const r = calcularImc({ pesoKg: 70, alturaCm: 175 });
  assert.equal(r.imc, 22.9);
  assert.equal(r.faixa, 'peso normal');
  assert.equal(r.pesoMínimoNormal, 56.7);
  assert.equal(r.pesoMáximoNormal, 76.3);
});

test('caso 2: 120 kg e 170 cm dão IMC 41,5, obesidade grau III', () => {
  const r = calcularImc({ pesoKg: 120, alturaCm: 170 });
  assert.equal(r.imc, 41.5);
  assert.equal(r.faixa, 'obesidade grau III');
});

test('caso 3: altura zero é recusada no campo da altura, com o código da especificação', () => {
  const erro = recusaDe(() => calcularImc({ pesoKg: 70, alturaCm: 0 }));
  assert.ok(erro instanceof ErroDeImc);
  assert.equal(erro.código, 'altura_invalida');
  assert.equal(erro.campo, 'alturaCm');
});

/* ------------------------------------------------------- faixas da OMS */

test('cada faixa é encontrada pelo IMC, e o corte de cima pertence à faixa seguinte', () => {
  const esperado = [
    [18.4, 'abaixo do peso'], [18.5, 'peso normal'], [24.9, 'peso normal'],
    [25, 'sobrepeso'], [29.9, 'sobrepeso'], [30, 'obesidade grau I'], [34.9, 'obesidade grau I'],
    [35, 'obesidade grau II'], [39.9, 'obesidade grau II'], [40, 'obesidade grau III'], [80, 'obesidade grau III'],
  ];
  for (const [imc, faixa] of esperado) assert.equal(classificarImc(imc).faixa, faixa, `IMC ${imc}`);
});

test('nos cortes exatos (altura de 2 m, altura² = 4) o peso decide a faixa sem ruído de ponto flutuante', () => {
  // IMC = peso ÷ 4: 74 kg → 18,5; 100 kg → 25; 120 kg → 30; 140 kg → 35; 160 kg → 40.
  const faixaDe = (pesoKg) => calcularImc({ pesoKg, alturaCm: 200 }).faixa;
  assert.equal(faixaDe(73.8), 'peso normal'); // 18,45 arredonda para 18,5
  assert.equal(faixaDe(73.7), 'abaixo do peso'); // 18,425 → 18,4
  assert.equal(faixaDe(74), 'peso normal');
  assert.equal(faixaDe(99.7), 'peso normal'); // 24,925 → 24,9
  assert.equal(faixaDe(99.8), 'sobrepeso'); // 24,95 → 25,0
  assert.equal(faixaDe(100), 'sobrepeso');
  assert.equal(faixaDe(120), 'obesidade grau I');
  assert.equal(faixaDe(140), 'obesidade grau II');
  assert.equal(faixaDe(160), 'obesidade grau III');
});

test('as faixas cobrem todo IMC sem buracos, em ordem crescente', () => {
  const cortes = FAIXAS.map((f) => f.até);
  assert.deepEqual(cortes, [18.5, 25, 30, 35, 40, Infinity]);
  for (let i = 1; i < cortes.length; i += 1) assert.ok(cortes[i] > cortes[i - 1]);
  for (let décimos = 0; décimos <= 1200; décimos += 1) {
    assert.ok(classificarImc(décimos / 10), `IMC ${décimos / 10} ficou sem faixa`);
  }
});

/* -------------------------------------------------------- arredondamento */

test('o IMC mostrado tem uma casa e a meia casa arredonda para cima', () => {
  assert.equal(umaCasa(22.857142857142858), 22.9);
  assert.equal(umaCasa(18.45), 18.5);
  assert.equal(umaCasa(24.95), 25);
  assert.equal(umaCasa(18.449999), 18.4);
  assert.equal(umaCasa(0), 0);
});

test('o intervalo de peso normal é arredondado em uma casa, para alturas que não dão número redondo', () => {
  // 18,5 × 1,7² = 53,465 → 53,5; 24,9 × 1,7² = 71,961 → 72,0.
  const r = calcularImc({ pesoKg: 60, alturaCm: 170 });
  assert.equal(r.pesoMínimoNormal, 53.5);
  assert.equal(r.pesoMáximoNormal, 72);
});

test('peso e altura com decimais entram na conta sem perder precisão', () => {
  // 70,5 ÷ 1,755² = 22,889 → 22,9
  const r = calcularImc({ pesoKg: 70.5, alturaCm: 175.5 });
  assert.equal(r.imc, 22.9);
  assert.ok(Math.abs(r.imcExato - 70.5 / (1.755 * 1.755)) < 1e-12);
});

/* --------------------------------------------------------------- limites */

test('os limites são aceitos exatamente e recusados um passo além', () => {
  const { pesoMínKg, pesoMáxKg, alturaMínCm, alturaMáxCm } = LIMITES;
  assert.doesNotThrow(() => calcularImc({ pesoKg: pesoMínKg, alturaCm: alturaMáxCm }));
  assert.doesNotThrow(() => calcularImc({ pesoKg: pesoMáxKg, alturaCm: alturaMínCm }));
  assert.equal(recusaDe(() => calcularImc({ pesoKg: pesoMínKg - 0.1, alturaCm: 170 })).campo, 'pesoKg');
  assert.equal(recusaDe(() => calcularImc({ pesoKg: pesoMáxKg + 0.1, alturaCm: 170 })).campo, 'pesoKg');
  assert.equal(recusaDe(() => calcularImc({ pesoKg: 70, alturaCm: alturaMínCm - 0.1 })).campo, 'alturaCm');
  assert.equal(recusaDe(() => calcularImc({ pesoKg: 70, alturaCm: alturaMáxCm + 0.1 })).campo, 'alturaCm');
});

test('peso zero, negativo e não finito são recusados com o código de peso', () => {
  for (const pesoKg of [0, -5, NaN, Infinity, -Infinity, '70', null, undefined]) {
    const erro = recusaDe(() => calcularImc({ pesoKg, alturaCm: 170 }));
    assert.equal(erro.código, 'peso_invalido', String(pesoKg));
    assert.equal(erro.campo, 'pesoKg');
  }
});

test('altura negativa, não finita ou de outro tipo é recusada com o código de altura', () => {
  for (const alturaCm of [-170, NaN, Infinity, '170', null, undefined]) {
    const erro = recusaDe(() => calcularImc({ pesoKg: 70, alturaCm }));
    assert.equal(erro.código, 'altura_invalida', String(alturaCm));
    assert.equal(erro.campo, 'alturaCm');
  }
});

test('altura digitada em metros recebe a mensagem que ensina a usar centímetros', () => {
  const erro = recusaDe(() => calcularImc({ pesoKg: 70, alturaCm: 1.75 }));
  assert.match(erro.message, /centímetros: digite 175 em vez de 1,75/);
  // Fora dessa janela a mensagem é a do intervalo.
  assert.match(recusaDe(() => calcularImc({ pesoKg: 70, alturaCm: 10 })).message, /entre 30 e 250 cm/);
});

/* ------------------------------------------------------------ propriedades */

test('propriedade: o IMC do peso mínimo normal é 18,5 e o do máximo é 24,9, em qualquer altura', () => {
  for (let alturaCm = 100; alturaCm <= 220; alturaCm += 5) {
    const { pesoMínimoNormal, pesoMáximoNormal } = calcularImc({ pesoKg: 70, alturaCm });
    // O peso foi arredondado em 0,1 kg: o IMC refeito pode variar o que 0,05 kg varia naquela altura.
    const m2 = (alturaCm / 100) ** 2;
    assert.ok(Math.abs(pesoMínimoNormal / m2 - 18.5) <= 0.05 / m2 + 1e-9, `mínimo a ${alturaCm} cm`);
    assert.ok(Math.abs(pesoMáximoNormal / m2 - 24.9) <= 0.05 / m2 + 1e-9, `máximo a ${alturaCm} cm`);
    assert.ok(pesoMínimoNormal < pesoMáximoNormal);
  }
});

test('propriedade: mais peso, na mesma altura, nunca diminui o IMC nem baixa a faixa', () => {
  const ordem = FAIXAS.map((f) => f.id);
  for (const alturaCm of [150, 170, 190]) {
    let imcAnterior = -1;
    let faixaAnterior = -1;
    for (let pesoKg = LIMITES.pesoMínKg; pesoKg <= LIMITES.pesoMáxKg; pesoKg += 1) {
      const r = calcularImc({ pesoKg, alturaCm });
      assert.ok(r.imc >= imcAnterior, `${pesoKg} kg a ${alturaCm} cm`);
      assert.ok(ordem.indexOf(r.faixaId) >= faixaAnterior, `${pesoKg} kg a ${alturaCm} cm`);
      imcAnterior = r.imc;
      faixaAnterior = ordem.indexOf(r.faixaId);
    }
  }
});

test('propriedade: o IMC mostrado e a faixa nunca se contradizem', () => {
  for (let pesoKg = 30; pesoKg <= 200; pesoKg += 0.5) {
    for (const alturaCm of [140, 155, 165, 175, 185, 200]) {
      const r = calcularImc({ pesoKg, alturaCm });
      assert.equal(r.faixa, classificarImc(r.imc).faixa);
      assert.equal(r.imc, umaCasa(r.imc));
    }
  }
});

/* ------------------------------------------------------------------ tela */

const TELA = { pesoKg: '70', alturaCm: '175' };

test('a tela mostra o caso 1 formatado em pt-BR, com a faixa e o intervalo de peso', () => {
  const saída = calcularImcNaTela(TELA);
  assert.equal(saída.valor, 'IMC 22,9');
  assert.equal(saída.resumo, 'Faixa: peso normal.');
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['IMC'], '22,9 kg/m²');
  assert.equal(linhas['Faixa'], 'Peso normal');
  assert.equal(linhas['Peso normal para 175 cm'], '56,7 a 76,3 kg');
  assert.equal(linhas['Peso informado'], '70 kg');
  assert.equal(linhas['Altura informada'], '175 cm');
});

test('a tela mostra o IMC com uma casa sempre, mesmo quando termina em zero', () => {
  // 100 ÷ 2² = 25,0
  assert.equal(calcularImcNaTela({ pesoKg: '100', alturaCm: '200' }).valor, 'IMC 25,0');
});

test('a tela aceita vírgula, ponto, espaços e milhar escritos por gente', () => {
  assert.equal(calcularImcNaTela({ pesoKg: ' 70,5 ', alturaCm: '175.5' }).valor, 'IMC 22,9');
  assert.equal(calcularImcNaTela({ pesoKg: '70', alturaCm: '1 75' }).valor, 'IMC 22,9');
});

test('a tabela das faixas marca só a faixa da pessoa e não oferece exportação própria', () => {
  const { tabela } = calcularImcNaTela({ pesoKg: '120', alturaCm: '170' });
  assert.equal(tabela.semExportação, true);
  assert.equal(tabela.linhas.length, FAIXAS.length);
  const marcadas = tabela.linhas.filter((l) => l[2] !== '');
  assert.equal(marcadas.length, 1);
  assert.equal(marcadas[0][0], 'Obesidade grau III');
  assert.equal(marcadas[0][1], '40,0 ou mais');
});

test('o resultado e o texto copiado trazem o aviso de que não é diagnóstico nem vale para todos', () => {
  const saída = calcularImcNaTela(TELA);
  assert.ok(saída.observações.some((o) => o.includes('Não é diagnóstico')));
  assert.ok(saída.observações.some((o) => o.includes('atletas') && o.includes('gestantes') && o.includes('crianças')));
  assert.ok(saída.texto.includes('Não é diagnóstico'));
  assert.ok(saída.texto.startsWith('IMC 22,9 (peso normal)'));
  assert.match(AVISO_DE_USO, /menores de 18 anos/);
  assert.match(AVISO_DE_USO, /gestantes/);
  assert.match(AVISO_DE_USO, /atletas/);
});

/* ---------------------------------------------- erros chegam no campo certo */

test('campo vazio pede o preenchimento no campo certo', () => {
  const semPeso = recusaDe(() => calcularImcNaTela({ pesoKg: '', alturaCm: '175' }));
  assert.ok(semPeso instanceof ErroDeEntrada);
  assert.equal(semPeso.campo, 'pesoKg');
  assert.equal(semPeso.message, 'Preencha o campo "Peso (kg)".');
  const semAltura = recusaDe(() => calcularImcNaTela({ pesoKg: '70', alturaCm: '   ' }));
  assert.equal(semAltura.campo, 'alturaCm');
  assert.equal(semAltura.message, 'Preencha o campo "Altura (cm)".');
});

test('a altura zero vira erro de entrada no campo da altura, com mensagem que diz o que fazer', () => {
  const erro = recusaDe(() => calcularImcNaTela({ pesoKg: '70', alturaCm: '0' }));
  assert.ok(erro instanceof ErroDeEntrada);
  assert.equal(erro.campo, 'alturaCm');
  assert.equal(erro.message, 'Informe uma altura entre 30 e 250 cm.');
});

test('peso fora do intervalo vira erro de entrada no campo do peso', () => {
  for (const pesoKg of ['0', '-3', '501', '99999999999999999999']) {
    const erro = recusaDe(() => calcularImcNaTela({ pesoKg, alturaCm: '175' }));
    assert.ok(erro instanceof ErroDeEntrada, pesoKg);
    assert.equal(erro.campo, 'pesoKg');
    assert.equal(erro.message, 'Informe um peso entre 1 e 500 kg.');
  }
});

test('altura em metros na tela ensina o formato, no campo da altura', () => {
  for (const alturaCm of ['1,75', '1.75']) {
    const erro = recusaDe(() => calcularImcNaTela({ pesoKg: '70', alturaCm }));
    assert.equal(erro.campo, 'alturaCm');
    assert.equal(erro.message, 'A altura vai em centímetros: digite 175 em vez de 1,75.');
  }
});

test('entrada hostil não trava nem escapa: texto, notação científica, Infinity e texto enorme viram erro de campo', () => {
  const hostis = ['abc', '1e3', '0x10', 'Infinity', '--5', '7 0 0 kg', '<script>1</script>', '9'.repeat(1_000_000)];
  for (const valor of hostis) {
    const erro = recusaDe(() => calcularImcNaTela({ pesoKg: valor, alturaCm: '175' }));
    assert.ok(erro instanceof ErroDeEntrada, `peso "${valor.slice(0, 20)}"`);
    assert.equal(erro.campo, 'pesoKg');
    const erroAltura = recusaDe(() => calcularImcNaTela({ pesoKg: '70', alturaCm: valor }));
    assert.ok(erroAltura instanceof ErroDeEntrada, `altura "${valor.slice(0, 20)}"`);
    assert.equal(erroAltura.campo, 'alturaCm');
  }
});

test('texto digitado nunca volta dentro de uma mensagem de erro', () => {
  const erro = recusaDe(() => calcularImcNaTela({ pesoKg: '<img src=x onerror=alert(1)>', alturaCm: '175' }));
  assert.ok(!erro.message.includes('<'));
});

/**
 * Estoque mínimo e de segurança.
 *
 * Os casos do método do pior caso vêm da especificação (catalogo-operacoes.md, seção
 * estoque-minimo) e foram conferidos à mão: 80 × 10 − 50 × 6 = 800 − 300 = 500.
 * Os do nível de serviço foram feitos à mão com os z de tabela de distribuição normal
 * (90% 1,2816; 95% 1,6449; 97,5% 1,9600; 99% 2,3263), sem passar pelo código.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  estoqueDeSegurança, estoqueDeSegurançaPorNívelDeServiço, fatorZ,
  LIMITE_DE_CONSUMO, LIMITE_DE_PRAZO, FATOR_DE_PICO,
} from '../scripts/cálculos/estoque-minimo.js';
import {
  calcularEstoqueNaTela, MÉTODO_PIOR_CASO, MÉTODO_NÍVEL_DE_SERVIÇO,
} from '../scripts/ferramentas/estoque-minimo.js';
import { arquivoBaixado, textosDoPdf, espaçosComuns } from './auxiliares/pdf-baixado.mjs';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';

const CASO_1 = { consumoMedioDiario: 50, consumoMaximoDiario: 80, tempoRepMedioDias: 6, tempoRepMaximoDias: 10 };
const CASO_NÍVEL = {
  consumoMedioDiario: 50, desvioConsumoDiario: 15, tempoRepMedioDias: 6, desvioTempoRepDias: 1, nivelDeServico: 95,
};

/** Executa e devolve a recusa, falhando se não houver. */
function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  assert.fail('era esperada uma recusa');
}

const quase = (obtido, esperado, tolerância = 1e-6) => assert.ok(
  Math.abs(obtido - esperado) <= tolerância, `${obtido} deveria ser ${esperado} (±${tolerância})`,
);

/* -------------------------------------------------- pior caso: especificação */

test('caso 1 da especificação: 80×10 − 50×6 = 500 de segurança, mínimo igual', () => {
  const r = estoqueDeSegurança(CASO_1);
  assert.equal(r.estoqueSeguranca, 500);
  assert.equal(r.estoqueMinimo, 500);
  assert.equal(r.unidadesInteiras, 500);
  assert.equal(r.consumoNoPiorCaso, 800);
  assert.equal(r.consumoNoPrazoMedio, 300);
  // 300 de consumo no prazo médio + 500 de colchão = 800, o consumo do pior caso.
  assert.equal(r.pontoDeReposicao, 800);
  assert.equal(r.diasDeCobertura, 10);
  assert.deepEqual(r.alertas, []);
});

test('caso 2 da especificação: sem variação, segurança zero e aviso de que o zero depende da realidade', () => {
  const r = estoqueDeSegurança({ consumoMedioDiario: 10, consumoMaximoDiario: 10, tempoRepMedioDias: 5, tempoRepMaximoDias: 5 });
  assert.equal(r.estoqueSeguranca, 0);
  assert.equal(r.pontoDeReposicao, 50);
  assert.deepEqual(r.alertas, ['sem_variacao']);
});

test('caso 3 da especificação: consumo máximo menor que o médio é recusado no campo do máximo', () => {
  const erro = recusaDe(() => estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 30 }));
  assert.equal(erro.código, 'consumo_maximo_menor_que_medio');
  assert.equal(erro.campo, 'consumoMaximoDiario');
  assert.match(erro.message, /maior consumo por dia \(30\) não pode ser menor que o consumo médio \(50\)/);
});

test('prazo máximo menor que o médio é recusado no campo do prazo máximo', () => {
  const erro = recusaDe(() => estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: 5 }));
  assert.equal(erro.código, 'prazo_maximo_menor_que_medio');
  assert.equal(erro.campo, 'tempoRepMaximoDias');
});

test('o máximo só abaixo da média por um centésimo já é recusado; igual à média é aceito', () => {
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 49.99 })).código, 'consumo_maximo_menor_que_medio');
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: 5.99 })).código, 'prazo_maximo_menor_que_medio');
  assert.equal(estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 50 }).estoqueSeguranca, 200);
  assert.equal(estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: 6 }).estoqueSeguranca, 180);
});

/* ------------------------------------------------ pior caso: bordas e limites */

test('só o consumo varia, ou só o prazo varia: a segurança cobre a parte que varia', () => {
  // (80 − 50) × 6 = 180
  assert.equal(estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: 6 }).estoqueSeguranca, 180);
  // 50 × (10 − 6) = 200
  assert.equal(estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 50 }).estoqueSeguranca, 200);
});

test('consumo e prazo aceitam fração, e o ruído do ponto flutuante não aparece nem sobe o inteiro', () => {
  // 80,5 × 10 − 50,3 × 6 = 805 − 301,8 = 503,2 (o JavaScript puro dá 503,20000000000005)
  const r = estoqueDeSegurança({ consumoMedioDiario: 50.3, consumoMaximoDiario: 80.5, tempoRepMedioDias: 6, tempoRepMaximoDias: 10 });
  assert.equal(r.estoqueSeguranca, 503.2);
  assert.equal(r.estoqueSegurancaExato, 503.2);
  assert.equal(r.unidadesInteiras, 504);
  assert.equal(r.pontoDeReposicao, 805);
  // 1,1 × 7 − 0,1 × 7 é exatamente 7; o JavaScript puro dá 7,000000000000001 e o teto viraria 8.
  const exato = estoqueDeSegurança({ consumoMedioDiario: 0.1, consumoMaximoDiario: 1.1, tempoRepMedioDias: 7, tempoRepMaximoDias: 7 });
  assert.equal(exato.estoqueSeguranca, 7);
  assert.equal(exato.unidadesInteiras, 7);
});

test('arredonda a duas casas, metade para longe do zero', () => {
  // 0,25 × 1,01 − 0,2 × 1,01 não é redondo: 0,0505 → 0,05 (exato guarda as seis casas)
  const r = estoqueDeSegurança({ consumoMedioDiario: 0.2, consumoMaximoDiario: 0.25, tempoRepMedioDias: 1.01, tempoRepMaximoDias: 1.01 });
  assert.equal(r.estoqueSegurancaExato, 0.0505);
  assert.equal(r.estoqueSeguranca, 0.05);
  assert.equal(r.unidadesInteiras, 1);
  // 0,0505 × 100 não cai em 5,05 exato no ponto flutuante: confere a metade para cima em outro valor.
  const metade = estoqueDeSegurança({ consumoMedioDiario: 1, consumoMaximoDiario: 1.005, tempoRepMedioDias: 1, tempoRepMaximoDias: 1 });
  assert.equal(metade.estoqueSegurancaExato, 0.005);
  assert.equal(metade.estoqueSeguranca, 0.01);
});

test('limites: o mínimo e o máximo passam; um passo além é recusado no campo certo', () => {
  const comMenor = { consumoMedioDiario: 0.01, consumoMaximoDiario: 0.01, tempoRepMedioDias: 0.01, tempoRepMaximoDias: 0.01 };
  assert.equal(estoqueDeSegurança(comMenor).estoqueSeguranca, 0);
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...comMenor, consumoMedioDiario: 0.009 })).campo, 'consumoMedioDiario');
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...comMenor, tempoRepMedioDias: 0 })).campo, 'tempoRepMedioDias');
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...comMenor, consumoMaximoDiario: 0 })).campo, 'consumoMaximoDiario');
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...comMenor, tempoRepMaximoDias: -1 })).campo, 'tempoRepMaximoDias');

  const noLimite = estoqueDeSegurança({
    consumoMedioDiario: LIMITE_DE_CONSUMO, consumoMaximoDiario: LIMITE_DE_CONSUMO,
    tempoRepMedioDias: LIMITE_DE_PRAZO, tempoRepMaximoDias: LIMITE_DE_PRAZO,
  });
  assert.equal(noLimite.consumoNoPiorCaso, LIMITE_DE_CONSUMO * LIMITE_DE_PRAZO);
  const acima = recusaDe(() => estoqueDeSegurança({ ...CASO_1, consumoMedioDiario: LIMITE_DE_CONSUMO + 1, consumoMaximoDiario: LIMITE_DE_CONSUMO + 1 }));
  assert.equal(acima.campo, 'consumoMedioDiario');
  assert.equal(acima.código, 'acima_do_maximo');
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: LIMITE_DE_PRAZO + 1 })).campo, 'tempoRepMaximoDias');
});

test('entrada hostil: NaN, Infinity, texto e ausente são recusados sem travar nem calcular', () => {
  for (const ruim of [NaN, Infinity, -Infinity, '50', null, undefined, {}]) {
    const erro = recusaDe(() => estoqueDeSegurança({ ...CASO_1, consumoMedioDiario: ruim }));
    assert.equal(erro.campo, 'consumoMedioDiario', String(ruim));
    assert.equal(erro.código, 'numero_invalido');
  }
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: undefined })).campo, 'tempoRepMaximoDias');
  assert.equal(recusaDe(() => estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 1e308 * 10 })).campo, 'consumoMaximoDiario');
});

test('avisa de pico isolado só acima de três vezes a média, no consumo e no prazo', () => {
  const noLimite = estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 50 * FATOR_DE_PICO, tempoRepMaximoDias: 6 * FATOR_DE_PICO });
  assert.deepEqual(noLimite.alertas, []);
  assert.deepEqual(
    estoqueDeSegurança({ ...CASO_1, consumoMaximoDiario: 150.01 }).alertas, ['consumo_muito_acima_da_media'],
  );
  assert.deepEqual(
    estoqueDeSegurança({ ...CASO_1, tempoRepMaximoDias: 18.01 }).alertas, ['prazo_muito_acima_do_medio'],
  );
});

test('propriedades: o ponto de reposição é o consumo do pior caso, e a segurança nunca é negativa nem encolhe quando o máximo cresce', () => {
  const médias = [0.01, 0.5, 1, 7.3, 50, 1234.56];
  const prazos = [0.01, 1, 2.5, 6, 30];
  for (const médio of médias) {
    for (const prazo of prazos) {
      let anterior = -Infinity;
      for (const fator of [1, 1.2, 2, 3.5, 10]) {
        const r = estoqueDeSegurança({
          consumoMedioDiario: médio, consumoMaximoDiario: médio * fator, tempoRepMedioDias: prazo, tempoRepMaximoDias: prazo * fator,
        });
        assert.ok(r.estoqueSegurancaExato >= 0);
        assert.ok(r.estoqueSegurancaExato >= anterior);
        anterior = r.estoqueSegurancaExato;
        quase(r.pontoDeReposicao, r.consumoNoPiorCaso, 0.0051);
        quase(r.pontoDeReposicao, r.consumoNoPrazoMedio + r.estoqueSegurancaExato, 0.0051);
        assert.ok(r.unidadesInteiras >= r.estoqueSegurancaExato - 1e-6);
        assert.ok(r.unidadesInteiras - r.estoqueSegurancaExato < 1);
      }
    }
  }
});

/* ------------------------------------------------------------- fator z */

test('o z bate com a tabela da distribuição normal', () => {
  const tabela = [
    [0.6, 0.2533471], [0.75, 0.6744898], [0.8, 0.8416212], [0.85, 1.0364334], [0.9, 1.2815516],
    [0.95, 1.6448536], [0.975, 1.959964], [0.99, 2.3263479], [0.995, 2.5758293], [0.999, 3.0902323], [0.9999, 3.7190165],
  ];
  for (const [p, z] of tabela) quase(fatorZ(p), z, 1e-6);
});

test('o z é simétrico, cresce com o nível e recusa probabilidade fora de (0, 1)', () => {
  for (const p of [0.55, 0.7, 0.9, 0.99, 0.9999]) quase(fatorZ(p), -fatorZ(1 - p), 1e-9);
  let anterior = -Infinity;
  for (let p = 0.501; p < 0.9999; p += 0.0037) {
    const z = fatorZ(p);
    assert.ok(z > anterior);
    anterior = z;
  }
  assert.equal(fatorZ(0.5), 0);
  for (const ruim of [0, 1, -0.1, 1.1, NaN]) assert.throws(() => fatorZ(ruim), RangeError);
});

/* ----------------------------------------------------- nível de serviço */

test('nível de serviço: 95%, desvio 15 no consumo e 1 dia no prazo dão 102,06', () => {
  // Conferido à mão: variação do consumo = 6 × 15² = 1.350; do prazo = 50² × 1² = 2.500;
  // raiz de 3.850 = 62,0484; 1,6449 × 62,0484 = 102,06.
  const r = estoqueDeSegurançaPorNívelDeServiço(CASO_NÍVEL);
  assert.equal(r.variaçãoDoConsumo, 1350);
  assert.equal(r.variaçãoDoPrazo, 2500);
  quase(r.raiz, 62.0484, 1e-4);
  assert.equal(r.estoqueSeguranca, 102.06);
  assert.equal(r.unidadesInteiras, 103);
  assert.equal(r.estoqueMinimo, 102.06);
  assert.equal(r.consumoNoPrazoMedio, 300);
  assert.equal(r.pontoDeReposicao, 402.06);
  assert.deepEqual(r.alertas, []);
});

test('nível de serviço: sem variação do prazo, a segurança é z × desvio × raiz do prazo', () => {
  // 1,6449 × 15 × raiz de 6 (2,4495) = 60,44
  const r = estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioTempoRepDias: 0 });
  assert.equal(r.estoqueSeguranca, 60.44);
  // Sem desvio do consumo, só o prazo: 1,6449 × 50 × 1 = 82,24
  const sóPrazo = estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioConsumoDiario: 0 });
  assert.equal(sóPrazo.estoqueSeguranca, 82.24);
});

test('nível de serviço: 90%, 97,5% e 99% escalam com o z da tabela', () => {
  // Só consumo varia: desvio 10, prazo 4 → raiz de (4 × 100) = 20. z × 20:
  const base = { consumoMedioDiario: 30, desvioConsumoDiario: 10, tempoRepMedioDias: 4, desvioTempoRepDias: 0 };
  assert.equal(estoqueDeSegurançaPorNívelDeServiço({ ...base, nivelDeServico: 90 }).estoqueSeguranca, 25.63); // 1,2816 × 20
  assert.equal(estoqueDeSegurançaPorNívelDeServiço({ ...base, nivelDeServico: 97.5 }).estoqueSeguranca, 39.2); // 1,9600 × 20
  assert.equal(estoqueDeSegurançaPorNívelDeServiço({ ...base, nivelDeServico: 99 }).estoqueSeguranca, 46.53); // 2,3263 × 20
});

test('nível de serviço: sem nenhum desvio a segurança é zero, com aviso', () => {
  const r = estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioConsumoDiario: 0, desvioTempoRepDias: 0 });
  assert.equal(r.estoqueSeguranca, 0);
  assert.deepEqual(r.alertas, ['sem_variacao']);
});

test('nível de serviço: avisa de demanda e prazo irregulares quando o desvio passa da média', () => {
  assert.deepEqual(
    estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioConsumoDiario: 50 }).alertas, [],
    'desvio igual à média ainda não é irregular',
  );
  assert.deepEqual(
    estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioConsumoDiario: 50.01 }).alertas, ['demanda_irregular'],
  );
  assert.deepEqual(
    estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioTempoRepDias: 6.5 }).alertas, ['prazo_irregular'],
  );
});

test('nível de serviço: faixa do nível vai de acima de 50% até 99,99%', () => {
  const nível = (n) => estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, nivelDeServico: n });
  assert.ok(nível(50.01).estoqueSeguranca >= 0);
  assert.ok(nível(99.99).estoqueSeguranca > nível(99).estoqueSeguranca);
  for (const ruim of [50, 49, 0, -5, 99.991, 100, 150]) {
    const erro = recusaDe(() => nível(ruim));
    assert.equal(erro.campo, 'nivelDeServico', String(ruim));
    assert.equal(erro.código, 'nivel_de_servico_fora_da_faixa');
  }
  assert.equal(recusaDe(() => nível(NaN)).código, 'numero_invalido');
});

test('nível de serviço: desvio negativo, consumo zero e valores acima do limite apontam o campo', () => {
  const com = (mudança) => recusaDe(() => estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, ...mudança }));
  assert.equal(com({ desvioConsumoDiario: -1 }).campo, 'desvioConsumoDiario');
  assert.equal(com({ desvioTempoRepDias: -0.1 }).campo, 'desvioTempoRepDias');
  assert.equal(com({ consumoMedioDiario: 0 }).campo, 'consumoMedioDiario');
  assert.equal(com({ tempoRepMedioDias: 0 }).campo, 'tempoRepMedioDias');
  assert.equal(com({ desvioConsumoDiario: LIMITE_DE_CONSUMO + 1 }).campo, 'desvioConsumoDiario');
  assert.equal(com({ desvioTempoRepDias: LIMITE_DE_PRAZO + 1 }).campo, 'desvioTempoRepDias');
  assert.equal(com({ desvioConsumoDiario: Infinity }).campo, 'desvioConsumoDiario');
});

test('nível de serviço: mais serviço, mais segurança; mais variação, mais segurança', () => {
  let anterior = -1;
  for (const n of [51, 60, 80, 90, 95, 99, 99.9]) {
    const r = estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, nivelDeServico: n });
    assert.ok(r.estoqueSegurancaExato > anterior);
    anterior = r.estoqueSegurancaExato;
  }
  anterior = -1;
  for (const desvio of [0, 1, 5, 20, 80]) {
    const r = estoqueDeSegurançaPorNívelDeServiço({ ...CASO_NÍVEL, desvioConsumoDiario: desvio });
    assert.ok(r.estoqueSegurancaExato > anterior);
    anterior = r.estoqueSegurancaExato;
  }
});

/* ------------------------------------------------------------------ tela */

const TELA_PIOR_CASO = {
  metodo: MÉTODO_PIOR_CASO, consumoMedioDiario: '50', consumoMaximoDiario: '80', tempoRepMedioDias: '6', tempoRepMaximoDias: '10',
  desvioConsumoDiario: '', desvioTempoRepDias: '0', nivelDeServico: '95',
};
const TELA_NÍVEL = {
  metodo: MÉTODO_NÍVEL_DE_SERVIÇO, consumoMedioDiario: '50', consumoMaximoDiario: '', tempoRepMedioDias: '6', tempoRepMaximoDias: '',
  desvioConsumoDiario: '15', desvioTempoRepDias: '1', nivelDeServico: '95',
};

test('a tela mostra o caso 1 com a fórmula substituída e as premissas', () => {
  const saída = calcularEstoqueNaTela(TELA_PIOR_CASO);
  assert.equal(saída.valor, '500 unidades de segurança');
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Estoque de segurança'], '500 unidades');
  assert.equal(linhas['Estoque mínimo (igual ao de segurança)'], '500 unidades');
  assert.equal(linhas['Consumo durante o prazo médio'], '300 unidades');
  assert.equal(linhas['Ponto de reposição (hora de pedir)'], '800 unidades');
  assert.equal(linhas['Cobertura do estoque de segurança'], '10 dias de consumo médio');
  assert.equal(linhas['Em unidades inteiras (para cima)'], undefined, 'sem fração, sem linha extra');
  assert.match(saída.resumo, /^Mantenha pelo menos 500 unidades como estoque de segurança/);
  assert.match(saída.resumo, /consumo de 80 por dia durante 10 dias/);
  const observações = saída.observações.join('\n');
  assert.ok(observações.includes('(80 × 10) − (50 × 6) = 800 − 300 = 500.'), observações);
  assert.ok(observações.includes('50 × 6 + 500 = 800'));
  assert.match(observações, /Premissas: o consumo máximo e o prazo máximo acontecem juntos/);
  assert.match(observações, /nível de serviço fica implícito/);
  assert.ok(!observações.includes('Atenção'));
});

test('a tela do pior caso não olha os campos do outro método', () => {
  const saída = calcularEstoqueNaTela({ ...TELA_PIOR_CASO, desvioConsumoDiario: 'lixo', nivelDeServico: '' });
  assert.equal(Object.fromEntries(saída.linhas)['Estoque de segurança'], '500 unidades');
  const porNível = calcularEstoqueNaTela({ ...TELA_NÍVEL, consumoMaximoDiario: 'lixo', tempoRepMaximoDias: '1' });
  assert.equal(Object.fromEntries(porNível.linhas)['Estoque de segurança'], '102,06 unidades');
});

test('o método padrão é o pior caso quando o formulário não traz o campo', () => {
  const { metodo, ...semMétodo } = TELA_PIOR_CASO;
  assert.equal(calcularEstoqueNaTela(semMétodo).valor, '500 unidades de segurança');
});

test('a tela do nível de serviço mostra z, a conta e as premissas', () => {
  const saída = calcularEstoqueNaTela(TELA_NÍVEL);
  assert.equal(saída.valor, '102,06 unidades de segurança');
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Fator do nível de serviço (z)'], '1,6449');
  assert.equal(linhas['Ponto de reposição (hora de pedir)'], '402,06 unidades');
  assert.equal(linhas['Em unidades inteiras (para cima)'], '103 unidades');
  assert.equal(linhas['Cobertura do estoque de segurança'], '2,04 dias de consumo médio');
  assert.match(saída.resumo, /Para o produto não faltar em 95% dos ciclos de reposição, mantenha cerca de 102,06 unidades/);
  const observações = saída.observações.join('\n');
  assert.ok(observações.includes('1,6449 × raiz de (6 × 15² + 50² × 1²) = 1,6449 × raiz de 3.850 = 102,060483.'), observações);
  assert.match(observações, /cerca de 5 podem acabar com falta/);
  assert.match(observações, /curva normal/);
  assert.match(observações, /arredonde para cima: 103 unidades/);
  assert.match(observações, /valor exato é 102,060483; os resultados mostram 102,06/);
});

test('desvio do prazo em branco vale zero', () => {
  const saída = calcularEstoqueNaTela({ ...TELA_NÍVEL, desvioTempoRepDias: '' });
  assert.equal(Object.fromEntries(saída.linhas)['Estoque de segurança'], '60,44 unidades');
});

test('a tela aceita vírgula, ponto e milhar do jeito que a pessoa digita', () => {
  const saída = calcularEstoqueNaTela({
    ...TELA_PIOR_CASO, consumoMedioDiario: '50,3', consumoMaximoDiario: '80.5', tempoRepMedioDias: ' 6 ', tempoRepMaximoDias: '10',
  });
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Estoque de segurança'], '503,2 unidades');
  assert.equal(linhas['Em unidades inteiras (para cima)'], '504 unidades');
  assert.equal(calcularEstoqueNaTela({ ...TELA_PIOR_CASO, consumoMedioDiario: '1.000', consumoMaximoDiario: '1.500' })
    .linhas[0][1], '9.000 unidades');
});

test('a tela explica o zero e o pico isolado em vez de entregar o número sozinho', () => {
  const zero = calcularEstoqueNaTela({ ...TELA_PIOR_CASO, consumoMaximoDiario: '50', tempoRepMaximoDias: '6' });
  assert.equal(zero.valor, '0 unidades de segurança');
  assert.match(zero.resumo, /não há variação a cobrir/);
  assert.match(zero.observações[0], /^Atenção: você informou que o consumo e o prazo nunca passam da média/);

  const pico = calcularEstoqueNaTela({ ...TELA_PIOR_CASO, consumoMaximoDiario: '400', tempoRepMaximoDias: '40' });
  const avisos = pico.observações.filter((o) => o.startsWith('Atenção'));
  assert.equal(avisos.length, 2);
  assert.match(avisos[0], /maior consumo por dia \(400\) é mais que 3 vezes a média \(50\)/);
  assert.match(avisos[1], /maior prazo de reposição \(40 dias\) é mais que 3 vezes o prazo médio \(6 dias\)/);

  const irregular = calcularEstoqueNaTela({ ...TELA_NÍVEL, desvioConsumoDiario: '80', desvioTempoRepDias: '9' });
  assert.equal(irregular.observações.filter((o) => o.startsWith('Atenção')).length, 2);
  assert.match(irregular.observações[0], /desvio padrão do consumo \(80\) passou da média \(50\)/);

  const zeroNível = calcularEstoqueNaTela({ ...TELA_NÍVEL, desvioConsumoDiario: '0', desvioTempoRepDias: '0' });
  assert.match(zeroNível.observações[0], /^Atenção: com desvio padrão zero/);
});

test('cada recusa chega ao campo que a pessoa precisa corrigir, com mensagem que diz o que fazer', () => {
  const casos = [
    [{ ...TELA_PIOR_CASO, consumoMedioDiario: '' }, 'consumoMedioDiario', /Preencha o campo "Consumo médio por dia"/],
    [{ ...TELA_PIOR_CASO, consumoMaximoDiario: '' }, 'consumoMaximoDiario', /Preencha o campo "Maior consumo por dia"/],
    [{ ...TELA_PIOR_CASO, tempoRepMedioDias: 'abc' }, 'tempoRepMedioDias', /Prazo médio de reposição precisa ser um número/],
    [{ ...TELA_PIOR_CASO, tempoRepMaximoDias: '' }, 'tempoRepMaximoDias', /Preencha o campo "Maior prazo de reposição"/],
    [{ ...TELA_PIOR_CASO, consumoMedioDiario: '0' }, 'consumoMedioDiario', /consumo médio por dia precisa ser pelo menos 0,01\./],
    [{ ...TELA_PIOR_CASO, consumoMedioDiario: '-5' }, 'consumoMedioDiario', /pelo menos 0,01/],
    [{ ...TELA_PIOR_CASO, consumoMaximoDiario: '30' }, 'consumoMaximoDiario', /não pode ser menor que o consumo médio \(50\)/],
    [{ ...TELA_PIOR_CASO, tempoRepMaximoDias: '5' }, 'tempoRepMaximoDias', /não pode ser menor que o prazo médio \(6 dias\)/],
    [{ ...TELA_PIOR_CASO, consumoMaximoDiario: '99999999' }, 'consumoMaximoDiario', /não pode passar de 1\.000\.000\. Confira se não digitou a mais/],
    [{ ...TELA_PIOR_CASO, tempoRepMaximoDias: '400' }, 'tempoRepMaximoDias', /não pode passar de 365/],
    [{ ...TELA_PIOR_CASO, consumoMedioDiario: 'Infinity' }, 'consumoMedioDiario', /precisa ser um número/],
    [{ ...TELA_NÍVEL, desvioConsumoDiario: '' }, 'desvioConsumoDiario', /Preencha o campo "Desvio padrão do consumo por dia"/],
    [{ ...TELA_NÍVEL, desvioConsumoDiario: '-2' }, 'desvioConsumoDiario', /não pode ser negativo/],
    [{ ...TELA_NÍVEL, desvioTempoRepDias: 'x' }, 'desvioTempoRepDias', /precisa ser um número/],
    [{ ...TELA_NÍVEL, nivelDeServico: '' }, 'nivelDeServico', /Preencha o campo "Nível de serviço desejado"/],
    [{ ...TELA_NÍVEL, nivelDeServico: '100' }, 'nivelDeServico', /acima de 50% e ir até 99,99%/],
    [{ ...TELA_NÍVEL, nivelDeServico: '50' }, 'nivelDeServico', /acima de 50%/],
    [{ ...TELA_NÍVEL, tempoRepMedioDias: '0' }, 'tempoRepMedioDias', /pelo menos 0,01/],
  ];
  for (const [dados, campo, mensagem] of casos) {
    const erro = recusaDe(() => calcularEstoqueNaTela(dados));
    assert.ok(erro instanceof ErroDeEntrada, `${JSON.stringify(dados)} deveria virar erro de campo`);
    assert.equal(erro.campo, campo, `${JSON.stringify(dados)} foi para ${erro.campo}`);
    assert.match(erro.message, mensagem);
  }
});

test('texto sem sentido ou gigante não trava: vira recusa rápida', () => {
  const inicio = Date.now();
  for (const lixo of ['x'.repeat(1_000_000), '9'.repeat(400), '1e999', '<script>alert(1)</script>', '=1+1', '١٢٣']) {
    const erro = recusaDe(() => calcularEstoqueNaTela({ ...TELA_PIOR_CASO, consumoMedioDiario: lixo }));
    assert.ok(erro instanceof ErroDeEntrada);
    assert.equal(erro.campo, 'consumoMedioDiario');
  }
  assert.ok(Date.now() - inicio < 2000);
});

/* ------------------------------------------------------------ exportação */

test('o texto copiado leva resultado, dados usados, avisos e a conta', () => {
  const { texto } = calcularEstoqueNaTela({ ...TELA_PIOR_CASO, consumoMaximoDiario: '400' });
  assert.match(texto, /^Estoque mínimo e de segurança\nEstoque de segurança: 3.700 unidades\n/);
  assert.ok(texto.includes('Estoque mínimo (igual ao de segurança): 3.700 unidades'));
  assert.ok(texto.includes('Dados usados'));
  assert.ok(texto.includes('Maior consumo por dia: 400 unidades'));
  assert.ok(texto.includes('Prazo médio de reposição: 6 dias'));
  assert.ok(texto.includes('Atenção: o maior consumo por dia (400)'));
  assert.ok(texto.includes('A conta:'));
  assert.equal(texto.split('Estoque de segurança:').length, 2, 'o destaque não se repete nos resultados');
});

test('o PDF baixado pelo botão tem resultado, dados, avisos e a conta legível', async () => {
  for (const [dados, subtítulo, nomeEsperado] of [
    [TELA_PIOR_CASO, 'Segurança: 500 unidades', 'estoque-minimo.pdf'],
    [TELA_NÍVEL, 'Segurança: 102,06 unidades', 'estoque-minimo.pdf'],
    [{ ...TELA_PIOR_CASO, consumoMaximoDiario: '400' }, 'Segurança: 3.700 unidades', 'estoque-minimo.pdf'],
  ]) {
    const saída = calcularEstoqueNaTela(dados);
    assert.equal(saída.arquivos.length, 1);
    assert.equal(saída.arquivos[0].rótulo, 'Baixar resumo em PDF');
    const { nome, tipo, bytes } = await arquivoBaixado(saída.arquivos[0].gerar);
    assert.equal(nome, nomeEsperado);
    assert.equal(tipo, 'application/pdf');
    const bruto = new TextDecoder('latin1').decode(bytes);
    assert.ok(bruto.startsWith('%PDF-1.4'));
    assert.ok(bruto.trimEnd().endsWith('%%EOF'));

    const textos = textosDoPdf(bytes);
    const tudo = espaçosComuns(textos.join(' '));
    assert.ok(textos.includes(subtítulo), `subtítulo ${subtítulo}`);
    for (const [rótulo, valor] of saída.linhas) {
      assert.ok(textos.includes(rótulo) && textos.includes(valor), `resultado ${rótulo}`);
    }
    assert.ok(tudo.includes('A conta:'));
    assert.ok(tudo.includes('Premissas:'));
    assert.ok(!tudo.includes('?'), `caractere trocado por "?" no PDF: ${textos.filter((t) => t.includes('?')).join(' | ')}`);
  }
});

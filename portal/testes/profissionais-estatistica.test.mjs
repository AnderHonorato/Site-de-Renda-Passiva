import test from 'node:test';
import assert from 'node:assert/strict';
import { especificacoes } from '../dados/profissionais/estatistica.js';
import { executar } from '../servidor/profissionais/estatistica.mjs';
import { ErroProfissional } from '../servidor/profissionais/comum.mjs';
const spec = (id) => especificacoes.find((s) => s.id === `F${id}`);
const run = (id, csv = spec(id).exemplo, opcoes) =>
  executar(spec(id).slug, { csv, opcoes });
const ind = (r, k) => {
  const v = r.indicadores.find((v) => v[0] === k);
  assert.ok(v, `Indicador ausente: ${k}`);
  return v[1];
};
const perto = (a, b, tol = 0.000002) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const serie = (vals) => 'valor\n' + vals.join('\n');
const rejeita = (id, csv, opcoes) =>
  assert.throws(() => run(id, csv, opcoes), ErroProfissional);

for (const s of especificacoes)
  test(`${s.id}: exemplo completo e contrato finito`, () => {
    const r = executar(s.slug, { csv: s.exemplo });
    assert.ok(r.linhas.length > 0);
    assert.equal(r.titulo, s.nome);
    assert.equal(r.metodo, s.processa);
    assert.ok(r.notas.includes(s.limites));
    assert.ok(s.nomeEn && s.referencia.startsWith('https://'));
    assert.ok(s.plano === 'plus' || s.plano === 'premium');
    assert.ok(s.resumo.length <= 130);
    for (const row of r.linhas) {
      assert.equal(row.length, r.colunas.length);
      for (const v of row)
        assert.ok(
          v === null ||
            typeof v === 'string' ||
            typeof v === 'boolean' ||
            Number.isFinite(v),
        );
    }
  });

test('catálogo contém 25 IDs e slugs únicos de F277 a F301', () => {
  assert.equal(especificacoes.length, 25);
  assert.equal(new Set(especificacoes.map((s) => s.slug)).size, 25);
  assert.deepEqual(
    especificacoes.map((s) => s.id),
    Array.from({ length: 25 }, (_, i) => `F${277 + i}`),
  );
});
test('OLS: reta conhecida, R² e Cook com resíduo não nulo', () => {
  const r = run(277, 'x;y\n1;2\n2;4\n3;5\n4;4\n5;5');
  perto(ind(r, 'Inclinação'), 0.6);
  perto(ind(r, 'Intercepto'), 2.2);
  perto(ind(r, 'R²'), 0.6);
  perto(r.linhas[0][6], 1.5);
  rejeita(277, 'x;y\n1;2\n2;4\n3;6\n4;8');
  rejeita(277, 'x;y\n1;2\n1;3\n1;4\n1;5');
});
test('ridge: preditores ortogonais e penalidade conhecida', () => {
  const r = run(278, 'x1;x2;y\n-1;-1;-5\n-1;1;3\n0;0;2\n1;-1;1\n1;1;9', {
    lambda: 1,
  });
  perto(ind(r, 'Coeficiente x1'), 2.4);
  perto(ind(r, 'Coeficiente x2'), 3.2);
  perto(ind(r, 'Intercepto'), 2);
  // Pré-processamento fixado: erros LOO calculados por ajuste completo com matriz suavizadora.
  perto(ind(r, 'RMSE leave-one-out'), Math.sqrt(5));
  rejeita(278, undefined, { lambda: 0 });
  rejeita(278, 'x1;x2;y\n1;1;2\n1;2;3\n1;3;4\n1;4;5\n1;5;6');
});
test('Theil–Sen: recupera reta apesar de outlier alto', () => {
  const r = run(279, 'x;y\n1;3\n2;5\n3;7\n4;9\n5;100');
  perto(ind(r, 'Inclinação robusta'), 2);
  perto(ind(r, 'Intercepto robusto'), 1);
  rejeita(279, 'x;y\n1;2\n1;3\n1;4');
  rejeita(
    279,
    'x;y\n' + Array.from({ length: 301 }, (_, i) => `${i};${i + 1}`).join('\n'),
  );
});
test('Spearman: postos médios em empates', () => {
  const r = run(280, 'x;y\n1;3\n2;1\n2;1\n3;2');
  perto(ind(r, 'Spearman rho'), -1 / 3);
  perto(r.linhas[1][3], 2.5);
  rejeita(280, 'x;y\n1;1\n1;2\n1;3');
});
test('Kendall tau-b: empates conjuntos e pares concordantes', () => {
  const r = run(281, 'x;y\n1;3\n2;1\n2;1\n3;2');
  perto(ind(r, 'Kendall tau-b'), -0.2);
  assert.equal(ind(r, 'Empates em ambos'), 1);
  rejeita(281, 'x;y\n1;1\n1;2\n1;3');
});
test('bootstrap: reprodutibilidade, percentis e semente validada', () => {
  const csv = serie([1, 2, 3, 4, 5]),
    r = run(282, csv, { replicas: 2000, semente: 42 });
  assert.deepEqual(r, run(282, csv, { replicas: 2000, semente: 42 }));
  assert.notDeepEqual(
    r.linhas,
    run(282, csv, { replicas: 2000, semente: 43 }).linhas,
  );
  assert.equal(ind(r, 'Mediana'), 3);
  assert.equal(ind(r, 'Limite inferior'), 1);
  assert.equal(ind(r, 'Limite superior'), 5);
  assert.equal(r.linhas.length, 2000);
  rejeita(282, csv, { replicas: 201.5 });
  rejeita(282, csv, { semente: 0 });
  rejeita(282, serie([1, 1, 1, 1, 1]));
});
test('permutação pareada: enumeração exata e invariância à direção', () => {
  const csv = 'antes;depois\n1;2\n2;3\n3;4',
    r = run(283, csv);
  assert.equal(ind(r, 'p bilateral exato'), 0.25);
  assert.equal(ind(r, 'Permutações'), 8);
  assert.equal(
    ind(run(283, 'antes;depois\n2;1\n3;2\n4;3'), 'p bilateral exato'),
    0.25,
  );
  rejeita(283, 'antes;depois\n1;1\n2;2\n3;3');
  rejeita(
    283,
    'antes;depois\n' + Array.from({ length: 17 }, () => '1;2').join('\n'),
  );
});
test('Welch: t e cauda bilateral de referência SciPy 1.17', () => {
  const r = run(284);
  perto(ind(r, 't de Welch'), -Math.sqrt(13.5));
  assert.equal(ind(r, 'Graus de liberdade'), 4);
  perto(ind(r, 'p bilateral'), 0.021311641128756727);
  rejeita(284, 'grupo;valor\nA;1\nA;1\nB;2\nB;3');
});
test('ANOVA: F=7, eta²=0,7 e p=0,027', () => {
  const r = run(285);
  perto(ind(r, 'F'), 7);
  perto(ind(r, 'p-valor'), 0.027);
  perto(ind(r, 'Eta quadrado'), 0.7);
  rejeita(285, 'grupo;valor\nA;1\nA;2\nB;3\nB;4');
  rejeita(285, 'grupo;valor\nA;1\nA;1\nB;2\nB;2\nC;3\nC;3');
});
test('Kruskal–Wallis: empates corrigidos e p-valor de referência SciPy', () => {
  const r = run(286);
  perto(ind(r, 'H corrigido'), 10.656115107913668);
  perto(ind(r, 'p aproximado'), 0.004853488501369138);
  rejeita(286, 'grupo;valor\nA;1\nA;2\nB;3\nB;4\nC;5\nC;6');
  rejeita(
    286,
    'grupo;valor\n' +
      ['A', 'B', 'C'].flatMap((g) => Array(5).fill(g + ';1')).join('\n'),
  );
});
test('contingência: resíduos, V de Cramér e qui-quadrado conhecidos', () => {
  const r = run(287);
  perto(ind(r, 'Qui-quadrado'), 50 / 3);
  perto(ind(r, 'p-valor'), 0.00004455709060405635);
  perto(ind(r, 'V de Cramér'), Math.sqrt(1 / 6));
  rejeita(287, 'linha;coluna;contagem\nA;X;1\nA;Y;1\nB;X;1\nB;Y;1');
  rejeita(287, spec(287).exemplo + '\nA;Sim;1');
  rejeita(287, spec(287).exemplo.replace('30', '30.5'));
});
test('Kaplan–Meier: censura, mediana e eventos no mesmo tempo', () => {
  const r = run(288);
  perto(r.linhas[2][4], 5 / 8);
  perto(r.linhas[3][4], 5 / 12);
  assert.equal(ind(r, 'Mediana do tempo'), 4);
  assert.equal(ind(r, 'Sobrevivência final'), 0);
  const tied = run(288, 'tempo;evento\n1;1\n1;0\n2;0');
  perto(tied.linhas[0][4], 2 / 3);
  assert.equal(ind(tied, 'Mediana do tempo'), null);
  rejeita(288, 'tempo;evento\n1;0\n2;0\n3;0');
  rejeita(288, 'tempo;evento\n1;0.5\n2;1\n3;0');
});
test('Mann–Kendall: tendência estritamente crescente e reversão', () => {
  const seq = Array.from({ length: 10 }, (_, i) => i + 1),
    r = run(289, serie(seq));
  assert.equal(ind(r, 'S'), 45);
  assert.equal(ind(r, 'Tau'), 1);
  perto(ind(r, 'Z'), 44 / Math.sqrt(125));
  perto(ind(r, 'p bilateral aproximado'), 0.00008303070332644974);
  perto(ind(run(289, serie(seq.reverse())), 'Z'), -44 / Math.sqrt(125));
  rejeita(289, serie(Array(10).fill(1)));
});
test('Pettitt: mudança única conhecida na posição seis', () => {
  const r = run(290);
  assert.equal(ind(r, 'Corte após posição'), 6);
  assert.equal(ind(r, 'K'), 36);
  perto(
    ind(r, 'p aproximado'),
    2 * Math.exp((-6 * 36 ** 2) / (12 ** 3 + 12 ** 2)),
  );
  rejeita(290, serie(Array(10).fill(1)));
});
test('CUSUM: acumuladores padrão e primeira ultrapassagem', () => {
  const r = run(291, serie([10, 11, 12]), { alvo: 10, sigma: 1, k: 0.5, h: 1 });
  perto(r.linhas[1][3], 0.5);
  perto(r.linhas[2][3], 2);
  assert.equal(ind(r, 'Primeiro sinal'), 3);
  assert.equal(ind(r, 'Pontos com sinal'), 1);
  rejeita(291, undefined, { sigma: 0 });
});
test('EWMA: valor final e limites transitórios', () => {
  const r = run(292, serie([10, 12, 14]), {
    alvo: 10,
    sigma: 2,
    lambda: 0.5,
    largura: 3,
  });
  perto(ind(r, 'EWMA final'), 12.5);
  perto(r.linhas[0][3], 7);
  perto(r.linhas[0][4], 13);
  rejeita(292, undefined, { lambda: 0 });
});
test('I-MR: limites somente da referência, sem contaminação pelo alarme', () => {
  const r = run(293, serie([9, 10, 11, 20]), { base: 3 });
  assert.equal(ind(r, 'Média da referência'), 10);
  perto(ind(r, 'Sigma interno'), 1 / 1.128);
  assert.equal(r.linhas[3][4], 'Sinal');
  assert.equal(r.linhas[3][5], 'Sinal');
  assert.equal(r.linhas[0][4], null);
  rejeita(293, serie([1, 1, 1, 2]), { base: 3 });
  rejeita(293, serie([1, 2, 3]), { base: 3 });
  rejeita(293, undefined, { base: 3.5 });
});
test('carta p: taxa ponderada e limites binomiais', () => {
  const r = run(294, 'defeituosos;amostra\n5;100\n15;100\n40;100', { base: 2 });
  assert.equal(ind(r, 'Taxa de referência'), 0.1);
  perto(r.linhas[2][5], 0.19);
  assert.equal(r.linhas[2][7], 'Sinal');
  rejeita(294, 'defeituosos;amostra\n2;1\n1;10\n1;10', { base: 2 });
  rejeita(294, 'defeituosos;amostra\n0;10\n0;10\n1;10', { base: 2 });
});
test('carta u: oportunidades agregadas e limite Poisson', () => {
  const r = run(295, 'defeitos;exposicao\n10;10\n20;20\n40;10', { base: 2 });
  assert.equal(ind(r, 'Taxa de referência'), 1);
  perto(r.linhas[2][5], 1 + 3 * Math.sqrt(0.1));
  assert.equal(r.linhas[2][7], 'Sinal');
  rejeita(295, 'defeitos;exposicao\n1;0\n1;10\n1;10', { base: 2 });
  rejeita(295, undefined, { base: 2.5 });
});
test('capacidade: sigma interno e índices de processo centralizado', () => {
  const r = run(296, serie([9, 11, 9, 11, 9, 11, 9, 11, 9, 11]), {
    inferior: 4,
    superior: 16,
  });
  perto(ind(r, 'Cp'), 1.128);
  perto(ind(r, 'Cpk'), 1.128);
  perto(ind(r, 'Desvio geral'), Math.sqrt(10 / 9));
  assert.equal(ind(r, 'Fração observada fora'), 0);
  rejeita(296, undefined, { inferior: 20, superior: 10 });
  rejeita(296, serie(Array(10).fill(1)));
});
test('Holt: extrapolação exata de reta com phi=1', () => {
  const r = run(297, serie([1, 2, 3, 4, 5, 6]), { phi: 1, horizonte: 2 });
  assert.equal(ind(r, 'MAE um passo'), 0);
  assert.equal(r.linhas[6][2], 7);
  assert.equal(r.linhas[7][2], 8);
  rejeita(297, undefined, { horizonte: 2.5 });
  rejeita(297, serie([1, 2, 3]));
});
test('decomposição: tendência linear, sazonalidade soma zero e bordas null', () => {
  const r = run(298);
  assert.equal(ind(r, 'Índice sazonal fase 1'), -2);
  assert.equal(ind(r, 'Índice sazonal fase 2'), 2);
  assert.equal(r.linhas[0][2], null);
  assert.equal(r.linhas.at(-1)[2], null);
  perto(r.linhas[1][2], 14);
  perto(r.linhas[1][5], 0);
  const odd = run(298, serie([9, 11, 16, 12, 14, 19, 15, 17, 22]), {
    periodo: 3,
  });
  assert.equal(
    odd.indicadores.reduce((a, v) => a + v[1], 0),
    0,
  );
  rejeita(298, undefined, { periodo: 2.5 });
  rejeita(298, serie([1, 2, 3, 4, 5]), { periodo: 2 });
});
test('Croston-SBA: alfa unitário e intervalo conhecido', () => {
  const r = run(299, serie([0, 4, 0, 6, 0, 8]), { alfa: 1, horizonte: 2 });
  assert.equal(ind(r, 'Demanda por período SBA'), 2);
  assert.equal(ind(r, 'Intervalo suavizado'), 2);
  assert.equal(r.linhas[2][2], 1);
  assert.equal(r.linhas.at(-1)[2], 2);
  rejeita(299, serie([1, 2, 3, 4, 5, 6]));
  rejeita(299, serie([0, 0, 1, 0, 0, 0]));
});
test('Markov: transições e projeção com soma unitária', () => {
  const r = run(300, 'estado\nA\nA\nB\nA\nB\nB\nA', { passos: 2 });
  const proj = r.linhas.filter((v) => v[0] === 'Projeção');
  perto(proj[0][4], 1 / 3);
  perto(proj[1][4], 2 / 3);
  perto(proj[2][4], 5 / 9);
  perto(proj[3][4], 4 / 9);
  for (const passo of [1, 2])
    perto(
      proj.filter((v) => v[5] === passo).reduce((a, v) => a + v[4], 0),
      1,
    );
  rejeita(300, 'estado\nA\nA\nA\nB');
  rejeita(300, undefined, { passos: 1.5 });
});
test('Ljung–Box: sequência alternante e graus de liberdade', () => {
  const r = run(
    301,
    serie(Array.from({ length: 12 }, (_, i) => (i % 2 ? -1 : 1))),
    { lags: 1 },
  );
  perto(r.linhas[0][1], -11 / 12);
  perto(ind(r, 'Q de Ljung–Box'), 77 / 6);
  perto(ind(r, 'p aproximado'), 0.0003404986191320854);
  rejeita(301, undefined, { lags: 4 });
  rejeita(301, undefined, { lags: 3, parametros: 3 });
  rejeita(301, serie(Array(12).fill(2)));
});
test('fronteiras públicas: objeto, opções, colunas e limites de linha', () => {
  assert.throws(
    () => executar('inexistente', { csv: serie([1, 2, 3]) }),
    ErroProfissional,
  );
  assert.throws(() => executar(spec(277).slug, null), ErroProfissional);
  assert.throws(
    () => executar(spec(277).slug, { csv: spec(277).exemplo, opcoes: [] }),
    ErroProfissional,
  );
  rejeita(277, undefined, { aleatoria: 1 });
  rejeita(280, 'x;y\nNaN;2\n1;3\n2;4');
  rejeita(280, 'x;y\n1000000001;2\n1;3\n2;4');
  rejeita(
    280,
    'x;y\n' + Array.from({ length: 2001 }, (_, i) => `${i};${i}`).join('\n'),
  );
});

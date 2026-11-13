import { especificacoes } from '../../dados/profissionais/estatistica.js';
import {
  ErroProfissional,
  lerTabela,
  numeroOpcao,
  relatorio,
  exigir,
  media,
  quantil,
  arredondar,
} from './comum.mjs';
const soma = (a) => a.reduce((s, x) => s + x, 0);
const variancia = (a) => {
  const m = media(a);
  return soma(a.map((x) => (x - m) ** 2)) / (a.length - 1);
};
const sq = (a) => soma(a.map((x) => x * x));
const inteiro = (x, nome) => {
  exigir(Number.isSafeInteger(x), nome + ': informe um inteiro.');
  return x;
};
const minimo = (a, n, max = 2000) =>
  exigir(
    a.length >= n && a.length <= max,
    `Informe de ${n} a ${max} observações.`,
  );
const variar = (a, nome = 'Amostra') =>
  exigir(
    Math.max(...a) > Math.min(...a),
    nome + ' precisa apresentar variação.',
  );
function postos(a) {
  const ordem = a.map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v),
    r = Array(a.length),
    empates = [];
  for (let i = 0; i < a.length;) {
    let j = i + 1;
    while (j < a.length && ordem[j].v === ordem[i].v) j++;
    for (let k = i; k < j; k++) r[ordem[k].i] = (i + 1 + j) / 2;
    if (j - i > 1) empates.push(j - i);
    i = j;
  }
  return { r, empates };
}
function grupos(rows) {
  const g = new Map();
  for (const r of rows) {
    if (!g.has(r.grupo)) g.set(r.grupo, []);
    g.get(r.grupo).push(r.valor);
  }
  return [...g];
}
// Lanczos log-gamma, continued fractions for regularized beta and gamma tails.
function logGamma(z) {
  const c = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  z--;
  let x = 0.9999999999998099;
  for (let i = 0; i < c.length; i++) x += c[i] / (z + i + 1);
  const t = z + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}
function betaCF(a, b, x) {
  const tiny = 1e-300;
  let c = 1,
    d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    let aa = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 3e-14) return h;
  }
  throw new ErroProfissional(
    'A aproximação beta não convergiu para estes dados.',
  );
}
function betaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaCF(a, b, x)) / a
    : 1 - (front * betaCF(b, a, 1 - x)) / b;
}
function gammaQ(a, x) {
  if (x <= 0) return 1;
  const gl = logGamma(a);
  if (x < a + 1) {
    let s = 1 / a,
      d = s;
    for (let i = 1; i <= 1000; i++) {
      d *= x / (a + i);
      s += d;
      if (Math.abs(d) < Math.abs(s) * 1e-14)
        return Math.max(
          0,
          Math.min(1, 1 - s * Math.exp(-x + a * Math.log(x) - gl)),
        );
    }
  } else {
    let b = x + 1 - a,
      c = 1e300,
      d = 1 / b,
      h = d;
    for (let i = 1; i <= 1000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-14)
        return Math.max(
          0,
          Math.min(1, Math.exp(-x + a * Math.log(x) - gl) * h),
        );
    }
  }
  throw new ErroProfissional(
    'A aproximação gama não convergiu para estes dados.',
  );
}
const chiP = (x, df) => gammaQ(df / 2, x / 2);
const normalP = (z) => chiP(z * z, 1);
const normalCDF = (z) =>
  z === 0 ? 0.5 : z > 0 ? 1 - normalP(z) / 2 : normalP(z) / 2;
function limpar(x) {
  if (Array.isArray(x)) return x.map(limpar);
  if (typeof x === 'number') {
    exigir(
      Number.isFinite(x),
      'Resultado não finito; revise a escala e a variação dos dados.',
    );
    return arredondar(x);
  }
  return x;
}
function saida(s, indicadores, colunas, linhas, notas = [], series = []) {
  return relatorio(s, {
    indicadores: limpar(indicadores),
    colunas,
    linhas: limpar(linhas),
    series: series.map((v) => ({ nome: v.nome, valor: limpar(v.valor) })),
    notas: [s.limites, ...notas],
  });
}
function regressao(s, r) {
  minimo(r, 4);
  const x = r.map((v) => v.x),
    y = r.map((v) => v.y);
  variar(x, 'x');
  variar(y, 'y');
  const mx = media(x),
    my = media(y),
    sxx = sq(x.map((v) => v - mx)),
    syy = sq(y.map((v) => v - my));
  const b = soma(x.map((v, i) => (v - mx) * (y[i] - my))) / sxx,
    a = my - b * mx,
    e = y.map((v, i) => v - a - b * x[i]),
    sse = sq(e);
  exigir(
    sse > syy * 1e-24,
    'Ajuste perfeito ou numericamente degenerado: distância de Cook indefinida.',
  );
  const mse = sse / (r.length - 2);
  return saida(
    s,
    [
      ['Inclinação', b],
      ['Intercepto', a],
      ['R²', 1 - sse / syy],
      ['RMSE residual', Math.sqrt(mse)],
    ],
    ['Linha', 'x', 'y', 'Ajustado', 'Resíduo', 'Alavancagem', 'Cook'],
    r.map((v, i) => {
      const h = 1 / r.length + (v.x - mx) ** 2 / sxx;
      exigir(
        h < 1 - 1e-12,
        'Alavancagem unitária: diagnóstico de Cook indefinido.',
      );
      return [
        i + 1,
        v.x,
        v.y,
        a + b * v.x,
        e[i],
        h,
        (e[i] ** 2 * h) / (2 * mse * (1 - h) ** 2),
      ];
    }),
  );
}
function ridge(s, r, d) {
  minimo(r, 5);
  const lambda = numeroOpcao(d, 'lambda', 1, 0.000001, 1e6),
    x = r.map((v) => v.x1),
    z = r.map((v) => v.x2),
    y = r.map((v) => v.y);
  variar(x, 'x1');
  variar(z, 'x2');
  variar(y, 'y');
  const mx = media(x),
    mz = media(z),
    my = media(y),
    sx = Math.sqrt(variancia(x)),
    sz = Math.sqrt(variancia(z)),
    u = x.map((v) => (v - mx) / sx),
    v = z.map((v) => (v - mz) / sz);
  const aa = sq(u) + lambda,
    bb = sq(v) + lambda,
    ab = soma(u.map((w, i) => w * v[i])),
    det = aa * bb - ab * ab;
  exigir(det > 0, 'Matriz ridge numericamente singular.');
  const cy = y.map((w) => w - my),
    uy = soma(u.map((w, i) => w * cy[i])),
    vy = soma(v.map((w, i) => w * cy[i]));
  const b1 = (bb * uy - ab * vy) / det,
    b2 = (aa * vy - ab * uy) / det,
    coef1 = b1 / sx,
    coef2 = b2 / sz,
    a = my - coef1 * mx - coef2 * mz;
  const linhas = r.map((w, i) => {
    const p = my + b1 * u[i] + b2 * v[i],
      e = y[i] - p,
      h =
        1 / r.length +
        (bb * u[i] ** 2 - 2 * ab * u[i] * v[i] + aa * v[i] ** 2) / det;
    exigir(1 - h > 1e-12, 'Validação leave-one-out numericamente indefinida.');
    return [i + 1, y[i], p, e, h, e / (1 - h)];
  });
  return saida(
    s,
    [
      ['Intercepto', a],
      ['Coeficiente x1', coef1],
      ['Coeficiente x2', coef2],
      ['RMSE leave-one-out', Math.sqrt(media(linhas.map((w) => w[5] ** 2)))],
      ['Lambda', lambda],
    ],
    [
      'Linha',
      'y',
      'Ajustado',
      'Resíduo',
      'Alavancagem ridge',
      'Resíduo leave-one-out',
    ],
    linhas,
  );
}
function theil(s, r) {
  minimo(r, 3, 300);
  const inclinacoes = [];
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++)
      if (r[i].x !== r[j].x)
        inclinacoes.push((r[j].y - r[i].y) / (r[j].x - r[i].x));
  exigir(
    inclinacoes.length > 0,
    'x precisa de pelo menos dois valores distintos.',
  );
  const b = quantil(inclinacoes, 0.5),
    a = quantil(
      r.map((v) => v.y - b * v.x),
      0.5,
    );
  return saida(
    s,
    [
      ['Inclinação robusta', b],
      ['Intercepto robusto', a],
      ['Pares com x distinto', inclinacoes.length],
    ],
    ['Linha', 'x', 'y', 'Ajustado', 'Resíduo'],
    r.map((v, i) => [i + 1, v.x, v.y, a + b * v.x, v.y - a - b * v.x]),
  );
}
function spearman(s, r) {
  minimo(r, 3);
  const x = postos(r.map((v) => v.x)).r,
    y = postos(r.map((v) => v.y)).r;
  variar(x, 'x');
  variar(y, 'y');
  const m = (r.length + 1) / 2,
    rho =
      soma(x.map((v, i) => (v - m) * (y[i] - m))) /
      Math.sqrt(sq(x.map((v) => v - m)) * sq(y.map((v) => v - m)));
  return saida(
    s,
    [
      ['Spearman rho', rho],
      ['Pares', r.length],
    ],
    ['Linha', 'x', 'y', 'Posto x', 'Posto y'],
    r.map((v, i) => [i + 1, v.x, v.y, x[i], y[i]]),
  );
}
function kendall(s, r) {
  minimo(r, 3, 1000);
  let c = 0,
    d = 0,
    tx = 0,
    ty = 0,
    ambos = 0;
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const x = Math.sign(r[j].x - r[i].x),
        y = Math.sign(r[j].y - r[i].y);
      if (!x && !y) ambos++;
      else if (!x) tx++;
      else if (!y) ty++;
      else if (x === y) c++;
      else d++;
    }
  const den = Math.sqrt((c + d + tx) * (c + d + ty));
  exigir(
    den > 0,
    'Tau-b indefinido: ambas as ordenações precisam de variação.',
  );
  return saida(
    s,
    [
      ['Kendall tau-b', (c - d) / den],
      ['Concordantes', c],
      ['Discordantes', d],
      ['Empates apenas x', tx],
      ['Empates apenas y', ty],
      ['Empates em ambos', ambos],
    ],
    ['Linha', 'x', 'y'],
    r.map((v, i) => [i + 1, v.x, v.y]),
  );
}
function bootstrap(s, r, d) {
  minimo(r, 5, 500);
  const y = r.map((v) => v.valor);
  variar(y);
  const b = inteiro(numeroOpcao(d, 'replicas', 1000, 200, 3000), 'Réplicas'),
    conf = numeroOpcao(d, 'confianca', 95, 80, 99) / 100;
  let seed = inteiro(numeroOpcao(d, 'semente', 42, 1, 2147483646), 'Semente');
  const vals = [];
  for (let j = 0; j < b; j++) {
    const sample = [];
    for (let i = 0; i < y.length; i++) {
      seed = (seed * 48271) % 2147483647;
      sample.push(y[Math.floor((seed / 2147483647) * y.length)]);
    }
    vals.push(quantil(sample, 0.5));
  }
  return saida(
    s,
    [
      ['Mediana', quantil(y, 0.5)],
      ['Limite inferior', quantil(vals, (1 - conf) / 2)],
      ['Limite superior', quantil(vals, (1 + conf) / 2)],
      ['Erro padrão bootstrap', Math.sqrt(variancia(vals))],
      ['Réplicas', b],
    ],
    ['Réplica', 'Mediana reamostrada'],
    vals.map((v, i) => [i + 1, v]),
  );
}
function permutacao(s, r) {
  minimo(r, 3, 16);
  const dif = r.map((v) => v.depois - v.antes),
    obs = Math.abs(soma(dif));
  exigir(
    dif.some((v) => v !== 0),
    'Todas as diferenças são zero.',
  );
  let extremos = 0;
  const total = 2 ** r.length,
    tol = 1e-12 * Math.max(1, soma(dif.map(Math.abs)));
  for (let mask = 0; mask < total; mask++) {
    let val = 0;
    for (let i = 0; i < dif.length; i++)
      val += mask & (1 << i) ? dif[i] : -dif[i];
    if (Math.abs(val) >= obs - tol) extremos++;
  }
  return saida(
    s,
    [
      ['Diferença média', media(dif)],
      ['p bilateral exato', extremos / total],
      ['Permutações', total],
    ],
    ['Par', 'Antes', 'Depois', 'Diferença'],
    r.map((v, i) => [i + 1, v.antes, v.depois, dif[i]]),
  );
}
function welch(s, r) {
  const g = grupos(r);
  exigir(g.length === 2, 'Informe exatamente dois grupos.');
  g.forEach(([k, v]) => {
    minimo(v, 2);
    variar(v, k);
  });
  const [a, b] = g.map(([k, v]) => ({
      k,
      n: v.length,
      m: media(v),
      v: variancia(v),
    })),
    se2 = a.v / a.n + b.v / b.n,
    t = (a.m - b.m) / Math.sqrt(se2),
    df =
      se2 ** 2 / ((a.v / a.n) ** 2 / (a.n - 1) + (b.v / b.n) ** 2 / (b.n - 1));
  return saida(
    s,
    [
      ['Diferença A−B', a.m - b.m],
      ['t de Welch', t],
      ['Graus de liberdade', df],
      ['p bilateral', betaI(df / (df + t * t), df / 2, 0.5)],
    ],
    ['Grupo', 'n', 'Média', 'Variância'],
    [a, b].map((v) => [v.k, v.n, v.m, v.v]),
  );
}
function anova(s, r) {
  const g = grupos(r);
  exigir(g.length >= 3 && g.length <= 30, 'Informe de 3 a 30 grupos.');
  g.forEach(([, v]) => minimo(v, 2));
  const m = media(r.map((v) => v.valor)),
    between = soma(g.map(([, v]) => v.length * (media(v) - m) ** 2)),
    within = soma(g.map(([, v]) => sq(v.map((w) => w - media(v)))));
  exigir(within > 0, 'Variância residual precisa ser positiva.');
  const d1 = g.length - 1,
    d2 = r.length - g.length,
    F = between / d1 / (within / d2),
    p = betaI(d2 / (d2 + d1 * F), d2 / 2, d1 / 2);
  return saida(
    s,
    [
      ['F', F],
      ['p-valor', p],
      ['Graus entre', d1],
      ['Graus dentro', d2],
      ['Eta quadrado', between / (between + within)],
    ],
    ['Grupo', 'n', 'Média', 'Variância'],
    g.map(([k, v]) => [k, v.length, media(v), variancia(v)]),
  );
}
function kruskal(s, r) {
  const g = grupos(r);
  exigir(g.length >= 3 && g.length <= 30, 'Informe de 3 a 30 grupos.');
  g.forEach(([, v]) => minimo(v, 5));
  const { r: rank, empates } = postos(r.map((v) => v.valor)),
    n = r.length,
    map = new Map(g.map(([k]) => [k, { n: 0, sum: 0 }]));
  r.forEach((v, i) => {
    map.get(v.grupo).n++;
    map.get(v.grupo).sum += rank[i];
  });
  const cor = 1 - soma(empates.map((t) => t ** 3 - t)) / (n ** 3 - n);
  exigir(cor > 0, 'Todos os valores são iguais.');
  const H = Math.max(
    0,
    ((12 / (n * (n + 1))) *
      soma([...map.values()].map((v) => v.sum ** 2 / v.n)) -
      3 * (n + 1)) /
      cor,
  );
  return saida(
    s,
    [
      ['H corrigido', H],
      ['Graus de liberdade', g.length - 1],
      ['p aproximado', chiP(H, g.length - 1)],
      ['Correção de empates', cor],
    ],
    ['Grupo', 'n', 'Soma de postos', 'Posto médio'],
    [...map].map(([k, v]) => [k, v.n, v.sum, v.sum / v.n]),
  );
}
function contingencia(s, r) {
  const a = [...new Set(r.map((v) => v.linha))],
    b = [...new Set(r.map((v) => v.coluna))];
  exigir(
    a.length >= 2 && b.length >= 2 && a.length <= 20 && b.length <= 20,
    'Informe de 2 a 20 categorias em cada eixo.',
  );
  const m = Array.from({ length: a.length }, () => Array(b.length).fill(0)),
    seen = new Set();
  for (const v of r) {
    inteiro(v.contagem, 'Contagem');
    const i = a.indexOf(v.linha),
      j = b.indexOf(v.coluna),
      key = i + ',' + j;
    exigir(!seen.has(key), 'Célula repetida: ' + v.linha + '/' + v.coluna);
    seen.add(key);
    m[i][j] = v.contagem;
  }
  const sa = m.map(soma),
    sb = b.map((_, j) => soma(m.map((v) => v[j]))),
    N = soma(sa);
  exigir(N > 0, 'Contagem total precisa ser positiva.');
  const linhas = [];
  let q = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      const e = (sa[i] * sb[j]) / N;
      exigir(
        e >= 5,
        'Cada frequência esperada deve ser pelo menos 5; agrupe categorias.',
      );
      const res = (m[i][j] - e) / Math.sqrt(e);
      q += res * res;
      linhas.push([a[i], b[j], m[i][j], e, res]);
    }
  const df = (a.length - 1) * (b.length - 1);
  return saida(
    s,
    [
      ['Qui-quadrado', q],
      ['Graus de liberdade', df],
      ['p-valor', chiP(q, df)],
      [
        'V de Cramér',
        Math.sqrt(q / (N * Math.min(a.length - 1, b.length - 1))),
      ],
    ],
    ['Linha', 'Coluna', 'Observada', 'Esperada', 'Resíduo de Pearson'],
    linhas,
  );
}
function kaplan(s, r) {
  minimo(r, 3);
  r.forEach((v) => inteiro(v.evento, 'Evento binário'));
  exigir(
    r.some((v) => v.evento === 1),
    'Informe pelo menos um evento.',
  );
  const ts = [...new Set(r.map((v) => v.tempo))].sort((a, b) => a - b),
    g = new Map(ts.map((t) => [t, { e: 0, c: 0 }]));
  r.forEach((v) => (v.evento ? g.get(v.tempo).e++ : g.get(v.tempo).c++));
  let risco = r.length,
    surv = 1,
    green = 0,
    mediana = null;
  const linhas = ts.map((t) => {
    const { e, c } = g.get(t);
    surv *= 1 - e / risco;
    if (e && e < risco) green += e / (risco * (risco - e));
    const se = surv === 0 ? 0 : surv * Math.sqrt(green);
    if (mediana === null && surv <= 0.5) mediana = t;
    const row = [t, risco, e, c, surv, se];
    risco -= e + c;
    return row;
  });
  return saida(
    s,
    [
      ['Indivíduos', r.length],
      ['Eventos', soma(r.map((v) => v.evento))],
      ['Sobrevivência final', surv],
      ['Mediana do tempo', mediana],
    ],
    [
      'Tempo',
      'Em risco',
      'Eventos',
      'Censuras',
      'Sobrevivência',
      'Erro padrão Greenwood',
    ],
    linhas,
    mediana === null
      ? ['Mediana não alcançada no acompanhamento observado.']
      : [],
  );
}
function mann(s, r) {
  minimo(r, 10, 1000);
  const y = r.map((v) => v.valor);
  variar(y);
  let S = 0;
  for (let i = 0; i < y.length; i++)
    for (let j = i + 1; j < y.length; j++) S += Math.sign(y[j] - y[i]);
  const n = y.length,
    ties = postos(y).empates,
    v =
      (n * (n - 1) * (2 * n + 5) -
        soma(ties.map((t) => t * (t - 1) * (2 * t + 5)))) /
      18;
  exigir(v > 0, 'Variância do teste nula.');
  const z = S > 0 ? (S - 1) / Math.sqrt(v) : S < 0 ? (S + 1) / Math.sqrt(v) : 0;
  return saida(
    s,
    [
      ['S', S],
      ['Z', z],
      ['Tau', S / ((n * (n - 1)) / 2)],
      ['p bilateral aproximado', normalP(z)],
    ],
    ['Posição', 'Valor'],
    y.map((v, i) => [i + 1, v]),
  );
}
function pettitt(s, r) {
  minimo(r, 10);
  const y = r.map((v) => v.valor);
  variar(y);
  const ranks = postos(y).r,
    n = y.length;
  let cum = 0,
    K = 0,
    k = 0;
  const linhas = [];
  for (let i = 0; i < n - 1; i++) {
    cum += ranks[i];
    const u = 2 * cum - (i + 1) * (n + 1);
    if (Math.abs(u) > K) {
      K = Math.abs(u);
      k = i + 1;
    }
    linhas.push([i + 1, u, Math.abs(u)]);
  }
  return saida(
    s,
    [
      ['Corte após posição', k],
      ['K', K],
      [
        'p aproximado',
        Math.min(1, 2 * Math.exp((-6 * K * K) / (n ** 3 + n * n))),
      ],
      ['Mediana antes', quantil(y.slice(0, k), 0.5)],
      ['Mediana depois', quantil(y.slice(k), 0.5)],
    ],
    ['Corte após posição', 'U', '|U|'],
    linhas,
    [
      'Empates de máximo são resolvidos pelo primeiro corte; significância é apenas aproximada.',
    ],
  );
}
function cusum(s, r, d) {
  minimo(r, 3);
  const mu = numeroOpcao(d, 'alvo', 10, -1e9, 1e9),
    sd = numeroOpcao(d, 'sigma', 1, 0.000001, 1e9),
    k = numeroOpcao(d, 'k', 0.5, 0.01, 5),
    h = numeroOpcao(d, 'h', 5, 1, 20);
  let up = 0,
    down = 0,
    first = null,
    count = 0;
  const linhas = r.map((v, i) => {
    const z = (v.valor - mu) / sd;
    up = Math.max(0, up + z - k);
    down = Math.max(0, down - z - k);
    const sinal = up > h || down > h;
    if (sinal) {
      count++;
      if (first === null) first = i + 1;
    }
    return [i + 1, v.valor, z, up, down, sinal ? 'Sinal' : 'Dentro'];
  });
  return saida(
    s,
    [
      ['Primeiro sinal', first],
      ['Pontos com sinal', count],
      ['Limiar h', h],
    ],
    ['Posição', 'Valor', 'Padronizado', 'C+', 'C−', 'Situação'],
    linhas,
  );
}
function ewma(s, r, d) {
  minimo(r, 3);
  const mu = numeroOpcao(d, 'alvo', 10, -1e9, 1e9),
    sd = numeroOpcao(d, 'sigma', 1, 0.000001, 1e9),
    l = numeroOpcao(d, 'lambda', 0.2, 0.001, 1),
    L = numeroOpcao(d, 'largura', 3, 1, 5);
  let z = mu,
    count = 0;
  const linhas = r.map((v, i) => {
    z = l * v.valor + (1 - l) * z;
    const band =
        L * sd * Math.sqrt((l / (2 - l)) * (1 - (1 - l) ** (2 * (i + 1)))),
      sinal = z < mu - band || z > mu + band;
    if (sinal) count++;
    return [
      i + 1,
      v.valor,
      z,
      mu - band,
      mu + band,
      sinal ? 'Sinal' : 'Dentro',
    ];
  });
  return saida(
    s,
    [
      ['Pontos com sinal', count],
      ['EWMA final', z],
    ],
    [
      'Posição',
      'Valor',
      'EWMA',
      'Limite inferior',
      'Limite superior',
      'Situação',
    ],
    linhas,
  );
}
function base(r, d, padrao, min) {
  const b = inteiro(numeroOpcao(d, 'base', padrao, min, 1999), 'Base');
  exigir(
    r.length > b,
    'Informe ao menos uma observação após a base de referência.',
  );
  return b;
}
function imr(s, r, d) {
  const b = base(r, d, 6, 3),
    y = r.map((v) => v.valor),
    mu = media(y.slice(0, b)),
    mrs = y.slice(1, b).map((v, i) => Math.abs(v - y[i])),
    mr = media(mrs);
  exigir(mr > 0, 'Referência sem amplitude móvel positiva.');
  const sigma = mr / 1.128,
    lo = mu - 3 * sigma,
    hi = mu + 3 * sigma;
  let count = 0;
  return saida(
    s,
    [
      ['Média da referência', mu],
      ['Sigma interno', sigma],
      ['Amplitude média', mr],
      ['Limite I inferior', lo],
      ['Limite I superior', hi],
    ],
    ['Posição', 'Valor', 'Amplitude móvel', 'Fase', 'Sinal I', 'Sinal MR'],
    y.map((v, i) => {
      const m = i ? Math.abs(v - y[i - 1]) : null,
        monitor = i >= b,
        si = monitor && (v < lo || v > hi),
        sm = monitor && m > 3.267 * mr;
      if (si || sm) count++;
      return [
        i + 1,
        v,
        m,
        monitor ? 'Monitoramento' : 'Referência',
        monitor ? (si ? 'Sinal' : 'Dentro') : null,
        monitor ? (sm ? 'Sinal' : 'Dentro') : null,
      ];
    }),
    [
      'Limite superior MR: ' +
        arredondar(3.267 * mr) +
        '. A amplitude na transição usa o último ponto da referência.',
    ],
  );
}
function carta(s, r, d, tipo) {
  const b = base(r, d, 3, 2),
    p = tipo === 'p',
    cnt = p ? 'defeituosos' : 'defeitos',
    ex = p ? 'amostra' : 'exposicao';
  r.forEach((v) => {
    inteiro(v[cnt], cnt);
    if (p) {
      inteiro(v[ex], ex);
      exigir(v[cnt] <= v[ex], 'Defeituosos não podem exceder amostra.');
    }
  });
  const rate =
    soma(r.slice(0, b).map((v) => v[cnt])) /
    soma(r.slice(0, b).map((v) => v[ex]));
  exigir(
    rate > 0 && (!p || rate < 1),
    'Referência precisa de taxa positiva' + (p ? ' e inferior a 1.' : '.'),
  );
  let count = 0,
    small = false;
  const linhas = r.map((v, i) => {
    const se = Math.sqrt((rate * (p ? 1 - rate : 1)) / v[ex]),
      lo = Math.max(0, rate - 3 * se),
      hi = p ? Math.min(1, rate + 3 * se) : rate + 3 * se,
      obs = v[cnt] / v[ex],
      monitor = i >= b,
      sinal = monitor && (obs < lo || obs > hi);
    if (sinal) count++;
    if (p && (rate * v[ex] < 5 || (1 - rate) * v[ex] < 5)) small = true;
    return [
      i + 1,
      v[cnt],
      v[ex],
      obs,
      lo,
      hi,
      monitor ? 'Monitoramento' : 'Referência',
      monitor ? (sinal ? 'Sinal' : 'Dentro') : null,
    ];
  });
  return saida(
    s,
    [
      ['Taxa de referência', rate],
      ['Pontos com sinal', count],
    ],
    [
      'Posição',
      p ? 'Defeituosos' : 'Defeitos',
      p ? 'Amostra' : 'Exposição',
      'Taxa observada',
      'Limite inferior',
      'Limite superior',
      'Fase',
      'Situação',
    ],
    linhas,
    small
      ? [
          'Há subgrupos com contagens esperadas menores que 5: aproximação normal fraca.',
        ]
      : [],
  );
}
function capacidade(s, r, d) {
  minimo(r, 10);
  const y = r.map((v) => v.valor);
  variar(y);
  const lo = numeroOpcao(d, 'inferior', 5, -1e9, 1e9),
    hi = numeroOpcao(d, 'superior', 25, -1e9, 1e9);
  exigir(hi > lo, 'Limite superior precisa exceder inferior.');
  const mu = media(y),
    sd = Math.sqrt(variancia(y)),
    interno = media(y.slice(1).map((v, i) => Math.abs(v - y[i]))) / 1.128;
  exigir(interno > 0, 'Sigma interno nulo.');
  const fora = y.filter((v) => v < lo || v > hi).length,
    esperada = normalCDF((lo - mu) / sd) + 1 - normalCDF((hi - mu) / sd);
  return saida(
    s,
    [
      ['Cp', (hi - lo) / (6 * interno)],
      ['Cpk', Math.min(hi - mu, mu - lo) / (3 * interno)],
      ['Pp', (hi - lo) / (6 * sd)],
      ['Ppk', Math.min(hi - mu, mu - lo) / (3 * sd)],
      ['Sigma interno', interno],
      ['Desvio geral', sd],
      ['Fração normal esperada fora', esperada],
      ['Fração observada fora', fora / y.length],
    ],
    ['Posição', 'Valor', 'Especificação'],
    y.map((v, i) => [i + 1, v, v < lo || v > hi ? 'Fora' : 'Dentro']),
  );
}
function holt(s, r, d) {
  minimo(r, 6);
  const y = r.map((v) => v.valor),
    a = numeroOpcao(d, 'alfa', 0.3, 0.001, 1),
    b = numeroOpcao(d, 'beta', 0.1, 0.001, 1),
    phi = numeroOpcao(d, 'phi', 0.9, 0.01, 1),
    h = inteiro(numeroOpcao(d, 'horizonte', 6, 1, 48), 'Horizonte');
  let level = y[1],
    trend = y[1] - y[0];
  const linhas = [
      [1, y[0], null, null, null, null],
      [2, y[1], null, null, level, trend],
    ],
    errs = [];
  for (let i = 2; i < y.length; i++) {
    const p = level + phi * trend,
      e = y[i] - p,
      old = level;
    level = a * y[i] + (1 - a) * p;
    trend = b * (level - old) + (1 - b) * phi * trend;
    errs.push(Math.abs(e));
    linhas.push([i + 1, y[i], p, e, level, trend]);
  }
  let factor = 0;
  for (let k = 1; k <= h; k++) {
    factor += phi ** k;
    linhas.push([y.length + k, null, level + factor * trend, null, null, null]);
  }
  return saida(
    s,
    [
      ['Nível final', level],
      ['Tendência final', trend],
      ['MAE um passo', media(errs)],
      ['Horizonte', h],
    ],
    ['Posição', 'Observado', 'Previsto', 'Erro um passo', 'Nível', 'Tendência'],
    linhas,
  );
}
function decompor(s, r, d) {
  const y = r.map((v) => v.valor),
    m = inteiro(numeroOpcao(d, 'periodo', 2, 2, 60), 'Período');
  minimo(r, 3 * m);
  const trend = Array(y.length).fill(null),
    half = Math.floor(m / 2);
  for (let i = half; i < y.length - half; i++) {
    if (m % 2) trend[i] = media(y.slice(i - half, i + half + 1));
    else
      trend[i] =
        (y[i - half] / 2 +
          soma(y.slice(i - half + 1, i + half)) +
          y[i + half] / 2) /
        m;
  }
  const phases = Array.from({ length: m }, () => []);
  y.forEach((v, i) => {
    if (trend[i] !== null) phases[i % m].push(v - trend[i]);
  });
  exigir(
    phases.every((v) => v.length),
    'Ciclos insuficientes para todas as fases sazonais.',
  );
  const raw = phases.map(media),
    center = media(raw),
    season = raw.map((v) => v - center);
  return saida(
    s,
    season.map((v, i) => ['Índice sazonal fase ' + (i + 1), v]),
    [
      'Posição',
      'Observado',
      'Tendência',
      'Sazonalidade',
      'Dessazonalizado',
      'Resíduo',
    ],
    y.map((v, i) => [
      i + 1,
      v,
      trend[i],
      season[i % m],
      v - season[i % m],
      trend[i] === null ? null : v - trend[i] - season[i % m],
    ]),
    [
      'A primeira posição define a fase 1; não há inferência automática do período.',
    ],
  );
}
function croston(s, r, d) {
  minimo(r, 6);
  const y = r.map((v) => v.valor);
  exigir(
    y.filter((v) => v > 0).length >= 2 && y.some((v) => v === 0),
    'Demanda intermitente exige pelo menos duas ocorrências positivas e algum zero.',
  );
  const a = numeroOpcao(d, 'alfa', 0.2, 0.001, 1),
    h = inteiro(numeroOpcao(d, 'horizonte', 6, 1, 48), 'Horizonte');
  let z = null,
    p = null,
    last = -1;
  const errs = [],
    linhas = [];
  for (let i = 0; i < y.length; i++) {
    const forecast = z === null ? null : ((1 - a / 2) * z) / p;
    if (forecast !== null) errs.push(Math.abs(y[i] - forecast));
    if (y[i] > 0) {
      if (z === null) {
        z = y[i];
        p = i + 1;
      } else {
        z = a * y[i] + (1 - a) * z;
        p = a * (i - last) + (1 - a) * p;
      }
      last = i;
    }
    linhas.push([i + 1, y[i], forecast, z, p]);
  }
  const f = ((1 - a / 2) * z) / p;
  for (let i = 1; i <= h; i++) linhas.push([y.length + i, null, f, z, p]);
  return saida(
    s,
    [
      ['Demanda por período SBA', f],
      ['Tamanho suavizado', z],
      ['Intervalo suavizado', p],
      ['MAE um passo', media(errs)],
    ],
    [
      'Posição',
      'Observado',
      'Previsão um passo/SBA',
      'Tamanho suavizado',
      'Intervalo suavizado',
    ],
    linhas,
    [
      'O primeiro intervalo inclui os zeros antes da primeira ocorrência; previsão anterior à inicialização é null.',
    ],
  );
}
function markov(s, r, d) {
  minimo(r, 4);
  const states = [...new Set(r.map((v) => v.estado))];
  exigir(
    states.length >= 2 && states.length <= 12,
    'Informe de 2 a 12 estados.',
  );
  const k = states.length,
    counts = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 1; i < r.length; i++)
    counts[states.indexOf(r[i - 1].estado)][states.indexOf(r[i].estado)]++;
  const totals = counts.map(soma);
  exigir(
    totals.every((v) => v > 0),
    'Cada estado precisa de ao menos uma transição de saída observada.',
  );
  const P = counts.map((v, i) => v.map((x) => x / totals[i])),
    h = inteiro(numeroOpcao(d, 'passos', 5, 1, 100), 'Passos'),
    linhas = [];
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++)
      linhas.push([
        'Transição',
        states[i],
        states[j],
        counts[i][j],
        P[i][j],
        null,
      ]);
  let dist = states.map((v) => (v === r.at(-1).estado ? 1 : 0));
  for (let t = 1; t <= h; t++) {
    dist = states.map((_, j) => soma(dist.map((v, i) => v * P[i][j])));
    dist.forEach((v, j) =>
      linhas.push(['Projeção', null, states[j], null, v, t]),
    );
  }
  return saida(
    s,
    [
      ['Estados', k],
      ['Transições', r.length - 1],
      ['Estado inicial da projeção', r.at(-1).estado],
      ['Passos', h],
    ],
    ['Tipo', 'Origem', 'Destino/estado', 'Contagem', 'Probabilidade', 'Passo'],
    linhas,
  );
}
function ljung(s, r, d) {
  minimo(r, 10);
  const y = r.map((v) => v.valor);
  variar(y);
  const l = inteiro(numeroOpcao(d, 'lags', 3, 1, 40), 'Defasagens'),
    p = inteiro(numeroOpcao(d, 'parametros', 0, 0, 39), 'Parâmetros');
  exigir(l <= Math.floor(y.length / 4), 'Defasagens não podem exceder n/4.');
  exigir(p < l, 'Parâmetros devem ser menores que defasagens.');
  const m = media(y),
    a = y.map((v) => v - m),
    den = sq(a);
  let Q = 0;
  const linhas = [];
  for (let k = 1; k <= l; k++) {
    let c = 0;
    for (let i = k; i < a.length; i++) c += a[i] * a[i - k];
    const rho = c / den;
    Q += (y.length * (y.length + 2) * rho * rho) / (y.length - k);
    linhas.push([k, rho, Q, k > p ? chiP(Q, k - p) : null]);
  }
  return saida(
    s,
    [
      ['Q de Ljung–Box', Q],
      ['Graus de liberdade', l - p],
      ['p aproximado', chiP(Q, l - p)],
    ],
    ['Defasagem', 'Autocorrelação', 'Q acumulado', 'p aproximado'],
    linhas,
  );
}
const motores = {
  F277: regressao,
  F278: ridge,
  F279: theil,
  F280: spearman,
  F281: kendall,
  F282: bootstrap,
  F283: permutacao,
  F284: welch,
  F285: anova,
  F286: kruskal,
  F287: contingencia,
  F288: kaplan,
  F289: mann,
  F290: pettitt,
  F291: cusum,
  F292: ewma,
  F293: imr,
  F294: (s, r, d) => carta(s, r, d, 'p'),
  F295: (s, r, d) => carta(s, r, d, 'u'),
  F296: capacidade,
  F297: holt,
  F298: decompor,
  F299: croston,
  F300: markov,
  F301: ljung,
};
export function executar(slug, dados) {
  const spec = especificacoes.find((v) => v.slug === slug);
  exigir(Boolean(spec), 'Ferramenta estatística desconhecida.');
  exigir(
    dados && typeof dados === 'object' && !Array.isArray(dados),
    'Informe os dados em um objeto.',
  );
  if (dados.opcoes !== undefined)
    exigir(
      dados.opcoes &&
        typeof dados.opcoes === 'object' &&
        !Array.isArray(dados.opcoes),
      'Opções devem ser um objeto.',
    );
  for (const chave of Object.keys(dados.opcoes ?? {}))
    exigir(
      spec.opcoes.some((o) => o.nome === chave),
      'Opção desconhecida: ' + chave,
    );
  const rows = lerTabela(dados.csv, spec.colunas);
  return motores[spec.id](spec, rows, dados);
}

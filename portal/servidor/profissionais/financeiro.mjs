/** Motores F252–F276: cálculos financeiros e operacionais determinísticos. */
import { especificacoes } from "../../dados/profissionais/financeiro.js";
import {
  ErroProfissional,
  exigir,
  lerTabela,
  numeroOpcao,
  relatorio,
  arredondar,
} from "./comum.mjs";

const porSlug = new Map(especificacoes.map((x) => [x.slug, x]));
const id = (x) => String(x ?? "").trim();
const pct = (x) => x / 100;
function dataISO(x) {
  const s = id(x);
  exigir(/^\d{4}-\d{2}-\d{2}$/.test(s), "Data inválida: use AAAA-MM-DD.");
  const t = Date.parse(s + "T00:00:00Z");
  exigir(
    Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s,
    "Data calendário inválida: " + s,
  );
  return t;
}
function arred(v, n = 6) {
  return arredondar(v, n);
}
function unica(rows, key, label) {
  const m = new Map();
  for (const r of rows) {
    const k = id(r[key]);
    if (m.has(k)) throw new ErroProfissional(label + " repetido: " + k);
    m.set(k, r);
  }
  return m;
}
function contas(spec, indicadores, colunas, linhas, notas = [], series = []) {
  return relatorio(spec, { indicadores, colunas, linhas, notas, series });
}
function periodoFluxo(rows, key = "periodo", fluxo = "fluxo") {
  const p = rows
    .map((r) => ({ periodo: Number(r[key]), fluxo: Number(r[fluxo]) }))
    .sort((a, b) => a.periodo - b.periodo);
  exigir(
    p.every((x) => Number.isInteger(x.periodo) && x.periodo >= 0),
    "Os períodos devem ser inteiros não negativos.",
  );
  exigir(
    new Set(p.map((x) => x.periodo)).size === p.length,
    "Há períodos duplicados.",
  );
  return p;
}
function npv(flows, rate) {
  return flows.reduce((s, x) => s + x.fluxo / Math.pow(1 + rate, x.periodo), 0);
}
function f252(d, spec) {
  const rows = periodoFluxo(
    lerTabela(d?.csv, spec.colunas),
    "periodo",
    "fluxo_caixa",
  );
  exigir(
    rows.length >= 2 && rows[0].periodo >= 1,
    "Informe ao menos dois períodos futuros, começando em 1.",
  );
  const wacc = pct(numeroOpcao(d, "wacc", 12, 0.01, 100)),
    g = pct(numeroOpcao(d, "crescimento_terminal", 3, -50, 50)),
    caixa = numeroOpcao(d, "caixa_liquido", 0, -1e12, 1e12);
  exigir(wacc > g, "WACC deve ser maior que crescimento terminal.");
  const pv = rows.reduce(
      (s, r) => s + r.fluxo / Math.pow(1 + wacc, r.periodo),
      0,
    ),
    last = rows.at(-1),
    tv = (last.fluxo * (1 + g)) / (wacc - g),
    pvtv = tv / Math.pow(1 + wacc, last.periodo),
    enterprise = pv + pvtv;
  const sens = [];
  for (const dw of [-2, 0, 2])
    for (const dg of [-1, 0, 1]) {
      const W = wacc + dw / 100,
        G = g + dg / 100;
      if (W > G)
        sens.push([
          arred(W * 100, 2),
          arred(G * 100, 2),
          arred(
            rows.reduce((a, r) => a + r.fluxo / Math.pow(1 + W, r.periodo), 0) +
              (last.fluxo * (1 + G)) / (W - G) / Math.pow(1 + W, last.periodo) +
              caixa,
          ),
        ]);
    }
  return contas(
    spec,
    [
      ["VP dos fluxos explícitos", arred(pv)],
      ["VP do valor terminal", arred(pvtv)],
      ["Valor da firma estimado", arred(enterprise)],
      ["Valor patrimonial ilustrativo", arred(enterprise + caixa)],
    ],
    ["Período", "Fluxo", "Valor presente"],
    rows.map((r) => [
      r.periodo,
      arred(r.fluxo),
      arred(r.fluxo / Math.pow(1 + wacc, r.periodo)),
    ]),
    [
      "Valor terminal usa Gordon com o último fluxo projetado; fluxo terminal e caixa líquido são premissas do usuário.",
    ],
    sens.map((x, i) => ({
      nome: `Sensibilidade ${i + 1}: WACC ${x[0]}%, g ${x[1]}%`,
      valor: x[2],
    })),
  );
}
function conventionalRoot(flows) {
  exigir(
    flows.length >= 2 &&
      flows[0].periodo === 0 &&
      flows[0].fluxo < 0 &&
      flows.slice(1).every((x) => x.fluxo >= 0) &&
      flows.slice(1).some((x) => x.fluxo > 0),
    "TIR/XIRR só aceita aporte negativo inicial seguido de fluxos não negativos com pelo menos uma entrada positiva.",
  );
  // x = log(1+r): positive later receipts make NPV strictly decreasing in x.
  // Skip zero flows to avoid 0 * Infinity for long horizons near r = -100%.
  const f = (x) =>
    flows.reduce(
      (sum, z) =>
        z.fluxo === 0 ? sum : sum + z.fluxo * Math.exp(-x * z.periodo),
      0,
    );
  const bound = Math.log(1e12);
  let lo = -Math.log(2),
    hi = Math.log(2);
  while (f(lo) < 0 && lo > -bound) lo = Math.max(-bound, lo * 2);
  while (f(hi) > 0 && hi < bound) hi = Math.min(bound, hi * 2);
  exigir(
    f(lo) >= 0 && f(hi) <= 0,
    "TIR/XIRR fora do domínio numérico: 1+taxa deve ficar entre 1e-12 e 1e12.",
  );
  for (let i = 0; i < 180; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return Math.expm1((lo + hi) / 2);
}
function f253(d, spec) {
  const rows = lerTabela(d?.csv, spec.colunas)
    .map((r) => ({ t: dataISO(r.data), fluxo: r.fluxo }))
    .sort((a, b) => a.t - b.t);
  exigir(rows.length >= 2, "Informe ao menos dois fluxos datados.");
  exigir(
    new Set(rows.map((x) => x.t)).size === rows.length,
    "Datas repetidas; consolide os fluxos por data.",
  );
  const base = rows[0].t,
    ys = rows.map((x) => ({
      periodo: (x.t - base) / 86400000 / 365,
      fluxo: x.fluxo,
    })),
    rate = pct(numeroOpcao(d, "taxa_referencia", 10, -99, 1000)),
    root = conventionalRoot(ys),
    npvRef = ys.reduce(
      (s, x) => s + x.fluxo / Math.pow(1 + rate, x.periodo),
      0,
    );
  return contas(
    spec,
    [
      ["XIRR anualizada (%)", arred(root * 100, 6)],
      ["VPL à taxa de referência", arred(npvRef)],
      ["Fluxos convencionais", 1],
    ],
    ["Data", "Fluxo"],
    rows.map((x) => [new Date(x.t).toISOString().slice(0, 10), arred(x.fluxo)]),
    [
      "XIRR assume fluxo inicial negativo seguido de fluxos não negativos; datas em base ACT/365.",
    ],
  );
}
function f254(d, spec) {
  const rows = periodoFluxo(lerTabela(d?.csv, spec.colunas));
  exigir(
    rows.length > 0 && rows.every((r) => r.periodo > 0 && r.fluxo >= 0),
    "Períodos devem ser positivos e fluxos não negativos.",
  );
  const y = pct(numeroOpcao(d, "yield_pct", 8, 0, 500)),
    dy = numeroOpcao(d, "choque_bp", 100, -5000, 5000) / 10000;
  exigir(
    1 + y > 0 && 1 + y + dy > 0,
    "Yield base e yield após choque precisam ser maiores que -100%.",
  );
  const p = rows.reduce((s, r) => s + r.fluxo / Math.pow(1 + y, r.periodo), 0);
  exigir(p > 0, "Preço calculado deve ser positivo.");
  const macaulay =
      rows.reduce(
        (s, r) => s + (r.periodo * r.fluxo) / Math.pow(1 + y, r.periodo),
        0,
      ) / p,
    mod = macaulay / (1 + y),
    conv =
      rows.reduce(
        (s, r) =>
          s +
          (r.periodo * (r.periodo + 1) * r.fluxo) /
            Math.pow(1 + y, r.periodo + 2),
        0,
      ) / p;
  const exact = rows.reduce(
      (s, r) => s + r.fluxo / Math.pow(1 + y + dy, r.periodo),
      0,
    ),
    approx = p * (1 - mod * dy + 0.5 * conv * dy * dy);
  return contas(
    spec,
    [
      ["Preço teórico", arred(p)],
      ["Duration Macaulay", arred(macaulay)],
      ["Duration modificada", arred(mod)],
      ["Convexidade", arred(conv)],
      ["Preço após choque exato", arred(exact)],
      ["Variação aproximada (%)", arred((approx / p - 1) * 100)],
    ],
    ["Período", "Fluxo", "VP do fluxo"],
    rows.map((r) => [
      r.periodo,
      arred(r.fluxo),
      arred(r.fluxo / Math.pow(1 + y, r.periodo)),
    ]),
    [
      "Capitalização anual por período; não inclui opcionalidade, spread de crédito nem convenção de dias.",
    ],
  );
}
function f255(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    y = pct(numeroOpcao(d, "yield_pct", 5, 0, 200));
  exigir(
    rs.length >= 3,
    "Informe fluxos de pelo menos dois ativos e um passivo.",
  );
  const sums = new Map();
  for (const r of rs) {
    const tipo = id(r.tipo).toLowerCase();
    exigir(
      ["ativo_a", "ativo_b", "passivo"].includes(tipo),
      "tipo deve ser ativo_a, ativo_b ou passivo.",
    );
    const p = Number(r.periodo);
    exigir(Number.isInteger(p) && p > 0, "Período deve ser inteiro positivo.");
    const a = sums.get(tipo) || [];
    a.push({ periodo: p, fluxo: r.fluxo });
    sums.set(tipo, a);
  }
  for (const k of ["ativo_a", "ativo_b", "passivo"])
    exigir((sums.get(k) || []).length > 0, `Falta fluxo para ${k}.`);
  const stats = (a) => {
    const pv = a.reduce((s, x) => s + x.fluxo / Math.pow(1 + y, x.periodo), 0);
    exigir(pv > 0, "Valor presente de cada conjunto deve ser positivo.");
    return {
      pv,
      dur:
        a.reduce(
          (s, x) => s + (x.periodo * x.fluxo) / Math.pow(1 + y, x.periodo),
          0,
        ) / pv,
    };
  };
  const A = stats(sums.get("ativo_a")),
    B = stats(sums.get("ativo_b")),
    L = stats(sums.get("passivo"));
  exigir(
    Math.abs(A.dur - B.dur) > 1e-10,
    "Durations dos ativos são iguais; peso de imunização não é determinado.",
  );
  const peso = (L.dur - B.dur) / (A.dur - B.dur),
    duration = peso * A.dur + (1 - peso) * B.dur;
  return contas(
    spec,
    [
      ["VP ativo A", arred(A.pv)],
      ["Duration ativo A", arred(A.dur)],
      ["VP ativo B", arred(B.pv)],
      ["Duration ativo B", arred(B.dur)],
      ["VP passivo", arred(L.pv)],
      ["Duration passivo", arred(L.dur)],
      ["Peso de mercado sugerido ativo A (%)", arred(peso * 100)],
      ["Duration combinada", arred(duration)],
      ["Investimento sugerido ativo A", arred(peso * L.pv)],
      ["Unidades equivalentes ativo A", arred((peso * L.pv) / A.pv)],
      ["Investimento sugerido ativo B", arred((1 - peso) * L.pv)],
      ["Unidades equivalentes ativo B", arred(((1 - peso) * L.pv) / B.pv)],
      [
        "VP combinado / VP passivo",
        arred((peso * L.pv + (1 - peso) * L.pv) / L.pv),
      ],
    ],
    ["Tipo", "VP", "Duration"],
    [
      ["ativo_a", arred(A.pv), arred(A.dur)],
      ["ativo_b", arred(B.pv), arred(B.dur)],
      ["passivo", arred(L.pv), arred(L.dur)],
    ],
    [
      peso < 0 || peso > 1
        ? "Peso fora de 0–100%; solução matemática exigiria short ou alavancagem."
        : "Alocação investe o VP total do passivo nas proporções matemáticas; pesos fora de 0–100% exigem short ou alavancagem.",
    ],
  );
}
function f256(d, spec) {
  const rows = lerTabela(d?.csv, spec.colunas);
  exigir(rows.length > 0, "Informe pelo menos um cenário.");
  const seen = unica(rows, "cenario", "Cenário");
  const out = [...seen.values()].map((r) => {
    const e = r.equity,
      D = r.divida;
    exigir(e + D > 0, "Equity + dívida deve ser positiva.");
    exigir(
      r.imposto_pct <= 100,
      "Alíquota de imposto deve ficar entre 0 e 100%.",
    );
    const ke = r.rf_pct + r.beta * r.erp_pct,
      w =
        (e / (e + D)) * ke +
        (D / (e + D)) * r.kd_pct * (1 - r.imposto_pct / 100);
    return [
      r.cenario,
      arred((e / (e + D)) * 100),
      arred((D / (e + D)) * 100),
      arred(ke),
      arred(w),
    ];
  });
  return contas(
    spec,
    [
      ["Cenários", out.length],
      [
        "WACC base (%)",
        out.find((x) => x[0].toLowerCase() === "base")?.[4] ?? out[0][4],
      ],
    ],
    ["Cenário", "Equity (%)", "Dívida (%)", "Ke CAPM (%)", "WACC (%)"],
    out,
    [
      "CAPM e estrutura de capital são premissas; convenção assume moeda e horizonte consistentes.",
    ],
  );
}
function f257(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    groups = new Map();
  for (const r of rs) {
    const a = groups.get(r.projeto) || [];
    a.push({ periodo: r.periodo, fluxo: r.fluxo });
    groups.set(r.projeto, a);
  }
  const rate = pct(numeroOpcao(d, "taxa_desconto_pct", 10, -99, 1000)),
    out = [];
  for (const [name, a] of groups) {
    const f = periodoFluxo(a);
    exigir(
      new Set(f.map((x) => x.periodo)).size === f.length,
      `${name}: períodos duplicados.`,
    );
    const v = npv(f, rate),
      conventional =
        f.length >= 2 &&
        f[0].periodo === 0 &&
        f[0].fluxo < 0 &&
        f.slice(1).every((x) => x.fluxo >= 0) &&
        f.slice(1).some((x) => x.fluxo > 0);
    let tir = null,
      status = "TIR não calculada para fluxo não convencional";
    if (conventional) {
      try {
        tir = arred(conventionalRoot(f) * 100, 6);
        status = "TIR única calculada";
      } catch (error) {
        if (!(error instanceof ErroProfissional)) throw error;
        status = "Sem TIR no intervalo numérico suportado";
      }
    }
    const payback = (() => {
      let acum = 0;
      for (const x of f) {
        acum += x.fluxo;
        if (acum >= 0) return x.periodo;
      }
      return null;
    })();
    out.push([name, arred(v), tir, status, payback]);
  }
  return contas(
    spec,
    [
      ["Projetos", out.length],
      ["VPL agregado", arred(out.reduce((s, x) => s + x[1], 0))],
    ],
    [
      "Projeto",
      "VPL",
      "TIR convencional (%)",
      "Status TIR",
      "Payback simples (período)",
    ],
    out,
    [
      "VPL usa a taxa informada para qualquer sequência. TIR só é calculada para aporte inicial negativo seguido de entradas não negativas.",
    ],
  );
}
function f258(d, spec) {
  const rows = lerTabela(d?.csv, spec.colunas).sort(
    (a, b) => a.periodo - b.periodo,
  );
  exigir(
    rows.every((r) => Number.isInteger(r.periodo) && r.periodo >= 0) &&
      new Set(rows.map((r) => r.periodo)).size === rows.length,
    "Períodos devem ser inteiros não negativos e únicos.",
  );
  const rate = pct(numeroOpcao(d, "taxa_desconto_pct", 10, 0, 100)),
    residualC = numeroOpcao(d, "residual_compra", 0, 0, 1e12),
    residualL = numeroOpcao(d, "residual_leasing", 0, 0, 1e12),
    horizon = rows.at(-1).periodo;
  const pc =
      rows.reduce(
        (sum, r) => sum + r.custo_compra / Math.pow(1 + rate, r.periodo),
        0,
      ) -
      residualC / Math.pow(1 + rate, horizon),
    pl =
      rows.reduce(
        (sum, r) => sum + r.custo_leasing / Math.pow(1 + rate, r.periodo),
        0,
      ) -
      residualL / Math.pow(1 + rate, horizon);
  return contas(
    spec,
    [
      ["VP do custo da compra", arred(pc)],
      ["VP do custo do leasing", arred(pl)],
      [
        "Alternativa de menor VP",
        pc < pl ? "Compra" : pc > pl ? "Leasing" : "Empate",
      ],
      ["Diferença de VP", arred(Math.abs(pc - pl))],
    ],
    ["Alternativa", "VP custo"],
    [
      ["Compra", arred(pc)],
      ["Leasing", arred(pl)],
    ],
    [
      "Residual líquido é subtraído do custo na data final; não inclui impostos ou custos não informados.",
    ],
  );
}
function f259(d, spec) {
  const preciso = (v) => arred(v, 10);
  const rs = lerTabela(d?.csv, spec.colunas);
  exigir(rs.length >= 2, "Informe ao menos dois produtos para separar mix.");
  exigir(
    new Set(rs.map((r) => r.produto)).size === rs.length,
    "Produto duplicado; consolide linhas por produto.",
  );
  const q0 = rs.reduce((s, r) => s + r.volume_base, 0),
    q1 = rs.reduce((s, r) => s + r.volume_atual, 0);
  exigir(
    q0 > 0 && q1 >= 0,
    "Volume-base total deve ser positivo e volume atual não negativo.",
  );
  const r0 = rs.reduce((s, r) => s + r.volume_base * r.preco_base, 0),
    r1 = rs.reduce((s, r) => s + r.volume_atual * r.preco_atual, 0),
    avg = r0 / q0;
  const tab = rs.map((r) => {
    exigir(
      r.volume_base >= 0 && r.volume_atual >= 0,
      "Volumes não podem ser negativos.",
    );
    const price = (r.preco_atual - r.preco_base) * r.volume_atual,
      volume = (q1 - q0) * (r.volume_base / q0) * r.preco_base,
      mix = r.preco_base * (r.volume_atual - (q1 * r.volume_base) / q0);
    return [
      r.produto,
      preciso(r.volume_base),
      preciso(r.volume_atual),
      preciso(r.preco_base * r.volume_base),
      preciso(r.preco_atual * r.volume_atual),
      preciso(price),
      preciso(volume),
      preciso(mix),
      preciso(price + volume + mix),
    ];
  });
  const totalBruto = rs.reduce(
    (s, r) =>
      s +
      (r.preco_atual - r.preco_base) * r.volume_atual +
      (q1 - q0) * (r.volume_base / q0) * r.preco_base +
      r.preco_base * (r.volume_atual - (q1 * r.volume_base) / q0),
    0,
  );
  exigir(
    Math.abs(totalBruto - (r1 - r0)) <
      128 * Number.EPSILON * Math.max(1, Math.abs(r0), Math.abs(r1)),
    "A ponte não conciliou; verifique produtos e escalas.",
  );
  return contas(
    spec,
    [
      ["Receita-base", preciso(r0)],
      ["Receita atual", preciso(r1)],
      ["Variação de receita", preciso(r1 - r0)],
      ["Preço médio-base", preciso(avg)],
    ],
    [
      "Produto",
      "Volume-base",
      "Volume atual",
      "Receita-base",
      "Receita atual",
      "Efeito preço",
      "Efeito volume total",
      "Efeito mix",
      "Variação produto",
    ],
    tab,
    [
      "Convenção: efeito preço aplica-se ao volume atual; volume total usa mix-base e preço médio-base; mix mede mudança de participação aos preços-base.",
    ],
  );
}
function f260(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    out = rs.map((r) => {
      exigir(
        r.ebitda > 0 && r.juros > 0,
        "EBITDA e juros precisam ser positivos.",
      );
      const lev = r.divida_liquida / r.ebitda,
        cov = r.ebitda / r.juros,
        hl = r.limite_alavancagem - lev,
        hc = cov - r.minimo_cobertura;
      return [
        r.cenario,
        arred(lev),
        arred(r.limite_alavancagem),
        arred(hl),
        arred(cov),
        arred(r.minimo_cobertura),
        hl >= 0 && hc >= 0 ? "Dentro dos limites" : "Revisar limite",
      ];
    });
  return contas(
    spec,
    [
      ["Cenários", out.length],
      [
        "Cenários dentro dos limites",
        out.filter((x) => x[6] === "Dentro dos limites").length,
      ],
    ],
    [
      "Cenário",
      "Dívida/EBITDA",
      "Limite alavancagem",
      "Folga alavancagem",
      "EBITDA/juros",
      "Cobertura mínima",
      "Situação",
    ],
    out,
    [
      "Use as definições contratuais específicas para dívida líquida, EBITDA ajustado e juros.",
    ],
  );
}
function f261(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    tab = rs.map((r) => {
      exigir(r.taxa_base > 0, "Taxa base deve ser positiva.");
      exigir(
        r.choque_pct > -100,
        "Choque cambial não pode tornar a taxa negativa.",
      );
      const base = r.valor * r.taxa_base,
        stress = r.valor * r.taxa_base * (1 + r.choque_pct / 100);
      return [
        r.moeda,
        arred(r.valor),
        arred(r.taxa_base),
        arred(base),
        arred(stress),
        arred(stress - base),
      ];
    });
  const delta = tab.reduce((s, r) => s + r[5], 0);
  return contas(
    spec,
    [
      ["Valor na taxa-base", arred(tab.reduce((s, r) => s + r[3], 0))],
      ["Impacto agregado do choque", arred(delta)],
    ],
    [
      "Moeda",
      "Valor estrangeiro",
      "Taxa local/moeda",
      "Valor base",
      "Valor estressado",
      "Variação",
    ],
    tab,
    [
      "Convenção: valor local = valor estrangeiro × taxa informada. Fluxos negativos representam passivos.",
    ],
  );
}
function f262(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    groups = new Map();
  for (const r of rs) {
    const a = groups.get(r.cenario) || [];
    a.push(r);
    groups.set(r.cenario, a);
  }
  const tab = [];
  for (const [scenario, a] of groups) {
    unica(a, "ativo", "Ativo do cenário " + scenario);
    const sum = a.reduce((s, r) => s + r.peso_pct, 0);
    exigir(Math.abs(sum - 100) < 1e-8, `${scenario}: pesos devem somar 100%.`);
    const ret = a.reduce((s, r) => s + (r.peso_pct * r.retorno_pct) / 100, 0);
    for (const r of a)
      tab.push([
        scenario,
        r.ativo,
        arred(r.peso_pct),
        arred(r.retorno_pct),
        arred((r.peso_pct * r.retorno_pct) / 100),
        arred(ret),
      ]);
  }
  const totals = [...new Map(tab.map((r) => [r[0], r[5]])).values()];
  return contas(
    spec,
    [
      ["Cenários", totals.length],
      ["Pior retorno observado (%)", arred(Math.min(...totals))],
    ],
    [
      "Cenário",
      "Ativo",
      "Peso (%)",
      "Retorno cenário (%)",
      "Contribuição (p.p.)",
      "Retorno carteira (%)",
    ],
    tab,
    [
      "Cenários determinísticos não têm probabilidade atribuída e não representam previsão de perda.",
    ],
  );
}
function f263(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas);
  exigir(rs.length >= 2, "Informe ao menos dois setores.");
  unica(rs, "setor", "Setor");
  const wp = rs.reduce((s, r) => s + r.peso_carteira_pct, 0),
    wb = rs.reduce((s, r) => s + r.peso_benchmark_pct, 0);
  exigir(
    Math.abs(wp - 100) < 1e-8 && Math.abs(wb - 100) < 1e-8,
    "Pesos de carteira e benchmark devem somar 100%.",
  );
  const rb = rs.reduce(
    (s, r) => s + (r.peso_benchmark_pct * r.retorno_benchmark_pct) / 100,
    0,
  );
  const rows = rs.map((r) => {
    const alloc =
        ((r.peso_carteira_pct - r.peso_benchmark_pct) *
          (r.retorno_benchmark_pct - rb)) /
        100,
      select =
        (r.peso_benchmark_pct *
          (r.retorno_carteira_pct - r.retorno_benchmark_pct)) /
        100,
      inter =
        ((r.peso_carteira_pct - r.peso_benchmark_pct) *
          (r.retorno_carteira_pct - r.retorno_benchmark_pct)) /
        100;
    return [
      r.setor,
      r.peso_carteira_pct,
      r.peso_benchmark_pct,
      r.retorno_carteira_pct,
      r.retorno_benchmark_pct,
      alloc,
      select,
      inter,
      alloc + select + inter,
    ];
  });
  const rp = rs.reduce(
      (s, r) => s + (r.peso_carteira_pct * r.retorno_carteira_pct) / 100,
      0,
    ),
    effect = rows.reduce((s, r) => s + r[8], 0);
  exigir(
    Math.abs(effect - (rp - rb)) <
      1e-8 * Math.max(1, Math.abs(rp), Math.abs(rb)),
    "Atribuição Brinson não conciliou; verifique escala dos pesos e retornos.",
  );
  return contas(
    spec,
    [
      ["Retorno carteira (%)", arred(rp)],
      ["Retorno benchmark (%)", arred(rb)],
      ["Excesso (%)", arred(rp - rb)],
      ["Alocação (p.p.)", arred(rows.reduce((s, r) => s + r[5], 0))],
      ["Seleção (p.p.)", arred(rows.reduce((s, r) => s + r[6], 0))],
      ["Interação (p.p.)", arred(rows.reduce((s, r) => s + r[7], 0))],
    ],
    [
      "Setor",
      "Peso carteira (%)",
      "Peso benchmark (%)",
      "Retorno carteira (%)",
      "Retorno benchmark (%)",
      "Alocação (p.p.)",
      "Seleção (p.p.)",
      "Interação (p.p.)",
      "Efeito total (p.p.)",
    ],
    rows.map((r) => r.map((v) => (typeof v === "number" ? arred(v, 10) : v))),
    [
      "Brinson–Fachler; pesos em porcentagem e retornos simples no mesmo período. A soma dos efeitos concilia com retorno da carteira menos benchmark.",
    ],
  );
}
function f264(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas)
    .map((r) => ({ t: dataISO(r.data), v: r.patrimonio }))
    .sort((a, b) => a.t - b.t);
  exigir(rs.length >= 2, "Informe ao menos duas datas.");
  exigir(new Set(rs.map((x) => x.t)).size === rs.length, "Datas repetidas.");
  exigir(
    rs.every((x) => x.v > 0),
    "Patrimônio deve ser positivo.",
  );
  let peak = rs[0].v,
    peakDate = rs[0].t,
    maxdd = 0,
    ddPeak = peakDate,
    trough = peakDate;
  const rows = [];
  for (const x of rs) {
    if (x.v > peak) {
      peak = x.v;
      peakDate = x.t;
    }
    const dd = 1 - x.v / peak;
    if (dd > maxdd) {
      maxdd = dd;
      ddPeak = peakDate;
      trough = x.t;
    }
    rows.push([
      new Date(x.t).toISOString().slice(0, 10),
      arred(x.v),
      arred(peak),
      arred(dd * 100),
    ]);
  }
  const years = (rs.at(-1).t - rs[0].t) / 86400000 / 365;
  exigir(years > 0, "Datas precisam cobrir período maior que zero.");
  const cagr = (Math.pow(rs.at(-1).v / rs[0].v, 1 / years) - 1) * 100,
    calmar = maxdd > 0 ? cagr / (maxdd * 100) : null;
  return contas(
    spec,
    [
      ["Drawdown máximo (%)", arred(maxdd * 100)],
      ["Pico do drawdown", new Date(ddPeak).toISOString().slice(0, 10)],
      ["Fundo do drawdown", new Date(trough).toISOString().slice(0, 10)],
      ["CAGR (%)", arred(cagr)],
      ["Calmar", calmar === null ? null : arred(calmar)],
    ],
    ["Data", "Patrimônio", "Pico acumulado", "Drawdown (%)"],
    rows,
    [
      "Patrimônio deve ser série total e positiva; CAGR usa dias corridos/365. Calmar indefinido quando não houve drawdown.",
    ],
  );
}
function f265(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    hair = pct(numeroOpcao(d, "haircut_pct", 20, 0, 100)),
    groups = new Map();
  for (const r of rs) {
    exigir(
      Number.isInteger(r.periodo_meses) && r.periodo_meses >= 0,
      "Período de vencimento deve ser mês inteiro desde a data-base.",
    );
    const a = groups.get(r.periodo_meses) || [];
    a.push(r);
    groups.set(r.periodo_meses, a);
  }
  let cumDue = 0,
    cumLiquid = 0,
    worst = 0;
  const rows = [...groups]
    .sort((a, b) => a[0] - b[0])
    .map(([month, a]) => {
      const due = a.reduce((s, r) => s + r.principal + r.juros_previstos, 0);
      exigir(
        a.every(
          (r) => Math.abs(r.ativos_liquidos - a[0].ativos_liquidos) < 1e-8,
        ),
        "Ativos líquidos devem aparecer uma vez ou ter o mesmo saldo no mês.",
      );
      const liq = a[0].ativos_liquidos * (1 - hair);
      cumDue += due;
      cumLiquid = liq;
      const gap = cumLiquid - cumDue;
      worst = Math.min(worst, gap);
      return [
        month,
        arred(due),
        arred(cumDue),
        arred(liq),
        arred(gap),
        gap < 0 ? "Déficit cumulativo" : "Cobertura indicada",
      ];
    });
  return contas(
    spec,
    [
      ["Períodos", rows.length],
      ["Vencimentos totais", arred(cumDue)],
      ["Maior déficit cumulativo", arred(worst)],
      ["Haircut de ativos (%)", arred(hair * 100)],
    ],
    [
      "Mês",
      "Dívida vencendo",
      "Vencimento acumulado",
      "Ativos líquidos estressados",
      "Ativos menos dívida acumulada",
      "Situação",
    ],
    rows,
    [
      "Ativos líquidos informados em cada mês são tratados como saldo disponível nesse mês; não some saldos mensais repetidos.",
    ],
  );
}
function f266(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    groups = new Map();
  for (const r of rs) {
    const a = groups.get(r.projeto) || [];
    a.push(r);
    groups.set(r.projeto, a);
  }
  const rows = [];
  for (const [p, a] of groups) {
    const BAC = a[0].bac;
    unica(a, "periodo", "Período do projeto " + p);
    exigir(BAC > 0, "BAC deve ser positivo.");
    exigir(
      a.every((r) => Math.abs(r.bac - BAC) < 1e-8),
      "BAC deve ser constante por projeto.",
    );
    const pv = a.reduce((s, r) => s + r.pv, 0),
      ev = a.reduce((s, r) => s + r.ev, 0),
      ac = a.reduce((s, r) => s + r.ac, 0);
    exigir(pv > 0 && ac > 0, "PV e AC agregados precisam ser positivos.");
    exigir(
      pv <= BAC + 1e-8 && ev <= BAC + 1e-8,
      "PV e EV acumulados não podem exceder o BAC informado.",
    );
    const spi = ev / pv,
      cpi = ev / ac,
      eac = cpi > 0 ? BAC / cpi : null,
      etc = eac === null ? null : eac - ac,
      vac = eac === null ? null : BAC - eac;
    rows.push([
      p,
      a.length,
      arred(BAC),
      arred(pv),
      arred(ev),
      arred(ac),
      arred(ev - ac),
      arred(ev - pv),
      arred(cpi),
      arred(spi),
      eac === null ? null : arred(eac),
      etc === null ? null : arred(etc),
      vac === null ? null : arred(vac),
    ]);
  }
  return contas(
    spec,
    [
      ["Projetos", rows.length],
      ["BAC agregado", arred(rows.reduce((s, r) => s + r[2], 0))],
      ["Projetos com CPI abaixo de 1", rows.filter((r) => r[8] < 1).length],
      ["Projetos com SPI abaixo de 1", rows.filter((r) => r[9] < 1).length],
    ],
    [
      "Projeto",
      "Períodos",
      "BAC",
      "PV",
      "EV",
      "AC",
      "CV",
      "SV",
      "CPI",
      "SPI",
      "EAC indicativo",
      "ETC indicativo",
      "VAC indicativo",
    ],
    rows,
    [
      "Soma incrementos de períodos distintos; não informe snapshots acumulados. EV, PV, AC e BAC devem compartilhar unidade e baseline. EAC=BAC/CPI pressupõe eficiência de custo constante.",
    ],
  );
}
function f267(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas);
  exigir(rs.length > 0 && rs.length <= 200, "Informe entre 1 e 200 projetos.");
  exigir(
    new Set(rs.map((r) => r.projeto)).size === rs.length,
    "Identificadores de projeto repetidos.",
  );
  const budget = numeroOpcao(d, "orcamento", 70000, 0, 1e7);
  const SCALE = 100;
  exigir(
    budget === Math.round(budget * SCALE) / SCALE &&
      rs.every((r) => r.capital === Math.round(r.capital * SCALE) / SCALE),
    "Orçamento e capitais devem ter no máximo duas casas decimais.",
  );
  const cap = Math.round(budget * SCALE);
  exigir(cap <= 1e9, "Orçamento excede o limite interno do otimizador.");
  let states = new Map([[0, { v: 0, ids: [] }]]);
  for (const r of rs) {
    const cost = Math.round(r.capital * SCALE);
    const snap = [...states];
    for (const [spent, st] of snap) {
      const n = spent + cost;
      if (n > cap) continue;
      const v = st.v + r.vpl,
        old = states.get(n);
      if (!old || v > old.v) states.set(n, { v, ids: [...st.ids, r.projeto] });
    }
    let bestSoFar = -Infinity;
    for (const [spent, st] of [...states].sort((a, b) => a[0] - b[0])) {
      if (st.v <= bestSoFar) states.delete(spent);
      else bestSoFar = st.v;
    }
    if (states.size > 200000)
      throw new ErroProfissional(
        "O espaço de estados excedeu o limite; arredonde capitais ou divida os projetos.",
      );
  }
  const best = [...states].reduce(
    (a, b) => (b[1].v > a[1].v ? b : a),
    [0, { v: 0, ids: [] }],
  );
  const selected = new Set(best[1].ids);
  const tab = rs.map((r) => [
    r.projeto,
    arred(r.capital, 2),
    arred(r.vpl, 2),
    selected.has(r.projeto) ? "Selecionado" : "Fora do orçamento",
  ]);
  return contas(
    spec,
    [
      ["Capital usado", arred(best[0] / SCALE, 2)],
      ["VPL agregado", arred(best[1].v, 2)],
      ["Projetos selecionados", best[1].ids.length],
    ],
    ["Projeto", "Capital", "VPL informado", "Decisão"],
    tab,
    [
      "Otimização 0/1 exata em centavos; projetos indivisíveis e independentes. VPL informado não é recalculado.",
    ],
  );
}
function f268(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    rows = rs.map((r) => {
      for (const k of ["volume_base", "volume_atual"])
        exigir(r[k] >= 0, `${k} não pode ser negativo.`);
      const base = (r.preco_base - r.custo_base) * r.volume_base,
        atual = (r.preco_atual - r.custo_atual) * r.volume_atual,
        preco = (r.preco_atual - r.preco_base) * r.volume_atual,
        volume =
          (r.volume_atual - r.volume_base) * (r.preco_base - r.custo_base),
        custo = -(r.custo_atual - r.custo_base) * r.volume_atual;
      exigir(
        Math.abs(preco + volume + custo - (atual - base)) <
          128 * Number.EPSILON * Math.max(1, Math.abs(atual), Math.abs(base)),
        "Decomposição não conciliou; revise escala.",
      );
      return [
        r.produto,
        arred(base),
        arred(atual),
        arred(preco),
        arred(volume),
        arred(custo),
        arred(atual - base),
      ];
    });
  return contas(
    spec,
    [
      ["Contribuição base total", arred(rows.reduce((s, r) => s + r[1], 0))],
      ["Contribuição atual total", arred(rows.reduce((s, r) => s + r[2], 0))],
      ["Variação conciliada", arred(rows.reduce((s, r) => s + r[6], 0))],
    ],
    [
      "Produto",
      "Contribuição base",
      "Contribuição atual",
      "Efeito preço",
      "Efeito volume",
      "Efeito custo unitário",
      "Variação total",
    ],
    rows,
    [
      "Efeito preço e custo usam volume atual; efeito volume usa margem unitária-base. Taxas, impostos e outros custos ficam fora.",
    ],
  );
}
function grafo(rows) {
  const key =
      rows.length && Object.hasOwn(rows[0], "tarefa") ? "tarefa" : "ordem",
    predKey = Object.hasOwn(rows[0] || {}, "predecessoras")
      ? "predecessoras"
      : "predecessora";
  const m = unica(rows, key, key === "tarefa" ? "Tarefa" : "Ordem");
  const preds = new Map();
  for (const r of rows) {
    const k = id(r[key]),
      list = id(r[predKey])
        .split(/[\s,]+/)
        .filter(Boolean);
    for (const p of list)
      exigir(m.has(p), `${k}: predecessora desconhecida ${p}.`);
    preds.set(k, list);
  }
  return { m, preds };
}
function topologica(rows) {
  const { m, preds } = grafo(rows),
    done = new Set(),
    order = [];
  while (order.length < m.size) {
    let moved = false;
    for (const key of m.keys())
      if (!done.has(key) && preds.get(key).every((p) => done.has(p))) {
        done.add(key);
        order.push(key);
        moved = true;
      }
    exigir(moved, "O grafo contém ciclo de dependências.");
  }
  return { m, preds, order };
}
function f269(d, spec) {
  const rows = lerTabela(d?.csv, spec.colunas);
  const { m, preds, order } = topologica(rows);
  const early = new Map();
  for (const k of order) {
    const start = Math.max(0, ...preds.get(k).map((p) => early.get(p).fim));
    const dur = m.get(k).duracao;
    exigir(dur > 0, "Duração deve ser positiva.");
    early.set(k, { inicio: start, fim: start + dur });
  }
  const end = Math.max(...[...early.values()].map((x) => x.fim)),
    late = new Map();
  for (const k of [...order].reverse()) {
    const succ = order.filter((x) => preds.get(x).includes(k));
    const fim = succ.length
      ? Math.min(...succ.map((x) => late.get(x).inicio))
      : end;
    late.set(k, { fim, inicio: fim - m.get(k).duracao });
  }
  const tab = order.map((k) => [
    k,
    m.get(k).duracao,
    arred(early.get(k).inicio),
    arred(early.get(k).fim),
    arred(late.get(k).inicio),
    arred(late.get(k).fim),
    arred(late.get(k).inicio - early.get(k).inicio),
    Math.abs(late.get(k).inicio - early.get(k).inicio) < 1e-8
      ? "Crítica"
      : "Folga",
  ]);
  return contas(
    spec,
    [
      ["Duração mínima do projeto", arred(end)],
      ["Tarefas críticas", tab.filter((x) => x[7] === "Crítica").length],
    ],
    [
      "Tarefa",
      "Duração",
      "Início cedo",
      "Fim cedo",
      "Início tardio",
      "Fim tardio",
      "Folga",
      "Situação",
    ],
    tab,
    [
      "CPM determinístico sem calendário de trabalho, recursos compartilhados ou incerteza de duração.",
    ],
  );
}
function f270(d, spec) {
  const rows = lerTabela(d?.csv, spec.colunas),
    { m, preds } = topologica(rows),
    cycle = numeroOpcao(d, "ciclo", 6, 0.001, 100000);
  exigir(rows.length <= 1000, "Até 1.000 tarefas por balanceamento.");
  for (const r of rows)
    exigir(
      r.duracao > 0 && r.duracao <= cycle,
      "Cada duração deve ser positiva e não exceder o ciclo.",
    );
  const succ = new Map(rows.map((r) => [r.tarefa, []]));
  for (const [task, ps] of preds) for (const p of ps) succ.get(p).push(task);
  const weight = new Map();
  function reachable(k) {
    const set = new Set();
    const stack = [...succ.get(k)];
    while (stack.length) {
      const x = stack.pop();
      if (set.has(x)) continue;
      set.add(x);
      stack.push(...succ.get(x));
    }
    return set;
  }
  for (const k of m.keys())
    weight.set(
      k,
      m.get(k).duracao +
        [...reachable(k)].reduce((sum, x) => sum + m.get(x).duracao, 0),
    );
  const stationOf = new Map(),
    done = new Set(),
    stations = [];
  while (done.size < rows.length) {
    const st = { tasks: [], left: cycle };
    stations.push(st);
    let moved = true;
    while (moved) {
      moved = false;
      const eligible = [...m.keys()]
        .filter((k) => !done.has(k) && preds.get(k).every((p) => done.has(p)))
        .sort(
          (a, b) =>
            weight.get(b) - weight.get(a) ||
            m.get(b).duracao - m.get(a).duracao ||
            a.localeCompare(b),
        );
      const task = eligible.find((k) => m.get(k).duracao <= st.left + 1e-9);
      if (task) {
        st.tasks.push(task);
        st.left -= m.get(task).duracao;
        done.add(task);
        stationOf.set(task, stations.length);
        moved = true;
      }
    }
    exigir(
      st.tasks.length > 0,
      "Não foi possível alocar tarefas elegíveis à estação.",
    );
  }
  const total = rows.reduce((s, r) => s + r.duracao, 0),
    eff = (total / (stations.length * cycle)) * 100,
    tab = stations.map((st, i) => [
      i + 1,
      st.tasks.join(", "),
      arred(cycle - st.left),
      arred(st.left),
    ]);
  return contas(
    spec,
    [
      ["Estações estimadas", stations.length],
      ["Tempo total de tarefa", arred(total)],
      ["Eficiência de balanceamento (%)", arred(eff)],
      ["Ociosidade total", arred(stations.reduce((s, x) => s + x.left, 0))],
    ],
    ["Estação", "Tarefas", "Carga", "Ociosidade"],
    tab,
    [
      "Heurística de maior peso posicional elegível; respeita precedências, não garante solução ótima.",
    ],
  );
}
function f271(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    { m, preds, order } = topologica(rs);
  exigir(rs.length <= 2000, "Até 2.000 ordens por programação.");
  const cap = numeroOpcao(d, "capacidade_dia", 8, 0.001, 24),
    machineFree = new Map(),
    schedule = new Map(),
    pending = new Set(order);
  let guard = 0;
  while (pending.size) {
    exigir(++guard <= order.length, "Ciclo de agenda.");
    const ready = [...pending]
      .filter((k) => preds.get(k).every((p) => schedule.has(p)))
      .sort(
        (a, b) =>
          m.get(a).prazo_horas - m.get(b).prazo_horas || a.localeCompare(b),
      );
    exigir(ready.length > 0, "Não foi possível resolver predecessoras.");
    for (const k of ready) {
      const r = m.get(k);
      exigir(r.duracao_horas > 0, "Duração deve ser positiva.");
      const start = Math.max(
          machineFree.get(r.maquina) || 0,
          ...preds.get(k).map((p) => schedule.get(p).fim),
        ),
        finish = start + r.duracao_horas;
      machineFree.set(r.maquina, finish);
      schedule.set(k, { inicio: start, fim: finish });
      pending.delete(k);
    }
  }
  const civil = (h) => ({ dia: Math.floor(h / cap) + 1, hora: arred(h % cap) }),
    tab = order.map((k) => {
      const r = m.get(k),
        a = schedule.get(k),
        late = Math.max(0, a.fim - r.prazo_horas),
        st = civil(a.inicio),
        fi = civil(a.fim);
      return [
        k,
        r.maquina,
        st.dia,
        st.hora,
        fi.dia,
        fi.hora,
        arred(late),
        late ? "Atrasada" : "No prazo",
      ];
    });
  return contas(
    spec,
    [
      ["Ordens", tab.length],
      ["Ordens atrasadas", tab.filter((x) => x[7] === "Atrasada").length],
      ["Horas úteis/dia", cap],
      [
        "Fim estimado (horas úteis)",
        arred(Math.max(...[...schedule.values()].map((x) => x.fim))),
      ],
    ],
    [
      "Ordem",
      "Máquina",
      "Dia início",
      "Hora início",
      "Dia fim",
      "Hora fim",
      "Atraso (h úteis)",
      "Situação",
    ],
    tab,
    [
      "Escalonamento determinístico por ordem topológica e prazo mais próximo; horas são acumuladas em turnos úteis iguais, sem feriados, setup, manutenção ou troca de turno.",
    ],
  );
}
function f272(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas);
  const tab = rs.map((r) => {
    exigir(
      r.unidades_boas > 0 && r.consumo_padrao_un >= 0 && r.consumo_real_un >= 0,
      "Produção boa deve ser positiva e consumo não negativo.",
    );
    const std = r.unidades_boas * r.consumo_padrao_un,
      delta = r.consumo_real_un - std;
    return [
      r.ordem,
      r.componente,
      arred(r.unidades_boas),
      arred(std),
      arred(r.consumo_real_un),
      arred(delta),
      arred(delta * r.custo_un),
    ];
  });
  return contas(
    spec,
    [
      ["Desvio total em quantidade", arred(tab.reduce((s, r) => s + r[5], 0))],
      [
        "Impacto financeiro a custo padrão",
        arred(tab.reduce((s, r) => s + r[6], 0)),
      ],
    ],
    [
      "Ordem",
      "Componente",
      "Unidades boas",
      "Consumo padrão",
      "Consumo real",
      "Variação",
      "Impacto a custo padrão",
    ],
    tab,
    [
      "Não separa variação de preço do material; padrão e real precisam usar unidade compatível.",
    ],
  );
}
function f273(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    rate = pct(numeroOpcao(d, "taxa_desconto_pct", 8, 0, 100)),
    horiz = numeroOpcao(d, "horizonte_anos", 3, 1, 30);
  exigir(Number.isInteger(horiz), "Horizonte deve ser inteiro.");
  const groups = new Map();
  for (const r of rs) {
    const a = groups.get(r.veiculo) || [];
    a.push(r);
    groups.set(r.veiculo, a);
  }
  const tab = [];
  for (const [vehicle, a] of groups) {
    const byYear = new Map();
    for (const r of a) {
      exigir(
        Number.isInteger(r.ano) && r.ano >= 0 && r.ano <= horiz,
        "Ano deve estar entre zero e o horizonte.",
      );
      exigir(!byYear.has(r.ano), "Ano duplicado para veículo " + vehicle + ".");
      byYear.set(r.ano, r);
    }
    exigir(
      byYear.size === horiz + 1,
      "Informe ano zero e cada ano operacional para " + vehicle + ".",
    );
    const y0 = byYear.get(0);
    let pv = y0.aquisicao,
      km = 0,
      energyPv = 0,
      maintPv = 0,
      replPv = 0;
    exigir(
      y0.km === 0 &&
        y0.energia === 0 &&
        y0.manutencao === 0 &&
        y0.reposicao === 0,
      "Ano zero deve conter só aquisição e nenhum custo operacional.",
    );
    for (let y = 1; y <= horiz; y++) {
      const r = byYear.get(y);
      exigir(r.aquisicao === 0, "Aquisição deve ficar no ano zero.");
      const disc = Math.pow(1 + rate, y);
      energyPv += r.energia / disc;
      maintPv += r.manutencao / disc;
      replPv += r.reposicao / disc;
      pv += (r.energia + r.manutencao + r.reposicao) / disc;
      km += r.km;
    }
    const residual = byYear.get(horiz).residual;
    exigir(
      a.every((r) => r.residual === 0 || r.ano === horiz),
      "Residual só pode aparecer no ano final.",
    );
    pv -= residual / Math.pow(1 + rate, horiz);
    exigir(pv >= 0, "Valor presente total de custo não pode ser negativo.");
    tab.push([
      vehicle,
      arred(y0.aquisicao),
      arred(energyPv),
      arred(maintPv),
      arred(replPv),
      arred(residual),
      arred(pv),
      arred(km),
      km ? arred(pv / km) : null,
    ]);
  }
  return contas(
    spec,
    [
      ["Veículos", tab.length],
      ["VP de TCO agregado", arred(tab.reduce((s, r) => s + r[6], 0))],
    ],
    [
      "Veículo",
      "Aquisição ano 0",
      "VP energia",
      "VP manutenção",
      "VP reposição",
      "Residual terminal",
      "VP TCO",
      "Km horizonte",
      "VP TCO/km",
    ],
    tab,
    [
      "Custos anuais descontados ao fim do ano; aquisição no ano 0 e residual no fim do horizonte. Não inclui financiamento, impostos ou inflação.",
    ],
  );
}
function f274(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas);
  exigir(rs.length <= 3, "A enumeração exata aceita até 3 produtos.");
  unica(rs, "produto", "Produto");
  const caps = ["a", "b", "c"].map((k) =>
      numeroOpcao(d, "limite_" + k, 0, 0, 1e9),
    ),
    n = rs.length;
  let best = null;
  const bounds = rs.map((_, i) => {
    const coeff = caps.map(
      (_, j) => rs[i]["recurso_" + String.fromCharCode(97 + j)],
    );
    if (!coeff.some((x) => x > 0)) {
      exigir(
        rs[i].contribuicao_un <= 0,
        "Problema ilimitado: produto " +
          rs[i].produto +
          " gera contribuição sem consumir recurso limitado.",
      );
      return 0;
    }
    const b = Math.floor(
      Math.min(
        ...caps.map((lim, j) => (coeff[j] > 0 ? lim / coeff[j] : Infinity)),
      ),
    );
    exigir(
      Number.isFinite(b) && b <= 1000,
      "Limite de unidades excede 1.000 por produto; reduza as unidades de recurso.",
    );
    return b;
  });
  exigir(
    bounds.reduce((prod, b) => prod * (b + 1), 1) <= 2000000,
    "O espaço de busca inteiro excede dois milhões de combinações; reduza capacidades ou itens.",
  );
  for (let a = 0; a <= (bounds[0] || 0); a++)
    for (let b = 0; b <= (bounds[1] || 0); b++)
      for (let c0 = 0; c0 <= (bounds[2] || 0); c0++) {
        const q = [a, b, c0].slice(0, n);
        let used = [0, 0, 0],
          v = 0;
        for (let i = 0; i < n; i++) {
          v += q[i] * rs[i].contribuicao_un;
          for (let j = 0; j < 3; j++)
            used[j] += q[i] * rs[i]["recurso_" + String.fromCharCode(97 + j)];
        }
        if (used.every((x, j) => x <= caps[j] + 1e-8) && (!best || v > best.v))
          best = { q, used, v };
      }
  exigir(best, "Nenhum plano viável encontrado.");
  const tab = rs.map((r, i) => [
    r.produto,
    best.q[i],
    arred(r.contribuicao_un),
    arred(best.q[i] * r.contribuicao_un),
  ]);
  return contas(
    spec,
    [
      ["Contribuição máxima", arred(best.v)],
      ["Unidades planejadas", best.q.reduce((s, x) => s + x, 0)],
    ],
    ["Produto", "Unidades", "Contribuição/un", "Contribuição"],
    tab,
    [
      "Enumeração inteira exata, porém limitada a três produtos; sem demanda máxima, setup, lote mínimo ou sequência.",
    ],
  );
}
function f275(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    groups = new Map();
  for (const r of rs) {
    const a = groups.get(r.ativo) || [];
    a.push(r);
    groups.set(r.ativo, a);
  }
  const tab = [...groups]
    .map(([asset, a]) => {
      const op = a.reduce((s, r) => s + r.horas_operadas, 0),
        fails = a.reduce((s, r) => s + r.falhas, 0),
        repair = a.reduce((s, r) => s + r.horas_reparo, 0);
      exigir(
        a.every((r) => Number.isSafeInteger(r.falhas)),
        "Falhas precisam ser contagem inteira por registro.",
      );
      exigir(
        Number.isSafeInteger(fails),
        "Total de falhas excede a precisão inteira.",
      );
      exigir(op > 0, "Cada ativo precisa ter horas operadas positivas.");
      exigir(
        fails > 0,
        "Cada ativo precisa ter ao menos uma falha registrada.",
      );
      return [
        asset,
        arred(op),
        fails,
        arred(repair),
        arred(op / fails),
        arred(repair / fails),
        arred((op / (op + repair)) * 100),
      ];
    })
    .sort((a, b) => a[6] - b[6]);
  return contas(
    spec,
    [
      ["Ativos", tab.length],
      [
        "Disponibilidade média (%)",
        arred(tab.reduce((s, r) => s + r[6], 0) / tab.length),
      ],
    ],
    [
      "Ativo",
      "Horas operadas",
      "Falhas",
      "Horas de reparo",
      "MTBF",
      "MTTR",
      "Disponibilidade inerente (%)",
    ],
    tab,
    [
      "MTBF/MTTR agregados não estimam vida útil nem causalidade; períodos de observação precisam ser comparáveis.",
    ],
  );
}
function minCostFlow(routes, demand, centers) {
  const cs = [...centers.keys()],
    rs = [...demand.keys()],
    N = 2 + cs.length + rs.length,
    S = N - 2,
    T = N - 1,
    g = Array.from({ length: N }, () => []);
  const add = (u, v, cap, cost, meta = null) => {
    const a = { to: v, rev: g[v].length, cap, cost, flow: 0, meta },
      b = { to: u, rev: g[u].length, cap: 0, cost: -cost, flow: 0, meta: null };
    g[u].push(a);
    g[v].push(b);
  };
  cs.forEach((c, i) => add(S, i, centers.get(c), 0));
  rs.forEach((r, j) => add(cs.length + j, T, demand.get(r), 0));
  for (const e of routes) {
    const i = cs.indexOf(e.centro),
      j = rs.indexOf(e.regiao);
    exigir(i >= 0 && j >= 0, "Rota referencia nó desconhecido.");
    add(
      i,
      cs.length + j,
      Math.min(centers.get(e.centro), demand.get(e.regiao)),
      e.custo,
      { centro: e.centro, regiao: e.regiao },
    );
  }
  let total = 0,
    cost = 0;
  while (true) {
    const dist = Array(N).fill(Infinity),
      prev = Array(N).fill(null),
      inQ = Array(N).fill(false),
      q = [S];
    dist[S] = 0;
    inQ[S] = true;
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      inQ[u] = false;
      for (let k = 0; k < g[u].length; k++) {
        const e = g[u][k];
        if (e.cap > 1e-9 && dist[e.to] > dist[u] + e.cost + 1e-12) {
          dist[e.to] = dist[u] + e.cost;
          prev[e.to] = [u, k];
          if (!inQ[e.to]) {
            q.push(e.to);
            inQ[e.to] = true;
          }
        }
      }
    }
    if (!prev[T]) break;
    let f = Infinity;
    for (let v = T; v !== S;) {
      const [u, k] = prev[v];
      f = Math.min(f, g[u][k].cap);
      v = u;
    }
    for (let v = T; v !== S;) {
      const [u, k] = prev[v],
        e = g[u][k],
        rev = g[v][e.rev];
      e.cap -= f;
      rev.cap += f;
      e.flow += f;
      rev.flow -= f;
      v = u;
    }
    total += f;
    cost += f * dist[T];
  }
  const alloc = [];
  for (let i = 0; i < cs.length; i++)
    for (const e of g[i])
      if (e.meta && e.flow > 1e-9)
        alloc.push([
          e.meta.centro,
          e.meta.regiao,
          e.flow,
          e.cost,
          e.flow * e.cost,
        ]);
  const leftD = new Map(
    rs.map((r, j) => [r, g[cs.length + j].find((e) => e.to === T).cap]),
  );
  return { alloc, leftD, cost, total };
}
function f276(d, spec) {
  const rs = lerTabela(d?.csv, spec.colunas),
    routes = rs.map((r) => ({
      centro: r.centro,
      regiao: r.regiao,
      custo: r.custo_un,
      cap: r.capacidade_centro,
    }));
  const centers = new Map(),
    demand = new Map();
  for (const r of rs) {
    const p = centers.get(r.centro);
    if (p !== undefined)
      exigir(
        Math.abs(p - r.capacidade_centro) < 1e-8,
        "Capacidade deve ser consistente por centro.",
      );
    centers.set(r.centro, r.capacidade_centro);
    const q = demand.get(r.regiao);
    if (q !== undefined)
      exigir(
        Math.abs(q - r.demanda_regiao) < 1e-8,
        "Demanda deve ser consistente por região.",
      );
    demand.set(r.regiao, r.demanda_regiao);
  }
  const result = minCostFlow(routes, demand, centers);
  const unmet = [...result.leftD.values()].reduce((s, x) => s + x, 0);
  return contas(
    spec,
    [
      ["Demanda total", arred([...demand.values()].reduce((s, x) => s + x, 0))],
      ["Alocada", arred(result.total)],
      ["Sem cobertura", arred(unmet)],
      ["Custo total da alocação", arred(result.cost)],
    ],
    ["Centro", "Região", "Unidades alocadas", "Custo/un", "Custo rota"],
    result.alloc.map((r) =>
      r.map((x) => (typeof x === "number" ? arred(x) : x)),
    ),
    [
      "Fluxo de custo mínimo em rede bipartida com custos lineares; tolerância numérica de 1e-9 em quantidade e 1e-12 na comparação de custo. Se capacidade for insuficiente, aloca o máximo possível e mostra a demanda descoberta.",
    ],
  );
}

const motores = {
  "fluxo-caixa-descontado": f252,
  "retorno-xirr-irregular": f253,
  "duration-convexidade-titulos": f254,
  "imunizacao-passivos-renda-fixa": f255,
  "wacc-cenarios-financeiros": f256,
  "orcamento-capital-vpl-tir": f257,
  "leasing-versus-compra-tco": f258,
  "ponte-variacao-preco-volume-mix": f259,
  "headroom-covenants-financeiros": f260,
  "sensibilidade-cambial-fluxos": f261,
  "stress-test-carteira-historico": f262,
  "atribuicao-brinson-fachler": f263,
  "drawdown-maximo-calmar": f264,
  "escada-vencimentos-liquidez-stress": f265,
  "valor-agregado-evm-projetos": f266,
  "priorizacao-investimentos-orcamento": f267,
  "ponte-contribuicao-preco-volume-custo": f268,
  "caminho-critico-cpm": f269,
  "balanceamento-linha-montagem": f270,
  "programacao-producao-capacidade-finita": f271,
  "desvio-consumo-materiais-producao": f272,
  "custo-ciclo-vida-frota": f273,
  "alocacao-producao-mix-margem": f274,
  "confiabilidade-ativos-mtbf-mttr": f275,
  "otimizacao-centros-distribuicao": f276,
};
export function executar(slug, dados) {
  const spec = porSlug.get(slug),
    motor = motores[slug];
  exigir(spec && motor, "Ferramenta financeira profissional não encontrada.");
  return motor(dados, spec);
}

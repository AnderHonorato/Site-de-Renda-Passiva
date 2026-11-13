import test from "node:test";
import assert from "node:assert/strict";
import { especificacoes } from "../dados/profissionais/financeiro.js";
import { executar } from "../servidor/profissionais/financeiro.mjs";
import { ErroProfissional } from "../servidor/profissionais/comum.mjs";

const spec = (slug) => especificacoes.find((x) => x.slug === slug);
const run = (slug, csv, opcoes = {}) => executar(slug, { csv, opcoes });
const close = (a, b, tol = 1e-5) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} difere de ${b}`);
const value = (r, label) => r.indicadores.find((x) => x[0] === label)?.[1];

test("F252–F276 processam cada exemplo declarado nas especificações", () => {
  assert.equal(especificacoes.length, 25);
  for (const s of especificacoes) {
    const opcoes = Object.fromEntries(s.opcoes.map((x) => [x.nome, x.padrao]));
    const r = executar(s.slug, { csv: s.exemplo, opcoes });
    assert.ok(r.titulo && r.metodo && r.colunas.length > 0, s.id);
  }
});

test("F252 DCF desconta fluxos e exige WACC maior que crescimento terminal", () => {
  const r = run("fluxo-caixa-descontado", "periodo;fluxo_caixa\n1;100\n2;110", {
    wacc: 10,
    crescimento_terminal: 2,
    caixa_liquido: 0,
  });
  close(value(r, "VP dos fluxos explícitos"), 100 / 1.1 + 110 / 1.1 ** 2);
  assert.throws(
    () =>
      run("fluxo-caixa-descontado", "periodo;fluxo_caixa\n1;100\n2;110", {
        wacc: 2,
        crescimento_terminal: 2,
      }),
    ErroProfissional,
  );
});

test("F253 XIRR convencional é única e rejeita múltiplas raízes ou raiz tangente", () => {
  const r = run(
    "retorno-xirr-irregular",
    "data;fluxo\n2024-01-01;121\n2023-01-01;-100",
    { taxa_referencia: 10 },
  );
  close(value(r, "XIRR anualizada (%)"), 21);
  close(value(r, "VPL à taxa de referência"), 10);
  for (const receipt of [230, 220])
    assert.throws(
      () =>
        run(
          "retorno-xirr-irregular",
          `data;fluxo\n2023-01-01;-100\n2024-01-01;${receipt}\n2024-12-31;${receipt === 230 ? -132 : -121}`,
        ),
      ErroProfissional,
    );
  close(
    value(
      run(
        "retorno-xirr-irregular",
        "data;fluxo\n2023-01-01;-100\n2024-01-01;0.01",
      ),
      "XIRR anualizada (%)",
    ),
    -99.99,
  );
  assert.throws(
    () =>
      run(
        "retorno-xirr-irregular",
        "data;fluxo\n2025-02-30;-100\n2026-01-01;120",
      ),
    ErroProfissional,
  );
});

test("F254 duration/convexidade confere preço zero-coupon e sensibilidade", () => {
  const r = run("duration-convexidade-titulos", "periodo;fluxo\n2;121", {
    yield_pct: 10,
    choque_bp: 0,
  });
  close(value(r, "Preço teórico"), 100);
  close(value(r, "Duration Macaulay"), 2);
});

test("F255 imunização calcula pesos de mercado sem misturar valor presente e duração", () => {
  const r = run(
    "imunizacao-passivos-renda-fixa",
    "tipo;periodo;fluxo\na tivo_a;2;105\nativo_b;5;125\npassivo;3;100".replace(
      "a tivo",
      "ativo",
    ),
    { yield_pct: 0 },
  );
  close(value(r, "Peso de mercado sugerido ativo A (%)"), 66.666667);
  close(value(r, "Duration combinada"), 3);
});

test("F256 WACC aplica pesos de capital e shield tributário", () => {
  const r = run(
    "wacc-cenarios-financeiros",
    "cenario;equity;divida;rf_pct;beta;erp_pct;kd_pct;imposto_pct\nbase;700;300;4;1;5;7;25",
  );
  close(r.linhas[0][4], 0.7 * 9 + 0.3 * 7 * 0.75);
});

test("F257 mantém VPL sem inventar contagem de raízes em fluxos não convencionais", () => {
  for (const [receipt, final] of [
    [230, -132],
    [220, -121],
  ]) {
    const r = run(
      "orcamento-capital-vpl-tir",
      `projeto;periodo;fluxo\nA;0;-100\nA;1;${receipt}\nA;2;${final}`,
      { taxa_desconto_pct: 10 },
    );
    close(r.linhas[0][1], -100 + receipt / 1.1 + final / 1.1 ** 2);
    assert.equal(r.linhas[0][2], null);
    assert.match(r.linhas[0][3], /não convencional/);
  }
  const conventional = run(
    "orcamento-capital-vpl-tir",
    "projeto;periodo;fluxo\nA;2;121\nA;0;-100",
    { taxa_desconto_pct: 0 },
  );
  close(conventional.linhas[0][2], 10);
  close(conventional.linhas[0][1], 21);
});

test("F258 desconta o residual no final do horizonte", () => {
  const r = run(
    "leasing-versus-compra-tco",
    "periodo;custo_compra;custo_leasing\n1;100;0",
    { taxa_desconto_pct: 10, residual_compra: 50, residual_leasing: 0 },
  );
  close(value(r, "VP do custo da compra"), 50 / 1.1);
});

test("F259 decompõe receita em efeitos preço, volume total e mix que conciliam", () => {
  const r = run(
    "ponte-variacao-preco-volume-mix",
    "produto;volume_base;preco_base;volume_atual;preco_atual\nA;100;10;120;11\nB;50;20;40;22",
  );
  close(value(r, "Variação de receita"), 200);
  close(
    r.linhas.reduce((s, x) => s + x[5], 0),
    200,
  );
  close(
    r.linhas.reduce((s, x) => s + x[6], 0),
    400 / 3,
  );
  close(
    r.linhas.reduce((s, x) => s + x[7], 0),
    -400 / 3,
  );
  close(
    r.linhas.reduce((s, x) => s + x[8], 0),
    200,
  );
  const tiny = run(
    "ponte-variacao-preco-volume-mix",
    "produto;volume_base;preco_base;volume_atual;preco_atual\nA;1;1;1;1.0000001\nB;1;1;1;1",
  );
  close(value(tiny, "Variação de receita"), 1e-7, 1e-8);
});

test("F260 identifica covenants acima dos limites", () => {
  const r = run(
    "headroom-covenants-financeiros",
    "cenario;divida_liquida;ebitda;juros;limite_alavancagem;minimo_cobertura\nbase;400;100;50;3;2",
  );
  assert.equal(r.linhas[0][6], "Revisar limite");
});

test("F261 rejeita choque cambial que produza taxa negativa", () => {
  assert.throws(
    () =>
      run(
        "sensibilidade-cambial-fluxos",
        "moeda;valor;taxa_base;choque_pct\nUSD;1;5;-100",
      ),
    ErroProfissional,
  );
});

test("F262 calcula cenários de stress sem atribuir probabilidade", () => {
  const r = run(
    "stress-test-carteira-historico",
    "cenario;ativo;peso_pct;retorno_pct\nS;A;60;-20\nS;B;40;-10",
  );
  close(r.linhas[0][5], -16);
  assert.throws(
    () =>
      run(
        "stress-test-carteira-historico",
        "cenario;ativo;peso_pct;retorno_pct\nS;A;50;-20",
      ),
    ErroProfissional,
  );
});

test("F263 atribuição Brinson–Fachler reconcilia alocação, seleção e interação", () => {
  const r = run(
    "atribuicao-brinson-fachler",
    "setor;peso_carteira_pct;peso_benchmark_pct;retorno_carteira_pct;retorno_benchmark_pct\nTecnologia;60;50;10;8\nIndústria;40;50;4;5",
  );
  close(value(r, "Excesso (%)"), 1.1);
  close(value(r, "Alocação (p.p.)"), 0.3);
  close(value(r, "Seleção (p.p.)"), 0.5);
  close(value(r, "Interação (p.p.)"), 0.3);
});

test("F264 drawdown mede queda desde pico e valida datas", () => {
  const r = run(
    "drawdown-maximo-calmar",
    "data;patrimonio\n2025-01-01;100\n2025-06-01;120\n2025-09-01;90\n2026-01-01;130",
  );
  close(value(r, "Drawdown máximo (%)"), 25);
  assert.throws(
    () =>
      run(
        "drawdown-maximo-calmar",
        "data;patrimonio\n2025-02-30;100\n2025-03-01;110",
      ),
    ErroProfissional,
  );
});

test("F265 escada de vencimentos aplica haircut e encontra déficit cumulativo", () => {
  const r = run(
    "escada-vencimentos-liquidez-stress",
    "periodo_meses;principal;juros_previstos;ativos_liquidos\n1;100;0;120\n2;50;0;100",
    { haircut_pct: 20 },
  );
  close(value(r, "Maior déficit cumulativo"), -70);
});

test("F266 EVM calcula índices e EAC por CPI", () => {
  const r = run(
    "valor-agregado-evm-projetos",
    "projeto;periodo;pv;ev;ac;bac\nP;2026-01;100;80;100;400\nP;2026-02;100;120;100;400",
  );
  close(r.linhas[0][8], 1);
  close(r.linhas[0][9], 1);
  close(r.linhas[0][10], 400);
});

test("F267 mochila escolhe combinação ótima e rejeita IDs repetidos e subcentavos", () => {
  const r = run(
    "priorizacao-investimentos-orcamento",
    "projeto;capital;vpl\nA;50;18\nB;40;17\nC;30;13",
    { orcamento: 70 },
  );
  close(value(r, "VPL agregado"), 30);
  close(value(r, "Capital usado"), 70);
  assert.throws(
    () =>
      run(
        "priorizacao-investimentos-orcamento",
        "projeto;capital;vpl\nA;100;10\nA;100;20",
        { orcamento: 100 },
      ),
    ErroProfissional,
  );
  assert.throws(
    () =>
      run(
        "priorizacao-investimentos-orcamento",
        "projeto;capital;vpl\nA;0.011;1",
        { orcamento: 0.019 },
      ),
    ErroProfissional,
  );
});

test("F268 contribuição por preço, volume e custo fecha com delta real", () => {
  const r = run(
    "ponte-contribuicao-preco-volume-custo",
    "produto;volume_base;preco_base;custo_base;volume_atual;preco_atual;custo_atual\nA;100;10;6;120;11;7",
  );
  close(value(r, "Variação conciliada"), 80);
  close(r.linhas[0][3], 120);
  close(r.linhas[0][4], 80);
  close(r.linhas[0][5], -120);
});

test("F269 caminho crítico resolve dependências e rejeita ciclo", () => {
  const r = run(
    "caminho-critico-cpm",
    "tarefa;duracao;predecessoras\nA;3;\nB;4;A\nC;2;A\nD;5;B,C",
  );
  close(value(r, "Duração mínima do projeto"), 12);
  assert.throws(
    () =>
      run("caminho-critico-cpm", "tarefa;duracao;predecessoras\nA;1;B\nB;1;A"),
    ErroProfissional,
  );
});

test("F270 balanceamento mantém predecessora na mesma estação ou anterior", () => {
  const r = run(
    "balanceamento-linha-montagem",
    "tarefa;duracao;predecessoras\nA;1;\nB;1;A",
    { ciclo: 2 },
  );
  const stationA = r.linhas.find((x) => x[1].split(", ").includes("A"))[0],
    stationB = r.linhas.find((x) => x[1].split(", ").includes("B"))[0];
  assert.ok(stationA <= stationB);
  assert.throws(
    () =>
      run(
        "balanceamento-linha-montagem",
        "tarefa;duracao;predecessoras\nA;1;B\nB;1;A",
        { ciclo: 2 },
      ),
    ErroProfissional,
  );
});

test("F271 agenda em horas úteis e preserva precedências", () => {
  const r = run(
    "programacao-producao-capacidade-finita",
    "ordem;maquina;duracao_horas;prazo_horas;predecessora\nA;M1;10;16;\nB;M1;6;20;A",
    { capacidade_dia: 8 },
  );
  assert.equal(r.linhas[0][1], "M1");
  assert.equal(r.linhas[1][2], 2);
  assert.equal(r.linhas[1][3], 2);
});

test("F272 calcula variação física e financeira de material", () => {
  const r = run(
    "desvio-consumo-materiais-producao",
    "ordem;componente;unidades_boas;consumo_padrao_un;consumo_real_un;custo_un\nO1;A;100;1,2;130;5",
  );
  close(value(r, "Desvio total em quantidade"), 10);
  close(value(r, "Impacto financeiro a custo padrão"), 50);
});

test("F273 desconta custo anual e residual no fim da vida útil", () => {
  const csv =
    "veiculo;ano;km;aquisicao;residual;energia;manutencao;reposicao\nV;0;0;100;0;0;0;0\nV;1;100;0;0;10;0;0\nV;2;100;0;50;10;0;0";
  const r = run("custo-ciclo-vida-frota", csv, {
    taxa_desconto_pct: 0,
    horizonte_anos: 2,
  });
  close(value(r, "VP de TCO agregado"), 70);
});

test("F274 resolve mix inteiro exato e rejeita problema ilimitado", () => {
  const r = run(
    "alocacao-producao-mix-margem",
    "produto;contribuicao_un;recurso_a;recurso_b;recurso_c\nA;50;2;1;0\nB;40;1;2;1",
    { limite_a: 4, limite_b: 3, limite_c: 1 },
  );
  close(value(r, "Contribuição máxima"), 100);
  assert.throws(
    () =>
      run(
        "alocacao-producao-mix-margem",
        "produto;contribuicao_un;recurso_a;recurso_b;recurso_c\nA;10;0;0;0",
        { limite_a: 1, limite_b: 1, limite_c: 1 },
      ),
    /ilimitado/,
  );
});

test("F275 calcula MTBF, MTTR e rejeita contagem fracionária de falha", () => {
  const r = run(
    "confiabilidade-ativos-mtbf-mttr",
    "ativo;horas_operadas;falhas;horas_reparo\nA;720;3;12",
  );
  close(r.linhas[0][4], 240);
  close(r.linhas[0][5], 4);
  assert.throws(
    () =>
      run(
        "confiabilidade-ativos-mtbf-mttr",
        "ativo;horas_operadas;falhas;horas_reparo\nA;720;1,5;12",
      ),
    ErroProfissional,
  );
});

test("F276 resolve alocação de custo mínimo sem guloso local", () => {
  const r = run(
    "otimizacao-centros-distribuicao",
    "centro;regiao;custo_un;capacidade_centro;demanda_regiao\nC1;Norte;1;1;1\nC1;Sul;2;1;1\nC2;Norte;2;1;1\nC2;Sul;100;1;1",
  );
  close(value(r, "Custo total da alocação"), 4);
  close(value(r, "Sem cobertura"), 0);
});

test("F255 investimentos e unidades casam VP e duration do passivo", () => {
  const r = run(
    "imunizacao-passivos-renda-fixa",
    "tipo;periodo;fluxo\nativo_a;2;105\nativo_b;5;125\npassivo;3;100",
    { yield_pct: 10 },
  );
  const a = value(r, "Unidades equivalentes ativo A"),
    b = value(r, "Unidades equivalentes ativo B");
  close((a * 105) / 1.1 ** 2 + (b * 125) / 1.1 ** 5, 100 / 1.1 ** 3, 0.0001);
  close(
    (a * 2 * 105) / 1.1 ** 2 + (b * 5 * 125) / 1.1 ** 5,
    (3 * 100) / 1.1 ** 3,
    0.0003,
  );
  close(
    value(r, "Investimento sugerido ativo A") +
      value(r, "Investimento sugerido ativo B"),
    100 / 1.1 ** 3,
  );
});

test("F258 desconta compra e leasing na mesma data mesmo com linhas desordenadas", () => {
  const r = run(
    "leasing-versus-compra-tco",
    "periodo;custo_compra;custo_leasing\n2;20;40\n0;100;10\n1;10;30",
    { taxa_desconto_pct: 10, residual_compra: 50, residual_leasing: 5 },
  );
  close(
    value(r, "VP do custo da compra"),
    100 + 10 / 1.1 + (20 - 50) / 1.1 ** 2,
  );
  close(
    value(r, "VP do custo do leasing"),
    10 + 30 / 1.1 + (40 - 5) / 1.1 ** 2,
  );
});

test("F259 reconcilia receita grande com variação relativamente pequena", () => {
  const r = run(
    "ponte-variacao-preco-volume-mix",
    "produto;volume_base;preco_base;volume_atual;preco_atual\nA;100000000;100000.00001;100000000;100000.00002\nB;200000000;200000;200000000;200000",
  );
  close(value(r, "Variação de receita"), 1000, 0.01);
  close(
    r.linhas.reduce((sum, row) => sum + row[8], 0),
    value(r, "Variação de receita"),
    0.01,
  );
});

test("F263 Brinson usa benchmark independente e não arredonda antes de conciliar muitos setores", () => {
  const sectors = Array.from(
    { length: 1000 },
    (_, i) => `S${i};0.1;0.1;${5 + i / 12345};5`,
  );
  const r = run(
    "atribuicao-brinson-fachler",
    "setor;peso_carteira_pct;peso_benchmark_pct;retorno_carteira_pct;retorno_benchmark_pct\n" +
      sectors.join("\n"),
  );
  close(value(r, "Seleção (p.p.)"), 999 / 2 / 12345, 0.000001);
  close(value(r, "Alocação (p.p.)"), 0);
  close(value(r, "Interação (p.p.)"), 0);
});

test("F264 Calmar fica indefinido sem drawdown e usa janela ACT/365", () => {
  const r = run(
    "drawdown-maximo-calmar",
    "data;patrimonio\n2023-01-01;100\n2024-01-01;121",
  );
  close(value(r, "CAGR (%)"), 21);
  assert.equal(value(r, "Calmar"), null);
});

test("F266 EVM preserva CPI/SPI distintos e estima EAC/ETC/VAC", () => {
  const r = run(
    "valor-agregado-evm-projetos",
    "projeto;periodo;pv;ev;ac;bac\nP;1;100;80;120;400",
  );
  close(r.linhas[0][6], -40);
  close(r.linhas[0][7], -20);
  close(r.linhas[0][8], 2 / 3);
  close(r.linhas[0][9], 0.8);
  close(r.linhas[0][10], 600);
  close(r.linhas[0][11], 480);
  close(r.linhas[0][12], -200);
});

test("F267 otimização em centavos bate enumeração independente em 40 instâncias", () => {
  let seed = 761;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed;
  };
  for (let trial = 0; trial < 40; trial++) {
    const items = Array.from({ length: 8 }, (_, i) => ({
        id: `P${i}`,
        c: random() % 70,
        v: (random() % 50) - 5,
      })),
      budget = 100;
    let best = 0;
    for (let mask = 0; mask < 256; mask++) {
      let spent = 0,
        benefit = 0;
      for (let i = 0; i < 8; i++)
        if (mask & (1 << i)) {
          spent += items[i].c;
          benefit += items[i].v;
        }
      if (spent <= budget) best = Math.max(best, benefit);
    }
    const csv =
      "projeto;capital;vpl\n" +
      items.map((x) => `${x.id};${x.c / 100};${x.v}`).join("\n");
    close(
      value(
        run("priorizacao-investimentos-orcamento", csv, { orcamento: 1 }),
        "VPL agregado",
      ),
      best,
    );
  }
  assert.throws(
    () =>
      run(
        "priorizacao-investimentos-orcamento",
        "projeto;capital;vpl\nA;0.0000000001;1",
        { orcamento: 1 },
      ),
    ErroProfissional,
  );
});

test("F270 ordem dentro da estação respeita precedências e duração é positiva", () => {
  const r = run(
    "balanceamento-linha-montagem",
    "tarefa;duracao;predecessoras\nC;1;B\nB;1;A\nA;1;",
    { ciclo: 3 },
  );
  assert.equal(r.linhas[0][1], "A, B, C");
  assert.throws(
    () =>
      run(
        "balanceamento-linha-montagem",
        "tarefa;duracao;predecessoras\nA;0;",
        { ciclo: 1 },
      ),
    ErroProfissional,
  );
});

test("F273 desconta cada categoria e residual em horizonte completo", () => {
  const r = run(
    "custo-ciclo-vida-frota",
    "veiculo;ano;km;aquisicao;residual;energia;manutencao;reposicao\nV;2;100;0;50;10;5;20\nV;0;0;100;0;0;0;0\nV;1;100;0;0;10;5;0",
    { taxa_desconto_pct: 10, horizonte_anos: 2 },
  );
  close(value(r, "VP de TCO agregado"), 100 + 15 / 1.1 + (35 - 50) / 1.1 ** 2);
});

test("F276 fluxo residual bate enumeração 2x2 independente em 80 redes", () => {
  let seed = 361;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed;
  };
  for (let trial = 0; trial < 80; trial++) {
    const caps = [1 + (random() % 4), 1 + (random() % 4)],
      demands = [1 + (random() % 4), 1 + (random() % 4)],
      costs = Array.from({ length: 4 }, () => random() % 30);
    let bestFlow = -1,
      bestCost = Infinity;
    for (let a = 0; a <= 4; a++)
      for (let b = 0; b <= 4; b++)
        for (let c = 0; c <= 4; c++)
          for (let e = 0; e <= 4; e++) {
            if (
              a + b > caps[0] ||
              c + e > caps[1] ||
              a + c > demands[0] ||
              b + e > demands[1]
            )
              continue;
            const flow = a + b + c + e,
              cost = a * costs[0] + b * costs[1] + c * costs[2] + e * costs[3];
            if (flow > bestFlow || (flow === bestFlow && cost < bestCost)) {
              bestFlow = flow;
              bestCost = cost;
            }
          }
    const routes = [];
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        routes.push(`C${i};R${j};${costs[i * 2 + j]};${caps[i]};${demands[j]}`);
    const r = run(
      "otimizacao-centros-distribuicao",
      "centro;regiao;custo_un;capacidade_centro;demanda_regiao\n" +
        routes.join("\n"),
    );
    close(value(r, "Alocada"), bestFlow);
    close(value(r, "Custo total da alocação"), bestCost);
    close(value(r, "Sem cobertura"), demands[0] + demands[1] - bestFlow);
  }
});

test("F252–F276 rejeitam casos degenerados específicos de cada domínio", () => {
  const cases = [
    ["F252", "periodo;fluxo_caixa\n1;10\n1;20"],
    ["F253", "data;fluxo\n2025-01-01;-100\n2025-01-01;120"],
    ["F254", "periodo;fluxo\n1;0"],
    ["F255", "tipo;periodo;fluxo\nativo_a;2;100\nativo_b;2;100\npassivo;2;100"],
    [
      "F256",
      "cenario;equity;divida;rf_pct;beta;erp_pct;kd_pct;imposto_pct\nbase;700;300;4;1;5;7;101",
    ],
    ["F257", "projeto;periodo;fluxo\nA;0;-100\nA;0;120"],
    ["F258", "periodo;custo_compra;custo_leasing\n0.5;100;50"],
    [
      "F259",
      "produto;volume_base;preco_base;volume_atual;preco_atual\nA;0;10;1;10\nB;0;10;1;10",
    ],
    [
      "F260",
      "cenario;divida_liquida;ebitda;juros;limite_alavancagem;minimo_cobertura\nS;100;0;10;3;2",
    ],
    ["F261", "moeda;valor;taxa_base;choque_pct\nUSD;100;0;0"],
    ["F262", "cenario;ativo;peso_pct;retorno_pct\nS;A;50;10\nS;A;50;20"],
    [
      "F263",
      "setor;peso_carteira_pct;peso_benchmark_pct;retorno_carteira_pct;retorno_benchmark_pct\nA;50;50;10;8\nA;50;50;5;4",
    ],
    ["F264", "data;patrimonio\n2025-01-01;100\n2026-01-01;0"],
    [
      "F265",
      "periodo_meses;principal;juros_previstos;ativos_liquidos\n1.5;100;1;120",
    ],
    [
      "F266",
      "projeto;periodo;pv;ev;ac;bac\nP;1;100;80;100;400\nP;1;100;80;100;400",
    ],
    ["F267", "projeto;capital;vpl\nA;1;10", { orcamento: 10000001 }],
    [
      "F268",
      "produto;volume_base;preco_base;custo_base;volume_atual;preco_atual;custo_atual\nA;-1;10;5;1;10;5",
    ],
    ["F269", "tarefa;duracao;predecessoras\nA;1;B"],
    ["F270", "tarefa;duracao;predecessoras\nA;1;B\nB;1;A"],
    [
      "F271",
      "ordem;maquina;duracao_horas;prazo_horas;predecessora\nA;M1;0;10;",
    ],
    [
      "F272",
      "ordem;componente;unidades_boas;consumo_padrao_un;consumo_real_un;custo_un\nA;B;0;1;10;1",
    ],
    [
      "F273",
      "veiculo;ano;km;aquisicao;residual;energia;manutencao;reposicao\nV;0;0;100;0;0;0;0",
    ],
    [
      "F274",
      "produto;contribuicao_un;recurso_a;recurso_b;recurso_c\nA;10;1;0;0\nA;20;1;0;0",
    ],
    [
      "F275",
      "ativo;horas_operadas;falhas;horas_reparo\nA;10;1.5;1\nA;10;1.5;1",
    ],
    [
      "F276",
      "centro;regiao;custo_un;capacidade_centro;demanda_regiao\nC;R1;1;10;5\nC;R2;1;20;5",
    ],
  ];
  assert.equal(cases.length, 25);
  for (const [id, csv, options = {}] of cases) {
    const tool = especificacoes.find((s) => s.id === id);
    assert.throws(() => run(tool.slug, csv, options), ErroProfissional, id);
  }
});

test("limites explícitos recusam TIR não representável e buscas excessivas", () => {
  const xirr = "data;fluxo\n2023-01-01;-100\n2024-01-01;0.0000000000001";
  assert.throws(() => run("retorno-xirr-irregular", xirr), ErroProfissional);
  const capital = run(
    "orcamento-capital-vpl-tir",
    "projeto;periodo;fluxo\nP;0;-100\nP;1;0.0000000000001",
  );
  assert.equal(capital.linhas[0][2], null);
  assert.match(capital.linhas[0][3], /intervalo numérico/);
  const projects =
    "projeto;capital;vpl\n" +
    Array.from({ length: 201 }, (_, i) => `P${i};1;1`).join("\n");
  assert.throws(
    () => run("priorizacao-investimentos-orcamento", projects),
    ErroProfissional,
  );
  const tasks =
    "tarefa;duracao;predecessoras\n" +
    Array.from({ length: 1001 }, (_, i) => `T${i};1;`).join("\n");
  assert.throws(
    () => run("balanceamento-linha-montagem", tasks),
    ErroProfissional,
  );
  const productHeader =
    "produto;contribuicao_un;recurso_a;recurso_b;recurso_c\n";
  assert.throws(
    () =>
      run("alocacao-producao-mix-margem", productHeader + "A;10;1;0;0", {
        limite_a: 1001,
      }),
    ErroProfissional,
  );
  assert.throws(
    () =>
      run(
        "alocacao-producao-mix-margem",
        productHeader + "A;10;1;0;0\nB;10;0;1;0\nC;10;0;0;1",
        { limite_a: 200, limite_b: 200, limite_c: 200 },
      ),
    ErroProfissional,
  );
});

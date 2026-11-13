import { especificacoes } from "../../dados/profissionais/dados.js";
import {
  lerTabela,
  numeroOpcao,
  relatorio,
  exigir,
  media,
  quantil,
  arredondar,
} from "./comum.mjs";

const group = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};
const pair = (...xs) => JSON.stringify(xs);
const count = (xs) => {
  const m = new Map();
  for (const x of xs) m.set(x, (m.get(x) || 0) + 1);
  return m;
};
const integer = (v, label) =>
  exigir(Number.isSafeInteger(v), `${label}: informe inteiro seguro.`);
const yn = (v) => {
  exigir(["sim", "nao", "não"].includes(v), "obrigatorio deve ser sim ou nao.");
  return v === "sim";
};
const day = (v) => {
  exigir(/^\d{4}-\d{2}-\d{2}$/.test(v), `Data ISO inválida: ${v}.`);
  const t = Date.parse(v + "T00:00:00Z");
  exigir(
    Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v,
    `Data inexistente: ${v}.`,
  );
  return t;
};
const instant = (v) => {
  exigir(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      v,
    ),
    `Instante exige ISO com fuso: ${v}.`,
  );
  day(v.slice(0, 10));
  const time = v.slice(11, 19).split(":").map(Number);
  exigir(time[0] < 24 && time[1] < 60 && time[2] < 60, "Horário ISO inválido.");
  if (!v.endsWith("Z")) {
    const z = v.slice(-5).split(":").map(Number);
    exigir(
      z[0] <= 14 && z[1] < 60 && (z[0] < 14 || z[1] === 0),
      "Fuso ISO inválido.",
    );
  }
  const x = Date.parse(v);
  exigir(Number.isFinite(x), "Instante inválido.");
  return x;
};
const iso = (ms) => new Date(ms).toISOString();
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const sets = (s) => new Set(s.split(" ").filter(Boolean));
const grams = (s) => {
  const x = `  ${s}  `;
  return new Set(
    Array.from({ length: x.length - 2 }, (_, i) => x.slice(i, i + 3)),
  );
};
const intersection = (a, b) => [...a].reduce((n, v) => n + Number(b.has(v)), 0);
const engine = {};
engine["entidades-fuzzy"] = (r, opt) => {
  exigir(r.length >= 2 && r.length <= 200, "Envie de 2 a 200 entidades.");
  exigir(
    new Set(r.map((x) => x.id)).size === r.length,
    "IDs devem ser únicos.",
  );
  const a = r.map((x) => {
    exigir(x.id.length <= 120, "ID excede 120 caracteres.");
    exigir(x.nome.length <= 120, "Nome excede 120 caracteres.");
    const s = norm(x.nome);
    exigir(
      s.length > 1,
      "Nome precisa conter ao menos dois caracteres normalizados.",
    );
    return { ...x, s, g: grams(s), w: sets(s) };
  });
  const out = [];
  let comparisons = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++) {
      const x = a[i],
        y = a[j];
      comparisons++;
      const dice = (2 * intersection(x.g, y.g)) / (x.g.size + y.g.size),
        inter = intersection(x.w, y.w),
        jac = inter / (x.w.size + y.w.size - inter),
        score = 0.7 * dice + 0.3 * jac;
      if (score >= opt.limiar)
        out.push([
          x.id,
          y.id,
          arredondar(score),
          arredondar(dice),
          arredondar(jac),
          "Revisar identidade; não mesclar automaticamente",
        ]);
    }
  exigir(
    out.length <= 10000,
    "Mais de 10000 pares candidatos; aumente o limiar ou divida o lote.",
  );
  out.sort((x, y) => y[2] - x[2]);
  return {
    indicadores: [
      ["Pares avaliados", comparisons],
      ["Pares candidatos", out.length],
    ],
    colunas: [
      "ID A",
      "ID B",
      "Similaridade",
      "Dice trigramas",
      "Jaccard palavras",
      "Ação",
    ],
    linhas: out,
  };
};
engine["dependencia-funcional"] = (r) => {
  const out = [];
  let repairs = 0;
  for (const [x, rows] of group(r, (z) => z.determinante)) {
    const c = count(rows.map((z) => z.dependente)),
      max = Math.max(...c.values()),
      rep = rows.length - max;
    repairs += rep;
    for (const [y, n] of c)
      out.push([
        x,
        y,
        n,
        c.size,
        rep,
        c.size > 1 ? "Revisar vínculo X→Y" : "Consistente",
      ]);
  }
  return {
    indicadores: [
      ["Reparos mínimos", repairs],
      [
        "Chaves conflitantes",
        new Set(out.filter((x) => x[3] > 1).map((x) => x[0])).size,
      ],
    ],
    colunas: [
      "Determinante",
      "Dependente",
      "Suporte",
      "Valores distintos",
      "Reparos da chave",
      "Ação",
    ],
    linhas: out,
  };
};
engine["integridade-referencial-dataset"] = (r) => {
  r.forEach((x) =>
    exigir(["pai", "filho"].includes(x.tipo), "tipo deve ser pai ou filho."),
  );
  const p = r.filter((x) => x.tipo === "pai"),
    f = r.filter((x) => x.tipo === "filho");
  exigir(p.length && f.length, "Informe pais e filhos.");
  const pc = count(p.map((x) => x.chave)),
    fc = count(f.map((x) => x.chave)),
    out = [];
  r.forEach((x, i) => {
    if ((x.tipo === "pai" ? pc : fc).get(x.chave) > 1)
      out.push([
        i + 1,
        x.tipo,
        x.chave,
        "Chave repetida",
        "Definir chave única",
      ]);
    if (x.tipo === "filho") {
      const n = pc.get(x.referencia) || 0;
      if (n !== 1)
        out.push([
          i + 1,
          x.tipo,
          x.chave,
          n ? "Referência ambígua" : "Referência órfã",
          "Revisar pai " + x.referencia,
        ]);
    }
  });
  return {
    indicadores: [
      ["Violações", out.length],
      ["Filhos", f.length],
    ],
    colunas: ["Linha", "Tipo", "Chave", "Violação", "Ação"],
    linhas: out,
  };
};
const typeValid = (v, t) => {
  if (t === "texto") return true;
  if (t === "inteiro")
    return /^-?\d+$/.test(v) && Number.isSafeInteger(Number(v));
  if (t === "decimal")
    return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(v) && Number.isFinite(Number(v));
  if (t === "booleano") return ["true", "false"].includes(v);
  if (t === "email") {
    // Separação literal evita retrocesso combinatório em domínios adversariais.
    if (v.length > 320 || /\s/.test(v)) return false;
    const parts = v.split("@");
    if (parts.length !== 2 || !parts[0] || parts[0].length > 64) return false;
    const domain = parts[1],
      dot = domain.lastIndexOf(".");
    return domain.length <= 253 && dot > 0 && dot < domain.length - 1;
  }
  if (t === "data") {
    try {
      day(v);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};
engine["contratos-celulas"] = (r) => {
  const allowed = ["texto", "inteiro", "decimal", "data", "booleano", "email"],
    rules = new Map(),
    seen = new Set(),
    out = [];
  for (const [i, x] of r.entries()) {
    exigir(allowed.includes(x.tipo), "Tipo de contrato não suportado.");
    const req = yn(x.obrigatorio),
      rule = pair(x.tipo, req);
    exigir(
      !rules.has(x.campo) || rules.get(x.campo) === rule,
      "Regras conflitantes para o mesmo campo.",
    );
    rules.set(x.campo, rule);
    const k = pair(x.registro, x.campo);
    exigir(!seen.has(k), "Célula repetida para registro/campo.");
    seen.add(k);
    const empty = x.valor === "∅" || x.valor === "";
    const ok = empty ? !req : typeValid(x.valor, x.tipo);
    if (!ok)
      out.push([
        i + 1,
        x.registro,
        x.campo,
        empty ? "Obrigatório ausente" : `Tipo ${x.tipo} inválido`,
        "Corrigir a célula ou o contrato",
      ]);
  }
  return {
    indicadores: [
      ["Células inválidas", out.length],
      [
        "Conformidade (%)",
        arredondar((100 * (r.length - out.length)) / r.length),
      ],
    ],
    colunas: ["Linha", "Registro", "Campo", "Violação", "Ação"],
    linhas: out,
  };
};
function cpf(s) {
  if (!/^\d{11}$/.test(s) || /^(\d)\1+$/.test(s)) return false;
  for (let j = 9; j < 11; j++) {
    let n = 0;
    for (let i = 0; i < j; i++) n += Number(s[i]) * (j + 1 - i);
    const d = (n * 10) % 11;
    if (Number(s[j]) !== (d === 10 ? 0 : d)) return false;
  }
  return true;
}
function luhn(s) {
  let sum = 0;
  for (let i = s.length - 1, j = 0; i >= 0; i--, j++) {
    let n = Number(s[i]);
    if (j % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0 && !/^(\d)\1+$/.test(s);
}
engine["auditoria-pii-heuristica"] = (r) => {
  const out = [];
  for (const x of r) {
    const v = x.valor.trim(),
      digits = v.replace(/[ .()+-]/g, "");
    let kind = "",
      evidence = "";
    if (typeValid(v, "email")) {
      kind = "Email";
      evidence = "Estrutura local@domínio";
    } else if (cpf(digits)) {
      kind = "CPF";
      evidence = "Dois dígitos verificadores válidos";
    } else if (/^\d{13,19}$/.test(digits) && luhn(digits)) {
      kind = "Possível cartão";
      evidence = "Comprimento 13–19 e Luhn";
    } else if (/^\d{10,13}$/.test(digits)) {
      kind = "Possível telefone";
      evidence = "10–13 dígitos; sem comprovação de titularidade";
    }
    if (kind)
      out.push([
        x.registro,
        x.campo,
        kind,
        "***" + (kind === "Email" ? "@***" : digits.slice(-2)),
        evidence,
        "Revisar finalidade, acesso e retenção",
      ]);
  }
  return {
    indicadores: [
      ["Células sinalizadas", out.length],
      ["Células examinadas", r.length],
    ],
    colunas: [
      "Registro",
      "Campo",
      "Categoria",
      "Mascarado",
      "Heurística",
      "Ação",
    ],
    linhas: out,
  };
};
engine["deriva-esquema"] = (r) => {
  const maps = { base: new Map(), atual: new Map() };
  for (const x of r) {
    exigir(Object.hasOwn(maps, x.versao), "versao deve ser base ou atual.");
    exigir(
      [
        "texto",
        "inteiro",
        "decimal",
        "booleano",
        "data",
        "objeto",
        "array",
      ].includes(x.tipo),
      "Tipo de esquema inválido.",
    );
    x.req = yn(x.obrigatorio);
    exigir(!maps[x.versao].has(x.campo), "Campo repetido na mesma versão.");
    maps[x.versao].set(x.campo, x);
  }
  exigir(maps.base.size && maps.atual.size, "Informe ambos os esquemas.");
  const out = [];
  for (const field of new Set([...maps.base.keys(), ...maps.atual.keys()])) {
    const a = maps.base.get(field),
      b = maps.atual.get(field);
    let kind = "",
      breaking = false;
    if (!b) {
      kind = "Campo removido";
      breaking = true;
    } else if (!a) {
      kind = b.req ? "Adição obrigatória" : "Adição opcional";
      breaking = b.req;
    } else {
      const changes = [];
      if (a.tipo !== b.tipo) {
        changes.push(`${a.tipo}→${b.tipo}`);
        breaking = !(a.tipo === "inteiro" && b.tipo === "decimal");
      }
      if (a.req !== b.req) {
        changes.push(b.req ? "Passou a obrigatório" : "Passou a opcional");
        breaking = true;
      }
      kind = changes.join("; ");
    }
    if (kind)
      out.push([
        field,
        a?.tipo || "—",
        b?.tipo || "—",
        kind,
        breaking ? "Potencial quebra" : "Compatível no modelo",
        breaking
          ? "Versionar contrato e testar consumidores"
          : "Registrar migração",
      ]);
  }
  return {
    indicadores: [
      ["Mudanças", out.length],
      [
        "Quebras potenciais",
        out.filter((x) => x[4] === "Potencial quebra").length,
      ],
    ],
    colunas: ["Campo", "Tipo base", "Tipo atual", "Mudança", "Risco", "Ação"],
    linhas: out,
  };
};
engine["consistencia-unidades"] = (r) => {
  const units = {
    mm: ["comprimento", "m", 0.001, 0],
    cm: ["comprimento", "m", 0.01, 0],
    m: ["comprimento", "m", 1, 0],
    km: ["comprimento", "m", 1000, 0],
    mg: ["massa", "kg", 0.000001, 0],
    g: ["massa", "kg", 0.001, 0],
    kg: ["massa", "kg", 1, 0],
    s: ["tempo", "s", 1, 0],
    min: ["tempo", "s", 60, 0],
    h: ["tempo", "s", 3600, 0],
    ml: ["volume", "l", 0.001, 0],
    l: ["volume", "l", 1, 0],
    C: ["temperatura", "K", 1, 273.15],
    F: ["temperatura", "K", 5 / 9, 273.15 - (32 * 5) / 9],
    K: ["temperatura", "K", 1, 0],
  };
  const dims = new Map();
  for (const x of r) {
    exigir(
      Object.hasOwn(units, x.unidade),
      "Unidade não suportada: " + x.unidade,
    );
    const d = units[x.unidade][0];
    if (!dims.has(x.serie)) dims.set(x.serie, new Set());
    dims.get(x.serie).add(d);
  }
  const out = r.map((x) => {
    const [d, u, a, b] = units[x.unidade],
      v = x.valor * a + b,
      bad = d === "temperatura" && v < 0,
      conflict = dims.get(x.serie).size > 1;
    return [
      x.serie,
      x.valor,
      x.unidade,
      arredondar(v),
      u,
      d,
      bad
        ? "Abaixo do zero absoluto"
        : conflict
          ? "Dimensões incompatíveis na série"
          : "Consistente",
    ];
  });
  return {
    indicadores: [
      ["Medições", r.length],
      ["Problemas", out.filter((x) => x[6] !== "Consistente").length],
    ],
    colunas: [
      "Série",
      "Valor",
      "Unidade",
      "Valor canônico",
      "Unidade canônica",
      "Dimensão",
      "Diagnóstico",
    ],
    linhas: out,
  };
};
engine["reconstrucao-sessoes"] = (r, opt) => {
  const out = [];
  r.forEach((x) => (x.ts = instant(x.instante)));
  for (const [u, events] of group(r, (x) => x.usuario)) {
    events.sort((a, b) => a.ts - b.ts);
    let session = [];
    const flush = () => {
      if (session.length)
        out.push([
          u,
          out.length + 1,
          iso(session[0].ts),
          iso(session.at(-1).ts),
          session.length,
          arredondar((session.at(-1).ts - session[0].ts) / 60000),
          session.length === 1 ? "Um evento" : "Múltiplos eventos",
        ]);
    };
    for (const x of events) {
      if (session.length && x.ts - session.at(-1).ts > opt.intervalo * 60000) {
        flush();
        session = [];
      }
      session.push(x);
    }
    flush();
  }
  return {
    indicadores: [
      ["Sessões", out.length],
      ["Sessões de um evento", out.filter((x) => x[4] === 1).length],
    ],
    colunas: [
      "Usuário",
      "Sessão",
      "Início",
      "Fim",
      "Eventos",
      "Duração (min)",
      "Perfil",
    ],
    linhas: out,
  };
};
engine["maquina-estados-pipeline"] = (r) => {
  const next = {
    inicio: ["recebido"],
    recebido: ["validado", "falha"],
    validado: ["processado", "falha"],
    processado: ["persistido", "falha"],
    persistido: [],
    falha: [],
  };
  const out = [];
  let invalid = 0,
    incomplete = 0;
  r.forEach((x, i) => {
    exigir(
      Object.hasOwn(next, x.evento) && x.evento !== "inicio",
      "Evento de pipeline inválido.",
    );
    x.ts = instant(x.instante);
    x.pos = i + 1;
  });
  for (const [e, events] of group(r, (x) => x.entidade)) {
    events.sort((a, b) => a.ts - b.ts || a.pos - b.pos);
    let state = "inicio";
    for (const x of events) {
      const ok = next[state].includes(x.evento);
      if (!ok) invalid++;
      out.push([
        e,
        x.pos,
        state,
        x.evento,
        ok ? "Válida" : "Transição ilegal",
        ok ? "Aplicar estado" : "Corrigir ordem ou evento",
      ]);
      if (ok) state = x.evento;
    }
    if (!["persistido", "falha"].includes(state)) incomplete++;
    out.push([
      e,
      null,
      state,
      "—",
      "Estado final",
      state === "persistido"
        ? "Concluído"
        : state === "falha"
          ? "Investigar falha"
          : "Pipeline incompleto",
    ]);
  }
  return {
    indicadores: [
      ["Transições ilegais", invalid],
      ["Entidades incompletas", incomplete],
    ],
    colunas: [
      "Entidade",
      "Linha",
      "Estado anterior",
      "Evento",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["slo-logs-http"] = (r, opt) => {
  r.forEach((x) => {
    integer(x.status, "status");
    exigir(x.status <= 599, "Status HTTP deve estar entre 100 e 599.");
    instant(x.instante);
  });
  const out = [];
  for (const [route, events] of group(r, (x) => x.rota)) {
    const errors = events.filter((x) => x.status >= 500).length,
      s = events.filter(
        (x) => x.status < 500 && x.duracao_ms <= opt.limite_ms,
      ).length,
      t = events.filter(
        (x) =>
          x.status < 500 &&
          x.duracao_ms > opt.limite_ms &&
          x.duracao_ms <= 4 * opt.limite_ms,
      ).length,
      rate = errors / events.length,
      budget = 1 - opt.slo / 100,
      burn = rate / budget;
    out.push([
      route,
      events.length,
      errors,
      arredondar(100 * (1 - rate)),
      arredondar(
        quantil(
          events.map((x) => x.duracao_ms),
          0.95,
        ),
      ),
      arredondar((s + t / 2) / events.length),
      arredondar(burn),
      arredondar(events.length * budget - errors),
      burn > 1
        ? "Orçamento excedido: investigar 5xx"
        : "Dentro do SLO observado",
    ]);
  }
  return {
    indicadores: [
      ["Rotas", out.length],
      ["Requisições", r.length],
    ],
    colunas: [
      "Rota",
      "Requisições",
      "Erros 5xx",
      "Sucesso (%)",
      "p95 (ms)",
      "Apdex",
      "Burn rate",
      "Saldo de erros permitido",
      "Ação",
    ],
    linhas: out,
  };
};
engine["traces-tempo-exclusivo"] = (r) => {
  exigir(r.length <= 1000, "Máximo de 1000 spans.");
  const out = [];
  let issues = 0;
  r.forEach((x) => {
    x.start = instant(x.inicio);
    x.end = x.start + x.duracao_ms;
  });
  for (const [trace, spans] of group(r, (x) => x.trace)) {
    const ids = new Map(),
      children = new Map();
    for (const x of spans) {
      exigir(!ids.has(x.span), "Span repetido no mesmo trace.");
      ids.set(x.span, x);
      children.set(x.span, []);
    }
    for (const x of spans)
      if (x.pai !== "—" && ids.has(x.pai)) children.get(x.pai).push(x);
    const color = new Map();
    const cycleNodes = new Set();
    for (const x of spans) {
      let y = x;
      const path = [],
        seen = new Set();
      while (y && !color.has(y.span)) {
        if (seen.has(y.span)) {
          for (const n of path) cycleNodes.add(n.span);
          break;
        }
        seen.add(y.span);
        path.push(y);
        y = ids.get(y.pai);
      }
      path.forEach((z) => color.set(z.span, 1));
    }
    const roots = spans.filter((x) => x.pai === "—").length;
    for (const x of spans) {
      const flags = [];
      if (x.pai !== "—" && !ids.has(x.pai)) flags.push("Pai ausente");
      if (cycleNodes.has(x.span)) flags.push("Ciclo de parentesco");
      if (roots !== 1) flags.push("Trace exige uma raiz");
      const p = ids.get(x.pai);
      if (p && (x.start < p.start || x.end > p.end))
        flags.push("Fora do intervalo do pai");
      const intervals = children
        .get(x.span)
        .map((c) => [Math.max(x.start, c.start), Math.min(x.end, c.end)])
        .filter(([a, b]) => b > a)
        .sort((a, b) => a[0] - b[0]);
      let total = 0,
        end = -Infinity;
      for (const [a, b] of intervals) {
        total += Math.max(0, b - Math.max(a, end));
        end = Math.max(end, b);
      }
      if (flags.length) issues++;
      out.push([
        trace,
        x.span,
        x.pai,
        x.duracao_ms,
        arredondar(Math.max(0, x.duracao_ms - total)),
        flags.join("; ") || "Consistente",
        flags.length
          ? "Reparar instrumentação"
          : "Avaliar gargalo pelo tempo exclusivo",
      ]);
    }
  }
  return {
    indicadores: [
      ["Spans", r.length],
      ["Spans com problema", issues],
    ],
    colunas: [
      "Trace",
      "Span",
      "Pai",
      "Duração (ms)",
      "Exclusivo (ms)",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["consistencia-cdc"] = (r) => {
  const out = [];
  let violations = 0;
  r.forEach((x) => {
    integer(x.sequencia, "sequencia");
    exigir(
      ["insert", "update", "delete"].includes(x.operacao),
      "Operação CDC inválida.",
    );
  });
  for (const [key, events] of group(r, (x) => x.chave)) {
    events.sort((a, b) => a.sequencia - b.sequencia);
    let state = null,
      prev = null;
    for (const x of events) {
      const issues = [];
      if (prev !== null && x.sequencia !== prev + 1)
        issues.push(
          x.sequencia === prev ? "Sequência duplicada" : "Lacuna de sequência",
        );
      const before = x.antes === "∅" ? null : x.antes,
        after = x.depois === "∅" ? null : x.depois;
      if (x.operacao === "insert") {
        if (state !== null) issues.push("Insert com registro existente");
        if (before !== null || after === null)
          issues.push("Insert exige antes ausente e depois presente");
      } else {
        if (state === null) issues.push("Registro inexistente");
        if (before !== state) issues.push("Preimagem divergente");
        if (x.operacao === "update" && after === null)
          issues.push("Update sem imagem posterior");
        if (x.operacao === "delete" && after !== null)
          issues.push("Delete com imagem posterior");
      }
      if (issues.length) violations++;
      else state = after;
      prev = x.sequencia;
      out.push([
        key,
        x.sequencia,
        x.operacao,
        issues.join("; ") || "Consistente",
        state === null ? "Ausente" : "Presente",
        issues.length
          ? "Reconciliar evento antes de aplicar"
          : "Evento aplicado",
      ]);
    }
  }
  return {
    indicadores: [
      ["Eventos inválidos", violations],
      ["Eventos", r.length],
    ],
    colunas: [
      "Chave",
      "Sequência",
      "Operação",
      "Diagnóstico",
      "Estado auditado",
      "Ação",
    ],
    linhas: out,
  };
};
engine["intervalos-dimensao"] = (r) => {
  r.forEach((x) => {
    x.start = day(x.inicio);
    x.end = day(x.fim);
    exigir(x.end > x.start, "Fim deve ser posterior ao início.");
  });
  const out = [];
  for (const [e, events] of group(r, (x) => x.entidade)) {
    events.sort((a, b) => a.start - b.start);
    let frontier = null;
    for (const x of events) {
      if (frontier !== null && x.start !== frontier)
        out.push([
          e,
          x.inicio,
          x.fim,
          x.start < frontier ? "Sobreposição" : "Lacuna",
          arredondar(
            (x.start < frontier
              ? Math.min(frontier, x.end) - x.start
              : x.start - frontier) / 86400000,
          ),
          x.start < frontier
            ? "Resolver versões concorrentes"
            : "Verificar período sem versão",
        ]);
      frontier = Math.max(frontier ?? x.end, x.end);
    }
  }
  return {
    indicadores: [
      ["Sobreposições", out.filter((x) => x[3] === "Sobreposição").length],
      ["Lacunas", out.filter((x) => x[3] === "Lacuna").length],
    ],
    colunas: [
      "Entidade",
      "Início atual",
      "Fim atual",
      "Problema",
      "Dias",
      "Ação",
    ],
    linhas: out,
  };
};
engine["idempotencia-requisicoes"] = (r) => {
  const out = [];
  for (const [key, events] of group(r, (x) => x.chave)) {
    const payloads = new Set(events.map((x) => x.assinatura)).size,
      results = new Set(events.map((x) => x.resultado)).size;
    out.push([
      key,
      events.length,
      payloads,
      results,
      payloads > 1
        ? "Colisão de payload"
        : results > 1
          ? "Resposta divergente"
          : events.length > 1
            ? "Retry consistente"
            : "Primeira ocorrência",
      payloads > 1 || results > 1
        ? "Bloquear reuso e investigar"
        : "Manter política de retenção",
    ]);
  }
  return {
    indicadores: [
      ["Chaves conflitantes", out.filter((x) => x[2] > 1 || x[3] > 1).length],
      ["Retries", r.length - out.length],
    ],
    colunas: [
      "Chave",
      "Requisições",
      "Payloads distintos",
      "Resultados distintos",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["prontidao-particoes"] = (r, opt) => {
  const seen = new Set();
  r.forEach((x) => {
    x.ts = day(x.particao);
    exigir(!seen.has(x.particao), "Partição repetida.");
    seen.add(x.particao);
    integer(x.esperado, "esperado");
    integer(x.recebido, "recebido");
    exigir(x.esperado > 0, "Contagem esperada deve ser positiva.");
  });
  r.sort((a, b) => a.ts - b.ts);
  let previous = null;
  let blocked = false;
  const out = r.map((x) => {
    const missing = Math.max(0, x.esperado - x.recebido),
      extra = Math.max(0, x.recebido - x.esperado),
      late = x.atraso_min > opt.sla_min,
      absent = previous === null ? 0 : (x.ts - previous) / 86400000 - 1;
    const ready = !missing && !extra && !late;
    blocked = blocked || absent > 0 || !ready;
    const gapStart =
      previous === null ? null : iso(previous + 86400000).slice(0, 10);
    previous = x.ts;
    return [
      x.particao,
      arredondar((x.recebido / x.esperado) * 100),
      missing,
      extra,
      x.atraso_min,
      ready ? "Pronta" : "Não pronta",
      absent,
      blocked ? "Bloqueada" : "Liberável",
      absent
        ? `Carregar ${absent} partição(ões) diária(s) ausente(s) a partir de ${gapStart}`
        : missing
          ? "Reprocessar carga incompleta"
          : extra
            ? "Revisar duplicação"
            : late
              ? "Rever agendamento"
              : blocked
                ? "Resolver bloqueio de partição anterior"
                : "Liberar partição",
    ];
  });
  return {
    indicadores: [
      [
        "Partições não prontas",
        out.filter((x) => x[5] === "Não pronta").length,
      ],
      ["Registros faltantes", out.reduce((n, x) => n + x[2], 0)],
      ["Partições diárias ausentes", out.reduce((n, x) => n + x[6], 0)],
      [
        "Partições com liberação bloqueada",
        out.filter((x) => x[7] === "Bloqueada").length,
      ],
    ],
    colunas: [
      "Partição",
      "Completude (%)",
      "Faltantes",
      "Excedentes",
      "Atraso (min)",
      "Status",
      "Partições ausentes antes",
      "Liberação sequencial",
      "Ação",
    ],
    linhas: out,
  };
};
engine["linhagem-impacto"] = (r) => {
  const nodes = new Set(r.flatMap((x) => [x.origem, x.destino]));
  exigir(
    [...nodes].every((x) => x.length <= 128),
    "Nome de ativo excede 128 caracteres.",
  );
  exigir(nodes.size <= 300, "Máximo de 300 ativos.");
  const adj = new Map([...nodes].map((n) => [n, new Set()])),
    indeg = new Map([...nodes].map((n) => [n, 0]));
  for (const x of r)
    if (!adj.get(x.origem).has(x.destino)) {
      adj.get(x.origem).add(x.destino);
      indeg.set(x.destino, indeg.get(x.destino) + 1);
    }
  const original = new Map(indeg),
    queue = [...nodes].filter((n) => !indeg.get(n)),
    order = [];
  while (queue.length) {
    const n = queue.shift();
    order.push(n);
    for (const d of adj.get(n)) {
      indeg.set(d, indeg.get(d) - 1);
      if (!indeg.get(d)) queue.push(d);
    }
  }
  exigir(
    order.length === nodes.size,
    "Linhagem contém ciclo; remova a dependência circular.",
  );
  const out = order.map((n, i) => {
    const reached = new Set(),
      stack = [...adj.get(n)];
    while (stack.length) {
      const d = stack.pop();
      if (reached.has(d)) continue;
      reached.add(d);
      stack.push(...adj.get(d));
    }
    return [
      n,
      i + 1,
      original.get(n),
      adj.get(n).size,
      reached.size,
      [...reached].sort().join(", "),
      reached.size ? "Testar consumidores antes de alterar" : "Ativo terminal",
    ];
  });
  return {
    indicadores: [
      ["Ativos", nodes.size],
      ["Arestas únicas", [...adj.values()].reduce((n, s) => n + s.size, 0)],
    ],
    colunas: [
      "Ativo",
      "Ordem topológica",
      "Entradas diretas",
      "Saídas diretas",
      "Impactados",
      "Ativos impactados",
      "Ação",
    ],
    linhas: out,
  };
};
engine["anonimato-diversidade"] = (r, opt) => {
  r.forEach((x) => {
    integer(x.idade, "idade");
    exigir(x.idade <= 130, "Idade acima de 130 anos.");
    exigir(/^\d{8}$/.test(x.cep), "CEP deve ter oito dígitos.");
  });
  const generalized = r.map((x) => ({
    ...x,
    age: Math.floor(x.idade / opt.faixa) * opt.faixa,
    zip: x.cep.slice(0, opt.prefixo) + "*".repeat(8 - opt.prefixo),
  }));
  const out = [];
  let risk = 0;
  for (const rows of group(generalized, (x) =>
    pair(x.age, x.zip, x.genero),
  ).values()) {
    const x = rows[0],
      l = new Set(rows.map((z) => z.sensivel)).size,
      bad = rows.length < opt.k || l < opt.diversidade;
    if (bad) risk += rows.length;
    out.push([
      `${x.age}–${x.age + opt.faixa - 1}`,
      x.zip,
      x.genero,
      rows.length,
      l,
      rows.length < opt.k ? "Abaixo de k" : "Atende k",
      l < opt.diversidade ? "Abaixo de l" : "Atende l",
      bad
        ? "Ampliar generalização ou suprimir grupo"
        : "Revisar outros riscos de identificação",
    ]);
  }
  return {
    indicadores: [
      ["Registros em grupos vulneráveis", risk],
      ["Menor grupo", Math.min(...out.map((x) => x[3]))],
    ],
    colunas: [
      "Faixa etária",
      "CEP generalizado",
      "Gênero",
      "Registros",
      "Diversidade sensível",
      "k-anonimato",
      "l-diversidade",
      "Ação",
    ],
    linhas: out,
  };
};
const hash = (s) => {
  let h = 2166136261;
  for (const b of new TextEncoder().encode(s)) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
engine["planejamento-shards"] = (r, opt) => {
  exigir(
    r.some((x) => x.bytes > 0),
    "Informe carga total positiva.",
  );
  const shards = Array.from({ length: opt.particoes }, () => ({
    records: 0,
    bytes: 0,
    keys: new Map(),
  }));
  for (const x of r) {
    integer(x.bytes, "bytes");
    const s = shards[hash(x.chave) % opt.particoes];
    s.records++;
    s.bytes += x.bytes;
    s.keys.set(x.chave, (s.keys.get(x.chave) || 0) + x.bytes);
  }
  const avg = media(shards.map((x) => x.bytes)),
    out = shards.map((x, i) => {
      const largest = Math.max(0, ...x.keys.values());
      return [
        i,
        x.records,
        x.keys.size,
        x.bytes,
        arredondar(x.bytes / avg),
        arredondar(x.bytes ? (largest / x.bytes) * 100 : 0),
        x.bytes > avg * 1.5
          ? "Rever chave quente ou aumentar capacidade"
          : x.bytes === 0
            ? "Partição vazia"
            : "Carga dentro do limite 1,5× média",
      ];
    });
  return {
    indicadores: [
      ["Bytes totais", shards.reduce((n, x) => n + x.bytes, 0)],
      [
        "Skew máximo/média",
        arredondar(Math.max(...shards.map((x) => x.bytes)) / avg),
      ],
    ],
    colunas: [
      "Shard",
      "Registros",
      "Chaves únicas",
      "Bytes",
      "Carga/média",
      "Maior chave (%)",
      "Ação",
    ],
    linhas: out,
  };
};
engine["lacunas-sequencias"] = (r) => {
  r.forEach((x) => integer(x.sequencia, "sequencia"));
  const out = [];
  let gaps = 0,
    duplicates = 0,
    regressions = 0;
  for (const [flow, events] of group(r, (x) => x.fluxo)) {
    let previous = null;
    const seen = new Set();
    for (const [i, x] of events.entries()) {
      if (seen.has(x.sequencia)) {
        duplicates++;
        out.push([
          flow,
          "Duplicata",
          x.sequencia,
          x.sequencia,
          1,
          i + 1,
          "Verificar retry",
        ]);
      }
      if (previous !== null && x.sequencia < previous) {
        regressions++;
        out.push([
          flow,
          "Regressão",
          x.sequencia,
          previous,
          previous - x.sequencia,
          i + 1,
          "Revisar ordem de entrega",
        ]);
      }
      previous = x.sequencia;
      seen.add(x.sequencia);
    }
    const values = [...seen].sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++)
      if (values[i] - values[i - 1] > 1) {
        const n = values[i] - values[i - 1] - 1;
        gaps += n;
        out.push([
          flow,
          "Lacuna",
          values[i - 1] + 1,
          values[i] - 1,
          n,
          null,
          "Reconciliar intervalo ausente",
        ]);
      }
  }
  return {
    indicadores: [
      ["Números ausentes", gaps],
      ["Duplicatas", duplicates],
      ["Regressões", regressions],
    ],
    colunas: [
      "Fluxo",
      "Problema",
      "Início",
      "Fim",
      "Quantidade/diferença",
      "Posição no fluxo",
      "Ação",
    ],
    linhas: out,
  };
};
function version(s) {
  exigir(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(s),
    "Versão estável deve ter major.minor.patch sem zeros iniciais.",
  );
  const a = s.split(".").map(Number);
  a.forEach((x) =>
    exigir(
      Number.isSafeInteger(x) && x <= 1000000000,
      "Componente SemVer excede limite.",
    ),
  );
  return a;
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
engine["compatibilidade-semver"] = (r) => {
  const out = r.map((x) => {
    const prefix = x.restricao[0],
      op = ["^", "~"].includes(prefix) ? prefix : "=",
      lower = version(op === "=" ? x.restricao : x.restricao.slice(1)),
      installed = version(x.instalada);
    let upper = null;
    if (op === "~") upper = [lower[0], lower[1] + 1, 0];
    if (op === "^")
      upper = lower[0]
        ? [lower[0] + 1, 0, 0]
        : lower[1]
          ? [0, lower[1] + 1, 0]
          : [0, 0, lower[2] + 1];
    const ok =
      op === "="
        ? cmp(installed, lower) === 0
        : cmp(installed, lower) >= 0 && cmp(installed, upper) < 0;
    return [
      x.pacote,
      x.restricao,
      x.instalada,
      lower.join("."),
      upper ? upper.join(".") : "Igualdade exata",
      ok ? "Compatível" : "Incompatível",
      ok ? "Manter lockfile" : "Alinhar versão e testar integração",
    ];
  });
  return {
    indicadores: [
      [
        "Dependências incompatíveis",
        out.filter((x) => x[5] === "Incompatível").length,
      ],
      ["Dependências", r.length],
    ],
    colunas: [
      "Pacote",
      "Restrição",
      "Instalada",
      "Inferior inclusivo",
      "Superior exclusivo",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["perfil-estrutura-json"] = (_, opt, data) => {
  exigir(
    typeof data.texto === "string" &&
      new TextEncoder().encode(data.texto).length <= 1048576,
    "JSON deve ser texto de até 1 MB.",
  );
  let records;
  try {
    records = JSON.parse(data.texto);
  } catch {
    exigir(false, "JSON inválido.");
  }
  exigir(
    Array.isArray(records) && records.length >= 2 && records.length <= 1000,
    "JSON deve conter array de 2 a 1000 objetos.",
  );
  exigir(
    records.every(
      (x) => x !== null && typeof x === "object" && !Array.isArray(x),
    ),
    "Cada registro JSON deve ser objeto.",
  );
  const profiles = new Map();
  let visits = 0;
  const typ = (v) =>
    v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
  const walk = (v, path, record, depth) => {
    exigir(depth <= 20, "Profundidade JSON excede 20.");
    exigir(++visits <= 50000, "JSON excede 50000 nós.");
    let p = profiles.get(path);
    if (!p) {
      p = { types: new Set(), present: new Set(), nulls: new Set() };
      profiles.set(path, p);
    }
    p.types.add(typ(v));
    p.present.add(record);
    if (v === null) p.nulls.add(record);
    else if (Array.isArray(v))
      for (const x of v) walk(x, path + "/~2", record, depth + 1);
    else if (typeof v === "object")
      for (const [k, x] of Object.entries(v))
        walk(
          x,
          path + "/" + k.replace(/~/g, "~0").replace(/\//g, "~1"),
          record,
          depth + 1,
        );
  };
  records.forEach((r, i) => walk(r, "", i, 0));
  exigir(profiles.size <= 10000, "Mais de 10000 caminhos estruturais.");
  const out = [...profiles].map(([path, p]) => {
    const types = [...p.types].sort(),
      conflict = types.filter((x) => x !== "null").length > 1;
    return [
      path || "(raiz)",
      types.join(" | "),
      p.present.size,
      arredondar((p.present.size / records.length) * 100),
      p.nulls.size,
      p.present.size === records.length
        ? "Presente em todos"
        : "Opcional na amostra",
      conflict
        ? "Conflito de tipo: definir contrato"
        : "Documentar contrato observado",
    ];
  });
  return {
    indicadores: [
      ["Registros", records.length],
      [
        "Caminhos com tipos conflitantes",
        out.filter((x) => x[6].startsWith("Conflito")).length,
      ],
    ],
    colunas: [
      "Caminho (~2 = item array)",
      "Tipos",
      "Registros presentes",
      "Presença (%)",
      "Registros com null",
      "Presença",
      "Ação",
    ],
    linhas: out,
  };
};
engine["taxonomia-enumeracoes"] = (r) => {
  const maps = new Map(),
    observations = [];
  for (const x of r) {
    exigir(["mapa", "dado"].includes(x.tipo), "tipo deve ser mapa ou dado.");
    if (x.tipo === "mapa") {
      const k = pair(x.campo, x.valor);
      if (!maps.has(k)) maps.set(k, new Set());
      maps.get(k).add(x.canonico);
    } else observations.push(x);
  }
  exigir(maps.size && observations.length, "Informe mapas e dados.");
  const out = [];
  let covered = 0;
  for (const rows of group(observations, (x) =>
    pair(x.campo, x.valor),
  ).values()) {
    const x = rows[0],
      dest = maps.get(pair(x.campo, x.valor)),
      size = dest?.size || 0;
    if (size === 1) covered += rows.length;
    out.push([
      x.campo,
      x.valor,
      rows.length,
      dest ? [...dest].join(" | ") : "—",
      size === 1 ? "Mapeado" : size ? "Ambíguo" : "Sem mapa",
      size === 1
        ? "Aplicar canônico"
        : size
          ? "Resolver destinos conflitantes"
          : "Adicionar valor à taxonomia",
    ]);
  }
  for (const [key, dest] of maps)
    if (
      dest.size > 1 &&
      !observations.some((x) => pair(x.campo, x.valor) === key)
    ) {
      const [field, value] = JSON.parse(key);
      out.push([
        field,
        value,
        0,
        [...dest].join(" | "),
        "Ambíguo",
        "Resolver destinos conflitantes",
      ]);
    }
  return {
    indicadores: [
      [
        "Cobertura não ambígua (%)",
        arredondar((100 * covered) / observations.length),
      ],
      ["Observações", observations.length],
    ],
    colunas: [
      "Campo",
      "Valor origem",
      "Frequência",
      "Canônico",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["sobrevivencia-master-data"] = (r) => {
  const seen = new Set();
  for (const x of r) {
    integer(x.prioridade, "prioridade");
    const k = pair(x.entidade, x.campo, x.fonte);
    exigir(!seen.has(k), "Fonte repetida no mesmo atributo.");
    seen.add(k);
  }
  const out = [];
  for (const rows of group(r, (x) => pair(x.entidade, x.campo)).values()) {
    const priority = Math.min(...rows.map((x) => x.prioridade)),
      winning = rows.filter((x) => x.prioridade === priority),
      values = new Set(winning.map((x) => x.valor)),
      conflict = new Set(rows.map((x) => x.valor)).size > 1;
    out.push([
      rows[0].entidade,
      rows[0].campo,
      values.size === 1 ? [...values][0] : null,
      priority,
      winning.map((x) => x.fonte).join(", "),
      values.size > 1
        ? "Empate irresolvido"
        : conflict
          ? "Conflito resolvido por prioridade"
          : "Consenso",
      values.size > 1
        ? "Revisão humana obrigatória"
        : conflict
          ? "Reconciliar fontes vencidas"
          : "Preservar proveniência",
    ]);
  }
  return {
    indicadores: [
      ["Atributos pendentes", out.filter((x) => x[2] === null).length],
      ["Atributos", out.length],
    ],
    colunas: [
      "Entidade",
      "Campo",
      "Valor sobrevivente",
      "Prioridade",
      "Fontes vencedoras",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["watermark-eventos"] = (r, opt) => {
  r.forEach((x, i) => {
    x.event = instant(x.evento_em);
    x.arrival = instant(x.recebido_em);
    x.pos = i + 1;
    exigir(x.arrival >= x.event, "Recebimento não pode anteceder evento.");
  });
  r.sort((a, b) => a.arrival - b.arrival || a.pos - b.pos);
  const maxima = new Map(),
    out = [];
  let late = 0;
  for (const x of r) {
    const max = maxima.get(x.fluxo),
      watermark = max === undefined ? null : max - opt.tolerancia * 60000,
      isLate = watermark !== null && x.event < watermark;
    if (isLate) late++;
    out.push([
      x.fluxo,
      x.pos,
      x.evento_em,
      x.recebido_em,
      arredondar((x.arrival - x.event) / 60000),
      watermark === null ? null : iso(watermark),
      isLate
        ? "Tardio"
        : max !== undefined && x.event < max
          ? "Fora de ordem"
          : "Em ordem",
      isLate ? "Aplicar política de correção tardia" : "Aceitar na janela",
    ]);
    maxima.set(x.fluxo, Math.max(max ?? x.event, x.event));
  }
  return {
    indicadores: [
      ["Eventos tardios", late],
      ["Eventos", r.length],
    ],
    colunas: [
      "Fluxo",
      "Linha",
      "Evento em",
      "Recebido em",
      "Transporte (min)",
      "Watermark anterior",
      "Diagnóstico",
      "Ação",
    ],
    linhas: out,
  };
};
engine["fanout-juncoes"] = (r) => {
  r.forEach((x) =>
    exigir(
      ["esquerda", "direita"].includes(x.lado),
      "lado deve ser esquerda ou direita.",
    ),
  );
  const l = count(r.filter((x) => x.lado === "esquerda").map((x) => x.chave)),
    rr = count(r.filter((x) => x.lado === "direita").map((x) => x.chave));
  exigir(l.size && rr.size, "Informe dados dos dois lados.");
  let inner = 0,
    left = 0,
    m2m = 0;
  const out = [];
  for (const key of new Set([...l.keys(), ...rr.keys()])) {
    const a = l.get(key) || 0,
      b = rr.get(key) || 0,
      n = a * b;
    inner += n;
    left += a * Math.max(1, b);
    if (a > 1 && b > 1) m2m++;
    out.push([
      key,
      a,
      b,
      n,
      a * Math.max(1, b),
      a ? arredondar(n / a) : null,
      a > 1 && b > 1
        ? "Muitos-para-muitos"
        : !a || !b
          ? "Sem correspondência"
          : "Correspondência",
      a > 1 && b > 1
        ? "Agregar ou corrigir granularidade antes do join"
        : !a || !b
          ? "Revisar cobertura de chaves"
          : "Confirmar cardinalidade esperada",
    ]);
  }
  return {
    indicadores: [
      ["Linhas inner join", inner],
      ["Linhas left join", left],
      ["Chaves muitos-para-muitos", m2m],
    ],
    colunas: [
      "Chave",
      "Linhas esquerda",
      "Linhas direita",
      "Inner join",
      "Left join",
      "Amplificação esquerda",
      "Relação",
      "Ação",
    ],
    linhas: out,
  };
};

export function executar(slug, dados) {
  const spec = especificacoes.find((s) => s.slug === slug);
  exigir(Boolean(spec), "Ferramenta de dados desconhecida.");
  exigir(
    dados && typeof dados === "object" && !Array.isArray(dados),
    "Informe um objeto de entrada.",
  );
  exigir(
    dados.opcoes === undefined ||
      (dados.opcoes !== null &&
        typeof dados.opcoes === "object" &&
        !Array.isArray(dados.opcoes)),
    "opcoes deve ser objeto.",
  );
  exigir(
    !dados.opcoes ||
      Object.keys(dados.opcoes).every((k) =>
        spec.opcoes.some((o) => o.nome === k),
      ),
    "Opção desconhecida para esta ferramenta.",
  );
  const options = {};
  for (const o of spec.opcoes) {
    options[o.nome] = numeroOpcao(dados, o.nome, o.padrao, o.minimo, o.maximo);
    if (["particoes", "k", "faixa", "prefixo", "diversidade"].includes(o.nome))
      integer(options[o.nome], o.rotulo);
  }
  const rows =
    spec.entrada === "tabela" ? lerTabela(dados.csv, spec.colunas) : [];
  if (spec.entrada === "tabela")
    exigir(rows.length > 0, "Informe ao menos uma linha de dados.");
  const result = engine[slug](rows, options, dados);
  return relatorio(spec, { ...result, notas: [spec.limites], series: [] });
}

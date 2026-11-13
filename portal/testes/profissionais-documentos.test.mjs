import test from "node:test";
import assert from "node:assert/strict";
import { especificacoes } from "../dados/profissionais/documentos.js";
import { executar } from "../servidor/profissionais/documentos.mjs";
import { ErroProfissional } from "../servidor/profissionais/comum.mjs";

const esperado = new Map([
  ["referencias-cruzadas-documento", ["Achados", 3]],
  ["concordancia-terminologica", ["Variantes encontradas", 2]],
  ["matriz-rastreabilidade-requisitos", ["Com menção posterior", 1]],
  ["clausulas-quase-duplicadas", ["Pares semelhantes", 1]],
  ["diff-hierarquico-documentos", ["Mudanças", 1]],
  ["segmentador-estrutural-documento", ["Trechos", 3]],
  ["integridade-numeracao-secoes", ["Achados", 2]],
  ["auditor-rfc2119-normativo", ["Declarações normativas", 3]],
  ["extrator-acoes-atas", ["Campos faltantes", 2]],
  ["auditor-blocos-codigo-markdown", ["Achados", 0]],
  ["consistencia-versoes-semver-documentos", ["Versões distintas", 2]],
  ["consistencia-unidades-documento", ["Medidas", 4]],
  ["validador-legendas-srt-vtt", ["Com avisos", 1]],
  ["diff-openapi-compatibilidade", ["Mudanças", 1]],
  ["validador-sbom-spdx-cyclonedx", ["Achados", 0]],
  ["auditoria-acessibilidade-markdown", ["Achados", 1]],
  ["validar-placeholders-icu", ["Divergências", 0]],
  ["normalizador-referencias-bibliograficas", ["Duplicatas", 1]],
  ["integridade-tabelas-markdown", ["Linhas inconsistentes", 1]],
  ["validador-frontmatter-documentacao", ["Achados", 0]],
  ["auditoria-exemplos-configuracao", ["Achados", 0]],
  ["rastreabilidade-achados-seguranca", ["Conflitos", 1]],
  ["completude-modelo-documental", ["Ausentes", 1]],
  ["auditor-proveniencia-figuras-tabelas", ["Sem fonte", 2]],
  ["auditor-urls-documentacao", ["Avisos", 2]],
]);

test("as 25 especificações têm IDs únicos e exemplos executáveis", () => {
  assert.equal(especificacoes.length, 25);
  assert.deepEqual(
    especificacoes.map((s) => s.id),
    Array.from({ length: 25 }, (_, i) => `F${327 + i}`),
  );
  assert.equal(new Set(especificacoes.map((s) => s.slug)).size, 25);
  for (const spec of especificacoes) {
    const r = executar(spec.slug, {
      texto: spec.exemplo,
      opcoes: Object.fromEntries(spec.opcoes.map((o) => [o.nome, o.padrao])),
    });
    assert.equal(r.titulo, spec.nome, spec.id);
    assert.ok(Array.isArray(r.linhas), spec.id);
    assert.equal(r.linhas.length <= 10000, true, spec.id);
    const known = esperado.get(spec.slug);
    assert.ok(known, `Falta resultado conhecido para ${spec.id}`);
    assert.notEqual(spec.nomeEn, spec.nome, `Título inglês de ${spec.id}`);
    assert.ok(spec.processa.length > 40 && spec.limites.length > 40);
    assert.equal(
      r.indicadores.find(([n]) => n === known[0])?.[1],
      known[1],
      spec.id,
    );
  }
});

test("a matriz REQ separa declarações de evidências e calcula cobertura reproduzível", () => {
  const r = executar("matriz-rastreabilidade-requisitos", {
    texto:
      "REQ-1: Deve haver exportação.\nREQ-2: Deve haver histórico.\n\nImplementação cobre REQ-1.",
  });
  assert.equal(r.indicadores.find(([n]) => n === "Cobertura (%)")[1], 50);
  assert.deepEqual(
    r.linhas.map((x) => x[3]),
    ["Coberto por menção", "Sem evidência posterior"],
  );
});

test("diff OpenAPI marca remoção de endpoint e aceita versão idêntica", () => {
  const v1 = {
    openapi: "3.0.0",
    paths: { "/x": { get: { responses: { 200: { description: "ok" } } } } },
  };
  const v2 = { openapi: "3.0.0", paths: {} };
  const removido = executar("diff-openapi-compatibilidade", {
    texto: `${JSON.stringify(v1)}\n--- VERSÃO 2 ---\n${JSON.stringify(v2)}`,
  });
  assert.equal(removido.linhas[0][3], "Breaking");
  const igual = executar("diff-openapi-compatibilidade", {
    texto: `${JSON.stringify(v1)}\n--- VERSÃO 2 ---\n${JSON.stringify(v1)}`,
  });
  assert.equal(igual.indicadores.find(([n]) => n === "Mudanças")[1], 0);
});

test("SBOM e subtitles rejeitam conteúdo inválido", () => {
  assert.throws(
    () => executar("validador-sbom-spdx-cyclonedx", { texto: "{bad" }),
    ErroProfissional,
  );
  assert.throws(
    () => executar("validador-legendas-srt-vtt", { texto: "sem timestamp" }),
    ErroProfissional,
  );
});

test("entrada documental aplica limites de tamanho e exige texto", () => {
  assert.throws(
    () => executar("auditor-urls-documentacao", { texto: "" }),
    ErroProfissional,
  );
  assert.throws(
    () =>
      executar("auditor-urls-documentacao", { texto: "x".repeat(1_000_001) }),
    ErroProfissional,
  );
  assert.throws(
    () => executar("auditor-urls-documentacao", { texto: "x\u0000y" }),
    ErroProfissional,
  );
});

test("opções numéricas rejeitam limiares fora do intervalo", () => {
  assert.throws(
    () =>
      executar("clausulas-quase-duplicadas", {
        texto: especificacoes.find(
          (s) => s.slug === "clausulas-quase-duplicadas",
        ).exemplo,
        opcoes: { limiar: 101 },
      }),
    ErroProfissional,
  );
  assert.throws(
    () =>
      executar("segmentador-estrutural-documento", {
        texto: especificacoes.find(
          (s) => s.slug === "segmentador-estrutural-documento",
        ).exemplo,
        opcoes: { alvo: 10 },
      }),
    ErroProfissional,
  );
});

test("glossário trata metacaracteres como texto e limita o volume", () => {
  const texto = "C++ é linguagem de programação.\nGLOSSÁRIO:\nC++ | cplusplus";
  const r = executar("concordancia-terminologica", { texto });
  assert.equal(r.linhas[0][2], 1);
  assert.throws(
    () =>
      executar("concordancia-terminologica", {
        texto:
          "texto\nGLOSSÁRIO:\n" +
          Array.from({ length: 201 }, (_, i) => `termo${i} | v${i}`).join("\n"),
      }),
    ErroProfissional,
  );
});

test("referências são tipadas, órfãs e IDs duplicados são sinalizados", () => {
  const r = executar("referencias-cruzadas-documento", {
    texto:
      "## 1 Intro\nConsulte a Tabela 1.\n## 1 Métodos\nConsulte a Seção 1.",
  });
  assert.ok(
    r.linhas.some((x) => x[0] === "Tabela" && x[3] === "Destino ausente"),
  );
  assert.ok(
    r.linhas.some((x) => x[0] === "Seção" && x[3] === "Definição duplicada"),
  );
});

test("diff hierárquico detecta conteúdo alterado e limita custo do LCS", () => {
  const r = executar("diff-hierarquico-documentos", {
    texto: "## A\nTexto antigo.\n--- VERSÃO 2 ---\n## A\nTexto novo.",
  });
  assert.equal(r.linhas[0][1], "Alterada");
  const many = Array.from(
    { length: 401 },
    (_, i) => `## ${i + 1} Seção\nTexto`,
  ).join("\n");
  assert.throws(
    () =>
      executar("diff-hierarquico-documentos", {
        texto: many + "\n--- VERSÃO 2 ---\n" + many,
      }),
    ErroProfissional,
  );
});

test("numeração reinicia por hierarquia e encontra saltos de seção raiz", () => {
  const r = executar("integridade-numeracao-secoes", {
    texto: "## 1 Intro\n### 1.1 Sub\n## 3 Próximo",
  });
  assert.ok(r.linhas.some((x) => x[0] === "3" && x[3].includes("Salto")));
});

test("SRT detecta índices duplicados mesmo com timestamps sem overlap", () => {
  const r = executar("validador-legendas-srt-vtt", {
    texto:
      "1\n00:00:01,000 --> 00:00:02,000\nA\n\n1\n00:00:03,000 --> 00:00:04,000\nB",
  });
  assert.equal(r.linhas[1][5], "Índice duplicado");
});

test("diff OpenAPI inspeciona type, enum e campos aninhados", () => {
  const old = {
    openapi: "3.0.0",
    paths: {
      "/x": {
        get: {
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "string", enum: ["a", "b"] },
            },
          ],
          responses: { 200: { description: "ok" } },
        },
      },
    },
  };
  const now = {
    openapi: "3.0.0",
    paths: {
      "/x": {
        get: {
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "integer", enum: ["a"] },
            },
          ],
          responses: { 200: { description: "ok" } },
        },
      },
    },
  };
  const r = executar("diff-openapi-compatibilidade", {
    texto: `${JSON.stringify(old)}\n--- VERSÃO 2 ---\n${JSON.stringify(now)}`,
  });
  assert.ok(r.linhas.some((x) => x[2].includes("Tipo alterado")));
  assert.ok(r.linhas.some((x) => x[2].includes("Enum restringido")));
});

test("SBOM examina todas as licenças e referências de dependência", () => {
  const bom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    components: [
      {
        type: "library",
        name: "alpha",
        version: "1",
        "bom-ref": "A",
        licenses: [
          { license: { id: "MIT" } },
          { license: { id: "AGPL-3.0-only" } },
        ],
      },
    ],
    dependencies: [{ ref: "A", dependsOn: ["MISSING"] }],
  };
  const r = executar("validador-sbom-spdx-cyclonedx", {
    texto: JSON.stringify(bom),
  });
  assert.ok(r.linhas.some((x) => String(x[3]).includes("AGPL-3.0-only")));
  assert.ok(
    r.linhas.some((x) =>
      String(x[3]).includes("Destino de dependência ausente"),
    ),
  );
});

test("ICU plural aceita traduções equivalentes e rejeita plural sem other", () => {
  const good =
    "{count, plural, one {File} other {Files}}\n--- TRADUÇÃO ---\n{count, plural, one {Arquivo} other {Arquivos}}";
  assert.equal(
    executar("validar-placeholders-icu", { texto: good }).indicadores.find(
      (x) => x[0] === "Divergências",
    )[1],
    0,
  );
  assert.throws(
    () =>
      executar("validar-placeholders-icu", {
        texto:
          "{count, plural, one {File}}\n--- TRADUÇÃO ---\n{count, plural, one {Arquivo}}",
      }),
    ErroProfissional,
  );
});

test("frontmatter confere tipos e SemVer", () => {
  const r = executar("validador-frontmatter-documentacao", {
    texto: "---\ntitle: Guia\nversion: 1.2.0\ndraft: qualquer\n---\n# Conteúdo",
  });
  assert.ok(
    r.linhas.some((x) => x[1] === "draft" && String(x[3]).includes("boolean")),
  );
});

test("validador de exemplos encontra required em objeto aninhado", () => {
  const schema = {
    type: "object",
    properties: {
      db: {
        type: "object",
        required: ["host"],
        properties: { host: { type: "string" } },
      },
    },
  };
  const text = `SCHEMA: ${JSON.stringify(schema)}\n\`\`\`json\n{"db":{}}\n\`\`\``;
  const r = executar("auditoria-exemplos-configuracao", { texto: text });
  assert.ok(
    r.linhas.some(
      (x) => x[1] === "$.db.host" && x[3] === "Obrigatório ausente",
    ),
  );
});

test("completude avalia conteúdo somente até o próximo heading", () => {
  const r = executar("completude-modelo-documental", {
    texto: "MODELO: A; B\n# A\n# B\nTexto de B",
  });
  assert.ok(r.linhas.some((x) => x[0] === "A" && x[3] === "Sem conteúdo"));
});

test("medidas percentuais e URLs malformadas não derrubam o relatório", () => {
  const p = executar("consistencia-unidades-documento", {
    texto: "Desconto: 10%.\nTaxa: 2,5%.",
  });
  assert.equal(p.linhas.length, 2);
  const u = executar("auditor-urls-documentacao", {
    texto: "Veja https://[invalid-host]",
  });
  assert.equal(u.linhas[0][3], "URL malformada");
});

test("pipes dentro de código inline e case-sensitive paths são preservados", () => {
  const t = executar("integridade-tabelas-markdown", {
    texto: "| A | B |\n|---|---|\n| `x|y` | 1 |",
  });
  assert.equal(t.indicadores[0][1], 0);
  const u = executar("auditor-urls-documentacao", {
    texto: "https://example.com/Guide\nhttps://example.com/guide",
  });
  assert.ok(u.linhas.every((x) => x[3] !== "Duplicada"));
});

const executarPar = (slug, a, b) =>
  executar(slug, {
    texto: `${JSON.stringify(a)}\n--- VERSÃO 2 ---\n${JSON.stringify(b)}`,
  });
const apiSchema = (schema, context = "requestBody") => ({
  openapi: "3.0.0",
  paths: {
    "/x": {
      post: {
        responses: {
          200: {
            description: "ok",
            ...(context === "response"
              ? { content: { "application/json": { schema } } }
              : {}),
          },
        },
        ...(context === "requestBody"
          ? { requestBody: { content: { "application/json": { schema } } } }
          : {}),
      },
    },
  },
});

test("OpenAPI identifica required aninhado e itens de arrays e distingue enum de saída", () => {
  const before = {
    type: "object",
    properties: {
      user: { type: "object", properties: { name: { type: "string" } } },
      tags: { type: "array", items: { type: "string" } },
    },
  };
  const after = structuredClone(before);
  after.properties.user.required = ["name"];
  after.properties.tags.items.type = "integer";
  const input = executarPar(
    "diff-openapi-compatibilidade",
    apiSchema(before),
    apiSchema(after),
  );
  assert.ok(
    input.linhas.some(
      (r) =>
        r[2].includes(".user: Campo obrigatório novo: name") &&
        r[3] === "Breaking",
    ),
  );
  assert.ok(input.linhas.some((r) => r[2].includes(".tags[]: Tipo alterado")));
  const old = { type: "string", enum: ["a", "b"] },
    narrow = { type: "string", enum: ["a"] };
  assert.equal(
    executarPar(
      "diff-openapi-compatibilidade",
      apiSchema(old, "response"),
      apiSchema(narrow, "response"),
    ).linhas.length,
    0,
  );
  assert.ok(
    executarPar(
      "diff-openapi-compatibilidade",
      apiSchema(narrow, "response"),
      apiSchema(old, "response"),
    ).linhas.some((r) => r[3] === "Breaking"),
  );
  const responseBefore = apiSchema(
    {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
    "response",
  );
  const responseAfter = apiSchema(
    { type: "object", properties: { name: { type: "string" } } },
    "response",
  );
  assert.ok(
    executarPar(
      "diff-openapi-compatibilidade",
      responseBefore,
      responseAfter,
    ).linhas.some(
      (r) => r[2].includes("agora opcional") && r[3] === "Breaking",
    ),
  );
});

test("OpenAPI inclui parâmetros no path e recusa $ref/composição e estruturas inválidas", () => {
  const old = {
    openapi: "3.0.0",
    paths: {
      "/x": {
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        get: { responses: { 200: { description: "ok" } } },
      },
    },
  };
  const now = structuredClone(old);
  now.paths["/x"].parameters[0].required = true;
  assert.ok(
    executarPar("diff-openapi-compatibilidade", old, now).linhas.some((r) =>
      r[2].includes("Parâmetro agora obrigatório"),
    ),
  );
  for (const schema of [
    { $ref: "#/components/schemas/X" },
    { oneOf: [{ type: "string" }] },
    { required: "name" },
  ])
    assert.throws(
      () =>
        executarPar(
          "diff-openapi-compatibilidade",
          apiSchema(schema),
          apiSchema(schema),
        ),
      ErroProfissional,
    );
  assert.throws(
    () => executarPar("diff-openapi-compatibilidade", null, old),
    ErroProfissional,
  );
});

test("SBOM rastreia referências raiz válidas, IDs duplicados e expressões entre parênteses", () => {
  const bom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: { component: { "bom-ref": "ROOT" } },
    components: [
      {
        name: "alpha",
        version: "1",
        "bom-ref": "A",
        licenses: [{ expression: "MIT AND (AGPL-3.0-only OR Apache-2.0)" }],
      },
      {
        name: "beta",
        version: "2",
        "bom-ref": "A",
        licenses: [{ license: { id: "MIT" } }],
      },
    ],
    dependencies: [{ ref: "ROOT", dependsOn: ["A"] }],
  };
  const r = executar("validador-sbom-spdx-cyclonedx", {
    texto: JSON.stringify(bom),
  });
  assert.ok(
    r.linhas.some((r) => r[3].includes("Licença bloqueada: AGPL-3.0-only")),
  );
  assert.ok(r.linhas.some((r) => r[3].includes("Identificador duplicado")));
  assert.ok(!r.linhas.some((r) => r[3].includes("dependência ausente")));
});

test("SPDX valida referências de arquivos e aponta campos de pacotes ausentes", () => {
  const bom = {
    spdxVersion: "SPDX-2.3",
    SPDXID: "SPDXRef-DOCUMENT",
    packages: [{ name: "alpha", SPDXID: "SPDXRef-A", licenseConcluded: "MIT" }],
    files: [{ SPDXID: "SPDXRef-FILE" }],
    relationships: [
      { spdxElementId: "SPDXRef-DOCUMENT", relatedSpdxElement: "SPDXRef-A" },
      { spdxElementId: "SPDXRef-A", relatedSpdxElement: "SPDXRef-FILE" },
    ],
  };
  const r = executar("validador-sbom-spdx-cyclonedx", {
    texto: JSON.stringify(bom),
  });
  assert.deepEqual(
    r.linhas.map((r) => r[3]),
    ["Versão ausente"],
  );
  assert.throws(
    () =>
      executar("validador-sbom-spdx-cyclonedx", {
        texto: JSON.stringify({ ...bom, packages: [null] }),
      }),
    ErroProfissional,
  );
  assert.throws(
    () =>
      executar("validador-sbom-spdx-cyclonedx", {
        texto: JSON.stringify({ ...bom, relationships: {} }),
      }),
    ErroProfissional,
  );
});

test("ICU confere categorias e multiplicidade e recusa recursos que não interpreta", () => {
  const compare = (a, b) =>
    executar("validar-placeholders-icu", {
      texto: `${a}\n--- TRADUÇÃO ---\n${b}`,
    });
  const good = "{n, plural, =0 {No files} one {File} other {Files}}";
  assert.equal(
    compare(good, "{n, plural, other {Arquivos} one {Arquivo} =0 {Nenhum}}")
      .indicadores[2][1],
    0,
  );
  assert.equal(compare("{x} {x}", "{x}").indicadores[2][1], 1);
  assert.ok(compare("{x, number}", "{x}").indicadores[2][1] > 0);
  for (const bad of [
    "{n, plural, one {X} one {Y} other {Z}}",
    "{n, plural, bogus {X} other {Z}}",
    "{n, plural, one {X}, other {Z}}",
    "{n, plural, other {{x}}}",
    "{n, plural, offset:1 other {X}}",
    "'{x}'",
    "{x, number, integer}",
    "{n, plural, one {File}}",
  ])
    assert.throws(() => compare(good, bad), ErroProfissional);
});

test("LCS mantém preâmbulo, reconhece movimentos e aceita blocos grandes com custo limitado", () => {
  const changed = executar("diff-hierarquico-documentos", {
    texto:
      "Introdução antiga\n## A\nMesmo\n--- VERSÃO 2 ---\nIntrodução nova\n## A\nMesmo",
  });
  assert.equal(changed.linhas[0][0], "Preâmbulo");
  assert.equal(changed.linhas[0][1], "Alterada");
  const moved = executar("diff-hierarquico-documentos", {
    texto:
      "## A\nAlfa\n## B\nBeta\n## C\nGama\n--- VERSÃO 2 ---\n## B\nBeta\n## C\nGama\n## A\nAlfa",
  });
  assert.deepEqual(
    moved.linhas.map((r) => r[1]),
    ["Movida"],
  );
  const large = Array.from(
    { length: 400 },
    (_, i) => `## Seção ${i}\n${"texto ".repeat(150)}`,
  ).join("\n");
  assert.equal(
    executar("diff-hierarquico-documentos", {
      texto: large + "\n--- VERSÃO 2 ---\n" + large,
    }).indicadores[2][1],
    0,
  );
});

test("requisições órfãs e duplicadas incluem evidência e glossário não executa regex", () => {
  const r = executar("matriz-rastreabilidade-requisitos", {
    texto: "REQ-1: A\nREQ-1: B\nEvidência REQ-1. Menção REQ-2.",
  });
  assert.ok(r.linhas.some((r) => r[5] === "ID duplicado" && r[4] === "3"));
  assert.ok(r.linhas.some((r) => r[0] === "REQ-2" && r[3] === "Menção órfã"));
  const evil = executar("concordancia-terminologica", {
    texto: "(a+)+$ é literal.\nGLOSSÁRIO:\n(a+)+$ | C++",
  });
  assert.equal(evil.linhas[0][2], 1);
});

test("cláusulas calculam Jaccard conhecido e recusam explosão de pares", () => {
  const r = executar("clausulas-quase-duplicadas", {
    texto: "alpha beta gamma delta epsilon.\n\nalpha beta gamma delta zeta.",
    opcoes: { limiar: 10 },
  });
  assert.equal(r.linhas[0][2], 0.6);
  assert.throws(
    () =>
      executar("clausulas-quase-duplicadas", {
        texto: Array.from(
          { length: 141 },
          (_, i) => `Parágrafo de conteúdo longo número ${i}.`,
        ).join("\n\n"),
      }),
    ErroProfissional,
  );
});

test("segmentação conserva parágrafos, origem de títulos repetidos e sobreposição", () => {
  const texto =
    "## A\n\n" +
    "Primeiro parágrafo. ".repeat(5) +
    "\n\n" +
    "Segundo parágrafo. ".repeat(5) +
    "\n\n## A\n\nFinal.";
  const r = executar("segmentador-estrutural-documento", {
    texto,
    opcoes: { alvo: 100, sobreposicao: 10 },
  });
  assert.equal(r.linhas.at(-1)[2], 7);
  assert.equal(r.linhas.at(-1)[5], "## A\n\nFinal.");
  assert.ok(
    r.linhas.some((r) => r[5].includes("Segundo parágrafo. ".repeat(5).trim())),
  );
  assert.throws(
    () =>
      executar("segmentador-estrutural-documento", {
        texto,
        opcoes: { alvo: 100, sobreposicao: 100 },
      }),
    ErroProfissional,
  );
});

test("referência ambígua e headings dentro de código não validam destinos", () => {
  const r = executar("referencias-cruzadas-documento", {
    texto:
      "## 1 A\n## 1 B\nConsulte a Seção 1 e a Seção 2.\n```md\n## 2 Apenas um exemplo\n```",
  });
  assert.ok(r.linhas.some((r) => r[1] === "1" && r[3] === "Destino ambíguo"));
  assert.ok(r.linhas.some((r) => r[1] === "2" && r[3] === "Destino ausente"));
});

test("WebVTT aceita tempo curto e SRT mantém avisos múltiplos e índices canônicos", () => {
  const vtt = executar("validador-legendas-srt-vtt", {
    texto: "WEBVTT\n\nNOTE comentário\n\n00:01.000 --> 00:02.500\nTexto",
  });
  assert.equal(vtt.linhas.length, 1);
  assert.equal(vtt.linhas[0][3], 1500);
  assert.equal(vtt.linhas[0][5], "OK");
  const srt = executar("validador-legendas-srt-vtt", {
    texto:
      "01\n00:00:01,000 --> 00:00:03,000\nA\n\n1\n00:00:02,000 --> 00:00:04,000\nB",
  });
  assert.ok(srt.linhas[1][5].includes("Índice duplicado"));
  assert.ok(srt.linhas[1][5].includes("Sobreposição"));
});

test("auditoria Markdown aceita cabeçalho válido e diferencia tabela sem separador", () => {
  assert.equal(
    executar("auditoria-acessibilidade-markdown", {
      texto: "| A | B |\n| --- | :---: |\n| 1 | 2 |",
    }).indicadores[0][1],
    0,
  );
  assert.ok(
    executar("auditoria-acessibilidade-markdown", {
      texto: "| A | B |\n| 1 | 2 |",
    }).linhas.some((r) => r[1] === "Tabela sem cabeçalho"),
  );
  assert.equal(
    executar("integridade-tabelas-markdown", {
      texto: "| A | B |\n|---|---|\n| ``a`|b`` | 1 |",
    }).indicadores[0][1],
    0,
  );
  assert.ok(
    executar("integridade-tabelas-markdown", { texto: "| A | B |\n| 1 | 2 |" })
      .indicadores[0][1] > 0,
  );
});

test("cercas exigem fechamento sem info string e linguagem é configurável", () => {
  const r = executar("auditor-blocos-codigo-markdown", {
    texto: "```custom\n```js",
    opcoes: { linguagens: "custom" },
  });
  assert.ok(r.linhas.some((r) => r[1] === "Cerca sem fechamento"));
  assert.equal(
    executar("auditor-blocos-codigo-markdown", {
      texto: "~~~custom\ntexto\n~~~",
      opcoes: { linguagens: "custom" },
    }).indicadores[0][1],
    0,
  );
});

test("semver rejeita zeros numéricos e identifica marcações atuais conflitantes", () => {
  const r = executar("consistencia-versoes-semver-documentos", {
    texto: "version: 1.2.3\n# v1.2.4\nAntigo 01.2.3 e 1.2.3-01.",
  });
  assert.equal(r.linhas.filter((r) => r[3] === "SemVer inválida").length, 2);
  assert.equal(
    r.linhas.filter((r) => r[3] === "Marcações atuais conflitantes").length,
    2,
  );
});

test("JSON Schema verifica raiz, arrays, enum, proibidas e reporta JSON inválido", () => {
  const schema = {
    type: "object",
    required: ["items"],
    properties: {
      items: { type: "array", items: { type: "integer", enum: [1, 2] } },
    },
    additionalProperties: false,
  };
  const texto = `SCHEMA: ${JSON.stringify(schema)}\n\`\`\`json\n{"items":[1,"x",3],"extra":true}\n\`\`\`\n\`\`\`json\n{bad\n\`\`\`\n\`\`\`json\n[]\n\`\`\``;
  const r = executar("auditoria-exemplos-configuracao", { texto });
  assert.ok(
    r.linhas.some((r) => r[1] === "$.items[1]" && r[3] === "Esperado integer"),
  );
  assert.ok(
    r.linhas.some((r) => r[1] === "$.items[2]" && r[3] === "Fora do enum"),
  );
  assert.ok(
    r.linhas.some((r) => r[1] === "$.extra" && r[3] === "Propriedade proibida"),
  );
  assert.ok(r.linhas.some((r) => r[0] === 2 && r[3] === "Falha de sintaxe"));
  assert.ok(r.linhas.some((r) => r[0] === 3 && r[3] === "Esperado object"));
  assert.throws(
    () =>
      executar("auditoria-exemplos-configuracao", {
        texto: 'SCHEMA: {"type":"string","pattern":"x"}\n```json\n"x"\n```',
      }),
    ErroProfissional,
  );
});

test("modelo avalia duplicidade, ordem e linhas absolutas e proveniência sinaliza lacunas", () => {
  const r = executar("completude-modelo-documental", {
    texto:
      "Prefácio\nMODELO: A; B\n# B\ntexto B\n# A\ntexto A\n# A\ntexto repetido",
  });
  assert.equal(r.linhas[0][2], 5);
  assert.ok(r.linhas[0][3].includes("Duplicada"));
  assert.ok(r.linhas[1][3].includes("Fora de ordem"));
  const p = executar("auditor-proveniencia-figuras-tabelas", {
    texto: "Figura 1: Fluxo\nFonte: equipe\nFigura 1:\nTabela: Números",
  });
  assert.ok(p.linhas[1][5].includes("Número duplicado"));
  assert.ok(p.linhas[1][5].includes("Legenda ausente"));
  assert.ok(p.linhas[2][5].includes("Número ausente"));
});

test("unidades preservam sinal, percentual, formatos decimais e paths/query de URL", () => {
  const r = executar("consistencia-unidades-documento", {
    texto: "Peso: -2,5 kg.\nPeso na tabela: 2.5 kg.\nTaxa: +10%.",
  });
  assert.equal(r.linhas[0][0], "-2,5");
  assert.equal(r.linhas[2][1], "%");
  assert.ok(r.linhas[0][6].includes("Separador decimal misto"));
  const u = executar("auditor-urls-documentacao", {
    texto:
      "https://EXAMPLE.com:443/Guide?q=A#one\nhttps://example.com/Guide?q=A#two\nhttps://example.com/Guide?q=a\nhttps://example.com/guide?q=A",
  });
  assert.deepEqual(
    u.linhas.map((r) => r[3]),
    ["Duplicada", "Duplicada", "OK", "OK"],
  );
});

test("ata, RFC, bibliografia e achados de segurança retornam decisões verificáveis", () => {
  const ata = executar("extrator-acoes-atas", {
    texto:
      "Ação: Ana revisar relatório até 2026-12-01.\nTarefa: enviar versão.",
  });
  assert.deepEqual(ata.linhas[0].slice(3), ["Ana", "2026-12-01", "Completa"]);
  assert.equal(ata.linhas[1][5], "Responsável ausente");
  const rfc = executar("auditor-rfc2119-normativo", {
    texto: "REQ-7: Client MUST send and SHOULD retry unless offline.",
  });
  assert.deepEqual(
    rfc.linhas.map((r) => r[2]),
    ["MUST", "SHOULD"],
  );
  assert.ok(
    rfc.linhas.every((r) => r[1] === "REQ-7" && r[3] === "Exceção textual"),
  );
  const bib = executar("normalizador-referencias-bibliograficas", {
    texto:
      "Nome 2020 doi:10.1000/ABC\nOutro título https://doi.org/10.1000/abc\nSem DOI\nsem doi",
  });
  assert.equal(bib.indicadores[1][1], 2);
  const security = executar("rastreabilidade-achados-seguranca", {
    texto: "FINDING-1 severity=high\nFINDING-2 status=open",
  });
  assert.ok(security.linhas.every((r) => r[4] === "Campos ausentes"));
});

test("frontmatter sinaliza tipo, duplicidade e subset e todos motores validam opções", () => {
  const r = executar("validador-frontmatter-documentacao", {
    texto:
      "---\ntitle: Guia\nversion: 1.2.3-01\ndraft: false\ntitle: Outro\ntags: [a,b]\n---",
  });
  assert.ok(r.linhas.some((r) => r[3] === "Chave duplicada"));
  assert.ok(
    r.linhas.some((r) => r[1] === "version" && r[3].includes("Tipo inválido")),
  );
  assert.ok(r.linhas.some((r) => r[3].includes("não suportada")));
  for (const spec of especificacoes)
    assert.throws(
      () => executar(spec.slug, { texto: spec.exemplo, opcoes: [] }),
      ErroProfissional,
    );
});

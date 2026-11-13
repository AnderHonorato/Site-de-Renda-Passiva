import test from "node:test";
import assert from "node:assert/strict";
import { especificacoes } from "../dados/profissionais/dados.js";
import { executar } from "../servidor/profissionais/dados.mjs";
import {
  ErroProfissional,
  validarRelatorio,
} from "../servidor/profissionais/comum.mjs";

const spec = (id) => especificacoes.find((s) => s.id === `F${id}`);
const run = (id, csv, opcoes = {}) => executar(spec(id).slug, { csv, opcoes });
const demo = (id) => {
  const s = spec(id);
  return executar(
    s.slug,
    s.entrada === "documento" ? { texto: s.exemplo } : { csv: s.exemplo },
  );
};
const metric = (r, label) => {
  const v = r.indicadores.find((x) => x[0] === label);
  assert.ok(v, `Indicador ausente: ${label}`);
  return v[1];
};
const bad = (id, csv, opcoes = {}) =>
  assert.throws(() => run(id, csv, opcoes), ErroProfissional);

test("catálogo tem 25 contratos completos e distintos F302–F326", () => {
  assert.equal(especificacoes.length, 25);
  assert.equal(new Set(especificacoes.map((s) => s.slug)).size, 25);
  especificacoes.forEach((s, i) => {
    assert.equal(s.id, `F${302 + i}`);
    assert.ok(s.nomeEn);
    assert.ok(["plus", "premium"].includes(s.plano));
    assert.ok(s.resumo.length <= 130);
    assert.ok(s.processa.length > 40);
    assert.ok(s.limites.length > 40);
  });
});
for (const s of especificacoes)
  test(`${s.id}: exemplo produz relatório finito, exportável e sem campos ausentes`, () => {
    const r = demo(Number(s.id.slice(1)));
    assert.equal(validarRelatorio(r), r);
    assert.equal(r.titulo, s.nome);
    assert.ok(r.notas[0].length > 20);
    assert.equal(r.metodo, s.processa);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(r)));
  });

test("F302 normaliza acentos, pontuação e preserva IDs; resultado exato tem score 1", () => {
  const r = run(
    302,
    "id;nome\nA;José da Silva\nB;JOSE DA SILVA\nC;Pedro Costa",
    { limiar: 0.99 },
  );
  assert.equal(metric(r, "Pares avaliados"), 3);
  assert.equal(r.linhas.length, 1);
  assert.deepEqual(r.linhas[0].slice(0, 5), ["A", "B", 1, 1, 1]);
});
test("F302 rejeita baixo suporte, IDs repetidos, nomes excessivos e explosão de pares", () => {
  bad(302, "id;nome\na;Maria");
  bad(302, "id;nome\na;Maria\na;Maria");
  bad(302, `id;nome\na;${"x".repeat(121)}\nb;Ana`);
  bad(
    302,
    "id;nome\n" +
      Array.from({ length: 201 }, (_, i) => `${i};nome ${i}`).join("\n"),
  );
  bad(
    302,
    "id;nome\n" +
      Array.from({ length: 150 }, (_, i) => `${i};nome igual`).join("\n"),
    { limiar: 1 },
  );
});
test("F303 reparo mínimo usa moda por determinante, não número de valores distintos", () => {
  const r = run(303, "determinante;dependente\nX;A\nX;A\nX;B\nX;B\nX;C\nY;Z");
  assert.equal(metric(r, "Reparos mínimos"), 3);
  assert.equal(metric(r, "Chaves conflitantes"), 1);
  assert.ok(r.linhas.filter((x) => x[0] === "X").every((x) => x[4] === 3));
});
test("F304 detecta pai duplicado, referência ambígua e referência órfã separadamente", () => {
  const r = run(
    304,
    "tipo;chave;referencia\npai;P;—\npai;P;—\nfilho;C;P\nfilho;D;Q",
  );
  assert.equal(metric(r, "Violações"), 4);
  assert.equal(r.linhas.filter((x) => x[3] === "Referência ambígua").length, 1);
  bad(304, "tipo;chave;referencia\nfilho;C;P");
  bad(304, "tipo;chave;referencia\n__proto__;C;P");
});
test("F305 tipos estritos, obrigatório vazio e data inexistente", () => {
  const r = run(
    305,
    "registro;campo;valor;tipo;obrigatorio\n1;data;2026-02-29;data;sim\n2;data_opcional;;data;nao\n3;data;;data;sim\n1;n;2.5;inteiro;sim\n2;n;12;inteiro;sim",
  );
  assert.equal(metric(r, "Células inválidas"), 3);
  assert.equal(metric(r, "Conformidade (%)"), 40);
  bad(
    305,
    "registro;campo;valor;tipo;obrigatorio\n1;n;2;inteiro;sim\n2;n;2;texto;sim",
  );
  bad(305, "registro;campo;valor;tipo;obrigatorio\n1;n;2;inteiro;talvez");
});
test("F305 email adversarial longo falha sem interpretar conteúdo como expressão", () => {
  const r = run(
    305,
    `registro;campo;valor;tipo;obrigatorio\n1;mail;a@${".".repeat(20000)}@;email;sim`,
  );
  assert.equal(metric(r, "Células inválidas"), 1);
});

test("F306 usa checksum CPF/Luhn e não devolve conteúdo sensível", () => {
  const r = run(
    306,
    "registro;campo;valor\n1;documento;52998224725\n2;cartao;4111111111111111\n3;mail;pessoa@example.com\n4;telefone;11999998888\n5;documento;123456789\n6;cartao;4111111111111112",
  );
  assert.equal(metric(r, "Células sinalizadas"), 4);
  const serialized = JSON.stringify(r);
  assert.ok(!serialized.includes("52998224725"));
  assert.ok(!serialized.includes("4111111111111111"));
  assert.ok(!serialized.includes("pessoa@example.com"));
  assert.deepEqual(
    r.linhas.map((x) => x[2]),
    ["CPF", "Possível cartão", "Email", "Possível telefone"],
  );
});
test("F307 distingue alargamento, remoção, adição obrigatória e nulabilidade", () => {
  const r = demo(307);
  assert.equal(metric(r, "Quebras potenciais"), 2);
  assert.match(r.linhas.find((x) => x[0] === "id")[4], /Compatível/);
  bad(307, "versao;campo;tipo;obrigatorio\ntoString;x;inteiro;sim");
  bad(
    307,
    "versao;campo;tipo;obrigatorio\nbase;x;inteiro;sim\nbase;x;texto;sim\natual;x;texto;sim",
  );
});
test("F308 converte temperatura afim, massa e detecta dimensão incompatível", () => {
  const r = run(
    308,
    "serie;unidade;valor\nt;F;32\nt;C;0\nt;K;-1\npeso;g;1000\naltura;m;2\naltura;kg;2",
  );
  assert.equal(r.linhas[0][3], 273.15);
  assert.equal(r.linhas[1][3], 273.15);
  assert.equal(r.linhas[3][3], 1);
  assert.equal(metric(r, "Problemas"), 3);
  bad(308, "serie;unidade;valor\nx;mph;2");
});
test("F309 respeita intervalo estrito e ordena fusos por instante absoluto", () => {
  const r = run(
    309,
    "usuario;instante;evento\nu;2026-01-01T10:30:00Z;c\nu;2026-01-01T07:00:00-03:00;a\nu;2026-01-01T11:00:01Z;b",
    { intervalo: 30 },
  );
  assert.equal(metric(r, "Sessões"), 2);
  assert.equal(r.linhas[0][4], 2);
  assert.equal(r.linhas[0][5], 30);
  bad(309, "usuario;instante;evento\nu;2026-02-30T10:00:00Z;a");
  bad(309, "usuario;instante;evento\nu;2026-01-01T10:00:00;a");
  bad(309, "usuario;instante;evento\nu;2026-01-01T24:00:00Z;a");
});
test("F310 transição inválida não avança o estado; estado terminal rejeita evento", () => {
  const r = run(
    310,
    "entidade;instante;evento\na;2026-01-01T00:00:00Z;recebido\na;2026-01-01T00:01:00Z;persistido\na;2026-01-01T00:02:00Z;validado\na;2026-01-01T00:03:00Z;falha\na;2026-01-01T00:04:00Z;recebido",
  );
  assert.equal(metric(r, "Transições ilegais"), 2);
  assert.equal(metric(r, "Entidades incompletas"), 0);
  assert.equal(r.linhas.at(-1)[2], "falha");
  bad(310, "entidade;instante;evento\na;2026-01-01T00:00:00Z;inicio");
});
test("F311 Apdex trata erro rápido como frustrado e budget pela proporção observada", () => {
  const r = run(
    311,
    "rota;status;duracao_ms;instante\n/a;200;100;2026-01-01T00:00:00Z\n/a;200;200;2026-01-01T00:01:00Z\n/a;500;10;2026-01-01T00:02:00Z\n/a;200;500;2026-01-01T00:03:00Z",
    { limite_ms: 100, slo: 90 },
  );
  const row = r.linhas[0];
  assert.equal(row[2], 1);
  assert.equal(row[3], 75);
  assert.equal(row[4], 455);
  assert.equal(row[5], 0.375);
  assert.equal(row[6], 2.5);
  assert.equal(row[7], -0.6);
  bad(311, "rota;status;duracao_ms;instante\nx;600;2;2026-01-01T00:00:00Z");
});
test("F312 subtrai união dos filhos sobrepostos e identifica ciclos/órfãos", () => {
  const r = demo(312);
  assert.equal(r.linhas.find((x) => x[1] === "raiz")[4], 50);
  const broken = run(
    312,
    "trace;span;pai;inicio;duracao_ms\nt;a;b;2026-01-01T00:00:00Z;100\nt;b;a;2026-01-01T00:00:00Z;100\nt;c;z;2026-01-01T00:00:00Z;100",
  );
  assert.equal(metric(broken, "Spans com problema"), 3);
  assert.match(broken.linhas[0][5], /Ciclo/);
  assert.match(broken.linhas[2][5], /Pai ausente/);
  bad(
    312,
    "trace;span;pai;inicio;duracao_ms\nt;a;—;2026-01-01T00:00:00Z;1\nt;a;—;2026-01-01T00:00:00Z;1",
  );
});
test("F313 CDC valida pré-imagem, ordem e exclusão sem aplicar evento inválido", () => {
  assert.equal(metric(demo(313), "Eventos inválidos"), 0);
  const r = run(
    313,
    "chave;sequencia;operacao;antes;depois\nA;1;insert;∅;v1\nA;2;update;errado;v2\nA;3;delete;v1;∅",
  );
  assert.equal(metric(r, "Eventos inválidos"), 1);
  assert.equal(r.linhas[2][4], "Ausente");
  bad(313, "chave;sequencia;operacao;antes;depois\nA;1.1;insert;∅;a");
  bad(313, "chave;sequencia;operacao;antes;depois\nA;1;merge;∅;a");
});
test("F314 intervalos contidos não geram lacuna falsa; fronteiras adjacentes são válidas", () => {
  const r = run(
    314,
    "entidade;inicio;fim;valor\nA;2026-01-01;2026-01-10;X\nA;2026-01-02;2026-01-03;Y\nA;2026-01-10;2026-01-12;Z",
  );
  assert.equal(metric(r, "Sobreposições"), 1);
  assert.equal(metric(r, "Lacunas"), 0);
  assert.equal(r.linhas[0][4], 1);
  bad(314, "entidade;inicio;fim;valor\nA;2026-01-02;2026-01-01;X");
});
test("F315 separa retry, colisão de payload e divergência de resposta", () => {
  const r = run(
    315,
    "chave;assinatura;resultado\nA;h;OK\nA;h;ERRO\nB;j;OK\nB;j;OK\nC;j;OK\nC;k;OK",
  );
  assert.equal(metric(r, "Chaves conflitantes"), 2);
  assert.equal(metric(r, "Retries"), 3);
  assert.equal(r.linhas[1][4], "Retry consistente");
});
test("F316 excesso não compensa falta de outra partição; SLA é independente", () => {
  const r = run(
    316,
    "particao;esperado;recebido;atraso_min\n2026-01-01;10;12;0\n2026-01-02;10;8;0\n2026-01-03;10;10;61",
  );
  assert.equal(metric(r, "Partições não prontas"), 3);
  assert.equal(metric(r, "Registros faltantes"), 2);
  bad(316, "particao;esperado;recebido;atraso_min\n2026-01-01;0;0;0");
});
test("F316 continuidade diária calcula lacunas sem expandir e bloqueia publicação posterior", () => {
  const r = run(
    316,
    "particao;esperado;recebido;atraso_min\n2026-01-05;10;10;0\n2026-01-01;10;10;0\n2026-01-06;10;10;0",
  );
  assert.equal(metric(r, "Partições não prontas"), 0);
  assert.equal(metric(r, "Partições diárias ausentes"), 3);
  assert.equal(metric(r, "Partições com liberação bloqueada"), 2);
  assert.deepEqual(
    r.linhas.map((x) => x[7]),
    ["Liberável", "Bloqueada", "Bloqueada"],
  );
  assert.match(r.linhas[1][8], /2026-01-02/);
});

test("limites de spans, ativos e tamanho JSON são aplicados antes do algoritmo", () => {
  bad(
    312,
    "trace;span;pai;inicio;duracao_ms\n" +
      Array.from(
        { length: 1001 },
        (_, i) => `t;${i};—;2026-01-01T00:00:00Z;1`,
      ).join("\n"),
  );
  bad(
    317,
    "origem;destino\n" +
      Array.from({ length: 300 }, (_, i) => `n${i};n${i + 1}`).join("\n"),
  );
  assert.throws(
    () => executar(spec(322).slug, { texto: " ".repeat(1048577) }),
    ErroProfissional,
  );
});

test("F317 impacto transitivo deduplica caminhos do diamante e rejeita ciclo", () => {
  const r = run(317, "origem;destino\nA;B\nA;C\nB;D\nC;D\nA;B");
  assert.equal(metric(r, "Arestas únicas"), 4);
  assert.equal(r.linhas.find((x) => x[0] === "A")[4], 3);
  assert.equal(r.linhas.find((x) => x[0] === "D")[4], 0);
  bad(317, "origem;destino\nA;B\nB;A");
  bad(317, "origem;destino\nA;A");
});
test("F318 k suficiente não basta quando diversidade sensível é insuficiente", () => {
  const r = run(
    318,
    "idade;cep;genero;sensivel\n21;12345000;F;mesmo\n22;12345999;F;mesmo\n23;12345111;F;mesmo",
    { k: 3, diversidade: 2 },
  );
  assert.equal(metric(r, "Registros em grupos vulneráveis"), 3);
  assert.equal(r.linhas[0][5], "Atende k");
  assert.equal(r.linhas[0][6], "Abaixo de l");
  assert.ok(!JSON.stringify(r).includes("mesmo"));
  bad(318, "idade;cep;genero;sensivel\n21;123;F;A");
});
test("F319 mesma chave fica no mesmo shard, bytes são conservados e skew inclui vazios", () => {
  const r = run(319, "chave;bytes\nA;100\nA;200", { particoes: 4 });
  assert.equal(metric(r, "Bytes totais"), 300);
  assert.equal(metric(r, "Skew máximo/média"), 4);
  const nonempty = r.linhas.filter((x) => x[1] > 0);
  assert.equal(nonempty.length, 1);
  assert.equal(nonempty[0][1], 2);
  assert.equal(nonempty[0][5], 100);
  bad(319, "chave;bytes\nA;0");
  bad(319, "chave;bytes\nA;1", { particoes: 2.5 });
});
test("F320 grandes lacunas são intervalos, sem alocação de números ausentes", () => {
  const r = run(320, "fluxo;sequencia\nA;1\nA;1000000000000\nA;1");
  assert.equal(metric(r, "Números ausentes"), 999999999998);
  assert.equal(metric(r, "Duplicatas"), 1);
  assert.equal(metric(r, "Regressões"), 1);
  assert.equal(r.linhas.length, 3);
  bad(320, "fluxo;sequencia\nA;1.5");
});
test("F321 caret major zero e tilde têm limites exclusivos corretos", () => {
  const r = run(
    321,
    "pacote;restricao;instalada\na;^0.0.3;0.0.4\nb;^0.2.3;0.2.9\nc;~1.2.3;1.3.0\nd;1.2.3;1.2.3\ne;^1.2.3;2.0.0",
  );
  assert.deepEqual(
    r.linhas.map((x) => x[5]),
    [
      "Incompatível",
      "Compatível",
      "Incompatível",
      "Compatível",
      "Incompatível",
    ],
  );
  bad(321, "pacote;restricao;instalada\na;^1.2.3-beta;1.2.3");
  bad(321, "pacote;restricao;instalada\na;^01.2.3;1.2.3");
});
test("F322 estrutura conta presença por registro e distingue wildcard de chave literal", () => {
  const r = executar(spec(322).slug, {
    texto: JSON.stringify([
      { a: [1, 2, 3], "*": true, perfil: { "a/b": 1 } },
      { a: [], perfil: { "a/b": null } },
    ]),
  });
  const arr = r.linhas.find((x) => x[0] === "/a/~2");
  assert.equal(arr[2], 1);
  assert.equal(arr[3], 50);
  assert.ok(r.linhas.some((x) => x[0] === "/*"));
  assert.ok(r.linhas.some((x) => x[0] === "/perfil/a~1b"));
  assert.throws(
    () => executar(spec(322).slug, { texto: "[{}]" }),
    ErroProfissional,
  );
  assert.throws(
    () => executar(spec(322).slug, { texto: "[1,2]" }),
    ErroProfissional,
  );
  assert.throws(
    () => executar(spec(322).slug, { texto: "{" }),
    ErroProfissional,
  );
  let deep = {};
  for (let i = 0; i < 22; i++) deep = { a: deep };
  assert.throws(
    () => executar(spec(322).slug, { texto: JSON.stringify([deep, {}]) }),
    ErroProfissional,
  );
  const many = Array.from({ length: 2 }, () => ({ a: Array(26000).fill(1) }));
  assert.throws(
    () => executar(spec(322).slug, { texto: JSON.stringify(many) }),
    ErroProfissional,
  );
});
test("F323 ambiguidades no mapa não contam como cobertura", () => {
  const r = run(
    323,
    "tipo;campo;valor;canonico\nmapa;status;A;aberto\nmapa;status;A;ativo\nmapa;status;P;pago\ndado;status;A;—\ndado;status;P;—\ndado;status;X;—",
  );
  assert.equal(metric(r, "Cobertura não ambígua (%)"), 33.333333);
  assert.equal(r.linhas[0][4], "Ambíguo");
  bad(323, "tipo;campo;valor;canonico\ndado;status;A;—");
});
test("F324 empate irresolvido devolve null; consenso de fontes prioritárias mantém proveniência", () => {
  const r = demo(324);
  assert.equal(r.linhas.find((x) => x[0] === "A")[2], "Recife");
  assert.equal(r.linhas.find((x) => x[0] === "B")[2], null);
  bad(324, "entidade;campo;fonte;prioridade;valor\nA;x;ERP;1;a\nA;x;ERP;2;b");
});
test("F325 watermark por fluxo, igualdade aceita e atraso negativo rejeitado", () => {
  const r = run(
    325,
    "fluxo;evento_em;recebido_em\nA;2026-01-01T10:10:00Z;2026-01-01T10:11:00Z\nA;2026-01-01T10:05:00Z;2026-01-01T10:12:00Z\nB;2026-01-01T09:00:00Z;2026-01-01T10:13:00Z\nA;2026-01-01T10:04:59Z;2026-01-01T10:14:00Z",
    { tolerancia: 5 },
  );
  assert.equal(metric(r, "Eventos tardios"), 1);
  assert.equal(r.linhas[1][6], "Fora de ordem");
  assert.equal(r.linhas[2][5], null);
  bad(
    325,
    "fluxo;evento_em;recebido_em\nA;2026-01-01T11:00:00Z;2026-01-01T10:00:00Z",
  );
});
test("F326 cardinalidade analítica preserva multiplicidade e inclui sem correspondência", () => {
  const r = demo(326);
  assert.equal(metric(r, "Linhas inner join"), 4);
  assert.equal(metric(r, "Linhas left join"), 5);
  assert.equal(metric(r, "Chaves muitos-para-muitos"), 1);
  assert.equal(r.linhas.find((x) => x[0] === "C")[5], null);
  bad(326, "lado;chave\nesquerda;A");
  bad(326, "lado;chave\nambos;A");
});
test("opções desconhecidas, não finitas, limites e entradas incorretas são recusadas", () => {
  assert.throws(() => executar("desconhecida", {}), ErroProfissional);
  assert.throws(() => executar(spec(302).slug, null), ErroProfissional);
  for (const opcoes of [
    [],
    null,
    { limiar: NaN },
    { limiar: Infinity },
    { limiar: 0 },
    { limiar: 1.01 },
    { limar: 0.5 },
  ])
    bad(302, spec(302).exemplo, opcoes);
  bad(318, spec(318).exemplo, { prefixo: 2.5 });
  bad(311, spec(311).exemplo, { slo: 100 });
  bad(303, "determinante;dependente\n" + Array(2001).fill("A;B").join("\n"));
  bad(303, "determinante;dependente\nA;B;C");
  bad(303, "x;y\nA;B");
});

/** Motores determinísticos de auditoria documental; texto fica apenas em memória. */
import { ErroProfissional, numeroOpcao, relatorio, exigir } from "./comum.mjs";
import { especificacoes } from "../../dados/profissionais/documentos.js";

const porSlug = new Map(especificacoes.map((s) => [s.slug, s]));
const bytes = (s) => new TextEncoder().encode(s).length;
const norm = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR");
const semAcento = (s) =>
  norm(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const splitLinhas = (s) => s.replace(/\r\n?/g, "\n").split("\n");
const indicador = (rotulo, n) => [rotulo, n];
const out = (spec, indicadores, colunas, linhas, notas = [], series = []) =>
  relatorio(spec, { indicadores, colunas, linhas, notas, series });
function parseDuplo(texto, marcador) {
  const idx = texto.indexOf(marcador);
  exigir(idx >= 0, `Separe os dois documentos com ${marcador}.`);
  let a = texto.slice(0, idx).trim(),
    b = texto.slice(idx + marcador.length).trim();
  a = a.replace(/^--- VERS(?:ÃO|ION) 1 ---\s*/i, "");
  b = b.replace(/^\s*\n?--- VERS(?:ÃO|ION) 2 ---\s*/i, "");
  exigir(
    a.length > 0 && b.length > 0,
    "As duas versões precisam conter texto.",
  );
  return [a, b];
}
function headings(texto) {
  const result = [];
  let fence = null;
  for (const [i, line] of splitLinhas(texto).entries()) {
    const f = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (f) {
      if (!fence) fence = { char: f[1][0], len: f[1].length };
      else if (
        f[1][0] === fence.char &&
        f[1].length >= fence.len &&
        !f[2].trim()
      )
        fence = null;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m)
      result.push({
        linha: i + 1,
        texto: line.trim(),
        nivel: m[1].length,
        titulo: m[2],
      });
  }
  return result;
}
function tableCells(line) {
  const cells = [];
  let buf = "",
    fence = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && i + 1 < line.length) {
      buf += line[i] + line[++i];
      continue;
    }
    if (c === "`") {
      let n = 1;
      while (line[i + 1] === "`") {
        i++;
        n++;
      }
      if (!fence) fence = n;
      else if (n === fence) fence = 0;
      buf += "`".repeat(n);
      continue;
    }
    if (c === "|" && !fence) {
      cells.push(buf.trim());
      buf = "";
    } else buf += c;
  }
  cells.push(buf.trim());
  if (cells[0] === "") cells.shift();
  if (cells.at(-1) === "") cells.pop();
  return cells;
}
const tableSeparator = (line) => {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
};
function parseHeadingBlocks(texto) {
  const ls = splitLinhas(texto),
    hs = headings(texto);
  if (!hs.length) return [{ titulo: "Documento", linhas: ls, inicio: 1 }];
  const blocks = hs.map((h, i) => ({
    titulo: h.titulo,
    linhas: ls.slice(
      h.linha,
      i + 1 < hs.length ? hs[i + 1].linha - 1 : ls.length,
    ),
    inicio: h.linha,
  }));
  if (ls.slice(0, hs[0].linha - 1).some((l) => l.trim()))
    blocks.unshift({
      titulo: "Preâmbulo",
      linhas: ls.slice(0, hs[0].linha - 1),
      inicio: 1,
    });
  return blocks;
}
function tokens(s) {
  return norm(s).match(/[\p{L}\p{N}_-]+/gu) || [];
}
function shingles(x) {
  const t = tokens(x);
  const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t[i] + " " + t[i + 1]);
  if (!set.size && t.length) set.add(t[0]);
  return set;
}
function similaridade(A, B) {
  if (!A.size && !B.size) return 1;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / (A.size + B.size - n || 1);
}
function data(texto) {
  const m = texto.match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!m) return null;
  const h = +(m[1] || 0),
    min = +m[2],
    sec = +m[3],
    ms = +m[4];
  if (min > 59 || sec > 59) return null;
  return ((h * 60 + min) * 60 + sec) * 1000 + ms;
}
const semverValido = (v) => {
  const m = v.match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
  );
  return Boolean(
    m &&
    (!m[4] ||
      m[4]
        .split(".")
        .every((x) => !/^\d+$/.test(x) || x === "0" || !x.startsWith("0"))),
  );
};
function urls(texto) {
  return [...texto.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"')\]]+/gi)].map(
    (m) => ({
      url: m[0].replace(/[.,;:]+$/, ""),
      linha: texto.slice(0, m.index).split("\n").length,
    }),
  );
}

function processar(spec, dados) {
  const texto =
    typeof dados?.texto === "string"
      ? dados.texto.replace(/\r\n?/g, "\n")
      : dados?.texto;
  exigir(
    typeof texto === "string" && texto.trim().length > 0,
    "Envie o texto extraído do documento.",
  );
  exigir(bytes(texto) <= 1_000_000, "O texto deve ter no máximo 1 MB.");
  exigir(
    !texto.includes("\u0000"),
    "O conteúdo parece binário; envie texto já extraído de TXT, Markdown, PDF ou DOCX.",
  );
  const ls = splitLinhas(texto),
    hs = headings(texto);
  exigir(
    ls.length <= 20000,
    "Divida o documento em lotes de até 20.000 linhas.",
  );
  switch (spec.slug) {
    case "referencias-cruzadas-documento": {
      const defs = [];
      for (const h of hs) {
        const section = h.titulo.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
        if (section)
          defs.push({ tipo: "Seção", id: section[1], linha: h.linha });
        const item = h.titulo.match(
          /^(Tabela|Figura|Anexo)\s+(\d+(?:\.\d+)*)\b/i,
        );
        if (item)
          defs.push({
            tipo: item[1][0].toUpperCase() + item[1].slice(1).toLowerCase(),
            id: item[2],
            linha: h.linha,
          });
      }
      const mentions = [];
      for (const [i, l] of ls.entries()) {
        if (/^\s*#{1,6}\s/.test(l)) continue;
        for (const m of l.matchAll(
          /\b(se[cç][aã]o|tabela|figura|anexo)\s+(\d+(?:\.\d+)*)/gi,
        ))
          mentions.push({
            tipo: m[1].toLowerCase().startsWith("se")
              ? "Seção"
              : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(),
            id: m[2],
            linha: i + 1,
          });
      }
      const counts = new Map(),
        rows = [];
      for (const d of defs) {
        const key = `${d.tipo}:${d.id}`,
          n = (counts.get(key) || 0) + 1;
        counts.set(key, n);
        if (n > 1) rows.push([d.tipo, d.id, d.linha, "Definição duplicada"]);
      }
      for (const m of mentions) {
        const n = counts.get(`${m.tipo}:${m.id}`) || 0;
        rows.push([
          m.tipo,
          m.id,
          m.linha,
          n > 1 ? "Destino ambíguo" : n ? "Resolvida" : "Destino ausente",
        ]);
      }
      for (const d of defs)
        if (
          !mentions.some((m) => m.tipo === d.tipo && m.id === d.id) &&
          counts.get(`${d.tipo}:${d.id}`) === 1
        )
          rows.push([d.tipo, d.id, d.linha, "Sem referência recebida"]);
      return out(
        spec,
        [
          indicador("Menções", mentions.length),
          indicador("Destinos", defs.length),
          indicador("Achados", rows.filter((r) => r[3] !== "Resolvida").length),
        ],
        ["Tipo", "Número", "Linha", "Estado"],
        rows,
        [
          "Alvos são tipados: uma seção numérica não valida uma referência a tabela; análise de texto explícita.",
        ],
      );
    }
    case "concordancia-terminologica": {
      const ix = texto.indexOf("GLOSSÁRIO:");
      exigir(
        ix >= 0,
        "Inclua GLOSSÁRIO: e uma lista de termos preferidos | variantes.",
      );
      const gloss = splitLinhas(texto.slice(ix + "GLOSSÁRIO:".length))
        .map((l) => l.trim())
        .filter((l) => l.includes("|"))
        .map((l) => l.split("|").map((x) => x.trim()));
      exigir(
        gloss.length > 0 && gloss.length <= 200,
        "Informe de 1 a 200 termos no glossário.",
      );
      const corpo = norm(texto.slice(0, ix)),
        rows = [];
      for (const [preferido, ...vars] of gloss) {
        exigir(
          preferido.length <= 128,
          "Cada termo do glossário deve ter até 128 caracteres.",
        );
        if (!preferido) continue;
        for (const termo of [preferido, ...vars].filter(Boolean)) {
          exigir(
            termo.length <= 128,
            "Cada variante do glossário deve ter até 128 caracteres.",
          );
          const needle = norm(termo);
          let n = 0,
            pos = 0;
          while ((pos = corpo.indexOf(needle, pos)) >= 0) {
            const before = corpo[pos - 1] || "",
              after = corpo[pos + needle.length] || "";
            const word = (c) => /[\p{L}\p{N}_]/u.test(c);
            if (!word(before) && !word(after)) n++;
            pos += Math.max(1, needle.length);
          }
          rows.push([
            preferido,
            termo,
            n,
            termo === preferido
              ? "Preferido"
              : n
                ? "Variante encontrada"
                : "Sem ocorrência",
          ]);
        }
      }
      return out(
        spec,
        [
          indicador("Termos no glossário", gloss.length),
          indicador(
            "Variantes encontradas",
            rows.filter((r) => r[3] === "Variante encontrada").length,
          ),
        ],
        ["Preferido", "Forma", "Ocorrências", "Estado"],
        rows,
        [
          "Busca literal por fronteira de palavra; não infere flexão ou equivalência semântica.",
        ],
      );
    }
    case "matriz-rastreabilidade-requisitos": {
      const req = [],
        mentions = new Map(),
        declarations = new Set();
      ls.forEach((l, i) => {
        const m = l.match(/^\s*(REQ-\d+)\s*:\s*(.*)/i);
        if (m) {
          req.push({ id: m[1].toUpperCase(), texto: m[2], linha: i + 1 });
          declarations.add(i + 1);
        }
      });
      exigir(req.length > 0, "Nenhum requisito REQ-n foi encontrado.");
      for (const [i, l] of ls.entries())
        if (!declarations.has(i + 1))
          for (const m of l.matchAll(/\bREQ-\d+\b/gi)) {
            const id = m[0].toUpperCase(),
              hits = mentions.get(id) || [];
            hits.push(i + 1);
            mentions.set(id, hits);
          }
      const counts = new Map();
      for (const r of req) counts.set(r.id, (counts.get(r.id) || 0) + 1);
      const rows = req.map((r) => {
        const evidence = mentions.get(r.id) || [];
        return [
          r.id,
          r.texto,
          r.linha,
          evidence.length ? "Coberto por menção" : "Sem evidência posterior",
          evidence.join(", "),
          counts.get(r.id) > 1 ? "ID duplicado" : "",
        ];
      });
      for (const [id, hits] of mentions)
        if (!counts.has(id))
          rows.push([
            id,
            "",
            null,
            "Menção órfã",
            hits.join(", "),
            "Sem declaração",
          ]);
      const covered = req.filter((r) => mentions.has(r.id)).length;
      return out(
        spec,
        [
          indicador("Requisitos", req.length),
          indicador("Com menção posterior", covered),
          indicador("Cobertura (%)", Math.round((covered / req.length) * 100)),
        ],
        [
          "ID",
          "Requisito",
          "Linha",
          "Cobertura",
          "Linhas de evidência",
          "Integridade do ID",
        ],
        rows,
        [
          "Cobertura mede menções fora das declarações, inclusive anteriores; não comprova implementação. IDs com zeros iniciais são distintos.",
        ],
      );
    }
    case "clausulas-quase-duplicadas": {
      const lim = numeroOpcao(dados, "limiar", 50, 10, 100) / 100;
      const paras = texto
        .split(/\n\s*\n/)
        .map((t, i) => ({ t: t.trim(), i: i + 1 }))
        .filter((p) => p.t.length > 20);
      exigir(
        paras.length >= 2,
        "Informe ao menos dois parágrafos com mais de 20 caracteres.",
      );
      exigir(
        paras.length <= 140,
        "Compare no máximo 140 parágrafos por lote (9.730 pares).",
      );
      const sets = paras.map((p) => shingles(p.t));
      const rows = [];
      for (let i = 0; i < paras.length; i++)
        for (let j = i + 1; j < paras.length; j++) {
          const score = similaridade(sets[i], sets[j]);
          if (score >= lim)
            rows.push([
              paras[i].i,
              paras[j].i,
              Number(score.toFixed(4)),
              paras[i].t.slice(0, 180),
              paras[j].t.slice(0, 180),
            ]);
        }
      return out(
        spec,
        [
          indicador("Pares semelhantes", rows.length),
          indicador("Limiar (%)", lim * 100),
        ],
        ["Parágrafo A", "Parágrafo B", "Jaccard", "Trecho A", "Trecho B"],
        rows,
        [
          "Similaridade de shingles de duas palavras; não equivale a equivalência jurídica.",
        ],
      );
    }
    case "segmentador-estrutural-documento": {
      const alvo = numeroOpcao(dados, "alvo", 1000, 100, 10000),
        overlap = numeroOpcao(dados, "sobreposicao", 100, 0, 1000);
      exigir(
        Number.isInteger(alvo) && Number.isInteger(overlap) && overlap < alvo,
        "Use tamanhos inteiros e sobreposição menor que o alvo.",
      );
      const blocks = [],
        headingLines = new Map(hs.map((h) => [h.linha, h.titulo]));
      let block = null,
        title = "Documento";
      const close = () => {
        if (block) {
          blocks.push(block);
          block = null;
        }
      };
      ls.forEach((line, i) => {
        if (headingLines.has(i + 1)) {
          close();
          title = headingLines.get(i + 1);
          blocks.push({
            txt: line,
            inicio: i + 1,
            fim: i + 1,
            titulo: title,
            heading: true,
          });
          return;
        }
        if (!line.trim()) {
          close();
          return;
        }
        if (!block)
          block = { txt: line, inicio: i + 1, fim: i + 1, titulo: title };
        else {
          block.txt += "\n" + line;
          block.fim = i + 1;
        }
      });
      close();
      const chunks = [];
      let current = null;
      const flush = () => {
        if (current) chunks.push(current);
        current = null;
      };
      for (const b of blocks) {
        if (b.heading) {
          flush();
          current = { ...b };
          continue;
        }
        if (current && current.txt.length + 2 + b.txt.length > alvo) {
          const previous = current;
          flush();
          const tail = overlap ? previous.txt.slice(-overlap) : "";
          current = {
            titulo: b.titulo,
            inicio: tail
              ? previous.fim - (tail.match(/\n/g) || []).length
              : b.inicio,
            fim: b.fim,
            txt: (tail ? tail + "\n\n" : "") + b.txt,
          };
        } else if (current) {
          current.txt += "\n\n" + b.txt;
          current.fim = b.fim;
        } else current = { ...b };
      }
      flush();
      return out(
        spec,
        [
          indicador("Trechos", chunks.length),
          indicador("Caracteres", texto.length),
        ],
        [
          "Trecho",
          "Título de origem",
          "Linha inicial",
          "Linha final",
          "Caracteres",
          "Texto",
        ],
        chunks.map((c, i) => [
          i + 1,
          c.titulo,
          c.inicio,
          c.fim,
          c.txt.length,
          c.txt,
        ]),
        [
          "Alvo é flexível: um parágrafo indivisível pode excedê-lo. Sobreposição pode começar no meio de uma linha; intervalos apontam linhas de origem, com lacunas em branco normalizadas.",
        ],
      );
    }
    case "diff-hierarquico-documentos": {
      const [a, b] = parseDuplo(texto, "--- VERSÃO 2 ---");
      const A = parseHeadingBlocks(a),
        B = parseHeadingBlocks(b);
      exigir(
        A.length <= 400 && B.length <= 400,
        "Cada versão pode ter até 400 seções para comparar com LCS; divida o documento.",
      );
      const normBlock = (x) =>
        norm(x.titulo + "\n" + x.linhas.join("\n"))
          .replace(/\s+/g, " ")
          .trim();
      const normA = A.map(normBlock),
        normB = B.map(normBlock);
      // IDs internados evitam reprocessar o texto em cada célula e colisões de hash.
      const ids = new Map();
      const intern = (value) => {
        if (!ids.has(value)) ids.set(value, ids.size);
        return ids.get(value);
      };
      const idsA = normA.map(intern),
        idsB = normB.map(intern);
      const dp = Array.from({ length: A.length + 1 }, () =>
        Array(B.length + 1).fill(0),
      );
      for (let i = A.length - 1; i >= 0; i--)
        for (let j = B.length - 1; j >= 0; j--)
          dp[i][j] =
            idsA[i] === idsB[j]
              ? 1 + dp[i + 1][j + 1]
              : Math.max(dp[i + 1][j], dp[i][j + 1]);
      const keepA = new Set(),
        keepB = new Set();
      let i = 0,
        j = 0;
      while (i < A.length && j < B.length) {
        if (idsA[i] === idsB[j]) {
          keepA.add(i);
          keepB.add(j);
          i++;
          j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
      }
      const unmatchedA = A.map((x, k) => ({ x, k })).filter(
          (o) => !keepA.has(o.k),
        ),
        unmatchedB = B.map((x, k) => ({ x, k })).filter((o) => !keepB.has(o.k));
      const rows = [],
        usedB = new Set();
      for (const old of unmatchedA) {
        const sameTitle = unmatchedB.find(
          (n) =>
            !usedB.has(n.k) &&
            norm(n.x.titulo) === norm(old.x.titulo) &&
            normA[old.k] !== normB[n.k],
        );
        if (sameTitle) {
          usedB.add(sameTitle.k);
          rows.push([
            old.x.titulo,
            "Alterada",
            old.k + 1,
            sameTitle.k + 1,
            old.x.linhas.join(" ").trim().slice(0, 180) +
              " → " +
              sameTitle.x.linhas.join(" ").trim().slice(0, 180),
          ]);
        }
      }
      for (const old of unmatchedA) {
        if (rows.some((r) => r[2] === old.k + 1)) continue;
        const moved = unmatchedB.find(
          (n) => !usedB.has(n.k) && normA[old.k] === normB[n.k],
        );
        if (moved) {
          usedB.add(moved.k);
          rows.push([
            old.x.titulo,
            "Movida",
            old.k + 1,
            moved.k + 1,
            old.x.linhas.join(" ").trim().slice(0, 250),
          ]);
        } else
          rows.push([
            old.x.titulo,
            "Removida",
            old.k + 1,
            "",
            old.x.linhas.join(" ").trim().slice(0, 250),
          ]);
      }
      for (const added of unmatchedB)
        if (!usedB.has(added.k))
          rows.push([
            added.x.titulo,
            "Adicionada",
            "",
            added.k + 1,
            added.x.linhas.join(" ").trim().slice(0, 250),
          ]);
      return out(
        spec,
        [
          indicador("Seções versão 1", A.length),
          indicador("Seções versão 2", B.length),
          indicador("Mudanças", rows.length),
        ],
        ["Seção", "Tipo", "Posição V1", "Posição V2", "Conteúdo"],
        rows,
        [
          "LCS sobre blocos de seção normalizados; movimento exige conteúdo exatamente igual.",
        ],
      );
    }
    case "integridade-numeracao-secoes": {
      const seq = [];
      hs.forEach((h) => {
        const m = h.titulo.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
        if (m)
          seq.push({ n: m[1], titulo: m[2], linha: h.linha, nivel: h.nivel });
      });
      exigir(seq.length > 0, "Nenhuma seção Markdown numerada foi encontrada.");
      const seen = new Set(),
        rows = [],
        siblings = new Map();
      for (const x of seq) {
        const parts = x.n.split(".").map(Number),
          parent = parts.slice(0, -1).join("."),
          key = parent + "|" + parts.length;
        let issue = "OK";
        if (seen.has(x.n)) issue = "Duplicada";
        else {
          const expected = (siblings.get(key) || 0) + 1;
          if (parts.at(-1) !== expected)
            issue = parts.at(-1) > expected ? "Salto" : "Regressão";
          if (parent && !seen.has(parent))
            issue =
              issue === "OK"
                ? "Seção-pai ausente"
                : issue + "; seção-pai ausente";
        }
        rows.push([x.n, x.linha, x.titulo, issue]);
        seen.add(x.n);
        siblings.set(key, Math.max(siblings.get(key) || 0, parts.at(-1)));
      }
      return out(
        spec,
        [
          indicador("Seções numeradas", seq.length),
          indicador("Achados", rows.filter((r) => r[3] !== "OK").length),
        ],
        ["Número", "Linha", "Título", "Estado"],
        rows,
        ["Verifica sequência em ordem textual; não reenumera automaticamente."],
      );
    }
    case "validador-legendas-srt-vtt": {
      const vtt = /^WEBVTT(?:\s|$)/.test(texto),
        chunks = texto
          .replace(/^WEBVTT[^\n]*\n?/, "")
          .split(/\n\s*\n/)
          .map((x) => x.trim())
          .filter(Boolean),
        rows = [],
        indices = new Set();
      let prevEnd = -1,
        prevStart = -1;
      for (const c of chunks) {
        if (vtt && /^(?:NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(c))
          continue;
        const lines = c.split("\n"),
          ti = lines.findIndex((l) => l.includes("-->"));
        const m =
          ti >= 0 &&
          lines[ti].match(
            /^((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3})\s+-->\s+((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3})(?:\s+.*)?$/,
          );
        const start = m ? data(m[1]) : null,
          end = m ? data(m[2]) : null,
          issues = [];
        const index = ti === 1 ? lines[0] : "",
          key = !vtt && /^\d+$/.test(index) ? String(Number(index)) : index;
        if (!m || start === null || end === null)
          issues.push("Timestamp inválido");
        else {
          if (
            !vtt &&
            (!m[1].includes(",") ||
              !m[2].includes(",") ||
              m[1].split(":").length !== 3 ||
              m[2].split(":").length !== 3)
          )
            issues.push("Formato SRT inválido");
          if (vtt && (m[1].includes(",") || m[2].includes(",")))
            issues.push("Formato WebVTT inválido");
          if (end <= start) issues.push("Duração inválida");
          if (start < prevStart) issues.push("Ordem invertida");
          if (start < prevEnd) issues.push("Sobreposição");
          prevStart = start;
          prevEnd = Math.max(prevEnd, end);
        }
        if (!vtt && !/^\d+$/.test(index))
          issues.push("Índice SRT ausente ou inválido");
        if (key && indices.has(key)) issues.push("Índice duplicado");
        if (key) indices.add(key);
        const caption = lines.slice(ti + 1).join(" ");
        if (!caption.trim()) issues.push("Texto de cue vazio");
        rows.push([
          index,
          m ? m[1] : "",
          m ? m[2] : "",
          start !== null && end !== null ? Math.max(0, end - start) : null,
          caption,
          issues.join("; ") || "OK",
        ]);
      }
      exigir(
        rows.length > 0 && rows.some((r) => r[1]),
        "Nenhum cue com timestamp reconhecido foi encontrado.",
      );
      return out(
        spec,
        [
          indicador("Cues", rows.length),
          indicador("Com avisos", rows.filter((r) => r[5] !== "OK").length),
        ],
        ["Índice", "Início", "Fim", "Duração ms", "Texto", "Estado"],
        rows,
        [
          "WebVTT aceita mm:ss.mmm e hh:mm:ss.mmm e ignora blocos NOTE/STYLE/REGION. Não valida sintaxe de cue settings ou sincronização com áudio.",
        ],
      );
    }
    case "diff-openapi-compatibilidade": {
      const [a, b] = parseDuplo(texto, "--- VERSÃO 2 ---");
      let A, B;
      try {
        A = JSON.parse(a);
        B = JSON.parse(b);
      } catch {
        throw new ErroProfissional(
          "As duas versões devem ser JSON OpenAPI válido.",
        );
      }
      const object = (x) =>
        x !== null && typeof x === "object" && !Array.isArray(x);
      for (const doc of [A, B])
        exigir(
          object(doc) && /^3\./.test(doc.openapi) && object(doc.paths),
          "Forneça documentos OpenAPI 3.x com objeto paths.",
        );
      const rows = [],
        methods = [
          "get",
          "post",
          "put",
          "patch",
          "delete",
          "options",
          "head",
          "trace",
        ];
      const issue = (path, method, what, severity = "Breaking") =>
        rows.push([path, method, what, severity]);
      const checkSchema = (sc, depth = 0) => {
        exigir(
          object(sc) && depth <= 12,
          "Schema inline deve ser objeto com até 12 níveis.",
        );
        exigir(
          ![
            "$ref",
            "allOf",
            "oneOf",
            "anyOf",
            "not",
            "if",
            "then",
            "else",
          ].some((k) => Object.hasOwn(sc, k)),
          "Este comparador exige schemas inline; $ref e composição/condicionais não são suportados.",
        );
        if (sc.type !== undefined)
          exigir(
            typeof sc.type === "string",
            "Uniões de tipos OpenAPI 3.1 não são suportadas.",
          );
        if (sc.enum !== undefined)
          exigir(Array.isArray(sc.enum), "enum deve ser uma lista.");
        if (sc.required !== undefined)
          exigir(
            Array.isArray(sc.required) &&
              sc.required.every((x) => typeof x === "string"),
            "required deve ser lista de propriedades.",
          );
        if (sc.properties !== undefined) {
          exigir(object(sc.properties), "properties deve ser objeto.");
          for (const child of Object.values(sc.properties))
            checkSchema(child, depth + 1);
        }
        if (sc.items !== undefined) checkSchema(sc.items, depth + 1);
      };
      const schemaDiff = (path, method, old, now, context, at = "$") => {
        if (old.type !== now.type)
          issue(
            path,
            method,
            `${at}: Tipo alterado: ${old.type || "não declarado"} → ${now.type || "não declarado"}`,
          );
        const key = (x) => JSON.stringify(x),
          oldE = old.enum?.map(key),
          newE = now.enum?.map(key);
        if (
          context === "entrada" &&
          newE &&
          (!oldE || oldE.some((x) => !newE.includes(x)))
        )
          issue(path, method, `${at}: Enum restringido`);
        if (
          context === "resposta" &&
          oldE &&
          (!newE || newE.some((x) => !oldE.includes(x)))
        )
          issue(path, method, `${at}: Enum de resposta ampliado`);
        const oldReq = old.required || [],
          newReq = now.required || [];
        for (const name of new Set([...oldReq, ...newReq])) {
          if (!oldReq.includes(name) && newReq.includes(name))
            issue(
              path,
              method,
              `${at}: Campo obrigatório novo: ${name}`,
              context === "entrada" ? "Breaking" : "Adição",
            );
          if (oldReq.includes(name) && !newReq.includes(name))
            issue(
              path,
              method,
              `${at}: Campo antes obrigatório agora opcional: ${name}`,
              context === "resposta" ? "Breaking" : "Relaxamento",
            );
        }
        const props1 = old.properties || {},
          props2 = now.properties || {};
        for (const name of new Set([
          ...Object.keys(props1),
          ...Object.keys(props2),
        ])) {
          if (!Object.hasOwn(props2, name))
            issue(
              path,
              method,
              `${at}.${name}: Propriedade removida`,
              context === "resposta" ? "Breaking" : "Compatibilidade a revisar",
            );
          else if (!Object.hasOwn(props1, name))
            issue(
              path,
              method,
              `${at}.${name}: Propriedade adicionada`,
              "Adição",
            );
          else
            schemaDiff(
              path,
              method,
              props1[name],
              props2[name],
              context,
              at + "." + name,
            );
        }
        if (old.items && now.items)
          schemaDiff(path, method, old.items, now.items, context, at + "[]");
        else if (Boolean(old.items) !== Boolean(now.items))
          issue(
            path,
            method,
            `${at}: Schema de itens alterado`,
            "Compatibilidade a revisar",
          );
      };
      const parameterMap = (pathItem, op) => {
        const map = new Map();
        for (const list of [pathItem.parameters || [], op.parameters || []]) {
          exigir(Array.isArray(list), "parameters deve ser lista.");
          for (const p of list) {
            exigir(
              object(p) &&
                !p.$ref &&
                typeof p.name === "string" &&
                typeof p.in === "string",
              "Use parâmetros inline com name e in; $ref não é suportado.",
            );
            if (p.schema) checkSchema(p.schema);
            exigir(
              !p.content,
              "Parâmetros com content não são suportados; use schema inline.",
            );
            map.set(`${p.in}:${p.name}`, p);
          }
        }
        return map;
      };
      const contentSchemas = (node) => {
        exigir(
          object(node) && !node.$ref,
          "Responses e requestBody devem ser objetos inline, sem $ref.",
        );
        const content = node.content || {};
        exigir(object(content), "content deve ser objeto.");
        for (const media of Object.values(content)) {
          exigir(object(media), "Tipo de mídia inválido.");
          if (media.schema) checkSchema(media.schema);
        }
        return content;
      };
      // Valida inclusive operações adicionadas/removidas para não declarar cobertura de recursos ignorados.
      for (const doc of [A, B])
        for (const item of Object.values(doc.paths)) {
          exigir(
            object(item) && !item.$ref,
            "Path Item deve ser objeto inline, sem $ref.",
          );
          for (const method of methods)
            if (item[method]) {
              const op = item[method];
              exigir(object(op), "Operação deve ser objeto.");
              parameterMap(item, op);
              exigir(
                object(op.responses),
                "Cada operação deve conter responses.",
              );
              for (const response of Object.values(op.responses))
                contentSchemas(response);
              if (op.requestBody) contentSchemas(op.requestBody);
            }
        }
      for (const path of new Set([
        ...Object.keys(A.paths),
        ...Object.keys(B.paths),
      ]))
        for (const method of methods) {
          const old = A.paths[path]?.[method],
            now = B.paths[path]?.[method];
          if (old && !now) issue(path, method, "Endpoint removido");
          else if (!old && now)
            issue(path, method, "Endpoint adicionado", "Adição");
          else if (old && now) {
            const p1 = parameterMap(A.paths[path], old),
              p2 = parameterMap(B.paths[path], now);
            for (const [key, p] of p1) {
              const q = p2.get(key);
              if (!q)
                issue(
                  path,
                  method,
                  `Parâmetro removido: ${key}`,
                  "Compatibilidade a revisar",
                );
              else {
                if (!p.required && q.required)
                  issue(path, method, `Parâmetro agora obrigatório: ${key}`);
                schemaDiff(
                  path,
                  method,
                  p.schema || {},
                  q.schema || {},
                  "entrada",
                  key,
                );
              }
            }
            for (const [key, p] of p2)
              if (!p1.has(key))
                issue(
                  path,
                  method,
                  `Parâmetro adicionado: ${key}`,
                  p.required ? "Breaking" : "Adição",
                );
            if (!old.requestBody?.required && now.requestBody?.required)
              issue(path, method, "Corpo agora obrigatório");
            if (old.requestBody && !now.requestBody)
              issue(
                path,
                method,
                "Corpo de entrada removido",
                "Compatibilidade a revisar",
              );
            for (const context of ["entrada", "resposta"]) {
              const nodes1 =
                context === "entrada"
                  ? { body: old.requestBody || {} }
                  : old.responses;
              const nodes2 =
                context === "entrada"
                  ? { body: now.requestBody || {} }
                  : now.responses;
              for (const code of new Set([
                ...Object.keys(nodes1),
                ...Object.keys(nodes2),
              ])) {
                if (!nodes2[code]) {
                  issue(
                    path,
                    method,
                    `Resposta ${code} removida`,
                    "Compatibilidade a revisar",
                  );
                  continue;
                }
                if (!nodes1[code]) {
                  issue(path, method, `Resposta ${code} adicionada`, "Adição");
                  continue;
                }
                const c1 = contentSchemas(nodes1[code]),
                  c2 = contentSchemas(nodes2[code]);
                for (const media of new Set([
                  ...Object.keys(c1),
                  ...Object.keys(c2),
                ])) {
                  if (!c2[media])
                    issue(
                      path,
                      method,
                      `${context} ${code}: Mídia removida ${media}`,
                    );
                  else if (!c1[media])
                    issue(
                      path,
                      method,
                      `${context} ${code}: Mídia adicionada ${media}`,
                      "Adição",
                    );
                  else
                    schemaDiff(
                      path,
                      method,
                      c1[media].schema || {},
                      c2[media].schema || {},
                      context,
                      `${context} ${code} ${media}`,
                    );
                }
              }
            }
          }
        }
      const count = (doc) =>
        Object.values(doc.paths).reduce(
          (n, p) => n + methods.filter((m) => p[m]).length,
          0,
        );
      return out(
        spec,
        [
          indicador("Endpoints V1", count(A)),
          indicador("Endpoints V2", count(B)),
          indicador("Mudanças", rows.length),
        ],
        ["Path", "Método", "Mudança", "Compatibilidade"],
        rows,
        [
          "Compara entrada e resposta em direções diferentes: restringir enum de entrada e ampliar enum de resposta são breaking. Mudança de tipo é conservadoramente breaking; restrições como format/min/max, autenticação e links não são verificadas.",
        ],
      );
    }
    case "validador-sbom-spdx-cyclonedx": {
      let bom;
      try {
        bom = JSON.parse(texto);
      } catch {
        throw new ErroProfissional("Envie um SBOM em JSON válido.");
      }
      exigir(
        bom && typeof bom === "object" && !Array.isArray(bom),
        "SBOM deve ser objeto JSON.",
      );
      const format =
        bom.bomFormat === "CycloneDX"
          ? "CycloneDX"
          : typeof bom.spdxVersion === "string"
            ? "SPDX"
            : "";
      exigir(
        format,
        "Formato não reconhecido: esperado CycloneDX JSON ou SPDX JSON.",
      );
      exigir(
        format === "CycloneDX"
          ? bom.specVersion === "1.5"
          : /^SPDX-2\.[23]$/.test(bom.spdxVersion),
        "Use CycloneDX 1.5 ou SPDX 2.2/2.3 JSON.",
      );
      const components = [],
        add = (items, depth = 0) => {
          exigir(
            Array.isArray(items) && depth <= 12,
            "Componentes devem ser lista com até 12 níveis.",
          );
          for (const c of items) {
            exigir(
              c && typeof c === "object" && !Array.isArray(c),
              "Componente inválido.",
            );
            components.push(c);
            if (c.components) add(c.components, depth + 1);
          }
        };
      add(format === "CycloneDX" ? bom.components || [] : bom.packages || []);
      exigir(
        components.length > 0 && components.length <= 2000,
        "Informe de 1 a 2.000 componentes.",
      );
      const option =
        dados.opcoes?.licencasBloqueadas ?? "GPL-3.0-only,AGPL-3.0-only";
      exigir(
        typeof option === "string" && option.length <= 2000,
        "A lista de licenças bloqueadas deve ser texto de até 2.000 caracteres.",
      );
      const deny = new Set(
          option
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        ),
        seen = new Set(),
        refs = new Set(),
        rows = [];
      if (format === "CycloneDX" && bom.metadata?.component?.["bom-ref"])
        refs.add(bom.metadata.component["bom-ref"]);
      if (format === "SPDX") {
        if (bom.SPDXID) refs.add(bom.SPDXID);
        refs.add("SPDXRef-DOCUMENT");
        exigir(!bom.files || Array.isArray(bom.files), "files deve ser lista.");
        for (const f of bom.files || []) {
          exigir(
            f && typeof f.SPDXID === "string",
            "Arquivo SPDX precisa de SPDXID.",
          );
          refs.add(f.SPDXID);
        }
      }
      for (const c of components) {
        const name = typeof c.name === "string" ? c.name : "",
          version = String(c.versionInfo || c.version || ""),
          ref = format === "CycloneDX" ? c["bom-ref"] : c.SPDXID,
          issues = [];
        if (!name) issues.push("Nome ausente");
        if (!version) issues.push("Versão ausente");
        const key = `${name}@${version}`;
        if (seen.has(key)) issues.push("Componente duplicado");
        seen.add(key);
        if (!ref && format === "SPDX") issues.push("SPDXID ausente");
        if (ref) {
          exigir(
            typeof ref === "string",
            "Identificador de componente deve ser texto.",
          );
          if (refs.has(ref)) issues.push("Identificador duplicado");
          refs.add(ref);
        }
        let licences = [];
        if (format === "CycloneDX") {
          exigir(
            !c.licenses || Array.isArray(c.licenses),
            "licenses deve ser lista.",
          );
          licences = (c.licenses || [])
            .map((x) => {
              exigir(x && typeof x === "object", "Licença inválida.");
              return x.license?.id || x.expression || x.license?.name || "";
            })
            .filter(Boolean);
        } else
          licences = [c.licenseConcluded, c.licenseDeclared].filter(Boolean);
        exigir(
          licences.every((x) => typeof x === "string"),
          "Expressões de licença devem ser texto.",
        );
        if (
          !licences.length ||
          licences.every((x) => ["NOASSERTION", "NONE"].includes(x))
        )
          issues.push("Licença não declarada");
        const blocked = [
          ...new Set(
            licences
              .flatMap((x) => x.match(/[A-Za-z0-9][A-Za-z0-9.+-]*/g) || [])
              .filter((x) => deny.has(x)),
          ),
        ];
        if (blocked.length)
          issues.push("Licença bloqueada: " + blocked.join(", "));
        if (licences.some((x) => /\bOR\b|\bWITH\b/.test(x)))
          issues.push("Expressão de licença: revisar alternativas/exceções");
        rows.push([
          name,
          version,
          licences.join(" | "),
          issues.join("; ") || "OK",
        ]);
      }
      if (format === "CycloneDX") {
        exigir(
          !bom.dependencies || Array.isArray(bom.dependencies),
          "dependencies deve ser lista.",
        );
        for (const d of bom.dependencies || []) {
          exigir(
            d &&
              typeof d === "object" &&
              (!d.dependsOn || Array.isArray(d.dependsOn)),
            "Dependência inválida.",
          );
          if (!refs.has(d.ref))
            rows.push([
              d.ref || "",
              "",
              "",
              "Referência de dependência ausente",
            ]);
          for (const dep of d.dependsOn || [])
            if (!refs.has(dep))
              rows.push([
                d.ref || "",
                "",
                String(dep),
                "Destino de dependência ausente",
              ]);
        }
      } else {
        exigir(
          !bom.relationships || Array.isArray(bom.relationships),
          "relationships deve ser lista.",
        );
        for (const r of bom.relationships || []) {
          exigir(r && typeof r === "object", "Relacionamento SPDX inválido.");
          if (
            !refs.has(r.spdxElementId) ||
            (!refs.has(r.relatedSpdxElement) &&
              !["NONE", "NOASSERTION"].includes(r.relatedSpdxElement))
          )
            rows.push([
              r.spdxElementId || "",
              "",
              r.relatedSpdxElement || "",
              "Referência SPDX inexistente",
            ]);
        }
      }
      return out(
        spec,
        [
          indicador("Formato", format),
          indicador("Componentes", components.length),
          indicador("Achados", rows.filter((r) => r[3] !== "OK").length),
        ],
        ["Componente", "Versão", "Licença", "Estado"],
        rows,
        [
          "Inspeção estrutural local, sem validação completa do padrão. Todas as licenças são comparadas à deny list; uma alternativa bloqueada exige revisão mesmo se outra alternativa é permitida. bom-ref CycloneDX é opcional quando não referenciado.",
        ],
      );
    }
    case "auditoria-acessibilidade-markdown": {
      const rows = [];
      let last = 0;
      ls.forEach((l, i) => {
        const h = l.match(/^\s*(#{1,6})\s+/);
        if (h) {
          const lev = h[1].length;
          if (last && lev > last + 1)
            rows.push([
              i + 1,
              "Salto de heading",
              `H${last} → H${lev}`,
              "Use níveis sequenciais",
            ]);
          last = lev;
        }
        for (const m of l.matchAll(/!\[([^\]]*)\]\([^)]+\)/g))
          if (!m[1].trim())
            rows.push([
              i + 1,
              "Imagem sem alt",
              "alt vazio",
              "Descreva a finalidade da imagem",
            ]);
        for (const m of l.matchAll(/\[([^\]]+)\]\([^)]+\)/g))
          if (/^(clique aqui|saiba mais|aqui)$/i.test(m[1].trim()))
            rows.push([
              i + 1,
              "Link genérico",
              m[1],
              "Use rótulo que descreva o destino",
            ]);
        if (
          /^\s*\|/.test(l) &&
          (i === 0 || !/^\s*\|/.test(ls[i - 1])) &&
          (!ls[i + 1] || !tableSeparator(ls[i + 1]))
        )
          rows.push([
            i + 1,
            "Tabela sem cabeçalho",
            "Separador ausente",
            "Inclua cabeçalho e separador",
          ]);
      });
      let fence = false;
      ls.forEach((l, i) => {
        if (/^\s*```/.test(l)) {
          if (!fence && !/^\s*```[\w+-]+/.test(l))
            rows.push([
              i + 1,
              "Código sem linguagem",
              "",
              "Declare linguagem quando aplicável",
            ]);
          fence = !fence;
        }
      });
      return out(
        spec,
        [
          indicador("Achados", rows.length),
          indicador(
            "Imagens sem alt",
            rows.filter((r) => r[1] === "Imagem sem alt").length,
          ),
        ],
        ["Linha", "Regra", "Trecho", "Correção sugerida"],
        rows,
        ["Auditoria estática de Markdown; não certifica WCAG."],
      );
    }
    case "auditor-rfc2119-normativo": {
      const rows = [];
      ls.forEach((line, i) => {
        for (const m of line.matchAll(
          /\b(MUST NOT|SHOULD NOT|MUST|SHOULD|MAY|REQUIRED|RECOMMENDED|OPTIONAL)\b/g,
        )) {
          const id = line.match(/\b(?:REQ|RFC)-?\d+\b/i)?.[0] || "",
            exception = /\b(unless|except|exceto|a menos que)\b/i.test(line);
          rows.push([
            i + 1,
            id,
            m[1],
            exception ? "Exceção textual" : "",
            line.trim(),
          ]);
        }
      });
      exigir(
        rows.length > 0,
        "Nenhuma palavra normativa RFC 2119 em caixa alta foi encontrada.",
      );
      return out(
        spec,
        [
          indicador("Declarações normativas", rows.length),
          indicador("Sem ID", rows.filter((r) => !r[1]).length),
          indicador("Com exceção", rows.filter((r) => r[3]).length),
        ],
        ["Linha", "ID", "Força", "Exceção", "Declaração"],
        rows,
        [
          "Extrai cada palavra-chave na mesma linha do ID; exceções são marcadores textuais, sem interpretação normativa.",
        ],
      );
    }
    case "validar-placeholders-icu": {
      const [a, b] = parseDuplo(texto, "--- TRADUÇÃO ---");
      const extract = (s) => {
        exigir(
          !/'[{}#]/.test(s) && !/''/.test(s),
          "Escape ICU com apóstrofo não é suportado; use mensagens sem quoting ICU.",
        );
        const found = [];
        let i = 0;
        while (i < s.length) {
          if (s[i] === "}") {
            throw new ErroProfissional(
              "Chave de placeholder fechada sem abertura.",
            );
          }
          if (s[i] !== "{") {
            i++;
            continue;
          }
          const start = i++;
          let depth = 1;
          while (i < s.length && depth) {
            if (s[i] === "{") depth++;
            else if (s[i] === "}") depth--;
            i++;
          }
          exigir(depth === 0, "Placeholder ICU sem chave de fechamento.");
          const body = s.slice(start + 1, i - 1);
          let cut = -1,
            nested = 0;
          for (let j = 0; j < body.length; j++) {
            if (body[j] === "{") nested++;
            else if (body[j] === "}") nested--;
            else if (body[j] === "," && nested === 0) {
              cut = j;
              break;
            }
          }
          const name = (cut < 0 ? body : body.slice(0, cut)).trim();
          exigir(
            /^[\w.-]+$/.test(name),
            "Nome de placeholder ICU não suportado.",
          );
          let type = "string",
            categories = "";
          if (cut >= 0) {
            const rest = body.slice(cut + 1).trim();
            const comma = rest.indexOf(",");
            type = (comma < 0 ? rest : rest.slice(0, comma))
              .trim()
              .toLowerCase();
            exigir(
              [
                "number",
                "date",
                "time",
                "plural",
                "select",
                "selectordinal",
              ].includes(type),
              `Tipo ICU não suportado: ${type || "vazio"}.`,
            );
            if (["plural", "select", "selectordinal"].includes(type)) {
              exigir(
                comma >= 0,
                "Placeholder ICU de seleção precisa declarar opções.",
              );
              const arms = rest.slice(comma + 1);
              const cats = [];
              let k = 0;
              while (k < arms.length) {
                while (/\s/.test(arms[k] || "")) k++;
                if (k >= arms.length) break;
                const m = arms.slice(k).match(/^(=?[\w-]+)\s*\{/);
                exigir(
                  m,
                  "Opção ICU não reconhecida; use categorias nomeadas com blocos.",
                );
                exigir(!cats.includes(m[1]), "Categoria ICU duplicada.");
                exigir(
                  type === "select"
                    ? /^[\w-]+$/.test(m[1])
                    : /^(?:zero|one|two|few|many|other|=\d+)$/.test(m[1]),
                  "Categoria plural ICU não reconhecida.",
                );
                cats.push(m[1]);
                k += m[0].length;
                let d = 1,
                  inner = "";
                while (k < arms.length && d) {
                  if (arms[k] === "{") {
                    d++;
                    inner += arms[k];
                  } else if (arms[k] === "}") {
                    d--;
                    if (d) inner += arms[k];
                  } else inner += arms[k];
                  k++;
                }
                exigir(d === 0, "Bloco de opção ICU sem fechamento.");
                exigir(
                  !inner.includes("{"),
                  "Placeholders ICU aninhados em plural/select não são suportados.",
                );
              }
              exigir(
                cats.length > 0 && cats.includes("other"),
                "ICU plural/select deve incluir a opção other.",
              );
              categories = [...new Set(cats)].sort().join("|");
            } else
              exigir(
                comma < 0,
                "Formato ICU number/date/time com subformato não é suportado neste validador.",
              );
          }
          found.push(`${name}:${type}${categories ? ":" + categories : ""}`);
        }
        return found;
      };
      const A = extract(a),
        B = extract(b),
        keys = new Set([...A, ...B]);
      const rows = [...keys].map((k) => [
        k,
        A.filter((x) => x === k).length,
        B.filter((x) => x === k).length,
        A.filter((x) => x === k).length === B.filter((x) => x === k).length
          ? "OK"
          : "Divergente",
      ]);
      return out(
        spec,
        [
          indicador("Placeholders origem", A.length),
          indicador("Placeholders tradução", B.length),
          indicador("Divergências", rows.filter((r) => r[3] !== "OK").length),
        ],
        ["Argumento", "Origem", "Tradução", "Estado"],
        rows,
        [
          "Compara assinatura e categorias de placeholders; não interpreta gramática da tradução nem subformatos de número/data.",
        ],
      );
    }
    case "normalizador-referencias-bibliograficas": {
      const refs = ls
        .map((l, i) => ({ l: l.trim(), linha: i + 1 }))
        .filter((x) => x.l);
      const seen = new Map(),
        rows = [];
      for (const r of refs) {
        const doi =
          r.l
            .match(
              /(?:doi:\s*|https?:\/\/doi\.org\/)(10\.\d{4,9}\/[^\s]+)/i,
            )?.[1]
            ?.replace(/[.)]+$/, "")
            .toLowerCase() || "";
        const title = r.l
          .replace(/https?:\/\/\S+/g, "")
          .replace(/doi:\s*\S+/i, "")
          .replace(/[.,;:]+$/, "")
          .replace(/\s+/g, " ")
          .trim();
        const key = doi || semAcento(title);
        const dupe = seen.get(key);
        if (dupe)
          rows.push([r.linha, title, doi, "Duplicata de linha " + dupe]);
        else {
          seen.set(key, r.linha);
          rows.push([r.linha, title, doi, "Referência única"]);
        }
      }
      exigir(rows.length > 0, "Informe ao menos uma referência.");
      return out(
        spec,
        [
          indicador("Referências", rows.length),
          indicador(
            "Duplicatas",
            rows.filter((r) => r[3].startsWith("Duplicata")).length,
          ),
        ],
        ["Linha", "Referência normalizada", "DOI", "Estado"],
        rows,
        ["Não consulta catálogo bibliográfico externo."],
      );
    }
    case "extrator-acoes-atas": {
      const rows = [];
      ls.forEach((l, i) => {
        const m = l.match(/\b(ação|decisão|decidido|tarefa)\s*:?\s*(.*)/i);
        if (!m) return;
        const owner =
          m[2].match(/\b(?:responsável|owner)\s*[:=]\s*([^;,]+)/i)?.[1] ||
          m[2].match(
            /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+)\s+(?:revisar|enviar|publicar|aprovar|validar)\b/u,
          )?.[1] ||
          "";
        const date =
          m[2].match(
            /\b\d{4}-\d{2}-\d{2}\b|\b\d{2}[/-]\d{2}[/-]\d{4}\b/,
          )?.[0] || "";
        rows.push([
          i + 1,
          m[1],
          m[2].trim(),
          owner,
          date,
          !owner ? "Responsável ausente" : !date ? "Prazo ausente" : "Completa",
        ]);
      });
      return out(
        spec,
        [
          indicador("Ações/decisões", rows.length),
          indicador(
            "Campos faltantes",
            rows.filter((r) => r[5] !== "Completa").length,
          ),
        ],
        ["Linha", "Tipo", "Texto", "Responsável", "Prazo", "Estado"],
        rows,
        [
          "Extração por marcadores explícitos; datas relativas e compromissos implícitos não são inferidos.",
        ],
      );
    }
    case "integridade-tabelas-markdown": {
      const rows = [];
      let i = 0;
      while (i < ls.length) {
        if (!/^\s*\|/.test(ls[i])) {
          i++;
          continue;
        }
        const start = i,
          expected = tableCells(ls[i]).length;
        i++;
        if (i >= ls.length || !tableSeparator(ls[i]))
          rows.push([
            start + 1,
            expected,
            null,
            "Separador de cabeçalho ausente ou inválido",
          ]);
        else {
          const found = tableCells(ls[i]).length;
          if (found !== expected)
            rows.push([i + 1, expected, found, "Separador desalinhado"]);
          i++;
        }
        while (i < ls.length && /^\s*\|/.test(ls[i])) {
          const found = tableCells(ls[i]).length;
          if (found !== expected)
            rows.push([
              i + 1,
              expected,
              found,
              "Contagem diferente do cabeçalho",
            ]);
          i++;
        }
      }
      return out(
        spec,
        [indicador("Linhas inconsistentes", rows.length)],
        ["Linha", "Esperado", "Encontrado", "Estado"],
        rows,
        [
          "Subset: tabelas iniciadas por pipe; ignora pipes escapados e delimitados por runs de backticks de mesmo tamanho.",
        ],
      );
    }
    case "auditor-blocos-codigo-markdown": {
      const languageOption =
        dados.opcoes?.linguagens ??
        "js,ts,typescript,py,python,json,yaml,yml,bash,sh,html,css,sql,md,markdown";
      exigir(
        typeof languageOption === "string" && languageOption.length <= 2000,
        "Informe linguagens como texto de até 2.000 caracteres.",
      );
      const known = new Set(
        languageOption.split(",").map((x) => x.trim().toLowerCase()),
      );
      const rows = [];
      let open = null;
      ls.forEach((l, i) => {
        const m = l.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
        if (!m) return;
        const marker = m[1];
        if (!open) {
          const lang = m[2].trim().split(/[\s{]/)[0].toLowerCase();
          open = { marker: marker[0], len: marker.length, line: i + 1, lang };
          if (!lang) rows.push([i + 1, "Linguagem ausente", ""]);
          else if (!known.has(lang))
            rows.push([i + 1, "Linguagem não reconhecida", lang]);
        } else if (
          marker[0] === open.marker &&
          marker.length >= open.len &&
          !m[2].trim()
        ) {
          open = null;
        }
      });
      if (open) rows.push([open.line, "Cerca sem fechamento", open.lang]);
      return out(
        spec,
        [
          indicador("Achados", rows.length),
          indicador("Bloco não fechado", open ? 1 : 0),
        ],
        ["Linha", "Regra", "Linguagem"],
        rows,
        ["Não executa nem valida código."],
      );
    }
    case "consistencia-versoes-semver-documentos": {
      const matches = [];
      ls.forEach((line, i) => {
        for (const m of line.matchAll(
          /\bv?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)(?![\w-]|\.\d)/g,
        ))
          matches.push({
            v: m[1].replace(/\.+$/, ""),
            linha: i + 1,
            contexto: line.trim(),
            valid: semverValido(m[1].replace(/\.+$/, "")),
          });
      });
      exigir(
        matches.length > 0,
        "Nenhuma versão no padrão MAJOR.MINOR.PATCH foi encontrada.",
      );
      const current = matches
          .filter((x) => x.valid && /atual|^version:|^#\s*v/i.test(x.contexto))
          .map((x) => x.v),
        marked = new Set(current);
      const rows = matches.map((x) => [
        x.v,
        x.linha,
        x.contexto,
        !x.valid
          ? "SemVer inválida"
          : marked.size > 1 && current.includes(x.v)
            ? "Marcações atuais conflitantes"
            : current.length && x.v !== current[0]
              ? "Difere da versão atual"
              : "Menção",
      ]);
      return out(
        spec,
        [
          indicador("Menções SemVer", rows.length),
          indicador("Versões distintas", new Set(matches.map((x) => x.v)).size),
          indicador("Versão atual marcada", current[0] || "Não identificada"),
        ],
        ["Versão", "Linha", "Contexto", "Estado"],
        rows,
        [
          "Histórico e exemplos antigos podem divergir legitimamente: revisar o contexto. Prerelease e metadados são comparados literalmente, sem escolher a versão mais recente.",
        ],
      );
    }
    case "validador-frontmatter-documentacao": {
      exigir(
        ls[0] === "---",
        "O documento deve começar com --- para delimitar frontmatter.",
      );
      const end = ls.indexOf("---", 1);
      exigir(end > 0, "Frontmatter sem delimitador de fechamento.");
      const rows = [];
      const seen = new Set(),
        values = new Map();

      for (let i = 1; i < end; i++) {
        const m = ls[i].match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
        if (!m) {
          rows.push([i + 1, "", ls[i], "Linha não reconhecida"]);
          continue;
        }
        let st = "OK";
        if (seen.has(m[1])) st = "Chave duplicada";
        seen.add(m[1]);
        const val = (m[2] || "").trim();
        values.set(m[1], val);
        if (val === "") st = "Valor vazio; somente escalares são suportados";
        else if (/^[\[\]{&*!>|]/.test(val))
          st = "Sintaxe YAML complexa não suportada";
        rows.push([i + 1, m[1], val, st]);
      }
      const expected = { title: "string", version: "semver", draft: "boolean" };
      for (const [key, type] of Object.entries(expected)) {
        if (!values.has(key))
          rows.push(["", "", key, `Campo obrigatório ausente (${type})`]);
        else {
          const v = values.get(key);
          const valid =
            type === "string"
              ? v.length > 0 &&
                !/^(?:true|false|null|~|[+-]?\d+(?:[.,]\d+)?)$/.test(v)
              : type === "semver"
                ? semverValido(v)
                : /^(true|false)$/.test(v);
          if (!valid)
            rows.push(["", key, v, `Tipo inválido; esperado ${type}`]);
        }
      }
      return out(
        spec,
        [
          indicador("Campos", rows.filter((r) => r[1]).length),
          indicador("Achados", rows.filter((r) => r[3] !== "OK").length),
        ],
        ["Linha", "Campo", "Valor", "Estado"],
        rows,
        [
          "Valida chaves e valores escalares simples; não implementa YAML completo.",
        ],
      );
    }
    case "auditoria-exemplos-configuracao": {
      const m = texto.match(/^SCHEMA:\s*(\{[^\n]+\})\s*$/m);
      exigir(m, "Inclua SCHEMA: seguido de JSON Schema em uma linha.");
      let schema;
      try {
        schema = JSON.parse(m[1]);
      } catch {
        throw new ErroProfissional("SCHEMA precisa ser JSON válido.");
      }
      const supported = new Set([
        "type",
        "properties",
        "required",
        "items",
        "additionalProperties",
        "enum",
        "description",
        "title",
        "$schema",
        "$id",
      ]);
      const object = (x) =>
        x !== null && typeof x === "object" && !Array.isArray(x);
      const validate = (sc, depth = 0) => {
        exigir(
          object(sc) && depth <= 12,
          "Schema deve ser objeto com até 12 níveis.",
        );
        exigir(
          Object.keys(sc).every((k) => supported.has(k)),
          "Schema contém palavra-chave não suportada; use type, properties, required, items, enum e additionalProperties boolean.",
        );
        exigir(
          sc.type === undefined ||
            [
              "object",
              "array",
              "string",
              "number",
              "integer",
              "boolean",
              "null",
            ].includes(sc.type),
          "type não suportado.",
        );
        exigir(
          sc.required === undefined ||
            (Array.isArray(sc.required) &&
              sc.required.every((k) => typeof k === "string")),
          "required deve ser lista de chaves.",
        );
        exigir(
          sc.enum === undefined || Array.isArray(sc.enum),
          "enum deve ser lista.",
        );
        exigir(
          sc.additionalProperties === undefined ||
            typeof sc.additionalProperties === "boolean",
          "additionalProperties deve ser boolean.",
        );
        if (sc.properties !== undefined) {
          exigir(object(sc.properties), "properties deve ser objeto.");
          for (const child of Object.values(sc.properties))
            validate(child, depth + 1);
        }
        if (sc.items !== undefined) validate(sc.items, depth + 1);
      };
      validate(schema);
      const blocks = [
        ...texto.matchAll(/^```json[^\S\n]*\n([\s\S]*?)\n```[^\S\n]*$/gm),
      ];
      exigir(blocks.length > 0, "Inclua ao menos um bloco ```json completo.");
      const rows = [];
      const check = (obj, sc, path, example, depth = 0) => {
        exigir(
          depth <= 20,
          "Exemplo aninhado acima de 20 níveis não é suportado.",
        );
        const type = Array.isArray(obj)
          ? "array"
          : obj === null
            ? "null"
            : typeof obj;
        const valid =
          !sc.type ||
          sc.type === type ||
          (sc.type === "integer" && Number.isInteger(obj));
        rows.push([example, path, type, valid ? "OK" : `Esperado ${sc.type}`]);
        if (!valid) return;
        if (
          sc.enum &&
          !sc.enum.some((x) => JSON.stringify(x) === JSON.stringify(obj))
        )
          rows.push([example, path, JSON.stringify(obj), "Fora do enum"]);
        if (object(obj)) {
          for (const key of sc.required || [])
            if (!Object.hasOwn(obj, key))
              rows.push([
                example,
                path + "." + key,
                "ausente",
                "Obrigatório ausente",
              ]);
          for (const [key, value] of Object.entries(obj)) {
            if (Object.hasOwn(sc.properties || {}, key))
              check(
                value,
                sc.properties[key],
                path + "." + key,
                example,
                depth + 1,
              );
            else if (sc.additionalProperties === false)
              rows.push([
                example,
                path + "." + key,
                "presente",
                "Propriedade proibida",
              ]);
          }
        }
        if (Array.isArray(obj) && sc.items)
          obj.forEach((value, i) =>
            check(value, sc.items, path + "[" + i + "]", example, depth + 1),
          );
      };
      blocks.forEach((block, i) => {
        let obj;
        try {
          obj = JSON.parse(block[1]);
        } catch {
          rows.push([i + 1, "$", "JSON inválido", "Falha de sintaxe"]);
          return;
        }
        check(obj, schema, "$", i + 1);
      });
      return out(
        spec,
        [
          indicador("Exemplos JSON", blocks.length),
          indicador("Achados", rows.filter((r) => r[3] !== "OK").length),
        ],
        ["Exemplo", "Caminho", "Encontrado", "Estado"],
        rows,
        [
          "Subset explícito de JSON Schema com validação recursiva de tipo raiz, required, properties, arrays/items, enum e additionalProperties boolean. Outras regras são recusadas.",
        ],
      );
    }
    case "rastreabilidade-achados-seguranca": {
      const map = new Map();
      ls.forEach((l, i) => {
        const ids = [
          ...l.matchAll(/\b(CVE-\d{4}-\d{4,}|CWE-\d+|FINDING-\d+)\b/gi),
        ];
        for (const m of ids) {
          const id = m[1].toUpperCase();
          const obj = map.get(id) || {
            lines: [],
            severity: new Set(),
            status: new Set(),
          };
          obj.lines.push(i + 1);
          for (const x of l.matchAll(/\b(critical|high|medium|low)\b/gi))
            obj.severity.add(x[1].toLowerCase());
          for (const x of l.matchAll(
            /\b(open|fixed|mitigated|accepted|closed)\b/gi,
          ))
            obj.status.add(x[1].toLowerCase());
          map.set(id, obj);
        }
      });
      exigir(map.size > 0, "Nenhum CVE, CWE ou FINDING-n foi encontrado.");
      const rows = [...map].map(([id, x]) => [
        id,
        [...x.severity].join(", ") || "Ausente",
        [...x.status].join(", ") || "Ausente",
        x.lines.join(", "),
        x.severity.size > 1 || x.status.size > 1
          ? "Conflito"
          : !x.severity.size || !x.status.size
            ? "Campos ausentes"
            : "Consistente",
      ]);
      return out(
        spec,
        [
          indicador("IDs", rows.length),
          indicador(
            "Conflitos",
            rows.filter((r) => r[4] === "Conflito").length,
          ),
        ],
        ["ID", "Severidades", "Status", "Linhas", "Estado"],
        rows,
        ["Não consulta CVE/NVD ou base externa."],
      );
    }
    case "completude-modelo-documental": {
      const m = texto.match(/^MODELO:([^\n]*)/m);
      exigir(
        m,
        "Inclua MODELO: seguido de seções separadas por ponto e vírgula.",
      );
      const expected = m[1]
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
      exigir(
        expected.length > 0 && expected.length <= 200,
        "Informe de 1 a 200 seções no modelo.",
      );
      const key = (x) => semAcento(x.replace(/^\d+(?:\.\d+)*\s*/, ""));
      exigir(
        new Set(expected.map(key)).size === expected.length,
        "O modelo contém seções repetidas.",
      );
      const found = hs.filter(
          (h) =>
            h.linha > texto.slice(0, m.index + m[0].length).split("\n").length,
        ),
        names = found.map((h) => key(h.titulo));
      let previous = -1;
      const rows = expected.map((name, i) => {
        const matches = found.filter((h) => key(h.titulo) === key(name)),
          h = matches[0],
          idx = names.indexOf(key(name));
        if (!h) return [name, "Ausente", null, "", i + 1];
        const next = found.find((x) => x.linha > h.linha),
          content = ls
            .slice(h.linha, next ? next.linha - 1 : ls.length)
            .some((l) => l.trim());
        const issues = [];
        if (!content) issues.push("Sem conteúdo");
        if (matches.length > 1) issues.push("Duplicada");
        if (idx < previous) issues.push("Fora de ordem");
        previous = Math.max(previous, idx);
        return [name, "Presente", h.linha, issues.join("; ") || "OK", i + 1];
      });
      return out(
        spec,
        [
          indicador("Seções requeridas", expected.length),
          indicador("Ausentes", rows.filter((r) => r[1] === "Ausente").length),
          indicador(
            "Vazias",
            rows.filter((r) => r[3].includes("Sem conteúdo")).length,
          ),
        ],
        ["Seção", "Estado", "Linha", "Conteúdo e ordem", "Posição esperada"],
        rows,
        [
          "A linha é a posição no documento original. Conteúdo de uma seção vai até o próximo heading; subcapítulos são avaliados separadamente.",
        ],
      );
    }
    case "auditor-proveniencia-figuras-tabelas": {
      const rows = [],
        seen = new Set();
      ls.forEach((l, i) => {
        const m =
          l.match(
            /^\s*(Figura|Tabela|Quadro)(?:\s+(\d+(?:\.\d+)*))?\s*[:—–.-]\s*(.*)$/i,
          ) || l.match(/^\s*(Figura|Tabela|Quadro)\s+(\d+(?:\.\d+)*)\s*(.*)$/i);
        if (!m) return;
        const next = ls[i + 1] || "",
          key = semAcento(m[1]) + ":" + (m[2] || ""),
          issues = [];
        const source = /(?:^|\b)(?:fonte|source)\s*:/i.test(l + " " + next);
        const caption = m[3].replace(/\b(?:fonte|source)\s*:.*/i, "").trim();
        if (!m[2]) issues.push("Número ausente");
        else if (seen.has(key)) issues.push("Número duplicado");
        seen.add(key);
        if (!caption) issues.push("Legenda ausente");
        if (!source) issues.push("Fonte ausente");
        rows.push([
          m[1],
          m[2] || "",
          i + 1,
          caption,
          source ? "Sim" : "Ausente",
          issues.join("; ") || "OK",
        ]);
      });
      return out(
        spec,
        [
          indicador("Elementos", rows.length),
          indicador("Sem fonte", rows.filter((r) => r[4] === "Ausente").length),
        ],
        ["Tipo", "Número", "Linha", "Legenda", "Fonte indicada", "Achados"],
        rows,
        [
          "Somente rótulos textuais explícitos; Fonte/Source deve estar na mesma linha ou na linha imediatamente seguinte. Não valida a qualidade nem existência da fonte.",
        ],
      );
    }
    case "consistencia-unidades-documento": {
      const rows = [],
        stop = new Set([
          "a",
          "o",
          "as",
          "os",
          "na",
          "no",
          "de",
          "da",
          "do",
          "em",
          "por",
          "é",
          "e",
        ]);
      const re =
        /(?<![\p{L}\p{N}_.,+-])([+-]?\d+(?:[.,]\d+)?)\s*(kg|mg|km|cm|mm|mi|ft|in|ml|kb|mb|gb|g|m|l|°c|°f|%)(?=\s|$|[.,;:]|\b)/giu;
      ls.forEach((line, i) => {
        for (const m of line.matchAll(re)) {
          const words = line
              .slice(0, m.index)
              .replace(/[^\p{L}\p{N} ]/gu, " ")
              .trim()
              .split(/\s+/)
              .filter((w) => w && !stop.has(semAcento(w))),
            concept = semAcento(words[0] || "documento"),
            format = m[1].includes(",")
              ? "Vírgula decimal"
              : m[1].includes(".")
                ? "Ponto decimal"
                : "Inteiro";
          rows.push([
            m[1],
            m[2].toLowerCase(),
            i + 1,
            line.trim(),
            concept,
            format,
          ]);
        }
      });
      exigir(
        rows.length > 0,
        "Nenhuma medida com unidade reconhecida foi encontrada.",
      );
      const groups = new Map();
      for (const row of rows) {
        const g = groups.get(row[4]) || {
          units: new Set(),
          formats: new Set(),
        };
        g.units.add(row[1]);
        if (row[5] !== "Inteiro") g.formats.add(row[5]);
        groups.set(row[4], g);
      }
      const result = rows.map((r) => {
        const group = groups.get(r[4]),
          issues = [];
        if (group.units.size > 1) issues.push("Revisar unidade");
        if (group.formats.size > 1) issues.push("Separador decimal misto");
        return [...r, issues.join("; ") || "Consistente"];
      });
      return out(
        spec,
        [
          indicador("Medidas", rows.length),
          indicador("Unidades distintas", new Set(rows.map((r) => r[1])).size),
        ],
        [
          "Valor",
          "Unidade",
          "Linha",
          "Contexto",
          "Conceito aproximado",
          "Formato",
          "Aviso",
        ],
        result,
        [
          "Grupo lexical usa a primeira palavra relevante antes da medida em cada linha. Não converte dimensões, nem aceita separador de milhar ou notação científica; a regra decimal é contextual e exige revisão.",
        ],
      );
    }
    case "auditor-urls-documentacao": {
      const all = urls(texto);
      const parsed = all.map((x) => {
        try {
          const u = new URL(x.url);
          return {
            ...x,
            host: u.hostname,
            scheme: u.protocol,
            key: `${u.protocol.toLowerCase()}//${u.hostname.toLowerCase()}${u.port ? ":" + u.port : ""}${u.pathname}${u.search}`,
          };
        } catch {
          return { ...x, host: "", scheme: "", key: "invalid:" + x.url };
        }
      });
      const counts = new Map();
      for (const x of parsed) counts.set(x.key, (counts.get(x.key) || 0) + 1);
      const rows = parsed.map((x) => {
        let estado = "OK";
        if (!x.host) estado = "URL malformada";
        else if (x.scheme === "http:") estado = "HTTP sem TLS";
        else if (x.scheme !== "https:") estado = "Esquema não HTTPS";
        else if (counts.get(x.key) > 1) estado = "Duplicada";
        return [x.url, x.host, x.linha, estado];
      });
      return out(
        spec,
        [
          indicador("URLs", rows.length),
          indicador("Hosts", new Set(rows.map((r) => r[1])).size),
          indicador("Avisos", rows.filter((r) => r[3] !== "OK").length),
        ],
        ["URL", "Host", "Linha", "Estado"],
        rows,
        ["Não faz requisições HTTP nem verifica reputação."],
      );
    }
    default:
      throw new ErroProfissional("Ferramenta documental não reconhecida.");
  }
}

export function executar(slug, dados) {
  const spec = porSlug.get(slug);
  if (!spec)
    throw new ErroProfissional("Ferramenta documental não reconhecida.");
  exigir(
    dados && typeof dados === "object" && !Array.isArray(dados),
    "Dados de entrada inválidos.",
  );
  exigir(
    dados.opcoes === undefined ||
      (dados.opcoes !== null &&
        typeof dados.opcoes === "object" &&
        !Array.isArray(dados.opcoes)),
    "As opções devem ser um objeto.",
  );
  return processar(spec, dados);
}

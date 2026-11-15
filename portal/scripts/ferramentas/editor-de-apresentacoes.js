import {
  abrirPacote,
  text,
  parseXml,
  saveXml,
  exportPackage,
  download,
  mountBase,
  historyWire,
  bytes,
  aplicarPreviaFormato,
} from "../comum/office/pacote.js";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main",
  A = "http://schemas.openxmlformats.org/drawingml/2006/main",
  R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const SLIDE_RE = /^ppt\/slides\/slide(\d+)\.xml$/;
function resolvePart(base, target) {
  const stack = target.startsWith("/") ? [] : base.split("/").slice(0, -1);
  for (const p of target.replace(/^\//, "").split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}
function slides(pkg) {
  const presentation = pkg.parts.get("ppt/presentation.xml"),
    relbytes = pkg.parts.get("ppt/_rels/presentation.xml.rels");
  if (presentation && relbytes) {
    const d = parseXml(text(presentation)),
      r = parseXml(text(relbytes)),
      map = new Map(
        [
          ...r.getElementsByTagNameNS(
            "http://schemas.openxmlformats.org/package/2006/relationships",
            "Relationship",
          ),
        ].map((x) => [
          x.getAttribute("Id"),
          resolvePart("ppt/presentation.xml", x.getAttribute("Target")),
        ]),
      );
    const ordered = [...d.getElementsByTagNameNS(P, "sldId")]
      .map((x) => map.get(x.getAttributeNS(R, "id")))
      .filter((x) => x && pkg.parts.has(x));
    if (ordered.length) return ordered;
  }
  return [...pkg.parts.keys()]
    .filter((x) => SLIDE_RE.test(x))
    .sort((a, b) => +SLIDE_RE.exec(a)[1] - +SLIDE_RE.exec(b)[1]);
}
function getTexts(pkg, path) {
  const d = parseXml(text(pkg.parts.get(path)));
  return {
    d,
    shapes: [...d.getElementsByTagNameNS(P, "sp")].map((shape, i) => ({
      shape,
      i,
      nodes: [...shape.getElementsByTagNameNS(A, "t")],
    })),
  };
}
function render(work, pkg, edits) {
  work.replaceChildren();
  const all = slides(pkg);
  if (all.length > 100) throw Error("Apresentações limitadas a 100 slides.");
  let charTotal = 0;
  all.forEach((path, i) => {
    const card = document.createElement("article");
    card.className = "office-slide";
    card.dataset.path = path;
    const h = document.createElement("h2");
    h.textContent = `Slide ${i + 1}`;
    card.append(h);
    const { shapes } = getTexts(pkg, path);
    shapes.forEach(({ i: si, nodes }) => {
      const p = document.createElement("textarea"),
        edit = edits.get(`${path}|${si}`);
      p.className = "office-shape-text";
      p.rows = 2;
      p.maxLength = 32000;
      p.dataset.shape = si;
      p.dataset.path = path;
      p.setAttribute("aria-label", `Texto do slide ${i + 1}`);
      p.value = edit?.text ?? nodes.map((n) => n.textContent).join("");
      aplicarPreviaFormato(p, edit?.format);
      charTotal += p.value.length;
      if (p.value.length > 32000 || charTotal > 200000)
        throw Error(
          "A apresentação tem texto demais para editar (32.000 caracteres por forma, 200.000 no total).",
        );
      card.append(p);
    });
    const controls = document.createElement("div");
    controls.className = "office-slide-actions";
    const up = document.createElement("button");
    up.type = "button";
    up.dataset.slideAction = "up";
    up.dataset.path = path;
    up.textContent = "Mover para cima";
    up.disabled = i === 0;
    const down = document.createElement("button");
    down.type = "button";
    down.dataset.slideAction = "down";
    down.dataset.path = path;
    down.textContent = "Mover para baixo";
    down.disabled = i === all.length - 1;
    const del = document.createElement("button");
    del.type = "button";
    del.dataset.slideAction = "remove";
    del.dataset.path = path;
    del.textContent = "Remover slide";
    controls.append(up, down, del);
    card.append(controls);
    work.append(card);
  });
}
function formatShape(d, shape, f) {
  const run = shape.shape.getElementsByTagNameNS(A, "r")[0];
  if (run) {
    let rp = run.getElementsByTagNameNS(A, "rPr")[0];
    if (!rp) {
      rp = d.createElementNS(A, "a:rPr");
      run.insertBefore(rp, run.firstChild);
    }
    for (const [key, attr] of [
      ["b", "b"],
      ["i", "i"],
      ["u", "u"],
    ])
      if (Object.hasOwn(f, key)) {
        if (f[key]) rp.setAttribute(attr, key === "u" ? "sng" : "1");
        else rp.removeAttribute(attr);
      }
    if (f.size) rp.setAttribute("sz", String(f.size * 100));
    if (f.color) {
      for (const child of [...rp.children])
        if (
          [
            "solidFill",
            "noFill",
            "gradFill",
            "blipFill",
            "pattFill",
            "grpFill",
          ].includes(child.localName)
        )
          rp.removeChild(child);
      const fill = d.createElementNS(A, "a:solidFill"),
        clr = d.createElementNS(A, "a:srgbClr");
      clr.setAttribute("val", f.color);
      fill.append(clr);
      rp.append(fill);
    }
  }
  if (f.align) {
    const p = shape.shape.getElementsByTagNameNS(A, "p")[0];
    if (p) {
      let pp = p.getElementsByTagNameNS(A, "pPr")[0];
      if (!pp) {
        pp = d.createElementNS(A, "a:pPr");
        p.insertBefore(pp, p.firstChild);
      }
      pp.setAttribute("algn", f.align);
    }
  }
}
function apply(pkg, edits) {
  const byPath = new Map();
  for (const [key, edit] of edits) {
    const [path, indexText] = key.split("|"),
      index = +indexText;
    if (!byPath.has(path)) byPath.set(path, getTexts(pkg, path));
    const { d, shapes } = byPath.get(path),
      shape = shapes[index];
    if (!shape) continue;
    const value = edit.text ?? "";
    if (shape.nodes.length)
      shape.nodes.forEach((n, i) => (n.textContent = i === 0 ? value : ""));
    if (edit.format) formatShape(d, shape, edit.format);
  }
  for (const [path, { d }] of byPath) saveXml(pkg, path, d);
}
function state(pkg) {
  const values = [...pkg.parts]
    .filter(
      ([n]) =>
        SLIDE_RE.test(n) ||
        n === "ppt/presentation.xml" ||
        n === "ppt/_rels/presentation.xml.rels" ||
        n === "[Content_Types].xml",
    )
    .map(([n, b]) => [n, text(b)]);
  const removed = [...(pkg.removedSlides ?? [])].map(([n, b]) => [n, text(b)]);
  return { values, removed };
}
function restore(pkg, { values, removed }) {
  const slideNames = new Set([
    ...values.map((x) => x[0]),
    ...removed.map((x) => x[0]),
  ]);
  for (const n of [...pkg.parts.keys()])
    if (SLIDE_RE.test(n) && slideNames.has(n)) pkg.parts.delete(n);
  for (const [n, v] of values) pkg.parts.set(n, bytes(v));
  pkg.removedSlides = new Map(removed.map(([n, v]) => [n, bytes(v)]));
}
function moveSlide(pkg, path, delta) {
  const d = parseXml(text(pkg.parts.get("ppt/presentation.xml"))),
    r = parseXml(text(pkg.parts.get("ppt/_rels/presentation.xml.rels"))),
    relMap = new Map(
      [
        ...r.getElementsByTagNameNS(
          "http://schemas.openxmlformats.org/package/2006/relationships",
          "Relationship",
        ),
      ].map((x) => [
        x.getAttribute("Id"),
        resolvePart("ppt/presentation.xml", x.getAttribute("Target")),
      ]),
    ),
    list = d.getElementsByTagNameNS(P, "sldIdLst")[0];
  if (!list) return;
  const nodes = [...list.getElementsByTagNameNS(P, "sldId")],
    index = nodes.findIndex(
      (x) => relMap.get(x.getAttributeNS(R, "id")) === path,
    ),
    next = index + delta;
  if (index < 0 || next < 0 || next >= nodes.length) return;
  const moving = nodes[index],
    target = nodes[next];
  if (delta < 0) list.insertBefore(moving, target);
  else list.insertBefore(moving, target.nextSibling);
  saveXml(pkg, "ppt/presentation.xml", d);
}
function removeSlide(pkg, path) {
  if (slides(pkg).length <= 1)
    throw Error("A apresentação deve manter pelo menos um slide.");
  const d = parseXml(text(pkg.parts.get("ppt/presentation.xml"))),
    r = parseXml(text(pkg.parts.get("ppt/_rels/presentation.xml.rels"))),
    rels = [
      ...r.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/package/2006/relationships",
        "Relationship",
      ),
    ],
    relMap = new Map(rels.map((x) => [x.getAttribute("Id"), x])),
    rid = rels
      .find(
        (x) =>
          resolvePart("ppt/presentation.xml", x.getAttribute("Target")) ===
          path,
      )
      ?.getAttribute("Id");
  if (!rid) throw Error("Não foi possível localizar a relação do slide.");
  const sld = [...d.getElementsByTagNameNS(P, "sldId")].find(
    (x) => x.getAttributeNS(R, "id") === rid,
  );
  sld?.parentNode.removeChild(sld);
  relMap.get(rid)?.parentNode.removeChild(relMap.get(rid));
  saveXml(pkg, "ppt/presentation.xml", d);
  saveXml(pkg, "ppt/_rels/presentation.xml.rels", r);
  pkg.removedSlides ??= new Map();
  pkg.removedSlides.set(path, pkg.parts.get(path));
  pkg.parts.delete(path);
  const types = parseXml(text(pkg.parts.get("[Content_Types].xml"))),
    override = [
      ...types.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/package/2006/content-types",
        "Override",
      ),
    ].find((x) => x.getAttribute("PartName") === `/${path}`);
  override?.parentNode.removeChild(override);
  saveXml(pkg, "[Content_Types].xml", types);
}
export default {
  instruções: {
    passos: [
      "Abra um PPTX local.",
      "Edite os textos dos elementos e use os controles para reorganizar ou remover slides.",
      "Use desfazer/refazer e baixe o PPTX editado.",
    ],
    exemplo: {
      texto:
        "As caixas de texto são editáveis; a prévia lista seu conteúdo sem tentar reproduzir o layout.",
    },
    limites:
      "PPTX OOXML até 20 MB, 100 slides, sem senha nem macros. Não exporta para PDF nem garante renderização idêntica ao PowerPoint.",
  },
  montar(root) {
    const { el, status, work, executar } = mountBase(
      root,
      "Editor de apresentações",
      ".pptx",
      "Edite texto, formate, reorganize e remova slides.",
    );
    let pkg,
      file,
      edits = new Map(),
      selected = "";
    const bar = document.createElement("div");
    bar.className = "office-formatbar";
    bar.innerHTML =
      '<span>Texto selecionado</span><button type="button" data-format="b">Negrito</button><button type="button" data-format="i">Itálico</button><button type="button" data-format="u">Sublinhado</button><label>Tamanho <select data-format-size><option value="">Original</option><option>8</option><option>10</option><option>12</option><option>14</option><option>18</option><option>24</option><option>36</option><option>48</option><option>72</option></select></label><label>Cor <input data-format-color type="color" value="#222222"></label><label>Alinhar <select data-format-align><option value="">Original</option><option value="l">Esquerda</option><option value="ctr">Centro</option><option value="r">Direita</option><option value="just">Justificado</option></select></label>';
    el.querySelector(".office-toolbar").after(bar);
    const hist = historyWire(
      el,
      () => JSON.stringify({ pkg: state(pkg), edits: [...edits] }),
      (s) => {
        const v = JSON.parse(s);
        restore(pkg, v.pkg);
        edits = new Map(v.edits);
        render(work, pkg, edits);
      },
      (dirty) => {
        status.textContent = dirty
          ? "Há alterações por baixar."
          : "Arquivo carregado.";
      },
    );
    el.querySelector(".office-file").onchange = async (e) => {
      if (el.dataset.busy === "true") return;
      file = e.target.files[0];
      if (!file) return;
      el.querySelector('[data-action="save"]').disabled = true;
      try {
        await executar("Abrindo apresentação…", async () => {
          pkg = await abrirPacote(file);
          if (!pkg.parts.has("ppt/presentation.xml"))
            throw Error("O arquivo não parece PPTX válido.");
          edits = new Map();
          render(work, pkg, edits);
          if (!slides(pkg).length)
            throw Error("Nenhum slide legível foi encontrado.");
          el.querySelector('[data-action="save"]').disabled = false;
          status.textContent = `${file.name} aberto.`;
          hist.init();
        });
      } catch (x) {
        file = null;
        pkg = null;
        edits = new Map();
        work.replaceChildren();
        el.querySelector('[data-action="save"]').disabled = true;
        status.textContent = x.message;
      }
    };
    work.addEventListener("focusin", (e) => {
      if (e.target.matches("[data-shape]"))
        selected = `${e.target.dataset.path}|${e.target.dataset.shape}`;
    });
    work.addEventListener("input", (e) => {
      if (e.target.matches("[data-shape]")) {
        const total = [...work.querySelectorAll("[data-shape]")].reduce(
          (n, x) => n + x.value.length,
          0,
        );
        if (e.target.value.length > 32000 || total > 200000) {
          e.target.value = edits.get(selected)?.text ?? "";
          status.textContent =
            "Limite de 32.000 caracteres por forma e 200.000 no total.";
          return;
        }
        const old = edits.get(selected);
        edits.set(selected, {
          text: e.target.value,
          format: old?.format ?? {},
        });
        hist.snapshot();
      }
    });
    const setFormat = (key, value) => {
      const box = work.querySelector(
        `[data-path="${selected.split("|")[0]}"] [data-shape="${selected.split("|")[1]}"]`,
      );
      if (!box) return;
      const old = edits.get(selected),
        edit = old ?? { text: box.value, format: {} },
        format = { ...edit.format };
      if (["b", "i", "u"].includes(key)) format[key] = !format[key];
      else if (value) format[key] = value;
      else delete format[key];
      edits.set(selected, { text: box.value, format });
      aplicarPreviaFormato(box, format);
      hist.snapshot();
    };
    bar
      .querySelectorAll("[data-format]")
      .forEach((b) => (b.onclick = () => setFormat(b.dataset.format)));
    bar.querySelector("[data-format-size]").onchange = (e) =>
      setFormat("size", Number(e.target.value) || "");
    bar.querySelector("[data-format-color]").onchange = (e) =>
      setFormat("color", e.target.value.slice(1).toUpperCase());
    bar.querySelector("[data-format-align]").onchange = (e) =>
      setFormat("align", e.target.value);
    work.addEventListener("click", (e) => {
      const b = e.target.closest("[data-slide-action]");
      if (!b) return;
      try {
        apply(pkg, edits);
        edits = new Map();
        if (b.dataset.slideAction === "remove")
          removeSlide(pkg, b.dataset.path);
        else
          moveSlide(
            pkg,
            b.dataset.path,
            b.dataset.slideAction === "up" ? -1 : 1,
          );
        render(work, pkg, edits);
        hist.snapshot();
        status.textContent = "Estrutura dos slides atualizada.";
      } catch (x) {
        status.textContent = x.message;
      }
    });
    el.querySelector('[data-action="save"]').onclick = async () => {
      try {
        await executar("Preparando download…", async () => {
          apply(pkg, edits);
          download(
            exportPackage(pkg),
            file.name,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          );
          status.textContent = "Apresentação editada baixada.";
        });
      } catch (e) {
        status.textContent = e.message;
      }
    };
  },
};

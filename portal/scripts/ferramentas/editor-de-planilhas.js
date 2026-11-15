import { lerCsv, detectarSeparador } from "../cálculos/tabular.js";
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
} from "../comum/office/pacote.js";
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
const colName = (n) => {
  let s = "";
  for (n++; n; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const colNum = (s) => {
  let n = 0;
  for (const c of s) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
};
function findSheets(pkg) {
  const w = parseXml(text(pkg.parts.get("xl/workbook.xml"))),
    r = parseXml(text(pkg.parts.get("xl/_rels/workbook.xml.rels"))),
    rels = new Map(
      [...r.getElementsByTagNameNS(PKG, "Relationship")].map((x) => [
        x.getAttribute("Id"),
        x.getAttribute("Target"),
      ]),
    );
  return [...w.getElementsByTagNameNS(MAIN, "sheet")].map((s, i) => {
    let target = rels.get(s.getAttributeNS(REL, "id"));
    if (!target) throw Error("A aba não tem relação legível.");
    let path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    path = path.replace(/\/[^/]+\/\.\.\//g, "/");
    return {
      name: s.getAttribute("name"),
      path,
      id: s.getAttribute("sheetId"),
      i,
    };
  });
}
function shared(pkg) {
  const b = pkg.parts.get("xl/sharedStrings.xml");
  if (!b) return [];
  const d = parseXml(text(b));
  return [...d.getElementsByTagNameNS(MAIN, "si")].map((si) =>
    [...si.getElementsByTagNameNS(MAIN, "t")]
      .map((t) => t.textContent)
      .join(""),
  );
}
function gridData(pkg, sheet, strings) {
  const d = parseXml(text(pkg.parts.get(sheet.path))),
    rows = [...d.getElementsByTagNameNS(MAIN, "row")],
    cells = [];
  let maxR = 0,
    maxC = 0;
  for (const row of rows)
    for (const c of [...row.getElementsByTagNameNS(MAIN, "c")]) {
      const ref = c.getAttribute("r"),
        m = /^([A-Z]+)(\d+)$/.exec(ref);
      if (!m) continue;
      const r = +m[2] - 1,
        col = colNum(m[1]),
        f = c.getElementsByTagNameNS(MAIN, "f")[0],
        v = c.getElementsByTagNameNS(MAIN, "v")[0];
      let value = "";
      if (f) value = "=" + f.textContent;
      else if (c.getAttribute("t") === "s")
        value = strings[+(v?.textContent || 0)] ?? "";
      else if (c.getAttribute("t") === "inlineStr")
        value = [...c.getElementsByTagNameNS(MAIN, "t")]
          .map((t) => t.textContent)
          .join("");
      else value = v?.textContent || "";
      cells.push({
        r,
        col,
        value,
        formula: !!f,
        style: c.getAttribute("s") || "0",
      });
      maxR = Math.max(maxR, r + 1);
      maxC = Math.max(maxC, col + 1);
    }
  return {
    d,
    cells,
    rows: Math.max(1, maxR),
    cols: Math.max(1, maxC),
  };
}
function render(work, pkg, active = 0) {
  work.replaceChildren();
  const sheets = findSheets(pkg),
    strings = shared(pkg);
  if (sheets.length > 20) throw Error("Até 20 abas podem ser abertas.");
  const grids = sheets.map((sheet) => gridData(pkg, sheet, strings));
  if (
    grids.reduce((n, g) => n + g.rows * g.cols, 0) > 5000 ||
    grids.some((g) => g.rows > 1000 || g.cols > 100)
  )
    throw Error(
      "A área preenchida deve caber em 5.000 células, até 1.000 linhas e 100 colunas por aba.",
    );
  if (
    grids.reduce(
      (n, g) => n + g.cells.reduce((m, c) => m + c.value.length, 0),
      0,
    ) > 200000 ||
    grids.some((g) => g.cells.some((c) => c.value.length > 32767))
  )
    throw Error("Limite de 32.767 caracteres por célula e 200.000 no total.");
  let total = 0;
  const nav = document.createElement("div");
  nav.className = "office-tabs";
  sheets.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = s.name;
    b.className = i === active ? "is-active" : "";
    b.onclick = () => {
      apply(work, pkg);
      applyStyles(pkg, work);
      render(work, pkg, i);
    };
    nav.append(b);
  });
  work.append(nav);
  const s = sheets[active],
    g = gridData(pkg, s, strings);
  total += g.cells.length;
  if (total > 5000)
    throw Error("Planilhas limitadas a 5.000 células preenchidas por arquivo.");
  const map = new Map(g.cells.map((c) => [`${c.r}:${c.col}`, c]));
  const controls = document.createElement("div");
  controls.className = "office-grid-actions";
  const table = document.createElement("table");
  table.className = "office-grid";
  const head = document.createElement("tr");
  head.append(document.createElement("th"));
  for (let c = 0; c < g.cols; c++) {
    const th = document.createElement("th");
    th.textContent = colName(c);
    head.append(th);
  }
  table.append(head);
  for (let r = 0; r < g.rows; r++) {
    const tr = document.createElement("tr"),
      th = document.createElement("th");
    th.textContent = r + 1;
    tr.append(th);
    for (let c = 0; c < g.cols; c++) {
      const td = document.createElement("td"),
        cell = map.get(`${r}:${c}`),
        input = document.createElement(
          cell?.value.includes("\n") ? "textarea" : "input",
        );
      input.maxLength = 32767;
      if (input.tagName === "TEXTAREA") input.rows = 2;
      input.value = cell?.value ?? "";
      input.dataset.original = input.value;
      input.dataset.styleOriginal = cell?.style ?? "0";
      input.dataset.ref = `${colName(c)}${r + 1}`;
      input.dataset.path = s.path;
      input.setAttribute("aria-label", `${s.name}, ${input.dataset.ref}`);
      if (cell?.formula)
        input.title =
          "Fórmula não calculada no navegador; o Office recalcula ao abrir.";
      td.append(input);
      tr.append(td);
    }
    table.append(tr);
  }
  const rowBtn = document.createElement("button");
  rowBtn.type = "button";
  rowBtn.textContent = "Adicionar linha";
  rowBtn.onclick = () => {
    const idx = table.rows.length;
    if (idx > 1000 || idx * (table.rows[0].cells.length - 1) > 5000)
      return statusNotice(
        work,
        "Limite de 5.000 células ou 1.000 linhas na prévia.",
      );
    const tr = table.insertRow();
    const th = document.createElement("th");
    th.textContent = idx;
    tr.append(th);
    for (let c = 0; c < table.rows[0].cells.length - 1; c++)
      tr.append(makeCell(idx, c, s.path));
  };
  const colBtn = document.createElement("button");
  colBtn.type = "button";
  colBtn.textContent = "Adicionar coluna";
  colBtn.onclick = () => {
    const c = table.rows[0].cells.length - 1;
    if (c >= 100 || table.rows.length * (c + 1) > 5000)
      return statusNotice(
        work,
        "Limite de 5.000 células ou 100 colunas na prévia.",
      );
    const th = document.createElement("th");
    th.textContent = colName(c);
    table.rows[0].append(th);
    for (let r = 1; r < table.rows.length; r++)
      table.rows[r].append(makeCell(r, c, s.path));
  };
  controls.append(rowBtn, colBtn);
  work.append(controls, table);
  work.dataset.active = String(active);
  work.dataset.sheetCount = String(sheets.length);
}
function statusNotice(work, message) {
  const n = document.createElement("p");
  n.textContent = message;
  work.prepend(n);
  setTimeout(() => n.remove(), 3500);
}
function makeCell(row, col, path) {
  const td = document.createElement("td"),
    input = document.createElement("input");
  input.value = "";
  input.maxLength = 32767;
  input.dataset.original = "";
  input.dataset.styleOriginal = "0";
  input.dataset.ref = `${colName(col)}${row}`;
  input.dataset.path = path;
  td.append(input);
  return td;
}
function apply(work, pkg) {
  const byPath = new Map();
  let formulaChanged = false;
  for (const input of work.querySelectorAll(
    ".office-grid :is(input,textarea)",
  )) {
    if (input.value === input.dataset.original) continue;
    const path = input.dataset.path;
    if (!byPath.has(path))
      byPath.set(path, parseXml(text(pkg.parts.get(path))));
    const d = byPath.get(path),
      ref = input.dataset.ref,
      mm = /^([A-Z]+)(\d+)$/.exec(ref),
      r = +mm[2],
      row = [...d.getElementsByTagNameNS(MAIN, "row")].find(
        (x) => +x.getAttribute("r") === r,
      );
    let c =
      row &&
      [...row.getElementsByTagNameNS(MAIN, "c")].find(
        (x) => x.getAttribute("r") === ref,
      );
    if (!c && input.value === "") continue;
    if (!row) {
      const data = d.getElementsByTagNameNS(MAIN, "sheetData")[0];
      const nr = d.createElementNS(MAIN, "row");
      nr.setAttribute("r", r);
      data.append(nr);
      c = null;
    }
    const targetRow =
      row ||
      [...d.getElementsByTagNameNS(MAIN, "row")].find(
        (x) => +x.getAttribute("r") === r,
      );
    if (!c) {
      c = d.createElementNS(MAIN, "c");
      c.setAttribute("r", ref);
      targetRow.append(c);
    }
    while (c.firstChild) c.removeChild(c.firstChild);
    c.removeAttribute("t");
    const value = input.value;
    if (value.startsWith("=")) {
      const f = d.createElementNS(MAIN, "f");
      f.textContent = value.slice(1);
      c.append(f);
      formulaChanged = true;
    } else if (value.trim() !== "" && !Number.isNaN(Number(value))) {
      const v = d.createElementNS(MAIN, "v");
      v.textContent = value;
      c.append(v);
    } else if (value !== "") {
      c.setAttribute("t", "inlineStr");
      const is = d.createElementNS(MAIN, "is"),
        t = d.createElementNS(MAIN, "t");
      t.textContent = value;
      if (/^\s|\s$/.test(value))
        t.setAttributeNS(
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          "preserve",
        );
      is.append(t);
      c.append(is);
    }
  }
  for (const [p, d] of byPath) saveXml(pkg, p, d);
  if (formulaChanged) {
    const wb = parseXml(text(pkg.parts.get("xl/workbook.xml")));
    let calc = wb.getElementsByTagNameNS(MAIN, "calcPr")[0];
    if (!calc) {
      calc = wb.createElementNS(MAIN, "calcPr");
      const ext = wb.getElementsByTagNameNS(MAIN, "extLst")[0];
      if (ext) wb.documentElement.insertBefore(calc, ext);
      else wb.documentElement.append(calc);
    }
    calc.setAttribute("calcMode", "auto");
    calc.setAttribute("fullCalcOnLoad", "1");
    calc.setAttribute("forceFullCalc", "1");
    saveXml(pkg, "xl/workbook.xml", wb);
  }
}
function applyStyles(pkg, work) {
  const styled = [
    ...work.querySelectorAll(".office-grid :is(input,textarea)"),
  ].filter((i) => i.dataset.officeFormat);
  if (!styled.length) return;
  const path = "xl/styles.xml";
  if (!pkg.parts.has(path))
    throw Error(
      "Esta planilha não tem estilos OOXML editáveis; seus valores continuam disponíveis para exportação.",
    );
  const styles = parseXml(text(pkg.parts.get(path))),
    fonts = styles.getElementsByTagNameNS(MAIN, "fonts")[0],
    fills = styles.getElementsByTagNameNS(MAIN, "fills")[0],
    xfs = styles.getElementsByTagNameNS(MAIN, "cellXfs")[0];
  if (!fonts || !fills || !xfs)
    throw Error(
      "A estrutura de estilos desta planilha não pode ser alterada com segurança.",
    );
  const docs = new Map();
  for (const input of styled) {
    const f = JSON.parse(input.dataset.officeFormat),
      p = input.dataset.path;
    if (!docs.has(p)) docs.set(p, parseXml(text(pkg.parts.get(p))));
    const d = docs.get(p),
      ref = input.dataset.ref,
      cell = [...d.getElementsByTagNameNS(MAIN, "c")].find(
        (c) => c.getAttribute("r") === ref,
      );
    if (!cell) {
      delete input.dataset.officeFormat;
      continue;
    }
    const baseIndex = Number(input.dataset.styleOriginal) || 0,
      baseXf = xfs.children[baseIndex] || xfs.children[0],
      xf = baseXf.cloneNode(true);
    if (Object.hasOwn(f, "bold")) {
      const fontId = Number(baseXf.getAttribute("fontId")) || 0,
        baseFont = fonts.children[fontId] || fonts.children[0],
        font = baseFont.cloneNode(true),
        existing = font.getElementsByTagNameNS(MAIN, "b")[0];
      if (f.bold && !existing)
        font.insertBefore(styles.createElementNS(MAIN, "b"), font.firstChild);
      else if (!f.bold && existing) existing.remove();
      fonts.append(font);
      xf.setAttribute("fontId", String(fonts.children.length - 1));
      xf.setAttribute("applyFont", "1");
    }
    if (f.fill) {
      const fill = styles.createElementNS(MAIN, "fill"),
        pattern = styles.createElementNS(MAIN, "patternFill"),
        fg = styles.createElementNS(MAIN, "fgColor"),
        bg = styles.createElementNS(MAIN, "bgColor");
      pattern.setAttribute("patternType", "solid");
      fg.setAttribute("rgb", `FF${f.fill}`);
      bg.setAttribute("indexed", "64");
      pattern.append(fg, bg);
      fill.append(pattern);
      fills.append(fill);
      xf.setAttribute("fillId", String(fills.children.length - 1));
      xf.setAttribute("applyFill", "1");
    }
    if (Object.hasOwn(f, "numFmt")) {
      xf.setAttribute("numFmtId", String(f.numFmt));
      xf.setAttribute("applyNumberFormat", "1");
    }
    xfs.append(xf);
    xfs.setAttribute("count", String(xfs.children.length));
    fonts.setAttribute("count", String(fonts.children.length));
    fills.setAttribute("count", String(fills.children.length));
    cell.setAttribute("s", String(xfs.children.length - 1));
    input.dataset.styleOriginal = String(xfs.children.length - 1);
    if (Object.hasOwn(f, 'bold')) input.style.fontWeight = f.bold ? '700' : '400';
    if (f.fill) input.style.backgroundColor = `#${f.fill}`;
    delete input.dataset.officeFormat;
  }
  saveXml(pkg, path, styles);
  for (const [p, d] of docs) saveXml(pkg, p, d);
}
function state(pkg) {
  return JSON.stringify(
    [...pkg.parts]
      .filter(
        ([n]) =>
          n.startsWith("xl/worksheets/") ||
          n === "xl/styles.xml" ||
          n === "xl/workbook.xml" ||
          n === "xl/_rels/workbook.xml.rels" ||
          n === "[Content_Types].xml",
      )
      .map(([n, b]) => [n, text(b)]),
  );
}
function restore(pkg, s) {
  const values = JSON.parse(s),
    keep = new Set(values.map((x) => x[0]));
  for (const n of [...pkg.parts.keys()])
    if (
      (n.startsWith("xl/worksheets/") ||
        n === "xl/styles.xml" ||
        n === "xl/workbook.xml" ||
        n === "xl/_rels/workbook.xml.rels" ||
        n === "[Content_Types].xml") &&
      !keep.has(n)
    )
      pkg.parts.delete(n);
  for (const [n, v] of values) pkg.parts.set(n, bytes(v));
}
export default {
  instruções: {
    passos: [
      "Abra XLSX ou CSV local.",
      "Edite células diretamente; um valor iniciado por = é gravado como fórmula, mas não calculado no navegador.",
      "Baixe no formato original. O Office recalcula fórmulas ao abrir.",
    ],
    exemplo: {
      texto:
        "Altere uma célula de orçamento e baixe um XLSX preservando as demais partes do arquivo.",
    },
    limites:
      "XLSX OOXML sem macros/senha ou CSV UTF-8, até 20 MB, 20 abas, 5.000 células preenchidas. O editor não calcula fórmulas, oferece formatação básica sem reproduzir gráficos/layouts complexos e não oferece alteração estrutural de abas. Fórmulas editadas não recebem cache; valores podem ser recalculados pelo Office.",
  },
  montar(root) {
    const { el, status, work, executar } = mountBase(
      root,
      "Editor de planilhas",
      ".xlsx,.csv",
      "Edite valores, fórmulas e formatos de células.",
    );
    let pkg,
      file,
      kind = "xlsx",
      selected = null,
      csvSeparator = ",";
    const bar = document.createElement("div");
    bar.className = "office-formatbar";
    bar.innerHTML =
      '<span>Célula selecionada</span><button type="button" data-format-bold>Negrito</button><label>Fundo <input data-format-fill type="color" value="#fff0cc"></label><label>Formato <select data-format-number><option value="">Original</option><option value="2">Número (2 casas)</option><option value="7">Moeda</option><option value="9">Porcentagem</option><option value="14">Data</option></select></label>';
    el.querySelector(".office-toolbar").after(bar);
    const hist = historyWire(
      el,
      () =>
        JSON.stringify({
          active: work.dataset.active,
          values: [
            ...work.querySelectorAll(".office-grid :is(input,textarea)"),
          ].map((i) => i.value),
          formats: [
            ...work.querySelectorAll(".office-grid :is(input,textarea)"),
          ].map((i) => i.dataset.officeFormat || ""),
          xml: kind === "xlsx" && pkg ? state(pkg) : null,
        }),
      (s) => {
        const snap = JSON.parse(s);
        if (kind === "xlsx") {
          restore(pkg, snap.xml);
          render(work, pkg, Number(snap.active) || 0);
        }
        work
          .querySelectorAll(".office-grid :is(input,textarea)")
          .forEach((i, n) => {
            i.value = snap.values[n] ?? "";
            if (snap.formats[n]) i.dataset.officeFormat = snap.formats[n];
          });
      },
      (dirty) => {
        status.textContent = dirty
          ? "Há alterações por baixar."
          : "Arquivo carregado.";
      },
    );
    el.querySelector(".office-file").onchange = async (e) => {
      try {
        if (el.dataset.busy === "true") return;
        file = e.target.files[0];
        if (!file) return;
        selected = null;
        el.querySelector('[data-action="save"]').disabled = true;
        await executar("Abrindo planilha…", async () => {
          kind = /\.csv$/i.test(file.name) ? "csv" : "xlsx";
          if (kind === "csv") {
            bar.hidden = true;
            if (file.size > 20 * 1024 * 1024) throw Error("Limite de 20 MB.");
            const csvText = new TextDecoder("utf-8", { fatal: true }).decode(
              await file.arrayBuffer(),
            );
            if (csvText.length > 200000)
              throw Error("CSV limitado a 200.000 caracteres.");
            csvSeparator = detectarSeparador(csvText);
            const rows = lerCsv(csvText, { separador: csvSeparator });
            if (
              !rows.length ||
              rows.some((row) => row.some((value) => value.length > 32767))
            )
              throw Error("CSV vazio ou célula acima de 32.767 caracteres.");
            if (rows.length * Math.max(...rows.map((r) => r.length), 1) > 5000)
              throw Error("CSV limitado a 5.000 células.");
            work.innerHTML = "";
            const table = document.createElement("table");
            table.className = "office-grid";
            rows.forEach((row, r) => {
              const tr = document.createElement("tr");
              row.forEach((v, c) => {
                const td = document.createElement("td"),
                  input = document.createElement(
                    v.includes("\n") ? "textarea" : "input",
                  );
                input.maxLength = 32767;
                input.value = v;
                input.dataset.ref = `${colName(c)}${r + 1}`;
                td.append(input);
                tr.append(td);
              });
              table.append(tr);
            });
            work.append(table);
          } else {
            bar.hidden = false;
            pkg = await abrirPacote(file);
            if (!pkg.parts.has("xl/workbook.xml"))
              throw Error("O arquivo não parece XLSX válido.");
            render(work, pkg);
          }
          el.querySelector('[data-action="save"]').disabled = false;
          status.textContent = `${file.name} aberto.`;
          hist.init();
        });
      } catch (x) {
        file = null;
        pkg = null;
        selected = null;
        work.replaceChildren();
        el.querySelector('[data-action="save"]').disabled = true;
        status.textContent = x.message;
      }
    };
    work.addEventListener("focusin", (e) => {
      if (e.target.matches(".office-grid :is(input,textarea)"))
        selected = e.target;
    });
    work.addEventListener("input", (e) => {
      if (e.target.matches(".office-grid :is(input,textarea)")) {
        e.target.maxLength = 32767;
        const total = [
          ...work.querySelectorAll(".office-grid :is(input,textarea)"),
        ].reduce((n, i) => n + i.value.length, 0);
        if (total > 200000) {
          e.target.value =
            e.target.dataset.lastValid ?? e.target.dataset.original ?? "";
          status.textContent =
            "Limite de 32.000 caracteres por célula e 200.000 no total.";
          return;
        }
        e.target.dataset.lastValid = e.target.value;
        hist.snapshot();
      }
    });
    const aplicarFormato = (next) => {
      if (selected && !selected.isConnected) selected = work.querySelector(`[data-ref="${selected.dataset.ref}"]`);
      if (!selected || kind !== "xlsx") {
        status.textContent = "Selecione uma célula XLSX preenchida primeiro.";
        return;
      }
      const format = JSON.parse(selected.dataset.officeFormat || "{}");
      Object.assign(format, next);
      selected.dataset.officeFormat = JSON.stringify(format);
      try {
        apply(work, pkg);
        applyStyles(pkg, work);
        hist.snapshot();
        status.textContent = "Formato OOXML aplicado à célula.";
      } catch (e) {
        delete selected.dataset.officeFormat;
        status.textContent = e.message;
      }
    };
    bar.querySelector("[data-format-bold]").onclick = () => {
      if (!selected) return;
      let bold = false;
      try {
        const d = parseXml(text(pkg.parts.get("xl/styles.xml"))),
          xfs = d.getElementsByTagNameNS(MAIN, "cellXfs")[0],
          fontList = d.getElementsByTagNameNS(MAIN, "fonts")[0],
          id = Number(selected.dataset.styleOriginal) || 0,
          xf = xfs.children[id],
          font = fontList.children[Number(xf?.getAttribute("fontId")) || 0];
        bold = !!font?.getElementsByTagNameNS(MAIN, "b").length;
      } catch {}
      aplicarFormato({ bold: !bold });
    };
    bar.querySelector("[data-format-fill]").onchange = (e) =>
      aplicarFormato({ fill: e.target.value.slice(1).toUpperCase() });
    bar.querySelector("[data-format-number]").onchange = (e) =>
      aplicarFormato({ numFmt: Number(e.target.value) || 0 });
    el.querySelector('[data-action="save"]').onclick = async () => {
      if (!file) return;
      try {
        await executar("Preparando download…", async () => {
          if (kind === "csv") {
            const rows = [...work.querySelectorAll("tr")].map((tr) =>
              [...tr.querySelectorAll("input,textarea")]
                .map((i) => '"' + i.value.replaceAll('"', '""') + '"')
                .join(csvSeparator),
            );
            download(
              bytes("\uFEFF" + rows.join("\r\n")),
              file.name,
              "text/csv;charset=utf-8",
            );
          } else {
            apply(work, pkg);
            applyStyles(pkg, work);
            download(
              exportPackage(pkg),
              file.name,
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
          }
          status.textContent = "Planilha editada baixada.";
        });
      } catch (e) {
        status.textContent = e.message;
      }
    };
  },
};

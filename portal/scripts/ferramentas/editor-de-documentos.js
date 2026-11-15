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

const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const txtNodes = (p) => [...p.getElementsByTagNameNS(NS, "t")];
function paragraphs(pkg) {
  const d = parseXml(text(pkg.parts.get("word/document.xml")));
  return { d, list: [...d.getElementsByTagNameNS(NS, "p")] };
}
function render(work, pkg, edits) {
  work.replaceChildren();
  const { list } = paragraphs(pkg);
  let n = 0,
    total = 0;
  for (const p of list) {
    const edit = edits.get(n),
      s =
        edit?.text ??
        edit ??
        txtNodes(p)
          .map((x) => x.textContent)
          .join("");
    total += s.length;
    if (s.length > 32000 || total > 200000)
      throw Error(
        "Este documento tem texto demais para editar com segurança (32.000 caracteres por parágrafo; 200.000 no total).",
      );
    const box = document.createElement("textarea");
    box.className = "office-doc-line";
    box.dataset.index = n++;
    box.rows = Math.max(1, Math.min(8, s.split("\n").length));
    box.maxLength = 32000;
    box.spellcheck = true;
    box.setAttribute("aria-label", `Parágrafo ${n}`);
    box.value = s;
    aplicarPreviaFormato(box, edit?.format);
    box.dataset.lastValid = s;
    work.append(box);
  }
  work.dataset.count = String(n);
}
function setRunProperty(d, run, tag, enabled, value) {
  let props = run.getElementsByTagNameNS(NS, "rPr")[0];
  if (!props) {
    props = d.createElementNS(NS, "w:rPr");
    run.insertBefore(props, run.firstChild);
  }
  let el = [...props.children].find((x) => x.localName === tag);
  if (tag === "color" && value) {
    if (!el) {
      el = d.createElementNS(NS, "w:color");
      props.append(el);
    }
    el.setAttributeNS(NS, "w:val", value);
  } else if (tag === "sz" && value) {
    if (!el) {
      el = d.createElementNS(NS, "w:sz");
      props.append(el);
    }
    el.setAttributeNS(NS, "w:val", String(value * 2));
  } else if (enabled) {
    if (!el) {
      el = d.createElementNS(NS, `w:${tag}`);
      props.append(el);
    }
    if (tag === "u") el.setAttributeNS(NS, "w:val", "single");
  } else if (el) el.remove();
}
function apply(pkg, edits) {
  const { d, list } = paragraphs(pkg);
  for (const [index, raw] of edits) {
    const edit = typeof raw === "string" ? { text: raw, format: {} } : raw,
      value = edit.text ?? "",
      p = list[Number(index)];
    if (!p) continue;
    const nodes = txtNodes(p);
    if (!nodes.length) {
      const r = d.createElementNS(NS, "w:r"),
        t = d.createElementNS(NS, "w:t");
      t.setAttributeNS(
        "http://www.w3.org/XML/1998/namespace",
        "xml:space",
        "preserve",
      );
      t.textContent = value;
      r.append(t);
      p.append(r);
    } else {
      nodes.forEach((t, i) => {
        t.textContent = i === 0 ? value : "";
        if (i === 0)
          t.setAttributeNS(
            "http://www.w3.org/XML/1998/namespace",
            "xml:space",
            "preserve",
          );
      });
    }
    const run = p.getElementsByTagNameNS(NS, "r")[0];
    if (run) {
      for (const prop of ["b", "i", "u"])
        if (Object.hasOwn(edit.format ?? {}, prop))
          setRunProperty(d, run, prop, edit.format[prop]);
      if (edit.format?.size)
        setRunProperty(d, run, "sz", true, edit.format.size);
      if (edit.format?.color)
        setRunProperty(d, run, "color", true, edit.format.color);
    }
    if (edit.format?.align) {
      let pPr = p.getElementsByTagNameNS(NS, "pPr")[0];
      if (!pPr) {
        pPr = d.createElementNS(NS, "w:pPr");
        p.insertBefore(pPr, p.firstChild);
      }
      let jc = pPr.getElementsByTagNameNS(NS, "jc")[0];
      if (!jc) {
        jc = d.createElementNS(NS, "w:jc");
        pPr.append(jc);
      }
      jc.setAttributeNS(NS, "w:val", edit.format.align);
    }
  }
  saveXml(pkg, "word/document.xml", d);
}
export default {
  instruções: {
    passos: [
      "Abra um DOCX ou TXT local.",
      "Selecione um parágrafo e edite o texto ou aplique negrito, itálico, sublinhado, tamanho, cor e alinhamento. Use desfazer e refazer.",
      "Baixe o arquivo editado no mesmo formato; DOCX conserva imagens, estilos e demais partes do pacote.",
    ],
    exemplo: {
      texto:
        "Edite o texto e aplique negrito ou uma cor ao parágrafo selecionado.",
    },
    limites:
      "DOCX OOXML e TXT UTF-8 até 20 MB; até 1.000 parágrafos, 32.000 caracteres por parágrafo e 200.000 no total. Arquivos cifrados, com macros ou DOC antigo não são aceitos. Prévia de conteúdo sem paginação; a formatação aplicada ao texto de um parágrafo usa o primeiro estilo de trecho existente.",
  },
  montar(root) {
    const { el, status, work, executar } = mountBase(
      root,
      "Editor de documentos",
      ".docx,.txt",
      "Edite o conteúdo de documentos DOCX ou TXT no aparelho.",
    );
    let pkg = null,
      file = null,
      kind = "docx",
      edits = new Map();
    const bar = document.createElement("div");
    bar.className = "office-formatbar";
    bar.innerHTML =
      '<span>Parágrafo selecionado</span><button type="button" data-format="b" aria-pressed="false">Negrito</button><button type="button" data-format="i" aria-pressed="false">Itálico</button><button type="button" data-format="u" aria-pressed="false">Sublinhado</button><label>Tamanho <select data-format-size><option value="">Original</option><option>8</option><option>10</option><option>12</option><option>14</option><option>18</option><option>24</option><option>36</option><option>48</option><option>72</option></select></label><label>Cor <input data-format-color type="color" value="#222222"></label><label>Alinhar <select data-format-align><option value="">Original</option><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option><option value="both">Justificado</option></select></label>';
    el.querySelector(".office-toolbar").after(bar);
    let selected = 0;
    const hist = historyWire(
      el,
      () =>
        kind === "txt"
          ? work.querySelector("textarea")?.value || ""
          : JSON.stringify([...edits]),
      (value) => {
        if (kind === "txt") {
          work.querySelector("textarea").value = value;
        } else {
          edits = new Map(JSON.parse(value));
          render(work, pkg, edits);
        }
      },
      (dirty) => {
        status.textContent = dirty
          ? "Há alterações por baixar."
          : "Arquivo carregado.";
      },
    );
    el.querySelector(".office-file").onchange = async (ev) => {
      if (el.dataset.busy === "true") return;
      file = ev.target.files[0];
      if (!file) return;
      el.querySelector('[data-action="save"]').disabled = true;
      try {
        await executar("Abrindo documento…", async () => {
          if (file.size > 20 * 1024 * 1024) throw Error("Limite de 20 MB.");
          kind = /\.txt$/i.test(file.name) ? "txt" : "docx";
          if (kind === "txt") {
            bar.hidden = true;
            const value = new TextDecoder("utf-8", { fatal: true }).decode(
              await file.arrayBuffer(),
            );
            const lines = value.split(/\r?\n/);
            if (
              lines.length > 1000 ||
              value.length > 200000 ||
              lines.some((x) => x.length > 32000)
            )
              throw Error(
                "TXT limitado a 1.000 linhas, 32.000 caracteres por linha e 200.000 caracteres no total.",
              );
            work.replaceChildren();
            const ta = document.createElement("textarea");
            ta.className = "office-text";
            ta.maxLength = 200000;
            ta.value = value;
            work.append(ta);
            ta.addEventListener("input", hist.snapshot);
            el.querySelector('[data-action="txt"]').hidden = false;
          } else {
            bar.hidden = false;
            el.querySelector('[data-action="txt"]').hidden = false;
            pkg = await abrirPacote(file);
            if (!pkg.parts.has("word/document.xml"))
              throw Error("O arquivo não parece DOCX válido.");
            edits = new Map();
            render(work, pkg, edits);
            if (work.querySelectorAll("[data-index]").length > 1000)
              throw Error("DOCX limitado a 1.000 parágrafos.");
          }
          el.querySelector('[data-action="save"]').disabled = false;
          status.textContent = `${file.name} aberto.`;
          hist.init();
        });
      } catch (e) {
        file = null;
        pkg = null;
        edits = new Map();
        work.replaceChildren();
        el.querySelector('[data-action="save"]').disabled = true;
        status.textContent = e.message;
      }
    };
    work.addEventListener("focusin", (ev) => {
      if (ev.target.matches("[data-index]"))
        selected = Number(ev.target.dataset.index);
    });
    work.addEventListener("input", (ev) => {
      if (ev.target.matches("[data-index]")) {
        const old = edits.get(selected),
          total = [...work.querySelectorAll("[data-index]")].reduce(
            (n, x) => n + x.value.length,
            0,
          );
        if (ev.target.value.length > 32000 || total > 200000) {
          ev.target.value = ev.target.dataset.lastValid;
          status.textContent =
            "Limite de 32.000 caracteres por parágrafo e 200.000 no total.";
          return;
        }
        ev.target.dataset.lastValid = ev.target.value;
        edits.set(selected, {
          text: ev.target.value,
          format: old?.format ?? {},
        });
        hist.snapshot();
      }
    });
    const setFormat = (key, value) => {
      const box = work.querySelector(`[data-index="${selected}"]`);
      if (!box) return;
      const old = edits.get(selected),
        edit =
          typeof old === "string"
            ? { text: old, format: {} }
            : (old ?? { text: box.value, format: {} });
      const format = { ...edit.format };
      if (key === "b" || key === "i" || key === "u") format[key] = !format[key];
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
    el.querySelector('[data-action="save"]').onclick = async () => {
      try {
        await executar("Preparando download…", async () => {
          if (kind === "txt")
            download(
              bytes(work.querySelector("textarea").value),
              file.name,
              "text/plain;charset=utf-8",
            );
          else {
            apply(pkg, edits);
            download(
              exportPackage(pkg),
              file.name,
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            );
          }
          status.textContent = "Arquivo editado baixado.";
        });
      } catch (e) {
        status.textContent = e.message;
      }
    };
    el.querySelector('[data-action="txt"]').hidden = true;
    el.querySelector('[data-action="txt"]').onclick = () =>
      download(
        bytes(
          [...work.querySelectorAll("textarea")]
            .map((box) => box.value)
            .join("\n"),
        ),
        `${file?.name.replace(/\.[^.]+$/, "") || "documento"}.txt`,
        "text/plain;charset=utf-8",
      );
  },
};

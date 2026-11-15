/** Leitura e gravação local de pacotes OOXML com limites apertados. */
import { lerZip, extrairEntrada } from "../../cálculos/zip.js";
import { compactarZip } from "../exportação/compactar-zip.js";
import { criarProgresso } from "../../núcleo/interface.js";

export const MAX_ARQUIVO = 20 * 1024 * 1024;
const MAX_TOTAL = 80 * 1024 * 1024;
const MAX_ENTRADAS = 2000;
const dec = new TextDecoder();
const enc = new TextEncoder();

export async function abrirPacote(file) {
  if (!(file instanceof File) || file.size > MAX_ARQUIVO)
    throw Error("Escolha um arquivo de até 20 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const zip = lerZip(bytes);
  if (zip.entradas.length > MAX_ENTRADAS)
    throw Error("O pacote tem mais de 2.000 itens e não será aberto.");
  if (zip.entradas.some((e) => e.recusa))
    throw Error(
      "O pacote tem um item cifrado, comprimido de forma não suportada ou caminho inválido. Arquivos protegidos por senha não são aceitos.",
    );
  if (zip.tamanhoTotal > MAX_TOTAL)
    throw Error("O conteúdo descompactado passa de 80 MB.");
  const parts = new Map();
  let total = 0;
  for (const e of zip.entradas) {
    if (e.éPasta) continue;
    const data = await extrairEntrada(bytes, e);
    total += data.length;
    if (total > MAX_TOTAL)
      throw Error("O conteúdo descompactado passa de 80 MB.");
    parts.set(e.nome, data);
  }
  // Macro content can be retained, but it must never be silently edited/dropped.
  if (
    [...parts.keys()].some((n) => /(?:^|\/)vbaProject\.bin$/i.test(n)) ||
    /macroEnabled/i.test(
      text(parts.get("[Content_Types].xml") || new Uint8Array()),
    )
  )
    throw Error(
      "Arquivos com macros não são aceitos. Salve uma cópia sem macros no Office e tente novamente.",
    );
  return {
    parts,
    name: file.name,
  };
}
export const text = (bytes) => dec.decode(bytes);
export const bytes = (value) => enc.encode(value);
export function parseXml(source) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw Error("XML com declaração externa não é aceito.");
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (doc.querySelector("parsererror"))
    throw Error("O XML deste arquivo está danificado.");
  return doc;
}
export function xml(doc) {
  return new XMLSerializer().serializeToString(doc);
}
export function saveXml(pkg, path, doc) {
  pkg.parts.set(path, bytes(xml(doc)));
}
export function exportPackage(pkg) {
  return compactarZip(
    [...pkg.parts].map(([nome, conteúdo]) => ({ nome, conteúdo })),
  );
}
export function download(
  data,
  name,
  mime = "application/vnd.openxmlformats-officedocument",
) {
  const blob = new Blob([data], { type: mime }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export function markup(title, accept, help) {
  return `<section class="office-editor"><header><h2>${title}</h2><p>${help}</p></header><label class="office-upload">Abrir arquivo <input class="office-file" type="file" accept="${accept}"></label><p class="office-status" aria-live="polite">Selecione um arquivo para começar.</p><div class="office-toolbar"><button data-action="undo" disabled>Desfazer</button><button data-action="redo" disabled>Refazer</button><button data-action="save" disabled>Baixar arquivo editado</button><button data-action="txt" hidden>Baixar TXT</button></div><div class="office-work"></div><p class="office-note">O arquivo fica neste navegador. Prévia aproximada; confirme a aparência no Microsoft Office ou compatível.</p></section>`;
}
export function mountBase(root, title, accept, help) {
  root.innerHTML = markup(title, accept, help);
  const el = root.querySelector(".office-editor");
  const status = el.querySelector(".office-status");
  const slot = document.createElement("div");
  slot.className = "office-progress-slot";
  slot.innerHTML = '<div class="progresso" aria-live="polite"></div>';
  el.insertBefore(slot, el.querySelector(".office-toolbar"));
  const progress = criarProgresso(slot.firstElementChild, { tipo: "arquivo" });
  let operation = 0,
    busy = false;
  const executar = async (label, task) => {
    if (busy) throw Error("Aguarde o processamento atual terminar.");
    busy = true;
    const id = ++operation,
      picker = el.querySelector(".office-file");
    picker.disabled = true;
    el.dataset.busy = "true";
    const locked = [
      ...el.querySelectorAll(".office-work,.office-toolbar,.office-formatbar"),
    ];
    for (const node of locked) node.inert = true;
    progress.iniciar(label);
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 100);
      requestAnimationFrame(finish);
    });
    try {
      const result = await task();
      if (id !== operation) return null;
      progress.concluir("Arquivo pronto");
      return result;
    } catch (error) {
      if (id === operation)
        progress.falhar(error?.message || "Falha ao processar o arquivo");
      throw error;
    } finally {
      busy = false;
      picker.disabled = false;
      delete el.dataset.busy;
      for (const node of locked) node.inert = false;
    }
  };
  return { el, status, work: el.querySelector(".office-work"), executar };
}
export function historyWire(el, read, write, changed) {
  const history = [];
  let pos = -1,
    lock = false;
  const snapshot = () => {
    if (lock) return;
    const s = read();
    if (history[pos] === s) return;
    history.splice(pos + 1);
    history.push(s);
    while (
      history.length > 20 ||
      (history.length > 1 &&
        history.reduce((n, value) => n + value.length * 2, 0) >
          16 * 1024 * 1024)
    )
      history.shift();
    pos = history.length - 1;
    changed(pos > 0);
    buttons();
  };
  const buttons = () => {
    el.querySelector('[data-action="undo"]').disabled = pos <= 0;
    el.querySelector('[data-action="redo"]').disabled =
      pos < 0 || pos >= history.length - 1;
  };
  const move = (d) => {
    if (pos + d < 0 || pos + d >= history.length) return;
    pos += d;
    lock = true;
    write(history[pos]);
    lock = false;
    changed(pos > 0);
    buttons();
  };
  el.querySelector('[data-action="undo"]').onclick = () => move(-1);
  el.querySelector('[data-action="redo"]').onclick = () => move(1);
  return {
    snapshot,
    init: () => {
      history.length = 0;
      history.push(read());
      pos = 0;
      buttons();
    },
    buttons,
  };
}

export function aplicarPreviaFormato(box, format = {}) {
  box.style.fontWeight = format.b ? "700" : "";
  box.style.fontStyle = format.i ? "italic" : "";
  box.style.textDecoration = format.u ? "underline" : "";
  box.style.fontSize = format.size ? `${format.size}pt` : "";
  box.style.color = format.color ? `#${format.color}` : "";
  box.style.textAlign =
    { both: "justify", l: "left", ctr: "center", r: "right", just: "justify" }[
      format.align
    ] ||
    format.align ||
    "";
}

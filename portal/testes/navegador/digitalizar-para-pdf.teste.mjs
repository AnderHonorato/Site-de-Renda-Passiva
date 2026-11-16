import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "../../recursos/pdf-lib.esm.min.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 4487,
  BASE = `http://127.0.0.1:${PORT}`;
let chromium;
try {
  chromium = createRequire(import.meta.url)("playwright").chromium;
} catch {}
if (!chromium)
  try {
    chromium = (
      await import("/opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/playwright/driver/package/index.mjs")
    ).chromium;
  } catch {}
const skip = chromium ? false : "Playwright indisponível";
let server, browser;
before(async () => {
  if (!chromium) return;
  server = spawn(
    process.execPath,
    ["ferramentas/servir.mjs", ".", "--porta", String(PORT), "--local"],
    { cwd: ROOT, stdio: "ignore" },
  );
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium
    .launch()
    .catch(() =>
      chromium.launch({
        executablePath:
          process.env.PLAYWRIGHT_EXECUTAVEL || "/usr/bin/chromium",
        args: ["--no-sandbox"],
      }),
    );
});
after(async () => {
  await browser?.close();
  server?.kill();
});

async function montar(page) {
  await page
    .context()
    .addCookies([
      { name: "visto_novidades", value: "999999999999999", url: BASE },
    ]);
  await page.goto(BASE);
  await page.evaluate(async () => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/estilos/digitalizar-para-pdf.css";
    document.head.append(css);
    const modulo = await import("/scripts/ferramentas/digitalizar-para-pdf.js");
    const root = document.createElement("main");
    root.id = "scanner-fixture";
    document.body.replaceChildren(root);
    modulo.default.montar(root, {
      slug: "digitalizar-para-pdf",
      nome: "Digitalizar e transformar em PDF",
      cat: "pdf",
      exporta: ["baixar"],
    });
  });
}
async function foto(page, largura, altura, cor) {
  return Buffer.from(
    await page.evaluate(
      ({ largura, altura, cor }) => {
        const c = document.createElement("canvas");
        c.width = largura;
        c.height = altura;
        const ctx = c.getContext("2d");
        ctx.fillStyle = cor;
        ctx.fillRect(0, 0, largura, altura);
        return c.toDataURL("image/png").split(",")[1];
      },
      { largura, altura, cor },
    ),
    "base64",
  );
}
test(
  "scanner: fotos, corte, giro, ordem e preto/branco chegam ao PDF real; página cabe em 320px",
  { skip, timeout: 60000 },
  async () => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 760 },
      reducedMotion: "reduce",
      acceptDownloads: true,
    });
    const page = await context.newPage(),
      erros = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    await montar(page);
    const red = await foto(page, 80, 120, "#ff0000"),
      green = await foto(page, 120, 80, "#00aa44");
    await page.setInputFiles("#campo-arquivos", [
      { name: "frente.png", mimeType: "image/png", buffer: red },
      { name: "verso.png", mimeType: "image/png", buffer: green },
    ]);
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".scanner-doc__pagina").length === 2 &&
        !document.querySelector("#campo-arquivos").disabled,
    );
    await page
      .getByRole("button", { name: "Abrir página 1: frente.png", exact: true })
      .click();
    await page.locator("[data-girar]").click();
    await page.locator('[data-ajuste="esquerda"]').fill("25");
    await page.locator('[data-ajuste="modo"]').selectOption("pb");
    await page.waitForFunction(() => {
      const c = document.querySelector("[data-previa]");
      return c.width === 90 && c.height === 80;
    });
    await page
      .getByRole("button", { name: "Mover para antes 2", exact: true })
      .click();
    assert.deepEqual(
      await page.locator(".scanner-doc__nome").allTextContents(),
      ["verso.png", "frente.png"],
    );
    await page.locator("#campo-tamanho").selectOption("adaptar");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
      "sem rolagem horizontal em320px",
    );
    await page.getByRole("button", { name: "Gerar PDF", exact: true }).click();
    await page.locator("#resultado").waitFor({ state: "visible" });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Baixar PDF", exact: true }).click(),
    ]);
    const bytes = await readFile(await download.path());
    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 2);
    const sizes = doc.getPages().map((p) => [p.getWidth(), p.getHeight()]);
    assert.deepEqual(sizes, [
      [57.6, 38.4],
      [43.2, 38.4],
    ]);
    const cores = await page.evaluate(async (base64) => {
      const { abrirComPdfjsParaTexto } =
        await import("/scripts/ferramentas/auxiliares/pdfjs-textos.js");
      const leitor = await abrirComPdfjsParaTexto(
        Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
      );
      const cores = [];
      try {
        for (let i = 1; i <= leitor.páginas; i++) {
          const c = document.createElement("canvas");
          await leitor.desenharNaTela(i, c, 300);
          cores.push([
            ...c
              .getContext("2d")
              .getImageData(
                Math.floor(c.width / 2),
                Math.floor(c.height / 2),
                1,
                1,
              ).data,
          ]);
        }
      } finally {
        await leitor.fechar();
      }
      return cores;
    }, bytes.toString("base64"));
    assert.ok(
      cores[0][1] > 150 && cores[0][0] < 20,
      `a primeira página exportada é verde: ${cores[0]}`,
    );
    assert.ok(
      cores[1].slice(0, 3).every((c) => c < 10),
      `a segunda está realmente em preto/branco: ${cores[1]}`,
    );
    assert.deepEqual(erros, []);
    await context.close();
  },
);

test(
  "scanner: arquivo inválido preserva páginas e permite tentar de novo; limpar remove miniaturas e ajustes",
  { skip, timeout: 30000 },
  async () => {
    const context = await browser.newContext({
        viewport: { width: 768, height: 900 },
      }),
      page = await context.newPage();
    await montar(page);
    await page.locator("[data-exemplo]").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".scanner-doc__pagina").length === 1 &&
        !document.querySelector("#campo-arquivos").disabled,
    );
    await page.setInputFiles("#campo-arquivos", {
      name: "falso.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("sem uma foto"),
    });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-status]").dataset.erro === "true" &&
        !document.querySelector("#campo-arquivos").disabled,
    );
    assert.equal(await page.locator(".scanner-doc__pagina").count(), 1);
    assert.match(
      await page.locator("[data-status]").textContent(),
      /JPG, PNG ou WebP/,
    );
    await page.locator("[data-exemplo]").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".scanner-doc__pagina").length === 2 &&
        !document.querySelector("#campo-arquivos").disabled,
    );
    await page
      .getByRole("button", { name: "Excluir página 1", exact: true })
      .click();
    assert.equal(await page.locator(".scanner-doc__pagina").count(), 1);
    assert.equal(
      await page.locator("[data-captura]").getAttribute("capture"),
      "environment",
    );
    await page.getByRole("button", { name: "Limpar", exact: true }).click();
    assert.equal(await page.locator(".scanner-doc__pagina").count(), 0);
    assert.equal(await page.locator(".scanner-doc__vazio").isVisible(), true);
    assert.equal(
      await page.locator("[data-previa]").evaluate((c) => c.width),
      0,
    );
    assert.equal(await page.locator("#campo-arquivos").isEnabled(), true);
    await context.close();
  },
);

test(
  "scanner: EXIF3 mantém giro da câmera uma só vez, inclusive no PDF exportado",
  { skip, timeout: 30000 },
  async () => {
    const context = await browser.newContext({ acceptDownloads: true }),
      page = await context.newPage();
    await montar(page);
    const jpeg = Buffer.from(
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 80;
        c.height = 120;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(0, 0, 80, 60);
        ctx.fillStyle = "#0000ff";
        ctx.fillRect(0, 60, 80, 60);
        return c.toDataURL("image/jpeg", 0.96).split(",")[1];
      }),
      "base64",
    );
    // APP1 Exif com TIFF little-endian: uma entrada SHORT Orientation=3 (180 graus).
    const exif = Buffer.from([
      0xff, 0xe1, 0x00, 0x22, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0,
      0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
    ]);
    await page.setInputFiles("#campo-arquivos", {
      name: "camera-180.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.concat([jpeg.subarray(0, 2), exif, jpeg.subarray(2)]),
    });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".scanner-doc__pagina").length === 1 &&
        !document.querySelector("#campo-arquivos").disabled,
    );
    const preview = await page
      .locator("[data-previa]")
      .evaluate((c) => [...c.getContext("2d").getImageData(40, 20, 1, 1).data]);
    assert.ok(
      preview[2] > 220 && preview[0] < 20,
      `a parte de cima fica azul após o EXIF3: ${preview}`,
    );
    await page.locator("#campo-tamanho").selectOption("adaptar");
    await page.getByRole("button", { name: "Gerar PDF", exact: true }).click();
    await page.locator("#resultado").waitFor({ state: "visible" });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Baixar PDF", exact: true }).click(),
    ]);
    const bytes = await readFile(await download.path());
    const pixel = await page.evaluate(async (base64) => {
      const { abrirComPdfjsParaTexto } =
        await import("/scripts/ferramentas/auxiliares/pdfjs-textos.js");
      const leitor = await abrirComPdfjsParaTexto(
        Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
      );
      try {
        const c = document.createElement("canvas");
        await leitor.desenharNaTela(1, c, 400);
        return [
          ...c
            .getContext("2d")
            .getImageData(
              Math.floor(c.width / 2),
              Math.floor(c.height / 6),
              1,
              1,
            ).data,
        ];
      } finally {
        await leitor.fechar();
      }
    }, bytes.toString("base64"));
    assert.ok(
      pixel[2] > 220 && pixel[0] < 20,
      `o PDF também tem azul em cima: ${pixel}`,
    );
    await context.close();
  },
);

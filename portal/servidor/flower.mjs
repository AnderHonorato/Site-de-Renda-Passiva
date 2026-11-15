import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  openSync,
  readFileSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { ferramentasProntas } from "../dados/catálogo.js";
import { erro } from "./seguranca.mjs";

const provedores = {
  openai: { host: "api.openai.com", kind: "responses" },
  anthropic: { host: "api.anthropic.com", kind: "anthropic" },
  gemini: { host: "generativelanguage.googleapis.com", kind: "gemini" },
  groq: {
    host: "api.groq.com",
    path: "/openai/v1/chat/completions",
    kind: "openai",
  },
  deepseek: {
    host: "api.deepseek.com",
    path: "/v1/chat/completions",
    kind: "openai",
  },
  mistral: {
    host: "api.mistral.ai",
    path: "/v1/chat/completions",
    kind: "openai",
  },
  xai: { host: "api.x.ai", path: "/v1/chat/completions", kind: "openai" },
  openrouter: {
    host: "openrouter.ai",
    path: "/api/v1/chat/completions",
    kind: "openai",
  },
  cohere: { host: "api.cohere.com", kind: "cohere" },
  custom: { host: null, kind: "openai" },
};
const instruction = `Você é Flower, assistente conversacional do portal de ferramentas. Converse com naturalidade e ajude tanto com perguntas gerais quanto com dúvidas sobre o portal. Para assuntos gerais, use seu conhecimento e admita incerteza quando necessário. Para fatos específicos do portal, use o contexto fornecido e não invente recursos. Não acesse contas, arquivos ou dados privados, não execute ações e não afirme que concluiu operações. Responda em português claro e conciso, salvo quando a pessoa usar outro idioma.`;
const slugsEmDestaque = [
  "editar-pdf",
  "editor-de-fotos",
  "converter-audio",
  "editor-de-documentos",
  "editor-de-apresentacoes",
  "editor-de-planilhas",
];
const destaques = slugsEmDestaque
  .map((slug) => ferramentasProntas.find((f) => f.slug === slug))
  .filter(Boolean);
const amostra = [
  ...destaques,
  ...ferramentasProntas
    .slice(0, 24)
    .filter((f) => !slugsEmDestaque.includes(f.slug))
    .slice(0, 18),
];
const ferramentas = amostra
  .map(
    (f) =>
      `${f.nome} (slug ${f.slug}; plano ${f.plano}; ${String(f.resumo || "").slice(0, 180)})`,
  )
  .join("; ");
const context = `Contexto limitado do portal: o catálogo tem atualmente ${ferramentasProntas.length} ferramentas prontas. Existem ferramentas públicas gratuitas e outras com selo Plus ou Premium; confira o plano de cada item e a página Planos. A página Ferramentas tem busca e categorias. Algumas entradas reais do catálogo: ${ferramentas}. Favoritos ficam no aparelho e podem sincronizar com uma conta dentro do limite do plano quando o servidor responde. Algumas ferramentas compatíveis permitem salvar trabalhos na conta. Não há como afirmar quais ferramentas estão abertas na página atual, nem acessar arquivos ou dados da pessoa.`;
const maxResposta = 1024 * 1024;

function chaveMestra() {
  const env = process.env.PORTAL_IA_CHAVE_MESTRA;
  if (env) {
    if (env.length < 32)
      throw new Error(
        "PORTAL_IA_CHAVE_MESTRA deve ter pelo menos 32 caracteres.",
      );
    return createHash("sha256").update(env).digest();
  }
  const caminho =
    process.env.PORTAL_IA_CHAVE_MESTRA_FILE ||
    resolve(import.meta.dirname, ".execucao", "flower-master.key");
  mkdirSync(dirname(caminho), { recursive: true, mode: 0o700 });
  try {
    const fd = openSync(caminho, "wx", 0o600);
    try {
      writeFileSync(fd, randomBytes(32));
    } finally {
      closeSync(fd);
    }
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  chmodSync(caminho, 0o600);
  const bytes = readFileSync(caminho);
  if (bytes.length !== 32)
    throw new Error("PORTAL_IA_CHAVE_MESTRA_FILE deve conter 32 bytes.");
  return bytes;
}
function cifrar(segredo) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", chaveMestra(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(segredo, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}
function decifrar(row) {
  if (!row.key_ciphertext || !row.key_iv || !row.key_tag) return "";
  const decipher = createDecipheriv(
    "aes-256-gcm",
    chaveMestra(),
    Buffer.from(row.key_iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.key_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.key_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
function publicConfig(row) {
  const exists = !!row.key_ciphertext;
  return {
    provider: row.provider,
    model: row.model,
    baseUrl: row.base_url,
    enabled: !!row.enabled,
    hasKey: exists,
    revision: row.revision,
    online: !!row.enabled && exists && !!row.model && chaveValida(row),
  };
}
function chaveValida(row) {
  try {
    return !!decifrar(row);
  } catch {
    return false;
  }
}
export function flowerStatus(db) {
  const config = publicConfig(
    db.prepare("SELECT * FROM flower_config WHERE id=1").get(),
  );
  return {
    online: config.online,
    provider: config.provider,
    model: config.model,
  };
}
export function flowerConfigAdmin(db) {
  return publicConfig(
    db.prepare("SELECT * FROM flower_config WHERE id=1").get(),
  );
}

function validarBaseUrl(value) {
  if (typeof value !== "string" || !value.trim())
    throw erro(400, "flower_base_url_invalida");
  let u;
  try {
    u = new URL(value.trim());
  } catch {
    throw erro(400, "flower_base_url_invalida");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    (u.port && u.port !== "443") ||
    !u.hostname.includes(".") ||
    /[\u0000-\u0020\\]/u.test(value)
  )
    throw erro(400, "flower_base_url_invalida");
  u.pathname = u.pathname.replace(/\/+$/u, "");
  return u.toString().replace(/\/$/u, "");
}
export function salvarConfigFlower(db, body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw erro(400, "dados_invalidos");
  const atual = db.prepare("SELECT * FROM flower_config WHERE id=1").get();
  if (!Number.isInteger(body.revision) || body.revision !== atual.revision)
    throw erro(409, "flower_desatualizada");
  if (
    !Object.hasOwn(provedores, body.provider) ||
    typeof body.model !== "string" ||
    body.model.trim().length > 120 ||
    typeof body.enabled !== "boolean" ||
    typeof (body.apiKey ?? "") !== "string" ||
    (body.apiKey || "").length > 500
  )
    throw erro(400, "dados_invalidos");
  const model = body.model.trim();
  if (
    body.enabled &&
    (!model ||
      (!body.apiKey?.trim() &&
        (!atual.key_ciphertext || body.clearKey === true)))
  )
    throw erro(400, "flower_config_incompleta");
  const baseUrl =
    body.provider === "custom" ? validarBaseUrl(body.baseUrl) : "";
  const nextSecret = body.apiKey?.trim() ? cifrar(body.apiKey.trim()) : null;
  const clearKey = body.clearKey === true;
  if (clearKey && nextSecret) throw erro(400, "flower_chave_ambigua");
  const destinoMudou =
    body.provider !== atual.provider || baseUrl !== atual.base_url;
  if (
    body.enabled &&
    !nextSecret &&
    (clearKey || destinoMudou || !atual.key_ciphertext)
  )
    throw erro(400, "flower_chave_nova_obrigatoria");
  const apagarChave = clearKey || destinoMudou;
  const atualizada = db
    .prepare(
      `UPDATE flower_config SET provider=?,model=?,base_url=?,enabled=?,
    key_ciphertext=?,key_iv=?,key_tag=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND revision=?`,
    )
    .run(
      body.provider,
      model,
      baseUrl,
      Number(body.enabled),
      apagarChave
        ? (nextSecret?.ciphertext ?? null)
        : (nextSecret?.ciphertext ?? atual.key_ciphertext),
      apagarChave ? (nextSecret?.iv ?? null) : (nextSecret?.iv ?? atual.key_iv),
      apagarChave
        ? (nextSecret?.tag ?? null)
        : (nextSecret?.tag ?? atual.key_tag),
      atual.revision,
    );
  if (!atualizada.changes) throw erro(409, "flower_desatualizada");
  const row = db.prepare("SELECT * FROM flower_config WHERE id=1").get();
  return publicConfig(row);
}

function ipv4Privado(ip) {
  const n = ip.split(".").map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isInteger(x) || x < 0 || x > 255))
    return true;
  return (
    n[0] === 0 ||
    n[0] === 10 ||
    n[0] === 127 ||
    n[0] >= 224 ||
    (n[0] === 169 && n[1] === 254) ||
    (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
    (n[0] === 192 && (n[1] === 168 || n[1] === 0)) ||
    (n[0] === 100 && n[1] >= 64 && n[1] <= 127) ||
    (n[0] === 192 && n[1] === 0) ||
    (n[0] === 198 && (n[1] === 18 || n[1] === 19 || n[1] === 51)) ||
    (n[0] === 203 && n[1] === 0)
  );
}
function ipv6Privado(ip) {
  const x = ip.toLowerCase().split("%")[0];
  if (
    x === "::1" ||
    x === "::" ||
    x.startsWith("fc") ||
    x.startsWith("fd") ||
    /^fe[89ab]/u.test(x)
  )
    return true;
  if (x.startsWith("2001:db8:")) return true;
  if (x.startsWith("::ffff:")) return ipv4Privado(x.slice(7));
  return false;
}
async function enderecoPublico(hostname) {
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname) ||
    hostname.includes(":")
  )
    throw new Error("host_blocked");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some((a) =>
      a.family === 4 ? ipv4Privado(a.address) : ipv6Privado(a.address),
    )
  )
    throw new Error("host_blocked");
  return addresses[0];
}
function requisitar(url, headers, body) {
  return new Promise((resolvePromise, reject) => {
    let req,
      settled = false;
    const temporizador = setTimeout(() => {
      req?.destroy(new Error("timeout"));
      falhar(new Error("timeout"));
    }, 20000);
    const terminar = (fn) => (valor) => {
      if (settled) return;
      settled = true;
      clearTimeout(temporizador);
      fn(valor);
    };
    const concluir = terminar(resolvePromise),
      falhar = terminar(reject);
    async function enviar() {
      const address = await enderecoPublico(url.hostname);
      if (settled) return;
      req = https.request(
        url,
        {
          method: "POST",
          headers,
          timeout: 20000,
          lookup: pinnedLookup(address),
          servername: url.hostname,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400) {
            res.resume();
            falhar(new Error("redirect"));
            return;
          }
          const parts = [];
          let size = 0;
          res.on("data", (part) => {
            size += part.length;
            if (size > maxResposta) {
              req.destroy(new Error("provider_body_large"));
              falhar(new Error("provider_body_large"));
              return;
            }
            parts.push(part);
          });
          res.on("end", () =>
            concluir({
              status: res.statusCode || 502,
              body: Buffer.concat(parts).toString("utf8"),
            }),
          );
        },
      );
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", falhar);
      req.end(body);
    }
    enviar().catch(falhar);
  });
}
export function pinnedLookup(address) {
  return (_hostname, options, callback) =>
    options?.all
      ? callback(null, [{ address: address.address, family: address.family }])
      : callback(null, address.address, address.family);
}
function endpoint(cfg, provider) {
  if (cfg.provider === "custom") {
    const base = new URL(cfg.base_url);
    if (!base.pathname.replace(/\/$/u, "").endsWith("/v1"))
      base.pathname = `${base.pathname.replace(/\/$/u, "")}/v1`;
    base.pathname = `${base.pathname.replace(/\/$/u, "")}/chat/completions`;
    return base;
  }
  if (provider.kind === "responses")
    return new URL("/v1/responses", `https://${provider.host}`);
  if (provider.kind === "anthropic")
    return new URL("/v1/messages", `https://${provider.host}`);
  if (provider.kind === "gemini")
    return new URL(
      `/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
      `https://${provider.host}`,
    );
  if (provider.kind === "cohere")
    return new URL("/v2/chat", `https://${provider.host}`);
  return new URL(
    provider.path || "/v1/chat/completions",
    `https://${provider.host}`,
  );
}
function providerPayload(cfg, messages, provider) {
  const conversation = [
    { role: "system", content: `${instruction}\n\n${context}` },
    ...messages,
  ];
  if (provider.kind === "responses")
    return {
      model: cfg.model,
      instructions: `${instruction}\n\n${context}`,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      max_output_tokens: 1024,
      store: false,
    };
  if (provider.kind === "anthropic")
    return {
      model: cfg.model,
      max_tokens: 700,
      system: `${instruction}\n\n${context}`,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
  if (provider.kind === "gemini")
    return {
      systemInstruction: { parts: [{ text: `${instruction}\n\n${context}` }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 1024 },
    };
  if (provider.kind === "cohere")
    return {
      model: cfg.model,
      max_tokens: 700,
      messages: conversation.map((m) => ({
        role:
          m.role === "assistant"
            ? "assistant"
            : m.role === "system"
              ? "system"
              : "user",
        content: m.content,
      })),
    };
  return {
    model: cfg.model,
    messages: conversation,
    temperature: 0.4,
    max_tokens: 700,
  };
}
function textoProvider(provider, data) {
  if (provider.kind === "responses")
    return (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text)
      .join("\n")
      .trim();
  if (provider.kind === "anthropic")
    return (data.content || [])
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n")
      .trim();
  if (provider.kind === "gemini")
    return (data.candidates?.[0]?.content?.parts || [])
      .map((item) => item.text || "")
      .join("\n")
      .trim();
  if (provider.kind === "cohere")
    return (data.message?.content || [])
      .map((item) => item.text || "")
      .join("\n")
      .trim();
  return String(data.choices?.[0]?.message?.content || "").trim();
}
function erroProvider(status, data) {
  const msg = String(data?.error?.message || data?.message || "").toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    /api.?key|authentication|unauthorized/u.test(msg)
  )
    return erro(502, "flower_credencial_invalida");
  if (status === 429 || /rate limit|quota/u.test(msg))
    return erro(503, "flower_limite_provedor");
  if (status === 400 || status === 404)
    return erro(502, "flower_config_provedor");
  return erro(502, "flower_provedor_indisponivel");
}
export async function responderFlower(
  db,
  messages,
  { request = requisitar } = {},
) {
  const cfg = db.prepare("SELECT * FROM flower_config WHERE id=1").get();
  if (!publicConfig(cfg).online) throw erro(503, "flower_offline");
  const provider = provedores[cfg.provider];
  const key = decifrar(cfg);
  const url = endpoint(cfg, provider);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "PortalFlower/1.0",
  };
  if (provider.kind === "anthropic") {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider.kind === "gemini") headers["x-goog-api-key"] = key;
  else headers.Authorization = `Bearer ${key}`;
  const body = JSON.stringify(providerPayload(cfg, messages, provider));
  let response;
  try {
    response = await request(url, headers, body);
  } catch (e) {
    throw erro(
      502,
      e.message === "timeout"
        ? "flower_tempo_esgotado"
        : e.message === "host_blocked"
          ? "flower_host_invalido"
          : "flower_provedor_indisponivel",
    );
  }
  let data;
  try {
    data = JSON.parse(response.body);
  } catch {
    data = {};
  }
  if (response.status < 200 || response.status >= 300)
    throw erroProvider(response.status, data);
  const text = textoProvider(provider, data);
  if (!text) throw erro(502, "flower_resposta_vazia");
  return { reply: text.slice(0, 5000), online: true };
}

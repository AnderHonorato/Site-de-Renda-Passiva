import { api } from "./api.js";
import { respostaFAQ } from "./flower-faq.js";

const tr = (pt, en) =>
  document.documentElement.lang?.startsWith("en") ? en : pt;
const msgOffline = () =>
  tr(
    "Não sei responder a isso com as respostas padrão. Esta pergunta precisa da IA online.",
    "I can’t answer that from the standard replies. This question needs the online AI.",
  );
let ready = false;

function svgRosto(id) {
  return `<svg class="flower__face" viewBox="0 0 96 96" aria-hidden="true" focusable="false"><g class="flower__body"><path class="flower__skin" d="M89 49c0 24-17 41-41 41S6 73 6 49 23 7 48 7s41 18 41 42Z"/><g class="flower__eyes"><rect id="${id}-left" class="flower__pupil" x="32" y="29" width="10" height="23" rx="5"/><rect id="${id}-right" class="flower__pupil" x="56" y="29" width="10" height="23" rx="5"/></g></g></svg>`;
}
function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function addMessage(list, role, text) {
  const row = make("div", `flower__message flower__message--${role}`);
  row.setAttribute("role", "listitem");
  row.textContent = text;
  list.append(row);
  list.scrollTop = list.scrollHeight;
  return row;
}
function statusCopy(online) {
  return online
    ? tr("IA online", "Online AI")
    : tr("Respostas padrão", "Standard replies");
}

export function iniciarFlower() {
  if (ready || !document.body) return;
  ready = true;
  const fab = make("button", "flower__fab");
  fab.type = "button";
  fab.setAttribute(
    "aria-label",
    tr("Abrir conversa com Flower", "Open chat with Flower"),
  );
  fab.setAttribute("aria-haspopup", "dialog");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = svgRosto("flower-fab");
  const modal = make("section", "flower__dialog");
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "flower-title");
  const header = make("header", "flower__header");
  const face = make("div", "flower__avatar");
  face.innerHTML = svgRosto("flower-modal");
  const titleWrap = make("div", "flower__identity");
  const title = make("h2", "", "Flower");
  title.id = "flower-title";
  const badge = make("span", "flower__status", statusCopy(false));
  badge.id = "flower-status";
  const retry = make(
    "button",
    "flower__retry",
    tr("Tentar conectar novamente", "Try connecting again"),
  );
  retry.type = "button";
  retry.hidden = true;
  titleWrap.append(title, badge, retry);
  const close = make("button", "flower__close", "×");
  close.type = "button";
  close.setAttribute("aria-label", tr("Fechar conversa", "Close chat"));
  header.append(face, titleWrap, close);
  const messages = make("div", "flower__messages");
  messages.setAttribute("role", "list");
  messages.setAttribute("aria-label", tr("Conversa", "Conversation"));
  addMessage(
    messages,
    "assistant",
    tr(
      "Oi! Sou a Flower. Posso ajudar com dúvidas frequentes sobre o portal.",
      "Hi! I’m Flower. I can help with common questions about the portal.",
    ),
  );
  const form = make("form", "flower__form");
  const input = make("textarea", "flower__input");
  input.name = "message";
  input.rows = 1;
  input.maxLength = 1500;
  input.setAttribute("aria-label", tr("Sua mensagem", "Your message"));
  input.placeholder = tr("Escreva uma mensagem…", "Write a message…");
  const send = make("button", "flower__send", tr("Enviar", "Send"));
  send.type = "submit";
  form.append(input, send);
  modal.append(header, messages, form);
  document.body.append(fab, modal);
  let online = false,
    loading = false,
    checking = false,
    lastStatusAt = 0,
    statusCheck = Promise.resolve(false),
    chat = [],
    restoreInert = [];
  let stopViewportTracking = () => {};
  const updateBadge = () => {
    badge.textContent = checking
      ? tr("Verificando conexão…", "Checking connection…")
      : statusCopy(online);
    badge.classList.toggle("flower__status--online", online);
    retry.hidden = online;
    retry.disabled = checking;
  };
  function atualizarStatus({ forcar = false } = {}) {
    if (checking) return statusCheck;
    if (!forcar && Date.now() - lastStatusAt < 30000)
      return Promise.resolve(online);
    checking = true;
    updateBadge();
    statusCheck = api("/api/flower/status", { prazoMs: 2500 })
      .then((s) => {
        online = !!s.online;
        return online;
      })
      .catch(() => {
        online = false;
        return false;
      })
      .finally(() => {
        lastStatusAt = Date.now();
        checking = false;
        updateBadge();
      });
    return statusCheck;
  }
  function isolarFundo() {
    restoreInert = [...document.body.children]
      .filter((el) => el !== modal)
      .map((el) => [el, el.inert]);
    for (const [el] of restoreInert) el.inert = true;
  }
  function liberarFundo() {
    for (const [el, inert] of restoreInert) el.inert = inert;
    restoreInert = [];
  }
  function acompanharTeclado() {
    const viewport = window.visualViewport;
    if (!viewport) return () => {};
    const atualizar = () => {
      const pequeno =
        viewport.height < 500 || viewport.height < window.innerHeight - 120;
      if (!pequeno) {
        delete modal.dataset.viewportAware;
        for (const nome of [
          "--flower-vv-top",
          "--flower-vv-left",
          "--flower-vv-height",
          "--flower-vv-width",
          "--flower-layout-height",
          "--flower-layout-width",
        ])
          modal.style.removeProperty(nome);
        return;
      }
      modal.dataset.viewportAware = "true";
      modal.style.setProperty("--flower-vv-top", `${viewport.offsetTop}px`);
      modal.style.setProperty("--flower-vv-left", `${viewport.offsetLeft}px`);
      modal.style.setProperty("--flower-vv-height", `${viewport.height}px`);
      modal.style.setProperty("--flower-vv-width", `${viewport.width}px`);
      modal.style.setProperty(
        "--flower-layout-height",
        `${window.innerHeight}px`,
      );
      modal.style.setProperty(
        "--flower-layout-width",
        `${window.innerWidth}px`,
      );
    };
    viewport.addEventListener("resize", atualizar);
    viewport.addEventListener("scroll", atualizar);
    window.addEventListener("resize", atualizar);
    atualizar();
    return () => {
      viewport.removeEventListener("resize", atualizar);
      viewport.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
      delete modal.dataset.viewportAware;
      for (const nome of [
        "--flower-vv-top",
        "--flower-vv-left",
        "--flower-vv-height",
        "--flower-vv-width",
        "--flower-layout-height",
        "--flower-layout-width",
      ])
        modal.style.removeProperty(nome);
    };
  }
  function open() {
    if (!modal.hidden) return;
    modal.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    isolarFundo();
    stopViewportTracking = acompanharTeclado();
    close.focus();
    void atualizarStatus({ forcar: true });
  }
  function shut() {
    if (modal.hidden) return;
    stopViewportTracking();
    stopViewportTracking = () => {};
    modal.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    liberarFundo();
    fab.focus();
  }
  fab.addEventListener("click", open);
  close.addEventListener("click", shut);
  retry.addEventListener("click", () => void atualizarStatus({ forcar: true }));
  window.addEventListener(
    "portal:flower-configurada",
    () => void atualizarStatus({ forcar: true }),
  );
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      shut();
      return;
    }
    if (e.key === "Tab") {
      const items = [
        ...modal.querySelectorAll(
          "button:not(:disabled):not([hidden]),textarea:not(:disabled)",
        ),
      ];
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0].focus();
      }
    }
  });
  modal.addEventListener("pointermove", (e) => {
    if (modal.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const rect = modal.querySelector(".flower__avatar").getBoundingClientRect();
    const vx = e.clientX - (rect.left + rect.width / 2),
      vy = e.clientY - (rect.top + rect.height / 2),
      magnitude = Math.hypot(vx, vy) || 1;
    const dx = (vx / magnitude) * 2.8,
      dy = (vy / magnitude) * 2.4;
    for (const id of ["flower-modal-left", "flower-modal-right"]) {
      const pupil = document.getElementById(id);
      if (pupil) pupil.style.transform = `translate(${dx}px,${dy}px)`;
    }
  });
  modal.addEventListener("pointerleave", () => {
    for (const eye of modal.querySelectorAll(".flower__pupil"))
      eye.style.transform = "";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || loading) return;
    input.value = "";
    addMessage(messages, "user", text);
    chat.push({ role: "user", content: text });
    while (chat.length > 30) chat.splice(0, 2);
    loading = true;
    modal.dataset.state = fab.dataset.state = "thinking";
    send.disabled = true;
    input.disabled = true;
    const typing = addMessage(
      messages,
      "assistant",
      tr("Pensando…", "Thinking…"),
    );
    try {
      await atualizarStatus();
      if (!online) throw Object.assign(new Error("offline"), { offline: true });
      const result = await api("/api/flower/chat", {
        metodo: "POST",
        dados: { messages: chat },
        prazoMs: 20000,
      });
      const reply = String(result.reply || "").trim() || msgOffline();
      typing.textContent = reply;
      chat.push({ role: "assistant", content: reply.slice(0, 1500) });
    } catch (error) {
      if (!error.offline) {
        online = false;
        lastStatusAt = Date.now();
        updateBadge();
      }
      const reply = respostaFAQ(text) || msgOffline();
      typing.textContent = reply;
      if (!error.offline) {
        const reason =
          {
            flower_credencial_invalida: tr(
              "A chave de IA foi recusada. A Flower continuará com respostas padrão; peça ao administrador para conferir a configuração.",
              "The AI key was rejected. Flower will use standard replies; ask the administrator to check the configuration.",
            ),
            flower_limite_provedor: tr(
              "O provedor atingiu um limite temporário. Sua mensagem não será reenviada automaticamente; tente conectar novamente mais tarde.",
              "The provider reached a temporary limit. Your message will not be resubmitted automatically; try connecting again later.",
            ),
            flower_tempo_esgotado: tr(
              "A IA demorou demais para responder. Sua mensagem não será reenviada automaticamente; tente conectar novamente.",
              "The AI took too long to respond. Your message will not be resubmitted automatically; try connecting again.",
            ),
            flower_config_provedor: tr(
              "A configuração da IA parece inválida. Peça ao administrador para conferir o provedor e o modelo.",
              "The AI configuration appears invalid. Ask the administrator to check the provider and model.",
            ),
            flower_provedor_indisponivel: tr(
              "O provedor de IA está indisponível. Sua mensagem não será reenviada automaticamente; tente conectar novamente.",
              "The AI provider is unavailable. Your message will not be resubmitted automatically; try connecting again.",
            ),
          }[error.message] ||
          tr(
            "A IA online não respondeu. Sua mensagem não será reenviada automaticamente; tente conectar novamente.",
            "The online AI did not respond. Your message will not be resubmitted automatically; try connecting again.",
          );
        typing.textContent += `\n\n${reason}`;
      }
      // Keep history local to this open page and discard the unsent turn after transport failure.
      chat = chat.filter(
        (item, index) => !(item.role === "user" && index === chat.length - 1),
      );
    } finally {
      loading = false;
      modal.dataset.state = fab.dataset.state = "idle";
      send.disabled = false;
      input.disabled = false;
      if (!modal.hidden) input.focus();
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

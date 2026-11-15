import { api } from "./api.js";
import { respostaFAQ } from "./flower-faq.js";
import { consultarCatalogo } from "./flower-catalogo.js";
import { consultarFAQ, topicosFAQ } from "./flower-conhecimento.js";
import { animarResposta } from "./flower-digitacao.js";
import { criarMovimentoFlower } from "./flower-movimento.js";
import { criarConvitesFlower } from "./flower-convite.js";

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
  const conteudo = make("span", "flower__message-text", text);
  row.append(conteudo);
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
  const face = make("button", "flower__avatar");
  face.type = "button";
  face.setAttribute(
    "aria-label",
    tr("Interagir com Flower pelo toque", "Interact with Flower by touch"),
  );
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
  const acoes = make("div", "flower__actions");
  const assuntos = make(
    "button",
    "flower__topics-toggle",
    tr("Explorar assuntos", "Browse topics"),
  );
  assuntos.type = "button";
  acoes.append(assuntos);
  const anuncio = make("p", "flower__sr");
  anuncio.setAttribute("role", "status");
  anuncio.setAttribute("aria-live", "polite");
  anuncio.setAttribute("aria-atomic", "true");
  modal.append(header, messages, acoes, form, anuncio);
  document.body.append(fab, modal);
  fab.dataset.state = modal.dataset.state = "idle";
  const movimento = criarMovimentoFlower({ fab, modal, avatar: face, input });
  let convite, escrita, ultimoTopico;
  const basePortal = new URL("../../", import.meta.url);
  function rolar() {
    messages.scrollTop = messages.scrollHeight;
  }
  function renderizarSugestoes(alvo, sugestoes) {
    if (!sugestoes?.length) return;
    const grupo = make("div", "flower__suggestions");
    grupo.setAttribute("role", "group");
    grupo.setAttribute(
      "aria-label",
      tr("Continuar a conversa", "Continue the conversation"),
    );
    for (const item of sugestoes.slice(0, 6)) {
      const botao = make("button", "flower__suggestion", item.rotulo);
      botao.type = "button";
      botao.dataset.faqId = item.id;
      botao.addEventListener("click", () =>
        enviar(item.pergunta || item.rotulo, { faqId: item.id }),
      );
      grupo.append(botao);
    }
    alvo.append(grupo);
  }
  function mostrarAssuntos() {
    const anterior = messages.querySelector(".flower__topics");
    anterior?.remove();
    const grupo = make("div", "flower__topics");
    grupo.append(
      make(
        "p",
        "flower__topics-title",
        tr("Sobre o que você precisa de ajuda?", "What do you need help with?"),
      ),
    );
    renderizarSugestoes(grupo, topicosFAQ);
    // A lista completa fica disponível, mesmo quando há mais de seis temas.
    const restante = topicosFAQ.slice(6);
    if (restante.length) renderizarSugestoes(grupo, restante);
    messages.append(grupo);
    rolar();
  }
  function renderizarLinks(alvo, links) {
    if (!links?.length) return;
    const grupo = make("div", "flower__tool-links");
    for (const item of links.slice(0, 4)) {
      let url;
      try {
        url = new URL(item.href, basePortal);
      } catch {
        continue;
      }
      if (
        url.origin !== basePortal.origin ||
        !url.pathname.startsWith(basePortal.pathname)
      )
        continue;
      const link = make("a", "flower__tool-link", item.rotulo);
      link.href = url.pathname + url.search + url.hash;
      grupo.append(link);
    }
    if (grupo.childElementCount) alvo.append(grupo);
  }
  async function exibirResposta(linha, texto, local) {
    const span = linha.querySelector(".flower__message-text");
    linha.setAttribute("aria-busy", "true");
    const fonte = make(
      "small",
      "flower__source",
      local
        ? tr("Resposta local · guia do portal", "Local reply · portal guide")
        : tr("IA online", "Online AI"),
    );
    const pular = make(
      "button",
      "flower__skip",
      tr("Mostrar resposta completa", "Show full reply"),
    );
    pular.type = "button";
    linha.append(fonte, pular);
    modal.dataset.state = fab.dataset.state = "speaking";
    anuncio.textContent = tr(
      "Flower está digitando a resposta.",
      "Flower is typing a reply.",
    );
    escrita = animarResposta({
      elemento: span,
      texto,
      visivel: () => !modal.hidden,
      aoAtualizar: (elemento) => {
        rolar();
        movimento.resposta(elemento);
      },
    });
    const atual = escrita;
    pular.addEventListener("click", atual.concluir);
    await atual.pronto;
    if (escrita === atual) escrita = null;
    const focado = document.activeElement === pular;
    pular.remove();
    linha.removeAttribute("aria-busy");
    anuncio.textContent = texto;
    if (focado && !modal.hidden) input.focus({ preventScroll: true });
  }
  assuntos.addEventListener("click", mostrarAssuntos);
  mostrarAssuntos();
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
    convite?.aberto();
    isolarFundo();
    movimento.abrir();
    stopViewportTracking = acompanharTeclado();
    close.focus();
    void atualizarStatus({ forcar: true });
  }
  function shut() {
    if (modal.hidden) return;
    escrita?.concluir();
    movimento.fechar();
    stopViewportTracking();
    stopViewportTracking = () => {};
    modal.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    liberarFundo();
    fab.focus();
  }
  convite = criarConvitesFlower({ fab, modal, abrir: open });
  window.addEventListener("portal:flower-abrir", open);
  window.addEventListener(
    "pagehide",
    () => {
      escrita?.concluir();
      movimento.destruir();
      convite.destruir();
      stopViewportTracking();
    },
    { once: true },
  );
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
  async function enviar(texto, { faqId } = {}) {
    const text = texto.trim();
    if (!text || loading) return;
    if (!faqId) input.value = "";
    messages.querySelector(".flower__topics")?.remove();
    for (const botao of messages.querySelectorAll(".flower__suggestion"))
      botao.disabled = true;
    addMessage(messages, "user", text);
    loading = true;
    if (document.activeElement === send) input.focus({ preventScroll: true });
    send.disabled = true;
    assuntos.disabled = true;
    modal.dataset.state = fab.dataset.state = "thinking";
    const typing = addMessage(
      messages,
      "assistant",
      tr("Pensando…", "Thinking…"),
    );
    const privado =
      /\b(ler|analisar|ver|consultar|abrir|acessar)\b.{0,45}\b(meu|minha|meus|minhas)\b.{0,35}\b(arquivo|pdf|foto|imagem|conta|dados|perfil|documento)\b/u.test(
        text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .toLowerCase(),
      );
    let resposta,
      local =
        (privado ? consultarFAQ("", { id: "privacidade-conta" }) : null) ||
        consultarFAQ(text, { topico: ultimoTopico, id: faqId }) ||
        consultarCatalogo(text, { topico: ultimoTopico, id: faqId }),
      contextoOnline = false;
    try {
      if (local) resposta = local.texto;
      else if (faqId)
        resposta = tr(
          "Escolha um assunto para continuar.",
          "Choose a topic to continue.",
        );
      else {
        await atualizarStatus();
        if (!online)
          throw Object.assign(new Error("offline"), { offline: true });
        chat.push({ role: "user", content: text });
        while (chat.length > 29) chat.splice(0, 2);
        contextoOnline = true;
        const result = await api("/api/flower/chat", {
          metodo: "POST",
          dados: { messages: chat },
          prazoMs: 20000,
        });
        resposta = String(result.reply || "").trim() || msgOffline();
        chat.push({ role: "assistant", content: resposta.slice(0, 1500) });
      }
    } catch (error) {
      if (contextoOnline && chat.at(-1)?.role === "user") chat.pop();
      if (!error.offline) {
        online = false;
        lastStatusAt = Date.now();
        updateBadge();
      }
      resposta = respostaFAQ(text) || msgOffline();
      if (!error.offline)
        resposta +=
          "\n\n" +
          tr(
            "A IA online não respondeu. Você pode tentar conectar novamente; sua mensagem não será reenviada automaticamente.",
            "Online AI did not respond. Try connecting again; your message will not be resubmitted automatically.",
          );
    }
    try {
      await exibirResposta(typing, resposta, !!local || !contextoOnline);
      if (local) {
        ultimoTopico = local.topico;
        renderizarLinks(typing, local.links);
        renderizarSugestoes(typing, local.sugestoes);
      } else if (!online) renderizarSugestoes(typing, topicosFAQ.slice(0, 4));
      rolar();
    } finally {
      loading = false;
      send.disabled = false;
      assuntos.disabled = false;
      modal.dataset.state = fab.dataset.state = "idle";
      movimento.concluir();
    }
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void enviar(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

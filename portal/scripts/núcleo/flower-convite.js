/** Convites locais sem roubar foco, com intervalo e descarte persistentes nesta aba. */
export function criarConvitesFlower({ fab, modal, abrir }) {
  const en = document.documentElement.lang?.startsWith("en");
  const storageKey = "flower.convites.sessao";
  let ultimaInteracao = -Infinity;
  let memoria = { exibidos: 0, proximo: 0 },
    timer,
    esconder,
    destruido = false;
  const ler = () => {
    try {
      const dado = JSON.parse(sessionStorage.getItem(storageKey));
      if (
        Number.isInteger(dado?.exibidos) &&
        dado.exibidos >= 0 &&
        Number.isFinite(dado.proximo)
      )
        memoria = dado;
    } catch {
      /* navegação privada: preferências apenas em memória */
    }
    return memoria;
  };
  const salvar = (dado) => {
    memoria = dado;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(dado));
    } catch {
      /* memória local */
    }
  };
  const balao = document.createElement("aside");
  balao.className = "flower__invite";
  balao.hidden = true;
  const convite = document.createElement("button");
  convite.type = "button";
  convite.className = "flower__invite-open";
  convite.textContent = en
    ? "Hi! I’m Flower. Need help finding a tool?"
    : "Oi! Sou a Flower. Quer ajuda para escolher uma ferramenta?";
  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "flower__invite-close";
  fechar.textContent = "×";
  fechar.setAttribute(
    "aria-label",
    en ? "Dismiss Flower invitation" : "Dispensar convite da Flower",
  );
  balao.append(convite, fechar);
  document.body.append(balao);
  function ocultar() {
    balao.hidden = true;
    clearTimeout(esconder);
  }
  function adiar(ms) {
    const estado = ler();
    salvar({ ...estado, proximo: Date.now() + ms });
    ocultar();
    agendar();
  }
  function agendar() {
    clearTimeout(timer);
    const estado = ler();
    if (destruido || estado.exibidos >= 3) return;
    timer = setTimeout(tentar, Math.max(3000, estado.proximo - Date.now()));
  }
  function tentar() {
    const estado = ler();
    if (destruido || estado.exibidos >= 3) return;
    if (
      document.hidden ||
      Date.now() - ultimaInteracao < 4000 ||
      document.activeElement?.matches(
        "input,textarea,select,[contenteditable=true]",
      ) ||
      !modal.hidden ||
      fab.inert ||
      fab.closest("[inert]") ||
      [
        ...document.querySelectorAll(
          'dialog[open], [aria-modal="true"]:not([hidden])',
        ),
      ].some((el) => el.getClientRects().length > 0)
    ) {
      timer = setTimeout(tentar, 5000);
      return;
    }
    if (Date.now() < estado.proximo) return agendar();
    const ret = fab.getBoundingClientRect();
    balao.style.setProperty(
      "--flower-invite-bottom",
      `${innerHeight - ret.bottom + 4}px`,
    );
    balao.style.setProperty(
      "--flower-invite-right",
      `${innerWidth - ret.left + 10}px`,
    );
    balao.hidden = false;
    salvar({ exibidos: estado.exibidos + 1, proximo: Date.now() + 180000 });
    esconder = setTimeout(ocultar, 14000);
    agendar();
  }
  fechar.addEventListener("click", () => adiar(20 * 60000));
  convite.addEventListener("click", () => {
    adiar(180000);
    abrir();
  });
  const visibilidade = () => {
    if (document.hidden) {
      clearTimeout(timer);
      ocultar();
    } else agendar();
  };
  document.addEventListener("visibilitychange", visibilidade);
  const interagir = (evento) => {
    ultimaInteracao = Date.now();
    if (!balao.contains(evento.target)) ocultar();
  };
  document.addEventListener("pointerdown", interagir, { passive: true });
  document.addEventListener("keydown", interagir);
  agendar();
  return {
    aberto() {
      adiar(180000);
    },
    destruir() {
      destruido = true;
      clearTimeout(timer);
      clearTimeout(esconder);
      document.removeEventListener("visibilitychange", visibilidade);
      document.removeEventListener("pointerdown", interagir);
      document.removeEventListener("keydown", interagir);
      balao.remove();
    },
  };
}

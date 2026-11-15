/** Olhar com prioridades: toque, caret, texto da resposta e repouso. Sem laço ocioso de RAF. */
export function criarMovimentoFlower({ fab, modal, avatar, input }) {
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)");
  const olhos = [
    ...fab.querySelectorAll(".flower__pupil"),
    ...avatar.querySelectorAll(".flower__pupil"),
  ];
  const remover = [];
  let timer,
    reacao,
    frame,
    ultimaAcao = performance.now(),
    ultimaTecla = -Infinity;
  let toqueAte = 0,
    aberto = false,
    destruido = false,
    espelho;
  const ouvir = (alvo, evento, fn, opcoes) => {
    alvo.addEventListener(evento, fn, opcoes);
    remover.push(() => alvo.removeEventListener(evento, fn, opcoes));
  };
  function mover(dx, dy, modo) {
    if (destruido || document.hidden || reduzir.matches) return;
    fab.dataset.gaze = modal.dataset.gaze = modo;
    for (const olho of olhos)
      olho.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`;
  }
  function centro() {
    fab.dataset.gaze = modal.dataset.gaze = "idle";
    for (const olho of olhos) olho.style.transform = "";
  }
  function mirar(x, y, modo) {
    const rosto = (aberto ? avatar : fab).getBoundingClientRect();
    const quadro = aberto
      ? modal.getBoundingClientRect()
      : { width: 320, height: 400 };
    mover(
      Math.tanh((x - rosto.left - rosto.width / 2) / (quadro.width * 0.34)) *
        5.5,
      Math.tanh(
        (y - rosto.top - rosto.height * 0.45) / (quadro.height * 0.24),
      ) * 4,
      modo,
    );
  }
  function agendar() {
    clearTimeout(timer);
    if (destruido || document.hidden || reduzir.matches) return;
    timer = setTimeout(
      () => {
        if (
          performance.now() - ultimaAcao >= 3000 &&
          modal.dataset.state !== "speaking" &&
          modal.dataset.state !== "thinking"
        ) {
          mover(
            (Math.random() * 2 - 1) * 5,
            (Math.random() * 2 - 1) * 3.8,
            "idle",
          );
        }
        agendar();
      },
      3200 + Math.random() * 1400,
    );
  }
  function caret() {
    const ret = input.getBoundingClientRect();
    if (!ret.width) return null;
    espelho ??= document.createElement("div");
    espelho.className = "flower__caret-mirror";
    espelho.setAttribute("aria-hidden", "true");
    if (!espelho.isConnected) document.body.append(espelho);
    const css = getComputedStyle(input);
    for (const propriedade of [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "letterSpacing",
      "lineHeight",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "boxSizing",
      "textAlign",
      "direction",
      "tabSize",
    ])
      espelho.style[propriedade] = css[propriedade];
    espelho.style.width = `${ret.width}px`;
    espelho.textContent = input.value.slice(
      0,
      input.selectionEnd ?? input.value.length,
    );
    const marcador = document.createElement("span");
    marcador.textContent = "\u200b";
    espelho.append(marcador);
    const local = marcador.getBoundingClientRect(),
      origem = espelho.getBoundingClientRect();
    return {
      x: Math.min(
        ret.right - 8,
        Math.max(
          ret.left + 8,
          ret.left + local.left - origem.left - input.scrollLeft,
        ),
      ),
      y: Math.min(
        ret.bottom - 6,
        Math.max(
          ret.top + 6,
          ret.top + local.top - origem.top - input.scrollTop + local.height / 2,
        ),
      ),
    };
  }
  function digitando() {
    if (!aberto || document.activeElement !== input) return;
    ultimaAcao = ultimaTecla = performance.now();
    toqueAte = 0;
    const posicao = caret();
    if (posicao) mirar(posicao.x, posicao.y, "typing");
  }
  function seguirPonteiro(e) {
    if (
      !aberto ||
      performance.now() - ultimaTecla < 700 ||
      performance.now() < toqueAte
    )
      return;
    ultimaAcao = performance.now();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() =>
      mirar(
        e.clientX,
        e.clientY,
        e.pointerType === "touch" ? "touch" : "pointer",
      ),
    );
  }
  function toque(e) {
    ultimaAcao = performance.now();
    toqueAte = ultimaAcao + 650;
    const ret = (aberto ? avatar : fab).getBoundingClientRect();
    if (
      e?.pointerType === "touch" &&
      !e.target.closest(".flower__avatar,.flower__fab")
    )
      mirar(e.clientX, e.clientY, "touch");
    else mover(4.5, -2.5, "touch");
    const alvo = aberto ? avatar : fab;
    delete alvo.dataset.reaction;
    void alvo.getBoundingClientRect();
    alvo.dataset.reaction = "touch";
    clearTimeout(reacao);
    reacao = setTimeout(() => {
      delete avatar.dataset.reaction;
      delete fab.dataset.reaction;
    }, 750);
  }
  for (const evento of [
    "input",
    "select",
    "focus",
    "keyup",
    "click",
    "scroll",
    "compositionend",
  ])
    ouvir(input, evento, digitando);
  ouvir(document, "selectionchange", () => {
    if (document.activeElement === input) digitando();
  });
  ouvir(modal, "pointermove", seguirPonteiro, { passive: true });
  ouvir(
    modal,
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch") toque(e);
    },
    { passive: true },
  );
  ouvir(avatar, "click", (e) => {
    if (!e.detail || e.pointerType !== "touch") toque(e);
  });
  ouvir(
    fab,
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch") toque(e);
    },
    { passive: true },
  );
  ouvir(modal, "pointerleave", () => {
    if (!["typing", "reply", "touch"].includes(modal.dataset.gaze)) centro();
  });
  ouvir(document, "visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    } else agendar();
  });
  ouvir(reduzir, "change", () => {
    centro();
    agendar();
  });
  centro();
  agendar();
  return {
    abrir() {
      aberto = true;
      centro();
      ultimaAcao = performance.now();
      agendar();
    },
    fechar() {
      aberto = false;
      ultimaAcao = performance.now();
      centro();
      agendar();
    },
    concluir() {
      centro();
      ultimaAcao = performance.now();
    },
    resposta(elemento) {
      if (
        !aberto ||
        performance.now() - ultimaTecla < 500 ||
        performance.now() < toqueAte
      )
        return;
      const texto = elemento.firstChild;
      if (!texto?.textContent) return;
      const intervalo = document.createRange();
      intervalo.setStart(texto, Math.max(0, texto.textContent.length - 1));
      intervalo.setEnd(texto, texto.textContent.length);
      const rect = intervalo.getBoundingClientRect();
      ultimaAcao = performance.now();
      mirar(rect.right, rect.top + rect.height / 2, "reply");
    },
    destruir() {
      destruido = true;
      clearTimeout(timer);
      clearTimeout(reacao);
      cancelAnimationFrame(frame);
      remover.forEach((fn) => fn());
      espelho?.remove();
    },
  };
}

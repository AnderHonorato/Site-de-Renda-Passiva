/** Texto incremental em grafemas, com conclusão imediata ao reduzir movimento. */
export function animarResposta({
  elemento,
  texto,
  aoAtualizar,
  visivel = () => true,
}) {
  const partes =
    typeof Intl.Segmenter === "function"
      ? [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            texto,
          ),
        ].map((p) => p.segment)
      : Array.from(texto);
  const movimento = matchMedia("(prefers-reduced-motion: reduce)");
  const duracao = Math.min(6000, Math.max(320, partes.length * 17));
  let frame = 0,
    inicio,
    quantidade = 0,
    finalizado = false,
    resolver;
  const pronto = new Promise((resolve) => {
    resolver = resolve;
  });
  const concluir = () => {
    if (finalizado) return;
    finalizado = true;
    cancelAnimationFrame(frame);
    elemento.textContent = texto;
    delete elemento.dataset.typing;
    movimento.removeEventListener("change", verificar);
    document.removeEventListener("visibilitychange", verificar);
    aoAtualizar?.(elemento);
    resolver();
  };
  function verificar() {
    if (movimento.matches || document.hidden || !visivel()) concluir();
  }
  function avancar(agora) {
    if (finalizado) return;
    if (movimento.matches || document.hidden || !visivel()) return concluir();
    inicio ??= agora;
    const proxima = Math.min(
      partes.length,
      1 + Math.floor(((agora - inicio) / duracao) * partes.length),
    );
    if (proxima !== quantidade) {
      quantidade = proxima;
      elemento.textContent = partes.slice(0, quantidade).join("");
      aoAtualizar?.(elemento);
    }
    if (quantidade >= partes.length) concluir();
    else frame = requestAnimationFrame(avancar);
  }
  elemento.textContent = "";
  elemento.dataset.typing = "true";
  movimento.addEventListener("change", verificar);
  document.addEventListener("visibilitychange", verificar);
  if (movimento.matches || document.hidden || !visivel()) concluir();
  else frame = requestAnimationFrame(avancar);
  return { pronto, concluir };
}

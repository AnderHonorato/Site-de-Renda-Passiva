// contador-de-texto-calculo.js — contagens de texto (contrato §13.4). Função pura, sem DOM.
// Usa Intl.Segmenter para contar do jeito que a pessoa lê: acento, emoji e pontuação incluídos.

const PALAVRAS_POR_MINUTO_LEITURA = 200;
const PALAVRAS_POR_MINUTO_FALA = 130;

function contarSegmentos(texto, granularidade, idioma, filtro) {
  if (typeof Intl?.Segmenter !== 'function') return null;
  const segmentador = new Intl.Segmenter(idioma, { granularity: granularidade });
  let total = 0;
  for (const segmento of segmentador.segment(texto)) {
    if (!filtro || filtro(segmento)) total++;
  }
  return total;
}

/** Reserva para navegador sem Intl.Segmenter: conta por expressão regular. */
function contagemDeReserva(texto) {
  return {
    caracteres: [...texto].length,
    palavras: (texto.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length,
    frases: (texto.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? []).filter((f) => f.trim()).length,
  };
}

export function contarTexto(texto = '', idioma = 'pt-BR') {
  const conteudo = String(texto);
  const reserva = contagemDeReserva(conteudo);

  const caracteres = contarSegmentos(conteudo, 'grapheme', idioma) ?? reserva.caracteres;
  const caracteresSemEspaco = [...conteudo.replace(/\s/gu, '')].length;
  const palavras = contarSegmentos(conteudo, 'word', idioma, (segmento) => segmento.isWordLike) ?? reserva.palavras;
  const frases = contarSegmentos(conteudo, 'sentence', idioma, (segmento) => segmento.segment.trim().length > 0) ?? reserva.frases;

  const paragrafos = conteudo
    .split(/\n\s*\n/)
    .filter((bloco) => bloco.trim().length > 0).length;
  const linhas = conteudo.length === 0 ? 0 : conteudo.split(/\r\n|\r|\n/).length;

  return {
    ok: true,
    caracteres,
    caracteresSemEspaco,
    palavras,
    frases,
    paragrafos,
    linhas,
    segundosDeLeitura: Math.round((palavras / PALAVRAS_POR_MINUTO_LEITURA) * 60),
    segundosDeFala: Math.round((palavras / PALAVRAS_POR_MINUTO_FALA) * 60),
    mediaPalavrasPorFrase: frases ? Math.round((palavras / frases) * 10) / 10 : 0,
  };
}

/** "3:05" a partir de segundos; menos de um minuto vira "0:12". */
export function formatarDuracao(segundos) {
  const inteiros = Math.max(0, Math.round(segundos));
  const minutos = Math.floor(inteiros / 60);
  const resto = String(inteiros % 60).padStart(2, '0');
  return `${minutos}:${resto}`;
}

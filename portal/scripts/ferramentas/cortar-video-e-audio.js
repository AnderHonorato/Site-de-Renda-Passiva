/** Editor local de vídeo e áudio. O FFmpeg é carregado sob demanda pelo helper compartilhado. */
import {
  montarFerramenta,
  ErroDeEntrada,
  baixar,
  número as lerNúmero,
} from "../núcleo/montador.js";
import { criarProgresso } from "../núcleo/interface.js";

export const LIMITES_MIDIA = Object.freeze({
  bytes: 60 * 1024 * 1024,
  duraçãoSegundos: 180,
  orçamentoMs: 120_000,
});
export const EXTENSÕES_ACEITAS = Object.freeze([
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "mp3",
  "wav",
  "m4a",
  "ogg",
  "flac",
  "aac",
]);
const EXTENSÕES_SÓ_ÁUDIO = new Set(["mp3", "wav", "m4a", "ogg", "flac", "aac"]);

const CSS_HREF = new URL("../../estilos/editor-video.css", import.meta.url)
  .href;
const MIME_SAÍDA = {
  mp4: "video/mp4",
  webm: "video/webm",
  gif: "image/gif",
  wav: "audio/wav",
};
const FONTE_CANVAS = {
  sans: "Arial, sans-serif",
  serif: "Georgia, serif",
  mono: "monospace",
};
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export function validarArquivoVideo(arquivo) {
  if (
    !arquivo ||
    typeof arquivo.name !== "string" ||
    !Number.isFinite(arquivo.size)
  )
    throw new Error("Escolha um arquivo de vídeo ou áudio.");
  const ext = arquivo.name.split(".").at(-1).toLowerCase();
  if (!EXTENSÕES_ACEITAS.includes(ext))
    throw new Error(
      "Use MP4, WebM, MOV, MKV, AVI, MP3, WAV, M4A, OGG, FLAC ou AAC.",
    );
  if (arquivo.size < 1) throw new Error("O arquivo está vazio.");
  if (arquivo.size > LIMITES_MIDIA.bytes)
    throw new Error(
      "O limite é 60 MB por arquivo para preservar a memória do aparelho.",
    );
  return ext;
}
export const éSóÁudio = (nome) =>
  EXTENSÕES_SÓ_ÁUDIO.has(String(nome).split(".").at(-1)?.toLowerCase());

export function validarAjustes(
  dados,
  duração = undefined,
  dimensões = undefined,
) {
  const iniciar = número(dados, "início", 0, LIMITES_MIDIA.duraçãoSegundos);
  const terminar =
    dados.fim === "" || dados.fim == null
      ? (duração ?? LIMITES_MIDIA.duraçãoSegundos)
      : número(dados, "fim", 0, LIMITES_MIDIA.duraçãoSegundos);
  if (terminar <= iniciar)
    throw new Error("O fim do recorte precisa ser depois do início.");
  if (duração != null && terminar > duração + 0.05)
    throw new Error(
      `O fim do recorte passa da duração do arquivo (${formatarTempo(duração)}).`,
    );
  const crop = {
    x: número(dados, "corteX", 0, 100),
    y: número(dados, "corteY", 0, 100),
    largura: número(dados, "corteLargura", 1, 100),
    altura: número(dados, "corteAltura", 1, 100),
  };
  if (crop.x + crop.largura > 100 || crop.y + crop.altura > 100)
    throw new Error("O retângulo de corte precisa ficar dentro do quadro.");
  const velocidade = número(dados, "velocidade", 0.5, 2);
  const volume = número(dados, "volume", 0, 200);
  const largura =
    dados.tamanho === "custom"
      ? número(dados, "larguraCustom", 64, 1920, true)
      : { original: 0, 720: 1280, 1080: 1920 }[dados.tamanho];
  const altura =
    dados.tamanho === "custom"
      ? número(dados, "alturaCustom", 64, 1080, true)
      : { original: 0, 720: 720, 1080: 1080 }[dados.tamanho];
  if (largura === undefined || altura === undefined)
    throw new Error("Escolha um tamanho de saída válido.");
  if ((largura && largura % 2) || (altura && altura % 2))
    throw new Error(
      "As dimensões personalizadas precisam ser pares para os codecs de vídeo.",
    );
  const formato = dados.formato;
  if (!Object.hasOwn(MIME_SAÍDA, formato))
    throw new Error("Escolha um formato de saída válido.");
  if (formato === "wav" && dados.mudo === "sim")
    throw new Error("WAV precisa de áudio; desmarque “Sem áudio”.");
  if (formato === "wav" && dados.texto?.trim())
    throw new Error("Texto sobreposto só se aplica a vídeo, GIF ou WebM/MP4.");
  const texto = String(dados.texto ?? "").trim();
  if (texto.length > 120)
    throw new Error("O texto sobreposto pode ter até 120 caracteres.");
  const fadeIn = número(dados, "fadeIn", 0, 10);
  const fadeOut = número(dados, "fadeOut", 0, 10);
  if (fadeIn + fadeOut > (terminar - iniciar) / velocidade)
    throw new Error("A soma dos fades não pode passar da duração final, depois de ajustar a velocidade.");
  const rotation = dados.giro;
  if (!["0", "90", "180", "270"].includes(rotation))
    throw new Error("Ângulo de rotação inválido.");
  if (
    ![
      "inferior-esquerda",
      "inferior-centro",
      "inferior-direita",
      "superior-centro",
      "centro",
    ].includes(dados.posiçãoTexto)
  )
    throw new Error("Escolha uma posição válida para o texto.");
  const entradaDim = dimensões ?? { largura: 1920, altura: 1080 };
  return {
    início: iniciar,
    fim: terminar,
    duração: terminar - iniciar,
    crop,
    cropPixels: {
      x: evenPixel((entradaDim.largura * crop.x) / 100),
      y: evenPixel((entradaDim.altura * crop.y) / 100),
      largura: Math.max(
        2,
        evenPixel((entradaDim.largura * crop.largura) / 100),
      ),
      altura: Math.max(2, evenPixel((entradaDim.altura * crop.altura) / 100)),
    },
    velocidade,
    volume,
    largura,
    altura,
    formato,
    giro: Number(rotation),
    espelho: dados.espelho,
    mudo: dados.mudo === "sim",
    fadeIn,
    fadeOut,
    texto,
    fonte: FONTE_CANVAS[dados.fonte] ?? FONTE_CANVAS.sans,
    posiçãoTexto: dados.posiçãoTexto,
  };
}

function número(dados, chave, mínimo, máximo, inteiro = false) {
  const valor = Number(String(dados[chave] ?? "").replace(",", "."));
  if (!Number.isFinite(valor) || String(dados[chave] ?? "").trim() === "")
    throw new Error(`Preencha o campo “${chave}” com um número.`);
  if (inteiro && !Number.isInteger(valor))
    throw new Error(`“${chave}” precisa ser inteiro.`);
  if (valor < mínimo || valor > máximo)
    throw new Error(`“${chave}” precisa estar entre ${mínimo} e ${máximo}.`);
  return valor;
}
const evenPixel = (value) => Math.max(0, Math.floor(Math.round(value) / 2) * 2);

export function formatarTempo(segundos) {
  if (!Number.isFinite(segundos)) return "—";
  const min = Math.floor(segundos / 60),
    seg = Math.floor(segundos % 60),
    cent = Math.floor((segundos % 1) * 100);
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}.${String(cent).padStart(2, "0")}`;
}

const escapeFiltro = (texto) =>
  String(texto)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");

export function construirArgumentos(config, nomeEntrada, nomeSaída) {
  const {
    início,
    duração,
    cropPixels,
    largura,
    altura,
    giro,
    espelho,
    velocidade,
    formato,
    texto,
    fonte,
    posiçãoTexto,
    fadeIn,
    fadeOut,
  } = config;
  const video = [];
  if (formato !== "wav") {
    video.push(
      `crop=${cropPixels.largura}:${cropPixels.altura}:${cropPixels.x}:${cropPixels.y}`,
    );
    if (giro === 90) video.push("transpose=clock");
    if (giro === 180) video.push("hflip", "vflip");
    if (giro === 270) video.push("transpose=cclock");
    if (espelho === "horizontal") video.push("hflip");
    if (espelho === "vertical") video.push("vflip");
    if (largura && altura)
      video.push(
        `scale=${largura}:${altura}:force_original_aspect_ratio=decrease,pad=${largura}:${altura}:(ow-iw)/2:(oh-ih)/2`,
      );
    if (velocidade !== 1) video.push(`setpts=PTS/${velocidade}`);
    if (fadeIn) video.push(`fade=t=in:st=0:d=${fadeIn}`);
    if (fadeOut)
      video.push(
        `fade=t=out:st=${Math.max(0, duração / velocidade - fadeOut)}:d=${fadeOut}`,
      );
  }
  // -t fica como opção de entrada ao lado de -ss. Se viesse depois de -i, seria
  // um limite de saída e a velocidade 2× poderia ler material além do recorte.
  const args = [
    "-ss",
    String(início),
    "-t",
    String(duração),
    "-i",
    nomeEntrada,
    "-map_metadata",
    "-1",
  ];
  if (config.overlay) args.push("-i", config.overlay.nome);
  if (formato === "gif") {
    const filters = [...video, "fps=12", "scale=640:-2:flags=lanczos"].join(
      ",",
    );
    const overlay = config.overlay
      ? ";[v][1:v]overlay=0:0[o];[o]split[a][b];[a]palettegen[p];[b][p]paletteuse"
      : ",split[a][b];[a]palettegen[p];[b][p]paletteuse";
    args.push(
      "-filter_complex",
      config.overlay
        ? `[0:v]${filters}[v]${overlay}`
        : `[0:v]${filters}${overlay}`,
      "-an",
      "-loop",
      "0",
    );
  } else if (formato === "wav") {
    const audio = audioFilters(config);
    args.push("-vn", ...audio, "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2");
  } else {
    if (config.mudo) args.push("-an");
    else args.push(...audioFilters(config));
    if (video.length || config.overlay) {
      if (config.overlay)
        args.push(
          "-filter_complex",
          `[0:v]${video.join(",") || "null"}[v];[v][1:v]overlay=0:0`,
        );
      else args.push("-vf", video.join(","));
    }
    if (formato === "mp4")
      args.push(
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        ...(config.mudo ? [] : ["-c:a", "aac", "-b:a", "128k"]),
        "-movflags",
        "+faststart",
      );
    if (formato === "webm")
      args.push(
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-cpu-used",
        "5",
        ...(config.mudo ? [] : ["-c:a", "libvorbis", "-b:a", "128k"]),
      );
  }
  args.push("-y", nomeSaída);
  return args;
}

function audioFilters(config) {
  const filters = [];
  if (config.velocidade !== 1) {
    let speed = config.velocidade;
    while (speed < 0.5) {
      filters.push("atempo=0.5");
      speed /= 0.5;
    }
    while (speed > 2) {
      filters.push("atempo=2");
      speed /= 2;
    }
    filters.push(`atempo=${speed}`);
  }
  if (config.volume !== 100 || config.fadeIn || config.fadeOut) {
    filters.push(`volume=${config.volume / 100}`);
    if (config.fadeIn) filters.push(`afade=t=in:st=0:d=${config.fadeIn}`);
    if (config.fadeOut)
      filters.push(
        `afade=t=out:st=${Math.max(0, config.duração / config.velocidade - config.fadeOut)}:d=${config.fadeOut}`,
      );
  }
  return filters.length ? ["-af", filters.join(",")] : [];
}

async function criarSobreposição(config, dimensão) {
  if (!config.texto) return null;
  const canvas = document.createElement("canvas");
  canvas.width = dimensão.largura;
  canvas.height = dimensão.altura;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error("O navegador não conseguiu criar a camada de texto.");
  const tamanho = Math.max(16, Math.round(canvas.height / 18));
  ctx.font = `700 ${tamanho}px ${config.fonte}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const linhas = config.texto.split("\n").slice(0, 3),
    alturaTexto = tamanho * 1.3 * linhas.length,
    larguraTexto = Math.min(
      canvas.width - 32,
      Math.max(...linhas.map((linha) => ctx.measureText(linha).width)) + 28,
    );
  const x = {
    "inferior-esquerda": 16,
    "inferior-centro": (canvas.width - larguraTexto) / 2,
    "inferior-direita": canvas.width - larguraTexto - 16,
    "superior-centro": (canvas.width - larguraTexto) / 2,
    centro: (canvas.width - larguraTexto) / 2,
  }[config.posiçãoTexto];
  const y = config.posiçãoTexto.startsWith("inferior")
    ? canvas.height - alturaTexto - 16
    : config.posiçãoTexto === "superior-centro"
      ? 16
      : (canvas.height - alturaTexto) / 2;
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(x, y, larguraTexto, alturaTexto);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 2;
  linhas.forEach((linha, i) =>
    ctx.fillText(
      linha,
      x + larguraTexto / 2,
      y + tamanho * (0.65 + 1.3 * i),
      larguraTexto - 12,
    ),
  );
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob)
    throw new Error("O navegador não conseguiu criar a camada de texto.");
  return {
    nome: "sobreposicao.png",
    bytes: new Uint8Array(await blob.arrayBuffer()),
  };
}

function carregarEstilos() {
  if (
    [...document.querySelectorAll('link[rel="stylesheet"]')].some(
      (link) => link.href === CSS_HREF,
    )
  )
    return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = CSS_HREF;
  link.dataset.editorVideo = "sim";
  document.head.append(link);
}

function nomeSaída(nome, formato) {
  return `${nome.replace(/\.[^.]+$/, "")}-editado.${formato === "wav" ? "wav" : formato}`;
}

async function medirSaída(blob, formato) {
  if (formato === "gif") {
    const imagem = new Image();
    const url = URL.createObjectURL(blob);
    try {
      const carregou = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 2500);
        imagem.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        imagem.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        imagem.src = url;
      });
      return carregou
        ? {
            largura: imagem.naturalWidth,
            altura: imagem.naturalHeight,
            duração: null,
          }
        : null;
    } finally {
      URL.revokeObjectURL(url);
      imagem.removeAttribute("src");
    }
  }
  const player =
    formato === "wav"
      ? document.createElement("audio")
      : document.createElement("video");
  const url = URL.createObjectURL(blob);
  player.preload = "metadata";
  try {
    return await new Promise((resolve) => {
      const terminar = (valor) => {
        clearTimeout(timer);
        player.removeAttribute("src");
        player.load();
        resolve(valor);
      };
      const timer = setTimeout(() => terminar(null), 4000);
      player.onloadedmetadata = () =>
        terminar({
          largura: player.videoWidth || null,
          altura: player.videoHeight || null,
          duração: Number.isFinite(player.duration) ? player.duration : null,
        });
      player.onerror = () => terminar(null);
      player.src = url;
      player.load();
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function criarPréviaDaSaída(raiz, blob, formato, nome, medidas, apagarURL) {
  const resultado = raiz.querySelector("#resultado");
  const painel = document.createElement("section");
  painel.className = "editor-video__resultado";
  const título = document.createElement("h3");
  título.textContent = `Prévia exportada · ${nome}`;
  const mídia = document.createElement(
    formato === "wav" ? "audio" : formato === "gif" ? "img" : "video",
  );
  mídia.className = "editor-video__arquivo";
  if (formato !== "gif") mídia.controls = true;
  else mídia.alt = `Prévia do GIF exportado: ${nome}`;
  mídia.preload = "metadata";
  const url = URL.createObjectURL(blob);
  mídia.src = url;
  apagarURL(url);
  const informação = document.createElement("p");
  informação.className = "editor-video__nota";
  informação.setAttribute("role", "status");
  const tamanho = `${blob.size.toLocaleString("pt-BR")} bytes`;
  const descrever = () => {
    if (formato === "gif")
      informação.textContent = `${medidas?.largura ?? mídia.naturalWidth} × ${medidas?.altura ?? mídia.naturalHeight} px · ${tamanho} · duração não medida para GIF.`;
    else {
      const duracao = Number.isFinite(mídia.duration)
        ? mídia.duration
        : medidas?.duração;
      const dimensões = mídia.videoWidth
        ? ` · ${mídia.videoWidth} × ${mídia.videoHeight} px`
        : medidas?.largura
          ? ` · ${medidas.largura} × ${medidas.altura} px`
          : "";
      informação.textContent = `${duracao != null ? `${formatarTempo(duracao)}${dimensões}` : "Prévia indisponível; duração do arquivo não medida"} · ${tamanho}`;
    }
  };
  mídia.addEventListener(
    formato === "gif" ? "load" : "loadedmetadata",
    descrever,
    { once: true },
  );
  mídia.addEventListener(
    "error",
    () => {
      informação.textContent = `O navegador não abriu a prévia deste arquivo. ${tamanho} · use o botão de download.`;
    },
    { once: true },
  );
  painel.append(título, mídia, informação);
  resultado.prepend(painel);
  descrever();
  return painel;
}

export default {
  instruções: {
    passos: [
      "Escolha um vídeo MP4, WebM, MOV, MKV ou AVI, ou um áudio MP3, WAV, M4A, OGG, FLAC ou AAC, de até 60 MB. A prévia e a conversão rodam no navegador; o arquivo não é enviado.",
      "Marque o trecho, o corte do quadro, rotação, tamanho, velocidade e áudio. Você pode colocar texto em uma das posições disponíveis.",
      "Escolha MP4, WebM, GIF ou WAV e toque em “Exportar mídia”. A primeira conversão baixa o FFmpeg local quando necessário e pode levar alguns segundos.",
    ],
    exemplo: {
      texto:
        "Um clipe de 35 segundos pode ser reduzido aos 12 segundos centrais, cortado para 1280 × 720, acelerado a 1,25× e exportado em MP4.",
    },
    limites:
      "Vídeos MP4, WebM, MOV, MKV ou AVI e áudios MP3, WAV, M4A, OGG, FLAC ou AAC, até 60 MB e 3 minutos. Arquivo só de áudio pode ser exportado em WAV. Vídeo MP4, WebM e GIF depende dos codecs presentes no FFmpeg deste portal; a ferramenta informa a falha se o codec necessário não estiver disponível. A camada de texto é desenhada no navegador, sem depender de fontes do FFmpeg. A prévia usa os codecs que o navegador consegue decodificar; se o navegador não reconhecer o codec, a conversão ainda pode funcionar pelo FFmpeg.",
    perguntas: [
      {
        p: "Meu arquivo é enviado?",
        r: "Não. O processamento ocorre no seu navegador, usando os arquivos locais e o FFmpeg servido pelo próprio portal.",
      },
      {
        p: "Por que a prévia não aparece?",
        r: "O navegador pode não decodificar o codec do vídeo. Isso não impede a tentativa de conversão pelo FFmpeg; a tela informa se o processamento concluir.",
      },
      {
        p: "O que acontece se faltar um codec?",
        r: "A ferramenta informa que a configuração do FFmpeg não consegue gerar aquele formato. Ela não troca silenciosamente o formato do arquivo.",
      },
    ],
  },
  montar(raiz, ferramenta) {
    let progresso;
    let video;
    let urlOrigem = null;
    let controlador = null;
    let info;
    let quadro;
    let urlResultado = null;
    let painelResultado = null;
    let previaPendente = null;
    const limparPréviaResultado = () => {
      if (urlResultado) {
        URL.revokeObjectURL(urlResultado);
        urlResultado = null;
      }
      painelResultado?.remove();
      painelResultado = null;
      previaPendente = null;
    };
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: "Exportar mídia",
      demorada: true,
      campos: [
        {
          nome: "arquivo",
          rótulo: "Vídeo ou áudio",
          tipo: "file",
          dica: "Vídeo MP4/WebM/MOV/MKV/AVI ou áudio MP3/WAV/M4A/OGG/FLAC/AAC · até 60 MB.",
        },
        {
          nome: "início",
          rótulo: "Início do trecho (segundos)",
          tipo: "número",
          padrão: "0",
          dica: "Segundos a partir do começo do arquivo.",
        },
        {
          nome: "fim",
          rótulo: "Fim do trecho (segundos)",
          tipo: "número",
          exemplo: "12",
          dica: "Deixe em branco para usar o fim do arquivo.",
        },
        {
          nome: "corteX",
          rótulo: "Corte: esquerda (%)",
          tipo: "número",
          padrão: "0",
        },
        {
          nome: "corteY",
          rótulo: "Corte: topo (%)",
          tipo: "número",
          padrão: "0",
        },
        {
          nome: "corteLargura",
          rótulo: "Corte: largura (%)",
          tipo: "número",
          padrão: "100",
        },
        {
          nome: "corteAltura",
          rótulo: "Corte: altura (%)",
          tipo: "número",
          padrão: "100",
        },
        {
          nome: "giro",
          rótulo: "Girar",
          tipo: "seleção",
          padrão: "0",
          opções: [
            { valor: "0", rótulo: "Sem rotação" },
            { valor: "90", rótulo: "90° à direita" },
            { valor: "180", rótulo: "180°" },
            { valor: "270", rótulo: "90° à esquerda" },
          ],
        },
        {
          nome: "espelho",
          rótulo: "Espelhar",
          tipo: "seleção",
          padrão: "nenhum",
          opções: [
            { valor: "nenhum", rótulo: "Sem espelho" },
            { valor: "horizontal", rótulo: "Horizontal" },
            { valor: "vertical", rótulo: "Vertical" },
          ],
        },
        {
          nome: "tamanho",
          rótulo: "Tamanho de saída",
          tipo: "seleção",
          padrão: "original",
          opções: [
            { valor: "original", rótulo: "Original" },
            { valor: "720", rótulo: "720p (1280 × 720)" },
            { valor: "1080", rótulo: "1080p (1920 × 1080)" },
            { valor: "custom", rótulo: "Personalizado" },
          ],
        },
        {
          nome: "larguraCustom",
          rótulo: "Largura personalizada (px)",
          tipo: "número",
          padrão: "1280",
        },
        {
          nome: "alturaCustom",
          rótulo: "Altura personalizada (px)",
          tipo: "número",
          padrão: "720",
        },
        {
          nome: "velocidade",
          rótulo: "Velocidade (0,5× a 2×)",
          tipo: "número",
          padrão: "1",
          dica: "1× mantém a velocidade original.",
        },
        {
          nome: "mudo",
          rótulo: "Áudio",
          tipo: "seleção",
          padrão: "com-áudio",
          opções: [
            { valor: "com-áudio", rótulo: "Manter áudio" },
            { valor: "sim", rótulo: "Sem áudio" },
          ],
        },
        { nome: "volume", rótulo: "Volume (%)", tipo: "número", padrão: "100" },
        {
          nome: "fadeIn",
          rótulo: "Fade de entrada (segundos)",
          tipo: "número",
          padrão: "0",
        },
        {
          nome: "fadeOut",
          rótulo: "Fade de saída (segundos)",
          tipo: "número",
          padrão: "0",
        },
        {
          nome: "texto",
          rótulo: "Texto sobreposto (opcional)",
          tipo: "área",
          linhas: 2,
          dica: "Até 120 caracteres. A camada é desenhada no navegador e sobreposta ao vídeo.",
        },
        {
          nome: "fonte",
          rótulo: "Família da fonte",
          tipo: "seleção",
          padrão: "sans",
          opções: [
            { valor: "sans", rótulo: "Sem serifa" },
            { valor: "serif", rótulo: "Serifada" },
            { valor: "mono", rótulo: "Monoespaçada" },
          ],
        },
        {
          nome: "posiçãoTexto",
          rótulo: "Posição do texto",
          tipo: "seleção",
          padrão: "inferior-centro",
          opções: [
            { valor: "inferior-centro", rótulo: "Inferior, centro" },
            { valor: "inferior-esquerda", rótulo: "Inferior, esquerda" },
            { valor: "inferior-direita", rótulo: "Inferior, direita" },
            { valor: "superior-centro", rótulo: "Superior, centro" },
            { valor: "centro", rótulo: "Centro" },
          ],
        },
        {
          nome: "formato",
          rótulo: "Formato de saída",
          tipo: "seleção",
          padrão: "mp4",
          opções: [
            { valor: "mp4", rótulo: "MP4 (H.264/AAC)" },
            { valor: "webm", rótulo: "WebM (VP8/Opus)" },
            { valor: "gif", rótulo: "GIF animado" },
            { valor: "wav", rótulo: "WAV (áudio)" },
          ],
        },
      ],
      async calcular(dados) {
        const campo = raiz.querySelector("#campo-arquivo");
        const arquivo = campo?.files?.[0];
        if (!arquivo)
          throw new ErroDeEntrada(
            "Escolha um arquivo de mídia primeiro.",
            "arquivo",
          );
        try {
          validarArquivoVideo(arquivo);
        } catch (erro) {
          throw new ErroDeEntrada(erro.message, "arquivo");
        }
        const sóÁudio = éSóÁudio(arquivo.name);
        if (sóÁudio && dados.formato !== "wav")
          throw new ErroDeEntrada(
            "Este arquivo é só áudio. Escolha WAV para exportar a faixa.",
            "formato",
          );
        const duracao =
          video?.duration && Number.isFinite(video.duration)
            ? video.duration
            : undefined;
        if (duracao > LIMITES_MIDIA.duraçãoSegundos)
          throw new ErroDeEntrada(
            "O arquivo passa do limite de 3 minutos. Escolha um trecho mais curto antes de enviar.",
            "arquivo",
          );
        const dimensoes = {
          largura: video?.videoWidth || 1920,
          altura: video?.videoHeight || 1080,
        };
        let config;
        try {
          config = validarAjustes(dados, duracao, dimensoes);
        } catch (erro) {
          throw new ErroDeEntrada(
            erro.message,
            erro.message.includes("fim") ? "fim" : "início",
          );
        }
        const extensao = dados.formato;
        const bytes = new Uint8Array(await arquivo.arrayBuffer());
        controlador?.abort();
        controlador = new AbortController();
        const localController = controlador;
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "botão botão--linha editor-video__cancelar";
        cancel.textContent = "Cancelar";
        cancel.hidden = true;
        raiz.querySelector(".ações")?.append(cancel);
        cancel.addEventListener("click", () => localController.abort());
        localController.signal.addEventListener(
          "abort",
          () => {
            cancel.disabled = true;
            cancel.textContent = "Cancelando…";
          },
          { once: true },
        );
        cancel.hidden = false;
        progresso.andar(
          undefined,
          "Carregando o processamento de mídia local…",
        );
        try {
          const { processarMidia } = await import("../comum/midia/ffmpeg.js");
          const dimensãoSaída = {
            largura: config.largura || config.cropPixels.largura,
            altura: config.altura || config.cropPixels.altura,
          };
          if (config.giro === 90 || config.giro === 270)
            [dimensãoSaída.largura, dimensãoSaída.altura] = [
              dimensãoSaída.altura,
              dimensãoSaída.largura,
            ];
          config.overlay = await criarSobreposição(config, dimensãoSaída);
          const args = construirArgumentos(
            config,
            `entrada.${validarArquivoVideo(arquivo)}`,
            `saida.${extensao}`,
          );
          const resultado = await processarMidia({
            arquivos: [
              { nome: `entrada.${validarArquivoVideo(arquivo)}`, bytes },
              ...(config.overlay ? [config.overlay] : []),
            ],
            argumentos: args,
            saida: `saida.${extensao}`,
            signal: localController.signal,
            limiteTempoMs: LIMITES_MIDIA.orçamentoMs,
            onProgress: (evento = {}) =>
              progresso.andar(
                clamp((evento.progress ?? 0) * 100, 0, 99),
                evento.etapa === "carregando"
                  ? "Preparando o FFmpeg local…"
                  : "Convertendo no navegador…",
              ),
          });
          if (localController.signal.aborted)
            throw Object.assign(new Error("Conversão cancelada."), {
              cancelado: true,
            });
          const blob = new Blob([resultado.bytes], {
            type: MIME_SAÍDA[extensao],
          });
          const nome = nomeSaída(arquivo.name, extensao);
          progresso.andar(
            undefined,
            "Lendo os metadados do arquivo exportado…",
          );
          const medidas = await medirSaída(blob, extensao);
          const duraçãoPlanejada = config.duração / config.velocidade;
          previaPendente = { blob, nome, formato: extensao, medidas };
          const planoExportado = {
            ferramenta: "Editor de vídeo e recortes",
            arquivoOriginal: arquivo.name,
            saída: nome,
            trecho: {
              inícioSegundos: config.início,
              fimSegundos: config.fim,
              velocidade: config.velocidade,
              duraçãoPlanejadaSegundos: duraçãoPlanejada,
              duraçãoMedidaSegundos: medidas?.duração ?? null,
            },
            corte: { ...config.crop },
            transformação: {
              rotaçãoGraus: config.giro,
              espelho: config.espelho,
              larguraPx: config.largura || null,
              alturaPx: config.altura || null,
            },
            áudio: {
              semÁudio: config.mudo,
              volumePorcento: config.volume,
              fadeEntradaSegundos: config.fadeIn,
              fadeSaídaSegundos: config.fadeOut,
            },
            texto: config.texto
              ? {
                  conteúdo: config.texto,
                  fonte: dados.fonte,
                  posição: config.posiçãoTexto,
                }
              : null,
            formato: extensao,
          };
          const blobPlano = new Blob(
            [JSON.stringify(planoExportado, null, 2)],
            { type: "application/json" },
          );
          const nomePlano = nomeSaída(arquivo.name, "json");
          progresso.andar(100, "Exportação pronta.");
          const duraçãoInformada =
            medidas?.duração != null
              ? `${formatarTempo(medidas.duração)} (medida no arquivo exportado)`
              : `não medida; trecho planejado ${formatarTempo(duraçãoPlanejada)}`;
          return {
            valor: "Mídia pronta",
            resumo: `${nome} · ${blob.size.toLocaleString("pt-BR")} bytes · duração ${duraçãoInformada}.`,
            linhas: [
              [
                "Original",
                `${arquivo.name} · ${arquivo.size.toLocaleString("pt-BR")} bytes`,
              ],
              [
                "Trecho configurado",
                `${formatarTempo(config.início)} a ${formatarTempo(config.fim)} · velocidade ${config.velocidade}×`,
              ],
              ["Duração de saída", duraçãoInformada],
              [
                "Tamanho",
                medidas?.largura && medidas?.altura
                  ? `${medidas.largura} × ${medidas.altura} px (medido)`
                  : config.largura && config.altura
                    ? `${config.largura} × ${config.altura} px (planejado)`
                    : `${dimensoes.largura} × ${dimensoes.altura} px (origem)`,
              ],
              [
                "Saída",
                `${extensao.toUpperCase()} · ${blob.size.toLocaleString("pt-BR")} bytes`,
              ],
            ],
            texto: "",
            arquivos: [
              {
                rótulo: `Baixar ${extensao.toUpperCase()}`,
                ícone: "baixar",
                gerar: () => baixar(blob, nome, MIME_SAÍDA[extensao]),
              },
              {
                rótulo: "Baixar configuração JSON",
                ícone: "baixar",
                gerar: () => baixar(blobPlano, nomePlano, "application/json"),
              },
            ],
            observações: [
              "O original permanece intacto. O vídeo foi processado localmente no navegador; nenhum arquivo foi enviado.",
            ],
          };
        } catch (erro) {
          if (localController.signal.aborted)
            throw Object.assign(new Error("Conversão cancelada."), {
              cancelado: true,
            });
          const msg = erro instanceof Error ? erro.message : String(erro);
          if (
            /codec|encoder|filter|drawtext|font|not found|unsupported/i.test(
              msg,
            )
          )
            throw new ErroDeEntrada(
              `Este FFmpeg não conseguiu gerar a saída pedida. Codec ou recurso indisponível: ${msg}`,
              "formato",
            );
          if (erro?.codigo === "formato")
            throw new ErroDeEntrada(
              `O FFmpeg não conseguiu gerar esta saída. Confira o formato ou tente uma resolução menor. ${msg}`,
              "formato",
            );
          if (erro?.codigo === "tempo") throw new Error(msg);
          if (erro instanceof Error) throw new Error(msg);
          throw new Error(
            "Não foi possível concluir a conversão neste navegador. Tente um trecho menor ou outra resolução.",
          );
        } finally {
          cancel.remove();
          if (controlador === localController) controlador = null;
        }
      },
      aoMontar(elemento) {
        carregarEstilos();
        progresso = criarProgresso(elemento.querySelector("#progresso"));
        quadro = document.createElement("section");
        quadro.className = "editor-video";
        quadro.hidden = true;
        quadro.setAttribute("aria-label", "Prévia da mídia");
        quadro.innerHTML =
          '<div class="editor-video__meta" data-meta></div><video controls playsinline preload="metadata" aria-label="Prévia do arquivo selecionado"></video><p class="editor-video__nota" data-nota role="status"></p><div class="editor-video__timeline"><label for="editor-video-seek">Quadro do vídeo</label><input id="editor-video-seek" type="range" min="0" max="1000" value="0" step="1"><output>00:00.00</output></div>';
        elemento.querySelector("#formulário").before(quadro);
        video = quadro.querySelector("video");
        info = quadro.querySelector("[data-meta]");
        const input = elemento.querySelector("#campo-arquivo");
        input.accept =
          "video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/flac,audio/aac,.mp4,.webm,.mov,.mkv,.avi,.mp3,.wav,.m4a,.ogg,.flac,.aac";
        input.addEventListener("change", () => {
          controlador?.abort();
          limparPréviaResultado();
          if (urlOrigem) URL.revokeObjectURL(urlOrigem);
          const arquivo = input.files?.[0];
          quadro.hidden = !arquivo;
          elemento.querySelector("#resultado").hidden = true;
          if (!arquivo) return;
          try {
            validarArquivoVideo(arquivo);
          } catch (erro) {
            quadro.hidden = true;
            input.setCustomValidity(erro.message);
            input.reportValidity();
            return;
          }
          input.setCustomValidity("");
          urlOrigem = URL.createObjectURL(arquivo);
          const elementoAntigo = quadro.querySelector("video, audio");
          video = éSóÁudio(arquivo.name)
            ? document.createElement("audio")
            : document.createElement("video");
          video.controls = true;
          video.preload = "metadata";
          video.playsInline = true;
          video.setAttribute(
            "aria-label",
            éSóÁudio(arquivo.name)
              ? "Prévia do arquivo de áudio"
              : "Prévia do arquivo selecionado",
          );
          elementoAntigo?.replaceWith(video);
          quadro.querySelector(".editor-video__timeline label").textContent =
            éSóÁudio(arquivo.name) ? "Posição do áudio" : "Quadro do vídeo";
          info.textContent = `${arquivo.name} · ${(arquivo.size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB · lendo metadados…`;
          quadro.querySelector("[data-nota]").textContent =
            "Se os controles do navegador mostrarem erro de decodificação, a prévia não é compatível com este codec. A conversão local ainda pode funcionar.";
          video.addEventListener(
            "loadedmetadata",
            () => {
              const dimensions =
                video.videoWidth && video.videoHeight
                  ? ` · ${video.videoWidth} × ${video.videoHeight} px`
                  : éSóÁudio(arquivo.name)
                    ? " · faixa de áudio"
                    : " · sem quadro de vídeo";
              info.textContent = `${arquivo.name} · ${formatarTempo(video.duration)}${dimensions} · ${(arquivo.size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
              const fim = elemento.querySelector("#campo-fim");
              if (fim && !fim.value && Number.isFinite(video.duration))
                fim.value = String(Math.round(video.duration * 100) / 100);
              quadro.querySelector("[data-nota]").textContent = éSóÁudio(
                arquivo.name,
              )
                ? "Prévia da faixa de áudio. Áudio pode ser exportado em WAV."
                : "Prévia do arquivo original. O quadro muda conforme você move a linha do tempo.";
            },
            { once: true },
          );
          video.addEventListener(
            "error",
            () => {
              quadro.querySelector("[data-nota]").textContent =
                "O navegador não decodificou este arquivo para prévia. A conversão pelo FFmpeg local ainda pode funcionar.";
              info.textContent = `${arquivo.name} · prévia indisponível neste navegador`;
            },
            { once: true },
          );
          video.addEventListener("timeupdate", () => {
            if (!Number.isFinite(video.duration)) return;
            const seek = quadro.querySelector("input[type=range]"),
              output = quadro.querySelector("output");
            seek.value = String(
              Math.round((video.currentTime / video.duration) * 1000),
            );
            output.textContent = formatarTempo(video.currentTime);
          });
          video.src = urlOrigem;
          video.load();
        });
        quadro
          .querySelector("input[type=range]")
          .addEventListener("input", (evento) => {
            if (video && Number.isFinite(video.duration))
              video.currentTime =
                (video.duration * Number(evento.target.value)) / 1000;
          });
        elemento.querySelector("#formulário").addEventListener("reset", () => {
          controlador?.abort();
          if (urlOrigem) URL.revokeObjectURL(urlOrigem);
          urlOrigem = null;
          limparPréviaResultado();
          video.removeAttribute("src");
          video.load();
          quadro.hidden = true;
        });
        elemento
          .querySelector("#formulário")
          .addEventListener("submit", limparPréviaResultado);
        window.addEventListener("pagehide", limparPréviaResultado, {
          once: true,
        });
      },
      aoResultado(elemento) {
        const atual = previaPendente;
        limparPréviaResultado();
        if (!atual) return;
        const { blob, nome, formato, medidas } = atual;
        painelResultado = criarPréviaDaSaída(
          elemento,
          blob,
          formato,
          nome,
          medidas,
          (url) => {
            urlResultado = url;
          },
        );
        previaPendente = null;
      },
    });
  },
};

/**
 * Imagens dentro de PDF: reconhecer o formato pelo conteúdo, ler as dimensões e
 * a rotação EXIF sem decodificar, e calcular onde e como desenhar.
 *
 * Usado por JPG para PDF e pela marca d'água de imagem. Sem DOM: no navegador, quem
 * decodifica WebP e GIF (que a pdf-lib não lê) é a tela, que entrega `converter`.
 */
import { calcularCrc32 } from '../comum/exportação/calcular-crc32.js';

/** Tamanho máximo de cada imagem; acima disso o celular gasta memória demais só para abrir. */
export const TAMANHO_MÁXIMO_DA_IMAGEM = 25 * 1024 * 1024; // 25 MB

/**
 * JPEG entra no PDF sem decodificar (os bytes seguem como estão), então aguenta
 * foto grande. PNG, WebP e GIF são decodificados em memória: o teto é menor.
 */
export const PIXELS_MÁXIMOS_JPG = 100_000_000;
export const PIXELS_MÁXIMOS_DECODIFICADOS = 25_000_000;

const u16 = (bytes, i, pequenoFim = false) => (pequenoFim ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
const u32 = (bytes, i) => ((bytes[i] * 2 ** 24) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3]);
const texto = (bytes, de, até) => String.fromCharCode(...bytes.slice(de, até));

/** Marcadores SOF (início de quadro) do JPEG, que carregam a altura e a largura. */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/** Orientação EXIF (1 a 8) de um segmento APP1, ou 1 quando não há. */
function orientaçãoExif(bytes, início, fim) {
  if (texto(bytes, início, início + 4) !== 'Exif') return 1;
  const tiff = início + 6;
  const pequenoFim = texto(bytes, tiff, tiff + 2) === 'II';
  if (!pequenoFim && texto(bytes, tiff, tiff + 2) !== 'MM') return 1;
  const ler16 = (i) => (i + 2 <= fim ? u16(bytes, i, pequenoFim) : 0);
  const ler32 = (i) => (i + 4 <= fim
    ? (pequenoFim ? (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16)) + bytes[i + 3] * 2 ** 24 : u32(bytes, i))
    : 0);
  const ifd = tiff + ler32(tiff + 4);
  const entradas = ler16(ifd);
  for (let k = 0; k < Math.min(entradas, 64); k++) {
    const entrada = ifd + 2 + k * 12;
    if (entrada + 12 > fim) break;
    if (ler16(entrada) === 0x0112) {
      const valor = ler16(entrada + 8);
      return valor >= 1 && valor <= 8 ? valor : 1;
    }
  }
  return 1;
}

function lerJpeg(bytes) {
  let posição = 2;
  let orientação = 1;
  while (posição + 4 <= bytes.length) {
    if (bytes[posição] !== 0xff) { posição++; continue; }
    const marcador = bytes[posição + 1];
    if (marcador === 0xff) { posição++; continue; }
    if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) { posição += 2; continue; }
    if (marcador === 0xd9) break;
    const tamanho = u16(bytes, posição + 2);
    if (tamanho < 2) break;
    if (marcador === 0xe1) orientação = orientaçãoExif(bytes, posição + 4, Math.min(bytes.length, posição + 2 + tamanho));
    if (SOF.has(marcador)) {
      if (posição + 10 > bytes.length) break;
      const altura = u16(bytes, posição + 5);
      const largura = u16(bytes, posição + 7);
      const componentes = bytes[posição + 9];
      return { tipo: 'jpg', largura, altura, orientação, componentes };
    }
    if (marcador === 0xda) break; // começou a imagem sem achar o quadro: arquivo quebrado
    posição += 2 + tamanho;
  }
  return { tipo: 'jpg', largura: 0, altura: 0, orientação, componentes: 0 };
}

function lerWebp(bytes) {
  const parte = texto(bytes, 12, 16);
  if (parte === 'VP8X' && bytes.length >= 30) {
    return { tipo: 'webp', largura: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)), altura: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)), orientação: 1 };
  }
  if (parte === 'VP8L' && bytes.length >= 25) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] * 2 ** 24);
    return { tipo: 'webp', largura: 1 + (bits & 0x3fff), altura: 1 + ((bits >>> 14) & 0x3fff), orientação: 1 };
  }
  if (parte === 'VP8 ' && bytes.length >= 30) {
    return { tipo: 'webp', largura: u16(bytes, 26, true) & 0x3fff, altura: u16(bytes, 28, true) & 0x3fff, orientação: 1 };
  }
  return { tipo: 'webp', largura: 0, altura: 0, orientação: 1 };
}

/**
 * Reconhece a imagem pelo conteúdo (nunca pela extensão) e lê as dimensões do cabeçalho.
 * `largura` e `altura` zeradas quer dizer cabeçalho ilegível: arquivo quebrado.
 * @param {Uint8Array} bytes
 * @returns {{tipo: 'jpg'|'png'|'webp'|'gif'|'tiff'|'heic'|'bmp'|null, largura: number, altura: number, orientação: number}}
 */
export function lerImagem(bytes) {
  const vazio = { tipo: null, largura: 0, altura: 0, orientação: 1 };
  if (!bytes || bytes.length < 12) return vazio;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return lerJpeg(bytes);
  if (bytes[0] === 0x89 && texto(bytes, 1, 4) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    const ok = texto(bytes, 12, 16) === 'IHDR' && bytes.length >= 24;
    return { tipo: 'png', largura: ok ? u32(bytes, 16) : 0, altura: ok ? u32(bytes, 20) : 0, orientação: 1 };
  }
  if (texto(bytes, 0, 4) === 'RIFF' && texto(bytes, 8, 12) === 'WEBP') return lerWebp(bytes);
  if (texto(bytes, 0, 3) === 'GIF' && /^GIF8[79]a$/.test(texto(bytes, 0, 6))) {
    return { tipo: 'gif', largura: u16(bytes, 6, true), altura: u16(bytes, 8, true), orientação: 1 };
  }
  const início = texto(bytes, 0, 4);
  if (início === 'II*\0' || início === 'MM\0*') return { ...vazio, tipo: 'tiff' };
  if (texto(bytes, 4, 8) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|avif)/.test(texto(bytes, 8, 12))) return { ...vazio, tipo: 'heic' };
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return { ...vazio, tipo: 'bmp' };
  return vazio;
}

/** Quantas vezes a imagem precisa ser girada pelo EXIF: 5 a 8 trocam largura e altura. */
export const exifTrocaOsLados = (orientação) => orientação >= 5 && orientação <= 8;

/* ------------------------------------------------------------ mensagens */

/**
 * @param {string} erro
 * @param {{nome?: string, tipo?: string|null, limite?: number}} [extras]
 */
export function mensagemDeErroDaImagem(erro, { nome = 'O arquivo', tipo = null } = {}) {
  const formatos = { tiff: 'TIFF', heic: 'HEIC', bmp: 'BMP' };
  const mensagens = {
    imagem_vazia: `"${nome}" está vazio (0 bytes).`,
    imagem_nao_suportada: formatos[tipo]
      ? `"${nome}" está em ${formatos[tipo]}, que o navegador não converte aqui. Salve como JPG ou PNG e tente de novo.`
      : `"${nome}" não é uma imagem JPG, PNG, WebP ou GIF: o conteúdo do arquivo não confere, mesmo que o nome termine em .jpg.`,
    imagem_grande_demais: `"${nome}" passa de ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB.`,
    imagem_pixels_demais: `"${nome}" tem pixels demais para processar no navegador. Reduza a imagem e tente de novo.`,
    imagem_corrompida: `Não foi possível ler "${nome}". A imagem parece estar danificada ou incompleta.`,
  };
  return mensagens[erro] ?? `Não foi possível usar "${nome}".`;
}

/**
 * Confere o que dá para conferir só com o cabeçalho, sem decodificar nada.
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @returns {{ok: true, info: ReturnType<typeof lerImagem>} | {ok: false, erro: string, extras: {nome: string, tipo?: string|null}}}
 */
export function conferirImagem({ nome, bytes }) {
  const falha = (erro, tipo) => ({ ok: false, erro, extras: { nome, tipo } });
  if (!bytes || bytes.length === 0) return falha('imagem_vazia');
  if (bytes.length > TAMANHO_MÁXIMO_DA_IMAGEM) return falha('imagem_grande_demais');
  const info = lerImagem(bytes);
  if (!info.tipo || info.tipo === 'tiff' || info.tipo === 'heic' || info.tipo === 'bmp') return falha('imagem_nao_suportada', info.tipo);
  if (info.largura <= 0 || info.altura <= 0) return falha('imagem_corrompida');
  const pixels = info.largura * info.altura;
  const teto = info.tipo === 'jpg' ? PIXELS_MÁXIMOS_JPG : PIXELS_MÁXIMOS_DECODIFICADOS;
  if (pixels > teto) return falha('imagem_pixels_demais');
  return { ok: true, info };
}

/* ------------------------------------------------------- PNG íntegro */

/** Canais por tipo de cor do PNG e profundidades de bit permitidas para cada um. */
const CANAIS_DO_PNG = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const PROFUNDIDADES = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
/** Passos do entrelaçamento Adam7: [x inicial, y inicial, passo x, passo y]. */
const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

/** Bytes que o PNG tem depois de descompactado (um byte de filtro por linha). */
function tamanhoDescompactado(largura, altura, bitsPorPixel, entrelaçado) {
  const linha = (l) => 1 + Math.ceil((l * bitsPorPixel) / 8);
  if (!entrelaçado) return altura * linha(largura);
  let total = 0;
  for (const [x0, y0, dx, dy] of ADAM7) {
    const l = Math.ceil((largura - x0) / dx);
    const a = Math.ceil((altura - y0) / dy);
    if (l > 0 && a > 0) total += a * linha(l);
  }
  return total;
}

/**
 * Descompacta o fluxo zlib e devolve quantos bytes saíram, parando um pouco acima
 * do teto. Sem DecompressionStream (navegador antigo), devolve null e a conferência
 * fica só na estrutura.
 */
async function bytesDescompactados(dados, teto) {
  if (typeof DecompressionStream !== 'function') return null;
  const leitor = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  let total = 0;
  try {
    while (total <= teto) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
    }
  } finally {
    leitor.cancel().catch(() => {});
  }
  return total;
}

/**
 * Confere o PNG por inteiro antes de entregá-lo à pdf-lib: estrutura dos blocos,
 * CRC de cada um, IEND presente e fluxo zlib com o tamanho que o cabeçalho promete.
 *
 * Não é preciosismo: a pdf-lib TRAVA (laço infinito) em PNG cortado ou com o
 * miolo quebrado, e uma página travada é pior que uma recusa com mensagem.
 * @param {Uint8Array} bytes
 * @returns {Promise<boolean>}
 */
export async function pngEstáÍntegro(bytes) {
  try {
    if (lerImagem(bytes).tipo !== 'png') return false;
    const visão = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let posição = 8;
    let cabeçalho = null;
    const idat = [];
    let tamanhoIdat = 0;
    let fim = false;
    while (posição + 12 <= bytes.length) {
      const tamanho = visão.getUint32(posição);
      const tipo = texto(bytes, posição + 4, posição + 8);
      if (posição + 12 + tamanho > bytes.length) return false;
      if (visão.getUint32(posição + 8 + tamanho) !== calcularCrc32(bytes.subarray(posição + 4, posição + 8 + tamanho))) return false;
      if (posição === 8 && tipo !== 'IHDR') return false;
      const dados = bytes.subarray(posição + 8, posição + 8 + tamanho);
      if (tipo === 'IHDR') {
        if (tamanho !== 13) return false;
        cabeçalho = { largura: visão.getUint32(posição + 8), altura: visão.getUint32(posição + 12), profundidade: dados[8], cor: dados[9], entrelaçado: dados[12] };
      } else if (tipo === 'IDAT') {
        idat.push(dados);
        tamanhoIdat += dados.length;
      } else if (tipo === 'IEND') {
        fim = true;
        break;
      }
      posição += 12 + tamanho;
    }
    if (!fim || !cabeçalho || idat.length === 0) return false;
    const { largura, altura, profundidade, cor, entrelaçado } = cabeçalho;
    if (!(cor in CANAIS_DO_PNG) || !PROFUNDIDADES[cor].includes(profundidade) || entrelaçado > 1) return false;

    const todo = new Uint8Array(tamanhoIdat);
    let deslocamento = 0;
    for (const parte of idat) { todo.set(parte, deslocamento); deslocamento += parte.length; }
    // Cabeçalho zlib: método 8 e soma de verificação dos dois primeiros bytes.
    if (todo.length < 6 || (todo[0] & 0x0f) !== 8 || ((todo[0] << 8) | todo[1]) % 31 !== 0) return false;

    const esperado = tamanhoDescompactado(largura, altura, CANAIS_DO_PNG[cor] * profundidade, entrelaçado === 1);
    const saiu = await bytesDescompactados(todo, esperado);
    return saiu === null || saiu === esperado;
  } catch {
    return false;
  }
}

/**
 * Deixa a imagem em um formato que a pdf-lib incorpora (JPG ou PNG). WebP e GIF
 * passam por `converter`, que no navegador desenha no canvas (GIF animado vira
 * o primeiro quadro) e entrega PNG. Sem `converter`, WebP e GIF são recusados.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{converter?: (bytes: Uint8Array, tipo: string) => Promise<{bytes: Uint8Array, largura: number, altura: number}>}} [opções]
 * @returns {Promise<
 *   {ok: true, imagem: {tipo: 'jpg'|'png', bytes: Uint8Array, largura: number, altura: number, orientação: number}}
 *   | {ok: false, erro: string, extras: {nome: string, tipo?: string|null}}
 * >}
 */
export async function prepararImagem(arquivo, { converter } = {}) {
  const conferida = conferirImagem(arquivo);
  if (!conferida.ok) return conferida;
  const { info } = conferida;
  if (info.tipo === 'png' && !(await pngEstáÍntegro(arquivo.bytes))) {
    return { ok: false, erro: 'imagem_corrompida', extras: { nome: arquivo.nome } };
  }
  if (info.tipo === 'jpg' || info.tipo === 'png') {
    return { ok: true, imagem: { tipo: info.tipo, bytes: arquivo.bytes, largura: info.largura, altura: info.altura, orientação: info.orientação } };
  }
  if (!converter) return { ok: false, erro: 'imagem_nao_suportada', extras: { nome: arquivo.nome, tipo: info.tipo } };
  try {
    const convertida = await converter(arquivo.bytes, info.tipo);
    return { ok: true, imagem: { tipo: 'png', bytes: convertida.bytes, largura: convertida.largura, altura: convertida.altura, orientação: 1 } };
  } catch {
    return { ok: false, erro: 'imagem_corrompida', extras: { nome: arquivo.nome } };
  }
}

/**
 * Coloca a imagem no documento. Erro de leitura da pdf-lib (JPG ou PNG com
 * cabeçalho certo e miolo quebrado) vira `imagem_corrompida`.
 * @returns {Promise<{ok: true, imagem: any} | {ok: false, erro: 'imagem_corrompida'}>}
 */
export async function incorporarImagem(documento, { tipo, bytes }) {
  try {
    const imagem = tipo === 'png' ? await documento.embedPng(bytes) : await documento.embedJpg(bytes);
    return { ok: true, imagem };
  } catch {
    return { ok: false, erro: 'imagem_corrompida' };
  }
}

/* ------------------------------------------------------------ matrizes */

/**
 * Matriz "primeiro e depois": aplica `primeira` e em seguida `segunda`.
 * Cada matriz é [a, b, c, d, e, f], como no operador `cm` do PDF:
 * x' = a·x + c·y + e e y' = b·x + d·y + f.
 * @param {number[]} primeira
 * @param {number[]} segunda
 * @returns {number[]}
 */
export function compor(primeira, segunda) {
  const [a1, b1, c1, d1, e1, f1] = primeira;
  const [a2, b2, c2, d2, e2, f2] = segunda;
  return [
    a1 * a2 + b1 * c2, a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2, c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2, e1 * b2 + f1 * d2 + f2,
  ];
}

/** Aplica a matriz a um ponto. */
export const aplicarMatriz = ([a, b, c, d, e, f], x, y) => ({ x: a * x + c * y + e, y: b * x + d * y + f });

/**
 * Para cada orientação EXIF, como o quadrado unitário da imagem guardada (u para
 * a direita, v para cima, origem embaixo à esquerda) vira o quadrado unitário da
 * imagem como deve ser vista: [p, q, r] de x' = p·u + q·v + r, uma tripla para
 * x' e outra para y'.
 */
const ORIENTAÇÕES = {
  1: [[1, 0, 0], [0, 1, 0]],
  2: [[-1, 0, 1], [0, 1, 0]], // espelhada na horizontal
  3: [[-1, 0, 1], [0, -1, 1]], // girada 180°
  4: [[1, 0, 0], [0, -1, 1]], // espelhada na vertical
  5: [[0, -1, 1], [-1, 0, 1]], // transposta
  6: [[0, 1, 0], [-1, 0, 1]], // girada 90° no sentido horário (a foto de celular em pé)
  7: [[0, 1, 0], [1, 0, 0]],
  8: [[0, -1, 1], [1, 0, 0]], // girada 90° no sentido anti-horário
};

/**
 * Matriz que desenha a imagem guardada, respeitando a orientação EXIF, dentro do
 * retângulo (x, y, largura, altura) da página, que já está no tamanho com que a
 * imagem deve ser vista (largura e altura trocadas nas orientações 5 a 8).
 * @param {number} orientação 1 a 8
 * @param {{x: number, y: number, largura: number, altura: number}} caixa
 * @returns {number[]} [a, b, c, d, e, f]
 */
export function matrizDaImagem(orientação, { x, y, largura, altura }) {
  const [[p1, q1, r1], [p2, q2, r2]] = ORIENTAÇÕES[orientação] ?? ORIENTAÇÕES[1];
  return [largura * p1, altura * p2, largura * q1, altura * q2, x + largura * r1, y + altura * r2];
}

/**
 * Leitura de QR Code a partir de imagem (F186): conferência do arquivo e busca dos códigos.
 *
 * O arquivo é reconhecido pelos BYTES, nunca pela extensão ou pelo tipo informado pelo navegador:
 * um PDF renomeado para .png é recusado com a explicação certa. As dimensões são lidas do cabeçalho
 * ANTES de decodificar a imagem, porque um arquivo pequeno pode declarar dezenas de milhares de pixels
 * de lado (bomba de descompressão) e travar a página só de abrir.
 *
 * A busca em si recebe o decodificador por parâmetro (jsQR, ou qualquer função com a mesma forma),
 * o que deixa tudo testável no Node sem navegador.
 */

export const TAMANHO_MÁXIMO_DA_IMAGEM = 20 * 1024 * 1024; // 20 MB
export const MEGAPIXELS_MÁXIMOS = 100;
export const MÁXIMO_DE_CÓDIGOS = 5;
/** Tempo total para achar o código. A jsQR é síncrona e pode levar minutos em imagem com muito ruído: passou disso, a leitura é abortada. */
export const PRAZO_DA_LEITURA_MS = 20_000;
const LADO_MÁXIMO_DA_VARREDURA = 2000;
const LADO_PREFERIDO = 1000;
const LADO_MÍNIMO = 21; // o menor QR Code (versão 1) tem 21 módulos de lado

/** @typedef {'png'|'jpeg'|'webp'|'gif'|'bmp'|'avif'} TipoDeImagem */

const igual = (bytes, deslocamento, texto) => [...texto].every((c, i) => bytes[deslocamento + i] === c.charCodeAt(0));
const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const i32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24));

/**
 * Descobre o tipo de imagem pelos primeiros bytes. Devolve também o que o arquivo é, quando não é imagem,
 * para a mensagem de erro poder dizer.
 * @param {Uint8Array} bytes
 * @returns {{imagem: TipoDeImagem} | {outro: 'pdf'|'zip'|'svg'|'heic'|'texto'|'desconhecido'}}
 */
export function reconhecerArquivo(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && igual(bytes, 1, 'PNG\r\n') && bytes[6] === 0x1A && bytes[7] === 0x0A) return { imagem: 'png' };
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { imagem: 'jpeg' };
  if (bytes.length >= 12 && igual(bytes, 0, 'RIFF') && igual(bytes, 8, 'WEBP')) return { imagem: 'webp' };
  if (bytes.length >= 6 && (igual(bytes, 0, 'GIF87a') || igual(bytes, 0, 'GIF89a'))) return { imagem: 'gif' };
  // "BM" também abre muito texto comum: o tamanho do cabeçalho de imagem (DIB) que vem logo depois desempata.
  if (bytes.length >= 26 && igual(bytes, 0, 'BM') && [12, 40, 52, 56, 64, 108, 124].includes(u32le(bytes, 14))) return { imagem: 'bmp' };
  if (bytes.length >= 12 && igual(bytes, 4, 'ftyp')) {
    const marca = String.fromCharCode(...bytes.slice(8, 12));
    if (marca === 'avif' || marca === 'avis') return { imagem: 'avif' };
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(marca)) return { outro: 'heic' };
  }
  if (igual(bytes, 0, '%PDF')) return { outro: 'pdf' };
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return { outro: 'zip' };
  const início = new TextDecoder('utf-8').decode(bytes.slice(0, 300)).trimStart().toLowerCase();
  if (início.startsWith('<svg') || (início.startsWith('<?xml') && início.includes('<svg'))) return { outro: 'svg' };
  // Texto puro: nenhum byte de controle nos primeiros 300 bytes.
  if (bytes.length > 0 && [...bytes.slice(0, 300)].every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128)) return { outro: 'texto' };
  return { outro: 'desconhecido' };
}

/** Procura os bytes de um marcador (por exemplo "ispe") no começo do arquivo. */
function acharMarcador(bytes, marcador, limite = 16384) {
  const fim = Math.min(bytes.length - marcador.length, limite);
  for (let i = 0; i <= fim; i += 1) if (igual(bytes, i, marcador)) return i;
  return -1;
}

/**
 * Lê largura e altura do CABEÇALHO, sem decodificar a imagem.
 * @param {Uint8Array} bytes
 * @param {TipoDeImagem} tipo
 * @returns {{largura: number, altura: number} | null} null se o cabeçalho estiver truncado ou inválido
 */
export function dimensõesDaImagem(bytes, tipo) {
  let largura = 0;
  let altura = 0;
  if (tipo === 'png') {
    if (bytes.length < 24 || !igual(bytes, 12, 'IHDR')) return null;
    largura = u32be(bytes, 16);
    altura = u32be(bytes, 20);
  } else if (tipo === 'gif') {
    if (bytes.length < 10) return null;
    largura = u16le(bytes, 6);
    altura = u16le(bytes, 8);
  } else if (tipo === 'bmp') {
    if (bytes.length < 26) return null;
    if (u32le(bytes, 14) === 12) {
      largura = u16le(bytes, 18);
      altura = u16le(bytes, 20);
    } else {
      largura = Math.abs(i32le(bytes, 18));
      altura = Math.abs(i32le(bytes, 22));
    }
  } else if (tipo === 'jpeg') {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xFF) { i += 1; continue; }
      const marcador = bytes[i + 1];
      if (marcador === 0xFF) { i += 1; continue; }
      if (marcador === 0xD8 || marcador === 0x01 || (marcador >= 0xD0 && marcador <= 0xD7)) { i += 2; continue; }
      if (marcador === 0xD9 || marcador === 0xDA) return null; // fim ou dados da imagem sem achar o quadro
      const tamanho = u16be(bytes, i + 2);
      if (tamanho < 2) return null;
      const éQuadro = marcador >= 0xC0 && marcador <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marcador);
      if (éQuadro) {
        altura = u16be(bytes, i + 5);
        largura = u16be(bytes, i + 7);
        break;
      }
      i += 2 + tamanho;
    }
  } else if (tipo === 'webp') {
    if (bytes.length < 30) return null;
    if (igual(bytes, 12, 'VP8 ')) {
      if (bytes[23] !== 0x9D || bytes[24] !== 0x01 || bytes[25] !== 0x2A) return null;
      largura = u16le(bytes, 26) & 0x3FFF;
      altura = u16le(bytes, 28) & 0x3FFF;
    } else if (igual(bytes, 12, 'VP8L')) {
      if (bytes[20] !== 0x2F) return null;
      const bits = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
      largura = (bits & 0x3FFF) + 1;
      altura = ((bits >>> 14) & 0x3FFF) + 1;
    } else if (igual(bytes, 12, 'VP8X')) {
      largura = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
      altura = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
    } else {
      return null;
    }
  } else if (tipo === 'avif') {
    const posição = acharMarcador(bytes, 'ispe');
    if (posição < 0 || posição + 16 > bytes.length) return null;
    largura = u32be(bytes, posição + 8);
    altura = u32be(bytes, posição + 12);
  } else {
    return null;
  }
  return largura > 0 && altura > 0 ? { largura, altura } : null;
}

const NOMES_DE_TIPO = { pdf: 'um PDF', zip: 'um arquivo ZIP', svg: 'uma imagem SVG (desenho vetorial)', heic: 'uma foto HEIC (formato do iPhone)', texto: 'um arquivo de texto', desconhecido: 'um arquivo que não reconheço' };

/**
 * Confere se o arquivo é uma imagem que dá para ler, ANTES de decodificar.
 * @param {Uint8Array} bytes conteúdo inteiro do arquivo
 * @returns {{ok: true, tipo: TipoDeImagem, largura: number, altura: number} | {ok: false, motivo: string, mensagem: string}}
 */
export function conferirImagem(bytes) {
  if (!bytes || bytes.length === 0) return { ok: false, motivo: 'vazio', mensagem: 'O arquivo está vazio.' };
  if (bytes.length > TAMANHO_MÁXIMO_DA_IMAGEM) {
    return { ok: false, motivo: 'grande', mensagem: `A imagem passa de ${TAMANHO_MÁXIMO_DA_IMAGEM / 1024 / 1024} MB. Reduza o tamanho (ou recorte só o QR Code) e tente de novo.` };
  }
  const reconhecido = reconhecerArquivo(bytes);
  if ('outro' in reconhecido) {
    const dica = reconhecido.outro === 'heic' ? ' Salve a foto como JPG e tente de novo.'
      : reconhecido.outro === 'svg' ? ' Use PNG ou JPG.'
        : reconhecido.outro === 'pdf' ? ' Tire um print da página com o QR Code e use a imagem.'
          : ' Escolha uma imagem PNG, JPG, WebP, GIF, BMP ou AVIF.';
    return { ok: false, motivo: 'tipo', mensagem: `Este arquivo é ${NOMES_DE_TIPO[reconhecido.outro]}, não uma imagem que eu consiga ler.${dica}` };
  }
  const { imagem } = reconhecido;
  const medidas = dimensõesDaImagem(bytes, imagem);
  if (!medidas) {
    return { ok: false, motivo: 'corrompido', mensagem: 'Não consegui ler o cabeçalho da imagem: o arquivo parece corrompido ou incompleto.' };
  }
  const { largura, altura } = medidas;
  if (largura * altura > MEGAPIXELS_MÁXIMOS * 1_000_000) {
    return {
      ok: false, motivo: 'megapixels',
      mensagem: `A imagem tem ${largura} × ${altura} pixels (mais de ${MEGAPIXELS_MÁXIMOS} megapixels), grande demais para abrir sem travar. Reduza ou recorte e tente de novo.`,
    };
  }
  if (largura < LADO_MÍNIMO || altura < LADO_MÍNIMO) {
    return { ok: false, motivo: 'pequena', mensagem: `A imagem tem só ${largura} × ${altura} pixels: pequena demais para conter um QR Code legível.` };
  }
  return { ok: true, tipo: imagem, largura, altura };
}

/**
 * Tamanhos em que vale tentar ler, na ordem. A jsQR fica muito mais lenta quanto maior e mais "ruidosa" é a
 * imagem, então a primeira tentativa é a de lado até 1000 px (que lê foto de celular com o código ocupando
 * uma boa parte do quadro); só depois vêm o tamanho cheio (até 2000 px, para código pequeno em imagem
 * grande), a metade desse tamanho (foto enorme ou código com módulos muito grossos) e, para imagem pequena,
 * o dobro.
 * @param {number} largura
 * @param {number} altura
 * @returns {{largura: number, altura: number}[]}
 */
export function escalasParaTentar(largura, altura) {
  const maior = Math.max(largura, altura);
  const tamanho = (lado) => {
    const fator = lado / maior;
    return { largura: Math.max(1, Math.round(largura * fator)), altura: Math.max(1, Math.round(altura * fator)) };
  };
  const lados = [];
  if (maior > LADO_PREFERIDO) {
    lados.push(LADO_PREFERIDO);
    if (maior >= LADO_PREFERIDO * 1.25) lados.push(Math.min(maior, LADO_MÁXIMO_DA_VARREDURA));
    lados.push(Math.round(LADO_PREFERIDO / 2));
  } else {
    lados.push(maior);
    if (maior > 400) lados.push(Math.round(maior / 2));
    if (maior < 600) lados.push(maior * 2);
  }
  const únicos = [...new Set(lados)];
  return únicos.map(tamanho).filter((e) => Math.min(e.largura, e.altura) >= LADO_MÍNIMO);
}

/** Grades de recortes (colunas × linhas) tentadas quando a imagem inteira não rende nada. */
const GRADES_DE_RECORTES = [[2, 1], [1, 2], [2, 2], [3, 1], [1, 3]];
const SOBREPOSIÇÃO_DOS_RECORTES = 0.25;

/** Copia um retângulo da imagem para uma imagem nova (RGBA). */
function recortar(imagem, x0, y0, largura, altura) {
  const dados = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y += 1) {
    const origem = ((y0 + y) * imagem.width + x0) * 4;
    dados.set(imagem.data.subarray(origem, origem + largura * 4), y * largura * 4);
  }
  return { data: dados, width: largura, height: altura };
}

/**
 * Texto de um achado da jsQR. A jsQR decodifica o modo "byte" só como UTF-8 e devolve vazio quando os bytes
 * não são UTF-8 válido (é o caso de QR Codes antigos e de geradores que gravam ISO-8859-1, como o do próprio
 * portal para "ç" e "á"). Esses bytes são lidos como ISO-8859-1, o padrão do formato QR, em vez de sumir.
 * @param {{data: string, chunks?: {type: string, text?: string, bytes?: number[]}[]}} resultado
 * @returns {string}
 */
export function textoDoAchado(resultado) {
  if (!Array.isArray(resultado.chunks)) return resultado.data;
  let texto = '';
  for (const parte of resultado.chunks) {
    if (parte.type === 'byte' && !parte.text && parte.bytes?.length) texto += String.fromCharCode(...parte.bytes);
    else texto += parte.text ?? '';
  }
  return texto;
}

/**
 * Acha os QR Codes de uma imagem com um decodificador que acha UM por vez: depois de cada achado, apaga a
 * área do código (pinta de branco) e procura de novo.
 */
function varrer(imagem, decodificarUm, máximo) {
  const { width, height } = imagem;
  const pixels = new Uint8ClampedArray(imagem.data); // cópia: a original não é alterada
  const achados = [];
  const textos = new Set();
  for (let tentativa = 0; tentativa < máximo * 2 && achados.length < máximo; tentativa += 1) {
    const código = decodificarUm(pixels, width, height);
    if (!código) break;
    const cantos = Object.values(código.location ?? {}).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
    const xs = cantos.map((p) => p.x);
    const ys = cantos.map((p) => p.y);
    const centro = cantos.length
      ? { x: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), y: Math.round(ys.reduce((a, b) => a + b, 0) / ys.length) }
      : { x: 0, y: 0 };
    if (!textos.has(código.data)) {
      textos.add(código.data);
      achados.push({ texto: código.data, centro });
    }
    if (!cantos.length) break; // sem posição não dá para apagar: parar evita laço infinito
    // Apaga o retângulo do código, com folga, para o decodificador achar o próximo.
    const folga = Math.round((Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys)) * 0.1) + 2;
    const x0 = Math.max(0, Math.floor(Math.min(...xs)) - folga);
    const x1 = Math.min(width - 1, Math.ceil(Math.max(...xs)) + folga);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)) - folga);
    const y1 = Math.min(height - 1, Math.ceil(Math.max(...ys)) + folga);
    for (let y = y0; y <= y1; y += 1) pixels.fill(255, (y * width + x0) * 4, (y * width + x1 + 1) * 4);
  }
  return achados;
}

/**
 * Acha todos os QR Codes de uma imagem (até `máximo`).
 *
 * A jsQR se confunde quando há vários códigos na mesma imagem (acha dezenas de cantos e não fecha nenhum).
 * Por isso, se a imagem inteira não render nada, a busca repete em recortes (metades, quartos, nonos, com
 * 25% de sobreposição) e junta o que achar. É melhor esforço: com vários códigos muito juntos, recortar um
 * por vez continua sendo o caminho mais seguro, e a tela diz isso.
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} imagem pixels RGBA
 * @param {(data: Uint8ClampedArray, largura: number, altura: number) => ({data: string, location: Record<string, {x: number, y: number}>} | null)} decodificarUm
 * @param {{máximo?: number, recortes?: boolean}} [opções]
 * @returns {{texto: string, centro: {x: number, y: number}}[]} sem repetir o mesmo texto
 */
export function procurarCódigos(imagem, decodificarUm, { máximo = MÁXIMO_DE_CÓDIGOS, recortes = true } = {}) {
  let achados = varrer(imagem, decodificarUm, máximo);
  if (achados.length || !recortes) return achados;

  const textos = new Set();
  for (const [colunas, linhas] of GRADES_DE_RECORTES) {
    const larguraBase = imagem.width / colunas;
    const alturaBase = imagem.height / linhas;
    const largura = Math.min(imagem.width, Math.round(larguraBase * (1 + (colunas > 1 ? SOBREPOSIÇÃO_DOS_RECORTES : 0))));
    const altura = Math.min(imagem.height, Math.round(alturaBase * (1 + (linhas > 1 ? SOBREPOSIÇÃO_DOS_RECORTES : 0))));
    if (Math.min(largura, altura) < 3 * LADO_MÍNIMO) continue; // recorte pequeno demais para caber um código legível
    for (let linha = 0; linha < linhas; linha += 1) {
      for (let coluna = 0; coluna < colunas; coluna += 1) {
        const x0 = Math.min(imagem.width - largura, Math.round(coluna * larguraBase - (coluna > 0 ? larguraBase * SOBREPOSIÇÃO_DOS_RECORTES / 2 : 0)));
        const y0 = Math.min(imagem.height - altura, Math.round(linha * alturaBase - (linha > 0 ? alturaBase * SOBREPOSIÇÃO_DOS_RECORTES / 2 : 0)));
        for (const achado of varrer(recortar(imagem, Math.max(0, x0), Math.max(0, y0), largura, altura), decodificarUm, máximo)) {
          if (textos.has(achado.texto)) continue;
          textos.add(achado.texto);
          achados.push({ texto: achado.texto, centro: { x: achado.centro.x + Math.max(0, x0), y: achado.centro.y + Math.max(0, y0) } });
          if (achados.length >= máximo) return achados;
        }
      }
    }
    if (achados.length) break; // esta grade já achou: as seguintes só repetiriam o trabalho
  }
  return achados;
}

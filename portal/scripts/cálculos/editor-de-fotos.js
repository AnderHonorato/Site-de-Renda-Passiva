/**
 * Editor de fotos (F184): conferência da foto, geometria (girar, espelhar, cortar, redimensionar) e ajuste de cores.
 *
 * Tudo aqui é cálculo puro, sem DOM, para dar para testar no Node. A tela (`ferramentas/editor-de-fotos.js`) só
 * desenha em canvas o que este módulo manda.
 *
 * Decisões que importam:
 * - A foto é reconhecida pelos BYTES, nunca pela extensão. As dimensões vêm do cabeçalho, ANTES de decodificar:
 *   um arquivo pequeno pode declarar dezenas de milhares de pixels de lado e travar a página só de abrir.
 * - A rotação EXIF (foto de celular "deitada") é lida do JPEG e entra nas dimensões. O navegador costuma aplicá-la
 *   sozinho ao decodificar; `matrizDeOrientação` existe para o caso de ele não aplicar.
 * - A ordem das operações é fixa e descrita ao usuário: girar, espelhar, cortar, redimensionar, e só então as cores.
 *   Os espelhamentos valem para o que se VÊ depois do giro (espelhar na horizontal troca esquerda e direita da
 *   imagem na tela, mesmo girada).
 * - O corte é guardado como margens em porcentagem do quadro girado. Girar ou espelhar leva as margens junto
 *   (`girarMargens`, `espelharMargens`), e o corte acompanha a imagem em vez de mudar de lugar.
 */
import { reconhecerArquivo, dimensõesDaImagem } from './scanner-de-qr-code.js';
import { nomeDeArquivo } from '../núcleo/exportar.js';

export const LIMITES = Object.freeze({
  bytes: 30 * 1024 * 1024,
  megapixels: 50,
  megapixelsDaSaída: 50,
  /** Maior lado aceito na saída: acima disso, vários navegadores recusam criar o canvas. */
  ladoMáximo: 16384,
  margemMáxima: 95,
  porcentagemMín: 1,
  porcentagemMáx: 400,
  qualidadeMín: 10,
  qualidadeMáx: 100,
});

export const FORMATOS_DE_SAÍDA = Object.freeze({
  jpg: { rótulo: 'JPG (menor, para fotos)', nome: 'JPG', tipo: 'image/jpeg', extensão: 'jpg', comQualidade: true },
  png: { rótulo: 'PNG (sem perda)', nome: 'PNG', tipo: 'image/png', extensão: 'png', comQualidade: false },
  webp: { rótulo: 'WebP (menor, moderno)', nome: 'WebP', tipo: 'image/webp', extensão: 'webp', comQualidade: true },
});

export const FILTROS = Object.freeze({ nenhum: 'Nenhum', pb: 'Preto e branco', sépia: 'Sépia' });
export const MODOS_DE_TAMANHO = Object.freeze({
  original: 'Manter o tamanho (depois do corte)',
  largura: 'Definir a largura (a altura acompanha)',
  altura: 'Definir a altura (a largura acompanha)',
  exato: 'Largura e altura exatas (pode distorcer)',
  porcentagem: 'Porcentagem do tamanho',
});

/** Proporções prontas do corte: valor, rótulo e a razão largura:altura. */
export const PROPORÇÕES = Object.freeze({
  livre: { rótulo: 'Livre (use as margens)' },
  '1:1': { rótulo: 'Quadrado (1:1)', razão: [1, 1] },
  '4:3': { rótulo: '4:3 (foto comum)', razão: [4, 3] },
  '3:2': { rótulo: '3:2 (câmera)', razão: [3, 2] },
  '16:9': { rótulo: '16:9 (tela, vídeo)', razão: [16, 9] },
  '4:5': { rótulo: '4:5 (retrato, redes sociais)', razão: [4, 5] },
  '3:4': { rótulo: '3:4 (retrato)', razão: [3, 4] },
  '2:3': { rótulo: '2:3 (retrato de câmera)', razão: [2, 3] },
  '9:16': { rótulo: '9:16 (história, tela cheia)', razão: [9, 16] },
});

/** Erro de regra de negócio com o campo da tela que precisa ser corrigido. */
export class ErroDeEdição extends Error {
  /** @param {string} mensagem @param {string} [campo] */
  constructor(mensagem, campo) {
    super(mensagem);
    this.name = 'ErroDeEdição';
    this.campo = campo;
  }
}

const número = (n) => n.toLocaleString('pt-BR');
const megapixelsDe = (largura, altura) => (largura * altura) / 1_000_000;
const textoDeMp = (largura, altura) => megapixelsDe(largura, altura).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/* ------------------------------------------------------------------ a foto */

const NOMES_DE_TIPO = {
  pdf: 'um PDF', zip: 'um arquivo ZIP', svg: 'uma imagem SVG (desenho vetorial)', heic: 'uma foto HEIC (formato do iPhone)',
  texto: 'um arquivo de texto', desconhecido: 'um arquivo que não reconheço',
};

/**
 * Orientação EXIF (1 a 8) de um JPEG. Devolve 1 (sem giro) quando não há EXIF ou ele está estragado: um EXIF
 * hostil nunca derruba a leitura, só deixa a foto como está.
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function lerOrientaçãoExif(bytes) {
  if (!(bytes.length > 12 && bytes[0] === 0xFF && bytes[1] === 0xD8)) return 1;
  let i = 2;
  // Os segmentos de metadados ficam no começo; passar de 64 KB sem achar o EXIF é desistir.
  while (i + 4 < bytes.length && i < 65_536) {
    if (bytes[i] !== 0xFF) return 1;
    const marcador = bytes[i + 1];
    if (marcador === 0xFF) { i += 1; continue; }
    if (marcador === 0xDA || marcador === 0xD9) return 1;
    const tamanho = (bytes[i + 2] << 8) | bytes[i + 3];
    if (tamanho < 2) return 1;
    if (marcador === 0xE1 && String.fromCharCode(...bytes.subarray(i + 4, i + 10)) === 'Exif\0\0') {
      return orientaçãoDoTiff(bytes, i + 10, Math.min(bytes.length, i + 2 + tamanho));
    }
    i += 2 + tamanho;
  }
  return 1;
}

function orientaçãoDoTiff(bytes, início, fim) {
  if (início + 8 > fim) return 1;
  const pequenoNoFim = bytes[início] === 0x49 && bytes[início + 1] === 0x49;
  const grandeNoFim = bytes[início] === 0x4D && bytes[início + 1] === 0x4D;
  if (!pequenoNoFim && !grandeNoFim) return 1;
  const u16 = (o) => (pequenoNoFim ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
  const u32 = (o) => (pequenoNoFim
    ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
    : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0);
  if (u16(início + 2) !== 0x2A) return 1;
  const ifd = início + u32(início + 4);
  if (ifd + 2 > fim) return 1;
  const entradas = Math.min(u16(ifd), 256);
  for (let n = 0; n < entradas; n += 1) {
    const e = ifd + 2 + n * 12;
    if (e + 12 > fim) return 1;
    if (u16(e) === 0x0112) {
      const valor = u16(e + 8);
      return valor >= 1 && valor <= 8 ? valor : 1;
    }
  }
  return 1;
}

/** Dimensões depois de aplicar a orientação EXIF (de 5 a 8, o quadro fica deitado). */
export function dimensõesOrientadas(largura, altura, orientação = 1) {
  return orientação >= 5 && orientação <= 8 ? { largura: altura, altura: largura } : { largura, altura };
}

/**
 * Matriz que leva a foto como está gravada à foto "em pé" (EXIF 1 a 8). Só é usada quando o navegador não
 * aplica a orientação sozinho ao decodificar.
 * @returns {number[]} [a, b, c, d, e, f] no formato de `setTransform`
 */
export function matrizDeOrientação(orientação, largura, altura) {
  const w = largura;
  const h = altura;
  switch (orientação) {
    case 2: return [-1, 0, 0, 1, w, 0];
    case 3: return [-1, 0, 0, -1, w, h];
    case 4: return [1, 0, 0, -1, 0, h];
    case 5: return [0, 1, 1, 0, 0, 0];
    case 6: return [0, 1, -1, 0, h, 0];
    case 7: return [0, -1, -1, 0, h, w];
    case 8: return [0, -1, 1, 0, 0, w];
    default: return [1, 0, 0, 1, 0, 0];
  }
}

/**
 * Confere se o arquivo é uma foto que dá para editar, ANTES de decodificar.
 * @param {Uint8Array} bytes conteúdo inteiro do arquivo
 * @returns {{ok: true, tipo: string, largura: number, altura: number, orientação: number, brutas: {largura: number, altura: number}}
 *   | {ok: false, motivo: string, mensagem: string}}
 */
export function conferirFoto(bytes) {
  if (!bytes || bytes.length === 0) return { ok: false, motivo: 'vazio', mensagem: 'O arquivo está vazio.' };
  if (bytes.length > LIMITES.bytes) {
    return { ok: false, motivo: 'grande', mensagem: `A foto passa de ${LIMITES.bytes / 1024 / 1024} MB. Reduza o tamanho do arquivo (pelo app de fotos, por exemplo) e tente de novo.` };
  }
  const reconhecido = reconhecerArquivo(bytes);
  if ('outro' in reconhecido) {
    const dica = reconhecido.outro === 'heic' ? ' Salve a foto como JPG (no iPhone, em Ajustes > Câmera > Formatos, escolha "Mais compatível") e tente de novo.'
      : reconhecido.outro === 'svg' ? ' Use uma foto em JPG, PNG ou WebP.'
        : reconhecido.outro === 'pdf' ? ' Para editar uma página, converta-a antes em imagem com "PDF para JPG".'
          : ' Escolha uma foto em JPG, PNG, WebP, GIF, BMP ou AVIF.';
    return { ok: false, motivo: 'tipo', mensagem: `Este arquivo é ${NOMES_DE_TIPO[reconhecido.outro]}, não uma foto que eu consiga abrir.${dica}` };
  }
  const { imagem } = reconhecido;
  const medidas = dimensõesDaImagem(bytes, imagem);
  if (!medidas) {
    return { ok: false, motivo: 'corrompido', mensagem: 'Não consegui ler o cabeçalho da foto: o arquivo parece corrompido ou incompleto.' };
  }
  if (medidas.largura * medidas.altura > LIMITES.megapixels * 1_000_000) {
    return {
      ok: false, motivo: 'megapixels',
      mensagem: `A foto tem ${número(medidas.largura)} × ${número(medidas.altura)} pixels (${textoDeMp(medidas.largura, medidas.altura)} megapixels). O limite é ${LIMITES.megapixels} megapixels, para o navegador não travar. Reduza a foto antes e tente de novo.`,
    };
  }
  const orientação = imagem === 'jpeg' ? lerOrientaçãoExif(bytes) : 1;
  const orientada = dimensõesOrientadas(medidas.largura, medidas.altura, orientação);
  return { ok: true, tipo: imagem, largura: orientada.largura, altura: orientada.altura, orientação, brutas: medidas };
}

/* ------------------------------------------------------------------ margens do corte */

/** @typedef {{esquerda: number, topo: number, direita: number, base: number}} Margens */

/** Gira as margens junto com a imagem. `sentido` 1 = horário, -1 = anti-horário. */
export function girarMargens(m, sentido) {
  return sentido > 0
    ? { esquerda: m.base, topo: m.esquerda, direita: m.topo, base: m.direita }
    : { esquerda: m.topo, topo: m.direita, direita: m.base, base: m.esquerda };
}

/** Espelha as margens junto com a imagem. `eixo` 'h' troca esquerda e direita; 'v', topo e base. */
export function espelharMargens(m, eixo) {
  return eixo === 'h'
    ? { ...m, esquerda: m.direita, direita: m.esquerda }
    : { ...m, topo: m.base, base: m.topo };
}

const arredondar = (n) => Math.round(n * 10_000) / 10_000;

/**
 * Margens de um corte centralizado na proporção pedida, o maior possível dentro do quadro.
 * @param {{largura: number, altura: number}} quadro tamanho do quadro já girado
 * @param {[number, number]} razão largura e altura da proporção
 * @returns {Margens}
 */
export function margensDeProporção(quadro, razão) {
  const alvo = razão[0] / razão[1];
  let largura = quadro.largura;
  let altura = quadro.altura;
  if (quadro.largura / quadro.altura > alvo) largura = quadro.altura * alvo;
  else altura = quadro.largura / alvo;
  const lado = ((quadro.largura - largura) / 2 / quadro.largura) * 100;
  const alto = ((quadro.altura - altura) / 2 / quadro.altura) * 100;
  return { esquerda: arredondar(lado), topo: arredondar(alto), direita: arredondar(lado), base: arredondar(alto) };
}

/**
 * Margens de um retângulo escolhido na imagem (em pixels do quadro girado). Aceita os cantos em qualquer ordem.
 * @returns {Margens}
 */
export function margensDeRetângulo(quadro, { x0, y0, x1, y1 }) {
  const limitar = (v, máx) => Math.min(máx, Math.max(0, v));
  const esquerda = limitar(Math.min(x0, x1), quadro.largura);
  const direita = limitar(Math.max(x0, x1), quadro.largura);
  const topo = limitar(Math.min(y0, y1), quadro.altura);
  const base = limitar(Math.max(y0, y1), quadro.altura);
  return {
    esquerda: arredondar((esquerda / quadro.largura) * 100),
    topo: arredondar((topo / quadro.altura) * 100),
    direita: arredondar(((quadro.largura - direita) / quadro.largura) * 100),
    base: arredondar(((quadro.altura - base) / quadro.altura) * 100),
  };
}

/* ------------------------------------------------------------------ giro e espelho do que se vê */

// Matrizes 2×2 [a, b, c, d] no quadro centrado, com o y para baixo: (x', y') = (a·x + b·y, c·x + d·y).
const GIRO_2X2 = { 0: [1, 0, 0, 1], 90: [0, -1, 1, 0], 180: [-1, 0, 0, -1], 270: [0, 1, -1, 0] };
const ESPELHO_H_2X2 = [-1, 0, 0, 1];
const ESPELHO_V_2X2 = [1, 0, 0, -1];
const multiplicar2x2 = (A, B) => [
  A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
  A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3],
];
const visãoEmMatriz = (e) => {
  let m = GIRO_2X2[e.giro];
  if (e.espelharH) m = multiplicar2x2(ESPELHO_H_2X2, m);
  if (e.espelharV) m = multiplicar2x2(ESPELHO_V_2X2, m);
  return m;
};

/**
 * Aplica uma operação ao que a pessoa vê (girar a imagem que está na tela, espelhar a imagem que está na tela) e
 * devolve o novo estado. Girar depois de espelhar NÃO é só somar 90° ao giro: o espelho muda o sentido do giro. Por
 * isso a conta é feita com matrizes e o resultado volta à forma canônica (giro e espelho na horizontal).
 * @param {{giro: number, espelharH: boolean, espelharV: boolean}} estado
 * @param {'girar-horário'|'girar-anti'|'espelhar-h'|'espelhar-v'} operação
 * @returns {{giro: number, espelharH: boolean, espelharV: false}}
 */
export function aplicarOperação(estado, operação) {
  const operações = { 'girar-horário': GIRO_2X2[90], 'girar-anti': GIRO_2X2[270], 'espelhar-h': ESPELHO_H_2X2, 'espelhar-v': ESPELHO_V_2X2 };
  if (!Object.hasOwn(operações, operação)) throw new ErroDeEdição('Operação desconhecida.');
  const alvo = multiplicar2x2(operações[operação], visãoEmMatriz(estado));
  for (const giro of [0, 90, 180, 270]) {
    for (const espelharH of [false, true]) {
      const candidato = visãoEmMatriz({ giro, espelharH, espelharV: false });
      if (candidato.every((v, i) => v === alvo[i])) return { giro, espelharH, espelharV: false };
    }
  }
  throw new ErroDeEdição('Não foi possível combinar o giro com o espelho.');
}

/* ------------------------------------------------------------------ ajustes validados */

export const AJUSTES_PADRÃO = Object.freeze({
  giro: 0,
  espelharH: false,
  espelharV: false,
  recorte: Object.freeze({ esquerda: 0, topo: 0, direita: 0, base: 0 }),
  brilho: 0,
  contraste: 0,
  saturação: 0,
  temperatura: 0,
  filtro: 'nenhum',
  tamanho: Object.freeze({ modo: 'original', largura: null, altura: null, porcentagem: 100 }),
  formato: 'jpg',
  qualidade: 90,
});

function lerDecimal(valor, campo, rótulo, mín, máx, unidade = '') {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new ErroDeEdição(`${rótulo} precisa ser um número.`, campo);
  if (valor < mín || valor > máx) throw new ErroDeEdição(`${rótulo} precisa estar entre ${número(mín)}${unidade} e ${número(máx)}${unidade}.`, campo);
  return valor;
}

function lerLado(valor, campo, rótulo) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new ErroDeEdição(`${rótulo} precisa ser um número, em pixels.`, campo);
  if (!Number.isInteger(valor)) throw new ErroDeEdição(`${rótulo} precisa ser um número inteiro de pixels.`, campo);
  if (valor < 1) throw new ErroDeEdição(`${rótulo} precisa ser de pelo menos 1 pixel.`, campo);
  if (valor > LIMITES.ladoMáximo) throw new ErroDeEdição(`${rótulo} passa do limite de ${número(LIMITES.ladoMáximo)} pixels.`, campo);
  return valor;
}

/**
 * Valida os ajustes e calcula o que deriva deles: o quadro girado, o retângulo de corte (em pixels do quadro
 * girado), o tamanho da saída e a matriz de desenho.
 * @param {object} entrada ajustes no formato de AJUSTES_PADRÃO (campos que faltam usam o padrão)
 * @param {{largura: number, altura: number}} origem tamanho da foto já em pé (com a orientação EXIF aplicada)
 * @throws {ErroDeEdição}
 */
export function normalizarAjustes(entrada, origem) {
  if (!entrada || typeof entrada !== 'object') throw new ErroDeEdição('Não há ajustes para aplicar.');
  if (!origem || !(origem.largura >= 1) || !(origem.altura >= 1)) throw new ErroDeEdição('Escolha uma foto primeiro.', 'arquivo');
  const a = { ...AJUSTES_PADRÃO, ...entrada, recorte: { ...AJUSTES_PADRÃO.recorte, ...entrada.recorte }, tamanho: { ...AJUSTES_PADRÃO.tamanho, ...entrada.tamanho } };

  if (![0, 90, 180, 270].includes(a.giro)) throw new ErroDeEdição('O giro precisa ser 0, 90, 180 ou 270 graus.', 'giro');
  if (typeof a.espelharH !== 'boolean' || typeof a.espelharV !== 'boolean') throw new ErroDeEdição('O espelhamento precisa ser sim ou não.', 'giro');
  if (!Object.hasOwn(FILTROS, a.filtro)) throw new ErroDeEdição('Escolha um dos filtros da lista.', 'filtro');
  if (!Object.hasOwn(FORMATOS_DE_SAÍDA, a.formato)) throw new ErroDeEdição('Escolha JPG, PNG ou WebP.', 'formato');
  if (!Object.hasOwn(MODOS_DE_TAMANHO, a.tamanho.modo)) throw new ErroDeEdição('Escolha como redimensionar.', 'redimensionar');

  const brilho = lerDecimal(a.brilho, 'brilho', 'O brilho', -100, 100);
  const contraste = lerDecimal(a.contraste, 'contraste', 'O contraste', -100, 100);
  const saturação = lerDecimal(a.saturação, 'saturação', 'A saturação', -100, 100);
  const temperatura = lerDecimal(a.temperatura, 'temperatura', 'A temperatura', -100, 100);
  const qualidade = lerDecimal(a.qualidade, 'qualidade', 'A qualidade', LIMITES.qualidadeMín, LIMITES.qualidadeMáx);

  const trabalho = a.giro % 180 === 0 ? { largura: origem.largura, altura: origem.altura } : { largura: origem.altura, altura: origem.largura };

  const nomesDasMargens = [['esquerda', 'margemEsquerda', 'A margem da esquerda'], ['topo', 'margemTopo', 'A margem de cima'],
    ['direita', 'margemDireita', 'A margem da direita'], ['base', 'margemBase', 'A margem de baixo']];
  const margens = {};
  for (const [lado, campo, rótulo] of nomesDasMargens) {
    margens[lado] = lerDecimal(a.recorte[lado], campo, rótulo, 0, LIMITES.margemMáxima, '%');
  }
  // As bordas são arredondadas, não as margens: assim margens simétricas dão um corte simétrico.
  const x = Math.round((trabalho.largura * margens.esquerda) / 100);
  const fimX = Math.round((trabalho.largura * (100 - margens.direita)) / 100);
  const y = Math.round((trabalho.altura * margens.topo) / 100);
  const fimY = Math.round((trabalho.altura * (100 - margens.base)) / 100);
  if (fimX - x < 1) throw new ErroDeEdição('As margens da esquerda e da direita juntas cobrem a foto inteira: não sobra imagem. Diminua uma delas.', 'margemEsquerda');
  if (fimY - y < 1) throw new ErroDeEdição('As margens de cima e de baixo juntas cobrem a foto inteira: não sobra imagem. Diminua uma delas.', 'margemTopo');
  const recorte = { x, y, largura: fimX - x, altura: fimY - y };

  const saída = calcularSaída(recorte, a.tamanho);
  if (saída.largura * saída.altura > LIMITES.megapixelsDaSaída * 1_000_000) {
    throw new ErroDeEdição(`O tamanho final (${número(saída.largura)} × ${número(saída.altura)} px, ${textoDeMp(saída.largura, saída.altura)} megapixels) passa do limite de ${LIMITES.megapixelsDaSaída} megapixels. Diminua o tamanho.`, campoDoTamanho(a.tamanho.modo));
  }

  const resultado = {
    giro: a.giro, espelharH: a.espelharH, espelharV: a.espelharV, recorte: margens, brilho, contraste, saturação, temperatura, filtro: a.filtro,
    tamanho: a.tamanho, formato: a.formato, qualidade, origem: { largura: origem.largura, altura: origem.altura }, trabalho, corte: recorte, saída,
  };
  resultado.matriz = matrizDeDesenho(origem.largura, origem.altura, resultado);
  return resultado;
}

function campoDoTamanho(modo) {
  return { largura: 'larguraPx', altura: 'alturaPx', exato: 'larguraPx', porcentagem: 'porcentagem' }[modo] ?? 'redimensionar';
}

function calcularSaída(recorte, tamanho) {
  const { modo } = tamanho;
  if (modo === 'original') return { largura: recorte.largura, altura: recorte.altura };
  if (modo === 'porcentagem') {
    const p = lerDecimal(tamanho.porcentagem, 'porcentagem', 'A porcentagem', LIMITES.porcentagemMín, LIMITES.porcentagemMáx, '%');
    return conferirLados(Math.max(1, Math.round((recorte.largura * p) / 100)), Math.max(1, Math.round((recorte.altura * p) / 100)), modo);
  }
  if (modo === 'largura') {
    const l = lerLado(tamanho.largura, 'larguraPx', 'A largura');
    return conferirLados(l, Math.max(1, Math.round((l * recorte.altura) / recorte.largura)), modo);
  }
  if (modo === 'altura') {
    const alto = lerLado(tamanho.altura, 'alturaPx', 'A altura');
    return conferirLados(Math.max(1, Math.round((alto * recorte.largura) / recorte.altura)), alto, modo);
  }
  return { largura: lerLado(tamanho.largura, 'larguraPx', 'A largura'), altura: lerLado(tamanho.altura, 'alturaPx', 'A altura') };
}

/** O lado calculado pela proporção também precisa caber no limite do canvas. */
function conferirLados(largura, altura, modo) {
  if (largura > LIMITES.ladoMáximo || altura > LIMITES.ladoMáximo) {
    throw new ErroDeEdição(`O tamanho final (${número(largura)} × ${número(altura)} px) tem um lado maior que ${número(LIMITES.ladoMáximo)} pixels. Diminua o tamanho.`, campoDoTamanho(modo));
  }
  return { largura, altura };
}

/* ------------------------------------------------------------------ matrizes */

/** Composição de matrizes 2D: o resultado aplica `antes` e depois `depois`. Formato [a, b, c, d, e, f] de `setTransform`. */
export function compor(depois, antes) {
  const [a1, b1, c1, d1, e1, f1] = depois;
  const [a2, b2, c2, d2, e2, f2] = antes;
  // O "+ 0" troca -0 por 0, que só atrapalharia quem compara matrizes.
  return [
    a1 * a2 + c1 * b2 + 0, b1 * a2 + d1 * b2 + 0,
    a1 * c2 + c1 * d2 + 0, b1 * c2 + d1 * d2 + 0,
    a1 * e2 + c1 * f2 + e1 + 0, b1 * e2 + d1 * f2 + f1 + 0,
  ];
}

/** Aplica a matriz a um ponto. */
export function aplicarMatriz(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Matriz que leva um ponto da foto original para um ponto da saída: gira, espelha, corta e dimensiona, nesta ordem.
 * @param {number} largura largura da foto em pé
 * @param {number} altura altura da foto em pé
 * @param {{giro: number, espelharH: boolean, espelharV: boolean, trabalho: {largura: number, altura: number}, corte: {x: number, y: number, largura: number, altura: number}, saída: {largura: number, altura: number}}} a
 */
export function matrizDeDesenho(largura, altura, a) {
  const giros = {
    0: [1, 0, 0, 1, 0, 0],
    90: [0, 1, -1, 0, altura, 0],
    180: [-1, 0, 0, -1, largura, altura],
    270: [0, -1, 1, 0, 0, largura],
  };
  let m = giros[a.giro];
  // Os espelhos são aplicados ao quadro já girado: espelhar "na horizontal" vale para o que se vê.
  if (a.espelharH) m = compor([-1, 0, 0, 1, a.trabalho.largura, 0], m);
  if (a.espelharV) m = compor([1, 0, 0, -1, 0, a.trabalho.altura], m);
  m = compor([1, 0, 0, 1, -a.corte.x, -a.corte.y], m);
  m = compor([a.saída.largura / a.corte.largura, 0, 0, a.saída.altura / a.corte.altura, 0, 0], m);
  return m;
}

/* ------------------------------------------------------------------ cores */

const fixar = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * Tabela de 256 entradas do brilho e do contraste. O contraste é a fórmula clássica de fator em torno do cinza
 * médio (128); o brilho soma um deslocamento antes dele. Em -100 de contraste tudo vira cinza médio.
 * @returns {Uint8Array}
 */
export function tabelaDeTons(brilho, contraste) {
  const deslocamento = brilho * 2.55;
  const c = contraste * 2.55;
  const fator = (259 * (c + 255)) / (255 * (259 - c));
  const tabela = new Uint8Array(256);
  for (let v = 0; v < 256; v += 1) tabela[v] = fixar(fator * (v + deslocamento - 128) + 128);
  return tabela;
}

/** Diz se os ajustes de cor não mudam nenhum pixel (nesse caso nem se lê a imagem). */
export function coresNeutras(a) {
  return a.brilho === 0 && a.contraste === 0 && a.saturação === 0 && a.temperatura === 0 && a.filtro === 'nenhum';
}

/**
 * Aplica brilho, contraste, temperatura, saturação e filtro aos pixels RGBA, no lugar. O alfa não muda.
 * Aceita qualquer pedaço da imagem: dá para processar em faixas para não segurar tudo na memória.
 * @param {Uint8ClampedArray|Uint8Array} dados
 * @param {{brilho: number, contraste: number, saturação: number, temperatura: number, filtro: string}} a
 */
export function ajustarPixels(dados, a) {
  if (coresNeutras(a)) return dados;
  const tons = tabelaDeTons(a.brilho, a.contraste);
  const calor = a.temperatura * 0.4;
  const k = a.filtro === 'pb' ? 0 : 1 + a.saturação / 100;
  const sépia = a.filtro === 'sépia';
  for (let i = 0; i + 3 < dados.length; i += 4) {
    let r = tons[dados[i]] + calor;
    let g = tons[dados[i + 1]];
    let b = tons[dados[i + 2]] - calor;
    if (calor !== 0) { r = fixar(r); b = fixar(b); }
    if (k !== 1) {
      const cinza = 0.299 * r + 0.587 * g + 0.114 * b;
      r = cinza + (r - cinza) * k;
      g = cinza + (g - cinza) * k;
      b = cinza + (b - cinza) * k;
    }
    if (sépia) {
      const r2 = 0.393 * r + 0.769 * g + 0.189 * b;
      const g2 = 0.349 * r + 0.686 * g + 0.168 * b;
      const b2 = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r2; g = g2; b = b2;
    }
    dados[i] = fixar(r);
    dados[i + 1] = fixar(g);
    dados[i + 2] = fixar(b);
  }
  return dados;
}

/* ------------------------------------------------------------------ texto da tela */

/** Lista legível do que foi feito na foto, para o resultado. */
export function descreverAjustes(a) {
  const itens = [];
  if (a.giro) itens.push(`girada ${a.giro}° no sentido horário`);
  if (a.espelharH) itens.push('espelhada na horizontal');
  if (a.espelharV) itens.push('espelhada na vertical');
  if (a.corte.largura !== a.trabalho.largura || a.corte.altura !== a.trabalho.altura) itens.push(`cortada para ${número(a.corte.largura)} × ${número(a.corte.altura)} px`);
  if (a.saída.largura !== a.corte.largura || a.saída.altura !== a.corte.altura) itens.push(`redimensionada para ${número(a.saída.largura)} × ${número(a.saída.altura)} px`);
  const sinal = (n) => (n > 0 ? `+${número(n)}` : número(n));
  if (a.brilho) itens.push(`brilho ${sinal(a.brilho)}`);
  if (a.contraste) itens.push(`contraste ${sinal(a.contraste)}`);
  if (a.saturação) itens.push(`saturação ${sinal(a.saturação)}`);
  if (a.temperatura) itens.push(`temperatura ${sinal(a.temperatura)}`);
  if (a.filtro !== 'nenhum') itens.push(`filtro ${FILTROS[a.filtro].toLowerCase()}`);
  return itens;
}

/** Nome do arquivo de saída: o original, sem extensão, mais "-editada". */
export function nomeDaSaída(nomeOriginal, formato) {
  const semExtensão = String(nomeOriginal ?? '').replace(/\.[^.]*$/, '');
  const base = semExtensão.trim() ? nomeDeArquivo(semExtensão) : 'foto';
  return `${base}-editada.${FORMATOS_DE_SAÍDA[formato].extensão}`;
}

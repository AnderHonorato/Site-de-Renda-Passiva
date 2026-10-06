/**
 * Criar GIF (F185): paleta de cores, codificador GIF89a próprio (LZW) e planejamento do que cabe, sem biblioteca.
 *
 * Tudo aqui é cálculo puro, sem DOM, para dar para testar no Node e rodar dentro de um Web Worker. A tela
 * (`ferramentas/criar-gif.js`) decodifica as imagens, desenha cada uma no tamanho final e entrega os pixels para cá.
 *
 * Decisões que importam:
 * - UMA paleta para o GIF inteiro (global), montada com as cores de todos os quadros (corte pela mediana). Paleta única
 *   evita o "pisca-pisca" de cores entre quadros e deixa o arquivo menor que uma paleta por quadro.
 * - O codificador LZW é a versão clássica de tabela de 12 bits com código de limpeza (a de Ginsburg, a mesma que os
 *   leitores de GIF esperam). O teste confere o resultado com um DECODIFICADOR independente, escrito do zero a partir da
 *   especificação, e o teste de navegador confere com o decodificador do próprio navegador.
 * - Transparência: pixel com menos de 50% de opacidade vira o índice transparente (um índice da paleta fica reservado só
 *   quando alguma imagem tem transparência de verdade, para não gastar uma cor à toa).
 * - Tempo do quadro: o GIF guarda centésimos de segundo, e os navegadores tratam menos de 2 como 10. Por isso o mínimo é 20 ms.
 * - Limites explícitos (quadros, largura, total de pixels) para entrada hostil não derrubar a página, com mensagem que diz o
 *   que reduzir. O orçamento de pixels conta os quadros que vão para o arquivo, inclusive os repetidos da "ida e volta".
 */
import { conferirFoto } from './editor-de-fotos.js';

export const LIMITES = Object.freeze({
  quadrosMín: 2,
  quadrosMáx: 60,
  larguraMín: 16,
  larguraMáx: 1000,
  alturaMín: 8,
  alturaMáx: 2000,
  atrasoMínMs: 20,
  atrasoMáxMs: 10_000,
  /** Soma de largura × altura de todos os quadros gravados. 24 milhões de pixels = 96 MB de memória só nos pixels. */
  pixelsTotais: 24_000_000,
  /** Acima disso o arquivo é considerado pesado para mensagem e e-mail, e a tela avisa. */
  bytesPesado: 8 * 1024 * 1024,
  coresMáx: 256,
});

export const REPETIÇÕES = Object.freeze({ infinito: 'Para sempre', 1: 'Uma vez', 2: '2 vezes', 3: '3 vezes', 5: '5 vezes', 10: '10 vezes' });
export const AJUSTES = Object.freeze({ caber: 'Caber inteira (sobram faixas de fundo)', preencher: 'Preencher o quadro (corta as bordas)' });
export const FUNDOS = Object.freeze({ branco: 'Branco', preto: 'Preto', transparente: 'Transparente' });

/** Erro de regra de negócio com o campo da tela que precisa ser corrigido. */
export class ErroDeGif extends Error {
  /** @param {string} mensagem @param {string} [campo] */
  constructor(mensagem, campo) {
    super(mensagem);
    this.name = 'ErroDeGif';
    this.campo = campo;
  }
}

const número = (n) => n.toLocaleString('pt-BR');

/* ------------------------------------------------------------------ arquivos e planejamento */

/**
 * Confere uma imagem de entrada, pelo conteúdo, antes de decodificar. Mesmas regras do editor de fotos, com a
 * mensagem falando em "imagem".
 * @param {Uint8Array} bytes
 */
export function conferirImagemDoGif(bytes) {
  const r = conferirFoto(bytes);
  if (r.ok) return r;
  return { ...r, mensagem: r.mensagem.replace(/\bfoto\b/g, 'imagem').replace(/\bFoto\b/g, 'Imagem') };
}

/**
 * Onde desenhar uma imagem de outro formato dentro do quadro do GIF.
 * @param {{largura: number, altura: number}} origem
 * @param {{largura: number, altura: number}} destino
 * @param {'caber'|'preencher'} modo caber: cabe inteira, com faixas; preencher: cobre o quadro e corta o que sobra
 * @returns {{x: number, y: number, largura: number, altura: number}}
 */
export function retânguloDeDesenho(origem, destino, modo) {
  const fator = modo === 'preencher'
    ? Math.max(destino.largura / origem.largura, destino.altura / origem.altura)
    : Math.min(destino.largura / origem.largura, destino.altura / origem.altura);
  const largura = origem.largura * fator;
  const altura = origem.altura * fator;
  return { x: (destino.largura - largura) / 2, y: (destino.altura - altura) / 2, largura, altura };
}

/** Centésimos de segundo gravados para um tempo em milissegundos (nunca menos de 2, que o navegador trataria como 10). */
export const atrasoEmCentésimos = (ms) => Math.max(2, Math.round(ms / 10));

/**
 * Ordem em que os quadros entram no arquivo. Ida e volta: 0 1 2 3 2 1 (sem repetir as pontas, para não "engasgar").
 * @param {number} quantidade
 * @param {boolean} idaEVolta
 * @returns {number[]}
 */
export function sequênciaDosQuadros(quantidade, idaEVolta) {
  const ida = Array.from({ length: quantidade }, (_, i) => i);
  if (!idaEVolta || quantidade < 3) return idaEVolta && quantidade === 2 ? [0, 1] : ida;
  return [...ida, ...ida.slice(1, -1).reverse()];
}

/**
 * Valida as opções e calcula o que deriva delas.
 * @param {{
 *   quantidade: number, primeira: {largura: number, altura: number}, largura: number, atrasoMs: number,
 *   repetições: string, idaEVolta?: boolean, ajuste?: string, fundo?: string,
 * }} entrada
 * @throws {ErroDeGif}
 */
export function planejarGif(entrada) {
  const { quantidade, primeira, largura, atrasoMs, repetições, idaEVolta = false, ajuste = 'caber', fundo = 'branco' } = entrada;
  if (!Number.isInteger(quantidade) || quantidade < LIMITES.quadrosMín) {
    throw new ErroDeGif(`Escolha pelo menos ${LIMITES.quadrosMín} imagens: um GIF com uma imagem só não anima.`, 'arquivo');
  }
  if (quantidade > LIMITES.quadrosMáx) throw new ErroDeGif(`São ${quantidade} imagens e o limite é ${LIMITES.quadrosMáx}. Tire algumas da lista.`, 'arquivo');
  if (!primeira || !(primeira.largura >= 1) || !(primeira.altura >= 1)) throw new ErroDeGif('Não foi possível ler o tamanho da primeira imagem.', 'arquivo');
  if (typeof largura !== 'number' || !Number.isFinite(largura) || !Number.isInteger(largura)) throw new ErroDeGif('A largura precisa ser um número inteiro, em pixels.', 'largura');
  if (largura < LIMITES.larguraMín || largura > LIMITES.larguraMáx) throw new ErroDeGif(`A largura precisa estar entre ${LIMITES.larguraMín} e ${número(LIMITES.larguraMáx)} pixels.`, 'largura');
  if (typeof atrasoMs !== 'number' || !Number.isFinite(atrasoMs)) throw new ErroDeGif('O tempo de cada quadro precisa ser um número, em milissegundos.', 'atraso');
  if (atrasoMs < LIMITES.atrasoMínMs || atrasoMs > LIMITES.atrasoMáxMs) {
    throw new ErroDeGif(`O tempo de cada quadro precisa estar entre ${LIMITES.atrasoMínMs} e ${número(LIMITES.atrasoMáxMs)} milissegundos (o GIF guarda centésimos de segundo; menos que 20 ms viraria 100 ms nos navegadores).`, 'atraso');
  }
  if (repetições !== 'infinito' && !Object.hasOwn(REPETIÇÕES, repetições)) throw new ErroDeGif('Escolha quantas vezes o GIF se repete.', 'repetições');
  if (!Object.hasOwn(AJUSTES, ajuste)) throw new ErroDeGif('Escolha como encaixar as imagens de outro formato.', 'ajuste');
  if (!Object.hasOwn(FUNDOS, fundo)) throw new ErroDeGif('Escolha o fundo: branco, preto ou transparente.', 'fundo');

  const altura = Math.round((largura * primeira.altura) / primeira.largura);
  if (altura < LIMITES.alturaMín || altura > LIMITES.alturaMáx) {
    throw new ErroDeGif(`Com a largura de ${largura} pixels, a primeira imagem daria um GIF de ${largura} × ${número(altura)} pixels. A altura precisa ficar entre ${LIMITES.alturaMín} e ${número(LIMITES.alturaMáx)}: use outra largura ou outra imagem como primeira.`, 'largura');
  }
  const sequência = sequênciaDosQuadros(quantidade, idaEVolta);
  const pixels = sequência.length * largura * altura;
  if (pixels > LIMITES.pixelsTotais) {
    const máximo = Math.floor(Math.sqrt(LIMITES.pixelsTotais / (sequência.length * (altura / largura))));
    throw new ErroDeGif(`O GIF teria ${sequência.length} quadros de ${largura} × ${altura} pixels (${(pixels / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} milhões de pixels no total) e o limite é ${LIMITES.pixelsTotais / 1_000_000} milhões. Diminua a largura (até uns ${máximo} pixels serve) ou use menos imagens.`, 'largura');
  }
  return {
    largura, altura, sequência, quadros: sequência.length, atrasoCs: atrasoEmCentésimos(atrasoMs),
    repetições: repetições === 'infinito' ? 'infinito' : Number(repetições), ajuste, fundo, pixels,
    duraçãoMs: sequência.length * atrasoEmCentésimos(atrasoMs) * 10,
  };
}

/* ------------------------------------------------------------------ paleta */

const chaveDe = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

/** Menor potência de 2 (de 2 a 256) que comporta a quantidade de cores. */
export function tamanhoDaPaleta(quantidade) {
  let tamanho = 2;
  while (tamanho < quantidade) tamanho *= 2;
  return tamanho;
}

/**
 * Monta a paleta única e converte cada quadro em índices.
 * @param {Uint8ClampedArray[]} quadros pixels RGBA de cada quadro, todos de largura × altura
 * @param {number} largura
 * @param {number} altura
 * @param {{cores?: number, transparência?: boolean, suavizar?: boolean, aoProgredir?: (fração: number) => void}} [opções]
 *   `transparência`: pixel com alfa < 128 vira o índice transparente; `suavizar`: espalha o erro de cor (Floyd–Steinberg)
 * @returns {{paleta: Uint8Array, tamanho: number, indices: Uint8Array[], transparente: number, coresUsadas: number}}
 */
export function quantizar(quadros, largura, altura, { cores = LIMITES.coresMáx, transparência = false, suavizar = false, aoProgredir = () => {} } = {}) {
  const pixelsPorQuadro = largura * altura;
  if (!Array.isArray(quadros) || quadros.length === 0) throw new ErroDeGif('Não há quadros para converter.');
  for (const q of quadros) if (!q || q.length !== pixelsPorQuadro * 4) throw new ErroDeGif('Um dos quadros não tem o tamanho esperado.');

  // Há pixel transparente de verdade? Só então um índice da paleta fica reservado.
  let temTransparência = false;
  if (transparência) {
    procura: for (const q of quadros) {
      for (let i = 3; i < q.length; i += 4) if (q[i] < 128) { temTransparência = true; break procura; }
    }
  }
  const reservadas = temTransparência ? 1 : 0;
  const disponíveis = Math.max(2 - reservadas, Math.min(LIMITES.coresMáx, cores) - reservadas);

  // Histograma de 15 bits (5 por canal) com a soma real das cores de cada caixinha: a cor da paleta é a média verdadeira.
  const contagem = new Uint32Array(32768);
  const somaR = new Float64Array(32768);
  const somaG = new Float64Array(32768);
  const somaB = new Float64Array(32768);
  const salto = Math.max(1, Math.ceil((quadros.length * pixelsPorQuadro) / 4_000_000));
  for (const q of quadros) {
    for (let p = 0; p < pixelsPorQuadro; p += salto) {
      const i = p * 4;
      if (q[i + 3] < 128) continue;
      const chave = chaveDe(q[i], q[i + 1], q[i + 2]);
      contagem[chave] += 1;
      somaR[chave] += q[i];
      somaG[chave] += q[i + 1];
      somaB[chave] += q[i + 2];
    }
  }
  const ocupadas = [];
  for (let k = 0; k < 32768; k += 1) if (contagem[k] > 0) ocupadas.push(k);

  const cor = (chave) => (contagem[chave] > 0
    ? [somaR[chave] / contagem[chave], somaG[chave] / contagem[chave], somaB[chave] / contagem[chave]]
    : [((chave >> 10) << 3) | 4, (((chave >> 5) & 31) << 3) | 4, ((chave & 31) << 3) | 4]);

  /** @type {number[][]} cores da paleta (sem a transparente) */
  let cores3 = [];
  if (ocupadas.length === 0) cores3 = [[0, 0, 0]];
  else if (ocupadas.length <= disponíveis) cores3 = ocupadas.map((k) => cor(k).map(Math.round));
  else cores3 = cortePelaMediana(ocupadas, disponíveis, contagem, somaR, somaG, somaB);

  const total = cores3.length + reservadas;
  const tamanho = tamanhoDaPaleta(total);
  const paleta = new Uint8Array(tamanho * 3);
  cores3.forEach((c, i) => { paleta.set(c, (i + reservadas) * 3); });
  const transparente = temTransparência ? 0 : -1;
  const primeira = reservadas;
  const últimaUsada = total - 1;

  // Cor mais próxima de cada caixinha, calculada uma vez só.
  const cache = new Int16Array(32768).fill(-1);
  const maisPróxima = (r, g, b) => {
    let melhor = primeira;
    let menor = Infinity;
    for (let i = primeira; i <= últimaUsada; i += 1) {
      const dr = paleta[i * 3] - r;
      const dg = paleta[i * 3 + 1] - g;
      const db = paleta[i * 3 + 2] - b;
      const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
      if (d < menor) { menor = d; melhor = i; }
    }
    return melhor;
  };
  const índiceDaCaixinha = (chave) => {
    let i = cache[chave];
    if (i < 0) { const [r, g, b] = cor(chave); i = maisPróxima(r, g, b); cache[chave] = i; }
    return i;
  };

  const indices = [];
  const erroAtual = suavizar ? new Float32Array((largura + 2) * 3) : null;
  const erroSeguinte = suavizar ? new Float32Array((largura + 2) * 3) : null;
  quadros.forEach((q, n) => {
    const saída = new Uint8Array(pixelsPorQuadro);
    if (!suavizar) {
      for (let p = 0; p < pixelsPorQuadro; p += 1) {
        const i = p * 4;
        saída[p] = q[i + 3] < 128 ? Math.max(0, transparente) : índiceDaCaixinha(chaveDe(q[i], q[i + 1], q[i + 2]));
      }
    } else {
      erroAtual.fill(0);
      erroSeguinte.fill(0);
      let atual = erroAtual;
      let seguinte = erroSeguinte;
      for (let y = 0; y < altura; y += 1) {
        seguinte.fill(0);
        for (let x = 0; x < largura; x += 1) {
          const p = y * largura + x;
          const i = p * 4;
          if (q[i + 3] < 128) { saída[p] = Math.max(0, transparente); continue; }
          const e = (x + 1) * 3;
          const r = Math.min(255, Math.max(0, q[i] + atual[e]));
          const g = Math.min(255, Math.max(0, q[i + 1] + atual[e + 1]));
          const b = Math.min(255, Math.max(0, q[i + 2] + atual[e + 2]));
          const índice = índiceDaCaixinha(chaveDe(r | 0, g | 0, b | 0));
          saída[p] = índice;
          const er = r - paleta[índice * 3];
          const eg = g - paleta[índice * 3 + 1];
          const eb = b - paleta[índice * 3 + 2];
          // Floyd–Steinberg: 7/16 à direita, 3/16 embaixo à esquerda, 5/16 embaixo, 1/16 embaixo à direita.
          atual[e + 3] += (er * 7) / 16; atual[e + 4] += (eg * 7) / 16; atual[e + 5] += (eb * 7) / 16;
          seguinte[e - 3] += (er * 3) / 16; seguinte[e - 2] += (eg * 3) / 16; seguinte[e - 1] += (eb * 3) / 16;
          seguinte[e] += (er * 5) / 16; seguinte[e + 1] += (eg * 5) / 16; seguinte[e + 2] += (eb * 5) / 16;
          seguinte[e + 3] += er / 16; seguinte[e + 4] += eg / 16; seguinte[e + 5] += eb / 16;
        }
        [atual, seguinte] = [seguinte, atual];
      }
    }
    indices.push(saída);
    aoProgredir((n + 1) / quadros.length);
  });
  return { paleta, tamanho, indices, transparente, coresUsadas: total };
}

/** Corte pela mediana: divide a caixa de cores mais populosa e mais comprida até ter a quantidade pedida. */
function cortePelaMediana(chaves, quantidade, contagem, somaR, somaG, somaB) {
  const canais = [(k) => k >> 10, (k) => (k >> 5) & 31, (k) => k & 31];
  const medida = (lista) => {
    let total = 0;
    const mín = [31, 31, 31];
    const máx = [0, 0, 0];
    for (const k of lista) {
      total += contagem[k];
      for (let c = 0; c < 3; c += 1) {
        const v = canais[c](k);
        if (v < mín[c]) mín[c] = v;
        if (v > máx[c]) máx[c] = v;
      }
    }
    const faixas = [máx[0] - mín[0], máx[1] - mín[1], máx[2] - mín[2]];
    const canal = faixas.indexOf(Math.max(...faixas));
    return { lista, total, canal, faixa: faixas[canal] };
  };
  const caixas = [medida(chaves)];
  while (caixas.length < quantidade) {
    let escolhida = -1;
    let prioridade = -1;
    caixas.forEach((c, i) => {
      if (c.lista.length < 2) return;
      const p = c.total * (c.faixa + 1);
      if (p > prioridade) { prioridade = p; escolhida = i; }
    });
    if (escolhida < 0) break;
    const { lista, canal, total } = caixas[escolhida];
    const ordenada = [...lista].sort((a, b) => canais[canal](a) - canais[canal](b) || a - b);
    let acumulado = 0;
    let corte = 1;
    for (let i = 0; i < ordenada.length - 1; i += 1) {
      acumulado += contagem[ordenada[i]];
      corte = i + 1;
      if (acumulado >= total / 2) break;
    }
    caixas.splice(escolhida, 1, medida(ordenada.slice(0, corte)), medida(ordenada.slice(corte)));
  }
  return caixas.map(({ lista }) => {
    let n = 0; let r = 0; let g = 0; let b = 0;
    for (const k of lista) { n += contagem[k]; r += somaR[k]; g += somaG[k]; b += somaB[k]; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}

/* ------------------------------------------------------------------ LZW e arquivo */

/**
 * Compressão LZW do GIF (tabela de até 12 bits, com códigos de limpeza), na versão clássica de Ginsburg.
 * @param {Uint8Array} indices um índice de paleta por pixel
 * @param {number} profundidade bits por índice da paleta (2 a 8): o "tamanho mínimo do código" do GIF
 * @returns {Uint8Array} os bytes comprimidos, ainda sem a divisão em sub-blocos
 */
export function comprimirLzw(indices, profundidade) {
  const BITS = 12;
  const TAMANHO_DA_TABELA = 5003;
  const MAIOR_CÓDIGO = 1 << BITS;
  const bitsIniciais = profundidade + 1;
  const limpeza = 1 << profundidade;
  const fim = limpeza + 1;
  const chaves = new Int32Array(TAMANHO_DA_TABELA);
  const códigos = new Int32Array(TAMANHO_DA_TABELA);
  chaves.fill(-1);

  let saída = new Uint8Array(Math.max(1024, indices.length >> 1));
  let tamanhoDaSaída = 0;
  const gravar = (byte) => {
    if (tamanhoDaSaída === saída.length) { const maior = new Uint8Array(saída.length * 2); maior.set(saída); saída = maior; }
    saída[tamanhoDaSaída] = byte;
    tamanhoDaSaída += 1;
  };

  let bits = bitsIniciais;
  let códigoMáximo = (1 << bits) - 1;
  let próximo = limpeza + 2;
  let acumulador = 0;
  let bitsNoAcumulador = 0;
  let limpar = false;

  const emitir = (código) => {
    acumulador |= código << bitsNoAcumulador;
    bitsNoAcumulador += bits;
    while (bitsNoAcumulador >= 8) {
      gravar(acumulador & 0xFF);
      acumulador >>>= 8;
      bitsNoAcumulador -= 8;
    }
    // O tamanho do código cresce depois de gravar o código que preencheu a tabela atual.
    if (próximo > códigoMáximo || limpar) {
      if (limpar) {
        bits = bitsIniciais;
        códigoMáximo = (1 << bits) - 1;
        limpar = false;
      } else {
        bits += 1;
        códigoMáximo = bits === BITS ? MAIOR_CÓDIGO : (1 << bits) - 1;
      }
    }
    if (código === fim) {
      while (bitsNoAcumulador > 0) {
        gravar(acumulador & 0xFF);
        acumulador >>>= 8;
        bitsNoAcumulador -= 8;
      }
    }
  };
  const reiniciarTabela = () => {
    chaves.fill(-1);
    próximo = limpeza + 2;
    limpar = true;
    emitir(limpeza);
  };

  emitir(limpeza);
  if (indices.length === 0) { emitir(fim); return saída.subarray(0, tamanhoDaSaída); }
  let prefixo = indices[0];
  for (let p = 1; p < indices.length; p += 1) {
    const c = indices[p];
    const chave = (c << BITS) + prefixo;
    let i = (c << 4) ^ prefixo;
    i %= TAMANHO_DA_TABELA;
    let achou = false;
    if (chaves[i] === chave) { prefixo = códigos[i]; continue; }
    if (chaves[i] >= 0) {
      const deslocamento = i === 0 ? 1 : TAMANHO_DA_TABELA - i;
      do {
        i -= deslocamento;
        if (i < 0) i += TAMANHO_DA_TABELA;
        if (chaves[i] === chave) { prefixo = códigos[i]; achou = true; break; }
      } while (chaves[i] >= 0);
    }
    if (achou) continue;
    emitir(prefixo);
    prefixo = c;
    if (próximo < MAIOR_CÓDIGO) {
      códigos[i] = próximo;
      próximo += 1;
      chaves[i] = chave;
    } else {
      reiniciarTabela();
    }
  }
  emitir(prefixo);
  emitir(fim);
  return saída.subarray(0, tamanhoDaSaída);
}

const u16 = (n) => [n & 0xFF, (n >> 8) & 0xFF];

/**
 * Monta o arquivo GIF89a.
 * @param {{
 *   largura: number, altura: number, paleta: Uint8Array, tamanho: number, quadros: {indices: Uint8Array, atrasoCs: number}[],
 *   repetições: 'infinito'|number, transparente?: number,
 * }} gif
 * @returns {Uint8Array}
 */
export function escreverGif({ largura, altura, paleta, tamanho, quadros, repetições, transparente = -1 }) {
  if (!(largura >= 1 && largura <= 65535 && altura >= 1 && altura <= 65535)) throw new ErroDeGif('O tamanho do GIF é inválido.');
  const profundidade = Math.max(2, Math.log2(tamanho));
  const partes = [];
  const adicionar = (...bytes) => partes.push(Uint8Array.from(bytes.flat()));
  adicionar([...'GIF89a'].map((c) => c.charCodeAt(0)));
  // Descritor da tela: tabela global de cores, 8 bits por canal, tamanho da tabela = 2^(N+1).
  adicionar(u16(largura), u16(altura), 0x80 | 0x70 | (Math.log2(tamanho) - 1), 0, 0);
  partes.push(paleta);
  // Repetir: sem a extensão, o GIF toca uma vez. N vezes no total = contador N-1 (o contador conta as repetições depois da primeira).
  if (repetições !== 1) {
    const contador = repetições === 'infinito' ? 0 : repetições - 1;
    adicionar(0x21, 0xFF, 0x0B, [...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 0x03, 0x01, u16(contador), 0x00);
  }
  for (const quadro of quadros) {
    if (quadro.indices.length !== largura * altura) throw new ErroDeGif('Um dos quadros não tem o tamanho esperado.');
    // Descarte 2: o quadro anterior é apagado antes do próximo, para a transparência não acumular.
    const empacotado = (2 << 2) | (transparente >= 0 ? 1 : 0);
    adicionar(0x21, 0xF9, 0x04, empacotado, u16(quadro.atrasoCs), Math.max(0, transparente), 0x00);
    adicionar(0x2C, u16(0), u16(0), u16(largura), u16(altura), 0x00);
    adicionar(profundidade);
    const comprimido = comprimirLzw(quadro.indices, profundidade);
    for (let i = 0; i < comprimido.length; i += 255) {
      const bloco = comprimido.subarray(i, i + 255);
      partes.push(Uint8Array.of(bloco.length), bloco);
    }
    adicionar(0x00);
  }
  adicionar(0x3B);
  const total = partes.reduce((s, p) => s + p.length, 0);
  const arquivo = new Uint8Array(total);
  let posição = 0;
  for (const p of partes) { arquivo.set(p, posição); posição += p.length; }
  return arquivo;
}

/**
 * Do pixel ao arquivo: paleta, índices e GIF. É o que o Web Worker executa.
 * @param {{
 *   largura: number, altura: number, quadros: Uint8ClampedArray[], sequência: number[], atrasoCs: number,
 *   repetições: 'infinito'|number, transparência?: boolean, suavizar?: boolean,
 * }} pedido
 * @param {{aoProgredir?: (fração: number, texto: string) => void, cancelado?: () => boolean, ceder?: () => Promise<void>}} [ganchos]
 * @returns {Promise<{bytes: Uint8Array, coresUsadas: number, transparente: boolean}>}
 */
export async function gerarGif(pedido, { aoProgredir = () => {}, cancelado = () => false, ceder } = {}) {
  const { largura, altura, quadros, sequência, atrasoCs, repetições, transparência = false, suavizar = false } = pedido;
  const verificar = () => { if (cancelado()) throw new ErroDeGif('Cancelado.', 'cancelado'); };
  aoProgredir(0.02, 'Escolhendo as cores…');
  await ceder?.();
  const paleta = quantizar(quadros, largura, altura, {
    transparência, suavizar,
    aoProgredir: (f) => aoProgredir(0.05 + 0.45 * f, 'Convertendo as cores…'),
  });
  verificar();
  await ceder?.();
  // Quadros repetidos pela "ida e volta" reaproveitam os índices já calculados.
  const partes = [];
  for (const [n, i] of sequência.entries()) {
    verificar();
    partes.push({ indices: paleta.indices[i], atrasoCs });
    aoProgredir(0.5 + 0.4 * ((n + 1) / sequência.length), `Gravando o quadro ${n + 1} de ${sequência.length}…`);
    if (ceder && n % 4 === 3) await ceder();
  }
  const bytes = escreverGif({ largura, altura, paleta: paleta.paleta, tamanho: paleta.tamanho, quadros: partes, repetições, transparente: paleta.transparente });
  aoProgredir(1, 'Pronto');
  return { bytes, coresUsadas: paleta.coresUsadas, transparente: paleta.transparente >= 0 };
}

/** Nome do arquivo de saída. */
export function nomeDoGif(base) {
  const limpo = String(base ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40);
  return `${limpo || 'animacao'}.gif`;
}

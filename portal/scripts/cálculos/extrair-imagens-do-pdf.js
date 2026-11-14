/**
 * Extrai os objetos de imagem de um PDF com o pdf.js local. Os dados exportados são PNGs
 * codificados a partir dos pixels decodificados pelo leitor; não são os bytes comprimidos
 * originais do PDF. Máscaras, padrões e desenhos de página inteira ficam fora do escopo.
 */
import { pareceArquivoPdf } from './pdf.js';
import { calcularCrc32 } from '../comum/exportação/calcular-crc32.js';
import { carregarPdfjs } from '../ferramentas/auxiliares/leitor-pdfjs.js';

export const TAMANHO_MÁXIMO_PDF = 20 * 1024 * 1024;
export const LIMITE_DE_PÁGINAS = 100;
export const LIMITE_DE_IMAGENS = 100;
export const LIMITE_DE_PIXELS_POR_IMAGEM = 8_000_000;
export const LIMITE_TOTAL_DE_PIXELS = 40_000_000;
export const LIMITE_DE_SAÍDA = 100 * 1024 * 1024;

const folga = () => new Promise(resolve => setTimeout(resolve, 0));

function mensagem(erro, extras = {}) {
  const textos = {
    arquivo_vazio: 'Escolha um PDF que tenha conteúdo.',
    arquivo_grande: `O PDF passa de ${TAMANHO_MÁXIMO_PDF / 1024 / 1024} MB.`,
    arquivo_invalido: 'O conteúdo escolhido não parece ser um PDF válido.',
    pdf_protegido: 'Este PDF pede senha. Salve uma cópia sem proteção e tente de novo.',
    pdf_corrompido: 'Não foi possível ler este PDF. O arquivo pode estar danificado.',
    leitor_indisponivel: 'Não foi possível carregar o leitor de PDF local. Tente de novo.',
    sem_paginas: 'Este PDF não contém páginas para examinar.',
    paginas_demais: `Esta ferramenta aceita PDFs com até ${LIMITE_DE_PÁGINAS} páginas.`,
    sem_imagens: 'Não encontramos imagens comuns neste PDF. Máscaras, padrões e ilustrações vetoriais não são extraídos como imagens.',
    imagens_demais: `A extração aceita até ${LIMITE_DE_IMAGENS} imagens únicas por PDF.`,
    imagem_grande: `Uma imagem passa de ${LIMITE_DE_PIXELS_POR_IMAGEM.toLocaleString('pt-BR')} pixels.`,
    pixels_demais: `As imagens passam de ${LIMITE_TOTAL_DE_PIXELS.toLocaleString('pt-BR')} pixels no total.`,
    saida_grande: `Os PNGs passam de ${LIMITE_DE_SAÍDA / 1024 / 1024} MB juntos.`,
    imagem_invalida: `Não foi possível converter a imagem ${extras.imagem ?? ''} do PDF.`,
    pagina_com_erro: `Não foi possível examinar a página ${extras.pagina ?? ''}.`,
    cancelado: 'Extração cancelada. Nenhum ZIP foi gerado.',
  };
  return textos[erro] ?? 'Não foi possível extrair as imagens deste PDF.';
}

export function mensagemDeErroDeExtrairImagens(erro, extras) { return mensagem(erro, extras); }

function u32(valor) { return [(valor >>> 24) & 255, (valor >>> 16) & 255, (valor >>> 8) & 255, valor & 255]; }
function chunk(tipo, dados) {
  const nome = new TextEncoder().encode(tipo);
  const saída = new Uint8Array(12 + dados.length);
  const view = new DataView(saída.buffer);
  view.setUint32(0, dados.length);
  saída.set(nome, 4); saída.set(dados, 8);
  view.setUint32(8 + dados.length, calcularCrc32(saída.subarray(4, 8 + dados.length)));
  return saída;
}

async function comprimir(bytes) {
  if (typeof CompressionStream !== 'function') throw new Error('deflate indisponível');
  const fluxo = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

async function png(rgba, largura, altura) {
  const linha = largura * 4;
  const varrido = new Uint8Array((linha + 1) * altura);
  for (let y = 0; y < altura; y++) varrido.set(rgba.subarray(y * linha, (y + 1) * linha), y * (linha + 1) + 1);
  const cabecalho = new Uint8Array(13);
  const view = new DataView(cabecalho.buffer);
  view.setUint32(0, largura); view.setUint32(4, altura); cabecalho[8] = 8; cabecalho[9] = 6;
  const dados = await comprimir(varrido);
  const partes = [Uint8Array.of(137,80,78,71,13,10,26,10), chunk('IHDR', cabecalho), chunk('IDAT', dados), chunk('IEND', new Uint8Array())];
  const saída = new Uint8Array(partes.reduce((soma, parte) => soma + parte.length, 0));
  let posição = 0;
  for (const parte of partes) { saída.set(parte, posição); posição += parte.length; }
  return saída;
}

async function pixelsDaImagem(imagem, imageKind, limitePixels = LIMITE_DE_PIXELS_POR_IMAGEM) {
  const largura = Number(imagem?.width), altura = Number(imagem?.height);
  if (!Number.isSafeInteger(largura) || !Number.isSafeInteger(altura) || largura < 1 || altura < 1) throw new Error('dimensões inválidas');
  const pixels = largura * altura;
  if (!Number.isSafeInteger(pixels) || pixels > limitePixels) throw Object.assign(new Error('imagem grande'), { limiteImagem: true });

  if (imagem.bitmap) {
    let tela;
    if (typeof OffscreenCanvas === 'function') tela = new OffscreenCanvas(largura, altura);
    else if (typeof document !== 'undefined') { tela = document.createElement('canvas'); tela.width = largura; tela.height = altura; }
    if (!tela) throw new Error('bitmap indisponível');
    const contexto = tela.getContext('2d', { willReadFrequently: true });
    contexto.drawImage(imagem.bitmap, 0, 0, largura, altura);
    const dados = contexto.getImageData(0, 0, largura, altura).data;
    return { largura, altura, rgba: new Uint8Array(dados.buffer, dados.byteOffset, dados.byteLength) };
  }

  const fonte = imagem.data;
  if (!(fonte instanceof Uint8Array) && !(fonte instanceof Uint8ClampedArray)) throw new Error('dados de pixel ausentes');
  const rgba = new Uint8Array(pixels * 4);
  if (imagem.kind === imageKind.RGB_24BPP) {
    if (fonte.length < pixels * 3) throw new Error('dados RGB incompletos');
    for (let a = 0, b = 0; a < pixels; a++, b += 4) { rgba[b] = fonte[a * 3]; rgba[b + 1] = fonte[a * 3 + 1]; rgba[b + 2] = fonte[a * 3 + 2]; rgba[b + 3] = 255; }
  } else if (imagem.kind === imageKind.RGBA_32BPP) {
    if (fonte.length < pixels * 4) throw new Error('dados RGBA incompletos');
    rgba.set(fonte.subarray(0, pixels * 4));
  } else if (imagem.kind === imageKind.GRAYSCALE_1BPP) {
    if (fonte.length < Math.ceil(largura / 8) * altura) throw new Error('dados monocromáticos incompletos');
    let p = 0;
    for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++, p += 4) {
      const branco = (fonte[y * Math.ceil(largura / 8) + (x >> 3)] >> (7 - (x & 7))) & 1;
      rgba[p] = rgba[p + 1] = rgba[p + 2] = branco ? 255 : 0; rgba[p + 3] = 255;
    }
  } else throw new Error('tipo de pixel não suportado');
  return { largura, altura, rgba };
}

function recortarPixels(atlas, região) {
  const { x, y, w, h } = região ?? {};
  if (![x, y, w, h].every(Number.isSafeInteger) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > atlas.largura || y + h > atlas.altura) throw new Error('recorte de imagem inválido');
  const pixels = w * h;
  if (!Number.isSafeInteger(pixels) || pixels > LIMITE_DE_PIXELS_POR_IMAGEM) throw Object.assign(new Error('imagem grande'), { limiteImagem: true });
  const rgba = new Uint8Array(pixels * 4), linhaFonte = atlas.largura * 4;
  for (let linha = 0; linha < h; linha++) {
    const início = (y + linha) * linhaFonte + x * 4;
    rgba.set(atlas.rgba.subarray(início, início + w * 4), linha * w * 4);
  }
  return { largura: w, altura: h, rgba };
}

async function chaveDosPixels({ largura, altura, rgba }) {
  if (globalThis.crypto?.subtle) {
    const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', rgba));
    return `${largura}x${altura}:${[...hash].map(n => n.toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

/** Abre o PDF.js local com acesso à lista de operadores e aos objetos resolvidos da página. */
export async function abrirComPdfjsParaImagens(bytes) {
  const pdfjs = await carregarPdfjs();
  const tarefa = pdfjs.getDocument({ data: bytes.slice(), useWasm: false, disableFontFace: true, enableXfa: false, isEvalSupported: false, verbosity: 0 });
  let documento;
  try { documento = await tarefa.promise; }
  catch (erro) { await tarefa.destroy().catch(() => {}); throw erro; }
  return {
    paginas: documento.numPages,
    operadores: pdfjs.OPS,
    imageKind: pdfjs.ImageKind,
    async operadoresDaPagina(numero) {
      const pagina = await documento.getPage(numero);
      try { return { lista: await pagina.getOperatorList(), obterImagem: (id, cancelado) => obterObjetoPdfjs(pagina.objs, id, pagina.commonObjs, cancelado) }; }
      catch (e) { pagina.cleanup(); throw e; }
      finally { /* os objetos ficam vivos até o chamador terminar de ler os dados */ }
    },
    async limparPagina(numero) { (await documento.getPage(numero)).cleanup(); },
    fechar: () => tarefa.destroy(),
  };
}

export function obterObjetoPdfjs(objs, id, comuns, cancelado) {
  const coleções = [objs, comuns].filter(Boolean);
  // O PDF.js promove alguns recursos reutilizados para commonObjs. Consulte ambas antes
  // de pedir callback em objs: um identificador que só existe no cache comum não chega lá.
  for (const coleção of coleções) {
    try { if (coleção.has(id)) return Promise.resolve(coleção.get(id)); }
    catch { /* tenta a próxima coleção */ }
  }
  return new Promise((resolve, reject) => {
    let restantes = coleções.length;
    if (!restantes) return reject(new Error('objeto de imagem não encontrado'));
    let concluída = false;
    let verificarCancelamento;
    let timeout;
    const encerrar = () => { clearTimeout(timeout); clearInterval(verificarCancelamento); };
    const terminar = (valor, erro) => {
      if (concluída) return;
      concluída = true; encerrar();
      if (valor) resolve(valor); else reject(erro || new Error('objeto de imagem não encontrado'));
    };
    timeout = setTimeout(() => terminar(null, Object.assign(new Error('objeto de imagem indisponível'), { name: 'ObjetoImagemTimeout' })), 5000);
    verificarCancelamento = setInterval(() => {
      if (cancelado?.()) terminar(null, Object.assign(new Error('extração cancelada'), { name: 'AbortError' }));
    }, 50);
    for (const coleção of coleções) {
      try { coleção.get(id, valor => { if (valor) terminar(valor); else if (--restantes === 0) terminar(null, new Error('objeto de imagem não encontrado')); }); }
      catch (erro) { if (--restantes === 0) terminar(null, erro); }
    }
  });
}

/**
 * Devolve cada imagem de pixel única uma vez, com páginas, dimensões e contagem de usos.
 * @param {{nome:string,bytes:Uint8Array}} arquivo
 * @param {{abrir?:Function,aoProgredir?:Function,cancelado?:Function,limiteDeSaída?:number}} opções
 */
export async function extrairImagensDoPdf(arquivo, { abrir = abrirComPdfjsParaImagens, aoProgredir, cancelado, limiteDeSaída = LIMITE_DE_SAÍDA } = {}) {
  const { nome = 'documento.pdf', bytes } = arquivo ?? {};
  const falha = erro => ({ ok: false, erro, mensagem: mensagem(erro) });
  if (!bytes?.length) return falha('arquivo_vazio');
  if (bytes.length > TAMANHO_MÁXIMO_PDF) return falha('arquivo_grande');
  if (!pareceArquivoPdf(bytes)) return falha('arquivo_invalido');
  let documento;
  try { documento = await abrir(bytes); }
  catch (erro) {
    if (erro?.name === 'PasswordException') return falha('pdf_protegido');
    if (erro?.name === 'LeitorIndisponível') return falha('leitor_indisponivel');
    return falha('pdf_corrompido');
  }

  try {
    const totalPaginas = documento.paginas;
    if (!Number.isInteger(totalPaginas) || totalPaginas < 1) return falha('sem_paginas');
    if (totalPaginas > LIMITE_DE_PÁGINAS) return falha('paginas_demais');
    const imagens = [];
    const porHash = new Map();
    let ocorrencias = 0, somaPixels = 0, somaSaida = 0, ignoradas = 0;
    const base = String(nome).replace(/\\/g, '/').split('/').pop().replace(/\.pdf$/iu, '').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 80) || 'documento';

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      if (cancelado?.()) return falha('cancelado');
      await folga();
      let operador;
      try { operador = await documento.operadoresDaPagina(pagina); }
      catch { return { ok: false, erro: 'pagina_com_erro', extras: { pagina }, mensagem: mensagem('pagina_com_erro', { pagina }) }; }
      try {
        const { fnArray, argsArray } = operador.lista;
        for (let i = 0; i < fnArray.length; i++) {
          if (cancelado?.()) return falha('cancelado');
          const op = fnArray[i], args = argsArray[i] ?? [];
          const ops = documento.operadores;
          if ([ops.paintImageMaskXObject, ops.paintImageMaskXObjectGroup, ops.paintImageMaskXObjectRepeat].includes(op)) { ignoradas++; continue; }
          let dados, repeticoes = 1, atlas = null, recortes = null;
          try {
            if (op === ops.paintImageXObject || op === ops.paintImageXObjectRepeat) {
              repeticoes = op === ops.paintImageXObjectRepeat ? Math.floor((args[3]?.length ?? 0) / 2) : 1;
              if (!repeticoes) continue;
              dados = await operador.obterImagem(args[0], cancelado);
            } else if (op === ops.paintInlineImageXObject) dados = args[0];
            else if (op === ops.paintInlineImageXObjectGroup) {
              recortes = args[1] ?? [];
              if (!recortes.length) continue;
              atlas = await pixelsDaImagem(args[0], documento.imageKind, LIMITE_TOTAL_DE_PIXELS);
              repeticoes = 0;
            } else continue;
          } catch (erro) {
            if (cancelado?.() || erro?.name === 'AbortError') return falha('cancelado');
            if (erro?.limiteImagem) return falha('pixels_demais');
            return { ok: false, erro: 'imagem_invalida', extras: { imagem: imagens.length + 1 }, mensagem: erro?.name === 'ObjetoImagemTimeout' ? 'O PDF demorou demais para disponibilizar uma imagem.' : mensagem('imagem_invalida', { imagem: imagens.length + 1 }) };
          }

          const candidatos = recortes ? recortes.map(região => ({ região, repeticoes: 1 })) : [{ repeticoes }];
          for (const candidato of candidatos) {
            if (cancelado?.()) return falha('cancelado');
            let pixels;
            try { pixels = candidato.região ? recortarPixels(atlas, candidato.região) : await pixelsDaImagem(dados, documento.imageKind); }
            catch (erro) { return erro?.limiteImagem ? falha('imagem_grande') : { ok: false, erro: 'imagem_invalida', extras: { imagem: imagens.length + 1 }, mensagem: mensagem('imagem_invalida', { imagem: imagens.length + 1 }) }; }
            const repeticoesItem = candidato.repeticoes;
            ocorrencias += repeticoesItem;
            const chave = await chaveDosPixels(pixels);
            const registro = chave ? porHash.get(chave) : null;
            if (registro) {
              registro.ocorrencias += repeticoesItem;
              if (!registro.paginas.includes(pagina)) registro.paginas.push(pagina);
            } else {
              if (imagens.length >= LIMITE_DE_IMAGENS) return falha('imagens_demais');
              const quantidadePixels = pixels.largura * pixels.altura;
              somaPixels += quantidadePixels;
              if (somaPixels > LIMITE_TOTAL_DE_PIXELS) return falha('pixels_demais');
              let pngBytes;
              try { pngBytes = await png(pixels.rgba, pixels.largura, pixels.altura); }
              catch { return { ok: false, erro: 'imagem_invalida', extras: { imagem: imagens.length + 1 }, mensagem: 'O navegador não conseguiu criar o PNG extraído.' }; }
              somaSaida += pngBytes.length;
              if (somaSaida > limiteDeSaída) return falha('saida_grande');
              const imagem = {
                nome: `${base}-imagem-${String(imagens.length + 1).padStart(3, '0')}.png`,
                bytes: pngBytes, largura: pixels.largura, altura: pixels.altura, pixels: quantidadePixels,
                pagina, paginas: [pagina], ocorrencias: repeticoesItem,
              };
              imagens.push(imagem);
              if (chave) porHash.set(chave, imagem);
            }
          }
        }
      } finally { await documento.limparPagina?.(pagina); }
      aoProgredir?.({ pagina, total: totalPaginas, imagens: imagens.length });
    }
    if (cancelado?.()) return falha('cancelado');
    if (!imagens.length) return falha('sem_imagens');
    return { ok: true, imagens, paginas: totalPaginas, ocorrencias, pixels: somaPixels, bytes: somaSaida, ignoradas };
  } finally { await documento.fechar?.(); }
}

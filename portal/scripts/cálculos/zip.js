/**
 * ZIP: compactar e descompactar (F201), sem biblioteca.
 *
 * - Compactar: monta o arquivo ZIP (método "deflate" com `CompressionStream` do navegador; "stored" quando o
 *   navegador não tem o compressor ou quando comprimir não diminui).
 * - Descompactar: lê o diretório central, confere cada entrada e só extrai o que passa nas defesas abaixo, com
 *   `DecompressionStream` do navegador (nada de código de terceiros processando arquivo de desconhecido).
 *
 * Defesas, porque o arquivo pode ser hostil:
 * - ZIP bomba: o tamanho declarado NÃO é confiado. A extração conta os bytes que de fato saem e para ao passar
 *   do que a entrada declarou (e do limite da ferramenta). Entradas cujos dados se sobrepõem (a bomba que reaproveita
 *   os mesmos bytes) e taxa de compressão impossível são recusadas na listagem.
 * - "Zip slip": nomes com "..", caminho absoluto, letra de unidade, barra invertida disfarçada, caracteres de controle
 *   ou de inversão de direção são recusados e NUNCA viram nome de arquivo baixado. O arquivo baixado leva só o último
 *   trecho do caminho, limpo.
 * - Senha, ZIP64, volumes múltiplos, atalhos (symlink) e métodos que não sabemos ler são recusados com a razão.
 * - Cada arquivo extraído tem o CRC-32 conferido: dado corrompido não passa por bom.
 */
import { calcularCrc32 } from '../comum/exportação/calcular-crc32.js';
import { tornarVisíveis } from './conteúdo-de-qr-code.js';

export const LIMITES = Object.freeze({
  /** Soma dos arquivos para compactar, e tamanho máximo do ZIP aberto. */
  bytesTotais: 200 * 1024 * 1024,
  /** Um arquivo extraído de cada vez. */
  bytesPorArquivo: 200 * 1024 * 1024,
  /** Soma do que se extrai em um mesmo pedido de download. */
  bytesPorPedido: 300 * 1024 * 1024,
  arquivos: 2000,
  entradasLidas: 10_000,
  arquivosPorPedido: 25,
  nomeEmBytes: 255,
  /** Acima deste tamanho, uma taxa de compressão maior que `taxaSuspeita` é tratada como bomba. */
  tamanhoDaTaxa: 20 * 1024 * 1024,
  taxaSuspeita: 200,
});

/** Erro de ZIP com a razão em português; `campo` diz qual campo da tela corrigir. */
export class ErroDeZip extends Error {
  /** @param {string} mensagem @param {string} [campo] */
  constructor(mensagem, campo = 'arquivo') {
    super(mensagem);
    this.name = 'ErroDeZip';
    this.campo = campo;
  }
}

const ASSINATURA_LOCAL = 0x04034b50;
const ASSINATURA_CENTRAL = 0x02014b50;
const ASSINATURA_FIM = 0x06054b50;

const EXTENSÕES_EXECUTÁVEIS = new Set(['exe', 'msi', 'bat', 'cmd', 'scr', 'com', 'pif', 'ps1', 'vbs', 'js', 'jse', 'wsf', 'hta', 'lnk', 'jar', 'apk', 'dmg', 'pkg', 'sh', 'reg', 'dll']);
const NOMES_RESERVADOS_DO_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/* ------------------------------------------------------------------ nomes */

/**
 * Confere o caminho de uma entrada. Devolve o motivo da recusa, ou null se o caminho é seguro.
 * @param {string} nome
 * @returns {string|null}
 */
export function motivoDoCaminhoPerigoso(nome) {
  if (!nome) return 'nome vazio';
  if (/[\u0000-\u001F\u007F]/.test(nome)) return 'caracteres de controle no nome';
  if (/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/.test(nome)) return 'caracteres invisíveis ou de inversão de direção no nome';
  const caminho = nome.replace(/\\/g, '/');
  if (caminho.startsWith('/')) return 'caminho absoluto';
  if (/^[a-z]:/i.test(caminho)) return 'letra de unidade no caminho';
  if (/%2e|%2f|%5c/i.test(caminho)) return 'caminho codificado com %';
  const partes = caminho.split('/');
  if (partes.some((p) => p === '..')) return 'sobe de pasta (..), tentativa de escrever fora do destino';
  if (caminho.length > 1024) return 'caminho longo demais';
  return null;
}

/**
 * Nome com que o arquivo é baixado: só o último trecho do caminho, sem caracteres que o sistema recusa.
 * @param {string} caminho
 * @returns {string}
 */
export function nomeParaBaixar(caminho) {
  const último = String(caminho).replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '';
  let nome = último
    .replace(/[\u0000-\u001F\u007F<>:"/\\|?*]/g, '_')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, '')
    .replace(/[. ]+$/g, '')
    .trim();
  if (!nome || /^\.+$/.test(nome)) nome = 'arquivo';
  if (NOMES_RESERVADOS_DO_WINDOWS.test(nome)) nome = `_${nome}`;
  return nome.length > 150 ? `${nome.slice(0, 120)}${/\.[a-z0-9]{1,8}$/i.exec(nome)?.[0] ?? ''}` : nome;
}

/** Extensão em minúsculas, sem o ponto. */
export const extensãoDe = (nome) => (/\.([a-z0-9]{1,8})$/i.exec(nome)?.[1] ?? '').toLowerCase();
export const éExecutável = (nome) => EXTENSÕES_EXECUTÁVEIS.has(extensãoDe(nome));

/** Nomes únicos na hora de compactar: dois "foto.jpg" viram "foto.jpg" e "foto (2).jpg". */
export function nomesParaCompactar(nomes) {
  const usados = new Set();
  return nomes.map((bruto) => {
    let base = nomeParaBaixar(bruto);
    while (new TextEncoder().encode(base).length > LIMITES.nomeEmBytes) base = `${base.slice(0, Math.max(1, base.length - 10))}${extensãoDe(base) ? `.${extensãoDe(base)}` : ''}`.slice(0, 100);
    const ponto = base.lastIndexOf('.');
    const [raiz, extensão] = ponto > 0 ? [base.slice(0, ponto), base.slice(ponto)] : [base, ''];
    let nome = base;
    for (let n = 2; usados.has(nome.toLowerCase()); n += 1) nome = `${raiz} (${n})${extensão}`;
    usados.add(nome.toLowerCase());
    return nome;
  });
}

/* ------------------------------------------------------------------ compressão */

async function lerFluxo(fluxo, máximo) {
  const leitor = fluxo.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > máximo) {
      await leitor.cancel().catch(() => {});
      throw new ErroDeZip('A entrada descompacta para mais do que o tamanho declarado: arquivo suspeito de ZIP bomba.');
    }
    partes.push(value);
  }
  const saída = new Uint8Array(total);
  let posição = 0;
  for (const parte of partes) { saída.set(parte, posição); posição += parte.length; }
  return saída;
}

/** O navegador sabe comprimir? */
export const temCompressor = () => typeof CompressionStream === 'function';

/**
 * Comprime com deflate puro (o método 8 do ZIP). Devolve null se o navegador não tem compressor.
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array|null>}
 */
export async function comprimir(bytes) {
  if (!temCompressor()) return null;
  return lerFluxo(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')), Number.MAX_SAFE_INTEGER);
}

/**
 * Descomprime deflate puro, parando se sair mais que `máximo` bytes.
 * @param {Uint8Array} bytes
 * @param {number} máximo
 */
export async function descomprimir(bytes, máximo) {
  if (typeof DecompressionStream !== 'function') throw new ErroDeZip('Este navegador não consegue descompactar ZIP (falta o descompressor nativo). Use um navegador atualizado.');
  try {
    return await lerFluxo(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), máximo);
  } catch (erro) {
    if (erro instanceof ErroDeZip) throw erro;
    throw new ErroDeZip('Os dados compactados estão danificados: o arquivo está corrompido ou incompleto.');
  }
}

/* ------------------------------------------------------------------ escrever */

function dataEHoraDos(data) {
  const ano = Math.max(1980, Math.min(2107, data.getFullYear()));
  return {
    hora: (data.getHours() << 11) | (data.getMinutes() << 5) | Math.floor(data.getSeconds() / 2),
    dia: ((ano - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate(),
  };
}

/**
 * Monta um ZIP com os arquivos dados.
 * @param {{nome: string, bytes: Uint8Array, data?: Date}[]} arquivos nomes já únicos (use `nomesParaCompactar`)
 * @param {{comprimir?: boolean, aoProgredir?: (feitos: number, total: number) => void, cancelado?: () => boolean}} [opções]
 * @returns {Promise<{bytes: Uint8Array, método: 'deflate'|'stored'|'misto', comprimidos: number}>}
 */
export async function criarZip(arquivos, { comprimir: querComprimir = true, aoProgredir = () => {}, cancelado = () => false } = {}) {
  if (arquivos.length === 0) throw new ErroDeZip('Escolha pelo menos um arquivo.');
  if (arquivos.length > LIMITES.arquivos) throw new ErroDeZip(`São ${arquivos.length} arquivos e o limite é ${LIMITES.arquivos}.`);
  const codificador = new TextEncoder();
  const entradas = [];
  let comprimidos = 0;
  let totalBruto = 0;

  for (const [i, arquivo] of arquivos.entries()) {
    if (cancelado()) throw new ErroDeZip('Cancelado.');
    totalBruto += arquivo.bytes.length;
    if (totalBruto > LIMITES.bytesTotais) throw new ErroDeZip(`Os arquivos somam mais de ${LIMITES.bytesTotais / 1024 / 1024} MB, o limite desta ferramenta.`);
    const nome = codificador.encode(arquivo.nome);
    let dados = arquivo.bytes;
    let método = 0;
    if (querComprimir && arquivo.bytes.length > 0) {
      const deflado = await comprimir(arquivo.bytes);
      if (deflado && deflado.length < arquivo.bytes.length) { dados = deflado; método = 8; comprimidos += 1; }
    }
    entradas.push({ nome, dados, método, tamanho: arquivo.bytes.length, crc: calcularCrc32(arquivo.bytes), ...dataEHoraDos(arquivo.data ?? new Date()) });
    aoProgredir(i + 1, arquivos.length);
  }

  const tamanhoLocais = entradas.reduce((t, e) => t + 30 + e.nome.length + e.dados.length, 0);
  const tamanhoCentral = entradas.reduce((t, e) => t + 46 + e.nome.length, 0);
  const total = tamanhoLocais + tamanhoCentral + 22;
  if (total >= 0xFFFFFFFF) throw new ErroDeZip('O ZIP passaria de 4 GB, que o formato simples não comporta.');
  const saída = new Uint8Array(total);
  const visão = new DataView(saída.buffer);
  const posições = [];
  let p = 0;
  for (const e of entradas) {
    posições.push(p);
    visão.setUint32(p, ASSINATURA_LOCAL, true);
    visão.setUint16(p + 4, 20, true); // versão necessária
    visão.setUint16(p + 6, 0x0800, true); // nome em UTF-8
    visão.setUint16(p + 8, e.método, true);
    visão.setUint16(p + 10, e.hora, true);
    visão.setUint16(p + 12, e.dia, true);
    visão.setUint32(p + 14, e.crc, true);
    visão.setUint32(p + 18, e.dados.length, true);
    visão.setUint32(p + 22, e.tamanho, true);
    visão.setUint16(p + 26, e.nome.length, true);
    visão.setUint16(p + 28, 0, true);
    saída.set(e.nome, p + 30);
    saída.set(e.dados, p + 30 + e.nome.length);
    p += 30 + e.nome.length + e.dados.length;
  }
  const inícioCentral = p;
  entradas.forEach((e, i) => {
    visão.setUint32(p, ASSINATURA_CENTRAL, true);
    visão.setUint16(p + 4, 20, true); // versão que criou
    visão.setUint16(p + 6, 20, true);
    visão.setUint16(p + 8, 0x0800, true);
    visão.setUint16(p + 10, e.método, true);
    visão.setUint16(p + 12, e.hora, true);
    visão.setUint16(p + 14, e.dia, true);
    visão.setUint32(p + 16, e.crc, true);
    visão.setUint32(p + 20, e.dados.length, true);
    visão.setUint32(p + 24, e.tamanho, true);
    visão.setUint16(p + 28, e.nome.length, true);
    // extra, comentário, disco, atributos internos e externos: zero
    visão.setUint32(p + 42, posições[i], true);
    saída.set(e.nome, p + 46);
    p += 46 + e.nome.length;
  });
  visão.setUint32(p, ASSINATURA_FIM, true);
  visão.setUint16(p + 8, entradas.length, true);
  visão.setUint16(p + 10, entradas.length, true);
  visão.setUint32(p + 12, p - inícioCentral, true);
  visão.setUint32(p + 16, inícioCentral, true);

  return { bytes: saída, método: comprimidos === 0 ? 'stored' : comprimidos === entradas.length ? 'deflate' : 'misto', comprimidos };
}

/* ------------------------------------------------------------------ ler */

/**
 * @typedef {{
 *   índice: number, nome: string, nomeExibido: string, éPasta: boolean, tamanho: number, tamanhoCompactado: number,
 *   crc: number, método: number, início: number, recusa: string|null, aviso: string|null,
 * }} EntradaDoZip
 */

/** Nome da entrada: UTF-8 quando o arquivo declara (ou quando decodifica sem erro), senão Windows-1252. */
function decodificarNome(bytes, utf8Declarado) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    if (utf8Declarado) return new TextDecoder('utf-8').decode(bytes);
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Acha o registro de fim do diretório central, olhando só os últimos 64 KB + 22 bytes. */
function acharFim(visão, tamanho) {
  const menor = Math.max(0, tamanho - 22 - 0xFFFF);
  for (let p = tamanho - 22; p >= menor; p -= 1) {
    if (visão.getUint32(p, true) === ASSINATURA_FIM && p + 22 + visão.getUint16(p + 20, true) === tamanho) return p;
  }
  return -1;
}

/**
 * Lê a lista de entradas de um ZIP e marca as que não devem ser extraídas (com o motivo).
 * @param {Uint8Array} bytes o arquivo ZIP inteiro
 * @returns {{entradas: EntradaDoZip[], tamanhoTotal: number, avisos: string[]}}
 */
export function lerZip(bytes) {
  if (!bytes || bytes.length === 0) throw new ErroDeZip('O arquivo está vazio.');
  if (bytes.length > LIMITES.bytesTotais) throw new ErroDeZip(`O ZIP passa de ${LIMITES.bytesTotais / 1024 / 1024} MB, o limite desta ferramenta.`);
  if (bytes.length < 22) throw new ErroDeZip('Isto não é um arquivo ZIP: é pequeno demais.');
  const visão = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fim = acharFim(visão, bytes.length);
  if (fim < 0) {
    const começa = visão.getUint32(0, true) === ASSINATURA_LOCAL;
    throw new ErroDeZip(começa
      ? 'O ZIP está incompleto ou danificado: não achei o índice (diretório central) no fim do arquivo. Baixe-o de novo.'
      : 'Este arquivo não é um ZIP (ou a extensão foi trocada).');
  }
  const disco = visão.getUint16(fim + 4, true);
  const discoDoÍndice = visão.getUint16(fim + 6, true);
  const quantidade = visão.getUint16(fim + 10, true);
  const tamanhoDoÍndice = visão.getUint32(fim + 12, true);
  const inícioDoÍndice = visão.getUint32(fim + 16, true);
  if (disco !== 0 || discoDoÍndice !== 0) throw new ErroDeZip('ZIP dividido em vários volumes não é aceito. Junte as partes antes.');
  if (quantidade === 0xFFFF || tamanhoDoÍndice === 0xFFFFFFFF || inícioDoÍndice === 0xFFFFFFFF) throw new ErroDeZip('ZIP64 (arquivos de mais de 4 GB ou de mais de 65 mil entradas) não é aceito.');
  if (quantidade === 0) throw new ErroDeZip('O ZIP está vazio: não tem nenhum arquivo dentro.');
  if (quantidade > LIMITES.entradasLidas) throw new ErroDeZip(`O ZIP declara ${quantidade.toLocaleString('pt-BR')} entradas e o limite é ${LIMITES.entradasLidas.toLocaleString('pt-BR')}.`);
  if (inícioDoÍndice + tamanhoDoÍndice > fim || inícioDoÍndice > bytes.length) throw new ErroDeZip('O índice do ZIP aponta para fora do arquivo: ele está corrompido.');

  const entradas = [];
  const avisos = [];
  let p = inícioDoÍndice;
  let somaCompactada = 0;
  for (let i = 0; i < quantidade; i += 1) {
    if (p + 46 > fim || visão.getUint32(p, true) !== ASSINATURA_CENTRAL) throw new ErroDeZip('O índice do ZIP está corrompido (entrada ilegível).');
    const bandeiras = visão.getUint16(p + 8, true);
    const método = visão.getUint16(p + 10, true);
    const crc = visão.getUint32(p + 16, true);
    const tamanhoCompactado = visão.getUint32(p + 20, true);
    const tamanho = visão.getUint32(p + 24, true);
    const tamanhoDoNome = visão.getUint16(p + 28, true);
    const tamanhoDoExtra = visão.getUint16(p + 30, true);
    const tamanhoDoComentário = visão.getUint16(p + 32, true);
    const atributosExternos = visão.getUint32(p + 38, true);
    const posiçãoLocal = visão.getUint32(p + 42, true);
    const fimDaEntrada = p + 46 + tamanhoDoNome + tamanhoDoExtra + tamanhoDoComentário;
    if (fimDaEntrada > fim) throw new ErroDeZip('O índice do ZIP está corrompido (nome fora do arquivo).');
    const nome = decodificarNome(bytes.subarray(p + 46, p + 46 + tamanhoDoNome), (bandeiras & 0x0800) !== 0);
    p = fimDaEntrada;

    const éPasta = nome.endsWith('/') || nome.endsWith('\\');
    /** @type {string|null} */
    let recusa = null;
    let aviso = null;
    let início = 0;

    if (tamanho === 0xFFFFFFFF || tamanhoCompactado === 0xFFFFFFFF || posiçãoLocal === 0xFFFFFFFF) recusa = 'ZIP64 não é aceito';
    else if (bandeiras & 0x0001 || bandeiras & 0x0040 || método === 99) recusa = 'protegido por senha';
    else if (((atributosExternos >>> 16) & 0xF000) === 0xA000) recusa = 'é um atalho (symlink), não um arquivo';
    else if (!éPasta && método !== 0 && método !== 8) recusa = `método de compressão ${método} não suportado`;
    if (!recusa) recusa = motivoDoCaminhoPerigoso(nome) ? `caminho suspeito: ${motivoDoCaminhoPerigoso(nome)}` : null;
    if (!recusa && !éPasta) {
      if (método === 0 && tamanho !== tamanhoCompactado) recusa = 'tamanhos incoerentes';
      else if (posiçãoLocal + 30 > inícioDoÍndice) recusa = 'posição fora do arquivo';
      else if (visão.getUint32(posiçãoLocal, true) !== ASSINATURA_LOCAL) recusa = 'cabeçalho local danificado';
      else {
        início = posiçãoLocal + 30 + visão.getUint16(posiçãoLocal + 26, true) + visão.getUint16(posiçãoLocal + 28, true);
        if (início + tamanhoCompactado > inícioDoÍndice) recusa = 'dados fora do arquivo (ZIP truncado ou corrompido)';
      }
    }
    if (!recusa && !éPasta) {
      if (tamanho > LIMITES.bytesPorArquivo) recusa = `maior que ${LIMITES.bytesPorArquivo / 1024 / 1024} MB, o limite por arquivo`;
      else if (tamanho > LIMITES.tamanhoDaTaxa && tamanho / Math.max(1, tamanhoCompactado) > LIMITES.taxaSuspeita) recusa = 'taxa de compressão suspeita (possível ZIP bomba)';
      else if (tamanhoCompactado > 0 && tamanho / tamanhoCompactado > 1100) recusa = 'taxa de compressão impossível (cabeçalho mentiroso)';
    }
    if (!recusa && !éPasta) somaCompactada += tamanhoCompactado;
    if (!recusa && éExecutável(nome)) aviso = 'arquivo executável: só abra se confiar em quem enviou';

    entradas.push({
      índice: i, nome, nomeExibido: tornarVisíveis(nome), éPasta, tamanho, tamanhoCompactado, crc, método, início,
      recusa, aviso,
    });
  }

  // Entradas que reaproveitam os mesmos bytes (a bomba "sobreposta") fazem a soma passar do tamanho do arquivo.
  if (somaCompactada > bytes.length) throw new ErroDeZip('As entradas do ZIP se sobrepõem dentro do arquivo: é um ZIP bomba ou está corrompido. Não vou abrir.');
  const bons = entradas.filter((e) => !e.éPasta);
  const ordenadas = bons.filter((e) => !e.recusa).sort((a, b) => a.início - b.início);
  for (let i = 1; i < ordenadas.length; i += 1) {
    if (ordenadas[i].início < ordenadas[i - 1].início + ordenadas[i - 1].tamanhoCompactado) {
      throw new ErroDeZip('As entradas do ZIP se sobrepõem dentro do arquivo: é um ZIP bomba ou está corrompido. Não vou abrir.');
    }
  }
  const repetidos = new Map();
  for (const e of entradas) repetidos.set(e.nome.toLowerCase(), (repetidos.get(e.nome.toLowerCase()) ?? 0) + 1);
  const duplicados = [...repetidos.values()].filter((n) => n > 1).length;
  if (duplicados) avisos.push(`${duplicados} nome(s) aparecem mais de uma vez no ZIP; cada um é listado separadamente.`);
  return { entradas, tamanhoTotal: bons.reduce((t, e) => t + e.tamanho, 0), avisos };
}

/**
 * Extrai uma entrada, conferindo tamanho e CRC-32.
 * @param {Uint8Array} bytes o ZIP inteiro
 * @param {EntradaDoZip} entrada
 * @returns {Promise<Uint8Array>}
 */
export async function extrairEntrada(bytes, entrada) {
  if (entrada.recusa) throw new ErroDeZip(`"${entrada.nomeExibido}" não pode ser extraído: ${entrada.recusa}.`);
  if (entrada.éPasta) throw new ErroDeZip('Pasta não tem conteúdo para baixar.');
  const dados = bytes.subarray(entrada.início, entrada.início + entrada.tamanhoCompactado);
  const saída = entrada.método === 0 ? dados.slice() : await descomprimir(dados, entrada.tamanho);
  if (saída.length !== entrada.tamanho) {
    throw new ErroDeZip(`"${entrada.nomeExibido}" saiu com ${saída.length.toLocaleString('pt-BR')} bytes, mas o ZIP declara ${entrada.tamanho.toLocaleString('pt-BR')}: o arquivo está corrompido.`);
  }
  if (calcularCrc32(saída) !== entrada.crc) throw new ErroDeZip(`"${entrada.nomeExibido}" não passou na conferência de integridade (CRC-32): o ZIP está corrompido.`);
  return saída;
}

/**
 * Confere se um pedido de extração cabe nos limites.
 * @param {EntradaDoZip[]} escolhidas
 * @returns {string|null} mensagem de recusa
 */
export function conferirPedido(escolhidas) {
  if (escolhidas.length === 0) return 'Marque pelo menos um arquivo.';
  if (escolhidas.length > LIMITES.arquivosPorPedido) return `Baixe até ${LIMITES.arquivosPorPedido} arquivos por vez (marcados: ${escolhidas.length}). O navegador pede permissão a cada download em lote.`;
  const soma = escolhidas.reduce((t, e) => t + e.tamanho, 0);
  if (soma > LIMITES.bytesPorPedido) return `Os arquivos marcados somam mais de ${LIMITES.bytesPorPedido / 1024 / 1024} MB. Marque menos arquivos.`;
  return null;
}

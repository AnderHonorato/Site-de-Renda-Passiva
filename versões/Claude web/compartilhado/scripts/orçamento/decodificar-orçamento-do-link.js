// Lê o orçamento de um código de link. O conteúdo não é confiável: limita tamanho
// antes e depois de descompactar (evita "bomba" de compressão), usa JSON seguro e
// valida de novo com montarOrçamento. Retorna { válido, orçamento } ou { válido: false, erro }.
import { analisarJsonSeguro } from '../armazenamento/analisar-json-seguro.js';
import { LIMITE_DO_CÓDIGO_DO_LINK } from './codificar-orçamento-para-link.js';
import { montarOrçamento } from './montar-orçamento.js';

const LIMITE_DESCOMPACTADO = 64_000;

function deBase64Url(texto) {
  if (!/^[A-Za-z0-9_-]+$/.test(texto)) throw new Error('caracteres inválidos');
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
  const binário = atob(base64);
  const bytes = new Uint8Array(binário.length);
  for (let índice = 0; índice < binário.length; índice += 1) bytes[índice] = binário.charCodeAt(índice);
  return bytes;
}

async function descompactarComLimite(bytes) {
  const leitor = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > LIMITE_DESCOMPACTADO) {
      await leitor.cancel();
      throw new Error('conteúdo grande demais');
    }
    partes.push(value);
  }
  const resultado = new Uint8Array(total);
  let posição = 0;
  for (const parte of partes) {
    resultado.set(parte, posição);
    posição += parte.length;
  }
  return resultado;
}

export async function decodificarOrçamentoDoLink(código) {
  const inválido = { válido: false, erro: 'Este link de orçamento está incompleto ou foi alterado. Peça um novo link a quem enviou.' };
  if (typeof código !== 'string' || código.length === 0 || código.length > LIMITE_DO_CÓDIGO_DO_LINK) return inválido;
  try {
    let bytes;
    if (código.startsWith('v1.')) {
      if (typeof DecompressionStream !== 'function') return { válido: false, erro: 'Este navegador é antigo demais para abrir o link. Peça o PDF a quem enviou.' };
      bytes = await descompactarComLimite(deBase64Url(código.slice(3)));
    } else if (código.startsWith('v1j.')) {
      bytes = deBase64Url(código.slice(4));
      if (bytes.length > LIMITE_DESCOMPACTADO) return inválido;
    } else {
      return inválido;
    }
    const analisado = analisarJsonSeguro(new TextDecoder('utf-8', { fatal: true }).decode(bytes), { tamanhoMáximo: LIMITE_DESCOMPACTADO, profundidadeMáxima: 6 });
    if (!analisado.válido || analisado.dados?.versão !== 1) return inválido;
    const verificado = montarOrçamento(analisado.dados);
    return verificado.válido ? verificado : { válido: false, erro: `O orçamento do link tem dados inválidos (${verificado.erro})` };
  } catch {
    return inválido;
  }
}

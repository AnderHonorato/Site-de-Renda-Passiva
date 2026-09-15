// Sincronizado de compartilhado/scripts/orçamento/codificar-orçamento-para-link.js — edite a origem e rode "npm run sincronizar" na raiz.
// Transforma o orçamento em texto seguro para o fragmento (#) de um endereço:
// JSON → UTF-8 → deflate-raw (quando o navegador suporta) → base64url.
// O fragmento não é enviado ao servidor, portanto não aparece nos registros de acesso.

export const LIMITE_DO_CÓDIGO_DO_LINK = 12_000;

function paraBase64Url(bytes) {
  let binário = '';
  for (let início = 0; início < bytes.length; início += 0x8000) {
    binário += String.fromCharCode(...bytes.subarray(início, início + 0x8000));
  }
  return btoa(binário).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function compactar(bytes) {
  const fluxo = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

export async function codificarOrçamentoParaLink(orçamento) {
  const bytes = new TextEncoder().encode(JSON.stringify(orçamento));
  const código = typeof CompressionStream === 'function' ? `v1.${paraBase64Url(await compactar(bytes))}` : `v1j.${paraBase64Url(bytes)}`;
  if (código.length > LIMITE_DO_CÓDIGO_DO_LINK) throw new Error('O orçamento ficou grande demais para caber em um link. Reduza itens ou observações, ou envie o PDF.');
  return código;
}

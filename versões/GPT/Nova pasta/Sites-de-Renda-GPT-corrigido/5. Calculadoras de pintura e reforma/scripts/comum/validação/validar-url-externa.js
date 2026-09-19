// Sincronizado de compartilhado/scripts/validação/validar-url-externa.js — edite a origem e rode "npm run sincronizar" na raiz.
// Aceita somente endereços https: e mailto: bem formados. Retorna o endereço
// normalizado ou null. Usado para portfólio e contato vindos da configuração.
export function validarUrlExterna(texto) {
  const valor = String(texto ?? '').trim();
  if (!valor) return null;
  let url;
  try {
    url = new URL(valor);
  } catch {
    return null;
  }
  if (url.protocol === 'https:') {
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  }
  if (url.protocol === 'mailto:') {
    const endereço = decodeURIComponent(url.pathname);
    if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(endereço)) return null;
    return `mailto:${endereço}`;
  }
  return null;
}

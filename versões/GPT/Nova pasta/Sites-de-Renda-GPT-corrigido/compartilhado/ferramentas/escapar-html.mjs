// Escapa texto para uso seguro em conteúdo e atributos HTML gerados.
const substituições = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (caractere) => substituições[caractere]);
}

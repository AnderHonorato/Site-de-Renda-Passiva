// Converte nome e cidade do recebedor para o conjunto aceito com segurança pelos
// aplicativos: remove acentos e cedilha, mantém letras, números, espaço e . , - / &.
// Não corta o texto: quem valida o limite de caracteres é a validação da configuração.
export function normalizarTextoPix(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,\-/&]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sincronizado de compartilhado/scripts/orçamento/obter-identidade-da-página.js — edite a origem e rode "npm run sincronizar" na raiz.
// Lê da página a marca e as cores efetivas do tema, para PDF e planilha seguirem o visual do site.
export function obterIdentidadeDaPágina() {
  const estilos = getComputedStyle(document.documentElement);
  const cor = (variável, padrão) => {
    const valor = estilos.getPropertyValue(variável).trim();
    return /^#[0-9a-f]{6}$/i.test(valor) ? valor : padrão;
  };
  return {
    marca: document.querySelector('.cabeçalho-marca span')?.textContent.trim() ?? '',
    cores: { principal: cor('--cor-ação', '#8c491a'), clara: cor('--cor-destaque-100', '#fff2eb'), texto: cor('--cor-texto', '#201e1d') },
  };
}

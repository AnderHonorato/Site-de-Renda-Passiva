/**
 * Idiomas do portal.
 *
 * O português fica na raiz, com os endereços de sempre. O inglês fica em /en/, com os mesmos
 * nomes de página e os mesmos slugs de ferramenta. Não há redirecionamento automático pelo
 * idioma do navegador: quem escolhe é a pessoa, pelo seletor do cabeçalho e do rodapé.
 */
export const IDIOMA_PADRÃO = 'pt-BR';

export const idiomas = Object.freeze({
  'pt-BR': Object.freeze({ código: 'pt-BR', hreflang: 'pt-BR', pasta: '', locale: 'pt-BR', nome: 'Português', curto: 'PT' }),
  en: Object.freeze({ código: 'en', hreflang: 'en', pasta: 'en/', locale: 'en-US', nome: 'English', curto: 'EN' }),
});

export const códigosDeIdioma = Object.freeze(Object.keys(idiomas));

/** Reduz qualquer valor de lang ("en-US", "pt", "") a um dos códigos acima. */
export function normalizarIdioma(valor) {
  return String(valor ?? '').toLowerCase().startsWith('en') ? 'en' : IDIOMA_PADRÃO;
}

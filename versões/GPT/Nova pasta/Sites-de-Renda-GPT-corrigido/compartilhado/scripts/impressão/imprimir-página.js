// Abre a impressão do navegador. A folha de impressão esconde navegação,
// anúncios, apoio e consentimento; a classe "imprimindo" permite ajustes finos.
export function imprimirPágina() {
  const raiz = document.documentElement;
  raiz.classList.add('imprimindo');
  const remover = () => {
    raiz.classList.remove('imprimindo');
    window.removeEventListener('afterprint', remover);
  };
  window.addEventListener('afterprint', remover);
  window.print();
}

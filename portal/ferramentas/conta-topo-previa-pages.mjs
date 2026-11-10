/**
 * Cabeçalho da vitrine GitHub Pages. Não inventa sessão ou apresenta ações
 * de autenticação na origem estática, que não conhece os cookies do servidor.
 */
export function renderizarContaTopo(fim, _sessao, { idioma = 'pt' } = {}) {
  const anterior = fim.querySelector('.conta-topo');
  anterior?.remove();

  const visitante = document.getElementById('preferencias-visitante');
  if (visitante) visitante.hidden = false;
  const raiz = document.createElement('div');
  raiz.className = 'conta-topo conta-topo--visitante';

  const acessar = document.createElement('a');
  acessar.className = 'conta-topo__item conta-topo__entrar';
  acessar.href = (document.documentElement.dataset.raiz || './') + 'servidor-teste.html';
  acessar.textContent = idioma === 'en' ? 'Open full site' : 'Abrir site completo';
  acessar.setAttribute('aria-label', idioma === 'en'
    ? 'Open the full site with login and account'
    : 'Abrir o site completo com login e conta');
  raiz.append(acessar);
  fim.append(raiz);
}

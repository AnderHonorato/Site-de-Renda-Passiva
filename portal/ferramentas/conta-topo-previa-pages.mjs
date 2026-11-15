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
  // O texto curto cabe junto aos ícones também no cabeçalho de 390 px.
  // Atalho acessível, mas sem texto que ultrapasse o espaço disponível no topo móvel.
  acessar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20"/></svg>';
  acessar.setAttribute('aria-label', idioma === 'en'
    ? 'Open the full site with login and account'
    : 'Abrir o site completo com login e conta');
  const caminho = typeof location === 'undefined' ? '' : location.pathname;
  const raizSite = document.documentElement.dataset.raiz || '';
  const inicio = /\/(?:index\.html)?$/u.test(caminho) && (idioma === 'en'
    ? raizSite === '../' && /(?:^|\/)en\/?(?:index\.html)?$/u.test(caminho)
    : raizSite === '');
  if (inicio) {
    raiz.className += ' conta-topo--inicio';
    acessar.className = 'conta-topo__item conta-topo__login-cadastro';
    const rotulo = idioma === 'en' ? 'Sign in/register' : 'Login/cadastro';
    const label = document.createElement('span'); label.textContent = rotulo;
    acessar.append(label);
    acessar.title = rotulo;
    acessar.setAttribute('aria-label', idioma === 'en' ? 'Sign in or register' : 'Login ou cadastro');
    acessar.href += '?abrir=entrar';
  }
  raiz.append(acessar);
  fim.append(raiz);
}

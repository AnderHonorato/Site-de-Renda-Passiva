import { criarIconeMedalha } from './emblemas.js';

let observador;
function observarMovimento(caixa) {
  if (typeof IntersectionObserver === 'undefined') return;
  observador ??= new IntersectionObserver(entradas => {
    for (const entrada of entradas) {
      entrada.target.dataset.movimento = entrada.isIntersecting ? 'ativo' : 'pausado';
      if (!entrada.target.isConnected) observador.unobserve(entrada.target);
    }
  });
  observador.observe(caixa);
}

/** O anel mostra o progresso real até o próximo marco; o metal mantém a família/patamar. */
export function criarProgressoEmblema(medalha, { ingles = false, doc = document } = {}) {
  const percentual = medalha.completa ? 100 : Math.max(0, Math.min(100, Number(medalha.percentual) || 0));
  const caixa = doc.createElement('span');
  caixa.className = 'emblema-progresso';
  caixa.dataset.tier = String(medalha.tier || 0);
  caixa.dataset.desbloqueada = medalha.desbloqueada ? 'sim' : 'nao';
  caixa.style.setProperty('--percentual-emblema', String(percentual));
  const anel = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  anel.setAttribute('viewBox', '0 0 100 100');
  anel.setAttribute('class', 'emblema-progresso__anel');
  anel.setAttribute('role', 'progressbar');
  anel.setAttribute('aria-label', `${ingles ? 'Progress' : 'Progresso'}: ${medalha.nome}`);
  anel.setAttribute('aria-valuemin', '0');
  anel.setAttribute('aria-valuemax', '100');
  anel.setAttribute('aria-valuenow', String(percentual));
  for (const classe of ['trilho', 'valor']) {
    const circulo = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const [nome, valor] of Object.entries({ cx: 50, cy: 50, r: 45, pathLength: 100, class: `emblema-progresso__${classe}` })) circulo.setAttribute(nome, String(valor));
    anel.append(circulo);
  }
  caixa.append(anel, criarIconeMedalha(medalha, { doc }));
  if (doc === globalThis.document) observarMovimento(caixa);
  return caixa;
}

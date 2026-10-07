/** Intensidade visual apenas; as permissões e os desbloqueios continuam vindo da API. */
export function faixaDePrestigio(perfil = {}) {
  const nivel = Math.max(1,Number(perfil.nivel)||1);
  const medalhas = (Array.isArray(perfil.medalhas) ? perfil.medalhas : []).filter(m=>m.desbloqueada);
  const tier = Math.max(0,...medalhas.map(m=>Number(m.tier)||0));
  return Math.min(4,Math.max(nivel>=13 ? 4 : nivel>=8 ? 3 : nivel>=5 ? 2 : nivel>=3 ? 1 : 0,tier>=7 ? 4 : tier>=6 ? 3 : tier>=5 ? 2 : 0));
}

export function aplicarPrestigio(alvo,perfil) {
  if (!alvo) return;
  alvo.dataset.prestigio = String(faixaDePrestigio(perfil));
  if ('IntersectionObserver' in globalThis) {
    const observer = new IntersectionObserver(entries=>{
      for (const e of entries) alvo.dataset.movimento = e.isIntersecting ? 'ativo' : 'pausado';
      if (!alvo.isConnected) observer.disconnect();
    });
    observer.observe(alvo);
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
}

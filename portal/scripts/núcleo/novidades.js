const COOKIE = 'visto_novidades';

export function ultimaNovidadeVista() {
  try {
    const valor = document.cookie.split('; ').find(c=>c.startsWith(`${COOKIE}=`))?.split('=')[1];
    if (valor !== undefined) return /^\d{1,15}$/u.test(valor) ? Number(valor) : 0;
  } catch { /* sem cookies */ }
  try { return Number(localStorage.getItem(COOKIE)) || 0; } catch { return 0; }
}

export function lembrarNovidades(revisao) {
  const valor = Math.max(ultimaNovidadeVista(),revisao,1);
  try { document.cookie = `${COOKIE}=${valor}; max-age=31536000; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* sem cookies */ }
  try { localStorage.setItem(COOKIE,String(valor)); } catch { /* sem armazenamento */ }
}

export async function carregarNovidades(idioma) {
  try {
    const r = await fetch(`/api/novidades?idioma=${encodeURIComponent(idioma)}`, { credentials:'same-origin', signal:AbortSignal.timeout(2500) });
    if (!r.ok) return [];
    const b = await r.json();
    return Array.isArray(b.itens) ? b.itens.slice(0,20) : [];
  } catch { return []; }
}

export function linkNovidadeSeguro(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || /^\/[/\\]/u.test(url) || /[\\\s]/u.test(url)) return null;
  try { const u = new URL(url,location.origin); return u.origin === location.origin ? u.href : null; } catch { return null; }
}

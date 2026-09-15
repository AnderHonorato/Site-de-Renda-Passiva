// Auditoria DOM usada pelo crítico de experiência (colada via javascript_tool).
// Não altera a página; só mede.
(() => {
  const vis = (e) => { if (!e) return false; const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const R = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const W = innerWidth, H = innerHeight;
  const o = { url: location.pathname, W, H, sw: document.documentElement.scrollWidth, bodySw: document.body.scrollWidth };
  o.transbordo = [...document.querySelectorAll('body *')].filter(e => vis(e) && e.getBoundingClientRect().right > W + 1 && !e.closest('.tabela-rolável,[data-rolável],.rolagem-contida') && getComputedStyle(e).position !== 'fixed').slice(0, 6).map(e => e.tagName + '.' + [...e.classList].join('.') + ' r=' + Math.round(e.getBoundingClientRect().right));
  const nav = document.querySelector('.navegação-inferior');
  o.nav = nav ? { vis: vis(nav), pos: getComputedStyle(nav).position, r: vis(nav) ? R(nav) : null, itens: [...nav.querySelectorAll('a,button')].map(a => (a.textContent.trim()) + (a.getAttribute('aria-current') ? '*' : '') + (vis(a) ? ':' + R(a).slice(2).join('x') : '')) } : null;
  const ac = document.querySelector('.ação-contextual');
  o.ação = ac ? { vis: vis(ac), r: vis(ac) ? R(ac) : null, txt: ac.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) } : null;
  o.padBottom = getComputedStyle(document.body).paddingBottom;
  const fixos = [...document.querySelectorAll('.navegação-inferior,.ação-contextual,.consentimento,.faixa-de-apoio,.região-de-mensagens > *,dialog[open]')].filter(vis).filter(e => ['fixed', 'sticky'].includes(getComputedStyle(e).position) || e.tagName === 'DIALOG');
  o.fixos = fixos.map(e => e.className.split(' ')[0] + ':' + R(e).join(','));
  const sob = [];
  for (let i = 0; i < fixos.length; i++) for (let j = i + 1; j < fixos.length; j++) { const a = fixos[i].getBoundingClientRect(), b = fixos[j].getBoundingClientRect(); if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom && !fixos[i].contains(fixos[j]) && !fixos[j].contains(fixos[i])) sob.push(fixos[i].className.split(' ')[0] + ' x ' + fixos[j].className.split(' ')[0]); }
  o.sobreposições = sob;
  o.alvosPequenos = [...document.querySelectorAll('a,button,select,input:not([type=hidden]),summary,[role=button],textarea,label.opção')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); if (['checkbox', 'radio'].includes(e.type)) return false; const inline = e.tagName === 'A' && e.closest('p,li,dd,td,.texto-editorial,.aviso,figcaption') && getComputedStyle(e).display === 'inline'; return !inline && (r.width < 43.5 || r.height < 43.5); }).slice(0, 12).map(e => e.tagName + '.' + (e.className || '').toString().split(' ')[0] + '"' + (e.textContent || e.name || '').trim().slice(0, 20) + '" ' + R(e).slice(2).join('x'));
  o.camposPequenos = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea')].filter(vis).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => (e.id || e.name) + ':' + getComputedStyle(e).fontSize);
  const cab = document.querySelector('.cabeçalho-navegação');
  o.cabeçalhoNav = cab ? vis(cab) : null;
  o.consentimento = (() => { const c = document.getElementById('consentimento'); return c ? (vis(c) ? R(c).join(',') : 'oculto') : 'ausente'; })();
  o.faixaApoio = (() => { const c = document.querySelector('.faixa-de-apoio'); return c ? (vis(c) ? R(c).join(',') + ' ' + getComputedStyle(c).position : 'oculta') : 'ausente'; })();
  o.h1 = [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 50));
  o.semRótulo = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')).map(e => e.id || e.name || e.type).slice(0, 8);
  return JSON.stringify(o);
})()

// Auditoria em lote: carrega cada página em iframes com a largura desejada
// (as media queries respondem à largura do iframe) e mede o DOM.
// Uso no javascript_tool: colar este arquivo e chamar
//   await auditarLote(['index.html','páginas/x.html'], [[320,640],[390,844],[740,360],[1024,768],[1440,900]])
window.auditarDoc = (w) => {
  const d = w.document, gcs = (e) => w.getComputedStyle(e);
  const vis = (e) => { if (!e) return false; const s = gcs(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const R = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const W = w.innerWidth, H = w.innerHeight;
  const o = { W, H, sw: d.documentElement.scrollWidth };
  if (o.sw > W) o.transbordo = [...d.querySelectorAll('body *')].filter(e => vis(e) && e.getBoundingClientRect().right > W + 1 && gcs(e).position !== 'fixed').slice(-4).map(e => e.tagName + '.' + [...e.classList].join('.') + ' r=' + Math.round(e.getBoundingClientRect().right));
  const nav = d.querySelector('.navegação-inferior');
  if (nav && vis(nav)) o.nav = [...nav.querySelectorAll('a,button')].map(a => a.textContent.trim() + (a.getAttribute('aria-current') ? '*' : '') + ':' + R(a).slice(2).join('x')).join(' | ') + ' @' + R(nav)[1];
  else o.nav = nav ? 'oculta' : 'AUSENTE';
  const ac = d.querySelector('.ação-contextual');
  if (ac) o.ação = vis(ac) ? R(ac).join(',') + ' "' + ac.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + '"' : 'oculta';
  o.pb = gcs(d.body).paddingBottom;
  const fixos = [...d.querySelectorAll('.navegação-inferior,.ação-contextual,.consentimento,.faixa-de-apoio,.região-de-mensagens > *,.cabeçalho')].filter(vis).filter(e => ['fixed', 'sticky'].includes(gcs(e).position));
  o.fixos = fixos.map(e => e.className.split(' ')[0] + ':' + R(e).join(',')).join(' ; ');
  const sob = [];
  for (let i = 0; i < fixos.length; i++) for (let j = i + 1; j < fixos.length; j++) { const a = fixos[i].getBoundingClientRect(), b = fixos[j].getBoundingClientRect(); if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && !fixos[i].contains(fixos[j]) && !fixos[j].contains(fixos[i])) sob.push(fixos[i].className.split(' ')[0] + ' x ' + fixos[j].className.split(' ')[0]); }
  if (sob.length) o.sob = sob;
  const peq = [...d.querySelectorAll('a,button,select,input:not([type=hidden]),summary,[role=button],textarea')].filter(vis).filter(e => { if (['checkbox', 'radio', 'range'].includes(e.type)) return false; if (e.closest('.consentimento')) {} const r = e.getBoundingClientRect(); const inline = e.tagName === 'A' && gcs(e).display === 'inline'; return !inline && (r.width < 43.5 || r.height < 43.5); });
  if (peq.length) o.alvos = peq.slice(0, 8).map(e => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0] + '"' + (e.textContent || e.name || e.id || '').trim().slice(0, 18) + '"' + R(e).slice(2).join('x')).concat(peq.length > 8 ? ['+' + (peq.length - 8)] : []);
  const cp = [...d.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]),select,textarea')].filter(vis).filter(e => parseFloat(gcs(e).fontSize) < 16);
  if (cp.length) o.campos = cp.map(e => (e.id || e.name) + ':' + gcs(e).fontSize);
  const cab = d.querySelector('.cabeçalho-navegação'); o.cab = cab ? vis(cab) : 'AUSENTE';
  const c = d.getElementById('consentimento'); o.cons = c ? (vis(c) ? R(c).join(',') : '-') : 'AUSENTE';
  const f = d.querySelector('.faixa-de-apoio'); o.apoio = f ? (vis(f) ? R(f).join(',') + gcs(f).position[0] : '-') : 'ausente';
  o.h1 = d.querySelectorAll('h1').length;
  const sr = [...d.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'));
  if (sr.length) o.semRótulo = sr.map(e => e.id || e.name || e.type).slice(0, 6);
  return o;
};
window.auditarLote = async (páginas, larguras, { espera = 700 } = {}) => {
  const saída = {};
  for (const p of páginas) {
    saída[p] = {};
    for (const [lw, lh] of larguras) {
      const f = document.createElement('iframe');
      f.style.cssText = `position:absolute;left:0;top:0;width:${lw}px;height:${lh}px;border:0;opacity:0.01;pointer-events:none`;
      document.body.appendChild(f);
      await new Promise((ok) => { f.onload = ok; f.src = '/' + p; setTimeout(ok, 6000); });
      await new Promise((ok) => setTimeout(ok, espera));
      try { saída[p][lw + 'x' + lh] = window.auditarDoc(f.contentWindow); } catch (e) { saída[p][lw + 'x' + lh] = 'ERRO ' + e.message; }
      f.remove();
    }
  }
  return saída;
};
'ok';

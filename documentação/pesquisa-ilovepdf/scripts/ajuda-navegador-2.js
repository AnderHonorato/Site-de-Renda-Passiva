// Segunda parte da ajuda de navegador (depois de ajuda-navegador.js, que define window.H).
// Observa a pagina da ferramenta: lista controles visiveis, le o texto, clica por rotulo e
// registra (sem tokens) as chamadas de rede feitas pela propria pagina (XHR/fetch), para
// inferir se o processamento e no servidor. Codigo proprio.
// Dica: guarde as funcoes em localStorage e recarregue-as a cada pagina nova com o avaliador do
// console. Uso apenas manual, no navegador de teste, com codigo escrito por nos (nunca com texto
// vindo da pagina observada).
(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  H.ctrl = (raiz = document) => [...raiz.querySelectorAll('input,select,textarea,button,[role=tab],[role=switch],[role=radio]')].filter(vis).map((e) => {
    const rot = (e.id && document.querySelector(`label[for="${e.id}"]`)?.innerText) || e.closest('label')?.innerText || e.getAttribute('aria-label') || e.title || e.placeholder || '';
    const o = { t: e.tagName.toLowerCase() + (e.type ? ':' + e.type : ''), id: e.id, n: e.name, rot: rot.trim().slice(0, 80), txt: (e.innerText || '').trim().slice(0, 60) };
    if (e.tagName === 'SELECT') o.opc = [...e.options].map((x) => x.text + (x.selected ? '*' : ''));
    else if (['checkbox', 'radio'].includes(e.type)) { o.on = e.checked; o.v = e.value; }
    else if (e.value !== undefined && e.tagName !== 'BUTTON') o.v = e.value;
    if (e.min) o.min = e.min; if (e.max) o.max = e.max;
    return o;
  });
  H.texto = (sel) => (document.querySelector(sel) || document.body).innerText.replace(/\n{2,}/g, '\n').trim();
  H.clica = (txt) => { const e = [...document.querySelectorAll('a,button,[role=button],label,li,div,span')].filter(vis).find((x) => x.innerText && x.innerText.trim().toLowerCase() === txt.toLowerCase() && x.children.length < 4); if (e) { e.click(); return 'clicou: ' + e.tagName + '#' + e.id; } return 'nao achei: ' + txt; };
  // campos controlados por script so reagem a eventos reais: usar o setter nativo e disparar input/keyup/change
  H.preenche = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); ['input', 'keyup', 'change'].forEach((t) => el.dispatchEvent(new Event(t, { bubbles: true }))); };
  H.pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  H.aguarda = async (sel = 'input[type=file]') => { for (let i = 0; i < 50; i++) { if (document.querySelector(sel)) return true; await H.pausa(200); } return false; };

  const red = (s) => String(s).replace(/[A-Za-z0-9_-]{20,}/g, '<tok>').slice(0, 160);
  const reg = (x) => { try { const l = JSON.parse(sessionStorage.__net || '[]'); l.push(x); sessionStorage.__net = JSON.stringify(l.slice(-60)); } catch (e) {} };
  if (!window.__redeOn) {
    window.__redeOn = 1;
    const ab = XMLHttpRequest.prototype.open, en = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__i = [m, red(u)]; return ab.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function (b) { const t = b ? (b instanceof FormData ? 'FormData' : b.constructor.name + ':' + (b.size || b.length || '')) : ''; const i = this.__i; this.addEventListener('loadend', () => reg(['XHR', ...(i || []), t, this.status])); return en.apply(this, arguments); };
    const f = window.fetch; window.fetch = function (u, o) { const url = typeof u === 'string' ? u : u.url; const p = f.apply(this, arguments); p.then((r) => reg(['FETCH', (o && o.method) || 'GET', red(url), '', r.status]), () => reg(['FETCH', (o && o.method) || 'GET', red(url), '', 'ERR'])); return p; };
    const wo = window.WebSocket; if (wo) window.WebSocket = function (u, p) { reg(['WS', red(u)]); return new wo(u, p); };
  }
  H.rede = () => JSON.parse(sessionStorage.__net || '[]').map((x) => x.join(' ')).join('\n');
  H.limpaRede = () => { sessionStorage.__net = '[]'; };
  H.estado = () => ({ u: red(location.pathname + location.search), t: H.texto('body').split('O software de PDF que tem')[0].replace(/JUNTAR PDF\nDIVIDIR PDF\nCOMPRIMIR PDF\nCONVERTER PDF\nTODAS AS FERRAMENTAS PDF\nEntrar\nRegistre-se\n/, '').slice(0, 1800), c: H.ctrl().map((x) => [x.t, x.id, x.n, x.rot, x.txt, x.opc ? x.opc.join('/') : '', x.on, x.v, x.min, x.max].filter((y) => y !== undefined && y !== '').join('|')) });
})();

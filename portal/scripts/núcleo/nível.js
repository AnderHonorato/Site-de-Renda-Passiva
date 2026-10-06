const SVG_NS = 'http://www.w3.org/2000/svg';
const PALETA = Object.freeze(['#557C68', '#4E718E', '#8A669A', '#B4773F', '#468A87', '#B75D74', '#6B70B7', '#9B7A32', '#397A58']);
const BIBLIOTECA_AVATARES = Object.freeze(['sol', 'folha', 'estrela']);

function númeroSeguro(valor, mínimo, máximo, padrão) {
  try {
    const número = Number(valor);
    return Number.isFinite(número) ? Math.min(máximo, Math.max(mínimo, Math.floor(número))) : padrão;
  } catch { return padrão; }
}

/** Geometria pura, previsível e limitada para níveis crescentes. */
export function geometriaNivel(nivel) {
  const valor = númeroSeguro(nivel, 1, 1_000_000_000, 1);
  const patamar = Math.min(8, Math.floor(Math.log10(valor)));
  const pontas = 4 + Math.min(8, patamar * 2);
  const ornamentos = Array.from({ length: Math.min(6, patamar) }, (_, índice) => {
    const ângulo = (Math.PI * 2 * índice) / Math.max(1, Math.min(6, patamar)) - Math.PI / 2;
    return Object.freeze({ x: Number((32 + Math.cos(ângulo) * 25).toFixed(3)), y: Number((32 + Math.sin(ângulo) * 25).toFixed(3)) });
  });
  return Object.freeze({
    nivel: valor,
    patamar,
    cor: PALETA[patamar],
    pontas,
    raioExterior: 27 + Math.min(5, patamar),
    ornamentos: Object.freeze(ornamentos),
  });
}

function elemento(doc, nome, atributos = {}) {
  const nó = doc.createElementNS(SVG_NS, nome);
  for (const [chave, valor] of Object.entries(atributos)) nó.setAttribute(chave, String(valor));
  return nó;
}

function criarSvg(doc, classe, descrição) {
  const svg = elemento(doc, 'svg', { class: classe, viewBox: '0 0 64 64', role: 'img', 'aria-label': descrição, focusable: 'false' });
  const título = elemento(doc, 'title');
  título.textContent = descrição;
  svg.append(título);
  return svg;
}

function caminhoPolígono(cx, cy, raio, quantidade, rotação = -Math.PI / 2) {
  return Array.from({ length: quantidade }, (_, índice) => {
    const ângulo = rotação + (Math.PI * 2 * índice) / quantidade;
    return `${índice ? 'L' : 'M'}${(cx + Math.cos(ângulo) * raio).toFixed(2)} ${(cy + Math.sin(ângulo) * raio).toFixed(2)}`;
  }).join(' ') + ' Z';
}

/** Cria um selo SVG sem interpretar nível ou qualquer outro dado como HTML. */
export function criarIconeNivel(nivel, { doc = document } = {}) {
  const geometria = geometriaNivel(nivel);
  const svg = criarSvg(doc, `ícone-nível ícone-nível--${geometria.patamar}`, `Nível ${geometria.nivel}`);
  svg.setAttribute('data-patamar', String(geometria.patamar));
  svg.append(elemento(doc, 'path', { d: caminhoPolígono(32, 32, geometria.raioExterior, geometria.pontas), fill: geometria.cor, class: 'ícone-nível__base' }));
  svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, opacity: .72 }));
  svg.append(elemento(doc, 'path', { d: caminhoPolígono(32, 32, 12 + Math.min(4, geometria.patamar), 4 + Math.min(8, geometria.patamar * 2)), fill: 'currentColor', class: 'ícone-nível__símbolo' }));
  for (const ornamento of geometria.ornamentos) svg.append(elemento(doc, 'circle', { cx: ornamento.x, cy: ornamento.y, r: 2.1, fill: 'currentColor', class: 'ícone-nível__ornamento' }));
  return svg;
}

/** Avatares predefinidos: nomes desconhecidos não criam conteúdo. */
export function criarAvatar(nomeBiblioteca, { doc = document } = {}) {
  const nomes = Object.freeze({ sol: 'Sol', folha: 'Folha', estrela: 'Estrela' });
  if (!BIBLIOTECA_AVATARES.includes(nomeBiblioteca)) return null;
  const svg = criarSvg(doc, `avatar-biblioteca avatar-biblioteca--${nomeBiblioteca}`, `Avatar ${nomes[nomeBiblioteca]}`);
  if (nomeBiblioteca === 'sol') {
    for (let i = 0; i < 8; i++) {
      const ângulo = (Math.PI * 2 * i) / 8;
      const x1 = 32 + Math.cos(ângulo) * 20, y1 = 32 + Math.sin(ângulo) * 20;
      const x2 = 32 + Math.cos(ângulo) * 25, y2 = 32 + Math.sin(ângulo) * 25;
      svg.append(elemento(doc, 'path', { d: `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`, stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    }
    svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 15, fill: 'currentColor' }));
  } else if (nomeBiblioteca === 'folha') {
    svg.append(elemento(doc, 'path', { d: 'M50 13C29 12 15 20 14 36c-1 10 8 16 17 13 15-4 19-20 19-36Z', fill: 'currentColor' }));
    svg.append(elemento(doc, 'path', { d: 'M16 50c8-12 16-19 28-29', fill: 'none', stroke: 'var(--fundo, #fff)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
  } else {
    svg.append(elemento(doc, 'path', { d: caminhoPolígono(32, 32, 24, 10, -Math.PI / 2), fill: 'currentColor' }));
    svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 5, fill: 'var(--fundo, #fff)' }));
  }
  return svg;
}

export function resumoTempoNaComunidade(criadoEm, agora = Date.now()) {
  let início;
  try { início = new Date(criadoEm).getTime(); } catch { início = NaN; }
  if (!Number.isFinite(início) || início > agora) return Object.freeze({ título: 'Tempo na comunidade indisponível', valor: 0, unidade: 'dia' });
  const dias = Math.floor((agora - início) / 86_400_000);
  if (dias < 1) return Object.freeze({ título: 'Na comunidade há menos de um dia', valor: 0, unidade: 'dia' });
  if (dias < 30) return Object.freeze({ título: `Na comunidade há ${dias} ${dias === 1 ? 'dia' : 'dias'}`, valor: dias, unidade: 'dia' });
  const meses = Math.floor(dias / 30);
  if (meses < 12) return Object.freeze({ título: `Na comunidade há ${meses} ${meses === 1 ? 'mês' : 'meses'}`, valor: meses, unidade: 'mês' });
  const anos = Math.floor(meses / 12), mesesRestantes = meses % 12;
  const período = `${anos} ${anos === 1 ? 'ano' : 'anos'}${mesesRestantes ? ` e ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}` : ''}`;
  return Object.freeze({ título: `Na comunidade há ${período}`, valor: anos, unidade: 'ano' });
}

/** Retorna um SVG de relógio cuja dica acessível contém o tempo calculado desde o cadastro. */
export function criarTempoNaComunidade(criadoEm, { doc = document, agora = Date.now() } = {}) {
  const resumo = resumoTempoNaComunidade(criadoEm, agora);
  const svg = criarSvg(doc, 'ícone-tempo-comunidade', resumo.título);
  svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 23, fill: 'none', stroke: 'currentColor', 'stroke-width': 3 }));
  svg.append(elemento(doc, 'path', { d: 'M32 17v16l11 7', fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  svg.setAttribute('data-tempo-unidade', resumo.unidade);
  svg.setAttribute('data-tempo-valor', String(resumo.valor));
  return svg;
}

export const nomesAvataresDisponíveis = BIBLIOTECA_AVATARES;

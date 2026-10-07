const SVG_NS = 'http://www.w3.org/2000/svg';
const PALETA = Object.freeze(['#557C68', '#4E718E', '#8A669A', '#B4773F', '#468A87', '#B75D74', '#6B70B7', '#9B7A32', '#397A58']);
const BIBLIOTECA_AVATARES = Object.freeze(['sol', 'folha', 'estrela', 'lua', 'orbita', 'chama', 'raio', 'flor', 'planeta', 'nuvem', 'diamante', 'cometa', 'onda', 'coroa', 'borboleta']);

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
  const nomes = Object.freeze({
    sol: 'Sol', folha: 'Folha', estrela: 'Estrela', lua: 'Lua', orbita: 'Órbita',
    chama: 'Chama', raio: 'Raio', flor: 'Flor', planeta: 'Planeta', nuvem: 'Nuvem',
    diamante: 'Diamante', cometa: 'Cometa', onda: 'Onda', coroa: 'Coroa', borboleta: 'Borboleta',
  });
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
  } else if (nomeBiblioteca === 'estrela') {
    svg.append(elemento(doc, 'path', { d: caminhoPolígono(32, 32, 24, 10, -Math.PI / 2), fill: 'currentColor' }));
    svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 5, fill: 'var(--fundo, #fff)' }));
  } else if (nomeBiblioteca === 'lua') {
    svg.append(elemento(doc, 'path', { d: 'M44 12c-12 3-19 15-15 27 3 8 10 13 19 13-5 5-12 8-20 6C15 55 8 42 11 29 14 17 27 9 44 12Z', fill: 'currentColor' }));
  } else if (nomeBiblioteca === 'orbita') {
    svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 8, fill: 'currentColor' }));
    svg.append(elemento(doc, 'ellipse', { cx: 32, cy: 32, rx: 24, ry: 11, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, transform: 'rotate(-18 32 32)' }));
    svg.append(elemento(doc, 'circle', { cx: 52, cy: 24, r: 4, fill: 'currentColor' }));
  } else if (nomeBiblioteca === 'chama') {
    svg.append(elemento(doc, 'path', { d: 'M34 7c2 11-7 13-5 23 2 6 8 5 9 0 1-4-1-7-1-10 10 7 14 15 10 25-3 8-11 13-20 12S14 49 15 39c1-9 7-14 12-20 3-4 5-8 7-12Z', fill: 'currentColor' }));
  } else if (nomeBiblioteca === 'raio') {
    svg.append(elemento(doc, 'path', { d: 'M35 6 17 35h13l-3 23 20-31H34l1-21Z', fill: 'currentColor' }));
  } else if (nomeBiblioteca === 'flor') {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      svg.append(elemento(doc, 'ellipse', { cx: 32 + Math.cos(a) * 13, cy: 32 + Math.sin(a) * 13, rx: 8, ry: 13, fill: 'currentColor', transform: `rotate(${(i * 60) + 90} ${32 + Math.cos(a) * 13} ${32 + Math.sin(a) * 13})` }));
    }
    svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 8, fill: 'var(--fundo, #fff)' }));
  } else if (nomeBiblioteca === 'planeta') {
    svg.append(elemento(doc, 'circle', { cx: 32, cy: 32, r: 15, fill: 'currentColor' }));
    svg.append(elemento(doc, 'ellipse', { cx: 32, cy: 32, rx: 28, ry: 9, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, transform: 'rotate(-12 32 32)' }));
  } else if (nomeBiblioteca === 'nuvem') {
    svg.append(elemento(doc, 'path', { d: 'M16 47h32c7 0 11-4 11-10 0-6-5-10-11-10h-2C43 18 36 14 28 17c-6 2-9 7-9 13-7 0-12 3-12 9 0 5 4 8 9 8Z', fill: 'currentColor' }));
  } else if (nomeBiblioteca === 'diamante') {
    svg.append(elemento(doc, 'path', { d: 'M13 23 22 11h20l9 12-19 30L13 23Z', fill: 'currentColor' }));
    svg.append(elemento(doc, 'path', { d: 'M13 23h38M22 11l10 42 10-42M22 11l10 12 10-12', fill: 'none', stroke: 'var(--fundo, #fff)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  } else if (nomeBiblioteca === 'cometa') {
    svg.append(elemento(doc, 'circle', { cx: 41, cy: 25, r: 12, fill: 'currentColor' }));
    svg.append(elemento(doc, 'path', { d: 'M31 32C20 36 13 43 8 53c10-5 18-7 29-17M29 27C18 28 11 32 5 39c10-2 18-2 28-7', fill: 'none', stroke: 'currentColor', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  } else if (nomeBiblioteca === 'onda') {
    svg.append(elemento(doc, 'path', { d: 'M7 39c8-1 10-9 17-15 6-5 14-7 21-3 7 4 11 11 12 19-5-5-9-7-14-7-8 0-11 8-18 10-7 2-13-1-18-4Z', fill: 'currentColor' }));
    svg.append(elemento(doc, 'path', { d: 'M15 46c8 5 18 5 27-1 5-3 9-4 15-3', fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  } else if (nomeBiblioteca === 'coroa') {
    svg.append(elemento(doc, 'path', { d: 'M10 20 23 31 32 13l9 18 13-11-5 29H15l-5-29Z', fill: 'currentColor', 'stroke-linejoin': 'round' }));
    svg.append(elemento(doc, 'path', { d: 'M17 43h30', fill: 'none', stroke: 'var(--fundo, #fff)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  } else if (nomeBiblioteca === 'borboleta') {
    svg.append(elemento(doc, 'ellipse', { cx: 20, cy: 25, rx: 12, ry: 17, fill: 'currentColor', transform: 'rotate(-28 20 25)' }));
    svg.append(elemento(doc, 'ellipse', { cx: 44, cy: 25, rx: 12, ry: 17, fill: 'currentColor', transform: 'rotate(28 44 25)' }));
    svg.append(elemento(doc, 'ellipse', { cx: 21, cy: 43, rx: 9, ry: 12, fill: 'currentColor', transform: 'rotate(22 21 43)' }));
    svg.append(elemento(doc, 'ellipse', { cx: 43, cy: 43, rx: 9, ry: 12, fill: 'currentColor', transform: 'rotate(-22 43 43)' }));
    svg.append(elemento(doc, 'path', { d: 'M32 20v29M31 22c-3-7-6-10-10-12M33 22c3-7 6-10 10-12', fill: 'none', stroke: 'var(--fundo, #fff)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
  }
  return svg;
}

export function criarAvatarDoPerfil(perfil, { doc = document } = {}) {
  if (perfil?.foto_url) {
    const img = doc.createElement('img');
    img.className = 'avatar-foto';
    img.src = perfil.foto_url;
    img.alt = perfil.nome ? `Foto de ${perfil.nome}` : 'Foto de perfil';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }
  return criarAvatar(perfil?.avatar || 'sol', { doc });
}

export function resumoTempoNaComunidade(criadoEm, agora = Date.now()) {
  let início;
  try {
    if (typeof criadoEm === 'number' && Number.isFinite(criadoEm)) {
      início = criadoEm;
    } else if (criadoEm instanceof Date) {
      início = criadoEm.getTime();
    } else {
      const texto = String(criadoEm ?? '').trim();
      const normalizado = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)
        ? texto.replace(' ', 'T') + 'Z'
        : texto;
      início = new Date(normalizado).getTime();
    }
  } catch { início = NaN; }
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

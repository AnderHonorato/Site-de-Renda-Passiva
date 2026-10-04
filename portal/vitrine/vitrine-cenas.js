// portal/vitrine/vitrine-cenas.js
// Roteiro de 15 s em cinco cenas. Linguagem visual: papel recortado — sombra sólida
// deslocada, peças que caem, quicam e balançam como papel de verdade.
//
//  0,00–2,55  O ponto        ponto cai, vira o selo "A", contador 0→49 e "ferramentas"
//  2,30–6,10  Seis áreas     o selo se abre em seis cartões animados; clique em Confeitaria
//  5,90–9,55  Na hora        o cartão vira a calculadora real de preço de venda; etiqueta balança
//  9,30–12,3  Como se mantém grátis para quem usa, anúncio discreto, apoio via Pix
// 12,00–15,0  Assinatura     selo, "Ferramentas por Ander", lema; volta ao ponto (loop contínuo)

import {
  cores, categorias, limitar, progresso, misturar, curva, mola, pêndulo,
  criarAleatório, caminhoArredondado, papel, traçar, fonte,
} from './vitrine-motor.js';

const VERMELHO = categorias[0].cor;
const VERMELHO_SOMBRA = categorias[0].sombra;

// ---------------------------------------------------------------- utilidades de texto
function larguraTexto(ctx, texto) { return ctx.measureText(texto).width; }

function quebrarLinhas(ctx, texto, larguraMáxima) {
  const palavras = texto.split(' ');
  const linhas = [];
  let atual = '';
  for (const palavra of palavras) {
    const teste = atual ? atual + ' ' + palavra : palavra;
    if (larguraTexto(ctx, teste) > larguraMáxima && atual) { linhas.push(atual); atual = palavra; }
    else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function tamanhoQueCabe(ctx, família, texto, desejado, larguraMáxima, peso = 400) {
  fonte(ctx, família, desejado, peso);
  const l = larguraTexto(ctx, texto);
  return l > larguraMáxima ? desejado * (larguraMáxima / l) : desejado;
}

// Letras que surgem uma a uma com giro e excesso de escala.
function textoPipocando(ctx, texto, x, y, t, início, o = {}) {
  const { passo = 0.035, duração = 0.42, tamanho = 100, família = 'titulo', peso = 400, cor = cores.tinta, alinhar = 'left', semente = 7, queda = 46, saída = null } = o;
  fonte(ctx, família, tamanho, peso);
  const total = larguraTexto(ctx, texto);
  const x0 = alinhar === 'center' ? x - total / 2 : alinhar === 'right' ? x - total : x;
  const aleatório = criarAleatório(semente);
  ctx.save();
  ctx.fillStyle = cor;
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < texto.length; i++) {
    const giroInicial = (aleatório() - 0.5) * 0.9;
    const letra = texto[i];
    if (letra === ' ') continue;
    const p = progresso(t, início + i * passo, início + i * passo + duração);
    if (p <= 0) continue;
    let escala = curva.saidaVolta(p, 2.4);
    let dy = (1 - curva.saidaCubica(p)) * queda;
    let giro = giroInicial * (1 - curva.saidaCubica(p));
    if (saída) {
      const q = progresso(t, saída + i * 0.012, saída + i * 0.012 + 0.28);
      if (q >= 1) continue;
      escala *= 1 - curva.entradaVolta(q, 2) * 0.999;
      dy -= q * 30;
    }
    const antes = larguraTexto(ctx, texto.slice(0, i));
    const l = larguraTexto(ctx, letra);
    ctx.save();
    ctx.translate(x0 + antes + l / 2, y + dy);
    ctx.rotate(giro);
    ctx.scale(Math.max(0, escala), Math.max(0, escala));
    ctx.fillText(letra, -l / 2, 0);
    ctx.restore();
  }
  ctx.restore();
  return total;
}

// Letras que caem na linha de base e amassam ao tocar nela.
function textoCaindo(ctx, texto, x, y, t, início, o = {}) {
  const { passo = 0.026, tamanho = 90, cor = cores.tinta, altura = 150 } = o;
  fonte(ctx, 'titulo', tamanho);
  ctx.save();
  ctx.fillStyle = cor;
  for (let i = 0; i < texto.length; i++) {
    const letra = texto[i];
    if (letra === ' ') continue;
    const t0 = início + i * passo;
    const queda = progresso(t, t0, t0 + 0.24);
    if (queda <= 0) continue;
    const impacto = progresso(t, t0 + 0.24, t0 + 0.46);
    const amasso = impacto > 0 && impacto < 1 ? Math.sin(Math.PI * impacto) * (1 - impacto) : 0;
    const antes = larguraTexto(ctx, texto.slice(0, i));
    const l = larguraTexto(ctx, letra);
    ctx.save();
    ctx.translate(x + antes + l / 2, y - (1 - curva.entradaQuad(queda)) * altura);
    ctx.scale(1 + amasso * 0.34, 1 - amasso * 0.4);
    ctx.globalAlpha = limitar(queda * 3);
    ctx.fillText(letra, -l / 2, 0);
    ctx.restore();
  }
  ctx.restore();
}

// Texto revelado da esquerda para a direita, como escrita à mão.
function textoEscrito(ctx, linhas, x, y, p, o = {}) {
  const { tamanho = 56, cor = cores.vinho, alinhar = 'left', entrelinha = 1.15, família = 'mao', peso = 700 } = o;
  if (p <= 0) return;
  fonte(ctx, família, tamanho, peso);
  const larguras = linhas.map((l) => larguraTexto(ctx, l));
  const soma = larguras.reduce((a, b) => a + b, 0);
  let restante = soma * p;
  ctx.save();
  ctx.fillStyle = cor;
  linhas.forEach((linha, i) => {
    const l = larguras[i];
    const visível = limitar(restante, 0, l);
    restante -= l;
    if (visível <= 0) return;
    const lx = alinhar === 'center' ? x - l / 2 : x;
    const ly = y + i * tamanho * entrelinha;
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx - 10, ly - tamanho * 1.1, visível + 10, tamanho * 1.6);
    ctx.clip();
    ctx.fillText(linha, lx, ly);
    ctx.restore();
  });
  ctx.restore();
}

// Rabisco ondulado desenhado progressivamente.
function rabisco(ctx, x0, x1, y, p, { cor = cores.girassol, espessura = 9, onda = 7, voltas = 5 } = {}) {
  if (p <= 0) return;
  const pontos = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40;
    pontos.push([misturar(x0, x1, s), y + Math.sin(s * Math.PI * 2 * voltas) * onda * (0.6 + 0.4 * Math.sin(s * 3))]);
  }
  let comprimento = 0;
  for (let i = 1; i < pontos.length; i++) comprimento += Math.hypot(pontos[i][0] - pontos[i - 1][0], pontos[i][1] - pontos[i - 1][1]);
  ctx.save();
  ctx.strokeStyle = cor; ctx.lineWidth = espessura; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  traçar(ctx, () => { ctx.beginPath(); pontos.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); }, p, comprimento);
  ctx.restore();
}

function misturarCor(a, b, p) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(misturar(v, pb[i], p))).join(',')})`;
}

// ---------------------------------------------------------------- peças recorrentes
function desenharSelo(ctx, { x, y, tamanho, giro = 0, raio = 0.245, preenchimento = 1, letra = 1, escalaX = 1, escalaY = 1, âncoraBase = false }) {
  if (tamanho <= 0.5) return;
  ctx.save();
  ctx.translate(x, y + (âncoraBase ? tamanho / 2 : 0));
  ctx.scale(escalaX, escalaY);
  if (âncoraBase) ctx.translate(0, -tamanho / 2);
  ctx.rotate(giro);
  const r = tamanho * raio;
  if (preenchimento > 0) {
    ctx.globalAlpha = 1;
    caminhoArredondado(ctx, -tamanho / 2 + tamanho * 0.05, -tamanho / 2 + tamanho * 0.08, tamanho, tamanho, r);
    ctx.fillStyle = `rgba(106,31,54,${0.28 * preenchimento})`;
    ctx.fill();
  }
  caminhoArredondado(ctx, -tamanho / 2, -tamanho / 2, tamanho, tamanho, r);
  if (preenchimento > 0) { ctx.globalAlpha = preenchimento; ctx.fillStyle = cores.vinho; ctx.fill(); ctx.globalAlpha = 1; }
  if (preenchimento < 1) { ctx.lineWidth = tamanho * 0.06; ctx.strokeStyle = cores.vinho; ctx.stroke(); }
  if (letra > 0) {
    const tamanhoLetra = tamanho * 0.56;
    fonte(ctx, 'corpo', tamanhoLetra, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.scale(letra, letra);
    ctx.fillStyle = misturarCor(cores.papel, cores.vinho, 1 - preenchimento);
    ctx.fillText('A', 0, tamanho * 0.03);
    ctx.restore();
  }
  ctx.restore();
}

function desenharCursor(ctx, x, y, escala = 1, alfa = 1) {
  if (alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.translate(x, y);
  ctx.scale(escala * 1.5, escala * 1.5);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(13.5, 35); ctx.lineTo(19, 32.5); ctx.lineTo(13.5, 21); ctx.lineTo(23, 21); ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4; ctx.strokeStyle = cores.papel; ctx.stroke();
  ctx.fillStyle = cores.tinta; ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- layouts
function layoutAbertura(ctx, c, tx) {
  const { W, H, retrato } = c;
  const cx = W / 2, cy = H / 2;
  if (retrato) {
    const tamFer = tamanhoQueCabe(ctx, 'titulo', tx.ferramentas, 132, 900);
    return {
      selo: { x: cx, y: cy - 380, tamanho: 190 },
      número: { x: cx, y: cy + 70, tamanho: 320, alinhar: 'center' },
      ferramentas: { x: cx, y: cy + 215, tamanho: tamFer, alinhar: 'center' },
      anotação: { x: cx, y: cy + 330, tamanho: 58, alinhar: 'center' },
      sublinhado: (l) => [cx - l / 2, cx + l / 2, cy + 245],
    };
  }
  fonte(ctx, 'titulo', 300); const larguraNúmero = larguraTexto(ctx, '00');
  fonte(ctx, 'titulo', 124); const larguraFer = larguraTexto(ctx, tx.ferramentas);
  const bloco = Math.max(larguraNúmero, larguraFer);
  const total = 190 + 76 + bloco;
  const início = cx - total / 2;
  const textoX = início + 190 + 76;
  return {
    selo: { x: início + 95, y: cy - 34, tamanho: 190 },
    número: { x: textoX, y: cy - 8, tamanho: 300, alinhar: 'left' },
    ferramentas: { x: textoX, y: cy + 124, tamanho: 124, alinhar: 'left' },
    anotação: { x: textoX + 6, y: cy + 222, tamanho: 54, alinhar: 'left' },
    sublinhado: (l) => [textoX, textoX + l, cy + 150],
  };
}

function layoutGrade(ctx, c, tx) {
  const { W, H, retrato } = c;
  const colunas = retrato ? 2 : 3, linhas = retrato ? 3 : 2;
  const cartãoL = retrato ? 440 : 500, cartãoA = retrato ? 400 : 330, vão = 36;
  const gradeL = colunas * cartãoL + (colunas - 1) * vão;
  const gradeA = linhas * cartãoA + (linhas - 1) * vão;
  fonte(ctx, 'titulo', 66);
  const linhasTítulo = quebrarLinhas(ctx, tx.tituloÁreas, gradeL);
  const alturaTítulo = linhasTítulo.length * 76;
  const topo = (H - (alturaTítulo + 54 + gradeA)) / 2;
  const esquerda = (W - gradeL) / 2;
  const cartões = categorias.map((cat, i) => {
    const col = i % colunas, lin = Math.floor(i / colunas);
    return {
      ...cat,
      nome: tx.áreas[i],
      x: esquerda + col * (cartãoL + vão) + cartãoL / 2,
      y: topo + alturaTítulo + 54 + lin * (cartãoA + vão) + cartãoA / 2,
      giro: (criarAleatório(40 + i)() - 0.5) * 0.075,
    };
  });
  return { cartões, cartãoL, cartãoA, esquerda, topo, linhasTítulo };
}

function layoutFerramenta(c) {
  const { W, H, retrato, visível } = c;
  const cx = W / 2, cy = H / 2;
  if (retrato) {
    return {
      painel: { x: cx, y: 650, l: 920, a: 760 },
      etiqueta: { âncoraX: 760, âncoraY: 1000, fio: 170 },
      notas: [[300, 1185, -0.08], [270, 1370, 0.06], [330, 1560, -0.04]],
    };
  }
  return {
    painel: { x: cx - 300, y: cy + 10, l: 820, a: 750 },
    etiqueta: { âncoraX: cx + 470, âncoraY: visível.y0 - 10, fio: 330 - visível.y0 },
    notas: [[cx + 330, 860, -0.07], [cx + 800, 770, 0.06], [cx + 680, 985, -0.03]],
  };
}

function layoutGrátis(ctx, c) {
  const { W, H, retrato } = c;
  const cx = W / 2;
  if (retrato) {
    return {
      título: { x: 80, y: 330, larguraMáx: 920 },
      subtítulo: { x: 80, y: 410, larguraMáx: 920 },
      nós: [[cx - 50, 720], [cx - 50, 1110], [cx - 50, 1500]],
      cartão: [440, 270],
      vertical: true,
    };
  }
  return {
    título: { x: 180, y: 285, larguraMáx: 1560 },
    subtítulo: { x: 180, y: 357, larguraMáx: 1560 },
    nós: [[400, 690], [960, 690], [1520, 690]],
    cartão: [390, 290],
    vertical: false,
  };
}

// ---------------------------------------------------------------- cena 1: o ponto
function cenaAbertura(ctx, c, tx) {
  const { t, W, H, visível } = c;
  if (t > 2.6) return;
  const L = layoutAbertura(ctx, c, tx);
  const cx = W / 2, cy = H / 2;

  // Ponto → selo
  if (t < 2.5) {
    let x = cx, y = cy, tamanho = 64, raio = 0.5, giro = 0, escalaX = 1, escalaY = 1, letra = 0, âncoraBase = false;
    if (t < 0.45) {
      y = misturar(visível.y0 - 60, cy, curva.entradaQuad(progresso(t, 0, 0.45)));
      escalaY = 1 + 0.25 * progresso(t, 0.2, 0.45);
      escalaX = 1 - 0.12 * progresso(t, 0.2, 0.45);
      âncoraBase = true;
    } else {
      const amasso = progresso(t, 0.45, 0.66);
      const s = Math.sin(Math.PI * amasso) * (1 - amasso * 0.4);
      escalaX = 1 + 0.5 * s; escalaY = 1 - 0.42 * s; âncoraBase = true;
      const forma = mola(t - 0.56, 1.5, 6.5);
      tamanho = misturar(64, L.selo.tamanho, forma);
      raio = misturar(0.5, 0.245, limitar(forma));
      giro = misturar(Math.PI / 4 + 0.35, -0.07, forma);
      letra = curva.saidaVolta(progresso(t, 0.82, 1.12), 2.6);
      const desloca = curva.saidaCubica(progresso(t, 1.0, 1.5));
      x = misturar(cx, L.selo.x, desloca);
      y = misturar(cy, L.selo.y, desloca);
    }
    // saída: gira e encolhe enquanto os cartões nascem dele
    const fim = progresso(t, 2.18, 2.48);
    if (fim > 0) { tamanho *= 1 - curva.entradaVolta(fim, 2.2); giro += fim * 1.6; }
    desenharSelo(ctx, { x, y, tamanho, giro, raio, letra, escalaX, escalaY, âncoraBase });
  }

  // Contador 00 → 49 (odômetro)
  const entrada = progresso(t, 1.08, 1.38);
  if (entrada > 0) {
    const saída = curva.entradaCubica(progresso(t, 2.08, 2.32));
    const valor = Number(tx.número) * curva.saidaExpo(progresso(t, 1.12, 1.95));
    ctx.save();
    ctx.globalAlpha = limitar(entrada * 2) * (1 - saída);
    const escala = curva.saidaVolta(entrada, 2);
    const n = L.número;
    fonte(ctx, 'titulo', n.tamanho);
    const larguraDígito = larguraTexto(ctx, '0');
    const larguraTotal = larguraDígito * 2;
    const x0 = n.alinhar === 'center' ? n.x - larguraTotal / 2 : n.x;
    ctx.translate(x0 + larguraTotal / 2, n.y - saída * 70);
    ctx.scale(escala, escala);
    ctx.translate(-larguraTotal / 2, 0);
    const alturaLinha = n.tamanho * 0.92;
    const unidades = valor % 10;
    const dezenas = Math.floor(valor / 10) + Math.max(0, (valor % 10) - 9);
    [[dezenas, 0], [unidades, larguraDígito]].forEach(([contínuo, dx], coluna) => {
      const base = Math.floor(contínuo), fração = contínuo - base;
      ctx.save();
      if (coluna === 0) ctx.globalAlpha *= limitar(contínuo * 1.4);
      ctx.beginPath();
      ctx.rect(dx - 10, -n.tamanho * 0.86, larguraDígito + 20, n.tamanho * 1.02);
      ctx.clip();
      ctx.fillStyle = cores.vinho;
      ctx.fillText(String(base % 10), dx, -fração * alturaLinha);
      ctx.fillText(String((base + 1) % 10), dx, alturaLinha - fração * alturaLinha);
      ctx.restore();
    });
    ctx.restore();
  }

  // "ferramentas"
  const f = L.ferramentas;
  const largura = textoPipocando(ctx, tx.ferramentas, f.x, f.y, t, 1.32, { tamanho: f.tamanho, alinhar: f.alinhar, passo: 0.042, saída: 2.05, semente: 11 });

  // sublinhado e anotação à mão
  const saídaAnotação = progresso(t, 2.05, 2.3);
  ctx.save();
  ctx.globalAlpha = 1 - saídaAnotação;
  const [s0, s1, sy] = L.sublinhado(largura);
  rabisco(ctx, s0, s1, sy, curva.entradaSaidaCubica(progresso(t, 1.78, 2.12)), { espessura: 10, onda: 6, voltas: 6 });
  const a = L.anotação;
  ctx.translate(a.x, a.y); ctx.rotate(-0.025);
  textoEscrito(ctx, [tx.anotaçãoGrátis], 0, 0, progresso(t, 1.86, 2.2), { tamanho: a.tamanho, alinhar: a.alinhar });
  ctx.restore();
}

// ---------------------------------------------------------------- cena 2: seis áreas
function ilustração(ctx, id, t, l, a, cor, sombra, tx) {
  // l × a é a área da ilustração, centrada na origem
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (id === 'confeitaria') {
    const camadas = [0.62, 0.5, 0.38];
    const altura = a * 0.2;
    let base = a * 0.42;
    ctx.fillStyle = 'rgba(255,250,245,.35)';
    caminhoArredondado(ctx, -l * 0.42, base, l * 0.84, 10, 5); ctx.fill();
    camadas.forEach((fração, k) => {
      const dt = t - k * 0.17;
      const p = mola(dt, 1.9, 7.5);
      if (dt <= 0) return;
      const largura = l * fração;
      const alvo = base - altura;
      const y = misturar(-a * 1.3, alvo, p);
      ctx.fillStyle = cores.papel;
      caminhoArredondado(ctx, -largura / 2, y, largura, altura, 14); ctx.fill();
      ctx.fillStyle = '#f0c3b2';
      ctx.beginPath();
      ctx.moveTo(-largura / 2 + 6, y + 4);
      const gotas = 5;
      for (let g = 0; g < gotas; g++) {
        const gx = -largura / 2 + ((g + 0.5) / gotas) * largura;
        const comprimento = altura * (0.35 + 0.25 * ((g * 7 + k) % 3) / 2) * limitar((dt - 0.25) * 3);
        ctx.lineTo(gx - largura / gotas * 0.3, y + 8);
        ctx.quadraticCurveTo(gx, y + 8 + comprimento * 2, gx + largura / gotas * 0.3, y + 8);
      }
      ctx.lineTo(largura / 2 - 6, y + 4); ctx.lineTo(largura / 2 - 6, y); ctx.lineTo(-largura / 2 + 6, y); ctx.closePath(); ctx.fill();
      base = alvo;
    });
    const dtCereja = t - 0.62;
    if (dtCereja > 0) {
      const y = misturar(-a * 1.2, base - 20, mola(dtCereja, 2.4, 8));
      ctx.strokeStyle = '#3d4451'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, y - 16); ctx.quadraticCurveTo(8, y - 40, 22, y - 46); ctx.stroke();
      ctx.fillStyle = cores.vinhoEscuro;
      ctx.beginPath(); ctx.arc(0, y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,245,.5)';
      ctx.beginPath(); ctx.arc(-6, y - 6, 5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'educacao') {
    const fl = l * 0.86, fa = a * 0.92;
    const entrada = curva.saidaVolta(progresso(t, 0, 0.35), 1.8);
    ctx.rotate(-0.04);
    ctx.scale(entrada, entrada);
    ctx.fillStyle = cores.papel;
    caminhoArredondado(ctx, -fl / 2, -fa / 2, fl, fa, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(61,68,81,.28)'; ctx.lineWidth = 2;
    const passo = 26;
    const linhas = Math.floor(fa / passo), colunas = Math.floor(fl / passo);
    for (let i = 1; i < linhas; i++) {
      const p = progresso(t, 0.2 + i * 0.03, 0.5 + i * 0.03);
      if (p <= 0) continue;
      ctx.beginPath(); ctx.moveTo(-fl / 2, -fa / 2 + i * passo); ctx.lineTo(-fl / 2 + fl * p, -fa / 2 + i * passo); ctx.stroke();
    }
    for (let j = 1; j < colunas; j++) {
      const p = progresso(t, 0.25 + j * 0.02, 0.55 + j * 0.02);
      if (p <= 0) continue;
      ctx.beginPath(); ctx.moveTo(-fl / 2 + j * passo, -fa / 2); ctx.lineTo(-fl / 2 + j * passo, -fa / 2 + fa * p); ctx.stroke();
    }
    fonte(ctx, 'mao', a * 0.36, 700);
    const texto = tx.contaEducação;
    const lt = larguraTexto(ctx, texto);
    textoEscrito(ctx, [texto], -lt / 2, a * 0.12, progresso(t, 0.55, 1.2), { tamanho: a * 0.36, cor: sombra });
    const pc = curva.entradaSaidaCubica(progresso(t, 1.15, 1.5));
    if (pc > 0) {
      ctx.strokeStyle = cores.girassol; ctx.lineWidth = 7;
      const rx = a * 0.28, cxr = lt / 2 - a * 0.2, cyr = a * 0.02;
      traçar(ctx, () => { ctx.beginPath(); ctx.ellipse(cxr, cyr, rx, rx * 0.72, -0.2, -Math.PI * 0.6, Math.PI * 1.55); }, pc, rx * 7);
    }
  } else if (id === 'artesanato') {
    const voltas = 4, largura = l * 0.78;
    const passoθ = (largura) / (voltas * 2 * Math.PI);
    const b = passoθ * 2.7;
    const pontos = [];
    for (let i = 0; i <= 220; i++) {
      const θ = (i / 220) * voltas * 2 * Math.PI;
      pontos.push([-largura / 2 + passoθ * θ - b * Math.sin(θ), -b * Math.cos(θ) + a * 0.05]);
    }
    const p = curva.entradaSaidaCubica(progresso(t, 0.05, 1.25));
    const índice = Math.floor(p * (pontos.length - 1));
    ctx.strokeStyle = cores.papel; ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i <= índice; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pontos[i][0], pontos[i][1]);
    ctx.stroke();
    const [nx, ny] = pontos[Math.max(0, índice)];
    const raio = 34 * curva.saidaVolta(progresso(t, 0, 0.3), 2);
    if (raio > 0) {
      ctx.save();
      ctx.translate(nx + 40 * (1 - p), a * 0.05 + b + 6 - raio);
      ctx.rotate(p * 14);
      ctx.fillStyle = cores.papel;
      ctx.beginPath(); ctx.arc(0, 0, raio, 0, Math.PI * 2); ctx.fill();
      ctx.clip();
      ctx.strokeStyle = sombra; ctx.lineWidth = 4;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(k * raio * 0.55, raio * 1.1, raio * 1.1, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.restore();
    }
  } else if (id === 'festas') {
    const px = l * 0.46, sag = a * 0.18, topo = -a * 0.36;
    const fio = curva.saidaCubica(progresso(t, 0, 0.35));
    ctx.strokeStyle = cores.papel; ctx.lineWidth = 4;
    traçar(ctx, () => { ctx.beginPath(); ctx.moveTo(-px, topo); ctx.quadraticCurveTo(0, topo + sag * 2, px, topo); }, fio, px * 2.4);
    const bandeiras = 6;
    for (let k = 0; k < bandeiras; k++) {
      const s = (k + 0.5) / bandeiras;
      const bx = misturar(-px, px, s);
      const by = topo + sag * 2 * 2 * s * (1 - s) * 1;
      const dt = t - 0.22 - k * 0.07;
      if (dt <= 0) continue;
      const giro = pêndulo(dt, 0.9, 1.3, 3.2);
      const escala = curva.saidaVolta(limitar(dt * 5), 2);
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(giro); ctx.scale(escala, escala);
      ctx.fillStyle = k % 2 ? cores.girassol : cores.papel;
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(0, 54); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const dtC = t - 0.62;
    if (dtC > 0 && dtC < 1.9) {
      const aleatório = criarAleatório(99);
      for (let k = 0; k < 34; k++) {
        const ângulo = -Math.PI / 2 + (aleatório() - 0.5) * 2.2;
        const v = 520 + aleatório() * 520;
        const vx = Math.cos(ângulo) * v, vy = Math.sin(ângulo) * v;
        const x = vx * dtC, y = a * 0.4 + vy * dtC + 0.5 * 1500 * dtC * dtC;
        const giro = aleatório() * 6 + dtC * (aleatório() * 14 - 7);
        const cor = [cores.papel, cores.girassol, '#f3d2c4', '#d8cdb9'][k % 4];
        const alfa = 1 - progresso(dtC, 1.3, 1.9);
        ctx.save();
        ctx.globalAlpha = alfa;
        ctx.translate(x, y); ctx.rotate(giro);
        ctx.fillStyle = cor;
        ctx.fillRect(-7, -4, 14, 8 * Math.abs(Math.cos(dtC * 9 + k)) + 2);
        ctx.restore();
      }
    }
  } else if (id === 'reforma') {
    const faixaA = a * 0.5, x0 = -l * 0.44, x1 = l * 0.44;
    const p = curva.entradaSaidaCubica(progresso(t, 0.1, 1.1));
    const rx = misturar(x0, x1, p);
    ctx.fillStyle = 'rgba(255,250,245,.18)';
    caminhoArredondado(ctx, x0, -faixaA / 2, x1 - x0, faixaA, 12); ctx.fill();
    if (p > 0) {
      ctx.fillStyle = '#ede7df';
      ctx.beginPath();
      ctx.moveTo(x0, -faixaA / 2);
      for (let i = 0; i <= 24; i++) { const s = i / 24; ctx.lineTo(misturar(x0, rx, s), -faixaA / 2 + Math.sin(s * 19) * 3); }
      for (let i = 24; i >= 0; i--) { const s = i / 24; ctx.lineTo(misturar(x0, rx, s), faixaA / 2 + Math.sin(s * 23 + 1) * 4); }
      ctx.closePath(); ctx.fill();
      [0.25, 0.55, 0.8].forEach((s, k) => {
        const dt = t - 0.3 - s * 1.0;
        if (dt <= 0 || misturar(x0, x1, s) > rx) return;
        const comp = Math.min(46, dt * 60) + k * 4;
        const gx = misturar(x0, x1, s);
        ctx.beginPath(); ctx.moveTo(gx - 7, faixaA / 2 - 2);
        ctx.lineTo(gx - 7, faixaA / 2 + comp); ctx.arc(gx, faixaA / 2 + comp, 7, Math.PI, 0, true); ctx.lineTo(gx + 7, faixaA / 2 - 2); ctx.fill();
      });
    }
    const entrada = curva.saidaVolta(progresso(t, 0, 0.25), 2);
    ctx.save();
    ctx.translate(rx, 0); ctx.scale(entrada, entrada);
    ctx.strokeStyle = cores.tinta; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(36, 0); ctx.lineTo(36, faixaA / 2 + 26); ctx.lineTo(22, faixaA / 2 + 26); ctx.lineTo(22, faixaA / 2 + 64); ctx.stroke();
    ctx.fillStyle = cores.papel;
    caminhoArredondado(ctx, -20, -faixaA / 2 - 6, 40, faixaA + 12, 16); ctx.fill();
    ctx.strokeStyle = sombra; ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const yy = -faixaA / 2 + ((k + (t * 3) % 1) / 4) * faixaA; ctx.beginPath(); ctx.moveTo(-14, yy); ctx.lineTo(14, yy); ctx.stroke(); }
    ctx.restore();
  } else if (id === 'embalagens') {
    const q = a * 0.32;
    const desenho = curva.entradaSaidaCubica(progresso(t, 0, 0.75));
    const dobra = curva.entradaSaidaCubica(progresso(t, 0.85, 1.35));
    const cresce = misturar(1, 1.75, curva.saidaVolta(progresso(t, 1.3, 1.65), 2.2));
    ctx.scale(cresce, cresce);
    const abas = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    ctx.lineWidth = 5; ctx.strokeStyle = cores.papel;
    abas.forEach(([dx, dy], k) => {
      const escalaAba = 1 - dobra;
      ctx.save();
      ctx.translate(dx * q / 2, dy * q / 2);
      if (dx) ctx.scale(escalaAba, 1); else ctx.scale(1, escalaAba);
      ctx.translate(dx * q / 2, dy * q / 2);
      ctx.fillStyle = `rgba(255,250,245,${0.16 + dobra * 0.3})`;
      caminhoArredondado(ctx, -q / 2, -q / 2, q, q, 6); ctx.fill();
      traçar(ctx, () => caminhoArredondado(ctx, -q / 2, -q / 2, q, q, 6), limitar(desenho * 4 - k * 0.6), q * 4.2);
      ctx.restore();
    });
    ctx.fillStyle = dobra > 0 ? misturarCor('#3d4451', cores.papel, 0.25 + dobra * 0.75) : 'rgba(255,250,245,.1)';
    caminhoArredondado(ctx, -q / 2, -q / 2, q, q, 6); ctx.fill();
    ctx.save();
    ctx.setLineDash([10, 9]);
    traçar(ctx, () => caminhoArredondado(ctx, -q / 2, -q / 2, q, q, 6), desenho, q * 4.2);
    ctx.restore();
    const fita = curva.saidaCubica(progresso(t, 1.35, 1.6));
    if (fita > 0) {
      ctx.fillStyle = cores.girassol;
      ctx.fillRect(-q * 0.12, -q / 2 - 4, q * 0.24, (q + 8) * fita);
    }
  }
  ctx.restore();
}

function cenaÁreas(ctx, c, tx) {
  const { t, W, H, visível } = c;
  if (t < 2.25 || t > 6.15) return;
  const L = layoutGrade(ctx, c, tx);
  const abertura = layoutAbertura(ctx, c, tx);
  const { cartãoL, cartãoA } = L;

  // título
  const saídaTítulo = progresso(t, 5.25, 5.55);
  ctx.save();
  ctx.globalAlpha = 1 - saídaTítulo;
  L.linhasTítulo.forEach((linha, i) => {
    textoPipocando(ctx, linha, L.esquerda, L.topo + 58 + i * 76, t, 2.72 + i * 0.25, { tamanho: 66, passo: 0.022, duração: 0.38, semente: 3 + i, queda: 30 });
  });
  ctx.restore();

  // cartões — o primeiro fica por cima porque vira a próxima cena
  const ordem = [5, 4, 3, 2, 1, 0];
  for (const i of ordem) {
    const k = L.cartões[i];
    const t0 = 2.3 + i * 0.07;
    const dt = t - t0;
    if (dt <= 0) continue;
    const p = mola(dt, 1.35, 6.2);
    const arco = Math.sin(Math.PI * limitar(dt / 0.7)) * (i % 2 ? -90 : 90);
    let x = misturar(abertura.selo.x, k.x, p) + arco * 0.3;
    let y = misturar(abertura.selo.y, k.y, p) - arco;
    let giro = misturar((i % 2 ? 1 : -1) * 0.9, k.giro, p);
    let escala = misturar(0.12, 1, mola(dt, 1.6, 7));
    let l = cartãoL, a = cartãoA, raio = 28, desvio = 14, conteúdo = 1;

    if (i === 0) {
      // pressionado e expandido até cobrir a tela
      const aperto = progresso(t, 5.33, 5.45);
      escala *= 1 - 0.05 * Math.sin(Math.PI * aperto);
      const e = curva.entradaSaidaCubica(progresso(t, 5.5, 6.05));
      if (e > 0) {
        const vl = visível.x1 - visível.x0, va = visível.y1 - visível.y0;
        x = misturar(x, (visível.x0 + visível.x1) / 2, e);
        y = misturar(y, (visível.y0 + visível.y1) / 2, e);
        l = misturar(cartãoL, vl + 40, e); a = misturar(cartãoA, va + 40, e);
        giro = misturar(giro, 0, e); raio = misturar(28, 0, e); desvio = 14 * (1 - e);
        conteúdo = 1 - progresso(t, 5.5, 5.62);
      }
    } else {
      const dtQueda = t - (5.5 + (5 - i) * 0.035);
      if (dtQueda > 0) {
        y += 0.5 * 5200 * dtQueda * dtQueda - 380 * dtQueda;
        giro += dtQueda * (i % 2 ? 2.2 : -2.2);
        if (y - a > visível.y1) continue;
      }
    }

    papel(ctx, { cx: x, cy: y, l, a, raio, cor: k.cor, sombra: k.sombra, desvio, giro, escala });
    if (conteúdo <= 0) continue;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(giro); ctx.scale(escala, escala);
    ctx.globalAlpha = conteúdo;
    ctx.save();
    ctx.translate(0, -a * 0.1);
    ilustração(ctx, k.id, t - (t0 + 0.42), l * 0.72, a * 0.54, k.cor, k.sombra, tx);
    ctx.restore();
    fonte(ctx, 'corpo', c.retrato ? 32 : 34, 700);
    ctx.fillStyle = k.texto || cores.papel;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(k.nome, -l / 2 + 30, a / 2 - 30);
    ctx.restore();
  }

  // cursor clica em Confeitaria
  const alvo = L.cartões[0];
  const chegada = curva.saidaCubica(progresso(t, 4.8, 5.3));
  if (chegada > 0) {
    const cx0 = visível.x1 - 80, cy0 = visível.y1 - 60;
    const x = misturar(cx0, alvo.x + 40, chegada), y = misturar(cy0, alvo.y + 20, chegada);
    const clique = progresso(t, 5.32, 5.46);
    const onda = progresso(t, 5.36, 5.75);
    if (onda > 0 && onda < 1) {
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - onda);
      ctx.strokeStyle = cores.papel; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(alvo.x + 40, alvo.y + 20, 20 + onda * 150, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    desenharCursor(ctx, x, y, 1 - 0.18 * Math.sin(Math.PI * clique), 1 - progresso(t, 5.5, 5.62));
  }
}

// ---------------------------------------------------------------- cena 3: calculadora
function desenharEtiqueta(ctx, c, tx, L) {
  const { t } = c;
  const e = L.etiqueta;
  const dt = t - 7.66;
  if (dt <= 0) return null;
  const fio = misturar(-520, e.fio, mola(dt, 1.25, 5.2));
  const θ = pêndulo(dt, 0.3, 0.85, 1.25) + Math.sin(t * 2.1) * 0.012;
  const hx = e.âncoraX + Math.sin(θ) * fio;
  const hy = e.âncoraY + Math.cos(θ) * fio;
  const l = 330, a = 400;
  ctx.save();
  ctx.strokeStyle = cores.papel; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(e.âncoraX, e.âncoraY); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.translate(hx, hy); ctx.rotate(-θ);
  const forma = (dx, dy) => {
    const c0 = 70;
    ctx.beginPath();
    ctx.moveTo(-l / 2 + c0 + dx, -48 + dy);
    ctx.lineTo(l / 2 - c0 + dx, -48 + dy);
    ctx.lineTo(l / 2 + dx, -48 + c0 + dy);
    ctx.arcTo(l / 2 + dx, a - 48 + dy, dx, a - 48 + dy, 26);
    ctx.arcTo(-l / 2 + dx, a - 48 + dy, -l / 2 + dx, dy, 26);
    ctx.lineTo(-l / 2 + dx, -48 + c0 + dy);
    ctx.closePath();
  };
  forma(10, 16); ctx.fillStyle = VERMELHO_SOMBRA; ctx.fill();
  forma(0, 0); ctx.fillStyle = cores.papel; ctx.fill();
  ctx.fillStyle = VERMELHO; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = cores.borda; ctx.lineWidth = 5; ctx.stroke();
  fonte(ctx, 'mao', 50, 700); ctx.fillStyle = cores.vinho; ctx.textAlign = 'center';
  ctx.fillText(tx.etiqueta, 0, 118);
  const valor = tx.preçoFinal * curva.saidaExpo(progresso(t, 7.85, 8.5));
  const tam = tamanhoQueCabe(ctx, 'titulo', tx.moeda(tx.preçoFinal), 76, l - 50);
  fonte(ctx, 'titulo', tam); ctx.fillStyle = cores.tinta;
  ctx.fillText(tx.moeda(valor), 0, 232);
  rabisco(ctx, -100, 100, 268, curva.entradaSaidaCubica(progresso(t, 8.4, 8.75)), { espessura: 8, onda: 5, voltas: 4 });
  ctx.restore();
  return [hx, hy];
}

function cenaFerramenta(ctx, c, tx) {
  const { t, visível, retrato } = c;
  if (t < 5.9 || t > 9.6) return null;
  const L = layoutFerramenta(c);

  // fundo listrado que desliza devagar
  if (t >= 6.05) {
    ctx.save();
    ctx.fillStyle = VERMELHO; ctx.fillRect(visível.x0, visível.y0, visível.x1 - visível.x0, visível.y1 - visível.y0);
    ctx.strokeStyle = 'rgba(143,59,32,.09)'; ctx.lineWidth = 34;
    const deslocamento = (t * 40) % 110;
    for (let x = visível.x0 - 2200; x < visível.x1 + 200; x += 110) {
      ctx.beginPath(); ctx.moveTo(x + deslocamento, visível.y1 + 20); ctx.lineTo(x + deslocamento + 2200, visível.y0 - 20); ctx.stroke();
    }
    ctx.restore();
  }

  const buraco = desenharEtiqueta(ctx, c, tx, L);

  // painel
  const P = L.painel;
  const dtP = t - 5.95;
  const pe = mola(dtP, 1.3, 6.5);
  const px = P.x, py = P.y + (1 - pe) * 260;
  const giro = (1 - pe) * 0.08;
  const esquerda = -P.l / 2 + 64, topo = -P.a / 2;
  if (dtP > 0) {
    papel(ctx, { cx: px, cy: py, l: P.l, a: P.a, raio: 40, cor: cores.papel, sombra: VERMELHO_SOMBRA, desvio: 20, giro, escala: misturar(0.9, 1, pe) });
    ctx.save();
    ctx.translate(px, py); ctx.rotate(giro); ctx.scale(misturar(0.9, 1, pe), misturar(0.9, 1, pe));
    ctx.textBaseline = 'alphabetic';
    const surgir = (início) => limitar((t - início) * 4);

    ctx.globalAlpha = surgir(6.12);
    ctx.fillStyle = VERMELHO; ctx.beginPath(); ctx.arc(esquerda + 10, topo + 82, 10, 0, Math.PI * 2); ctx.fill();
    fonte(ctx, 'corpo', 30, 600); ctx.fillStyle = cores.suave; ctx.fillText(tx.áreaDaFerramenta, esquerda + 32, topo + 92);
    ctx.globalAlpha = 1;
    textoPipocando(ctx, tx.nomeDaFerramenta, esquerda, topo + 172, t, 6.15, { tamanho: 66, passo: 0.025, duração: 0.34, queda: 26, semente: 21 });

    const campo = (rótulo, valor, y, início, digitar, foco) => {
      ctx.globalAlpha = surgir(início);
      fonte(ctx, 'corpo', 29, 600); ctx.fillStyle = cores.tinta; ctx.fillText(rótulo, esquerda, topo + y);
      const focado = t > foco[0] && t < foco[1];
      caminhoArredondado(ctx, esquerda, topo + y + 22, P.l - 128, 88, 20);
      ctx.fillStyle = '#fffdf9'; ctx.fill();
      ctx.lineWidth = focado ? 4 : 2.5; ctx.strokeStyle = focado ? cores.rosa : cores.borda; ctx.stroke();
      if (focado) { ctx.save(); ctx.globalAlpha *= 0.14; ctx.lineWidth = 14; ctx.strokeStyle = cores.rosa; ctx.stroke(); ctx.restore(); }
      const letras = Math.floor(limitar((t - digitar[0]) / (digitar[1] - digitar[0])) * valor.length);
      const parcial = valor.slice(0, letras);
      fonte(ctx, 'corpo', 42, 600); ctx.fillStyle = cores.tinta;
      ctx.fillText(parcial, esquerda + 26, topo + y + 81);
      if (focado && Math.floor(t * 3.2) % 2 === 0) {
        const cx = esquerda + 30 + larguraTexto(ctx, parcial);
        ctx.fillStyle = cores.vinho; ctx.fillRect(cx, topo + y + 44, 3.5, 46);
      }
      ctx.globalAlpha = 1;
    };
    campo(tx.campoCusto, tx.valorCusto, 262, 6.3, [6.55, 7.0], [6.45, 7.08]);
    campo(tx.campoMargem, tx.valorMargem, 420, 6.42, [7.14, 7.36], [7.08, 7.52]);

    // botão com sombra sólida que "afunda" no clique
    const bx = esquerda, by = topo + 586, bl = 372, ba = 92;
    const aperto = Math.sin(Math.PI * progresso(t, 7.52, 7.7));
    ctx.globalAlpha = surgir(6.55);
    caminhoArredondado(ctx, bx + 4, by + 10, bl, ba, 46); ctx.fillStyle = cores.vinhoEscuro; ctx.fill();
    caminhoArredondado(ctx, bx + 4 * aperto, by + 8 * aperto, bl, ba, 46); ctx.fillStyle = cores.vinho; ctx.fill();
    fonte(ctx, 'corpo', 34, 700); ctx.fillStyle = cores.papel; ctx.textAlign = 'center';
    ctx.fillText(tx.botão, bx + bl / 2 + 4 * aperto, by + 58 + 8 * aperto);
    ctx.textAlign = 'left';
    const onda = progresso(t, 7.56, 7.95);
    if (onda > 0 && onda < 1) {
      ctx.save();
      caminhoArredondado(ctx, bx, by, bl, ba, 46); ctx.clip();
      ctx.globalAlpha = 0.35 * (1 - onda); ctx.fillStyle = cores.papel;
      ctx.beginPath(); ctx.arc(bx + bl * 0.62, by + ba * 0.55, onda * 300, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // decomposição do preço (fórmula real: preço = custo ÷ (1 − margem))
    const custo = 42, margem = tx.preçoFinal - custo;
    const lx = bx + bl + 44;
    [[tx.linhaCusto, custo, 7.8], [tx.linhaMargem, margem, 7.95]].forEach(([rótulo, v, início], i) => {
      const p = progresso(t, início, início + 0.3);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(0, (1 - curva.saidaCubica(p)) * 16);
      fonte(ctx, 'corpo', 29, 600); ctx.fillStyle = cores.suave;
      ctx.fillText(rótulo, lx, by + 38 + i * 44);
      fonte(ctx, 'corpo', 29, 700); ctx.fillStyle = cores.tinta;
      ctx.fillText(tx.moeda(v), lx + (retrato ? 150 : 140), by + 38 + i * 44);
      ctx.restore();
    });
    ctx.restore();

    // cursor até o botão
    const chegada = curva.saidaCubica(progresso(t, 7.12, 7.48));
    if (chegada > 0) {
      const alvoX = px + bx + bl * 0.62, alvoY = py + by + ba * 0.55;
      const clique = progresso(t, 7.5, 7.64);
      desenharCursor(ctx, misturar(alvoX + 260, alvoX, chegada), misturar(alvoY + 200, alvoY, chegada), 1 - 0.18 * Math.sin(Math.PI * clique), 1 - progresso(t, 7.85, 8.0));
    }
  }

  // notas adesivas
  tx.notas.forEach((texto, i) => {
    const [nx, ny, ng] = L.notas[i];
    const dt = t - (8.12 + i * 0.16);
    if (dt <= 0) return;
    fonte(ctx, 'mao', 50, 700);
    const nl = larguraTexto(ctx, texto) + 64;
    const escala = mola(dt, 1.6, 6);
    papel(ctx, { cx: nx, cy: ny, l: nl, a: 104, raio: 10, cor: i === 1 ? cores.papel : '#efe3cf', sombra: VERMELHO_SOMBRA, desvio: 10, giro: ng + (1 - escala) * 0.6, escala });
    ctx.save();
    ctx.translate(nx, ny); ctx.rotate(ng + (1 - escala) * 0.6); ctx.scale(escala, escala);
    ctx.fillStyle = cores.tinta; ctx.textAlign = 'center';
    ctx.fillText(texto, 0, 16);
    ctx.restore();
  });

  return buraco;
}

// ---------------------------------------------------------------- cena 4: grátis pra quem usa
function seta(ctx, a, b, controle, p, { cor = cores.rosa, espessura = 6 } = {}) {
  if (p <= 0) return;
  const ponto = (s) => [
    (1 - s) ** 2 * a[0] + 2 * (1 - s) * s * controle[0] + s * s * b[0],
    (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * controle[1] + s * s * b[1],
  ];
  ctx.save();
  ctx.strokeStyle = cor; ctx.lineWidth = espessura; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 40 * p; i++) { const [x, y] = ponto(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  if (p >= 1) {
    const [x1, y1] = ponto(1), [x0, y0] = ponto(0.93);
    const ângulo = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.moveTo(x1 - Math.cos(ângulo - 0.5) * 24, y1 - Math.sin(ângulo - 0.5) * 24);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(ângulo + 0.5) * 24, y1 - Math.sin(ângulo + 0.5) * 24);
    ctx.stroke();
  }
  ctx.restore();
  return ponto;
}

function matrizQR() {
  const n = 21, m = [];
  const aleatório = criarAleatório(2026);
  const localizador = (r, col) => (r >= 0 && r < 7 && col >= 0 && col < 7);
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      const cantos = [[0, 0], [0, n - 7], [n - 7, 0]];
      let fixo = null;
      for (const [r0, c0] of cantos) {
        if (localizador(r - r0, col - c0)) {
          const rr = r - r0, cc = col - c0;
          fixo = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
        } else if (r - r0 >= -1 && r - r0 <= 7 && col - c0 >= -1 && col - c0 <= 7) fixo = fixo ?? false;
      }
      const temporização = (r === 6 || col === 6) && fixo === null;
      const ligado = fixo !== null ? fixo : temporização ? (r + col) % 2 === 0 : aleatório() < 0.48;
      if (ligado) m.push({ r, col, localizador: fixo === true, ordem: Math.hypot(r - 10, col - 10) + aleatório() * 3 });
    }
  }
  return m;
}
const MÓDULOS_QR = matrizQR();

function cenaGrátis(ctx, c, tx) {
  const { t, visível } = c;
  if (t < 9.3 || t > 12.35) return;
  const L = layoutGrátis(ctx, c);

  if (t >= 9.5) { ctx.fillStyle = cores.papel; ctx.fillRect(visível.x0, visível.y0, visível.x1 - visível.x0, visível.y1 - visível.y0); }

  const tamTítulo = tamanhoQueCabe(ctx, 'titulo', tx.tituloGrátis, 92, L.título.larguraMáx);
  textoCaindo(ctx, tx.tituloGrátis, L.título.x, L.título.y, t, 9.5, { tamanho: tamTítulo });
  fonte(ctx, 'corpo', 38, 500);
  const linhasSub = quebrarLinhas(ctx, tx.subtituloGrátis, L.subtítulo.larguraMáx);
  const ps = curva.saidaCubica(progresso(t, 10.0, 10.4));
  ctx.save();
  ctx.globalAlpha = ps; ctx.fillStyle = cores.suave;
  linhasSub.forEach((linha, i) => ctx.fillText(linha, L.subtítulo.x + (1 - ps) * -30, L.subtítulo.y + i * 50));
  ctx.restore();

  const [cl, ca] = L.cartão;
  const inícios = [10.05, 10.4, 10.75];
  const pontas = [];
  L.nós.forEach(([nx, ny], i) => {
    const dt = t - inícios[i];
    if (dt <= 0) return;
    const e = mola(dt, 1.5, 6.5);
    const giro = [-0.03, 0.02, -0.015][i] + (1 - e) * 0.4;
    papel(ctx, { cx: nx, cy: ny, l: cl, a: ca, raio: 30, cor: i === 2 ? cores.vinho : cores.fundo, sombra: 'rgba(168,71,42,.2)', desvio: 14, giro, escala: e });
    ctx.save();
    ctx.translate(nx, ny); ctx.rotate(giro); ctx.scale(e, e);
    if (i === 0) {
      const cor = [categorias[1].cor, categorias[3].cor, categorias[4].cor];
      [-100, 0, 100].forEach((dx, k) => {
        const d = t - inícios[0] - 0.2 - k * 0.09;
        if (d <= 0) return;
        const surgir = curva.saidaVolta(limitar(d * 4), 2);
        const pulo = -80 * Math.exp(-2.6 * d) * Math.abs(Math.sin(2 * Math.PI * d * 1.35));
        ctx.save();
        ctx.translate(dx, 70 + pulo); ctx.scale(surgir, surgir);
        ctx.fillStyle = cor[k];
        caminhoArredondado(ctx, -38, -70, 76, 78, 34); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -100, 26, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    } else if (i === 1) {
      const sl = cl - 80, sa = ca - 90;
      ctx.save();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 40;
      ctx.strokeStyle = cores.rosa; ctx.lineWidth = 4;
      caminhoArredondado(ctx, -sl / 2, -sa / 2, sl, sa, 16); ctx.stroke();
      ctx.restore();
      fonte(ctx, 'corpo', 22, 600); ctx.fillStyle = cores.suave; ctx.fillText('Ad', -sl / 2 + 16, -sa / 2 + 32);
      [0.78, 0.62, 0.45].forEach((f, k) => {
        const p = curva.saidaCubica(progresso(t, 10.6 + k * 0.08, 10.9 + k * 0.08));
        ctx.fillStyle = cores.borda;
        caminhoArredondado(ctx, -sl / 2 + 20, -sa / 2 + 56 + k * 34, (sl - 40) * f * p, 18, 9); ctx.fill();
      });
      ctx.save();
      caminhoArredondado(ctx, -sl / 2, -sa / 2, sl, sa, 16); ctx.clip();
      const brilho = ((t - 10.6) * 0.7 % 1) * (sl + 200) - sl / 2 - 100;
      const g = ctx.createLinearGradient(brilho - 60, 0, brilho + 60, 0);
      g.addColorStop(0, 'rgba(255,250,245,0)'); g.addColorStop(0.5, 'rgba(255,250,245,.75)'); g.addColorStop(1, 'rgba(255,250,245,0)');
      ctx.fillStyle = g; ctx.fillRect(-sl / 2, -sa / 2, sl, sa);
      ctx.restore();
    } else {
      const lado = 196, módulo = lado / 21;
      ctx.fillStyle = cores.papel;
      caminhoArredondado(ctx, -lado / 2 - 16, -lado / 2 - 16, lado + 32, lado + 32, 14); ctx.fill();
      ctx.fillStyle = cores.tinta;
      for (const m of MÓDULOS_QR) {
        const início = m.localizador ? 10.95 : 11.1 + m.ordem * 0.022;
        const p = curva.saidaVolta(progresso(t, início, início + 0.12), 2);
        if (p <= 0) continue;
        const s = módulo * p;
        ctx.fillRect(-lado / 2 + m.col * módulo + (módulo - s) / 2, -lado / 2 + m.r * módulo + (módulo - s) / 2, s + 0.4, s + 0.4);
      }
      const varre = progresso(t, 11.55, 11.95);
      if (varre > 0 && varre < 1) {
        ctx.fillStyle = 'rgba(201,99,63,.85)';
        ctx.fillRect(-lado / 2 - 10, -lado / 2 + lado * curva.entradaSaidaCubica(varre) - 3, lado + 20, 6);
      }
    }
    ctx.restore();
    // legenda
    const pl = curva.saidaCubica(progresso(t, inícios[i] + 0.15, inícios[i] + 0.45));
    if (pl > 0) {
      ctx.save();
      ctx.globalAlpha = pl;
      fonte(ctx, 'corpo', 32, 700); ctx.fillStyle = cores.tinta; ctx.textAlign = 'center';
      ctx.fillText(tx.nós[i], nx, ny + ca / 2 + 62 - (1 - pl) * 12);
      ctx.restore();
    }
    pontas.push([nx, ny]);
  });

  // setas desenhadas à mão + partículas que seguem o caminho
  for (let i = 0; i < 2; i++) {
    const [ax, ay] = L.nós[i], [bx, by] = L.nós[i + 1];
    let a, b, k;
    if (L.vertical) {
      a = [ax + cl / 2 + 30, ay + 40]; b = [bx + cl / 2 + 30, by - 40]; k = [ax + cl / 2 + 150, (ay + by) / 2];
    } else {
      a = [ax + cl / 2 + 24, ay - 30]; b = [bx - cl / 2 - 24, by - 30]; k = [(ax + bx) / 2, ay - 170];
    }
    const início = 10.35 + i * 0.35;
    const p = curva.entradaSaidaCubica(progresso(t, início, início + 0.3));
    const ponto = seta(ctx, a, b, k, p);
    if (ponto && p >= 1) {
      for (let d = 0; d < 3; d++) {
        const s = ((t - início - 0.3) * 0.9 + d / 3) % 1;
        const [x, y] = ponto(s * 0.9);
        ctx.fillStyle = cores.girassol;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

// ---------------------------------------------------------------- cena 5: assinatura
function layoutAssinatura(ctx, c, tx) {
  const { W, H, retrato } = c;
  const cx = W / 2, cy = H / 2;
  const tamSelo = 176, vão = 48;
  fonte(ctx, 'titulo', 136); const larguraMarca = larguraTexto(ctx, tx.marca);
  const total = tamSelo + vão + larguraMarca;
  const k = Math.min(1, (retrato ? 900 : 1500) / total);
  const seloY = retrato ? cy - 170 : cy - 90;
  const seloX = cx - (total * k) / 2 + (tamSelo * k) / 2;
  fonte(ctx, 'mao', 60, 700);
  const linhasLema = retrato ? quebrarLinhas(ctx, tx.lema, 840) : [tx.lema];
  return {
    k, seloX, seloY, tamSelo: tamSelo * k,
    textoX: seloX + (tamSelo * k) / 2 + vão * k,
    marcaY: seloY + 30 * k, porY: seloY + 92 * k,
    larguraMarca: larguraMarca * k,
    amostrasY: seloY + (tamSelo * k) / 2 + 96,
    lemaY: seloY + (tamSelo * k) / 2 + 200,
    linhasLema,
  };
}

function cenaAssinatura(ctx, c, tx) {
  const { t, W, H, visível } = c;
  if (t < 11.95) return;
  const cx = W / 2, cy = H / 2;
  const L = layoutAssinatura(ctx, c, tx);

  if (t < 12.25) {
    // quadrado vinho cresce até cobrir a cena anterior
    const p = curva.entradaCubica(progresso(t, 11.95, 12.25));
    const cobre = Math.hypot(visível.x1 - visível.x0, visível.y1 - visível.y0) * 1.1;
    desenharSelo(ctx, { x: cx, y: cy, tamanho: cobre * p, giro: misturar(1.1, 0, p), raio: misturar(0.245, 0.08, p), letra: 0 });
    return;
  }

  ctx.fillStyle = cores.fundo;
  ctx.fillRect(visível.x0, visível.y0, visível.x1 - visível.x0, visível.y1 - visível.y0);

  const cobre = Math.hypot(visível.x1 - visível.x0, visível.y1 - visível.y0) * 1.1;
  const encolhe = curva.saidaExpo(progresso(t, 12.25, 12.85));
  let tamanho = misturar(cobre, L.tamSelo, encolhe);
  let giro = misturar(0.6, -0.07, mola(t - 12.25, 1.2, 5));
  let raio = misturar(0.08, 0.245, encolhe);
  const vai = curva.saidaCubica(progresso(t, 12.85, 13.2));
  let x = misturar(cx, L.seloX, vai), y = misturar(cy, L.seloY, vai);
  let preenchimento = 1 - curva.entradaSaidaCubica(progresso(t, 13.2, 13.55));
  let letra = curva.saidaVolta(progresso(t, 12.55, 12.85), 2.4);
  let escalaX = 1, escalaY = 1;

  // saída (volta ao ponto para o loop)
  const recolhe = progresso(t, 14.52, 14.76);
  if (recolhe > 0) {
    const e = curva.entradaSaidaCubica(recolhe);
    x = misturar(L.seloX, cx, e); y = misturar(L.seloY, cy, e);
    tamanho = misturar(L.tamSelo, 64, e); raio = misturar(0.245, 0.5, e);
    giro = misturar(-0.07, -Math.PI / 4, e);
    preenchimento = misturar(0, 1, limitar(e * 2)); letra = 1 - limitar(e * 2);
  }
  const antecipa = progresso(t, 14.76, 14.86);
  if (antecipa > 0) { const s = Math.sin(Math.PI * antecipa * 0.5); escalaX = 1 + 0.3 * s; escalaY = 1 - 0.3 * s; }
  const lança = progresso(t, 14.86, 15);
  if (lança > 0) {
    y = misturar(cy, visível.y0 - 80, curva.entradaQuad(lança));
    escalaX = misturar(1.3, 0.85, limitar(lança * 3)); escalaY = misturar(0.7, 1.3, limitar(lança * 3));
  }

  // "Ferramentas" e "por Ander" saem de trás do selo
  const revela = curva.saidaExpo(progresso(t, 13.1, 13.55));
  const esconde = curva.entradaExpo(progresso(t, 14.34, 14.56));
  const mostrar = revela * (1 - esconde);
  if (mostrar > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.seloX + L.tamSelo / 2 + 6, visível.y0, visível.x1 - L.seloX, visível.y1 - visível.y0);
    ctx.clip();
    const dx = -(1 - mostrar) * (L.larguraMarca + 60);
    fonte(ctx, 'titulo', 136 * L.k); ctx.fillStyle = cores.tinta;
    ctx.fillText(tx.marca, L.textoX + dx, L.marcaY);
    const revelaPor = curva.saidaExpo(progresso(t, 13.28, 13.68)) * (1 - esconde);
    fonte(ctx, 'corpo', 48 * L.k, 600); ctx.fillStyle = cores.suave;
    ctx.fillText(tx.porAnder, L.textoX - (1 - revelaPor) * 300 * L.k, L.porY);
    ctx.restore();
  }

  desenharSelo(ctx, { x, y, tamanho, giro, raio, preenchimento, letra, escalaX, escalaY });

  // amostras das seis áreas
  categorias.forEach((cat, i) => {
    const entra = mola(t - (13.45 + i * 0.06), 1.8, 6.5);
    const sai = curva.entradaVolta(progresso(t, 14.3 + (5 - i) * 0.03, 14.5 + (5 - i) * 0.03), 2);
    const escala = entra * (1 - sai);
    if (t < 13.45 + i * 0.06 || escala <= 0.01) return;
    const lado = 40, vão = 18;
    const total = 6 * lado + 5 * vão;
    papel(ctx, {
      cx: cx - total / 2 + lado / 2 + i * (lado + vão), cy: L.amostrasY, l: lado, a: lado, raio: 9,
      cor: cat.cor, sombra: cat.sombra, desvio: 5, giro: (criarAleatório(70 + i)() - 0.5) * 0.4, escala,
    });
  });

  // lema escrito à mão
  const escrito = curva.entradaSaidaCubica(progresso(t, 13.68, 14.3));
  const apaga = curva.entradaCubica(progresso(t, 14.28, 14.5));
  if (escrito > 0 && apaga < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - apaga;
    textoEscrito(ctx, L.linhasLema, cx, L.lemaY, escrito, { tamanho: 60, alinhar: 'center', entrelinha: 1.1 });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- textura de papel
let padrãoGrão = null;
function grão(ctx, visível) {
  if (!padrãoGrão) {
    const tela = document.createElement('canvas');
    tela.width = tela.height = 220;
    const g = tela.getContext('2d');
    const imagem = g.createImageData(220, 220);
    const aleatório = criarAleatório(5);
    for (let i = 0; i < imagem.data.length; i += 4) {
      const v = 190 + aleatório() * 65;
      imagem.data[i] = imagem.data[i + 1] = imagem.data[i + 2] = v; imagem.data[i + 3] = 255;
    }
    g.putImageData(imagem, 0, 0);
    padrãoGrão = ctx.createPattern(tela, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = padrãoGrão;
  ctx.fillRect(visível.x0, visível.y0, visível.x1 - visível.x0, visível.y1 - visível.y0);
  ctx.restore();
}

// ---------------------------------------------------------------- quadro completo
export function desenharQuadro(ctx, t, palco, tx) {
  const c = { ...palco, t };
  const { visível } = palco;
  ctx.fillStyle = cores.fundo;
  ctx.fillRect(visível.x0, visível.y0, visível.x1 - visível.x0, visível.y1 - visível.y0);

  cenaAbertura(ctx, c, tx);
  cenaÁreas(ctx, c, tx);
  const buraco = cenaFerramenta(ctx, c, tx);

  // íris de papel saindo do furo da etiqueta
  if (t >= 9.08 && t < 9.6 && buraco) {
    const [bx, by] = buraco;
    const maior = Math.max(...[[visível.x0, visível.y0], [visível.x1, visível.y0], [visível.x0, visível.y1], [visível.x1, visível.y1]].map(([x, y]) => Math.hypot(x - bx, y - by)));
    const r = maior * curva.entradaCubica(progresso(t, 9.08, 9.5));
    ctx.fillStyle = cores.papel;
    ctx.beginPath(); ctx.arc(bx, by, Math.max(0, r), 0, Math.PI * 2); ctx.fill();
  }

  cenaGrátis(ctx, c, tx);
  cenaAssinatura(ctx, c, tx);
  grão(ctx, visível);
}

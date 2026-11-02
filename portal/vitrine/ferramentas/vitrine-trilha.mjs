// portal/vitrine/ferramentas/vitrine-trilha.mjs
// Desenho de som da vitrine, sintetizado em código (sem samples, sem licença de terceiros).
// Cama harmônica suave + efeitos sincronizados com cada movimento do roteiro.
// Uso direto: node vitrine-trilha.mjs saída.wav

import { writeFile } from 'node:fs/promises';

const DURAÇÃO = 15;

function criarMixer(taxa) {
  const n = Math.round(taxa * DURAÇÃO);
  const esquerda = new Float32Array(n), direita = new Float32Array(n);
  let semente = 12345;
  const ruído = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x3fffffff - 1; };

  function somar(início, duração, gerador, { volume = 1, pan = 0 } = {}) {
    const i0 = Math.max(0, Math.round(início * taxa));
    const i1 = Math.min(n, Math.round((início + duração) * taxa));
    const ge = volume * Math.sqrt((1 - pan) / 2) * Math.SQRT2, gd = volume * Math.sqrt((1 + pan) / 2) * Math.SQRT2;
    for (let i = i0; i < i1; i++) {
      const v = gerador((i - i0) / taxa, i / taxa);
      esquerda[i] += v * ge; direita[i] += v * gd;
    }
  }

  // ---- instrumentos
  const pop = (t, f = 700, volume = 0.3, pan = 0) => {
    let fase = 0;
    somar(t, 0.16, (x) => {
      const freq = f * (1 + 0.9 * Math.exp(-x * 60));
      fase += (2 * Math.PI * freq) / taxa;
      return Math.sin(fase) * Math.exp(-x * 34) + ruído() * 0.25 * Math.exp(-x * 400);
    }, { volume, pan });
  };
  const baque = (t, volume = 0.5) => {
    let fase = 0;
    somar(t, 0.35, (x) => {
      const freq = 45 + 55 * Math.exp(-x * 22);
      fase += (2 * Math.PI * freq) / taxa;
      return Math.sin(fase) * Math.exp(-x * 11) + ruído() * 0.2 * Math.exp(-x * 90);
    }, { volume });
  };
  const tique = (t, volume = 0.12, pan = 0) => {
    let anterior = 0;
    somar(t, 0.03, (x) => { const r = ruído(); const v = r - anterior; anterior = r; return v * Math.exp(-x * 260); }, { volume, pan });
  };
  const sopro = (t, duração, volume = 0.3, { sobe = true, pan = 0 } = {}) => {
    let baixo = 0, baixo2 = 0;
    somar(t, duração, (x) => {
      const p = x / duração;
      const corte = sobe ? 0.02 + 0.3 * p * p : 0.32 - 0.3 * p;
      baixo += corte * (ruído() - baixo);
      baixo2 += corte * (baixo - baixo2);
      const envelope = Math.sin(Math.PI * Math.min(1, p)) ** 1.5;
      return (baixo - baixo2 * 0.6) * envelope * 3;
    }, { volume, pan });
  };
  const sino = (t, f, volume = 0.18, pan = 0) => {
    const parciais = [[1, 1, 3.2], [2.76, 0.4, 6], [5.4, 0.18, 9], [8.9, 0.06, 14]];
    somar(t, 2.2, (x) => parciais.reduce((s, [r, a, d]) => s + a * Math.sin(2 * Math.PI * f * r * x) * Math.exp(-x * d), 0) * Math.min(1, x * 400), { volume, pan });
  };
  const clique = (t, volume = 0.22) => {
    somar(t, 0.05, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 180) + ruído() * 0.4 * Math.exp(-x * 500), { volume });
    somar(t + 0.045, 0.04, (x) => Math.sin(2 * Math.PI * 1700 * x) * Math.exp(-x * 220), { volume: volume * 0.6 });
  };
  const tecla = (t, volume = 0.09, pan = 0.25) => {
    let a = 0;
    somar(t, 0.05, (x) => { a += 0.5 * (ruído() - a); return (a * 0.7 + Math.sin(2 * Math.PI * 180 * x) * 0.5) * Math.exp(-x * 120); }, { volume, pan });
  };
  const caneta = (t, duração, volume = 0.05, pan = 0) => {
    let a = 0;
    somar(t, duração, (x) => {
      a += 0.35 * (ruído() - a);
      const riscos = 0.55 + 0.45 * Math.sin(2 * Math.PI * 11 * x) * Math.sin(2 * Math.PI * 3.3 * x);
      const envelope = Math.min(1, x * 20) * Math.min(1, (duração - x) * 20);
      return (ruído() - a) * riscos * envelope;
    }, { volume, pan });
  };
  const faísca = (t, duração, volume = 0.08) => {
    for (let k = 0; k < 28; k++) {
      const dt = (k / 28) ** 1.4 * duração;
      const f = 2600 + ((k * 977) % 2600);
      somar(t + dt, 0.05, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 90), { volume: volume * (1 - k / 40), pan: ((k * 37) % 20) / 10 - 1 });
    }
  };
  const mola = (t, volume = 0.18) => {
    let fase = 0;
    somar(t, 0.45, (x) => {
      const freq = 330 + 220 * (1 - Math.exp(-x * 7)) + 60 * Math.sin(2 * Math.PI * 14 * x) * Math.exp(-x * 6);
      fase += (2 * Math.PI * freq) / taxa;
      return Math.sin(fase) * Math.exp(-x * 7) * Math.min(1, x * 80);
    }, { volume });
  };
  const varredura = (t, de, até, duração, volume = 0.2) => {
    let fase = 0;
    somar(t, duração, (x) => {
      const p = x / duração;
      fase += (2 * Math.PI * (de * Math.pow(até / de, p))) / taxa;
      return Math.sin(fase) * Math.sin(Math.PI * p);
    }, { volume });
  };

  // ---- cama harmônica: um acorde por cena, cruzando suavemente; começa e termina em Dó (loop)
  const nota = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const acordes = [
    [0.0, [48, 55, 59, 62, 64]],   // Cmaj9
    [2.3, [41, 48, 52, 57, 60]],   // Fmaj7
    [5.9, [45, 52, 55, 60, 64]],   // Am7
    [9.3, [43, 50, 55, 57, 59]],   // G(add9)
    [12.1, [48, 55, 59, 62, 64]],  // Cmaj9
  ];
  for (let k = 0; k < acordes.length; k++) {
    const [início, notas] = acordes[k];
    const fim = k + 1 < acordes.length ? acordes[k + 1][0] : DURAÇÃO;
    const entrada = k === 0 ? 0.001 : 0.6, saída = k === acordes.length - 1 ? 0.001 : 0.6;
    notas.forEach((m, v) => {
      const f = nota(m);
      somar(Math.max(0, início - (k ? 0.3 : 0)), fim - início + 0.6, (x) => {
        const duração = fim - início + 0.6;
        const env = Math.min(1, x / entrada) * Math.min(1, Math.max(0, duração - x) / saída);
        const vib = 1 + 0.0025 * Math.sin(2 * Math.PI * 0.3 * x + v);
        return env * (Math.sin(2 * Math.PI * f * vib * x) + 0.35 * Math.sin(2 * Math.PI * f * 2.003 * x) + 0.12 * Math.sin(2 * Math.PI * f * 3.01 * x));
      }, { volume: 0.02, pan: (v / (notas.length - 1)) * 1.2 - 0.6 });
    });
  }

  return { esquerda, direita, n, pop, baque, tique, sopro, sino, clique, tecla, caneta, faísca, mola, varredura };
}

export function gerarTrilha({ taxa = 48000 } = {}) {
  const m = criarMixer(taxa);
  const penta = [72, 74, 76, 79, 81, 84].map((x) => 440 * Math.pow(2, (x - 69) / 12));

  // Cena 1 — o ponto
  m.sopro(0.05, 0.4, 0.08, { sobe: true });
  m.baque(0.45, 0.38); m.pop(0.45, 480, 0.25);
  m.mola(0.56, 0.2);
  m.pop(0.86, 980, 0.2);
  const saidaExpo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
  let anterior = 0;
  for (let t = 1.12; t <= 1.96; t += 1 / 2000) {
    const v = Math.floor(49 * saidaExpo(Math.min(1, (t - 1.12) / 0.83)));
    if (v > anterior) { m.tique(t, 0.1, 0.2); anterior = v; }
  }
  for (let i = 0; i < 11; i++) m.pop(1.36 + i * 0.042, penta[i % 6] * 0.5, 0.07, (i / 10) * 0.6 - 0.3);
  m.caneta(1.78, 0.34, 0.05);
  m.caneta(1.86, 0.34, 0.035, 0.3);
  m.sopro(2.14, 0.4, 0.22, { sobe: true });

  // Cena 2 — seis áreas
  for (let i = 0; i < 6; i++) {
    const t0 = 2.3 + i * 0.07;
    m.pop(t0 + 0.33, penta[i], 0.16, [-0.6, 0, 0.6][i % 3]);
    const ti = t0 + 0.42;
    if (i === 0) { [0, 1, 2].forEach((k) => m.pop(ti + k * 0.17 + 0.18, 300 + k * 60, 0.09, -0.5)); m.pop(ti + 0.82, 1400, 0.1, -0.5); }
    if (i === 1) { m.caneta(ti + 0.55, 0.62, 0.035, 0.1); m.caneta(ti + 1.15, 0.32, 0.03, 0.1); }
    if (i === 3) m.faísca(ti + 0.62, 0.7, 0.07);
    if (i === 4) m.sopro(ti + 0.1, 1.0, 0.06, { sobe: false, pan: 0.2 });
    if (i === 5) { m.tique(ti + 0.95, 0.12, 0.6); m.tique(ti + 1.12, 0.12, 0.6); m.pop(ti + 1.38, 520, 0.08, 0.6); }
  }
  m.clique(5.34, 0.24);
  m.sopro(5.45, 0.62, 0.3, { sobe: true });
  m.sopro(5.55, 0.7, 0.08, { sobe: false, pan: 0.4 });

  // Cena 3 — calculadora
  m.baque(5.98, 0.22);
  for (let i = 0; i < 8; i++) m.tecla(6.55 + (i / 8) * 0.45);
  for (let i = 0; i < 3; i++) m.tecla(7.14 + (i / 3) * 0.22);
  m.clique(7.52, 0.26);
  m.sopro(7.6, 0.3, 0.12, { sobe: false, pan: 0.5 });
  m.sino(7.84, 1318.5, 0.16, 0.4); m.sino(7.98, 1975.5, 0.12, 0.45);
  [8.12, 8.28, 8.44].forEach((t, i) => m.pop(t + 0.05, penta[i + 2], 0.12, 0.5));
  m.caneta(8.4, 0.34, 0.04, 0.4);
  m.sopro(9.02, 0.5, 0.26, { sobe: true, pan: 0.3 });

  // Cena 4 — grátis pra quem usa
  for (let i = 0; i < 20; i++) m.pop(9.5 + i * 0.026 + 0.24, 220 + (i % 5) * 30, 0.045, -0.5 + i * 0.03);
  [10.05, 10.4, 10.75].forEach((t, i) => m.pop(t + 0.1, penta[i * 2] * 0.5, 0.15, [-0.6, 0, 0.6][i]));
  [0, 1, 2].forEach((k) => { m.pop(10.25 + k * 0.09, 600 + k * 120, 0.06, -0.6); m.pop(10.62 + k * 0.09, 700 + k * 120, 0.04, -0.6); });
  m.caneta(10.35, 0.3, 0.035, -0.3); m.caneta(10.7, 0.3, 0.035, 0.3);
  m.faísca(11.1, 0.45, 0.05);
  m.varredura(11.56, 1760, 1760, 0.06, 0.07); m.varredura(11.66, 2349, 2349, 0.06, 0.07);
  m.sopro(11.9, 0.36, 0.3, { sobe: true });

  // Cena 5 — assinatura
  m.baque(12.25, 0.36);
  m.sopro(12.26, 0.55, 0.14, { sobe: false });
  m.pop(12.58, 980, 0.18);
  m.sopro(13.08, 0.4, 0.1, { sobe: true, pan: 0.3 });
  for (let i = 0; i < 6; i++) m.pop(13.49 + i * 0.06, penta[i], 0.13, (i / 5) * 1.2 - 0.6);
  [1046.5, 1318.5, 1568].forEach((f, i) => m.sino(13.55 + i * 0.05, f, 0.07, i * 0.4 - 0.4));
  m.caneta(13.7, 0.6, 0.045);
  for (let i = 0; i < 6; i++) m.pop(14.3 + (5 - i) * 0.03, penta[i] * 0.5, 0.06);
  m.varredura(14.62, 600, 240, 0.16, 0.08);
  m.varredura(14.86, 280, 1300, 0.14, 0.14);

  // Masterização: saturação suave + normalização a −1 dBFS, com bordas curtas para o loop.
  let pico = 0;
  for (let i = 0; i < m.n; i++) {
    m.esquerda[i] = Math.tanh(m.esquerda[i] * 1.4); m.direita[i] = Math.tanh(m.direita[i] * 1.4);
    pico = Math.max(pico, Math.abs(m.esquerda[i]), Math.abs(m.direita[i]));
  }
  const ganho = pico > 0 ? 0.891 / pico : 1;
  const borda = Math.round(taxa * 0.012);
  const buffer = Buffer.alloc(44 + m.n * 4);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + m.n * 4, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(taxa, 24); buffer.writeUInt32LE(taxa * 4, 28); buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(m.n * 4, 40);
  for (let i = 0; i < m.n; i++) {
    const envelope = Math.min(1, i / borda, (m.n - 1 - i) / borda);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, m.esquerda[i] * ganho * envelope)) * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, m.direita[i] * ganho * envelope)) * 32767), 46 + i * 4);
  }
  return buffer;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('vitrine-trilha.mjs')) {
  const saída = process.argv[2] || 'vitrine-trilha.wav';
  await writeFile(saída, gerarTrilha());
  console.log(`Trilha gerada: ${saída}`);
}

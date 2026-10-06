/**
 * Criador de gráficos (F200): leitura da tabela colada e desenho do gráfico em SVG, sem biblioteca.
 *
 * Tudo aqui é cálculo puro, sem DOM, para dar para testar no Node. O SVG sai só com atributos de apresentação
 * (nada de `<style>` nem `style=""`), porque a política de segurança do portal proíbe estilo embutido, e porque
 * assim o mesmo texto serve para a tela, para o arquivo .svg e para virar PNG.
 *
 * Decisões que importam:
 * - Os valores são lidos como número escrito por pessoa em português ("1.234,56", "R$ 1.234,56", "12%", "(5)" é -5).
 *   Célula vazia, "-" e "n/d" são lacuna (o gráfico de linhas interrompe a linha); qualquer outro texto numa coluna de
 *   valores é erro, com a linha e a coluna.
 * - Limites explícitos (linhas, séries, categorias, fatias) para entrada hostil não travar a página e para o gráfico
 *   continuar legível; passou do limite, a mensagem diz o que fazer.
 * - Acessibilidade: as cores têm contraste de pelo menos 3:1 com o fundo (WCAG 1.4.11) e os textos sobre as fatias, de 4,5:1;
 *   as séries também se distinguem pela forma do marcador; o SVG traz título e descrição; e a ferramenta mostra uma
 *   tabela com os mesmos dados.
 * - Quando os valores escritos não cabem (barras estreitas, muitos pontos), NENHUM é escrito, em vez de escrever só
 *   alguns: gráfico com rótulo em umas barras e em outras não engana. A tabela traz todos os valores.
 */
import { lerCsv, detectarSeparador } from './tabular.js';
import { paraNúmero } from '../núcleo/texto.js';
import { escaparXml } from '../comum/validação/escapar-xml.js';

export const LIMITES = Object.freeze({
  caracteres: 1_000_000,
  linhas: 500,
  séries: 8,
  categoriasNasBarras: 40,
  fatiasDaPizza: 8,
  título: 120,
  rótulo: 60,
  valorMáximo: 1e15,
});

export const TIPOS = Object.freeze({
  barras: 'Barras (verticais)',
  'barras-horizontais': 'Barras horizontais',
  linhas: 'Linhas',
  pizza: 'Pizza',
});
export const TAMANHOS = Object.freeze({
  pequeno: { rótulo: 'Pequeno (560 × 400)', largura: 560, altura: 400 },
  médio: { rótulo: 'Médio (960 × 600)', largura: 960, altura: 600 },
  grande: { rótulo: 'Grande (1280 × 800)', largura: 1280, altura: 800 },
  quadrado: { rótulo: 'Quadrado (800 × 800)', largura: 800, altura: 800 },
});
export const FUNDOS = Object.freeze({ claro: 'Claro (branco)', escuro: 'Escuro' });

/** Cores de cada fundo. Contraste conferido nos testes: séries >= 3:1 com o fundo; texto sobre fatia >= 4,5:1. */
export const PALETAS = Object.freeze({
  claro: Object.freeze({
    fundo: '#ffffff', texto: '#1a1a1a', suave: '#4b5563', grade: '#d7dae0', eixo: '#6b7280',
    séries: Object.freeze(['#0b5fa5', '#c2410c', '#0f766e', '#7c3aed', '#b45309', '#be185d', '#4d7c0f', '#475569']),
  }),
  escuro: Object.freeze({
    fundo: '#15171c', texto: '#f3f4f6', suave: '#b4bac4', grade: '#343842', eixo: '#8b93a1',
    séries: Object.freeze(['#60a5fa', '#fb923c', '#2dd4bf', '#a78bfa', '#fbbf24', '#f472b6', '#a3e635', '#94a3b8']),
  }),
});

/** Erro de regra de negócio com o campo da tela que precisa ser corrigido. */
export class ErroDeGráfico extends Error {
  /** @param {string} mensagem @param {string} [campo] */
  constructor(mensagem, campo = 'dados') {
    super(mensagem);
    this.name = 'ErroDeGráfico';
    this.campo = campo;
  }
}

const FONTE = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const número = (n) => n.toLocaleString('pt-BR');

/* ------------------------------------------------------------------ contraste */

function luminância(hex) {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

/** Razão de contraste WCAG entre duas cores "#rrggbb" (de 1 a 21). */
export function contraste(a, b) {
  const [x, y] = [luminância(a), luminância(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Cor de texto (clara ou escura) com o melhor contraste sobre o fundo dado. */
export function corDoTextoSobre(fundo) {
  return contraste(fundo, '#ffffff') >= contraste(fundo, '#111111') ? '#ffffff' : '#111111';
}

/* ------------------------------------------------------------------ leitura dos dados */

const LACUNAS = new Set(['', '-', '–', '—', 'n/d', 'nd', 'na', 'n/a', 'null', 'nan']);

/**
 * Número escrito por pessoa. Devolve `null` para lacuna e `NaN` para texto que não é número.
 * @param {string} bruto
 * @returns {number|null}
 */
export function lerValor(bruto) {
  let texto = String(bruto ?? '').replace(/[  ]/g, ' ').trim();
  if (LACUNAS.has(texto.toLowerCase())) return null;
  if (texto.length > 40) return NaN;
  let sinal = 1;
  const parênteses = /^\((.*)\)$/.exec(texto);
  if (parênteses) { sinal = -1; texto = parênteses[1]; }
  const valor = paraNúmero(texto.replace(/R\$/gi, '').replace(/[$€£]/g, ''));
  if (!Number.isFinite(valor)) return NaN;
  const final = sinal * valor;
  return Math.abs(final) > LIMITES.valorMáximo ? NaN : final;
}

/**
 * Lê a tabela colada (ou o CSV) em categorias e séries.
 * A primeira coluna são os nomes das categorias; as demais, os valores de cada série. Com uma coluna só, ela é a série e
 * as categorias são numeradas.
 * @param {string} texto
 * @param {{cabeçalho?: 'auto'|'sim'|'não'}} [opções]
 * @returns {{categorias: string[], séries: {nome: string, valores: (number|null)[]}[], rótuloDasCategorias: string, avisos: string[], linhasLidas: number[]}}
 */
export function lerDados(texto, { cabeçalho = 'auto' } = {}) {
  if (typeof texto !== 'string' || !texto.trim()) {
    throw new ErroDeGráfico('Cole os dados na caixa ou escolha um arquivo CSV. Cada linha é uma categoria; a primeira coluna é o nome e as outras são os valores.');
  }
  if (texto.length > LIMITES.caracteres) {
    throw new ErroDeGráfico(`Os dados passam de ${número(LIMITES.caracteres)} caracteres. Resuma a tabela: um gráfico legível tem poucas dezenas de pontos.`);
  }
  const avisos = [];
  const todas = lerCsv(texto, { separador: detectarSeparador(texto) });
  // Guarda o número da linha original (contando as vazias) para as mensagens apontarem o lugar certo.
  const comNúmero = todas.map((linha, i) => ({ linha, número: i + 1 })).filter(({ linha }) => linha.some((c) => String(c).trim() !== ''));
  const vazias = todas.length - comNúmero.length;
  if (vazias) avisos.push(`${número(vazias)} linha(s) em branco foram ignoradas.`);
  if (comNúmero.length === 0) throw new ErroDeGráfico('Os dados estão em branco. Cole pelo menos uma linha com um nome e um valor.');
  if (comNúmero.length > LIMITES.linhas + 1) {
    throw new ErroDeGráfico(`Os dados têm ${número(comNúmero.length)} linhas e o limite é ${número(LIMITES.linhas)}. Resuma a tabela (por exemplo, somando por mês) e tente de novo.`);
  }
  const largura = comNúmero.reduce((m, { linha }) => Math.max(m, linha.length), 0);
  const células = comNúmero.map(({ linha, número: n }) => ({ linha: Array.from({ length: largura }, (_, i) => String(linha[i] ?? '').trim()), número: n }));

  const colunasDeValor = largura === 1 ? [0] : Array.from({ length: largura - 1 }, (_, i) => i + 1);
  const éNumérica = (c) => { const v = lerValor(c); return v === null || !Number.isNaN(v); };
  let temCabeçalho;
  if (cabeçalho === 'sim') temCabeçalho = true;
  else if (cabeçalho === 'não') temCabeçalho = false;
  else {
    // Cabeçalho: a primeira linha tem algum texto onde deveria haver número.
    const primeira = células[0].linha;
    temCabeçalho = colunasDeValor.some((c) => primeira[c] !== '' && !éNumérica(primeira[c]));
  }
  const linhasDeDados = temCabeçalho ? células.slice(1) : células;
  if (linhasDeDados.length === 0) {
    throw new ErroDeGráfico('Só há uma linha, e ela é o cabeçalho: não sobram dados. Se ela também for dado, escolha "A primeira linha não é cabeçalho".');
  }

  const nomesDasSéries = colunasDeValor.map((coluna, i) => {
    const nome = temCabeçalho ? células[0].linha[coluna] : '';
    return (nome || (largura === 1 ? 'Valores' : `Série ${i + 1}`)).slice(0, LIMITES.rótulo);
  });
  const categorias = linhasDeDados.map(({ linha }, i) => ((largura === 1 ? '' : linha[0]) || String(i + 1)).slice(0, LIMITES.rótulo));

  const séries = colunasDeValor.map((coluna, s) => {
    const valores = linhasDeDados.map(({ linha, número: n }, i) => {
      const bruto = linha[coluna];
      const valor = lerValor(bruto);
      if (Number.isNaN(valor)) {
        const lugar = largura === 1 ? '' : ` (${categorias[i]})`;
        throw new ErroDeGráfico(`Linha ${n}${lugar}, coluna "${nomesDasSéries[s]}": "${bruto.slice(0, 30)}" não é um número. Use só números nas colunas de valores (por exemplo 1234,56) e deixe vazio onde não há dado.`);
      }
      return valor;
    });
    return { nome: nomesDasSéries[s], valores };
  });

  const comDados = séries.filter((s) => s.valores.some((v) => v !== null));
  if (comDados.length < séries.length) {
    const fora = séries.filter((s) => !comDados.includes(s)).map((s) => `"${s.nome}"`).join(', ');
    avisos.push(`Sem nenhum número, ${fora} foi ignorada.`);
  }
  if (comDados.length === 0) throw new ErroDeGráfico('Não encontrei nenhum número nas colunas de valores. A primeira coluna é o nome; os números ficam nas colunas seguintes.');
  if (comDados.length > LIMITES.séries) {
    throw new ErroDeGráfico(`Há ${comDados.length} colunas de valores e o limite é ${LIMITES.séries}: com mais séries as cores deixam de ser distinguíveis. Deixe só as que importam.`);
  }
  return {
    categorias, séries: comDados, rótuloDasCategorias: temCabeçalho && largura > 1 ? células[0].linha[0].slice(0, LIMITES.rótulo) : '',
    avisos, linhasLidas: linhasDeDados.map((l) => l.número),
  };
}

/* ------------------------------------------------------------------ preparo para cada tipo */

/**
 * Confere os dados contra o tipo escolhido e devolve o que o desenho usa.
 * @param {ReturnType<typeof lerDados>} dados
 * @param {keyof typeof TIPOS} tipo
 * @returns {{categorias: string[], séries: {nome: string, valores: (number|null)[]}[], avisos: string[]}}
 */
export function prepararParaOTipo(dados, tipo) {
  if (!Object.hasOwn(TIPOS, tipo)) throw new ErroDeGráfico('Escolha um dos tipos de gráfico da lista.', 'tipo');
  const avisos = [...dados.avisos];
  if (tipo === 'barras' || tipo === 'barras-horizontais') {
    if (dados.categorias.length > LIMITES.categoriasNasBarras) {
      throw new ErroDeGráfico(`São ${dados.categorias.length} categorias e as barras comportam até ${LIMITES.categoriasNasBarras} para continuarem legíveis. Use o gráfico de linhas ou resuma os dados.`, 'tipo');
    }
    return { categorias: dados.categorias, séries: dados.séries, avisos };
  }
  if (tipo === 'linhas') return { categorias: dados.categorias, séries: dados.séries, avisos };

  // Pizza: só uma série, só valores positivos, no máximo 8 fatias (as menores viram "Outros").
  const série = dados.séries[0];
  if (dados.séries.length > 1) avisos.push(`A pizza mostra uma coluna só: usei "${série.nome}". Para comparar várias colunas, use barras ou linhas.`);
  let fatias = [];
  série.valores.forEach((valor, i) => {
    if (valor === null) return;
    if (valor < 0) throw new ErroDeGráfico(`A pizza não aceita valores negativos (${dados.categorias[i]}: ${número(valor)}). Use o gráfico de barras.`, 'tipo');
    fatias.push({ nome: dados.categorias[i], valor, ordem: i });
  });
  const zeradas = fatias.filter((f) => f.valor === 0).length;
  fatias = fatias.filter((f) => f.valor > 0);
  if (zeradas) avisos.push(`${número(zeradas)} categoria(s) com valor 0 não aparecem na pizza.`);
  if (fatias.length === 0) throw new ErroDeGráfico('A soma dos valores é zero: não há o que repartir na pizza.', 'tipo');
  if (fatias.length > LIMITES.fatiasDaPizza) {
    const mantidas = [...fatias].sort((a, b) => b.valor - a.valor || a.ordem - b.ordem).slice(0, LIMITES.fatiasDaPizza - 1);
    const conjunto = new Set(mantidas);
    const resto = fatias.filter((f) => !conjunto.has(f));
    avisos.push(`A pizza comporta ${LIMITES.fatiasDaPizza} fatias: as ${número(resto.length)} menores foram somadas em "Outros".`);
    fatias = [...fatias.filter((f) => conjunto.has(f)), { nome: 'Outros', valor: resto.reduce((s, f) => s + f.valor, 0), ordem: Infinity }];
  }
  return { categorias: fatias.map((f) => f.nome), séries: [{ nome: série.nome, valores: fatias.map((f) => f.valor) }], avisos };
}

/* ------------------------------------------------------------------ escala e formatação */

/**
 * Escala "agradável" para o eixo: limites e passo em números redondos (1, 2, 2,5 ou 5 vezes uma potência de 10).
 * @param {number} mínimo
 * @param {number} máximo
 * @param {number} [alvo] quantidade aproximada de intervalos
 * @returns {{mín: number, máx: number, passo: number, marcas: number[], casas: number}}
 */
export function escalaAgradável(mínimo, máximo, alvo = 5) {
  let [mín, máx] = mínimo <= máximo ? [mínimo, máximo] : [máximo, mínimo];
  if (!Number.isFinite(mín) || !Number.isFinite(máx)) { mín = 0; máx = 1; }
  // Intervalo nulo ou menor que a precisão dos números (relativa de 1e-9): abre uma folga em vez de dividir por zero.
  if (máx - mín <= Math.max(Math.abs(mín), Math.abs(máx)) * 1e-9) {
    const folga = Math.abs(mín) * 0.1 || 1;
    mín -= folga; máx += folga;
  }
  const bruto = (máx - mín) / Math.max(1, alvo);
  const potência = 10 ** Math.floor(Math.log10(bruto));
  const fração = bruto / potência;
  const passo = (fração <= 1 ? 1 : fração <= 2 ? 2 : fração <= 2.5 ? 2.5 : fração <= 5 ? 5 : 10) * potência;
  const início = Math.floor(mín / passo + 1e-9) * passo;
  const fim = Math.ceil(máx / passo - 1e-9) * passo;
  // Por índice, e não somando o passo: somar erra no último dígito quando a escala está longe do zero.
  const quantidade = Math.max(1, Math.round((fim - início) / passo));
  const marcas = Array.from({ length: quantidade + 1 }, (_, i) => Number((início + i * passo).toPrecision(15)));
  let casas = 0;
  while (casas < 8 && Math.abs(passo * 10 ** casas - Math.round(passo * 10 ** casas)) > 1e-9) casas += 1;
  return { mín: marcas[0], máx: marcas[marcas.length - 1], passo, marcas, casas };
}

const formatoCompleto = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const formatoCompacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Número para rótulo, com prefixo e sufixo. */
export function formatarValor(valor, { prefixo = '', sufixo = '', compacto = false, casas } = {}) {
  const texto = compacto && Math.abs(valor) >= 10_000
    ? formatoCompacto.format(valor)
    : casas === undefined ? formatoCompleto.format(valor) : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: Math.max(casas, 2) });
  // Prefixo ("R$") leva um espaço; sufixo também ("3 kg"), menos o "%", que fica colado ("12%").
  const antes = prefixo ? `${prefixo} ` : '';
  const depois = sufixo ? (sufixo.startsWith('%') ? sufixo : ` ${sufixo}`) : '';
  return `${antes}${texto}${depois}`.replace(/ /g, ' ');
}

const estimarLargura = (texto, tamanho) => String(texto).length * tamanho * 0.58;
const abreviar = (texto, máximo) => (texto.length > máximo ? `${texto.slice(0, Math.max(1, máximo - 1))}…` : texto);
const arredondar = (n) => Math.round(n * 100) / 100;
const esc = escaparXml;

/** Remove caracteres de controle e limita o tamanho de um texto livre (título, nome de eixo). */
export function limparTexto(texto, máximo) {
  return String(texto ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, máximo);
}

/* ------------------------------------------------------------------ desenho */

function marcador(forma, x, y, r, cor, fundo) {
  const comuns = `fill="${cor}" stroke="${fundo}" stroke-width="${arredondar(r * 0.3)}"`;
  switch (forma % 4) {
    case 0: return `<circle cx="${arredondar(x)}" cy="${arredondar(y)}" r="${arredondar(r)}" ${comuns}/>`;
    case 1: return `<rect x="${arredondar(x - r)}" y="${arredondar(y - r)}" width="${arredondar(2 * r)}" height="${arredondar(2 * r)}" ${comuns}/>`;
    case 2: return `<polygon points="${arredondar(x)},${arredondar(y - r * 1.2)} ${arredondar(x + r * 1.15)},${arredondar(y + r * 0.9)} ${arredondar(x - r * 1.15)},${arredondar(y + r * 0.9)}" ${comuns}/>`;
    default: return `<polygon points="${arredondar(x)},${arredondar(y - r * 1.25)} ${arredondar(x + r * 1.25)},${arredondar(y)} ${arredondar(x)},${arredondar(y + r * 1.25)} ${arredondar(x - r * 1.25)},${arredondar(y)}" ${comuns}/>`;
  }
}

/** Legenda em linhas que quebram conforme a largura. Devolve a altura usada e o desenho. */
function desenharLegenda(itens, { largura, f, paleta, y, formaDoItem, xInicial }) {
  const gap = f * 1.2;
  const marca = f * 1.5;
  const linhas = [[]];
  let usado = 0;
  const máximo = largura - 2 * xInicial;
  for (const item of itens) {
    const w = marca + estimarLargura(item.texto, f * 0.95) + gap;
    if (usado + w > máximo && linhas[linhas.length - 1].length) { linhas.push([]); usado = 0; }
    linhas[linhas.length - 1].push({ ...item, w });
    usado += w;
  }
  const alturaDaLinha = f * 1.7;
  const partes = [];
  linhas.forEach((linha, l) => {
    const total = linha.reduce((s, i) => s + i.w, 0) - gap;
    let x = Math.max(xInicial, (largura - total) / 2);
    const yy = y + l * alturaDaLinha + f * 0.9;
    for (const item of linha) {
      partes.push(formaDoItem(item, x + marca / 2, yy - f * 0.32));
      partes.push(`<text x="${arredondar(x + marca + f * 0.2)}" y="${arredondar(yy)}" font-size="${arredondar(f * 0.95)}" fill="${paleta.texto}">${esc(item.texto)}</text>`);
      x += item.w;
    }
  });
  return { altura: linhas.length * alturaDaLinha + f * 0.5, partes };
}

/**
 * Desenha o gráfico.
 * @param {{categorias: string[], séries: {nome: string, valores: (number|null)[]}[]}} dados já preparados para o tipo
 * @param {{
 *   tipo: keyof typeof TIPOS, título?: string, rótuloX?: string, rótuloY?: string, prefixo?: string, sufixo?: string,
 *   legenda?: boolean, valores?: boolean, empilhar?: boolean, tamanho?: keyof typeof TAMANHOS, fundo?: keyof typeof FUNDOS,
 *   rótuloDasCategorias?: string,
 * }} opções
 * @returns {{svg: string, svgParaArquivo: string, largura: number, altura: number, descrição: string, avisos: string[]}}
 */
export function desenharGráfico(dados, opções) {
  const {
    tipo, legenda = true, valores: mostrarValores = true, empilhar = false, tamanho = 'pequeno', fundo = 'claro',
  } = opções;
  if (!Object.hasOwn(TIPOS, tipo)) throw new ErroDeGráfico('Escolha um dos tipos de gráfico da lista.', 'tipo');
  if (!Object.hasOwn(TAMANHOS, tamanho)) throw new ErroDeGráfico('Escolha um dos tamanhos da lista.', 'tamanho');
  if (!Object.hasOwn(PALETAS, fundo)) throw new ErroDeGráfico('Escolha o fundo claro ou o escuro.', 'fundo');
  const título = limparTexto(opções.título, LIMITES.título);
  const rótuloX = limparTexto(opções.rótuloX, LIMITES.rótulo);
  const rótuloY = limparTexto(opções.rótuloY, LIMITES.rótulo);
  const prefixo = limparTexto(opções.prefixo, 8);
  const sufixo = limparTexto(opções.sufixo, 8);
  const unidade = { prefixo, sufixo };
  const paleta = PALETAS[fundo];
  const { largura: W, altura: H } = TAMANHOS[tamanho];
  const f = W * 0.034;
  const avisos = [];
  const { categorias, séries } = dados;
  const éPizza = tipo === 'pizza';
  const comLegenda = éPizza ? true : legenda && séries.length > 1;
  const cor = (i) => paleta.séries[i % paleta.séries.length];
  const padX = f * 1.2;
  const partes = [];

  // Título e legenda ocupam o topo e o pé; o que sobra é a área do gráfico.
  let topo = f * 0.9;
  if (título) {
    const tamanhoDoTítulo = Math.min(f * 1.35, ((W - 2 * padX) / Math.max(1, título.length)) / 0.58);
    partes.push(`<text x="${arredondar(W / 2)}" y="${arredondar(topo + tamanhoDoTítulo)}" font-size="${arredondar(tamanhoDoTítulo)}" font-weight="700" text-anchor="middle" fill="${paleta.texto}">${esc(título)}</text>`);
    topo += tamanhoDoTítulo * 1.9;
  }
  let pé = f * 0.8;
  const legendaItens = éPizza
    ? categorias.map((c, i) => ({ texto: `${c}: ${formatarPorcentagem(séries[0].valores[i], séries[0].valores)}`, cor: cor(i), índice: i }))
    : séries.map((s, i) => ({ texto: s.nome, cor: cor(i), índice: i }));
  const formaDoItem = (item, x, y) => (éPizza
    ? `<rect x="${arredondar(x - f * 0.5)}" y="${arredondar(y - f * 0.5)}" width="${arredondar(f)}" height="${arredondar(f)}" rx="${arredondar(f * 0.15)}" fill="${item.cor}"/>`
    : (tipo === 'linhas' ? marcador(item.índice, x, y, f * 0.42, item.cor, paleta.fundo)
      : `<rect x="${arredondar(x - f * 0.5)}" y="${arredondar(y - f * 0.5)}" width="${arredondar(f)}" height="${arredondar(f)}" rx="${arredondar(f * 0.15)}" fill="${item.cor}"/>`));
  if (comLegenda) {
    const medida = desenharLegenda(legendaItens, { largura: W, f, paleta, y: 0, formaDoItem, xInicial: padX });
    pé += medida.altura;
    const legenda2 = desenharLegenda(legendaItens, { largura: W, f, paleta, y: H - pé + f * 0.2, formaDoItem, xInicial: padX });
    partes.push(...legenda2.partes);
  }

  const resumos = [];
  let descrição;

  if (éPizza) {
    const valoresDaPizza = séries[0].valores;
    const total = valoresDaPizza.reduce((s, v) => s + v, 0);
    const área = { x: padX, y: topo, w: W - 2 * padX, h: H - topo - pé };
    const raio = Math.max(10, Math.min(área.w, área.h) / 2 - f * 0.4);
    const cx = área.x + área.w / 2;
    const cy = área.y + área.h / 2;
    let ângulo = -Math.PI / 2;
    const rótulos = [];
    valoresDaPizza.forEach((valor, i) => {
      const fatia = (valor / total) * Math.PI * 2;
      const meio = ângulo + fatia / 2;
      const título2 = `${categorias[i]}: ${formatarValor(valor, unidade)} (${formatarPorcentagem(valor, valoresDaPizza)})`;
      if (valoresDaPizza.length === 1) {
        partes.push(`<circle cx="${arredondar(cx)}" cy="${arredondar(cy)}" r="${arredondar(raio)}" fill="${cor(i)}"><title>${esc(título2)}</title></circle>`);
      } else {
        const [x1, y1] = [cx + raio * Math.cos(ângulo), cy + raio * Math.sin(ângulo)];
        const [x2, y2] = [cx + raio * Math.cos(ângulo + fatia), cy + raio * Math.sin(ângulo + fatia)];
        partes.push(`<path d="M${arredondar(cx)} ${arredondar(cy)}L${arredondar(x1)} ${arredondar(y1)}A${arredondar(raio)} ${arredondar(raio)} 0 ${fatia > Math.PI ? 1 : 0} 1 ${arredondar(x2)} ${arredondar(y2)}Z" fill="${cor(i)}" stroke="${paleta.fundo}" stroke-width="${arredondar(Math.max(2, f * 0.15))}" stroke-linejoin="round"><title>${esc(título2)}</title></path>`);
      }
      if (mostrarValores && fatia / (Math.PI * 2) >= 0.05) {
        const r = valoresDaPizza.length === 1 ? 0 : raio * 0.64;
        rótulos.push(`<text x="${arredondar(cx + r * Math.cos(meio))}" y="${arredondar(cy + r * Math.sin(meio) + f * 0.33)}" font-size="${arredondar(f * 0.95)}" font-weight="700" text-anchor="middle" fill="${corDoTextoSobre(cor(i))}">${formatarPorcentagem(valor, valoresDaPizza)}</text>`);
      }
      ângulo += fatia;
    });
    partes.push(...rótulos);
    const maior = valoresDaPizza.indexOf(Math.max(...valoresDaPizza));
    resumos.push(`Maior fatia: ${categorias[maior]} (${formatarPorcentagem(valoresDaPizza[maior], valoresDaPizza)}).`);
    descrição = `Gráfico de pizza com ${categorias.length} fatia(s) de "${séries[0].nome}". ${resumos[0]} Total: ${formatarValor(total, unidade)}.`;
  } else {
    const horizontal = tipo === 'barras-horizontais';
    const todosOsValores = séries.flatMap((s) => s.valores).filter((v) => v !== null);
    // Pilhas somam separadamente os positivos e os negativos de cada categoria.
    let alto = Math.max(0, ...todosOsValores);
    let baixo = Math.min(0, ...todosOsValores);
    const éPilha = empilhar && séries.length > 1 && tipo !== 'linhas';
    if (éPilha) {
      alto = Math.max(0, ...categorias.map((_, i) => séries.reduce((s, x) => s + Math.max(0, x.valores[i] ?? 0), 0)));
      baixo = Math.min(0, ...categorias.map((_, i) => séries.reduce((s, x) => s + Math.min(0, x.valores[i] ?? 0), 0)));
    }
    let mínDoEixo = baixo;
    if (tipo === 'linhas' && baixo >= 0 && Math.min(...todosOsValores) > 0.6 * alto) {
      // Linhas de valores quase iguais ficam coladas no topo se o eixo começar em zero: aqui o eixo acompanha os dados.
      mínDoEixo = Math.min(...todosOsValores);
      avisos.push('O eixo vertical não começa em zero, para as variações aparecerem. Confira os números no eixo.');
    }
    const escala = escalaAgradável(mínDoEixo, alto, 5);
    const rótuloDaMarca = (v) => formatarValor(v, { ...unidade, compacto: true, casas: escala.casas });
    const maiorMarca = Math.max(...escala.marcas.map((m) => estimarLargura(rótuloDaMarca(m), f * 0.9)));

    const n = categorias.length;
    const rótuloDaCategoria = (c, máx) => abreviar(c, máx);
    let esquerda;
    let direita = padX;
    let base;
    if (horizontal) {
      const maiorCategoria = Math.min(W * 0.3, Math.max(...categorias.map((c) => estimarLargura(rótuloDaCategoria(c, 26), f * 0.9))));
      esquerda = padX + (rótuloY ? f * 1.8 : 0) + maiorCategoria + f * 0.8;
      direita = padX + (mostrarValores ? maiorMarca * 0.9 : 0);
      base = f * 1.6 + (rótuloX ? f * 1.8 : 0);
    } else {
      esquerda = padX + (rótuloY ? f * 1.8 : 0) + maiorMarca + f * 0.8;
      base = 0; // definido abaixo, depende do giro dos rótulos
    }
    const larguraÚtil = W - esquerda - direita;
    let girar = false;
    let passoDosRótulos = 1;
    let alturaDosRótulos = f * 1.6;
    if (!horizontal) {
      const faixa = tipo === 'linhas' ? larguraÚtil / Math.max(1, n - 1) : larguraÚtil / n;
      const maiorRótulo = Math.max(...categorias.map((c) => estimarLargura(rótuloDaCategoria(c, tipo === 'linhas' ? 14 : 18), f * 0.9)));
      if (maiorRótulo > faixa * 0.92) {
        if (tipo === 'linhas' && n > 8) {
          passoDosRótulos = Math.ceil(maiorRótulo / (faixa * 0.92));
        } else {
          girar = true;
          alturaDosRótulos = Math.min(H * 0.28, maiorRótulo * Math.sin(Math.PI / 4.5) + f * 1.2);
        }
      }
      base = alturaDosRótulos + (rótuloX ? f * 1.8 : 0) + f * 0.4;
    }
    const área = { x: esquerda, y: topo + f * 0.6, w: larguraÚtil, h: H - topo - pé - base - f * 0.6 };
    const áreaH = Math.max(40, área.h);
    const escalar = (v) => (horizontal
      ? área.x + ((v - escala.mín) / (escala.máx - escala.mín)) * área.w
      : área.y + áreaH - ((v - escala.mín) / (escala.máx - escala.mín)) * áreaH);
    const zero = escalar(Math.max(escala.mín, Math.min(0, escala.máx)));

    // Grade e marcas do eixo dos valores.
    for (const m of escala.marcas) {
      const p = escalar(m);
      if (horizontal) {
        partes.push(`<line x1="${arredondar(p)}" y1="${arredondar(área.y)}" x2="${arredondar(p)}" y2="${arredondar(área.y + áreaH)}" stroke="${paleta.grade}" stroke-width="1"/>`);
        partes.push(`<text x="${arredondar(p)}" y="${arredondar(área.y + áreaH + f * 1.2)}" font-size="${arredondar(f * 0.9)}" text-anchor="middle" fill="${paleta.suave}">${esc(rótuloDaMarca(m))}</text>`);
      } else {
        partes.push(`<line x1="${arredondar(área.x)}" y1="${arredondar(p)}" x2="${arredondar(área.x + área.w)}" y2="${arredondar(p)}" stroke="${paleta.grade}" stroke-width="1"/>`);
        partes.push(`<text x="${arredondar(área.x - f * 0.5)}" y="${arredondar(p + f * 0.32)}" font-size="${arredondar(f * 0.9)}" text-anchor="end" fill="${paleta.suave}">${esc(rótuloDaMarca(m))}</text>`);
      }
    }
    // Linha do zero (ou da base) mais forte.
    partes.push(horizontal
      ? `<line x1="${arredondar(zero)}" y1="${arredondar(área.y)}" x2="${arredondar(zero)}" y2="${arredondar(área.y + áreaH)}" stroke="${paleta.eixo}" stroke-width="1.5"/>`
      : `<line x1="${arredondar(área.x)}" y1="${arredondar(zero)}" x2="${arredondar(área.x + área.w)}" y2="${arredondar(zero)}" stroke="${paleta.eixo}" stroke-width="1.5"/>`);

    const rótuloDoValor = (v) => formatarValor(v, unidade);
    const textosDeValor = [];
    const faixaDe = (i) => (horizontal ? áreaH / n : área.w / n) * i;

    if (tipo === 'linhas') {
      const passo = n > 1 ? área.w / (n - 1) : 0;
      const xDe = (i) => (n > 1 ? área.x + passo * i : área.x + área.w / 2);
      const mostrarMarcas = n <= 60;
      séries.forEach((s, k) => {
        const cores = cor(k);
        let trecho = [];
        const trechos = [];
        s.valores.forEach((v, i) => {
          if (v === null) { if (trecho.length) trechos.push(trecho); trecho = []; } else trecho.push([xDe(i), escalar(v), i, v]);
        });
        if (trecho.length) trechos.push(trecho);
        for (const t of trechos) {
          if (t.length > 1) partes.push(`<polyline points="${t.map(([x, y]) => `${arredondar(x)},${arredondar(y)}`).join(' ')}" fill="none" stroke="${cores}" stroke-width="${arredondar(Math.max(2.5, f * 0.16))}" stroke-linejoin="round" stroke-linecap="round"/>`);
        }
        for (const t of trechos) {
          for (const [x, y, i, v] of t) {
            if (mostrarMarcas || t.length === 1) partes.push(`<g>${marcador(k, x, y, f * 0.34, cores, paleta.fundo)}<title>${esc(`${categorias[i]} — ${s.nome}: ${rótuloDoValor(v)}`)}</title></g>`);
          }
        }
      });
      // Rótulos do eixo X (com saltos quando são muitos).
      categorias.forEach((c, i) => {
        if (i % passoDosRótulos) return;
        const x = xDe(i);
        partes.push(girar
          ? `<text x="${arredondar(x)}" y="${arredondar(área.y + áreaH + f * 1.1)}" font-size="${arredondar(f * 0.9)}" text-anchor="end" fill="${paleta.suave}" transform="rotate(-40 ${arredondar(x)} ${arredondar(área.y + áreaH + f * 1.1)})">${esc(rótuloDaCategoria(c, 14))}</text>`
          : `<text x="${arredondar(x)}" y="${arredondar(área.y + áreaH + f * 1.3)}" font-size="${arredondar(f * 0.9)}" text-anchor="middle" fill="${paleta.suave}">${esc(rótuloDaCategoria(c, 14))}</text>`);
      });
      if (mostrarValores) {
        // Cada rótulo é uma caixa acima do ponto; vale só se nenhuma caixa encosta em outra caixa ou em outro marcador.
        const caixas = [];
        const marcadores = [];
        séries.forEach((s, k) => s.valores.forEach((v, i) => {
          if (v === null) return;
          const texto = rótuloDoValor(v);
          const largura = estimarLargura(texto, f * 0.8);
          caixas.push({ x: xDe(i) - largura / 2, y: escalar(v) - f * 0.7 - f * 0.8, w: largura, h: f * 0.95, k, i });
          marcadores.push({ x: xDe(i) - f * 0.34, y: escalar(v) - f * 0.34, w: f * 0.68, h: f * 0.68, k, i });
        }));
        const encosta = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const colide = caixas.some((a, ia) => caixas.some((b, ib) => ib > ia && encosta(a, b))
          || marcadores.some((m) => !(m.k === a.k && m.i === a.i) && encosta(a, m)));
        const cabe = n * séries.length <= 40 && !colide
          && séries.every((s) => s.valores.every((v) => v === null || estimarLargura(rótuloDoValor(v), f * 0.8) <= (passo || área.w) * 0.95));
        if (cabe) {
          séries.forEach((s, k) => s.valores.forEach((v, i) => {
            if (v !== null) textosDeValor.push(`<text x="${arredondar(xDe(i))}" y="${arredondar(escalar(v) - f * 0.7)}" font-size="${arredondar(f * 0.8)}" text-anchor="middle" fill="${paleta.texto}">${esc(rótuloDoValor(v))}</text>`);
          }));
          partes.push(...textosDeValor);
        } else avisos.push('Os valores não cabem escritos sobre os pontos e foram omitidos do gráfico; a tabela do resultado traz todos.');
      }
    } else {
      const k = séries.length;
      const banda = (horizontal ? áreaH : área.w) / n;
      const espessura = éPilha ? banda * 0.62 : (banda * 0.74) / k;
      const desenhos = [];
      const caberão = [];
      categorias.forEach((c, i) => {
        const inícioDaBanda = (horizontal ? área.y : área.x) + faixaDe(i);
        let somaPositiva = 0;
        let somaNegativa = 0;
        séries.forEach((s, j) => {
          const v = s.valores[i];
          if (v === null) return;
          let de;
          let até;
          if (éPilha) {
            if (v >= 0) { de = somaPositiva; somaPositiva += v; até = somaPositiva; } else { de = somaNegativa; somaNegativa += v; até = somaNegativa; }
          } else { de = 0; até = v; }
          const deducao = (banda - espessura * (éPilha ? 1 : k)) / 2;
          const pos = inícioDaBanda + deducao + (éPilha ? 0 : espessura * j);
          const [a, b] = [escalar(de), escalar(até)];
          const título2 = `${c} — ${s.nome}: ${rótuloDoValor(v)}`;
          const mín = Math.min(a, b);
          const comprimento = Math.max(Math.abs(b - a), v === 0 ? 0 : 1);
          desenhos.push(horizontal
            ? `<rect x="${arredondar(mín)}" y="${arredondar(pos)}" width="${arredondar(comprimento)}" height="${arredondar(espessura * 0.94)}" fill="${cor(j)}"><title>${esc(título2)}</title></rect>`
            : `<rect x="${arredondar(pos)}" y="${arredondar(mín)}" width="${arredondar(espessura * 0.94)}" height="${arredondar(comprimento)}" fill="${cor(j)}"><title>${esc(título2)}</title></rect>`);
          const texto = rótuloDoValor(v);
          if (éPilha) {
            const cabeNaPeça = estimarLargura(texto, f * 0.8) <= (horizontal ? comprimento : espessura) * 0.94 && f * 1.1 <= (horizontal ? espessura : comprimento);
            caberão.push(cabeNaPeça);
            textosDeValor.push(horizontal
              ? `<text x="${arredondar(mín + comprimento / 2)}" y="${arredondar(pos + espessura * 0.47 + f * 0.3)}" font-size="${arredondar(f * 0.8)}" text-anchor="middle" fill="${corDoTextoSobre(cor(j))}">${esc(texto)}</text>`
              : `<text x="${arredondar(pos + espessura * 0.47)}" y="${arredondar(mín + comprimento / 2 + f * 0.3)}" font-size="${arredondar(f * 0.8)}" text-anchor="middle" fill="${corDoTextoSobre(cor(j))}">${esc(texto)}</text>`);
          } else {
            caberão.push(horizontal ? true : estimarLargura(texto, f * 0.8) <= espessura * 1.02);
            textosDeValor.push(horizontal
              ? `<text x="${arredondar(Math.max(a, b) + f * 0.4 * (v >= 0 ? 1 : 0) - (v < 0 ? f * 0.4 + estimarLargura(texto, f * 0.8) : 0))}" y="${arredondar(pos + espessura * 0.47 + f * 0.3)}" font-size="${arredondar(f * 0.8)}" fill="${paleta.texto}">${esc(texto)}</text>`
              : `<text x="${arredondar(pos + espessura * 0.47)}" y="${arredondar(v >= 0 ? mín - f * 0.35 : mín + comprimento + f * 0.95)}" font-size="${arredondar(f * 0.8)}" text-anchor="middle" fill="${paleta.texto}">${esc(texto)}</text>`);
          }
        });
        // Rótulo da categoria.
        const centro = inícioDaBanda + banda / 2;
        if (horizontal) {
          partes.push(`<text x="${arredondar(área.x - f * 0.5)}" y="${arredondar(centro + f * 0.32)}" font-size="${arredondar(f * 0.9)}" text-anchor="end" fill="${paleta.suave}">${esc(rótuloDaCategoria(c, 26))}</text>`);
        } else if (girar) {
          const yy = área.y + áreaH + f * 1.1;
          partes.push(`<text x="${arredondar(centro)}" y="${arredondar(yy)}" font-size="${arredondar(f * 0.9)}" text-anchor="end" fill="${paleta.suave}" transform="rotate(-40 ${arredondar(centro)} ${arredondar(yy)})">${esc(rótuloDaCategoria(c, 18))}</text>`);
        } else {
          partes.push(`<text x="${arredondar(centro)}" y="${arredondar(área.y + áreaH + f * 1.3)}" font-size="${arredondar(f * 0.9)}" text-anchor="middle" fill="${paleta.suave}">${esc(rótuloDaCategoria(c, 18))}</text>`);
        }
      });
      partes.push(...desenhos);
      if (mostrarValores) {
        if (caberão.every(Boolean)) partes.push(...textosDeValor);
        else avisos.push('Os valores não cabem escritos sobre as barras e foram omitidos do gráfico; a tabela do resultado traz todos.');
      }
    }
    // Títulos dos eixos. Em barras horizontais o eixo dos valores fica embaixo e as categorias, ao lado.
    const títuloDaBase = horizontal ? rótuloY : rótuloX; // rótulo do eixo horizontal da tela
    const títuloDaLateral = horizontal ? rótuloX : rótuloY;
    if (títuloDaBase) partes.push(`<text x="${arredondar(área.x + área.w / 2)}" y="${arredondar(área.y + áreaH + base - f * 0.3)}" font-size="${arredondar(f * 0.95)}" text-anchor="middle" fill="${paleta.texto}">${esc(títuloDaBase)}</text>`);
    if (títuloDaLateral) partes.push(`<text x="${arredondar(padX + f * 0.6)}" y="${arredondar(área.y + áreaH / 2)}" font-size="${arredondar(f * 0.95)}" text-anchor="middle" fill="${paleta.texto}" transform="rotate(-90 ${arredondar(padX + f * 0.6)} ${arredondar(área.y + áreaH / 2)})">${esc(títuloDaLateral)}</text>`);

    // Descrição para leitor de tela: maior e menor valor de cada uma das primeiras séries.
    for (const s of séries.slice(0, 3)) {
      const pares = s.valores.map((v, i) => [v, categorias[i]]).filter(([v]) => v !== null);
      const maior = pares.reduce((a, b) => (b[0] > a[0] ? b : a));
      const menor = pares.reduce((a, b) => (b[0] < a[0] ? b : a));
      resumos.push(pares.length === 1 ? `${s.nome}: ${rótuloDoValor(maior[0])} em ${maior[1]}.` : `${s.nome}: maior valor ${rótuloDoValor(maior[0])} (${maior[1]}), menor ${rótuloDoValor(menor[0])} (${menor[1]}).`);
    }
    const nome = { barras: 'barras', 'barras-horizontais': 'barras horizontais', linhas: 'linhas' }[tipo];
    descrição = `Gráfico de ${nome}${éPilha ? ' empilhadas' : ''} com ${n} categoria(s) e ${séries.length} série(s). ${resumos.join(' ')}`;
  }

  const textoDoTítulo = título || `Gráfico de ${TIPOS[tipo].toLowerCase()}`;
  const corpo = `<title id="gráfico-título">${esc(textoDoTítulo)}</title><desc id="gráfico-descrição">${esc(descrição)}</desc>`
    + `<rect width="${W}" height="${H}" fill="${paleta.fundo}"/>${partes.join('')}`;
  const comuns = `viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gráfico-título gráfico-descrição" font-family="${FONTE}"`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" ${comuns} width="100%">${corpo}</svg>`,
    svgParaArquivo: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${comuns} width="${W}" height="${H}">${corpo}</svg>\n`,
    largura: W, altura: H, descrição, avisos,
  };
}

/** Participação de um valor no total, em texto ("25,0%"). */
export function formatarPorcentagem(valor, todos) {
  const total = todos.reduce((s, v) => s + (v ?? 0), 0);
  if (!total) return '0%';
  return `${((valor / total) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/**
 * Tabela com os mesmos dados do gráfico, em texto formatado, para a tela e para quem usa leitor de tela.
 * @returns {{cabeçalho: string[], linhas: string[][]}}
 */
export function tabelaDoGráfico(dados, tipo, { prefixo = '', sufixo = '', rótuloDasCategorias = '' } = {}) {
  const unidade = { prefixo: limparTexto(prefixo, 8), sufixo: limparTexto(sufixo, 8) };
  const primeira = rótuloDasCategorias || 'Categoria';
  if (tipo === 'pizza') {
    const v = dados.séries[0].valores;
    return {
      cabeçalho: [primeira, dados.séries[0].nome, 'Participação'],
      linhas: dados.categorias.map((c, i) => [c, formatarValor(v[i], unidade), formatarPorcentagem(v[i], v)]),
    };
  }
  return {
    cabeçalho: [primeira, ...dados.séries.map((s) => s.nome)],
    linhas: dados.categorias.map((c, i) => [c, ...dados.séries.map((s) => (s.valores[i] === null ? '' : formatarValor(s.valores[i], unidade)))]),
  };
}

/** Nome do arquivo de saída a partir do título. */
export function nomeDoArquivo(título, extensão) {
  const base = limparTexto(título, 60).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${base || 'grafico'}.${extensão}`;
}

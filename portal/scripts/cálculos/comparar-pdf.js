/**
 * Comparar PDF: o que mudou no TEXTO entre duas versões de um PDF.
 *
 * Só o texto é comparado, palavra por palavra. Não há comparação visual: imagens, cores,
 * tabelas desenhadas e mudanças de layout que não mexem no texto NÃO aparecem aqui.
 *
 * Como funciona:
 *  1. o texto de cada página é lido com o pdf.js (ver `extrair-texto-de-pdf.js`);
 *  2. as páginas das duas versões são pareadas pela semelhança do conteúdo, não pela posição:
 *     uma página nova no meio ou uma página tirada não faz "tudo mudar";
 *  3. em cada par com texto diferente, uma diferença de palavras (maior subsequência comum)
 *     separa o que foi acrescentado, o que foi removido e o que foi trocado.
 * Quebra de linha e espaços não contam como diferença.
 *
 * Sem DOM: o pdf.js entra por `abrir`, como nas outras ferramentas de PDF.
 */
import { extrairTextoDoPdf, mensagemDeErroDeExtração, listaDePáginas } from './extrair-texto-de-pdf.js';
import { mensagemDeErroDoPdfÚnico, textoDePáginas } from './pdf-páginas.js';

/** Páginas de cada versão; acima disso a comparação fica lenta demais no celular. */
export const LIMITE_DE_PÁGINAS_COMPARADAS = 300;
/** Abaixo desta semelhança (0 a 1), duas páginas não são tratadas como a mesma página mudada. */
export const SEMELHANÇA_MÍNIMA = 0.4;
/** Células da tabela da diferença de palavras; acima disso a página inteira conta como trocada. */
export const CÉLULAS_MÁXIMAS = 16_000_000;
/** Palavras de contexto mostradas antes e depois de cada mudança. */
export const PALAVRAS_DE_CONTEXTO = 5;
/** Tamanho máximo de um trecho mostrado ou escrito no relatório. */
export const TRECHO_MÁXIMO = 600;

export function mensagemDeErroDeComparação(erro, extras = {}) {
  const quem = extras.arquivo === 'novo' ? 'novo' : 'original';
  const mensagens = {
    sem_original: 'Escolha o PDF original (a versão mais antiga).',
    sem_novo: 'Escolha o PDF novo (a versão alterada).',
    páginas_demais_comparar: `"${extras.nome ?? 'O arquivo'}" tem ${textoDePáginas(extras.total ?? 0)}. Dá para comparar até ${LIMITE_DE_PÁGINAS_COMPARADAS} páginas de cada versão.`,
  };
  if (mensagens[erro]) return mensagens[erro];
  const base = mensagemDeErroDeExtração(erro, extras);
  if (erro === 'sem_texto') {
    return `O PDF ${quem}, "${extras.nome ?? ''}", não tem texto: parece ser um PDF escaneado, em que cada página é uma foto. `
      + 'Esta ferramenta compara só o texto e não faz OCR (reconhecimento de caracteres), que é outra ferramenta.';
  }
  return base;
}

/* -------------------------------------------------------- palavras */

/** Chave de comparação de uma palavra. */
const chaveDe = (palavra, ignorarCaixa) => (ignorarCaixa ? palavra.toLocaleLowerCase('pt-BR') : palavra);

/**
 * Palavras do texto, sem importar quebras de linha e espaços.
 * @returns {{texto: string[], chave: string[]}}
 */
export function palavrasDe(texto, { ignorarCaixa = false } = {}) {
  const lista = String(texto ?? '').normalize('NFC').split(/\s+/u).filter(Boolean);
  return { texto: lista, chave: lista.map((p) => chaveDe(p, ignorarCaixa)) };
}

/** Semelhança de Dice entre dois conjuntos de palavras (0 a 1); duas páginas vazias são iguais. */
function dice(a, b) {
  if (a.total === 0 && b.total === 0) return 1;
  if (a.total === 0 || b.total === 0) return 0;
  let comuns = 0;
  const [menor, maior] = a.contagem.size <= b.contagem.size ? [a.contagem, b.contagem] : [b.contagem, a.contagem];
  for (const [palavra, vezes] of menor) comuns += Math.min(vezes, maior.get(palavra) ?? 0);
  return (2 * comuns) / (a.total + b.total);
}

function resumoDaPágina(chaves) {
  const contagem = new Map();
  for (const c of chaves) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  return { contagem, total: chaves.length, texto: chaves.join(' ') };
}

/* --------------------------------------------- diferença de palavras */

/**
 * Diferença entre duas listas de chaves: maior subsequência comum, depois de tirar o começo e
 * o fim iguais. Devolve as operações na ordem, ou `null` se a tabela passaria de `CÉLULAS_MÁXIMAS`.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {{op: 'igual'|'tira'|'põe', ia?: number, ib?: number}[] | null}
 */
export function diferençaDePalavras(a, b) {
  let começo = 0;
  while (começo < a.length && começo < b.length && a[começo] === b[começo]) começo++;
  let fimA = a.length;
  let fimB = b.length;
  while (fimA > começo && fimB > começo && a[fimA - 1] === b[fimB - 1]) { fimA--; fimB--; }

  const n = fimA - começo;
  const m = fimB - começo;
  if (n * m > CÉLULAS_MÁXIMAS) return null;

  const ops = [];
  for (let i = 0; i < começo; i++) ops.push({ op: 'igual', ia: i, ib: i });

  // tabela[i][j]: tamanho da subsequência comum de a[começo+i..] e b[começo+j..].
  const largura = m + 1;
  const tabela = new Uint32Array((n + 1) * largura);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tabela[i * largura + j] = a[começo + i] === b[começo + j]
        ? tabela[(i + 1) * largura + j + 1] + 1
        : Math.max(tabela[(i + 1) * largura + j], tabela[i * largura + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[começo + i] === b[começo + j]) { ops.push({ op: 'igual', ia: começo + i, ib: começo + j }); i++; j++; }
    // Em empate, tirar vem antes de pôr: o trecho velho aparece antes do novo.
    else if (tabela[(i + 1) * largura + j] >= tabela[i * largura + j + 1]) { ops.push({ op: 'tira', ia: começo + i }); i++; }
    else { ops.push({ op: 'põe', ib: começo + j }); j++; }
  }
  while (i < n) { ops.push({ op: 'tira', ia: começo + i }); i++; }
  while (j < m) { ops.push({ op: 'põe', ib: começo + j }); j++; }
  for (let k = fimA; k < a.length; k++) ops.push({ op: 'igual', ia: k, ib: fimB + (k - fimA) });
  return ops;
}

/** Corta um trecho muito longo, dizendo que cortou. */
export function abreviar(texto, máximo = TRECHO_MÁXIMO) {
  return texto.length > máximo ? `${texto.slice(0, máximo).trimEnd()}…` : texto;
}

/**
 * Mudanças de uma página pareada, a partir das palavras das duas versões.
 * @returns {{tipo: 'acréscimo'|'remoção'|'edição', antigo: string, novo: string, antes: string, depois: string}[]}
 */
export function mudançasDaPágina(palavrasA, palavrasB) {
  const ops = diferençaDePalavras(palavrasA.chave, palavrasB.chave);
  if (!ops) {
    // Páginas grandes e totalmente diferentes: uma troca só, em vez de uma tabela gigante.
    return [{ tipo: 'edição', antigo: palavrasA.texto.join(' '), novo: palavrasB.texto.join(' '), antes: '', depois: '' }];
  }
  const mudanças = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === 'igual') { k++; continue; }
    const tirados = [];
    const postos = [];
    const de = k;
    while (k < ops.length && ops[k].op !== 'igual') {
      if (ops[k].op === 'tira') tirados.push(palavrasA.texto[ops[k].ia]);
      else postos.push(palavrasB.texto[ops[k].ib]);
      k++;
    }
    // Contexto: só palavras iguais coladas na mudança, sem atravessar outra mudança.
    const antes = [];
    for (let q = de - 1; q >= 0 && ops[q].op === 'igual' && antes.length < PALAVRAS_DE_CONTEXTO; q--) antes.unshift(palavrasA.texto[ops[q].ia]);
    const depois = [];
    for (let q = k; q < ops.length && ops[q].op === 'igual' && depois.length < PALAVRAS_DE_CONTEXTO; q++) depois.push(palavrasA.texto[ops[q].ia]);
    mudanças.push({
      tipo: tirados.length && postos.length ? 'edição' : (postos.length ? 'acréscimo' : 'remoção'),
      antigo: tirados.join(' '),
      novo: postos.join(' '),
      antes: antes.join(' '),
      depois: depois.join(' '),
    });
  }
  return mudanças;
}

/* ------------------------------------------------ pareamento de páginas */

/**
 * Pareia as páginas das duas versões pelo conteúdo.
 *
 * Programação dinâmica (como na maior subsequência comum), mas somando a SEMELHANÇA de cada par
 * em vez de contar iguais: páginas idênticas valem 1, páginas parecidas valem menos, e só pares
 * com semelhança de pelo menos `SEMELHANÇA_MÍNIMA` podem se formar. O que sobra entre dois pares,
 * em quantidades iguais dos dois lados, é pareado pela ordem (uma página reescrita por inteiro);
 * se as quantidades diferem, o que sobrou é página removida ou acrescentada.
 *
 * @param {string[][]} chavesA palavras (chaves) de cada página da versão original
 * @param {string[][]} chavesB idem, da versão nova
 * @returns {{a: number|null, b: number|null, semelhança: number}[]} índices a partir de 0, em ordem de leitura
 */
export function parearPáginas(chavesA, chavesB) {
  const A = chavesA.map(resumoDaPágina);
  const B = chavesB.map(resumoDaPágina);
  const pares = [];

  // Começo e fim idênticos pareiam direto: o caso comum, sem gastar a tabela.
  let começo = 0;
  while (começo < A.length && começo < B.length && A[começo].texto === B[começo].texto) {
    pares.push({ a: começo, b: começo, semelhança: 1 });
    começo++;
  }
  let fimA = A.length;
  let fimB = B.length;
  const final = [];
  while (fimA > começo && fimB > começo && A[fimA - 1].texto === B[fimB - 1].texto) {
    fimA--; fimB--;
    final.unshift({ a: fimA, b: fimB, semelhança: 1 });
  }

  const n = fimA - começo;
  const m = fimB - começo;
  const semelhança = (i, j) => (A[começo + i].texto === B[começo + j].texto ? 1 : dice(A[começo + i], B[começo + j]));
  const largura = m + 1;
  const melhor = new Float64Array((n + 1) * largura);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      let valor = Math.max(melhor[(i + 1) * largura + j], melhor[i * largura + j + 1]);
      const s = semelhança(i, j);
      if (s >= SEMELHANÇA_MÍNIMA) valor = Math.max(valor, melhor[(i + 1) * largura + j + 1] + s);
      melhor[i * largura + j] = valor;
    }
  }

  const meio = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const s = semelhança(i, j);
    if (s >= SEMELHANÇA_MÍNIMA && Math.abs(melhor[i * largura + j] - (melhor[(i + 1) * largura + j + 1] + s)) < 1e-9) {
      meio.push({ a: começo + i, b: começo + j, semelhança: s }); i++; j++;
    } else if (melhor[(i + 1) * largura + j] >= melhor[i * largura + j + 1] - 1e-12) {
      meio.push({ a: começo + i, b: null, semelhança: 0 }); i++;
    } else {
      meio.push({ a: null, b: começo + j, semelhança: 0 }); j++;
    }
  }
  while (i < n) { meio.push({ a: começo + i, b: null, semelhança: 0 }); i++; }
  while (j < m) { meio.push({ a: null, b: começo + j, semelhança: 0 }); j++; }

  // Entre dois pares firmes, quantidades iguais de páginas soltas dos dois lados = página reescrita.
  const arrumado = [];
  let solto = [];
  const fecharSolto = () => {
    const sóA = solto.filter((p) => p.a !== null);
    const sóB = solto.filter((p) => p.b !== null);
    if (sóA.length === sóB.length) sóA.forEach((p, k) => arrumado.push({ a: p.a, b: sóB[k].b, semelhança: 0 }));
    else arrumado.push(...sóA, ...sóB);
    solto = [];
  };
  for (const p of meio) {
    if (p.a !== null && p.b !== null) { fecharSolto(); arrumado.push(p); } else solto.push(p);
  }
  fecharSolto();
  return [...pares, ...arrumado, ...final];
}

/* --------------------------------------------------------- comparação */

/**
 * Compara o texto de duas versões já lidas.
 * @param {string[]} textosA texto de cada página da versão original
 * @param {string[]} textosB texto de cada página da versão nova
 * @param {{ignorarCaixa?: boolean}} [opções]
 */
export function compararTextos(textosA, textosB, { ignorarCaixa = false } = {}) {
  const A = textosA.map((t) => palavrasDe(t, { ignorarCaixa }));
  const B = textosB.map((t) => palavrasDe(t, { ignorarCaixa }));
  const pares = parearPáginas(A.map((p) => p.chave), B.map((p) => p.chave));

  const páginas = [];
  const contagem = { acréscimo: 0, remoção: 0, edição: 0 };
  const acrescentadas = [];
  const removidas = [];
  for (const { a, b } of pares) {
    let mudanças;
    if (a === null) {
      acrescentadas.push(b + 1);
      mudanças = [{ tipo: 'página acrescentada', antigo: '', novo: B[b].texto.join(' '), antes: '', depois: '' }];
    } else if (b === null) {
      removidas.push(a + 1);
      mudanças = [{ tipo: 'página removida', antigo: A[a].texto.join(' '), novo: '', antes: '', depois: '' }];
    } else {
      mudanças = A[a].chave.join(' ') === B[b].chave.join(' ') ? [] : mudançasDaPágina(A[a], B[b]);
      for (const m of mudanças) contagem[m.tipo]++;
    }
    páginas.push({ a: a === null ? null : a + 1, b: b === null ? null : b + 1, mudanças });
  }
  const comDiferença = páginas.filter((p) => p.mudanças.length > 0);
  const total = comDiferença.reduce((s, p) => s + p.mudanças.length, 0);
  return {
    páginas,
    resumo: {
      páginasA: A.length,
      páginasB: B.length,
      páginasComDiferença: comDiferença.length,
      totalDeMudanças: total,
      ...contagem,
      acrescentadas,
      removidas,
      iguais: total === 0,
    },
  };
}

const folga = () => new Promise((resolver) => { setTimeout(resolver, 0); });

/**
 * Lê e compara dois PDFs.
 *
 * @param {{nome: string, bytes: Uint8Array}} original
 * @param {{nome: string, bytes: Uint8Array}} novo
 * @param {{
 *   abrir: Function, ignorarCaixa?: boolean, aoProgredir?: (p: {etapa: string, página?: number, total?: number}) => void,
 *   cancelado?: () => boolean,
 * }} opções
 * @returns {Promise<
 *   ({ok: true, original: string, novo: string} & ReturnType<typeof compararTextos>)
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function compararPdfs(original, novo, { abrir, ignorarCaixa = false, aoProgredir, cancelado } = {}) {
  if (!original?.bytes) return { ok: false, erro: 'sem_original' };
  if (!novo?.bytes) return { ok: false, erro: 'sem_novo' };

  const lidos = {};
  for (const [quem, arquivo] of [['original', original], ['novo', novo]]) {
    const r = await extrairTextoDoPdf(arquivo, {
      abrir, parágrafos: true, títulos: false, cancelado, limiteDePáginas: LIMITE_DE_PÁGINAS_COMPARADAS,
      aoProgredir: ({ página, total }) => aoProgredir?.({ etapa: quem, página, total }),
    });
    if (!r.ok) {
      const extras = { ...r.extras, arquivo: quem };
      // O limite desta ferramenta é menor que o da leitura: a mensagem diz o limite certo.
      if (r.erro === 'pdf_páginas_demais') return { ok: false, erro: 'páginas_demais_comparar', extras };
      return { ok: false, erro: r.erro, extras };
    }
    lidos[quem] = r;
  }
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };

  aoProgredir?.({ etapa: 'comparar' });
  await folga();
  const comparação = compararTextos(lidos.original.páginas.map((p) => p.texto), lidos.novo.páginas.map((p) => p.texto), { ignorarCaixa });
  return {
    ok: true, original: original.nome, novo: novo.nome, ...comparação,
    semTexto: { original: lidos.original.semTexto, novo: lidos.novo.semTexto },
  };
}

/* ------------------------------------------------------------ relatório */

const rótuloDaPágina = (p) => (p.a === null ? `página ${p.b} (nova)` : p.b === null ? `página ${p.a} (removida)` : p.a === p.b ? `página ${p.a}` : `página ${p.a} do original = página ${p.b} do novo`);

/** Linhas planas das mudanças: uma por mudança, com a página das duas versões. */
export function linhasDoRelatório(resultado) {
  const linhas = [];
  for (const p of resultado.páginas) {
    for (const m of p.mudanças) linhas.push({ ...m, páginaOriginal: p.a, páginaNova: p.b });
  }
  return linhas;
}

/**
 * Relatório em texto simples, para copiar e baixar.
 * @param {Awaited<ReturnType<typeof compararPdfs>> & {ok: true}} r
 */
export function relatórioEmTexto(r) {
  const s = r.resumo;
  const linhas = [
    'Comparação de PDF (só o texto)',
    `Original: ${r.original} (${textoDePáginas(s.páginasA)})`,
    `Novo: ${r.novo} (${textoDePáginas(s.páginasB)})`,
    '',
  ];
  if (s.iguais) {
    linhas.push('Nenhuma diferença no texto.');
  } else {
    linhas.push(`${s.totalDeMudanças.toLocaleString('pt-BR')} diferenças em ${textoDePáginas(s.páginasComDiferença)}: `
      + `${s.acréscimo} acréscimos, ${s.remoção} remoções, ${s.edição} edições.`);
    if (s.acrescentadas.length) linhas.push(`Páginas acrescentadas no novo: ${listaDePáginas(s.acrescentadas, 50)}.`);
    if (s.removidas.length) linhas.push(`Páginas do original que não existem no novo: ${listaDePáginas(s.removidas, 50)}.`);
    for (const p of r.páginas.filter((x) => x.mudanças.length)) {
      linhas.push('', `== ${rótuloDaPágina(p)[0].toUpperCase()}${rótuloDaPágina(p).slice(1)} ==`);
      for (const m of p.mudanças) {
        if (m.antes) linhas.push(`  ...${m.antes}`);
        if (m.antigo) linhas.push(`  - ${abreviar(m.antigo, 2000)}`);
        if (m.novo) linhas.push(`  + ${abreviar(m.novo, 2000)}`);
        if (m.depois) linhas.push(`  ${m.depois}...`);
        linhas.push(`  (${m.tipo})`);
      }
    }
  }
  linhas.push('', 'Só o texto foi comparado: imagens, cores e mudanças de layout não aparecem.');
  return linhas.join('\n');
}

/** Linhas do CSV: cabeçalho e uma linha por mudança. */
export function linhasDoCsv(r) {
  return [
    ['Página no original', 'Página no novo', 'Tipo', 'Antes', 'Depois'],
    ...linhasDoRelatório(r).map((m) => [m.páginaOriginal ?? '', m.páginaNova ?? '', m.tipo, abreviar(m.antigo, 2000), abreviar(m.novo, 2000)]),
  ];
}

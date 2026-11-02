/**
 * Texto para fala (F193): preparo do texto, escolha de voz e o controle da leitura.
 *
 * A síntese de voz é a do próprio navegador (Web Speech API, `speechSynthesis`). Este arquivo não toca no
 * navegador: o sintetizador e a fábrica de falas entram por parâmetro, o que deixa o controle da leitura
 * (fila, pausa, parágrafo anterior e seguinte, erro) testável no Node com um sintetizador de mentira.
 *
 * Duas manhas do navegador explicam o desenho:
 * - O Chrome corta falas longas depois de uns 15 segundos e, às vezes, nunca dispara `end`. Por isso o texto é
 *   dividido em TRECHOS curtos (até `TAMANHO_DO_TRECHO` caracteres, sem cortar palavra), falados em fila.
 * - Pausar não funciona em todo celular (alguns cancelam em vez de pausar). Ao continuar, se nada estiver
 *   falando, o trecho atual recomeça do início.
 */

export const LIMITE_DE_CARACTERES = 30000;
export const TAMANHO_DO_TRECHO = 200;
/** Espera máxima para a voz começar a falar um trecho; passou disso, a leitura para com uma mensagem. */
export const PRAZO_PARA_COMEÇAR_MS = 10000;
/** Palavras por minuto de uma voz sintética em velocidade normal (referência do portal para fala). */
export const PALAVRAS_POR_MINUTO = 150;

export const VELOCIDADES = Object.freeze([
  { valor: '0.5', rótulo: 'Bem devagar (0,5×)' },
  { valor: '0.75', rótulo: 'Devagar (0,75×)' },
  { valor: '1', rótulo: 'Normal (1×)' },
  { valor: '1.25', rótulo: 'Um pouco mais rápida (1,25×)' },
  { valor: '1.5', rótulo: 'Rápida (1,5×)' },
  { valor: '2', rótulo: 'Bem rápida (2×)' },
]);

export const TONS = Object.freeze([
  { valor: '0.5', rótulo: 'Grave' },
  { valor: '0.75', rótulo: 'Um pouco grave' },
  { valor: '1', rótulo: 'Normal' },
  { valor: '1.25', rótulo: 'Um pouco agudo' },
  { valor: '1.5', rótulo: 'Agudo' },
]);

/* ------------------------------------------------------------------ texto */

/** Caracteres de controle e de formatação invisível não são lidos e só atrapalham a divisão. */
const INVISÍVEIS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/**
 * Separa o texto em parágrafos (uma linha com texto é um parágrafo) e limpa o que a voz não leria.
 * @param {string} bruto
 * @returns {string[]}
 */
export function dividirEmParágrafos(bruto) {
  return String(bruto ?? '')
    .replace(INVISÍVEIS, '')
    .split(/\r?\n|\u2028|\u2029/)
    .map((linha) => linha.replace(/[ \t ]+/g, ' ').trim())
    .filter((linha) => /[\p{L}\p{N}]/u.test(linha));
}

/** Quebra um pedaço comprido em partes de até `máximo` caracteres, sem cortar palavra (corta no meio só uma palavra gigante). */
function quebrarEmPalavras(texto, máximo) {
  const partes = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    if (palavra.length > máximo) {
      if (atual) { partes.push(atual); atual = ''; }
      for (let i = 0; i < palavra.length; i += máximo) partes.push(palavra.slice(i, i + máximo));
    } else if (atual && atual.length + 1 + palavra.length > máximo) {
      partes.push(atual);
      atual = palavra;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual) partes.push(atual);
  return partes;
}

/**
 * Divide um parágrafo em trechos de até `máximo` caracteres, preferindo cortar no fim de frase, depois em vírgula
 * ou ponto e vírgula, e só por último entre palavras.
 * @param {string} parágrafo
 * @param {number} [máximo]
 * @returns {string[]}
 */
export function dividirParágrafo(parágrafo, máximo = TAMANHO_DO_TRECHO) {
  if (parágrafo.length <= máximo) return [parágrafo];
  const frases = parágrafo.split(/(?<=[.!?…])\s+/u);
  const trechos = [];
  let atual = '';
  const fechar = () => { if (atual) { trechos.push(atual); atual = ''; } };
  for (const frase of frases) {
    if (frase.length > máximo) {
      fechar();
      for (const pedaço of frase.split(/(?<=[,;:])\s+/u)) {
        if (pedaço.length > máximo) { fechar(); trechos.push(...quebrarEmPalavras(pedaço, máximo)); } else if (atual && atual.length + 1 + pedaço.length > máximo) { fechar(); atual = pedaço; } else atual = atual ? `${atual} ${pedaço}` : pedaço;
      }
      fechar();
    } else if (atual && atual.length + 1 + frase.length > máximo) {
      fechar();
      atual = frase;
    } else {
      atual = atual ? `${atual} ${frase}` : frase;
    }
  }
  fechar();
  return trechos;
}

/** Contagem de palavras que a voz lê (sequências de letras e números). */
export function contarPalavras(texto) {
  return (String(texto).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
}

/**
 * Prepara a leitura: parágrafos, trechos numerados pelo parágrafo e totais.
 * @param {string} bruto
 * @returns {{parágrafos: string[], trechos: {parágrafo: number, texto: string}[], caracteres: number, palavras: number}}
 */
export function prepararLeitura(bruto) {
  const parágrafos = dividirEmParágrafos(bruto);
  const trechos = parágrafos.flatMap((p, índice) => dividirParágrafo(p).map((texto) => ({ parágrafo: índice, texto })));
  const total = parágrafos.join(' ');
  return { parágrafos, trechos, caracteres: total.length, palavras: contarPalavras(total) };
}

/**
 * Confere o texto digitado. Devolve a mensagem de erro, ou null se está tudo certo.
 * @param {string} bruto
 * @returns {string|null}
 */
export function conferirTexto(bruto) {
  const texto = String(bruto ?? '');
  if (!texto.trim()) return 'Escreva ou cole o texto que você quer ouvir.';
  if (texto.length > LIMITE_DE_CARACTERES * 4) {
    return `O texto é grande demais (mais de ${(LIMITE_DE_CARACTERES * 4).toLocaleString('pt-BR')} caracteres). Leia por partes.`;
  }
  const { caracteres, trechos } = prepararLeitura(texto);
  if (trechos.length === 0) return 'O texto não tem letras nem números para ler. Escreva alguma frase.';
  if (caracteres > LIMITE_DE_CARACTERES) {
    return `O texto tem ${caracteres.toLocaleString('pt-BR')} caracteres e o limite é ${LIMITE_DE_CARACTERES.toLocaleString('pt-BR')}. Leia por partes.`;
  }
  return null;
}

/**
 * Estimativa do tempo de fala, em segundos. É média, não medição: cada voz tem o seu ritmo.
 * @param {number} palavras
 * @param {number} velocidade 0,5 a 2
 */
export function estimarSegundos(palavras, velocidade = 1) {
  if (!(velocidade > 0)) return 0;
  return Math.round((palavras / PALAVRAS_POR_MINUTO / velocidade) * 60);
}

/**
 * Lê "0.5", "1,25" ou número e confere a faixa permitida pela Web Speech API (0,1 a 10 na especificação;
 * o portal oferece só 0,5 a 2 porque fora disso a voz fica incompreensível).
 * @param {unknown} valor
 * @param {{mín: number, máx: number, padrão: number}} faixa
 */
export function lerEscala(valor, { mín, máx, padrão }) {
  const número = Number(String(valor ?? '').replace(',', '.'));
  if (!Number.isFinite(número) || número < mín || número > máx) return padrão;
  return número;
}

/* ------------------------------------------------------------------ vozes */

/**
 * @typedef {{voiceURI: string, name: string, lang: string, localService: boolean, default?: boolean}} Voz
 */

const normalizarIdioma = (lang) => String(lang ?? '').replace(/_/g, '-').toLowerCase();

/**
 * Filtra e ordena as vozes do aparelho: português do Brasil primeiro, depois os demais "pt", depois (se
 * pedido) os outros idiomas; dentro de cada grupo, as vozes do aparelho antes das de rede, e por nome.
 * @param {readonly Voz[]} vozes
 * @param {{todosOsIdiomas?: boolean, sóDoAparelho?: boolean}} [opções]
 * @returns {Voz[]}
 */
export function listarVozes(vozes, { todosOsIdiomas = false, sóDoAparelho = true } = {}) {
  const grupo = (voz) => {
    const lang = normalizarIdioma(voz.lang);
    if (lang === 'pt-br' || lang === 'pt') return 0;
    if (lang.startsWith('pt-')) return 1;
    return 2;
  };
  return [...vozes]
    .filter((v) => v && typeof v.voiceURI === 'string' && typeof v.name === 'string')
    .filter((v) => todosOsIdiomas || grupo(v) < 2)
    .filter((v) => !sóDoAparelho || v.localService)
    .sort((a, b) => grupo(a) - grupo(b) || Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name, 'pt-BR'));
}

/** Texto do item de uma voz: nome, idioma e se roda no aparelho ou na rede. */
export function rotularVoz(voz) {
  return `${voz.name} (${voz.lang.replace(/_/g, '-')}) — ${voz.localService ? 'no aparelho' : 'de rede'}`;
}

/**
 * Explica por que a lista está vazia, com o que a pessoa pode fazer.
 * @param {readonly Voz[]} todas todas as vozes que o navegador informou
 * @param {{todosOsIdiomas: boolean, sóDoAparelho: boolean}} filtros
 */
export function explicarFaltaDeVozes(todas, { todosOsIdiomas, sóDoAparelho }) {
  if (todas.length === 0) {
    return 'O navegador não informou nenhuma voz. Em alguns navegadores (e no Linux) é preciso instalar vozes no sistema: '
      + 'no Windows, em Configurações > Hora e idioma > Fala; no Android, em Configurações > Idioma > Saída de texto para fala; '
      + 'no iPhone, em Ajustes > Acessibilidade > Conteúdo Falado > Vozes. Depois, recarregue a página.';
  }
  const emPortuguês = listarVozes(todas, { todosOsIdiomas: false, sóDoAparelho: false });
  if (!todosOsIdiomas && emPortuguês.length === 0) {
    return 'Não há voz em português neste aparelho. Marque "Mostrar vozes de outros idiomas" para usar outra (ela lerá com sotaque estrangeiro) ou instale uma voz em português no sistema.';
  }
  if (sóDoAparelho && listarVozes(todas, { todosOsIdiomas, sóDoAparelho: false }).length > 0) {
    return `As vozes ${todosOsIdiomas ? '' : 'em português '}deste navegador são de rede. Desmarque "Só vozes do aparelho" para usá-las: o texto pode ser enviado ao fornecedor da voz para virar áudio.`;
  }
  return 'Nenhuma voz disponível com estas opções.';
}

/**
 * Acha a voz escolhida pelo identificador; sem escolha (ou sumida), a primeira da lista.
 * @param {readonly Voz[]} vozes
 * @param {string} voiceURI
 * @returns {Voz|null}
 */
export function acharVoz(vozes, voiceURI) {
  return vozes.find((v) => v.voiceURI === voiceURI) ?? vozes[0] ?? null;
}

/* ------------------------------------------------------------------ controle da leitura */

/**
 * @typedef {'parado'|'lendo'|'pausado'|'fim'|'erro'} EstadoDaLeitura
 * @typedef {{estado: EstadoDaLeitura, trecho: number, totalDeTrechos: number, parágrafo: number, totalDeParágrafos: number, mensagem: string}} SituaçãoDaLeitura
 */

/**
 * Controla a leitura de uma lista de trechos num sintetizador do tipo `speechSynthesis`.
 *
 * @param {{
 *   sintetizador: {speak: Function, cancel: Function, pause: Function, resume: Function, speaking: boolean, pending: boolean, paused: boolean},
 *   criarFala: (texto: string) => {voice: any, rate: number, pitch: number, lang: string, onstart: any, onend: any, onerror: any},
 *   trechos: {parágrafo: number, texto: string}[],
 *   voz?: Voz|null, velocidade?: number, tom?: number,
 *   aoMudar?: (situação: SituaçãoDaLeitura) => void,
 *   agendar?: (função: () => void, ms: number) => unknown,
 *   cancelarAgenda?: (id: unknown) => void,
 * }} opções
 */
export function criarLeitor({
  sintetizador, criarFala, trechos, voz = null, velocidade = 1, tom = 1, aoMudar = () => {},
  agendar = (f, ms) => setTimeout(f, ms), cancelarAgenda = (id) => clearTimeout(id),
}) {
  const totalDeParágrafos = trechos.length ? trechos[trechos.length - 1].parágrafo + 1 : 0;
  let estado = 'parado';
  let índice = 0;
  let mensagem = '';
  /** Cada fala nova invalida as anteriores: o `cancel()` dispara `end`/`error` da fala velha, que precisa ser ignorado. */
  let rodada = 0;
  let relógio = null;
  /** O navegador pode coletar a fala antes do `end`; manter a referência evita o fim silencioso. */
  let falaAtual = null;

  const situação = () => ({
    estado, trecho: índice, totalDeTrechos: trechos.length,
    parágrafo: trechos[Math.min(índice, trechos.length - 1)]?.parágrafo ?? 0, totalDeParágrafos, mensagem,
  });
  const mudar = (novo, texto = '') => { estado = novo; mensagem = texto; aoMudar(situação()); };
  const pararRelógio = () => { if (relógio !== null) { cancelarAgenda(relógio); relógio = null; } };

  /** Descarta a fala em andamento (e suas notificações atrasadas) antes de começar outra. */
  function recomeçar() {
    pararRelógio();
    rodada += 1;
    sintetizador.cancel();
    // Depois de pausar, alguns navegadores continuam "pausados" mesmo após cancelar: a fala nova ficaria muda.
    if (sintetizador.paused) sintetizador.resume();
  }

  function falar(i) {
    pararRelógio();
    rodada += 1;
    const minha = rodada;
    índice = i;
    const fala = criarFala(trechos[i].texto);
    if (voz) { fala.voice = voz; fala.lang = voz.lang; }
    fala.rate = velocidade;
    fala.pitch = tom;
    fala.onstart = () => { if (minha === rodada) pararRelógio(); };
    fala.onend = () => {
      if (minha !== rodada || estado !== 'lendo') return;
      pararRelógio();
      if (i + 1 < trechos.length) { falar(i + 1); aoMudar(situação()); } else { índice = trechos.length - 1; mudar('fim'); }
    };
    fala.onerror = (evento) => {
      if (minha !== rodada) return;
      const tipo = evento?.error ?? '';
      // "canceled" e "interrupted" são o efeito do nosso próprio cancel(); não são falha.
      if (tipo === 'canceled' || tipo === 'interrupted') return;
      pararRelógio();
      rodada += 1;
      mudar('erro', tipo === 'not-allowed'
        ? 'O navegador bloqueou a fala. Toque no botão de ler de novo.'
        : tipo === 'voice-unavailable' || tipo === 'language-unavailable'
          ? 'Esta voz não está disponível agora. Escolha outra voz.'
          : 'A leitura falhou no meio. Tente de novo ou escolha outra voz.');
    };
    falaAtual = fala;
    // Se a voz não responder, em vez de ficar parado para sempre o leitor desiste com uma mensagem.
    relógio = agendar(() => {
      if (minha !== rodada) return;
      sintetizador.cancel();
      rodada += 1;
      mudar('erro', 'A voz não respondeu. Escolha outra voz ou, se for uma voz de rede, confira a conexão.');
    }, PRAZO_PARA_COMEÇAR_MS);
    sintetizador.speak(fala);
  }

  return {
    get situação() { return situação(); },
    get falaAtual() { return falaAtual; },
    /** Começa do primeiro trecho (ou do parágrafo pedido). */
    iniciar(parágrafo = 0) {
      if (!trechos.length) return;
      recomeçar();
      const primeiro = trechos.findIndex((t) => t.parágrafo >= parágrafo);
      estado = 'lendo';
      mensagem = '';
      falar(primeiro < 0 ? 0 : primeiro);
      aoMudar(situação());
    },
    pausar() {
      if (estado !== 'lendo') return;
      pararRelógio();
      sintetizador.pause();
      mudar('pausado');
    },
    continuar() {
      if (estado !== 'pausado') return;
      estado = 'lendo';
      sintetizador.resume();
      // Aparelho que cancela em vez de pausar: nada fala, então o trecho recomeça do início.
      if (!sintetizador.speaking && !sintetizador.pending) falar(índice);
      aoMudar(situação());
    },
    parar() {
      if (estado === 'parado') return;
      pararRelógio();
      rodada += 1;
      sintetizador.cancel();
      índice = 0;
      mudar('parado');
    },
    /** Vai para o parágrafo anterior (-1) ou seguinte (+1) e continua lendo dali. */
    mover(direção) {
      if (!trechos.length || (estado !== 'lendo' && estado !== 'pausado')) return;
      const atual = trechos[índice].parágrafo;
      const alvo = Math.min(totalDeParágrafos - 1, Math.max(0, atual + direção));
      // "Anterior" no meio do parágrafo volta ao começo dele, como num player de música.
      const começoDoAtual = trechos.findIndex((t) => t.parágrafo === atual);
      const destino = direção < 0 && índice > começoDoAtual ? atual : alvo;
      if (direção > 0 && alvo === atual) return;
      recomeçar();
      estado = 'lendo';
      mensagem = '';
      falar(trechos.findIndex((t) => t.parágrafo === destino));
      aoMudar(situação());
    },
  };
}

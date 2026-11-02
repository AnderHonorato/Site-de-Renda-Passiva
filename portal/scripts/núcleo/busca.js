/**
 * Busca por intenção.
 *
 * A pessoa não digita o nome da ferramenta: digita a tarefa.
 * "quero saber quanto cobrar" precisa chegar em Preço de venda; "juntar dois
 * documentos" precisa chegar em juntar PDF.
 *
 * Três decisões sustentam a qualidade do resultado:
 *
 * 1. A comparação é por **palavra inteira**, não por trecho. Comparar trecho
 *    fazia "conta" casar com "Contador de texto" e com "contato", e uma busca
 *    por "rachar conta" devolvia 22 ferramentas.
 * 2. Existe **piso de relevância**: acertar só a categoria não basta para
 *    entrar na lista. Sem piso, qualquer consulta trazia dezenas de resultados.
 * 3. Há **tolerância a um erro de digitação** em palavras de cinco letras ou
 *    mais. "porcentagen" tem de achar "Calculadora de porcentagem".
 */
import { achatar, termos } from './texto.js';

/** Sinônimos e gírias que a pessoa usa e que não aparecem no nome da ferramenta. */
const SINÔNIMOS = Object.freeze({
  rachar: ['dividir', 'conta', 'despesa'],
  vaquinha: ['dividir', 'conta'],
  cobrar: ['preco', 'venda', 'orcamento'],
  lucro: ['margem', 'preco'],
  barato: ['comparar', 'preco', 'unidade'],
  compensa: ['comparar', 'parcelamento'],
  render: ['juros', 'investimento'],
  prazo: ['data', 'dias'],
  vencimento: ['data', 'dias'],
  ponto: ['horas', 'jornada'],
  planilha: ['csv', 'excel', 'tabela'],
  excel: ['planilha', 'xlsx', 'csv'],
  juntar: ['unir', 'mesclar'],
  mesclar: ['juntar', 'unir'],
  senha: ['seguranca', 'chave'],
  foto: ['imagem'],
  documento: ['pdf', 'arquivo'],
  recibo: ['comprovante', 'pagamento'],
  proposta: ['orcamento'],
  nota: ['recibo', 'documento'],
});

function expandir(consulta) {
  const base = termos(consulta);
  const extras = [];
  for (const t of base) {
    if (SINÔNIMOS[t]) extras.push(...SINÔNIMOS[t]);
  }
  return { base, todas: [...new Set([...base, ...extras])] };
}

/**
 * Distância de edição com teto de 1.
 *
 * Só precisamos saber se duas palavras diferem por no máximo uma letra, então
 * sai cedo em vez de montar a matriz inteira.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function difereEmUmaLetra(a, b) {
  if (a === b) return false;
  const diferença = a.length - b.length;
  if (diferença > 1 || diferença < -1) return false;

  if (diferença === 0) {
    let trocas = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i] && (trocas += 1) > 1) return false;
    }
    return trocas === 1;
  }

  // Uma das duas tem uma letra a mais: verifica se é inserção simples.
  const [maior, menor] = diferença === 1 ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let pulos = 0;
  while (i < maior.length && j < menor.length) {
    if (maior[i] === menor[j]) { i += 1; j += 1; continue; }
    if ((pulos += 1) > 1) return false;
    i += 1;
  }
  return true;
}

/** Quebra um texto em palavras normalizadas, para comparar por palavra inteira. */
function palavrasDe(texto) {
  return achatar(texto).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Monta o texto indexado de uma ferramenta, uma vez só. */
const índice = new WeakMap();
function indexar(ferramenta) {
  let guardado = índice.get(ferramenta);
  if (!guardado) {
    const campos = {
      nome: ferramenta.nome,
      resumo: ferramenta.resumo,
      categoria: ferramenta.categoriaNome,
      marcadores: [...ferramenta.tags, ...ferramenta.unifica].join(' '),
      intenções: ferramenta.intenções.join(' '),
      problema: ferramenta.problema,
    };
    guardado = {
      frases: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, achatar(v)])),
      palavras: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, new Set(palavrasDe(v))])),
    };
    índice.set(ferramenta, guardado);
  }
  return guardado;
}

/** Peso de cada campo quando a palavra bate exatamente. */
const PESOS = Object.freeze({
  nome: 30, marcadores: 20, intenções: 16, resumo: 9, problema: 7, categoria: 4,
});

/** Pontuação mínima para uma ferramenta merecer aparecer na lista. */
const PISO = 22;

/**
 * Pontua uma ferramenta contra uma consulta.
 * @param {object} ferramenta
 * @param {string} consulta
 * @returns {number} 0 quando não combina
 */
export function pontuar(ferramenta, consulta) {
  const bruta = achatar(consulta);
  if (!bruta) return 0;
  const { frases, palavras } = indexar(ferramenta);
  const { base, todas } = expandir(consulta);
  if (todas.length === 0) return 0;

  let pontos = 0;

  // Frase inteira vale mais do que palavras soltas.
  if (frases.nome === bruta) pontos += 240;
  else if (frases.nome.startsWith(bruta)) pontos += 150;
  else if (frases.nome.includes(bruta)) pontos += 100;
  if (frases.intenções.includes(bruta)) pontos += 120;
  if (frases.problema.includes(bruta)) pontos += 45;

  let encontradas = 0;
  for (const palavra of todas) {
    let dessa = 0;
    for (const [campo, peso] of Object.entries(PESOS)) {
      if (palavras[campo].has(palavra)) { dessa += peso; continue; }
      // Tolerância a um erro de digitação, só em palavra com corpo suficiente
      // para que a semelhança não seja acidental, e valendo menos que o acerto.
      if (palavra.length >= 5) {
        for (const candidata of palavras[campo]) {
          if (candidata.length >= 5 && difereEmUmaLetra(palavra, candidata)) {
            dessa += Math.round(peso * 0.6);
            break;
          }
        }
      }
    }
    if (dessa > 0 && base.includes(palavra)) encontradas += 1;
    pontos += dessa;
  }

  if (encontradas === 0) return 0;

  // Quem cobre mais termos da frase sobe.
  pontos *= 0.55 + 0.45 * (encontradas / base.length);

  // Ferramenta que já funciona vem antes da que ainda está planejada.
  if (ferramenta.status === 'pronta') pontos += 25;

  const total = Math.round(pontos);
  // Piso de relevância: bater só a categoria não coloca ninguém na lista.
  return total >= PISO ? total : 0;
}

/**
 * Busca no catálogo.
 * @param {readonly object[]} catálogo
 * @param {string} consulta
 * @param {{limite?: number, categoria?: string, tarefa?: string, apenasProntas?: boolean}} [opções]
 * @returns {object[]} ferramentas ordenadas pela pontuação
 */
export function buscar(catálogo, consulta, opções = {}) {
  const { limite = Infinity, categoria, tarefa, apenasProntas = false } = opções;
  let base = catálogo;
  if (categoria && categoria !== 'todas') base = base.filter((f) => f.cat === categoria);
  if (tarefa && tarefa !== 'todas') base = base.filter((f) => f.tarefas.includes(tarefa));
  if (apenasProntas) base = base.filter((f) => f.status === 'pronta');

  const consultaLimpa = String(consulta ?? '').trim();
  if (!consultaLimpa) {
    // Sem busca: prontas primeiro, depois ordem do catálogo.
    return [...base]
      .sort((a, b) => (a.status === b.status ? a.id.localeCompare(b.id) : a.status === 'pronta' ? -1 : 1))
      .slice(0, limite);
  }

  const pontuadas = base
    .map((f) => ({ f, pontos: pontuar(f, consultaLimpa) }))
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.f.id.localeCompare(b.f.id));

  // Corte relativo: resultado muito abaixo do melhor é ruído, não alternativa.
  const melhor = pontuadas[0]?.pontos ?? 0;
  return pontuadas
    .filter((r) => r.pontos >= melhor * 0.35)
    .slice(0, limite)
    .map((r) => r.f);
}

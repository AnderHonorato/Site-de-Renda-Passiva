/**
 * Busca por intenção.
 *
 * A pessoa não digita o nome da ferramenta: digita a tarefa.
 * "quero saber quanto cobrar" precisa chegar em Preço de venda; "juntar dois
 * documentos" precisa chegar em juntar PDF. Por isso a pontuação considera
 * nome, resumo, categoria, marcadores, sinônimos e frases de intenção.
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
  return [...new Set([...base, ...extras])];
}

/** Monta o texto indexado de uma ferramenta, uma vez só. */
const índice = new WeakMap();
function indexar(ferramenta) {
  let guardado = índice.get(ferramenta);
  if (!guardado) {
    guardado = {
      nome: achatar(ferramenta.nome),
      resumo: achatar(ferramenta.resumo),
      categoria: achatar(ferramenta.categoriaNome),
      marcadores: achatar([...ferramenta.tags, ...ferramenta.unifica].join(' ')),
      intenções: achatar(ferramenta.intenções.join(' ')),
      problema: achatar(ferramenta.problema),
    };
    índice.set(ferramenta, guardado);
  }
  return guardado;
}

/**
 * Pontua uma ferramenta contra uma consulta.
 * @param {object} ferramenta
 * @param {string} consulta
 * @returns {number} 0 quando não combina
 */
export function pontuar(ferramenta, consulta) {
  const bruta = achatar(consulta);
  if (!bruta) return 0;
  const campos = indexar(ferramenta);
  const palavras = expandir(consulta);
  if (palavras.length === 0) return 0;

  let pontos = 0;

  // Frase inteira vale mais do que palavras soltas.
  if (campos.nome === bruta) pontos += 220;
  else if (campos.nome.startsWith(bruta)) pontos += 140;
  else if (campos.nome.includes(bruta)) pontos += 90;
  if (campos.intenções.includes(bruta)) pontos += 110;
  if (campos.problema.includes(bruta)) pontos += 45;

  let encontradas = 0;
  for (const palavra of palavras) {
    let dessa = 0;
    if (campos.nome.includes(palavra)) dessa += 26;
    if (campos.marcadores.includes(palavra)) dessa += 18;
    if (campos.intenções.includes(palavra)) dessa += 16;
    if (campos.resumo.includes(palavra)) dessa += 10;
    if (campos.problema.includes(palavra)) dessa += 8;
    if (campos.categoria.includes(palavra)) dessa += 6;
    if (dessa > 0) encontradas += 1;
    pontos += dessa;
  }
  if (encontradas === 0) return 0;

  // Quem cobre mais termos da frase sobe.
  pontos *= 0.6 + 0.4 * (encontradas / palavras.length);

  // Ferramenta que já funciona vem antes da que ainda está planejada.
  if (ferramenta.status === 'pronta') pontos += 30;
  return Math.round(pontos);
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

  return base
    .map((f) => ({ f, pontos: pontuar(f, consultaLimpa) }))
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.f.id.localeCompare(b.f.id))
    .slice(0, limite)
    .map((r) => r.f);
}

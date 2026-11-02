/**
 * Lançamentos de ferramentas: quando cada ferramenta ficou pronta, e o aviso de "nova ferramenta".
 *
 * `dados/lançamentos.json` guarda, por slug, a data em que a ferramenta apareceu como pronta pela primeira vez
 * (ou `null` para as que já existiam quando o sistema nasceu e não devem virar notícia). O `npm run gerar`
 * acrescenta sozinho cada ferramenta nova com a data de hoje e escreve `dados/novidades.json`, o feed que o sino
 * do cabeçalho lê, para quem tem conta e para quem não tem. Commite o `lançamentos.json` junto com a ferramenta.
 */
import { readFile } from 'node:fs/promises';

/** Quantos dias uma ferramenta nova continua aparecendo como novidade. */
export const DIAS_DE_NOVIDADE = 30;
/** Máximo de itens no feed. */
export const LIMITE_DO_FEED = 30;

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Lê o registro; arquivo ausente ou quebrado vira registro vazio (as ferramentas serão semeadas com `null`). */
export async function lerRegistro(caminho) {
  try {
    const bruto = JSON.parse(await readFile(caminho, 'utf8'));
    return Object.fromEntries(Object.entries(bruto).filter(([, v]) => v === null || DATA.test(String(v))));
  } catch {
    return null;
  }
}

/**
 * Acrescenta ao registro as ferramentas prontas que ainda não estão nele.
 * Sem registro nenhum (primeira vez), semeia todas com `null`: nada vira novidade de uma vez só.
 * @returns {{registro: Record<string, string|null>, novos: string[], mudou: boolean}}
 */
export function atualizarRegistro(registroAtual, slugsProntos, hoje) {
  const primeiraVez = registroAtual === null;
  const registro = { ...(registroAtual ?? {}) };
  const novos = [];
  for (const slug of slugsProntos) {
    if (slug in registro) continue;
    registro[slug] = primeiraVez ? null : hoje;
    if (!primeiraVez) novos.push(slug);
  }
  const ordenado = Object.fromEntries(Object.entries(registro).sort(([a], [b]) => a.localeCompare(b)));
  const mudou = primeiraVez || novos.length > 0;
  return { registro: ordenado, novos, mudou };
}

const diasEntre = (a, b) => Math.floor((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/**
 * Monta o feed de novidades: ferramentas lançadas nos últimos `DIAS_DE_NOVIDADE` dias, da mais nova para a mais antiga.
 * @param {Record<string, string|null>} registro
 * @param {{slug: string, id: string, nome: string, resumo: string}[]} prontasPt
 * @param {{id: string, nome: string, resumo: string}[]} ferramentasEn catálogo em inglês, por id
 * @param {{pt: (nome: string) => string, en: (nome: string) => string}} títulos
 * @param {string} hoje AAAA-MM-DD
 */
export function montarFeed(registro, prontasPt, ferramentasEn, títulos, hoje) {
  const emIngles = new Map(ferramentasEn.map((f) => [f.id, f]));
  const itens = prontasPt
    .filter((f) => registro[f.slug] && diasEntre(registro[f.slug], hoje) <= DIAS_DE_NOVIDADE && diasEntre(registro[f.slug], hoje) >= 0)
    .map((f) => {
      const en = emIngles.get(f.id) ?? f;
      return {
        id: `ferramenta:${f.slug}`,
        data: registro[f.slug],
        slug: f.slug,
        link: `f/${f.slug}/`,
        pt: { título: títulos.pt(f.nome), texto: f.resumo },
        en: { título: títulos.en(en.nome), texto: en.resumo },
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data) || a.slug.localeCompare(b.slug))
    .slice(0, LIMITE_DO_FEED);
  return { versão: 1, itens };
}

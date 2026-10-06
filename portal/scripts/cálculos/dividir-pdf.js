/**
 * Dividir PDF: separa um PDF em vários, por intervalos ("1-3, 4-10") ou a cada N páginas.
 *
 * Comportamento a partir da pesquisa do iLovePDF (documentação/pesquisa-ilovepdf/a-organizar.md, A2).
 * Lá, intervalo fora do total trava em silêncio e o de trás para frente é aceito sem explicação;
 * aqui os dois são recusados no campo, com a mensagem do que corrigir.
 */
import { compactarZip } from '../comum/exportação/compactar-zip.js';
import {
  lerTrechos, copiarMetadados, nomeBase, mensagemDeErro, folga,
} from './páginas-do-pdf.js';

/** Arquivos de saída de uma vez: a lista na tela, o ZIP e a memória do celular têm teto. */
export const LIMITE_DE_ARQUIVOS_DE_SAÍDA = 500;

/**
 * Soma máxima das partes. Recursos compartilhados (uma imagem de fundo, uma fonte grande)
 * são copiados inteiros em cada parte, então a soma pode passar bastante do original.
 */
export const LIMITE_TOTAL_DE_SAÍDA = 400 * 1024 * 1024;

/** Quantas partes ganham botão de download próprio; acima disso só o ZIP, para o navegador não pedir permissão para dezenas de downloads. */
export const PARTES_COM_BOTÃO_PRÓPRIO = 10;

/**
 * Monta o plano de divisão (quais páginas vão para cada arquivo), sem tocar no PDF.
 * @param {number} total páginas do PDF
 * @param {{modo: 'intervalos'|'a-cada', intervalos?: string, tamanho?: string|number}} pedido
 * @returns {{ok: true, partes: {de: number, até: number}[], fora: number[], sobrepostas: boolean}
 *   | {ok: false, erro: string, campo: 'intervalos'|'tamanho', mensagem: string}}
 */
export function planejarDivisão(total, { modo, intervalos = '', tamanho = '' }) {
  let partes;
  if (modo === 'a-cada') {
    const texto = String(tamanho ?? '').trim();
    const n = Number(texto);
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(n) || n < 1) {
      return { ok: false, erro: 'tamanho_inválido', campo: 'tamanho', mensagem: mensagemDeErro('tamanho_inválido') };
    }
    const quantidade = Math.ceil(total / n);
    if (quantidade > LIMITE_DE_ARQUIVOS_DE_SAÍDA) {
      return {
        ok: false, erro: 'muitos_arquivos', campo: 'tamanho',
        mensagem: mensagemDeErro('muitos_arquivos', { limiteDeArquivos: LIMITE_DE_ARQUIVOS_DE_SAÍDA }),
      };
    }
    partes = Array.from({ length: quantidade }, (_, i) => ({ de: i * n + 1, até: Math.min(total, (i + 1) * n) }));
  } else {
    const lidos = lerTrechos(intervalos, total);
    if (!lidos.ok) {
      const códigoVazio = lidos.erro === 'páginas_vazio';
      return {
        ok: false, erro: lidos.erro, campo: 'intervalos',
        mensagem: códigoVazio ? 'Informe os intervalos, um por arquivo, por exemplo: 1-3, 4-10.' : mensagemDeErro(lidos.erro, lidos.extras),
      };
    }
    if (lidos.trechos.length > LIMITE_DE_ARQUIVOS_DE_SAÍDA) {
      return {
        ok: false, erro: 'muitos_arquivos', campo: 'intervalos',
        mensagem: mensagemDeErro('muitos_arquivos', { limiteDeArquivos: LIMITE_DE_ARQUIVOS_DE_SAÍDA }),
      };
    }
    partes = lidos.trechos.map(({ de, até }) => ({ de, até }));
  }

  // Páginas que nenhuma parte leva e páginas levadas por mais de uma parte: nada disso é erro,
  // mas a pessoa precisa saber para não achar que o PDF foi dividido por inteiro.
  const vezes = new Array(total + 1).fill(0);
  for (const { de, até } of partes) for (let p = de; p <= até; p++) vezes[p]++;
  const fora = [];
  let sobrepostas = false;
  for (let p = 1; p <= total; p++) {
    if (vezes[p] === 0) fora.push(p);
    if (vezes[p] > 1) sobrepostas = true;
  }
  return { ok: true, partes, fora, sobrepostas };
}

/**
 * Nome de cada parte: "contrato-1-3.pdf" (ou "contrato-5.pdf" para uma página só).
 * Nomes iguais (o mesmo intervalo pedido duas vezes) ganham número, porque dois arquivos
 * com o mesmo nome dentro do ZIP se sobrescreveriam ao abrir.
 * @param {string} nome nome do PDF original
 * @param {{de: number, até: number}[]} partes
 * @returns {string[]}
 */
export function nomesDasPartes(nome, partes) {
  const base = nomeBase(nome);
  const usados = new Map();
  return partes.map(({ de, até }) => {
    const único = de === até ? `${base}-${de}` : `${base}-${de}-${até}`;
    const vez = (usados.get(único) ?? 0) + 1;
    usados.set(único, vez);
    return `${vez === 1 ? único : `${único}-${vez}`}.pdf`;
  });
}

/**
 * Corta o PDF nas partes do plano.
 * @param {{documento: any, nome: string}} aberto PDF já aberto por `abrirPdf`
 * @param {{de: number, até: number}[]} partes
 * @param {{
 *   biblioteca: {PDFDocument: any},
 *   aoProgredir?: (progresso: {parte: number, partes: number}) => void,
 *   cancelado?: () => boolean,
 *   limiteTotal?: number,
 * }} opções
 * @returns {Promise<{ok: true, arquivos: {nome: string, bytes: Uint8Array, páginas: number}[], bytesTotais: number}
 *   | {ok: false, erro: string, mensagem: string}>}
 */
export async function dividirPdf({ documento, nome }, partes, { biblioteca, aoProgredir, cancelado, limiteTotal = LIMITE_TOTAL_DE_SAÍDA }) {
  const falha = (erro) => ({ ok: false, erro, mensagem: mensagemDeErro(erro) });
  const nomes = nomesDasPartes(nome, partes);
  const arquivos = [];
  let bytesTotais = 0;

  for (const [i, { de, até }] of partes.entries()) {
    await folga();
    if (cancelado?.()) return falha('cancelado');
    aoProgredir?.({ parte: i + 1, partes: partes.length });

    let bytes;
    try {
      const novo = await biblioteca.PDFDocument.create();
      copiarMetadados(documento, novo);
      const índices = Array.from({ length: até - de + 1 }, (_, k) => de - 1 + k);
      for (const cópia of await novo.copyPages(documento, índices)) novo.addPage(cópia);
      bytes = await novo.save();
    } catch {
      return falha('falha_ao_montar');
    }
    bytesTotais += bytes.length;
    if (bytesTotais > limiteTotal) return falha('saída_grande_demais');
    arquivos.push({ nome: nomes[i], bytes, páginas: até - de + 1 });
  }
  // Cancelado enquanto gravava a última parte: nada é entregue, como prometido.
  if (cancelado?.()) return falha('cancelado');
  return { ok: true, arquivos, bytesTotais };
}

/**
 * Junta as partes num ZIP (sem compressão: PDF já vem comprimido e o ganho seria quase nenhum).
 * @param {{nome: string, bytes: Uint8Array}[]} arquivos
 * @returns {Uint8Array}
 */
export function montarZipDasPartes(arquivos) {
  return compactarZip(arquivos.map(({ nome, bytes }) => ({ nome, conteúdo: bytes })));
}

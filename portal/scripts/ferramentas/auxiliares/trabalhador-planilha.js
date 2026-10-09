import { conferirPacoteXlsx, LIMITES_IMPORTACAO, validarTabelaImportada } from '../../cálculos/importar-planilha.js';

let bytes, leitor, abas;
export async function listarAbas(dados) {
  bytes = new Uint8Array(dados);
  await conferirPacoteXlsx(bytes);
  leitor = await import('../../../recursos/bibliotecas/xlsx-0.20.3.mjs');
  const livro = leitor.read(bytes, { type: 'array', bookSheets: true, bookProps: true });
  abas = livro.SheetNames;
  if (!abas?.length || abas.length > LIMITES_IMPORTACAO.abas) throw new Error('Escolha um XLSX com até 100 abas.');
  return abas;
}

export function lerAba(indice) {
  if (!Number.isInteger(indice) || !abas || indice < 0 || indice >= abas.length) throw new Error('Escolha uma aba válida.');
  const livro = leitor.read(bytes, { type: 'array', sheets: indice, sheetRows: LIMITES_IMPORTACAO.linhas + 1, cellHTML: false, cellFormula: true, cellStyles: false, cellText: true, dateNF: 'dd/mm/yyyy' });
  const aba = livro.Sheets[abas[indice]];
  if (!aba?.['!ref']) throw new Error('Esta aba não tem dados. Escolha outra aba.');
  const faixa = leitor.utils.decode_range(aba['!fullref'] || aba['!ref']);
  if (faixa.e.r >= LIMITES_IMPORTACAO.linhas || faixa.e.c >= LIMITES_IMPORTACAO.colunas || (faixa.e.r-faixa.s.r+1)*(faixa.e.c-faixa.s.c+1)>LIMITES_IMPORTACAO.celulas) throw new Error('A aba passa dos limites: 50.000 linhas, 256 colunas e 500.000 células. Divida a planilha em partes.');
  const tabela = Array.from({ length: faixa.e.r-faixa.s.r+1 }, (_, r) => Array.from({ length: faixa.e.c-faixa.s.c+1 }, (_, c) => {
    const celula = aba[leitor.utils.encode_cell({ r: faixa.s.r+r, c: faixa.s.c+c })];
    if (!celula || celula.v === undefined) return '';
    return celula.w ?? leitor.utils.format_cell(celula);
  }));
  const { linhas, colunas } = validarTabelaImportada(tabela);
  const formulas = Object.values(aba).filter(c => c && typeof c === 'object' && c.f);
  const semValor = formulas.filter(c => c.v === undefined).length;
  const avisos = ['Importados somente os valores exibidos da aba escolhida. Formatação, gráficos e fórmulas não são preservados.'];
  if (semValor) avisos.push(`${semValor} fórmula(s) sem resultado salvo ficaram vazias. Abra o original no Excel, recalcule e salve antes de importar se precisar desses valores.`);
  return { linhas, colunas, avisos, aba: abas[indice] };
}

if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  self.addEventListener('message', async ({ data }) => {
    try {
      const resultado = data.acao === 'abrir' ? await listarAbas(data.bytes) : lerAba(data.indice);
      self.postMessage({ id: data.id, resultado });
    } catch (erro) { self.postMessage({ id: data.id, erro: erro instanceof Error ? erro.message : 'Não foi possível ler a planilha.' }); }
  });
}

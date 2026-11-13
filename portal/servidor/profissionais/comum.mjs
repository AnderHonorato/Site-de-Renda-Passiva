/** Validação comum dos motores profissionais. Dados permanecem apenas em memória. */
import { lerCsv } from '../../scripts/cálculos/tabular.js';
import { validarCsvProfissional } from '../../scripts/cálculos/validar-csv-profissional.js';

export class ErroProfissional extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroProfissional'; }
}
export function exigir(condicao, mensagem) {
  if (!condicao) throw new ErroProfissional(mensagem);
}
const bytes = valor => new TextEncoder().encode(valor).length;
export function numeroFinito(valor, rotulo, minimo = -1e12, maximo = 1e12) {
  let texto = String(valor ?? '').trim();
  exigir(texto.length > 0 && texto.length <= 100, `${rotulo}: informe um número.`);
  if (texto.includes(',')) {
    exigir(/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+(?:[eE][+-]?\d+)?$/.test(texto), `${rotulo}: número inválido; use ponto ou vírgula decimal.`);
    texto = texto.replaceAll('.', '').replace(',', '.');
  }
  exigir(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(texto), `${rotulo}: número inválido.`);
  const n = Number(texto);
  exigir(Number.isFinite(n) && n >= minimo && n <= maximo, `${rotulo}: informe valor entre ${minimo} e ${maximo}.`);
  return n;
}
export function numeroOpcao(dados, nome, padrao, minimo = -1e12, maximo = 1e12) {
  const opcoes = dados?.opcoes;
  exigir(opcoes === undefined || (opcoes !== null && typeof opcoes === 'object' && !Array.isArray(opcoes)), 'As opções devem ser um objeto.');
  const valor = opcoes && Object.hasOwn(opcoes, nome) ? opcoes[nome] : padrao;
  return numeroFinito(valor, nome, minimo, maximo);
}
export function lerTabela(csv, colunas) {
  exigir(typeof csv === 'string' && csv.trim().length > 0, 'Importe um arquivo ou preencha os dados da tabela.');
  exigir(bytes(csv) <= 1000000, 'Os dados convertidos devem ter até 1 MB.');
  exigir(!csv.includes('\u0000'), 'O arquivo contém dados binários; use CSV, TSV, JSON ou XLSX.');
  let tabela;
  try { validarCsvProfissional(csv); tabela = lerCsv(csv); } catch (e) { throw new ErroProfissional(e.message); }
  exigir(tabela.length >= 2 && tabela.length <= 2001, 'Informe de 1 a 2.000 registros, além do cabeçalho.');
  const cabecalho = tabela[0].map(v => v.trim().toLowerCase());
  exigir(cabecalho.length <= 80 && cabecalho.every(v => v && v.length <= 128), 'Use até 80 colunas com nomes não vazios.');
  exigir(new Set(cabecalho).size === cabecalho.length, 'O cabeçalho contém nomes de coluna repetidos.');
  exigir(!cabecalho.some(v => ['__proto__', 'prototype', 'constructor'].includes(v)), 'O cabeçalho contém um nome reservado.');
  const faltantes = colunas.filter(c => !cabecalho.includes(c.chave.toLowerCase()));
  exigir(faltantes.length === 0, 'Colunas obrigatórias ausentes: ' + faltantes.map(c => c.chave).join(', '));
  return tabela.slice(1).map((linha, i) => {
    exigir(linha.length === cabecalho.length, `Linha ${i + 2}: quantidade de colunas diferente do cabeçalho.`);
    exigir(linha.every(v => v.length <= 32767), `Linha ${i + 2}: uma célula passa de 32.767 caracteres.`);
    const objeto = Object.create(null);
    // Mantém colunas extras para auditorias de esquema, com nomes de protótipo recusados.
    cabecalho.forEach((chave, k) => { objeto[chave] = linha[k].trim(); });
    for (const coluna of colunas) {
      const valor = objeto[coluna.chave.toLowerCase()];
      if (coluna.tipo === 'numero') {
        objeto[coluna.chave] = numeroFinito(valor, `Linha ${i + 2}, ${coluna.chave}`, coluna.minimo ?? -1e12, coluna.maximo ?? 1e12);
        if (coluna.inteiro) exigir(Number.isSafeInteger(objeto[coluna.chave]), `Linha ${i + 2}, ${coluna.chave}: informe um inteiro.`);
      } else {
        exigir(coluna.opcional || valor.length > 0, `Linha ${i + 2}: preencha ${coluna.chave}.`);
        objeto[coluna.chave] = valor;
      }
    }
    return objeto;
  });
}
export function media(valores) {
  exigir(Array.isArray(valores) && valores.length > 0 && valores.every(Number.isFinite), 'Não há amostra numérica válida.');
  return valores.reduce((s, n) => s + n, 0) / valores.length;
}
export function quantil(valores, p) {
  exigir(Array.isArray(valores) && valores.length > 0 && valores.every(Number.isFinite) && p >= 0 && p <= 1, 'Quantil exige amostra finita e probabilidade entre 0 e 1.');
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = (ordenados.length - 1) * p, inferior = Math.floor(indice);
  return ordenados[inferior] + (ordenados[Math.ceil(indice)] - ordenados[inferior]) * (indice - inferior);
}
export function arredondar(n, casas = 6) {
  if (n === null) return null;
  exigir(Number.isFinite(n), 'O cálculo ultrapassou o intervalo numérico; revise a escala dos dados.');
  return Number(n.toFixed(casas));
}
export function relatorio(spec, { indicadores, colunas, linhas, series = [], notas = [], metodo = spec.processa }) {
  const premissas = [...new Set([...notas, spec.limites].filter(Boolean))];
  const r = { titulo: spec.nome, indicadores, colunas, linhas, series, notas: premissas, metodo };
  validarRelatorio(r);
  return r;
}
export function validarRelatorio(r) {
  exigir(r && typeof r.titulo === 'string' && r.titulo.length > 0, 'Relatório sem título.');
  exigir(Array.isArray(r.colunas) && r.colunas.length > 0 && r.colunas.length <= 80 && r.colunas.every(v => typeof v === 'string'), 'Relatório com colunas inválidas.');
  exigir(Array.isArray(r.linhas) && r.linhas.length <= 10000 && r.linhas.every(l => Array.isArray(l) && l.length === r.colunas.length), 'Relatório com linhas inconsistentes.');
  exigir(Array.isArray(r.indicadores) && r.indicadores.length > 0 && r.indicadores.every(x => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string'), 'Relatório com indicadores inválidos.');
  exigir(Array.isArray(r.series) && r.series.length <= 10000 && r.series.every(x => x && typeof x.nome === 'string' && Number.isFinite(x.valor)), 'Relatório com gráfico inválido.');
  exigir(Array.isArray(r.notas) && r.notas.every(v => typeof v === 'string') && typeof r.metodo === 'string', 'Relatório sem método ou premissas.');
  const celula = v => v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
  exigir(r.linhas.every(l => l.every(celula)) && r.indicadores.every(x => celula(x[1])), 'O resultado contém valores não finitos ou células inválidas.');
  exigir(bytes(JSON.stringify(r)) <= 8000000, 'Relatório muito grande; divida o lote de entrada.');
  return r;
}

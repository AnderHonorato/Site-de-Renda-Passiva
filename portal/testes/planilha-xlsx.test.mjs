/** Planilha XLSX: células de texto e número soltos precisam sair com o valor (defeito achado pela ferramenta de NPS). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarPlanilhaXlsx } from '../scripts/comum/exportação/gerar-planilha-xlsx.js';
import { lerZip, extrairEntrada } from '../scripts/cálculos/zip.js';

const comoTexto = (bytes) => new TextDecoder('latin1').decode(bytes);

test('texto e número soltos viram células com o valor, e os objetos continuam valendo', () => {
  const xlsx = comoTexto(gerarPlanilhaXlsx({
    linhas: [['Nota', 'Respostas'], ['Promotores', 12], [{ texto: 'Total' }, { número: 30 }], [true, null, 'a & <b>']],
  }));
  for (const esperado of ['>Nota<', '>Respostas<', '>Promotores<', '<v>12</v>', '>Total<', '<v>30</v>', '>true<', 'a &amp; &lt;b&gt;']) {
    assert.ok(xlsx.includes(esperado), `faltou ${esperado}`);
  }
});

test('número solto não vira texto e valor não finito vira texto, não NaN no XML', () => {
  const xlsx = comoTexto(gerarPlanilhaXlsx({ linhas: [[1.5, Infinity, Number.NaN]] }));
  assert.ok(xlsx.includes('<v>1.5</v>'));
  assert.ok(!xlsx.includes('<v>Infinity</v>') && !xlsx.includes('<v>NaN</v>'));
});

test('XLSX aplica tema, legibilidade e filtro tabular sem mudar células ou valores', async () => {
  const bytes = gerarPlanilhaXlsx({
    nomeDaAba: 'Dados', casasDecimais: 3, largurasDasColunas: [18, 9, 500],
    linhas: [['Grupo', 'Métrica', 'Observação'], ['A', { número: 1.25, formato: 'decimal' }, 'texto literal =SOMA(A1:A2)'], ['B', { fórmula: '1+1', formato: 'decimal' }, 'linha 2']],
  });
  const zip = lerZip(bytes);
  const arquivo = async (nome) => new TextDecoder().decode(await extrairEntrada(bytes, zip.entradas.find((entrada) => entrada.nome === nome)));
  const planilha = await arquivo('xl/worksheets/sheet1.xml');
  const estilos = await arquivo('xl/styles.xml');

  assert.match(planilha, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  assert.match(planilha, /<autoFilter ref="A1:C3"\/>/);
  assert.match(planilha, /<col min="1" max="1" width="18" customWidth="1"\/>/);
  assert.match(planilha, /<col min="3" max="3" width="60" customWidth="1"\/>/);
  assert.match(planilha, /<row r="1" ht="35" customHeight="1">/);
  assert.match(planilha, /<c r="A1" s="5"/);
  assert.match(planilha, /<c r="A3" s="6"/);
  assert.match(planilha, /<c r="B2" s="4"><v>1\.25<\/v>/);
  assert.match(planilha, /<c r="B3" s="10"><f>1\+1<\/f><\/c>/);
  assert.match(planilha, /t="inlineStr"><is><t xml:space="preserve">texto literal =SOMA\(A1:A2\)<\/t>/);
  assert.match(estilos, /fgColor rgb="FFD97757"/);
  assert.match(estilos, /fgColor rgb="FFFFFDF9"/);
  assert.match(estilos, /fgColor rgb="FFF9F6F1"/);
  assert.match(estilos, /formatCode="#,##0\.000"/);
  assert.match(estilos, /wrapText="1"/);
  assert.match(estilos, /style="hair"/);
  assert.equal((planilha.match(/<row /g) || []).length, 3, 'não deve inserir linhas decorativas');
});

test('abas de metadados mantêm freeze, sem autofilter que sugira uma tabela', async () => {
  const bytes = gerarPlanilhaXlsx({ nomeDaAba: 'Método', temCabeçalho: true, linhas: [['Seção', 'Conteúdo'], ['Método', 'Cálculo documentado']] });
  const entrada = lerZip(bytes).entradas.find((item) => item.nome === 'xl/worksheets/sheet1.xml');
  const planilha = new TextDecoder().decode(await extrairEntrada(bytes, entrada));
  assert.match(planilha, /state="frozen"/);
  assert.doesNotMatch(planilha, /autoFilter/);
});

test('planilha sem cabeçalho não ganha estilo ou congelamento decorativo', async () => {
  const bytes = gerarPlanilhaXlsx({ nomeDaAba: 'Série', linhas: [[{ número: 1e-10, formato: 'decimal' }, '=texto literal'], [1, 2]] });
  const entrada = lerZip(bytes).entradas.find((item) => item.nome === 'xl/worksheets/sheet1.xml');
  const planilha = new TextDecoder().decode(await extrairEntrada(bytes, entrada));
  const estilosEntrada = lerZip(bytes).entradas.find((item) => item.nome === 'xl/styles.xml');
  const estilos = new TextDecoder().decode(await extrairEntrada(bytes, estilosEntrada));
  assert.doesNotMatch(planilha, /sheetViews|autoFilter|<c r="A1" s="5"/);
  assert.match(planilha, /<c r="A1" s="11"><v>1e-10<\/v>/);
  assert.match(estilos, /numFmtId="166" formatCode="0\.00E\+00"/);
});

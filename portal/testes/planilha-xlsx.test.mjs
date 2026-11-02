/** Planilha XLSX: células de texto e número soltos precisam sair com o valor (defeito achado pela ferramenta de NPS). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarPlanilhaXlsx } from '../scripts/comum/exportação/gerar-planilha-xlsx.js';

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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importarArquivo, arquivosDoRelatorio, LIMITES_ARQUIVOS } from '../scripts/comum/profissionais/arquivos.js';
import { gerarPlanilhaXlsx } from '../scripts/comum/exportação/gerar-planilha-xlsx.js';
import { compactarZip } from '../scripts/comum/exportação/compactar-zip.js';
import { lerCsv } from '../scripts/cálculos/tabular.js';
import { abrirComPdfjsParaTexto } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import { montarTextoDaPágina } from '../scripts/cálculos/extrair-texto-de-pdf.js';
import * as xlsx from '../recursos/bibliotecas/xlsx-0.20.3.mjs';

const enc = new TextEncoder(), dec = new TextDecoder();
const file = (name, conteudo) => { const bytes = typeof conteudo === 'string' ? enc.encode(conteudo) : conteudo instanceof ArrayBuffer ? new Uint8Array(conteudo) : conteudo; return { name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer }; };
const relatorio = (extra = {}) => ({ titulo: 'Análise de São João', indicadores: [['Soma', 32.5]], colunas: ['grupo', 'valor'], linhas: [['Ação', 12.5], ['São João', 20]], series: [{ nome: 'Ação', valor: 12.5 }], notas: ['Premissa explícita: valores informados.'], metodo: 'Soma aritmética dos valores.', ...extra });
const gerar = (r, rotulo) => arquivosDoRelatorio(r, 'analise-segura').find((a) => a.rótulo === rotulo).gerar();

for (const [ext, texto] of [['json', '{"bomFormat":"CycloneDX","components":[]}'], ['srt', '1\n00:00:01,000 --> 00:00:02,000\nOlá.'], ['vtt', 'WEBVTT\n\n00:01.000 --> 00:02.000\nOlá.']]) {
  test(`documento ${ext} preserva texto técnico para o motor, sem converter em tabela`, async () => {
    assert.equal((await importarArquivo(file(`documento.${ext}`, texto), { entrada: 'documento' })).conteudo, texto);
  });
}

test('upload CSV recusa aspas malformadas sem remover caracteres da entrada', async () => {
  for (const conteudo of ['nome;valor\nO "produto" A;1', 'nome;valor\n"produto"A;1', 'nome;valor\n"produto;1']) {
    await assert.rejects(importarArquivo(file('dados.csv', conteudo)), /CSV inválido/);
  }
  const r = await importarArquivo(file('dados.csv', 'nome;valor\n"O ""produto"" A";1'));
  assert.equal(lerCsv(r.conteudo)[1][0], 'O "produto" A');
});

for (const [ext, texto] of [['csv', 'grupo;valor\r\n"A;B";12,5'], ['tsv', 'grupo\tvalor\nAção\t12.5'], ['txt', 'grupo,valor\nAção,12.5']]) {
  test(`importa ${ext} real e preserva acentos/células delimitadas`, async () => {
    const r = await importarArquivo(file(`a.${ext}`, texto), { colunas: [{ chave: 'grupo' }, { chave: 'valor' }] });
    assert.equal(r.linhas, 1);
    assert.equal(lerCsv(r.conteudo, { separador: ';' })[1][0], ext === 'csv' ? 'A;B' : 'Ação');
  });
}
test('JSON aceita objetos, matriz com cabeçalho e o relatório exportado; rejeita células aninhadas', async () => {
  for (const valor of [[{ grupo: 'Á', valor: 2 }], [['grupo', 'valor'], ['Á', 2]], { colunas: ['grupo', 'valor'], linhas: [['Á', 2]] }]) {
    const r = await importarArquivo(file('a.json', JSON.stringify(valor)));
    assert.equal(r.conteudo, 'grupo;valor\r\nÁ;2');
  }
  await assert.rejects(importarArquivo(file('a.json', '[{"obj":{"a":1}}]')), /Cada célula/);
  await assert.rejects(importarArquivo(file('a.json', '[NaN]')), /JSON inválido/);
});
test('JSON exportado é relatório integral tipado e reimporta as mesmas linhas', async () => {
  const original = relatorio();
  const arquivo = await gerar(original, 'JSON');
  assert.equal(arquivo.nome, 'analise-segura.json');
  assert.deepEqual(JSON.parse(dec.decode(arquivo.bytes)), original);
  const volta = await importarArquivo(file(arquivo.nome, arquivo.bytes));
  assert.deepEqual(lerCsv(volta.conteudo, { separador: ';' }), [['grupo', 'valor'], ['Ação', '12.5'], ['São João', '20']]);
});
test('Excel mantém números tipados e strings de fórmula inertes; roundtrip usa valores', async () => {
  const original = relatorio({ linhas: [['=HYPERLINK("https://evil.invalid")', -12.5], ['00123', 20]] });
  const arquivo = await gerar(original, 'Excel');
  assert.deepEqual([...arquivo.bytes.slice(0, 4)], [80, 75, 3, 4]);
  const livro = xlsx.read(arquivo.bytes, { type: 'array', cellFormula: true });
  const aba = livro.Sheets[livro.SheetNames[0]];
  assert.equal(aba.B2.t, 'n'); assert.equal(aba.B2.v, -12.5);
  assert.equal(aba.A2.t, 's'); assert.equal(aba.A2.f, undefined);
  assert.equal(aba.A2.v, original.linhas[0][0]); assert.equal(aba.A3.v, '00123');
  const volta = await importarArquivo(file(arquivo.nome, arquivo.bytes));
  assert.match(volta.aviso, /primeira aba/);
  assert.deepEqual(lerCsv(volta.conteudo, { separador: ';' }).slice(1), original.linhas.map((l) => l.map(String)));
});
test('XLSX com várias abas avisa que somente a primeira foi importada', async () => {
  const livro = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(livro, xlsx.utils.aoa_to_sheet([['grupo', 'valor'], ['primeira', 1]]), 'Dados');
  xlsx.utils.book_append_sheet(livro, xlsx.utils.aoa_to_sheet([['grupo', 'valor'], ['segunda', 2]]), 'Outros');
  const r = await importarArquivo(file('a.xlsx', xlsx.write(livro, { type: 'array', bookType: 'xlsx' })));
  assert.match(r.aviso, /2 abas; as demais não foram importadas/);
  assert.match(r.conteudo, /primeira/); assert.doesNotMatch(r.conteudo, /segunda/);
});
test('XLSX não executa fórmula nem inventa resultado de fórmula sem cache', async () => {
  const bytes = gerarPlanilhaXlsx({ linhas: [['grupo', 'valor'], ['A', { fórmula: '1+1' }]] });
  await assert.rejects(importarArquivo(file('a.xlsx', bytes)), /fórmula sem resultado salvo/);
});
test('CSV faz roundtrip dos valores e protege fórmulas inclusive após espaços', async () => {
  const seguro = await gerar(relatorio(), 'CSV');
  const volta = await importarArquivo(file(seguro.nome, seguro.bytes));
  assert.equal(volta.conteudo, 'grupo;valor\r\nAção;12.5\r\nSão João;20');
  const ataques = ['=1+1', ' +SUM(1)', '@comando', '\t=1', '\n=2', '-cmd', '-12'];
  const csv = await gerar(relatorio({ linhas: ataques.map((v) => [v, -2]) }), 'CSV');
  const linhas = lerCsv(dec.decode(csv.bytes).replace(/^\uFEFF/, ''), { separador: ';' });
  ataques.forEach((v, i) => { assert.equal(linhas[i + 1][0], `'${v}`); assert.equal(linhas[i + 1][1], '-2'); });
});
test('TXT inclui método, premissas, indicadores e dados completos', async () => {
  const a = await gerar(relatorio(), 'TXT');
  const texto = dec.decode(a.bytes);
  for (const t of ['Análise de São João', 'Soma: 32.5', 'São João;20', 'Premissa explícita', 'Soma aritmética']) assert.ok(texto.includes(t));
});
const docx = (xml) => compactarZip([{ nome: '[Content_Types].xml', conteúdo: '<Types/>' }, { nome: 'word/document.xml', conteúdo: xml }]);
test('DOCX extrai texto real do corpo, parágrafos, entidades e tabelas; avisa limites', async () => {
  const bytes = docx('<?xml version="1.0"?><w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>Olá &amp; ação</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>A</w:t><w:tab/><w:t>B</w:t><w:br/><w:t>Fim</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
  const r = await importarArquivo(file('a.docx', bytes), { entrada: 'documento' });
  assert.match(r.conteudo, /Olá & ação\n\nA\tB\nFim/);
  assert.match(r.aviso, /cabeçalhos, rodapés e notas não são preservados/);
});
test('DOCX rejeita XML inseguro, truncado, corpo vazio e extensão falsa', async () => {
  for (const xml of ['<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a/>', '<w:document><w:body><w:t>cortado', '<w:document><w:body/></w:document>']) {
    await assert.rejects(importarArquivo(file('a.docx', docx(xml)), { entrada: 'documento' }));
  }
  await assert.rejects(importarArquivo(file('a.docx', 'não é Office'), { entrada: 'documento' }), /assinatura/);
});
test('rejeita arquivo vazio, formato incorreto, binário renomeado e limites antecipados', async () => {
  await assert.rejects(importarArquivo(file('a.csv', '')), /vazio/);
  await assert.rejects(importarArquivo(file('a.xls', 'qualquer')), /Formato não suportado/);
  await assert.rejects(importarArquivo(file('a.csv', '%PDF-1.4\n')), /PDF/);
  await assert.rejects(importarArquivo({ name: 'a.csv', size: LIMITES_ARQUIVOS.bytes + 1, arrayBuffer() { throw Error('Não deveria ler'); } }), /10 MB/);
  await assert.rejects(importarArquivo(file('a.csv', 'a;a\n1;2')), /sem repetição/);
  await assert.rejects(importarArquivo(file('a.csv', 'a;b\n1')), /linha 2/);
  await assert.rejects(importarArquivo(file('a.csv', 'a\n' + Array(2001).fill('1').join('\n'))), /2.000 linhas/);
  await assert.rejects(importarArquivo(file('a.txt', 'á'.repeat(530000)), { entrada: 'documento' }), /1 MB/);
});
test('cabeçalho divergente é aviso para revisão e nunca renomeação silenciosa', async () => {
  const r = await importarArquivo(file('a.csv', 'nome;valor\nA;2'), { colunas: [{ chave: 'grupo' }, { chave: 'valor' }] });
  assert.match(r.aviso, /espera grupo/); assert.match(r.conteudo, /^nome;/);
});
test('PDF integral é multipágina, repete cabeçalho e preserva painéis e acentos', async () => {
  const colunas = Array.from({ length: 11 }, (_, i) => `Coluna ${i + 1}`);
  const linhas = Array.from({ length: 75 }, (_, i) => colunas.map((_, c) => `L${i + 1}C${c + 1} ação`));
  const a = await gerar(relatorio({ colunas, linhas }), 'PDF');
  assert.equal(dec.decode(a.bytes.slice(0, 5)), '%PDF-');
  const d = await abrirComPdfjsParaTexto(a.bytes);
  try {
    assert.ok(d.páginas >= 7, `Total: ${d.páginas}`);
    const textos = [];
    for (let p = 1; p <= d.páginas; p++) {
      const pagina = await d.texto(p);
      textos.push(montarTextoDaPágina(pagina.itens));
      for (const item of pagina.itens) {
        assert.ok(item.oy >= 0 && item.oy < pagina.altura, `Texto fora da página ${p}`);
        assert.ok(item.ox >= 0 && item.ox + item.ux <= pagina.largura + 1, `Texto fora da largura ${p}: ${item.str}`);
      }
    }
    const tudo = textos.join('\n');
    for (const linha of linhas) for (const celula of linha) assert.ok(tudo.includes(celula), `Faltou ${celula}`);
    assert.ok(textos.filter((t) => t.includes('Coluna 1')).length >= 2);
    assert.match(tudo, /Premissa explícita/); assert.match(tudo, /Soma aritmética/); assert.match(tudo, /Página 1/);
    const volta = await importarArquivo(file('a.pdf', a.bytes), { entrada: 'documento' });
    assert.match(volta.conteudo, /L75C11 ação/); assert.match(volta.aviso, /não há OCR/);
  } finally { await d.fechar(); }
});
test('PDF continua célula maior que página, conserva final e códigos Unicode', async () => {
  const longo = 'IdentificadorLongo'.repeat(450) + ' FINAL_DA_CELULA Ω';
  const a = await gerar(relatorio({ colunas: ['Texto'], linhas: [[longo]] }), 'PDF');
  const d = await abrirComPdfjsParaTexto(a.bytes);
  try {
    const textos = [];
    for (let p = 1; p <= d.páginas; p++) textos.push(montarTextoDaPágina((await d.texto(p)).itens));
    const tudo = textos.join('\n');
    assert.match(tudo, /FINAL_DA_CELULA/); assert.match(tudo, /\[U\+03A9\]/);
    assert.ok(d.páginas >= 3);
  } finally { await d.fechar(); }
});
test('PDF sem texto e assinatura falsa explicam limites de OCR/leitura', async () => {
  await assert.rejects(importarArquivo(file('a.pdf', 'texto renomeado'), { entrada: 'documento' }), /assinatura/);
  const { criarDocumentoPdf } = await import('../scripts/comum/pdf/criar-documento-pdf.js');
  const bytes = criarDocumentoPdf().gerarBytes();
  await assert.rejects(importarArquivo(file('a.pdf', bytes), { entrada: 'documento' }), /OCR/);
});
test('exportações rejeitam linhas incompletas e números não finitos', () => {
  assert.throws(() => arquivosDoRelatorio(relatorio({ linhas: [['A']] })), /incompleta/);
  assert.throws(() => arquivosDoRelatorio(relatorio({ linhas: [['A', Infinity]] })), /inválida/);
});

test('XLSX compactado usa resultados salvos de fórmula e avisa que podem estar desatualizados', async () => {
  const livro = xlsx.utils.book_new();
  const aba = xlsx.utils.aoa_to_sheet([['grupo', 'valor'], ['A', 42]]);
  aba.B2.f = '1+1';
  xlsx.utils.book_append_sheet(livro, aba, 'Dados');
  const r = await importarArquivo(file('a.xlsx', xlsx.write(livro, { type: 'array', bookType: 'xlsx', compression: true })));
  assert.match(r.conteudo, /A;42/); assert.match(r.aviso, /podem estar desatualizados/);
});
test('pacote Office rejeita CRC alterado, macros, entradas repetidas e tamanho expandido excessivo', async () => {
  const entradas = [{ nome: '[Content_Types].xml', conteúdo: '<Types/>' }, { nome: 'word/document.xml', conteúdo: '<w:document><w:body><w:p><w:t>Dados</w:t></w:p></w:body></w:document>' }];
  const macro = compactarZip([...entradas, { nome: 'word/vbaProject.bin', conteúdo: 'macro' }]);
  await assert.rejects(importarArquivo(file('a.docx', macro), { entrada: 'documento' }), /macros/);
  const repetido = compactarZip([...entradas, entradas[1]]);
  await assert.rejects(importarArquivo(file('a.docx', repetido), { entrada: 'documento' }), /repetidos/);
  const normal = compactarZip(entradas), corrompido = normal.slice();
  corrompido[50] ^= 1;
  await assert.rejects(importarArquivo(file('a.docx', corrompido), { entrada: 'documento' }), /CRC|corrompido/);
  const enorme = normal.slice();
  const visao = new DataView(enorme.buffer);
  for (let p = 0; p < enorme.length - 46; p++) {
    if (visao.getUint32(p, true) === 0x02014b50) { visao.setUint32(p + 24, 31 * 1024 * 1024, true); break; }
  }
  await assert.rejects(importarArquivo(file('a.docx', enorme), { entrada: 'documento' }), /30 MB/);
});
test('PDF acima de 100 páginas é rejeitado antes de extrair texto', async () => {
  const { criarDocumentoPdf } = await import('../scripts/comum/pdf/criar-documento-pdf.js');
  const pdf = criarDocumentoPdf();
  for (let p = 0; p < 101; p++) pdf.novaPágina().texto(10, 10, 'Texto');
  await assert.rejects(importarArquivo(file('a.pdf', pdf.gerarBytes()), { entrada: 'documento' }), /100 páginas/);
});
test('SVG exporta todas séries, inclusive negativas, escapa XML e não inclui scripts', async () => {
  const series = Array.from({ length: 25 }, (_, i) => ({ nome: `Série ${i} ação <script>alert(1)</script>`, valor: i - 12 }));
  const arquivo = await gerar(relatorio({ series }), 'SVG');
  const svg = dec.decode(arquivo.bytes);
  assert.match(svg, /^<svg/); assert.match(svg, /Série 24/); assert.match(svg, /&lt;script&gt;/); assert.doesNotMatch(svg, /<script>/);
  assert.equal((svg.match(/<rect /g) || []).length, 26);
  assert.ok(!arquivosDoRelatorio(relatorio({ series: [] })).some((a) => a.rótulo === 'SVG'));
});

test('Excel recusa texto acima de 32.767 caracteres sem truncar; JSON/TXT preservam íntegra', async () => {
  const longo = 'ação'.repeat(9000);
  const r = relatorio({ linhas: [[longo, 2]] });
  await assert.rejects(gerar(r, 'Excel'), /32.767 caracteres.*JSON, TXT ou PDF/);
  assert.equal(JSON.parse(dec.decode((await gerar(r, 'JSON')).bytes)).linhas[0][0], longo);
  assert.ok(dec.decode((await gerar(r, 'TXT')).bytes).includes(longo));
  const limite = 'a'.repeat(32767);
  const x = await gerar(relatorio({ linhas: [[limite, 2]] }), 'Excel');
  const livro = xlsx.read(x.bytes, { type: 'array' });
  assert.equal(livro.Sheets[livro.SheetNames[0]].A2.v, limite);
});

test('importador alinha cabeçalhos e 80 colunas às regras do servidor', async () => {
  await assert.rejects(importarArquivo(file('a.csv', 'Grupo;grupo\nA;B')), /sem repetição/);
  await assert.rejects(importarArquivo(file('a.csv', 'constructor\nA')), /reservado/);
  const colunas = Array.from({ length: 81 }, (_, i) => `c${i}`);
  await assert.rejects(importarArquivo(file('a.csv', colunas.join(';') + '\n' + colunas.join(';'))), /80 colunas/);
});

test('Excel preserva literais OOXML, escape aninhado, acentos e quebras reais sem interpretá-los', async () => {
  const literais = ['_x0041_', '_x000D_', '_x005F_', '_x005F_x0041_', 'Ação _x00e9_ e _xABcd_', 'Uma\rOutra\nFim\tTab'];
  const r = relatorio({ colunas: ['_x0041_', 'valor'], linhas: literais.map((v) => [v, 2]) });
  const a = await gerar(r, 'Excel');
  const livro = xlsx.read(a.bytes, { type: 'array' });
  const aba = livro.Sheets[livro.SheetNames[0]];
  assert.equal(aba.A1.v, '_x0041_');
  literais.forEach((v, i) => assert.equal(aba[`A${i + 2}`].v, v));
  const volta = await importarArquivo(file('literais.xlsx', a.bytes));
  assert.deepEqual(lerCsv(volta.conteudo, { separador: ';' }).slice(1).map((l) => l[0]), literais);
});
test('Excel rejeita controles XML incompatíveis sem removê-los e JSON/TXT preservam original', async () => {
  for (const controle of ['\u000b', '\u0000', '\ufffe', '\ud800']) {
    const original = `Uma${controle}Outra`;
    const r = relatorio({ linhas: [[original, 2]] });
    await assert.rejects(gerar(r, 'Excel'), /caracteres incompatíveis.*JSON ou TXT/);
    assert.equal(JSON.parse(dec.decode((await gerar(r, 'JSON')).bytes)).linhas[0][0], original);
    if (controle !== '\ud800') assert.ok(dec.decode((await gerar(r, 'TXT')).bytes).includes(original));
  }
});
test('DOCX mantém parágrafos distintos para o motor de cláusulas e quebra interna simples', async () => {
  const clausula = 'O fornecedor deve guardar os registros por noventa dias após o encerramento.';
  const bytes = docx(`<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>${clausula}</w:t></w:r></w:p><w:p><w:r><w:t>${clausula}</w:t></w:r></w:p></w:body></w:document>`);
  const importado = await importarArquivo(file('clausulas.docx', bytes), { entrada: 'documento' });
  assert.equal(importado.conteudo, `${clausula}\n\n${clausula}`);
  const { executar } = await import('../servidor/profissionais/documentos.mjs');
  const resultado = executar('clausulas-quase-duplicadas', { texto: importado.conteudo, opcoes: { limiar: 50 } });
  assert.equal(resultado.indicadores.find(([nome]) => nome === 'Pares semelhantes')[1], 1);
  assert.equal(resultado.linhas[0][2], 1);
  const quebra = docx('<w:document><w:body><w:p><w:r><w:t>Linha um</w:t><w:br/><w:t>Linha dois</w:t></w:r></w:p></w:body></w:document>');
  assert.equal((await importarArquivo(file('quebra.docx', quebra), { entrada: 'documento' })).conteudo, 'Linha um\nLinha dois');
});
test('importa 2.000 registros com 80 colunas incluindo 160.080 células de cabeçalho e dados', async () => {
  const cabecalho = Array.from({ length: 80 }, (_, i) => `c${i}`).join(';');
  const linha = Array(80).fill('1').join(';');
  const csv = cabecalho + '\n' + Array(2000).fill(linha).join('\n');
  const r = await importarArquivo(file('limite.csv', csv));
  assert.equal(r.linhas, 2000);
  assert.equal(lerCsv(r.conteudo, { separador: ';' })[2000].length, 80);
});

test('Excel inclui Dados, Indicadores e Método completos com autoria Ander Flow e tipos preservados', async () => {
  const r = relatorio({ indicadores: [['Total', 32.5], ['Aviso _x0041_', '=HYPERLINK("url")'], ['Vazio', null]], notas: ['Primeira premissa.', 'Segunda _x000D_ premissa.'] });
  const a = await gerar(r, 'Excel');
  const livro = xlsx.read(a.bytes, { type: 'array' });
  assert.deepEqual(livro.SheetNames, ['Dados', 'Indicadores', 'Método']);
  assert.equal(livro.Props.Author, 'Ander Flow');
  const completo = xlsx.read(a.bytes, { type: 'array', cellFormula: true });
  assert.deepEqual(xlsx.utils.sheet_to_json(completo.Sheets.Dados, { header: 1, defval: null }), [r.colunas, ...r.linhas]);
  assert.deepEqual(xlsx.utils.sheet_to_json(completo.Sheets.Indicadores, { header: 1, defval: null }), [['Indicador', 'Valor'], ['Total', 32.5], ['Aviso _x0041_', '=HYPERLINK("url")'], ['Vazio', '']]);
  assert.equal(completo.Sheets.Indicadores.B2.t, 'n');
  assert.equal(completo.Sheets.Indicadores.B3.f, undefined);
  const linhas = xlsx.utils.sheet_to_json(completo.Sheets['Método'], { header: 1 });
  assert.deepEqual(linhas.slice(1), [['Relatório', 1, 1, r.titulo], ['Método', 1, 1, r.metodo], ['Premissa', 1, 1, r.notas[0]], ['Premissa', 2, 1, r.notas[1]]]);
  const volta = await importarArquivo(file('relatorio.xlsx', a.bytes));
  assert.match(volta.aviso, /3 abas; as demais não foram importadas/);
  assert.equal(volta.linhas, r.linhas.length);
});
test('Excel reparte método e premissas longos em partes numeradas sem perda nem surrogate cortado', async () => {
  const longo = 'Premissa ação 🧵 _x0041_ '.repeat(2200);
  const r = relatorio({ metodo: longo, notas: [longo, 'Nota final.'] });
  const a = await gerar(r, 'Excel');
  const livro = xlsx.read(a.bytes, { type: 'array' });
  const linhas = xlsx.utils.sheet_to_json(livro.Sheets['Método'], { header: 1 }).slice(1);
  const reconstruir = (secao, item) => linhas.filter((l) => l[0] === secao && l[1] === item).sort((a, b) => a[2] - b[2]).map((l) => l[3]).join('');
  assert.equal(reconstruir('Método', 1), longo);
  assert.equal(reconstruir('Premissa', 1), longo);
  assert.equal(reconstruir('Premissa', 2), 'Nota final.');
  assert.ok(linhas.every((l) => l[3].length <= 32767));
});
test('PDF identifica Ander Flow como autoria e no rodapé sem alterar branding global', async () => {
  const a = await gerar(relatorio(), 'PDF');
  const { biblioteca } = await import('./auxiliares/pdf-de-teste.mjs');
  const documento = await biblioteca.PDFDocument.load(a.bytes);
  assert.equal(documento.getAuthor(), 'Ander Flow');
  const pdf = await abrirComPdfjsParaTexto(a.bytes);
  try { assert.match(montarTextoDaPágina((await pdf.texto(1)).itens), /Ander Flow/); }
  finally { await pdf.fechar(); }
});

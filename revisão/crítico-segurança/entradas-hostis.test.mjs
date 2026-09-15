// Entradas hostis e exportações: números extremos, JSON malicioso, importação adulterada,
// link de orçamento adulterado/gigante/"bomba", escape em SVG, PDF, XLSX e CSV.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { criarLocalStorageFalso, importar } from './_util.mjs';

const { interpretarNúmeroBrasileiro } = await importar(1, 'scripts/comum/validação/interpretar-número-brasileiro.js');
const { validarQuantidade } = await importar(1, 'scripts/comum/validação/validar-quantidade.js');
const { arredondarParaCentavos } = await importar(1, 'scripts/comum/matemática/arredondar-para-centavos.js');
const { analisarJsonSeguro } = await importar(1, 'scripts/comum/armazenamento/analisar-json-seguro.js');
const { criarArmazenamento } = await importar(1, 'scripts/comum/armazenamento/criar-armazenamento.js');
const { importarCópiaLocal } = await importar(1, 'scripts/comum/armazenamento/importar-cópia-local.js');
const { coleçõesLocais } = await importar(1, 'scripts/definições-do-produto.js');
const { codificarOrçamentoParaLink } = await importar(1, 'scripts/comum/orçamento/codificar-orçamento-para-link.js');
const { decodificarOrçamentoDoLink } = await importar(1, 'scripts/comum/orçamento/decodificar-orçamento-do-link.js');
const { montarOrçamento } = await importar(1, 'scripts/comum/orçamento/montar-orçamento.js');
const { calcularTotaisDoOrçamento } = await importar(1, 'scripts/comum/orçamento/calcular-totais-do-orçamento.js');
const { formatarCentavos } = await importar(1, 'scripts/comum/formatação/formatar-centavos.js');
const { escaparXml } = await importar(1, 'scripts/comum/validação/escapar-xml.js');
const { escaparCsv } = await importar(1, 'scripts/comum/validação/escapar-csv.js');
const { validarUrlExterna } = await importar(1, 'scripts/comum/validação/validar-url-externa.js');
const { criarDocumentoPdf } = await importar(1, 'scripts/comum/pdf/criar-documento-pdf.js');
const { gerarPdfDoOrçamento } = await importar(1, 'scripts/comum/orçamento/gerar-pdf-do-orçamento.js');
const { gerarPlanilhaXlsx } = await importar(1, 'scripts/comum/exportação/gerar-planilha-xlsx.js');
const { montarPlanilhaDoOrçamento } = await importar(1, 'scripts/comum/orçamento/montar-planilha-do-orçamento.js');
const { gerarSvgDeMolde } = await importar(6, 'scripts/geração/gerar-svg-de-molde.js');
const { calcularCaixaRetangular } = await importar(6, 'scripts/cálculos/calcular-caixa-retangular.js');
const { validarConfiguração } = await importar(1, 'scripts/comum/configuração/validar-configuração.js');
const { podeCarregarAnúncios } = await importar(1, 'scripts/comum/publicidade/pode-carregar-anúncios.js');
const { lerConsentimento } = await importar(1, 'scripts/comum/privacidade/ler-consentimento.js');
const { salvarConsentimento } = await importar(1, 'scripts/comum/privacidade/salvar-consentimento.js');

const HOSTIL = '<img src=x onerror="alert(1)"><script>alert(2)</script> ) Tj ET BT /F1 99 Tf (\\ "&\' =HYPERLINK("http://x")';

// ───────────── números
test('números: vazio, expoente, Infinity, NaN, hexadecimal, dígitos não ASCII e excesso de casas são recusados', () => {
  for (const texto of ['', '   ', '1e3', '1E3', '2e-5', 'Infinity', '-Infinity', 'NaN', '0x10', '1,2,3', '1.23.4', '١٢', '１２', '+1', '--1', '1 000', '9999999999999999', '0,1234567', 'R$', null, undefined]) {
    assert.equal(interpretarNúmeroBrasileiro(texto).válido, false, `aceitou ${JSON.stringify(texto)}`);
  }
  assert.equal(interpretarNúmeroBrasileiro('1.234,56').valor, 1234.56);
  assert.equal(interpretarNúmeroBrasileiro('2.5').valor, 2.5);
  assert.equal(interpretarNúmeroBrasileiro('1.500').valor, 1500); // convenção brasileira: ponto de milhar
  assert.equal(interpretarNúmeroBrasileiro('-3').válido, false);
  assert.equal(interpretarNúmeroBrasileiro('-3', { permitirNegativo: true }).valor, -3);
  assert.equal(validarQuantidade('0', { permitirZero: false }).válido, false);
  assert.equal(validarQuantidade('1,5', { inteiro: true }).válido, false);
  assert.equal(validarQuantidade('2000000000').válido, false); // máximo padrão 1e9
});

test('ACHADO S-03: arredondarParaCentavos desloca o resultado em valores ≥ R$ 5 milhões', () => {
  assert.equal(arredondarParaCentavos(1.005), 101);
  assert.equal(arredondarParaCentavos(2.29, 'acima'), 229);
  assert.equal(arredondarParaCentavos(1_000_000), 100_000_000); // ainda correto
  assert.equal(arredondarParaCentavos(5_000_000), 500_000_001); // +1 centavo em valor exato
  assert.equal(arredondarParaCentavos(100_000_000), 10_000_000_010); // +10 centavos
  assert.equal(arredondarParaCentavos(5_000_000.001, 'acima'), 500_000_000); // "acima" arredonda para baixo
  // Pelo caminho real do orçamento: 1 item de R$ 100.000.000,00 (limite do formulário) totaliza R$ 100.000.000,10.
  const { orçamento } = montarOrçamento({ emissor: { nome: 'Obra' }, itens: [{ descrição: 'Empreitada', quantidade: 1, unidade: 'un', preçoUnitárioEmCentavos: 10_000_000_000 }] });
  assert.equal(calcularTotaisDoOrçamento(orçamento).totalEmCentavos, 10_000_000_010);
});

test('ACHADO S-11: totais do orçamento acima de 2^53 centavos aparecem como "—"', () => {
  const { orçamento } = montarOrçamento({ emissor: { nome: 'X' }, itens: [{ descrição: 'y', quantidade: 1_000_000, preçoUnitárioEmCentavos: 10_000_000_000 }] });
  const totais = calcularTotaisDoOrçamento(orçamento);
  assert.equal(Number.isSafeInteger(totais.totalEmCentavos), false);
  assert.equal(formatarCentavos(totais.totalEmCentavos), '—');
});

// ───────────── JSON seguro e importação
test('JSON seguro: __proto__/constructor/prototype removidos, sem poluição; tamanho e profundidade limitados; aninhamento extremo não lança', () => {
  const r = analisarJsonSeguro('{"a":1,"__proto__":{"poluído":true},"constructor":{"prototype":{"x":1}},"b":{"__proto__":{"y":2}}}');
  assert.equal(r.válido, true);
  assert.equal({}.poluído, undefined);
  assert.equal(Object.hasOwn(r.dados, '__proto__'), false);
  assert.equal(Object.hasOwn(r.dados, 'constructor'), false);
  assert.equal(analisarJsonSeguro('x'.repeat(1_000_001)).válido, false);
  assert.equal(analisarJsonSeguro(`${'['.repeat(13)}${']'.repeat(13)}`).válido, false);
  assert.equal(analisarJsonSeguro(`${'['.repeat(12)}${']'.repeat(12)}`).válido, true);
  const profundo = `${'['.repeat(900_000)}${']'.repeat(900_000)}`; // 1,8 MB, abaixo do limite de 2 MB da importação
  let resultado;
  assert.doesNotThrow(() => { resultado = analisarJsonSeguro(profundo, { tamanhoMáximo: 2_000_000 }); });
  assert.equal(resultado.válido, false);
});

const receitaVálida = (extra = {}) => ({
  id: 'r1',
  nome: '<img src=x onerror=alert(1)> Brigadeiro',
  ingredientes: [{ nome: 'Leite condensado', preçoComprado: 7.5, quantidadeComprada: 395, unidadeComprada: 'g', quantidadeUsada: 395, unidadeUsada: 'g' }],
  rendimentoAproveitável: 25,
  embalagemDeVendaPorUnidade: 0.1,
  tempoDePreparoEmMinutos: 30,
  valorDaHora: 20,
  custosAdicionais: 2,
  ...extra,
});

test('importação: esquema, versão, coleções conhecidas, registros adulterados e chaves protegidas', () => {
  const base = criarLocalStorageFalso();
  const armazenamento = criarArmazenamento({ prefixo: 'doce-ofício', armazenamento: base });
  const cópia = (coleções, extra = {}) => JSON.stringify({ esquema: 'doce-ofício.cópia-local', versão: 1, exportadoEm: '2026-09-15T00:00:00Z', coleções, ...extra });

  assert.equal(importarCópiaLocal(cópia({ receitas: [receitaVálida()] }).replace('doce-ofício.cópia-local', 'folha-pronta.cópia-local'), { coleçõesLocais, armazenamento }).válido, false);
  assert.equal(importarCópiaLocal(cópia({ receitas: [receitaVálida()] }, { versão: 2 }), { coleçõesLocais, armazenamento }).válido, false);
  assert.equal(importarCópiaLocal('[]', { coleçõesLocais, armazenamento }).válido, false);

  const texto = cópia({
    receitas: [
      receitaVálida(),
      JSON.parse(JSON.stringify(receitaVálida({ id: 'r2' }))),
      receitaVálida({ id: 'r3', rendimentoAproveitável: -1 }),
      receitaVálida({ id: 'x'.repeat(101) }),
      receitaVálida({ id: 'r4', ingredientes: [{ nome: 'x', preçoComprado: 'NaN' }] }),
      'texto solto',
    ],
    consentimento: [{ id: 'c', publicidade: true }],
    configuração: [{ id: 'p', chavePix: 'golpe@exemplo.com' }],
  }).replace('"id":"r2"', '"id":"r2","__proto__":{"poluído":true}');
  const r = importarCópiaLocal(texto, { coleçõesLocais, armazenamento });
  assert.equal(r.válido, true);
  assert.equal(r.importados, 2);
  assert.equal(r.rejeitados, 6); // 4 receitas inválidas + 2 coleções desconhecidas
  assert.equal({}.poluído, undefined);
  assert.deepEqual([...base.mapa.keys()], ['doce-ofício:coleção:receitas']);
  const gravado = JSON.parse(base.mapa.get('doce-ofício:coleção:receitas'));
  assert.equal(gravado[0].nome, receitaVálida().nome); // texto guardado literalmente; renderização é por textContent

  const muitos = cópia({ receitas: Array.from({ length: 700 }, (_, i) => receitaVálida({ id: `m${i}` })) });
  const r2 = importarCópiaLocal(muitos, { coleçõesLocais, armazenamento, modo: 'substituir' });
  assert.equal(r2.importados, 500);
  assert.equal(JSON.parse(base.mapa.get('doce-ofício:coleção:receitas')).length, 500);
});

// ───────────── link de orçamento
const orçamentoBase = {
  emissor: { nome: HOSTIL.slice(0, 80), contato: 'javascript:alert(1)' },
  cliente: { nome: '‮gnp.exe' },
  título: HOSTIL.slice(0, 120),
  itens: [{ descrição: HOSTIL.slice(0, 120), quantidade: 2, unidade: '<b>un</b>', preçoUnitárioEmCentavos: 229 }],
  observações: HOSTIL,
};

test('link de orçamento: ida e volta preserva texto hostil como texto; adulteração, excesso e esquema errado recusados', async () => {
  const { orçamento } = montarOrçamento(orçamentoBase);
  const código = await codificarOrçamentoParaLink(orçamento);
  const lido = await decodificarOrçamentoDoLink(código);
  assert.equal(lido.válido, true);
  assert.equal(lido.orçamento.itens[0].descrição, HOSTIL.slice(0, 120));
  assert.equal(lido.orçamento.cliente.nome, '‮gnp.exe'); // caractere de inversão bidirecional é mantido (ver S-08)

  const adulterado = `${código.slice(0, 20)}${código[20] === 'A' ? 'B' : 'A'}${código.slice(21)}`;
  assert.equal((await decodificarOrçamentoDoLink(adulterado)).válido, false);
  assert.equal((await decodificarOrçamentoDoLink(`v1.${'A'.repeat(12_000)}`)).válido, false);
  assert.equal((await decodificarOrçamentoDoLink('v2.abc')).válido, false);
  assert.equal((await decodificarOrçamentoDoLink('v1.<script>')).válido, false);

  const json = (dados) => `v1j.${Buffer.from(JSON.stringify(dados)).toString('base64url')}`;
  for (const ruim of [
    { ...orçamento, itens: [{ descrição: 'a', quantidade: -1, preçoUnitárioEmCentavos: 1 }] },
    { ...orçamento, itens: [{ descrição: 'a', quantidade: 1, preçoUnitárioEmCentavos: 1.5 }] },
    { ...orçamento, itens: [{ descrição: 'a', quantidade: 1, preçoUnitárioEmCentavos: -100 }] },
    { ...orçamento, itens: Array.from({ length: 51 }, () => ({ descrição: 'a', quantidade: 1, preçoUnitárioEmCentavos: 1 })) },
    { ...orçamento, descontoEmCentavos: -5 },
    { ...orçamento, versão: 2 },
  ]) {
    assert.equal((await decodificarOrçamentoDoLink(json(ruim))).válido, false);
  }
  const poluído = await decodificarOrçamentoDoLink(`v1j.${Buffer.from(JSON.stringify(orçamento).replace('{', '{"__proto__":{"poluído":true},')).toString('base64url')}`);
  assert.equal(poluído.válido, true);
  assert.equal({}.poluído, undefined);
});

test('link de orçamento: "bomba" de compressão (8 MB de zeros em ~8 KB) é recusada rapidamente', async () => {
  const bomba = zlib.deflateRawSync(Buffer.alloc(8_000_000, 0x20), { level: 9 });
  const código = `v1.${bomba.toString('base64url')}`;
  assert.ok(código.length <= 12_000, `código de ${código.length} caracteres`);
  const início = performance.now();
  const r = await decodificarOrçamentoDoLink(código);
  assert.equal(r.válido, false);
  assert.ok(performance.now() - início < 2000);
});

// ───────────── exportações
test('ACHADO S-05: SVG do molde corta o texto DEPOIS de escapar e pode quebrar uma entidade XML', () => {
  const caixa = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 0.3, tamanhoDaAbaMm: 15 });
  const seguro = gerarSvgDeMolde({ ...caixa, textoOpcional: HOSTIL });
  assert.equal(/<script|<img|onerror="/.test(seguro), false);
  const texto = `${'a'.repeat(198)}&b`; // 200 caracteres: aceito pelo formulário e pelo validador salvo
  const svg = gerarSvgDeMolde({ ...caixa, textoOpcional: texto });
  const conteúdo = /<text[^>]*>([\s\S]*?)<\/text>/.exec(svg)[1];
  assert.equal(conteúdo.endsWith('&am'), true); // "&amp;b" cortado em "&am" → XML malformado
  assert.ok(/&(?!(amp|lt|gt|quot|apos);)/.test(conteúdo));
});

test('XML: controles removidos e caracteres especiais escapados', () => {
  assert.equal(escaparXml('a bcd￾e<>&"\''), 'abcde&lt;&gt;&amp;&quot;&apos;');
  assert.equal(escaparXml('tab\tlinha\n'), 'tab\tlinha\n');
});

test('CSV: fórmulas neutralizadas (função existe, mas nenhum produto exporta CSV)', () => {
  assert.equal(escaparCsv('=1+1'), `"'=1+1"`);
  assert.equal(escaparCsv('@SUM(A1)'), `"'@SUM(A1)"`);
  assert.equal(escaparCsv('\t=1'), `"'\t=1"`);
  assert.equal(escaparCsv('a;b'), '"a;b"');
  assert.equal(escaparCsv(' =1'), ' =1'); // espaço inicial não é neutralizado (observação)
});

function lerStringsPdf(texto) {
  // Tokenizador mínimo de strings literais PDF: respeita escapes e parênteses aninhados.
  const strings = [];
  for (let i = 0; i < texto.length; i += 1) {
    if (texto[i] !== '(') continue;
    let nível = 1;
    let j = i + 1;
    let valor = '';
    while (j < texto.length && nível > 0) {
      const c = texto[j];
      if (c === '\\') { valor += texto.slice(j, j + 2); j += 2; continue; }
      if (c === '(') nível += 1;
      if (c === ')') nível -= 1;
      if (nível > 0) valor += c;
      j += 1;
    }
    strings.push({ início: i, fim: j, valor });
    i = j - 1;
  }
  return strings;
}

function verificarEstruturaPdf(bytes) {
  const texto = Buffer.from(bytes).toString('latin1');
  assert.ok(texto.startsWith('%PDF-1.4'));
  const startxref = Number(/startxref\n(\d+)/.exec(texto)[1]);
  assert.equal(texto.slice(startxref, startxref + 4), 'xref');
  const linhas = texto.slice(startxref).split('\n');
  const total = Number(linhas[1].split(' ')[1]);
  for (let n = 1; n < total; n += 1) {
    const deslocamento = Number(linhas[2 + n].slice(0, 10));
    assert.equal(texto.slice(deslocamento, deslocamento + `${n} 0 obj`.length), `${n} 0 obj`, `xref do objeto ${n}`);
  }
  for (const m of texto.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const início = m.index + m[0].length;
    const fim = texto.indexOf('\nendstream', início);
    assert.equal(fim - início, Number(m[1]), 'Length do fluxo');
  }
  return texto;
}

test('PDF: texto hostil fica dentro de strings escapadas; estrutura (xref, Length) íntegra', () => {
  const doc = criarDocumentoPdf({ título: HOSTIL, autor: HOSTIL });
  doc.texto(10, 10, HOSTIL);
  doc.texto(10, 20, 'linha1\nlinha2\r) Tj');
  const texto = verificarEstruturaPdf(doc.gerarBytes());
  assert.equal(texto.includes('/F1 99 Tf'), false); // a operação injetada nunca aparece fora de string
  const fluxo = texto.slice(texto.indexOf('stream\n') + 7, texto.indexOf('\nendstream'));
  const semStrings = lerStringsPdf(fluxo).reduceRight((acc, s) => acc.slice(0, s.início) + acc.slice(s.fim), fluxo);
  assert.equal((semStrings.match(/Tj/g) ?? []).length, 2);
  const pdfOrçamento = gerarPdfDoOrçamento(montarOrçamento(orçamentoBase).orçamento, { marca: HOSTIL.slice(0, 30) });
  verificarEstruturaPdf(pdfOrçamento);
});

function lerZipArmazenado(bytes) {
  const b = Buffer.from(bytes);
  const arquivos = {};
  let p = 0;
  while (b.readUInt32LE(p) === 0x04034b50) {
    const método = b.readUInt16LE(p + 8);
    const crc = b.readUInt32LE(p + 14);
    const tamanho = b.readUInt32LE(p + 18);
    const nomeTam = b.readUInt16LE(p + 26);
    const extraTam = b.readUInt16LE(p + 28);
    const nome = b.slice(p + 30, p + 30 + nomeTam).toString('utf8');
    const dados = b.slice(p + 30 + nomeTam + extraTam, p + 30 + nomeTam + extraTam + tamanho);
    assert.equal(método, 0);
    assert.equal(zlib.crc32(dados) >>> 0, crc >>> 0, `CRC de ${nome}`);
    arquivos[nome] = dados.toString('utf8');
    p += 30 + nomeTam + extraTam + tamanho;
  }
  assert.equal(b.readUInt32LE(b.length - 22), 0x06054b50);
  assert.equal(b.readUInt16LE(b.length - 22 + 10), Object.keys(arquivos).length);
  return arquivos;
}

test('XLSX: texto hostil vira string em linha escapada; nenhuma fórmula; ZIP e CRC válidos', () => {
  const orçamento = montarOrçamento(orçamentoBase).orçamento;
  const { linhas, largurasDasColunas } = montarPlanilhaDoOrçamento(orçamento, { marca: HOSTIL });
  for (const linha of linhas) for (const célula of linha) if (célula) assert.equal('fórmula' in célula, false);
  const bytes = gerarPlanilhaXlsx({ nomeDaAba: 'Orç<a>[1]:*?/\\', linhas, largurasDasColunas, título: HOSTIL, autor: HOSTIL });
  const arquivos = lerZipArmazenado(bytes);
  const folha = arquivos['xl/worksheets/sheet1.xml'];
  assert.equal(/<f>/.test(folha), false);
  assert.equal(/<script|<img/.test(folha + arquivos['docProps/core.xml'] + arquivos['xl/workbook.xml']), false);
  assert.ok(folha.includes('=HYPERLINK(&quot;http://x&quot;)'));
  assert.ok(/<sheet name="Orç&lt;a&gt; 1    "/.test(arquivos['xl/workbook.xml']));
});

// ───────────── configuração, URLs, consentimento e publicidade
test('URLs externas: só https e mailto, sem credenciais', () => {
  for (const ruim of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>', 'http://exemplo.com', 'https://u:s@exemplo.com', 'vbscript:x', '//exemplo.com', 'mailto:<script>@x.com']) {
    assert.equal(validarUrlExterna(ruim), null, ruim);
  }
  assert.equal(validarUrlExterna('https://exemplo.com/a'), 'https://exemplo.com/a');
  assert.equal(validarUrlExterna('mailto:a@b.com?bcc=outro@c.com'), 'mailto:a@b.com');
});

test('configuração: Pix e publicidade só ativam com todos os dados; recursos incompletos ficam desligados', () => {
  const apoio = { ativo: true, chavePix: '123e4567-e12b-12d1-a456-426655440000', nomeDoRecebedor: 'Fulano de Tal', cidadeDoRecebedor: 'Brasília' };
  assert.equal(validarConfiguração({ apoio }).apoioDisponível, true);
  assert.equal(validarConfiguração({ apoio: { ...apoio, nomeDoRecebedor: 'N'.repeat(26) } }).apoioDisponível, false);
  assert.equal(validarConfiguração({ apoio: { ...apoio, cidadeDoRecebedor: 'C'.repeat(16) } }).apoioDisponível, false);
  assert.equal(validarConfiguração({ apoio: { ...apoio, chavePix: '111.111.111-11' } }).apoioDisponível, false);
  assert.equal(validarConfiguração({ apoio: { ...apoio, ativo: 'true' } }).apoioDisponível, false);
  const pub = { ativa: true, identificadorDoPublicador: 'ca-pub-0000000000000000', blocos: { padrão: '1234567890' }, consentimentoConfigurado: true };
  assert.equal(validarConfiguração({ publicidade: pub }).publicidadeDisponível, true);
  for (const faltando of [{ identificadorDoPublicador: 'ca-pub-123' }, { blocos: {} }, { blocos: { x: '12ab' } }, { consentimentoConfigurado: false }, { ativa: 'sim' }]) {
    assert.equal(validarConfiguração({ publicidade: { ...pub, ...faltando } }).publicidadeDisponível, false, JSON.stringify(faltando));
  }
  const { configuração } = validarConfiguração({ publicidade: pub });
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: null }).pode, false);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: { publicidade: false } }).pode, false);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: { publicidade: true }, página: { permiteAnúncios: false } }).pode, false);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: { publicidade: true } }).pode, true);
  assert.equal(podeCarregarAnúncios({ configuração: validarConfiguração({}).configuração, consentimento: { publicidade: true } }).pode, false);
});

test('consentimento: expira, muda com a versão da política e revoga sem apagar dados', () => {
  const base = criarLocalStorageFalso();
  const armazenamento = criarArmazenamento({ prefixo: 'doce-ofício', armazenamento: base });
  base.setItem('doce-ofício:coleção:receitas', '[]');
  salvarConsentimento({ publicidade: true }, { armazenamento, versão: 'v1', validadeEmDias: 180, agora: 1000 });
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1', agora: 2000 }).publicidade, true);
  assert.equal(lerConsentimento({ armazenamento, versão: 'v2', agora: 2000 }), null);
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1', agora: 1000 + 181 * 86_400_000 }), null);
  base.setItem('doce-ofício:consentimento', JSON.stringify({ publicidade: 'true', medição: false, versão: 'v1', expiraEm: 9e15 }));
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1' }), null);
  assert.equal(base.getItem('doce-ofício:coleção:receitas'), '[]');
});

// Gera uma planilha .xlsx (Office Open XML) de uma aba, sem bibliotecas externas.
// Cada célula: { texto } | { número, formato: 'moeda' | 'decimal' | 'inteiro' } | { fórmula, formato }.
// Estilo: 0 normal, 1 negrito, 2 moeda (R$), 3 moeda negrito, 4 decimal, 5 cabeçalho colorido.
// Texto é gravado como string inline escapada: nunca vira fórmula ao abrir.
import { escaparXml } from '../validação/escapar-xml.js';
import { compactarZip } from './compactar-zip.js';
import { site } from '../../../dados/site.js';

const ESTILOS = { normal: 0, negrito: 1, moeda: 2, moedaNegrito: 3, decimal: 4, cabeçalho: 5, científico: 11 };

function nomeDaColuna(índice) {
  let nome = '';
  let restante = índice + 1;
  while (restante > 0) {
    const resto = (restante - 1) % 26;
    nome = String.fromCharCode(65 + resto) + nome;
    restante = Math.floor((restante - 1) / 26);
  }
  return nome;
}

function célulaXml(entrada, referência, índiceDaLinha = 0, { temCabeçalho = true, casasDecimais = 2 } = {}) {
  if (entrada === null || entrada === undefined) return '';
  // Texto e número soltos valem como célula: antes, só objetos {texto}/{número} eram lidos e o resto saía vazio.
  const célula = typeof entrada === 'object' ? entrada : (typeof entrada === 'number' ? { número: entrada } : { texto: String(entrada) });
  let estilo = ESTILOS[célula.estilo ?? (célula.formato === 'moeda' ? 'moeda' : célula.formato === 'decimal' ? 'decimal' : 'normal')] ?? 0;
  if (célula.formato === 'decimal' && typeof célula.número === 'number' && célula.número !== 0 && Math.abs(célula.número) < 0.5 * (10 ** -casasDecimais)) estilo = ESTILOS.científico;
  if (temCabeçalho && índiceDaLinha === 0) estilo = 5;
  else if ((índiceDaLinha - (temCabeçalho ? 1 : 0)) % 2 === 1 && (estilo < 5 || estilo === 11)) estilo += estilo === 11 ? 1 : 6;
  if (célula.fórmula) return `<c r="${referência}" s="${estilo}"><f>${escaparXml(célula.fórmula)}</f></c>`;
  if (typeof célula.número === 'number' && Number.isFinite(célula.número)) return `<c r="${referência}" s="${estilo}"><v>${célula.número}</v></c>`;
  return `<c r="${referência}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(célula.texto ?? '')}</t></is></c>`;
}

function corArgb(hexadecimal) {
  return /^#[0-9a-f]{6}$/i.test(hexadecimal ?? '') ? `FF${hexadecimal.slice(1).toUpperCase()}` : 'FFD97757';
}

function corDaFonteDoCabeçalho(hexadecimal) {
  if (!/^#[0-9a-f]{6}$/i.test(hexadecimal ?? '')) return 'FF1A1A1A';
  const canais = [1, 3, 5].map((índice) => parseInt(hexadecimal.slice(índice, índice + 2), 16) / 255)
    .map((canal) => canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
  const luminância = 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
  return luminância > 0.179 ? 'FF1A1A1A' : 'FFF5F2ED';
}

function larguraColuna(linhas, índice, informada) {
  if (Number.isFinite(informada)) return Math.min(60, Math.max(8, informada));
  const conteúdo = linhas.slice(0, 200).map((linha) => {
    const célula = linha[índice];
    if (célula === null || célula === undefined) return '';
    if (typeof célula === 'object') return String(célula.texto ?? célula.número ?? célula.fórmula ?? '');
    return String(célula);
  });
  const maior = Math.max(0, ...conteúdo.map((valor) => valor.split(/\r?\n/).reduce((m, parte) => Math.max(m, parte.length), 0)));
  return Math.min(52, Math.max(12, maior + 2));
}

function estilosXml(corDoCabeçalho, casasDecimais) {
  const decimais = Math.min(6, Math.max(0, Number.isInteger(casasDecimais) ? casasDecimais : 2));
  const formatoDecimal = decimais ? `#,##0.${'0'.repeat(decimais)}` : '#,##0';
  const borda = '<border><left/><right/><top/><bottom/><diagonal/></border>';
  const bordaLeve = '<border><left style="hair"><color rgb="FFE2DBD1"/></left><right style="hair"><color rgb="FFE2DBD1"/></right><top style="hair"><color rgb="FFE2DBD1"/></top><bottom style="hair"><color rgb="FFE2DBD1"/></bottom><diagonal/></border>';
  const xf = (numFmtId, fontId, fillId, borderId) => `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''} applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="${formatoDecimal}"/><numFmt numFmtId="166" formatCode="0.00E+00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="${corDaFonteDoCabeçalho(corDoCabeçalho)}"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="${corArgb(corDoCabeçalho)}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFDF9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF9F6F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2">${borda}${bordaLeve}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13">${xf(0,0,3,1)}${xf(0,1,3,1)}${xf(164,0,3,1)}${xf(164,1,3,1)}${xf(165,0,3,1)}${xf(0,2,2,1)}${xf(0,0,4,1)}${xf(0,1,4,1)}${xf(164,0,4,1)}${xf(164,1,4,1)}${xf(165,0,4,1)}${xf(166,0,3,1)}${xf(166,0,4,1)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

export function gerarPlanilhaXlsx({ nomeDaAba = 'Planilha', linhas, largurasDasColunas = [], corDoCabeçalho = '#d97757', título = 'Planilha', autor = site.autor, casasDecimais = 2, temCabeçalho }) {
  const aba = escaparXml(String(nomeDaAba).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Planilha');
  const quantidadeColunas = linhas.reduce((maior, linha) => Math.max(maior, linha.length), 0);
  casasDecimais = Math.min(6, Math.max(0, Number.isInteger(casasDecimais) ? casasDecimais : 2));
  temCabeçalho ??= nomeDaAba === 'Dados' || linhas[0]?.some((célula) => célula && typeof célula === 'object' && célula.estilo === 'cabeçalho');
  const larguras = Array.from({ length: quantidadeColunas }, (_, índice) => larguraColuna(linhas, índice, largurasDasColunas[índice]));
  const colunas = quantidadeColunas ? `<cols>${larguras.map((largura, índice) => `<col min="${índice + 1}" max="${índice + 1}" width="${largura}" customWidth="1"/>`).join('')}</cols>` : '';
  const linhasXml = linhas
    .map((células, índiceDaLinha) => {
      const conteúdo = células.map((célula, índiceDaColuna) => célulaXml(célula, `${nomeDaColuna(índiceDaColuna)}${índiceDaLinha + 1}`, índiceDaLinha, { temCabeçalho, casasDecimais })).join('');
      const linhasVisuais = células.reduce((maior, entrada, índice) => {
        const célula = entrada && typeof entrada === 'object' ? entrada : { texto: entrada };
        const valor = String(célula?.texto ?? célula?.número ?? célula?.fórmula ?? '');
        const largura = larguras[índice];
        const estimativa = valor.split(/\r?\n/).reduce((soma, trecho) => soma + Math.max(1, Math.ceil(trecho.length / Math.max(8, largura))), 0);
        return Math.max(maior, estimativa);
      }, temCabeçalho && índiceDaLinha === 0 ? 2 : 1);
      return `<row r="${índiceDaLinha + 1}" ht="${Math.min(120, Math.max(20, linhasVisuais * 15 + 5))}" customHeight="1">${conteúdo}</row>`;
    })
    .join('');
  const agora = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const arquivos = [
    {
      nome: '[Content_Types].xml',
      conteúdo:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
    },
    {
      nome: '_rels/.rels',
      conteúdo:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    },
    {
      nome: 'docProps/core.xml',
      conteúdo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escaparXml(título)}</dc:title><dc:creator>${escaparXml(autor)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created></cp:coreProperties>`,
    },
    {
      nome: 'xl/workbook.xml',
      conteúdo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${aba}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      conteúdo:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    },
    {
      nome: 'xl/styles.xml',
      conteúdo: estilosXml(corDoCabeçalho, casasDecimais),
    },
    {
      nome: 'xl/worksheets/sheet1.xml',
      conteúdo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${temCabeçalho ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' : ''}${colunas}<sheetData>${linhasXml}</sheetData>${temCabeçalho && nomeDaAba === 'Dados' && linhas.length > 1 && quantidadeColunas ? `<autoFilter ref="A1:${nomeDaColuna(quantidadeColunas - 1)}${linhas.length}"/>` : ''}</worksheet>`,
    },
  ];
  return compactarZip(arquivos);
}

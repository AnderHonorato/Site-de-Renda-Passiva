// Sincronizado de compartilhado/scripts/exportação/gerar-planilha-xlsx.js — edite a origem e rode "npm run sincronizar" na raiz.
// Gera uma planilha .xlsx (Office Open XML) de uma aba, sem bibliotecas externas.
// Cada célula: { texto } | { número, formato: 'moeda' | 'decimal' | 'inteiro' } | { fórmula, formato }.
// Estilo: 0 normal, 1 negrito, 2 moeda (R$), 3 moeda negrito, 4 decimal, 5 cabeçalho colorido.
// Texto é gravado como string inline escapada: nunca vira fórmula ao abrir.
import { escaparXml } from '../validação/escapar-xml.js';
import { compactarZip } from './compactar-zip.js';

const ESTILOS = { normal: 0, negrito: 1, moeda: 2, moedaNegrito: 3, decimal: 4, cabeçalho: 5 };

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

function célulaXml(célula, referência) {
  if (célula === null || célula === undefined) return '';
  const estilo = ESTILOS[célula.estilo ?? (célula.formato === 'moeda' ? 'moeda' : célula.formato === 'decimal' ? 'decimal' : 'normal')] ?? 0;
  if (célula.fórmula) return `<c r="${referência}" s="${estilo}"><f>${escaparXml(célula.fórmula)}</f></c>`;
  if (typeof célula.número === 'number' && Number.isFinite(célula.número)) return `<c r="${referência}" s="${estilo}"><v>${célula.número}</v></c>`;
  return `<c r="${referência}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(célula.texto ?? '')}</t></is></c>`;
}

function corArgb(hexadecimal) {
  return /^#[0-9a-f]{6}$/i.test(hexadecimal ?? '') ? `FF${hexadecimal.slice(1).toUpperCase()}` : 'FF8C491A';
}

export function gerarPlanilhaXlsx({ nomeDaAba = 'Planilha', linhas, largurasDasColunas = [], corDoCabeçalho = '#8c491a', título = 'Planilha', autor = 'Anderson' }) {
  const aba = escaparXml(String(nomeDaAba).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Planilha');
  const colunas = largurasDasColunas.length
    ? `<cols>${largurasDasColunas.map((largura, índice) => `<col min="${índice + 1}" max="${índice + 1}" width="${largura}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const linhasXml = linhas
    .map((células, índiceDaLinha) => {
      const conteúdo = células.map((célula, índiceDaColuna) => célulaXml(célula, `${nomeDaColuna(índiceDaColuna)}${índiceDaLinha + 1}`)).join('');
      return `<row r="${índiceDaLinha + 1}">${conteúdo}</row>`;
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
      conteúdo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="#,##0.###"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="${corArgb(corDoCabeçalho)}"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`,
    },
    {
      nome: 'xl/worksheets/sheet1.xml',
      conteúdo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colunas}<sheetData>${linhasXml}</sheetData></worksheet>`,
    },
  ];
  return compactarZip(arquivos);
}

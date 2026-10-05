// Gera os arquivos de exemplo da pesquisa (sem dado pessoal), todos criados aqui.
// Uso: node gerar-amostras.mjs <pasta-de-saida> [caminho-do-pdf-lib.esm.min.js]
// Antes: pwsh -File gerar-jpg.ps1 -Saida <pasta-de-saida>   (cria foto.jpg e texto-escaneado.jpg)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const saida = path.resolve(process.argv[2] || './amostras');
const pdfLibCaminho = path.resolve(process.argv[3] || path.join(aqui, '../../../portal/recursos/pdf-lib.esm.min.js'));
const { PDFDocument, StandardFonts, rgb, degrees } = await import(pathToFileURL(pdfLibCaminho).href);
fs.mkdirSync(saida, { recursive: true });
const grava = (nome, dados) => { fs.writeFileSync(path.join(saida, nome), dados); console.log('ok', nome, dados.length, 'bytes'); };

// ---------- PDFs com pdf-lib ----------
async function numerado(paginas, titulo, extra = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo); pdf.setAuthor('Pesquisa de comportamento'); pdf.setCreator('gerar-amostras.mjs');
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (let i = 1; i <= paginas; i++) {
    const p = pdf.addPage(extra.tamanho || [595.28, 841.89]);
    const { width, height } = p.getSize();
    p.drawText(`Pagina ${i} de ${paginas}`, { x: 60, y: height - 120, size: 36, font: negrito, color: rgb(0.1, 0.2, 0.5) });
    p.drawText(`${titulo} - texto selecionavel na pagina ${i}.`, { x: 60, y: height - 170, size: 14, font: fonte });
    for (let l = 0; l < 12; l++) p.drawText(`Linha ${l + 1}: lorem ipsum dolor sit amet, consectetur ${i}-${l + 1}.`, { x: 60, y: height - 220 - l * 20, size: 11, font: fonte });
    p.drawRectangle({ x: 40, y: 40, width: width - 80, height: height - 80, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1 });
    p.drawText('PALAVRA-SECRETA-123 e 123.456.789-00 (CPF ficticio)', { x: 60, y: 90, size: 12, font: fonte, color: rgb(0.7, 0.1, 0.1) });
  }
  return pdf;
}
grava('numeradas-5.pdf', await (await numerado(5, 'Documento de teste cinco')).save());
grava('numeradas-10.pdf', await (await numerado(10, 'Documento de teste dez')).save());

// tamanhos e rotacoes mistos
{
  const pdf = await numerado(1, 'Misto');
  const a = pdf.addPage([841.89, 595.28]); a.drawText('Paisagem A4', { x: 60, y: 300, size: 30 });
  const l = pdf.addPage([612, 792]); l.drawText('Carta (Letter)', { x: 60, y: 600, size: 30 });
  const r = pdf.addPage([595.28, 841.89]); r.setRotation(degrees(90)); r.drawText('Pagina com rotacao 90', { x: 60, y: 600, size: 30 });
  grava('misto.pdf', await pdf.save());
}

// PDF com imagem
{
  const pdf = await numerado(1, 'Com imagem');
  const p = pdf.addPage([595.28, 841.89]);
  const jpgCaminho = path.join(saida, 'foto.jpg');
  if (fs.existsSync(jpgCaminho)) {
    const img = await pdf.embedJpg(fs.readFileSync(jpgCaminho));
    p.drawImage(img, { x: 60, y: 450, width: 320, height: 240 });
  }
  p.drawText('Pagina 2 com uma imagem JPG embutida.', { x: 60, y: 420, size: 14 });
  grava('com-imagem.pdf', await pdf.save());
}

// PDF "escaneado": so uma imagem de texto, sem camada de texto
{
  const caminho = path.join(saida, 'texto-escaneado.jpg');
  if (fs.existsSync(caminho)) {
    const pdf = await PDFDocument.create();
    const img = await pdf.embedJpg(fs.readFileSync(caminho));
    const p = pdf.addPage([595.28, 841.89]);
    p.drawImage(img, { x: 0, y: 841.89 - 595.28 * (400 / 1240) - 80, width: 595.28, height: 595.28 * (400 / 1240) });
    grava('escaneado.pdf', await pdf.save());
  } else console.log('pulei escaneado.pdf (rode gerar-jpg.ps1 antes)');
}

// formulario com campos
{
  const pdf = await PDFDocument.create();
  const p = pdf.addPage([595.28, 500]);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  p.drawText('Formulario de teste', { x: 50, y: 440, size: 22, font: fonte });
  p.drawText('Nome:', { x: 50, y: 400, size: 12, font: fonte });
  const nome = form.createTextField('nome'); nome.addToPage(p, { x: 120, y: 392, width: 250, height: 22 });
  p.drawText('Cidade:', { x: 50, y: 360, size: 12, font: fonte });
  const cidade = form.createDropdown('cidade'); cidade.addOptions(['Sao Paulo', 'Recife', 'Curitiba']); cidade.addToPage(p, { x: 120, y: 352, width: 160, height: 22 });
  p.drawText('Aceito os termos:', { x: 50, y: 320, size: 12, font: fonte });
  const aceite = form.createCheckBox('aceite'); aceite.addToPage(p, { x: 170, y: 316, width: 16, height: 16 });
  p.drawText('Opcao:', { x: 50, y: 285, size: 12, font: fonte });
  const grupo = form.createRadioGroup('opcao'); grupo.addOptionToPage('A', p, { x: 120, y: 281, width: 16, height: 16 }); grupo.addOptionToPage('B', p, { x: 160, y: 281, width: 16, height: 16 });
  grava('formulario.pdf', await pdf.save());
}

// comparar A e B (B muda uma linha e acrescenta uma pagina)
{
  const a = await numerado(2, 'Contrato versao A');
  grava('comparar-a.pdf', await a.save());
  const b = await numerado(2, 'Contrato versao B');
  b.getPage(0).drawText('TEXTO ACRESCENTADO NA VERSAO B', { x: 60, y: 300, size: 16, color: rgb(0, 0.4, 0) });
  const extra = b.addPage([595.28, 841.89]); extra.drawText('Pagina nova so na versao B', { x: 60, y: 700, size: 20 });
  grava('comparar-b.pdf', await b.save());
}

// casos invalidos
{
  const ok = fs.readFileSync(path.join(saida, 'numeradas-5.pdf'));
  grava('corrompido.pdf', ok.subarray(0, Math.floor(ok.length * 0.55)));
  grava('vazio-0-bytes.pdf', Buffer.alloc(0));
  const zero = await PDFDocument.create();
  grava('zero-paginas.pdf', await zero.save());
  grava('falso.pdf', Buffer.from('Isto e apenas texto puro, nao um PDF.\n'));
}

// ---------- PDF protegido (RC4 40 bits, R2) escrito a mao ----------
function rc4(chave, dados) {
  const s = Array.from({ length: 256 }, (_, i) => i); let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + s[i] + chave[i % chave.length]) & 255; [s[i], s[j]] = [s[j], s[i]]; }
  const out = Buffer.alloc(dados.length); let a = 0, b = 0;
  for (let k = 0; k < dados.length; k++) { a = (a + 1) & 255; b = (b + s[a]) & 255; [s[a], s[b]] = [s[b], s[a]]; out[k] = dados[k] ^ s[(s[a] + s[b]) & 255]; }
  return out;
}
const PAD = Buffer.from('28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A', 'hex');
const md5 = (...b) => crypto.createHash('md5').update(Buffer.concat(b)).digest();
const pad = (s) => Buffer.concat([Buffer.from(s, 'latin1'), PAD]).subarray(0, 32);
function protegido(nome, senhaUsuario, senhaDono, P) {
  const id = md5(Buffer.from(nome));
  const O = rc4(md5(pad(senhaDono)).subarray(0, 5), pad(senhaUsuario));
  const pBuf = Buffer.alloc(4); pBuf.writeInt32LE(P);
  const chave = md5(pad(senhaUsuario), O, pBuf, id).subarray(0, 5);
  const U = rc4(chave, PAD);
  const chaveObj = (n) => md5(chave, Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255, 0, 0])).subarray(0, 10);
  const conteudo = Buffer.from('BT /F1 24 Tf 60 740 Td (Documento protegido de teste) Tj ET');
  const cifrado = rc4(chaveObj(4), conteudo);
  const hex = (b) => '<' + b.toString('hex') + '>';
  const partes = []; const offs = []; let pos = 0;
  const add = (b) => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); partes.push(buf); pos += buf.length; };
  const obj = (n, corpo) => { offs[n] = pos; add(`${n} 0 obj\n`); add(corpo); add('\nendobj\n'); };
  add('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  offs[4] = pos; add('4 0 obj\n'); add(`<< /Length ${cifrado.length} >>\nstream\n`); add(cifrado); add('\nendstream\nendobj\n');
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  obj(6, `<< /Filter /Standard /V 1 /R 2 /O ${hex(O)} /U ${hex(U)} /P ${P} >>`);
  const xref = pos;
  add('xref\n0 7\n0000000000 65535 f \n');
  for (let n = 1; n <= 6; n++) add(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
  add(`trailer\n<< /Size 7 /Root 1 0 R /Encrypt 6 0 R /ID [${hex(id)} ${hex(id)}] >>\nstartxref\n${xref}\n%%EOF\n`);
  grava(nome, Buffer.concat(partes));
}
protegido('protegido-abrir.pdf', 'teste123', 'dono456', -4);        // senha de abertura: teste123
protegido('protegido-permissoes.pdf', '', 'dono456', -3904);       // abre sem senha, mas restringe imprimir/copiar/editar

// ---------- OOXML minimo, compactado com zlib (sem dependencias) ----------
const tabelaCrc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = tabelaCrc[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(arquivos) {
  const locais = []; const centrais = []; let pos = 0;
  for (const [nome, texto] of Object.entries(arquivos)) {
    const dados = Buffer.from(texto, 'utf8'); const comp = zlib.deflateRawSync(dados); const nm = Buffer.from(nome); const crc = crc32(dados);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(dados.length, 22); h.writeUInt16LE(nm.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(dados.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(pos, 42);
    locais.push(h, nm, comp); centrais.push(c, nm); pos += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(centrais); const fim = Buffer.alloc(22); fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(arquivos).length, 8); fim.writeUInt16LE(Object.keys(arquivos).length, 10); fim.writeUInt32LE(cd.length, 12); fim.writeUInt32LE(pos, 16);
  return Buffer.concat([...locais, cd, fim]);
}
const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
grava('exemplo.docx', zip({
  '[Content_Types].xml': X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels': X + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/document.xml': X + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:t>Titulo do documento de teste</w:t></w:r></w:p><w:p><w:r><w:t>Primeiro paragrafo com texto simples para conversao.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Segundo paragrafo em italico, com acentuacao: coracao, avo, acucar.</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>Item</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>10</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
}));
grava('exemplo.xlsx', zip({
  '[Content_Types].xml': X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels': X + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': X + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets><sheet name="Planilha1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': X + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  'xl/worksheets/sheet1.xml': X + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Produto</t></is></c><c r="B1" t="inlineStr"><is><t>Qtd</t></is></c><c r="C1" t="inlineStr"><is><t>Preco</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Caneta</t></is></c><c r="B2"><v>3</v></c><c r="C2"><v>2.5</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Caderno</t></is></c><c r="B3"><v>2</v></c><c r="C3"><v>12</v></c></row><row r="4"><c r="A4" t="inlineStr"><is><t>Total</t></is></c><c r="B4"><f>SUM(B2:B3)</f><v>5</v></c></row></sheetData></worksheet>',
}));
const NP = 'http://schemas.openxmlformats.org/presentationml/2006/main', NA = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const cor = (n, v) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
const estilo = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
const tema = X + `<a:theme xmlns:a="${NA}" name="T"><a:themeElements><a:clrScheme name="c">${cor('dk1', '000000')}${cor('lt1', 'FFFFFF')}${cor('dk2', '1F2937')}${cor('lt2', 'F3F4F6')}${cor('accent1', '2563EB')}${cor('accent2', 'DC2626')}${cor('accent3', '16A34A')}${cor('accent4', 'CA8A04')}${cor('accent5', '7C3AED')}${cor('accent6', '0891B2')}${cor('hlink', '2563EB')}${cor('folHlink', '7C3AED')}</a:clrScheme><a:fontScheme name="f"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="m"><a:fillStyleLst>${estilo}${estilo}${estilo}</a:fillStyleLst><a:lnStyleLst><a:ln w="9525">${estilo}</a:ln><a:ln w="9525">${estilo}</a:ln><a:ln w="9525">${estilo}</a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${estilo}${estilo}${estilo}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
const slide = (titulo, corpo) => X + `<p:sld xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${REL}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Titulo"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="457200"/><a:ext cx="7772400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="pt-BR" sz="3600" b="1"/><a:t>${titulo}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Corpo"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="1600200"/><a:ext cx="7772400" cy="2400000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="pt-BR" sz="2400"/><a:t>${corpo}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
const relsDe = (itens) => X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + itens.map(([id, tipo, alvo]) => `<Relationship Id="${id}" Type="${REL}/${tipo}" Target="${alvo}"/>`).join('') + '</Relationships>';
const ct = (n, t) => `<Override PartName="${n}" ContentType="application/vnd.openxmlformats-officedocument.${t}+xml"/>`;
grava('exemplo.pptx', zip({
  '[Content_Types].xml': X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' + ct('/ppt/presentation.xml', 'presentationml.presentation.main') + ct('/ppt/slideMasters/slideMaster1.xml', 'presentationml.slideMaster') + ct('/ppt/slideLayouts/slideLayout1.xml', 'presentationml.slideLayout') + ct('/ppt/theme/theme1.xml', 'theme') + ct('/ppt/slides/slide1.xml', 'presentationml.slide') + ct('/ppt/slides/slide2.xml', 'presentationml.slide') + '</Types>',
  '_rels/.rels': relsDe([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
  'ppt/presentation.xml': X + `<p:presentation xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${REL}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
  'ppt/_rels/presentation.xml.rels': relsDe([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'slide', 'slides/slide1.xml'], ['rId3', 'slide', 'slides/slide2.xml'], ['rId4', 'theme', 'theme/theme1.xml']]),
  'ppt/slideMasters/slideMaster1.xml': X + `<p:sldMaster xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${REL}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`,
  'ppt/slideMasters/_rels/slideMaster1.xml.rels': relsDe([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]),
  'ppt/slideLayouts/slideLayout1.xml': X + `<p:sldLayout xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${REL}" type="blank"><p:cSld name="Em branco"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>`,
  'ppt/slideLayouts/_rels/slideLayout1.xml.rels': relsDe([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
  'ppt/theme/theme1.xml': tema,
  'ppt/slides/slide1.xml': slide('Slide um de teste', 'Texto do primeiro slide com acentuacao: coracao.'),
  'ppt/slides/slide2.xml': slide('Slide dois de teste', 'Segundo slide, uma linha simples.'),
  'ppt/slides/_rels/slide1.xml.rels': relsDe([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']]),
  'ppt/slides/_rels/slide2.xml.rels': relsDe([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']]),
}));

// ---------- HTML simples ----------
grava('simples.html', Buffer.from('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pagina de teste</title><style>body{font-family:Arial;margin:2rem}h1{color:#1d4ed8}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 10px}</style></head><body><h1>Pagina HTML de teste</h1><p>Paragrafo com <b>negrito</b> e <i>italico</i>, acentuacao: coracao.</p><table><tr><th>Item</th><th>Valor</th></tr><tr><td>A</td><td>10</td></tr></table></body></html>'));
console.log('Pronto em', saida);

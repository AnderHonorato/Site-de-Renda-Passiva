// Terceira parte: monta DENTRO da pagina um .pptx minimo (zip sem compressao, metodo "store")
// para testar "PowerPoint para PDF" sem passar base64 pela conversa. Codigo proprio.
// Requer H (ajuda-navegador.js). Uso: H.pptx() devolve Uint8Array; H.arquivo('x.pptx', H.pptx(), 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
(() => {
  const E = new TextEncoder();
  const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const loc = [], cen = []; let pos = 0;
    for (const [nome, txt] of Object.entries(files)) {
      const d = E.encode(txt), nm = E.encode(nome), c = crc(d);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true);
      const z = new DataView(new ArrayBuffer(46)); z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint32(16, c, true); z.setUint32(20, d.length, true); z.setUint32(24, d.length, true); z.setUint16(28, nm.length, true); z.setUint32(42, pos, true);
      loc.push(new Uint8Array(h.buffer), nm, d); cen.push(new Uint8Array(z.buffer), nm); pos += 30 + nm.length + d.length;
    }
    const cd = cen.reduce((a, b) => a + b.length, 0), f = new DataView(new ArrayBuffer(22)); const n = Object.keys(files).length;
    f.setUint32(0, 0x06054b50, true); f.setUint16(8, n, true); f.setUint16(10, n, true); f.setUint32(12, cd, true); f.setUint32(16, pos, true);
    const partes = [...loc, ...cen, new Uint8Array(f.buffer)]; const out = new Uint8Array(partes.reduce((a, b) => a + b.length, 0)); let p = 0; for (const b of partes) { out.set(b, p); p += b.length; } return out;
  }
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const NP = 'http://schemas.openxmlformats.org/presentationml/2006/main', NA = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const rels = (it) => X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + it.map(([i, t, a]) => `<Relationship Id="${i}" Type="${R}/${t}" Target="${a}"/>`).join('') + '</Relationships>';
  const ov = (n, t) => `<Override PartName="${n}" ContentType="application/vnd.openxmlformats-officedocument.${t}+xml"/>`;
  const cor = (n, v) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`, es = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const tema = X + `<a:theme xmlns:a="${NA}" name="T"><a:themeElements><a:clrScheme name="c">${cor('dk1', '000000')}${cor('lt1', 'FFFFFF')}${cor('dk2', '1F2937')}${cor('lt2', 'F3F4F6')}${['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map((n) => cor(n, '2563EB')).join('')}</a:clrScheme><a:fontScheme name="f"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="m"><a:fillStyleLst>${es}${es}${es}</a:fillStyleLst><a:lnStyleLst><a:ln w="9525">${es}</a:ln><a:ln w="9525">${es}</a:ln><a:ln w="9525">${es}</a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${es}${es}${es}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
  const caixa = (id, y, sz, txt) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="C${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="${y}"/><a:ext cx="7772400" cy="900000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="pt-BR" sz="${sz}"/><a:t>${txt}</a:t></a:r></a:p></p:txBody></p:sp>`;
  const slide = (a, b) => X + `<p:sld xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${R}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${caixa(2, 457200, 3600, a)}${caixa(3, 1600200, 2400, b)}</p:spTree></p:cSld></p:sld>`;
  const arvore = '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>';
  H.zip = zip;
  H.pptx = () => zip({
    '[Content_Types].xml': X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' + ov('/ppt/presentation.xml', 'presentationml.presentation.main') + ov('/ppt/slideMasters/slideMaster1.xml', 'presentationml.slideMaster') + ov('/ppt/slideLayouts/slideLayout1.xml', 'presentationml.slideLayout') + ov('/ppt/theme/theme1.xml', 'theme') + ov('/ppt/slides/slide1.xml', 'presentationml.slide') + ov('/ppt/slides/slide2.xml', 'presentationml.slide') + '</Types>',
    '_rels/.rels': rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
    'ppt/presentation.xml': X + `<p:presentation xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${R}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'slide', 'slides/slide1.xml'], ['rId3', 'slide', 'slides/slide2.xml'], ['rId4', 'theme', 'theme/theme1.xml']]),
    'ppt/slideMasters/slideMaster1.xml': X + `<p:sldMaster xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${R}">${arvore}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`,
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]),
    'ppt/slideLayouts/slideLayout1.xml': X + `<p:sldLayout xmlns:p="${NP}" xmlns:a="${NA}" xmlns:r="${R}" type="blank">${arvore}</p:sldLayout>`,
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
    'ppt/theme/theme1.xml': tema,
    'ppt/slides/slide1.xml': slide('Slide um de teste', 'Texto do primeiro slide, com acentuacao: coracao.'),
    'ppt/slides/slide2.xml': slide('Slide dois de teste', 'Segundo slide, uma linha simples.'),
    'ppt/slides/_rels/slide1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']]),
    'ppt/slides/_rels/slide2.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']]),
  });
})();

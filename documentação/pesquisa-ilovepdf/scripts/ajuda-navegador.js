// Ajuda para a pesquisa: gera arquivos de teste DENTRO da pagina (sem rede e sem base64 enorme)
// e os injeta no <input type="file"> da ferramenta. Codigo proprio, sem dado pessoal.
// Uso: cole no console da pagina (ou guarde em localStorage e use eval) e chame H.injeta([...]).
(() => {
  const E = new TextEncoder();
  const junta = (partes) => { const t = partes.reduce((a, b) => a + b.length, 0); const o = new Uint8Array(t); let p = 0; for (const b of partes) { o.set(b, p); p += b.length; } return o; };
  function pdfDe(objs, extra = '') {
    const partes = []; const offs = []; let pos = 0;
    const add = (b) => { const u = typeof b === 'string' ? E.encode(b) : b; partes.push(u); pos += u.length; };
    add('%PDF-1.4\n');
    objs.forEach((o, i) => { offs.push(pos); add(`${i + 1} 0 obj\n`); if (typeof o === 'string') add(o); else { add(`<< ${o.d} /Length ${o.s.length} >>\nstream\n`); add(o.s); add('\nendstream'); } add('\nendobj\n'); });
    const x = pos; add(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`); offs.forEach((o) => add(String(o).padStart(10, '0') + ' 00000 n \n'));
    add(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R ${extra} >>\nstartxref\n${x}\n%%EOF\n`);
    return junta(partes);
  }
  // PDF com n paginas numeradas e texto selecionavel. tam = [largura, altura] em pontos.
  function numerado(n, titulo = 'Documento de teste', tam = [595, 842]) {
    const [w, h] = tam; const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    const kids = [];
    for (let i = 1; i <= n; i++) {
      const numPag = 4 + 2 * (i - 1); kids.push(`${numPag} 0 R`);
      let c = `BT /F1 36 Tf 60 ${h - 120} Td (Pagina ${i} de ${n}) Tj ET\nBT /F1 14 Tf 60 ${h - 170} Td (${titulo} - texto da pagina ${i}.) Tj ET\nBT /F1 11 Tf 60 ${h - 220} Td 20 TL\n`;
      for (let l = 1; l <= 10; l++) c += `(Linha ${l}: lorem ipsum dolor sit amet ${i}-${l}.) Tj T*\n`;
      c += 'ET\nBT /F1 12 Tf 60 90 Td (PALAVRA-SECRETA-123 e CPF ficticio 123.456.789-00) Tj ET';
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${numPag + 1} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
      objs.push({ d: '', s: E.encode(c) });
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`;
    return pdfDe(objs);
  }
  async function jpgTexto(linhas, w = 1240, h = 400, fonte = '40px Arial') {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; x.font = fonte;
    linhas.forEach((l, i) => x.fillText(l, 40, 90 + i * 100));
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85)); return new Uint8Array(await b.arrayBuffer());
  }
  async function jpgFoto() {
    const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d');
    x.fillStyle = '#f0f4fa'; x.fillRect(0, 0, 320, 240); x.fillStyle = '#dc5a3c'; x.beginPath(); x.arc(90, 90, 60, 0, 7); x.fill();
    x.fillStyle = '#2878c8'; x.fillRect(160, 90, 130, 110); x.fillStyle = '#000'; x.font = 'bold 20px Arial'; x.fillText('IMAGEM DE TESTE', 40, 220);
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8)); return new Uint8Array(await b.arrayBuffer());
  }
  // PDF de 1 pagina que e so uma imagem JPEG (simula documento escaneado)
  function imagemPdf(jpg, w, h) {
    const larg = 535, alt = Math.round(535 * h / w);
    return pdfDe(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>',
      { d: '', s: E.encode(`q ${larg} 0 0 ${alt} 30 ${842 - alt - 60} cm /Im0 Do Q`) },
      { d: `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, s: jpg }]);
  }
  // PDF com formulario: texto, caixa de selecao, lista suspensa
  function formulario() {
    const campo = (extra, rect) => `<< /Type /Annot /Subtype /Widget ${extra} /Rect [${rect}] /F 4 /P 6 0 R /MK << /BC [0 0 0] >> >>`;
    return pdfDe(['<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [7 0 R 8 0 R 9 0 R] /DA (/Helv 12 Tf 0 g) /DR << /Font << /Helv 3 0 R >> >> >> >>',
      '<< /Type /Pages /Kids [6 0 R] /Count 1 >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      { d: '', s: E.encode('BT /Helv 22 Tf 50 440 Td (Formulario de teste) Tj ET BT /Helv 12 Tf 50 400 Td (Nome:) Tj ET BT /Helv 12 Tf 50 360 Td (Cidade:) Tj ET BT /Helv 12 Tf 50 320 Td (Aceito:) Tj ET') }, '<< >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 500] /Contents 4 0 R /Resources << /Font << /Helv 3 0 R >> >> /Annots [7 0 R 8 0 R 9 0 R] >>',
      campo('/FT /Tx /T (nome) /DA (/Helv 12 Tf 0 g)', '120 392 370 414'),
      campo('/FT /Ch /Ff 131072 /T (cidade) /Opt [(Sao Paulo) (Recife) (Curitiba)] /DA (/Helv 12 Tf 0 g)', '120 352 280 374'),
      campo('/FT /Btn /T (aceite) /V /Off /AS /Off', '120 316 136 332')]);
  }
  // PDF de 1 pagina com uma "tabela" em fonte monoespacada alinhada por espacos (teste de PDF para Excel)
  function tabela() {
    let c = 'BT /F1 12 Tf 60 700 Td 18 TL\n';
    ['Produto      Qtd   Preco', 'Caneta         3     2.50', 'Caderno        2    12.00', 'Total          5    29.00'].forEach((l) => { c += `(${l}) Tj T*\n`; });
    c += 'ET';
    return pdfDe(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [4 0 R] /Count 1 >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>', { d: '', s: E.encode(c) }]);
  }
  const arquivo = (nome, bytes, tipo = 'application/pdf') => new File([bytes], nome, { type: tipo });
  const deB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  // coloca os arquivos no primeiro <input type=file> (ou no seletor dado) e dispara 'change'
  function injeta(arquivos, sel = 'input[type=file]') {
    const dt = new DataTransfer(); arquivos.forEach((f) => dt.items.add(f));
    const i = document.querySelector(sel); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); return i.files.length;
  }
  window.H = { numerado, jpgTexto, jpgFoto, imagemPdf, formulario, tabela, arquivo, deB64, injeta, pdfDe };
})();

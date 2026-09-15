async (page) => {
 const relatorio=await page.evaluate(async()=>{
  const {ferramentas}=await import('/scripts/catalogo.js');const {pdfLib}=await import('/scripts/ferramentas/grupo-2/pdf-base.js');const {PDFDocument,StandardFonts}=await pdfLib();
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);for(let i=1;i<=3;i++){const p=pdf.addPage([595.28,841.89]);p.drawText('Documento de teste - pagina '+i,{x:40,y:780,font,size:14});}const arquivoPdf=new File([await pdf.save()],'teste.pdf',{type:'application/pdf'});
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,600,900);ctx.fillStyle='#0000ff';ctx.fillRect(600,0,600,900);const png=await new Promise(r=>canvas.toBlob(r,'image/png'));const imagem=new File([png],'duas-cores.png',{type:'image/png'});const hash=new File(['abc'],'abc.txt',{type:'text/plain'});
  const resultados=[];
  for(const f of ferramentas){const d={};for(const c of f.campos){d[c.nome]=c.tipo==='file'?(c.multiplo?[c.aceita==='.pdf'?arquivoPdf:imagem,c.aceita==='.pdf'?arquivoPdf:imagem]:f.id==='gerador-de-hash-de-arquivo'?hash:c.aceita==='.pdf'?arquivoPdf:imagem):c.valor;}
   try{const r=await f.executar(d);if(!r||!r.resumo)throw Error('Resultado sem resumo');const arquivos=[...(r.arquivo?[r.arquivo]:[]),...(r.arquivos??[])];for(const a of arquivos){if(!(a.blob instanceof Blob)||a.blob.size===0)throw Error('Arquivo vazio');if(a.blob.type==='application/pdf'){const l=await PDFDocument.load(await a.blob.arrayBuffer());if(l.getPageCount()<1)throw Error('PDF sem página');}}
    if(f.id==='juntar-pdfs'){const l=await PDFDocument.load(await r.arquivo.blob.arrayBuffer());if(l.getPageCount()!==6)throw Error('Junção deveria ter seis páginas');}
    if(f.id==='girar-e-espelhar-imagem'&&!r.resumo.includes('900 × 1200'))throw Error('Giro não inverteu dimensões');
    if(f.id==='pdf-para-imagens'&&r.arquivos.length!==3)throw Error('PDF deveria gerar três PNGs');
    if(f.id==='extrair-texto-de-pdf'&&!(await r.arquivo.blob.text()).includes('Documento de teste'))throw Error('Texto não extraído');
    resultados.push({id:f.id,ok:true,resumo:r.resumo,arquivos:arquivos.length});
   }catch(e){resultados.push({id:f.id,ok:false,erro:e.message});}
  }return {total:resultados.length,passaram:resultados.filter(r=>r.ok).length,falhas:resultados.filter(r=>!r.ok),resultados};
 });
 return relatorio;
}


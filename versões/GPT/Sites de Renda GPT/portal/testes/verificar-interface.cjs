async (page) => {
 return await page.evaluate(async()=>{
  const {ferramentas}=await import('/scripts/catalogo.js');const {categorias}=await import('/scripts/categorias.js');const {renderizarFerramenta}=await import('/scripts/renderizar-ferramenta.js');const {pdfLib}=await import('/scripts/ferramentas/grupo-2/pdf-base.js');const {PDFDocument}=await pdfLib();const pdf=await PDFDocument.create();for(let i=0;i<3;i++)pdf.addPage();const fp=new File([await pdf.save()],'teste.pdf',{type:'application/pdf'});
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const ctx=canvas.getContext('2d');ctx.fillStyle='blue';ctx.fillRect(0,0,1200,900);const fi=new File([await new Promise(r=>canvas.toBlob(r))],'teste.png',{type:'image/png'});const fh=new File(['abc'],'abc.txt');const resultados=[];
  const aguardar=ms=>new Promise(r=>setTimeout(r,ms));
  for(const f of ferramentas){try{
   renderizarFerramenta(f,categorias.find(c=>c.id===f.categoria));const dialogo=document.getElementById('ferramenta-dialogo');
   for(const c of f.campos.filter(c=>c.tipo==='file')){const dt=new DataTransfer();const arquivo=c.aceita==='.pdf'?fp:f.id==='gerador-de-hash-de-arquivo'?fh:fi;dt.items.add(arquivo);if(c.multiplo)dt.items.add(arquivo);dialogo.querySelector('[name="'+c.nome+'"]').files=dt.files;}
   const form=dialogo.querySelector('form');if(form){if(!form.checkValidity())throw Error('Formulário inicial inválido');form.requestSubmit();const inicio=performance.now();while(!dialogo.querySelector('.resultado h3')&&dialogo.querySelector('.erro').hidden){if(performance.now()-inicio>10000)throw Error('Sem resultado em 10 segundos');await aguardar(20);}if(!dialogo.querySelector('.erro').hidden)throw Error(dialogo.querySelector('.erro').textContent);}
   resultados.push({id:f.id,ok:true});dialogo.close();await aguardar(5);
  }catch(e){document.getElementById('ferramenta-dialogo').close();await aguardar(5);resultados.push({id:f.id,ok:false,erro:e.message});}}
  return {total:resultados.length,passaram:resultados.filter(x=>x.ok).length,falhas:resultados.filter(x=>!x.ok)};
 });
}

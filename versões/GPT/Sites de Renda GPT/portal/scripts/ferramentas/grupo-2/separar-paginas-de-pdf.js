import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,file,arquivoTexto} from './comum.js';
import {pdfLib,lerPDF,paginas,salvarPDF,pdfJS,previewPDF} from './pdf-base.js';
import {canvas,carregarImagem,codificar} from './imagem-base.js';
export default definir("separar-paginas-de-pdf",9,"Separar páginas de PDF","Exporte as páginas ou intervalos escolhidos.","Seleção 2-4 exporta três páginas em um novo PDF. Intervalos inclusivos; sem duplicatas.",[F('arquivo','PDF','.pdf'),T('paginas','Páginas (ex.: 2-4)','1')],async d=>{const doc=await lerPDF(file(d)),sel=paginas(texto(d,'paginas'),doc.getPageCount()),{PDFDocument}=await pdfLib(),out=await PDFDocument.create();for(const p of await out.copyPages(doc,sel))out.addPage(p);return salvarPDF(out,'paginas-selecionadas.pdf',['Páginas originais: '+sel.map(x=>x+1).join(', ')]);});


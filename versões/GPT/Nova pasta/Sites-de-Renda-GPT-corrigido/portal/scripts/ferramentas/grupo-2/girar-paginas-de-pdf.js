import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,file,arquivoTexto} from './comum.js';
import {pdfLib,lerPDF,paginas,salvarPDF,pdfJS,previewPDF} from './pdf-base.js';
import {canvas,carregarImagem,codificar} from './imagem-base.js';
export default definir("girar-paginas-de-pdf",9,"Girar páginas de PDF","Gire somente as páginas escolhidas.","Acrescenta 90, 180 ou 270 graus à rotação atual; páginas não selecionadas permanecem iguais.",[F('arquivo','PDF','.pdf'),T('paginas','Páginas ou todas','todas'),S('angulo','Giro horário','90',[['90','90 graus'],['180','180 graus'],['270','270 graus']])],async d=>{const doc=await lerPDF(file(d)),sel=paginas(texto(d,'paginas'),doc.getPageCount()),a=Number(opcao(d,'angulo',['90','180','270'])),{degrees}=await pdfLib();for(const i of sel){const p=doc.getPage(i);p.setRotation(degrees((p.getRotation().angle+a)%360));}return salvarPDF(doc,'pdf-girado.pdf',['Giradas: '+sel.map(x=>x+1).join(', ')]);});


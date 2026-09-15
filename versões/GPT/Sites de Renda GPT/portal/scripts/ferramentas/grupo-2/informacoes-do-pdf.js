import {definir,N,T,S,F,D,C,n,inteiro,texto,opcao,lista,fmt,escape,file,arquivoTexto} from './comum.js';
import {pdfLib,lerPDF,paginas,salvarPDF,pdfJS,previewPDF} from './pdf-base.js';
import {canvas,carregarImagem,codificar} from './imagem-base.js';
export default definir("informacoes-do-pdf",9,"Informações do PDF","Confira páginas, tamanhos e propriedades do documento.","Lê metadados declarados no PDF, sem verificar autoria, autenticidade ou segurança.",[F('arquivo','PDF','.pdf')],async d=>{const f=file(d),doc=await lerPDF(f);return {resumo:doc.getPageCount()+' páginas — '+fmt(f.size/1024)+' KB',linhas:['Título: '+(doc.getTitle()||'não informado'),'Autor declarado: '+(doc.getAuthor()||'não informado'),'Criador declarado: '+(doc.getCreator()||'não informado'),...doc.getPages().map((p,i)=>'Página '+(i+1)+': '+fmt(p.getWidth()*25.4/72)+' × '+fmt(p.getHeight()*25.4/72)+' mm; rotação '+p.getRotation().angle+'°')]};});


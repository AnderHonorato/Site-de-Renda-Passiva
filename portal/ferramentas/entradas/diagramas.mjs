/**
 * Mermaid auto-hospedado, segurança strict.
 * O texto é renderizado localmente; a interface só exibe SVG sanitizado como <img>.
 */
import mermaid from 'mermaid';
let configurado=false;
export async function renderizarDiagrama(codigo,id){
  if(!configurado){
    mermaid.initialize({
      startOnLoad:false,securityLevel:'strict',theme:'neutral',logLevel:'error',
      flowchart:{htmlLabels:false,diagramPadding:12},
      maxTextSize:10000,maxEdges:180,suppressErrorRendering:true,
    });
    configurado=true;
  }
  const resultado=await mermaid.render(id,codigo);
  return resultado.svg;
}

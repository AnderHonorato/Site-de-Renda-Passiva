/**
 * Mermaid auto-hospedado, segurança strict.
 * O texto é renderizado localmente; a interface só exibe SVG sanitizado como <img>.
 */
import mermaid from 'mermaid';
export async function renderizarDiagrama(codigo,id,temaEscolhido='neutro'){
  const tema=temaEscolhido==='escuro'?'dark':temaEscolhido==='claro'?'default':'neutral';
  {
    mermaid.initialize({
      startOnLoad:false,securityLevel:'strict',theme,logLevel:'error',
      flowchart:{htmlLabels:false,diagramPadding:12},
      maxTextSize:10000,maxEdges:180,suppressErrorRendering:true,
    });
  }
  const resultado=await mermaid.render(id,codigo);
  return resultado.svg;
}

/** Diagramas Mermaid no navegador, render em imagem isolada e exportação segura. */
import {montarFerramenta,baixar,ErroDeEntrada} from '../núcleo/montador.js';
import {avisar} from '../núcleo/interface.js';
import {validarDiagrama,nomeSeguroDoDiagrama} from './auxiliares/diagramas-regras.js';
import {limparSvgGerado,transformarPng} from './auxiliares/svg-seguro.js';

let renderizador=null;
async function obterRenderizador(){
 if(!renderizador)renderizador=import('../terceiros/diagramas.js').then(m=>m.renderizarDiagrama)
   .catch(erro=>{renderizador=null;throw erro;});
 return renderizador;
}
export async function gerarDiagramaLocal(dados){
 let entrada;
 try{entrada=validarDiagrama(dados);}
 catch(e){throw new ErroDeEntrada(e.message,e.campo??'codigo');}
 const renderizar=await obterRenderizador();
 try{
  const id='diagrama-portal-'+Math.random().toString(36).slice(2,12);
  const svg=await renderizar(entrada.codigo,id);
  return {...limparSvgGerado(svg),codigo:entrada.codigo,tipo:entrada.tipo};
 }catch(e){
  throw new ErroDeEntrada('Não foi possível gerar o diagrama: '+String(e?.message??e).slice(0,260),'codigo');
 }
}
export default{
 instruções:{
  passos:[
   'Escolha o tipo de desenho (fluxograma, sequência, classes, Gantt ou outro) e edite a sintaxe Mermaid.',
   'Clique em Desenhar ou pare de digitar um instante para atualizar a prévia.',
   'Corrija a sintaxe se aparecer uma mensagem de erro; não é necessário programar JavaScript.',
   'Baixe o diagrama como SVG, PNG ou o código .mmd para editar posteriormente.',
  ],
  exemplo:{texto:'flowchart LR seguido de A[Pedido] --> B{Aprovado?}, B -->|Sim| C[Separação] e B -->|Não| D[Revisão] gera um fluxograma visual de pedidos.'},
  limites:'Até 8.000 caracteres ou 140 linhas. Renderização com Mermaid 11.17.2 local, no modo estrito, sem links executáveis, scripts ou imagens externas. O SVG é sanitizado e mostrado como imagem isolada. PNG é gerado no navegador. Diagramas complexos podem demorar e o resultado não é compartilhado automaticamente.',
  perguntas:[
   {p:'Posso criar diagramas com dados internos?',r:'O texto é processado no navegador. Não há envio ao servidor nem salvamento na conta.'},
   {p:'Por que o código com links ou diretivas é recusado?',r:'O editor foi criado para diagramas estáticos. Links executáveis e configurações que alterem o modo de segurança ficam bloqueados.'},
  ],
 },
 montar(raiz,ferramenta){
  let urlAnterior=null,sequencia=0,debounce=null;
  const preview=document.createElement('section');
  preview.className='diagrama-previa';preview.hidden=true;
  const titulo=document.createElement('p');titulo.textContent='Prévia do diagrama';
  const imagem=document.createElement('img');
  imagem.alt='Prévia do diagrama gerado a partir do texto';
  preview.append(titulo,imagem);
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Desenhar diagrama',demorada:true,
   permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'tema',rótulo:'Visual da exportação',tipo:'seleção',padrão:'neutro',opções:[
     {valor:'neutro',rótulo:'Neutro'}, {valor:'claro',rótulo:'Claro'},
     {valor:'escuro',rótulo:'Escuro'}]},
    {nome:'codigo',rótulo:'Texto Mermaid',tipo:'área',linhas:9,
      padrão:'flowchart LR\n  A[Pedido] --> B{Aprovado?}\n  B -->|Sim| C[Separação]\n  B -->|Não| D[Revisão]\n  C --> E[Expedição]',
      dica:'Sintaxe Mermaid: flowchart, sequenceDiagram, classDiagram, gantt, mindmap...'},
   ],
   calcular:async(dados)=>{
    const vez=++sequencia;
    const resultado=await gerarDiagramaLocal(dados);
    if(vez!==sequencia)throw new ErroDeEntrada('O diagrama foi alterado; processe novamente.','codigo');
    const novoUrl=URL.createObjectURL(new Blob([resultado.svg],{type:'image/svg+xml;charset=utf-8'}));
    if(urlAnterior)URL.revokeObjectURL(urlAnterior);
    urlAnterior=novoUrl;imagem.src=novoUrl;preview.hidden=false;
    const nome=nomeSeguroDoDiagrama(resultado.tipo);
    return {valor:'Diagrama criado',
      resumo:'Prévia e arquivos disponíveis abaixo.',
      linhas:[['Tipo',resultado.tipo],['Largura',resultado.largura+' px'],
        ['Altura',resultado.altura+' px'],['Código',resultado.codigo.length+' caracteres']],
      observações:[
       'Renderização e exportação feitas no navegador; o SVG é sanitizado antes de visualizar ou salvar.',
       'O tema da página não modifica os dados do diagrama; a exportação pode usar fundo claro para melhor leitura.',
       'A sintaxe original .mmd continua editável e é útil para versionar o processo.',
      ],texto:resultado.codigo,
      arquivos:[
       {rótulo:'Baixar SVG',ícone:'baixar',
        gerar:()=>baixar(resultado.svg,nome+'.svg','image/svg+xml;charset=utf-8')},
       {rótulo:'Baixar PNG',ícone:'imagem',
        gerar:async()=>{try{
         const blob=await transformarPng(resultado);
         baixar(blob,nome+'.png','image/png');
        }catch(e){avisar('Não foi possível criar PNG: '+String(e?.message??e));}}},
       {rótulo:'Baixar código .mmd',ícone:'documento',
        gerar:()=>baixar(resultado.codigo,nome+'.mmd','text/plain;charset=utf-8')},
      ],
    };
   },
   aoMontar(_raiz,recalcular){
    raiz.querySelector('#resultado').after(preview);
    const formulario=raiz.querySelector('#formulário');
    formulario.elements.codigo.addEventListener('input',()=>{
      clearTimeout(debounce);
      debounce=setTimeout(()=>{
        if(formulario.elements.codigo.value.trim())void recalcular({focar:false});
      },1100);
    });
    formulario.addEventListener('reset',()=>{
      clearTimeout(debounce);++sequencia;
      preview.hidden=true;imagem.removeAttribute('src');
      if(urlAnterior)URL.revokeObjectURL(urlAnterior);
      urlAnterior=null;
    });
    window.addEventListener('pagehide',()=>{if(urlAnterior)URL.revokeObjectURL(urlAnterior);},{once:true});
   },
  });
 },
};

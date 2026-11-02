/** Etiquetas de expedição A4, quatro por página, criadas localmente. */
import { montarFerramenta, texto, número, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

function quebrar(valor, maximoPorLinha, maximoLinhas) {
  const palavras=String(valor).trim().replace(/\s+/g,' ').split(' ');
  const linhas=[];let linha='';
  for(const original of palavras){
    let palavra=original;
    while(palavra.length>maximoPorLinha){
      if(linha){linhas.push(linha);linha='';}
      linhas.push(palavra.slice(0,maximoPorLinha));
      palavra=palavra.slice(maximoPorLinha);
    }
    if(linha && (linha+' '+palavra).length>maximoPorLinha){linhas.push(linha);linha='';}
    linha=linha?linha+' '+palavra:palavra;
  }
  if(linha)linhas.push(linha);
  if(linhas.length>maximoLinhas)throw new Error('Texto excedeu o espaço disponível na etiqueta. Reduza o endereço.');
  return linhas;
}
export function gerarEtiquetas({remetente,destinatario,endereco,referencia,quantidade}) {
  if(!Number.isSafeInteger(quantidade)||quantidade<1||quantidade>80)throw new Error('Quantidade de 1 a 80.');
  const entradas={remetente,destinatario,endereco,referencia};
  for(const [campo,valor] of Object.entries(entradas)){
    const max=campo==='endereco'?180:campo==='referencia'?32:100;
    if(typeof valor!=='string'||!valor.trim()||valor.length>max)throw new Error('Preencha '+campo+' corretamente.');
  }
  const partes={
    remetente:quebrar(remetente,31,4),
    destinatario:quebrar(destinatario,31,4),
    endereco:quebrar(endereco,31,6),
  };
  const pdf=criarDocumentoPdf({título:'Etiquetas de expedição - '+referencia});
  const escreverBloco=(x,y,rotulo,valores)=>{
    pdf.texto(x,y,rotulo,{tamanho:7.5,negrito:true,cor:'#5c6270'});
    valores.forEach((p,i)=>pdf.texto(x,y+6+i*5,p,{tamanho:9,cor:'#1a1a1a'}));
  };
  for(let i=0;i<quantidade;i++){
    if(i%4===0)pdf.novaPágina();
    const x=10+(i%2)*99;
    const y=10+Math.floor((i%4)/2)*142.5;
    pdf.retângulo(x,y,91,134.5,{cor:'#1a1a1a',espessura:0.25});
    pdf.retângulo(x+0.2,y+0.2,90.6,16,{preenchimento:'#1a1a1a',contorno:false});
    pdf.texto(x+4,y+11,'VOLUME '+(i+1)+' / '+quantidade,{tamanho:12,negrito:true,cor:'#ffffff'});
    pdf.texto(x+4,y+27,'Referência: '+referencia,{tamanho:9,negrito:true});
    pdf.linha(x+3,y+32,x+88,y+32,{cor:'#e2d5c7'});
    escreverBloco(x+4,y+39,'REMETENTE',partes.remetente);
    pdf.linha(x+3,y+66,x+88,y+66,{cor:'#e2d5c7'});
    escreverBloco(x+4,y+73,'DESTINATÁRIO',partes.destinatario);
    pdf.linha(x+3,y+98,x+88,y+98,{cor:'#e2d5c7'});
    escreverBloco(x+4,y+104,'ENDEREÇO / CEP',partes.endereco);
  }
  return {bytes:pdf.gerarBytes(),paginas:Math.ceil(quantidade/4),quantidade};
}
export function calcularEtiquetasNaTela(dados){
  const remetente=texto(dados,'remetente',{rótulo:'Remetente',máximo:100});
  const destinatario=texto(dados,'destinatario',{rótulo:'Destinatário',máximo:100});
  const endereco=texto(dados,'endereco',{rótulo:'Endereço completo e CEP',máximo:180});
  const referencia=texto(dados,'referencia',{rótulo:'Referência do pedido',máximo:32});
  const quantidade=número(dados,'quantidade',{rótulo:'Volumes',mín:1,máx:80,inteiro:true});
  const params={remetente,destinatario,endereco,referencia,quantidade};
  // A validação do espaço acontece antes de oferecer o arquivo para baixar.
  quebrar(remetente,31,4);quebrar(destinatario,31,4);quebrar(endereco,31,6);
  const paginas=Math.ceil(quantidade/4);
  const tabela={cabeçalho:['Etiqueta','Referência','Remetente','Destinatário','Endereço completo'],
    linhas:Array.from({length:quantidade},(_,i)=>[(i+1)+'/'+quantidade,referencia,remetente,destinatario,endereco])};
  const obs=[
   'Quatro etiquetas A4 por página. Imprima o PDF em escala de 100% e confira as medidas antes de recortar.',
   'Este modelo NÃO é etiqueta oficial de transportadora, marketplace ou Correios: não gera código de rastreio ou de barras.',
   'Contatos e endereços são processados no navegador. Não é possível usar “Salvar trabalho” nesta ferramenta.',
   'Confira o endereço completo, número, CEP e complemento antes da expedição.',
  ];
  return {valor:quantidade+' etiqueta(s)',resumo:paginas+' página(s) A4.',
    linhas:[['Pedido',referencia],['Volumes',String(quantidade)],['Páginas',String(paginas)]],
    tabela,observações:obs,texto:['Etiquetas de expedição','Pedido: '+referencia,'Volumes: '+quantidade,
      'Destinatário: '+destinatario,'Endereço: '+endereco,...obs].join('\n'),
    arquivos:[{rótulo:'Baixar etiquetas em PDF',ícone:'documento',
      gerar:()=>baixar(gerarEtiquetas(params).bytes,
      nomeDeArquivo('etiquetas-'+referencia)+'.pdf','application/pdf')}]};
}
export default {
  instruções:{
    passos:[
     'Informe remetente, destinatário, endereço completo com CEP e a referência do pedido.',
     'Indique a quantidade de volumes; cada etiqueta recebe uma numeração sequencial.',
     'Gere o PDF A4 com quatro etiquetas por página.',
     'Imprima em escala de 100%, recorte e confira os dados com a etiqueta oficial da transportadora.',
    ],
    exemplo:{texto:'Pedido PED-100 com 4 volumes: o PDF organiza as etiquetas 1/4, 2/4, 3/4 e 4/4 em uma folha A4.'},
    limites:'Até 80 volumes. Identificação genérica: não emite etiqueta oficial, não valida CEP e não gera rastreio. Endereços não são enviados nem salvos na conta.',
    perguntas:[
      {p:'Serve para postar nos Correios?',r:'Somente como identificação auxiliar. Utilize também a etiqueta oficial exigida pela transportadora.'},
      {p:'Os endereços são enviados para algum servidor?',r:'Não. O PDF é gerado localmente e o botão de salvar na conta está desativado.'},
    ],
  },
  montar(raiz,ferramenta){
    montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Criar etiquetas',
      permitirSalvarTrabalho:false,registrarUsoAtivo:false,
      campos:[
       {nome:'remetente',rótulo:'Remetente',padrão:'Minha loja'},
       {nome:'destinatario',rótulo:'Destinatário',padrão:'Cliente Exemplo'},
       {nome:'endereco',rótulo:'Endereço completo e CEP',tipo:'área',linhas:3,
         padrão:'Rua Exemplo, 123, Bairro, São Paulo - SP, CEP 00000-000'},
       {nome:'referencia',rótulo:'Referência do pedido',padrão:'PED-100'},
       {nome:'quantidade',rótulo:'Volumes',tipo:'número',padrão:'4'},
      ],calcular:calcularEtiquetasNaTela});
  },
};

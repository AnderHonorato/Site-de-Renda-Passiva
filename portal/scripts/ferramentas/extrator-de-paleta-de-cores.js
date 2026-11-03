/** F079 — Amostragem local de cores predominantes com CSS e imagem da paleta. */
import {montarFerramenta,baixar,ErroDeEntrada} from '../núcleo/montador.js';
import {validarArquivoImagem,extrairPaletaRGBA,nomeSeguroImagem}
 from './auxiliares/imagens-puras.js';
import {abrirImagem,criarCanvas,exportarCanvas,montarPreviaImagem}
 from './auxiliares/imagens-navegador.js';

export function converterPaletaEmCSS(cores){
 if(!Array.isArray(cores)||!cores.length)throw new ErroDeEntrada('A paleta está vazia.','arquivo');
 return ':root {\n'+cores.map((c,i)=>'  --cor-'+(i+1)+': '+c.hex+';').join('\n')+'\n}\n';
}
export async function montarPaletaDeImagem(arquivo,quantidade){
 validarArquivoImagem(arquivo);
 const bitmap=await abrirImagem(arquivo);
 try{
  const fator=Math.min(192/bitmap.width,192/bitmap.height,1);
  const largura=Math.max(1,Math.round(bitmap.width*fator));
  const altura=Math.max(1,Math.round(bitmap.height*fator));
  const {tela,ctx}=criarCanvas(largura,altura);
  ctx.clearRect(0,0,largura,altura);
  ctx.drawImage(bitmap,0,0,largura,altura);
  const dados=ctx.getImageData(0,0,largura,altura);
  const cores=extrairPaletaRGBA(dados.data,largura,altura,Number(quantidade));
  tela.width=1;tela.height=1;
  const {tela:saida,ctx:desenho}=criarCanvas(960,240);
  desenho.fillStyle='#fff';desenho.fillRect(0,0,960,240);
  const larguraFaixa=960/cores.length;
  cores.forEach((cor,i)=>{
    const x=i*larguraFaixa;
    desenho.fillStyle=cor.hex;desenho.fillRect(x,0,Math.ceil(larguraFaixa)+1,185);
    desenho.fillStyle='#171717';desenho.font='bold 17px sans-serif';
    desenho.fillText(cor.hex,x+10,210,larguraFaixa-12);
    desenho.font='13px sans-serif';
    desenho.fillText(cor.percentual.toFixed(1)+'%',x+10,231,larguraFaixa-12);
  });
  const blob=await exportarCanvas(saida,'png',1);
  return {cores,blob,amostra:largura+'×'+altura,dimensoes:bitmap.width+'×'+bitmap.height};
 }finally{bitmap.close();}
}
export default{
 instruções:{
  passos:[
    'Escolha uma imagem JPG, PNG ou WebP, como foto de produto ou referência de identidade visual.',
    'Selecione a quantidade aproximada de cores (4, 6 ou 8).',
    'Analise: a ferramenta amostra os pixels, agrupa cores semelhantes e ordena pela predominância.',
    'Copie os hexadecimais e variáveis CSS, exporte CSV/Excel ou baixe a imagem PNG da paleta.',
  ],
  exemplo:{texto:'Uma fotografia de produto com fundo claro e detalhes vermelhos costuma gerar primeiro o tom do fundo, seguido dos tons mais frequentes do próprio produto.'},
  limites:'Amostragem reduzida a no máximo 192 px por lado; os percentuais são estimativas de grupos quantizados, não uma análise de colorimetria calibrada. Pixels transparentes são ignorados. Até 24 megapixels e 18 MB por arquivo. Cores próximas podem aparecer agrupadas.',
  perguntas:[
    {p:'As cores são exatas?',r:'Os códigos da paleta representam cores médias de grupos de pixels semelhantes, úteis para design, não medições calibradas.'},
    {p:'Posso usar no CSS do meu site?',r:'Sim. Copie as variáveis --cor-1, --cor-2 etc. geradas no resultado.'},
  ],
 },
 montar(raiz,ferramenta){
  let previa;
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Extrair cores',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
     {nome:'arquivo',rótulo:'Imagem para análise',tipo:'file'},
     {nome:'quantidade',rótulo:'Quantidade de cores',tipo:'seleção',padrão:'6',opções:[
      {valor:'4',rótulo:'4 cores'}, {valor:'6',rótulo:'6 cores'}, {valor:'8',rótulo:'8 cores'},
     ]},
   ],
   calcular:async(dados)=>{
    previa.limpar();
    const arquivo=raiz.querySelector('[name="arquivo"]')?.files?.[0];
    const r=await montarPaletaDeImagem(arquivo,dados.quantidade);
    previa.mostrar([{nome:'Paleta PNG',blob:r.blob,rotulo:'Paleta pronta para uso em apresentações'}]);
    const css=converterPaletaEmCSS(r.cores);
    const nome=nomeSeguroImagem(arquivo.name,'paleta','png');
    return {valor:r.cores.length+' cores extraídas',resumo:'Paleta pronta para usar em layouts e identidades visuais.',
     linhas:[['Imagem original',r.dimensoes],['Amostra de análise',r.amostra],['Cor mais frequente',r.cores[0].hex]],
     tabela:{cabeçalho:['Posição','Hexadecimal','RGB','Predominância aproximada'],
       linhas:r.cores.map((c,i)=>[String(i+1),c.hex,c.rgb,c.percentual.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'])},
     observações:['Cores coletadas por quantização; porcentagens mostram fração de pixels daquele grupo, não da paleta inteira.',
       'A prévia PNG e as variáveis CSS são geradas apenas no navegador.'],
     texto:css,
     arquivos:[
      {rótulo:'Baixar paleta PNG',ícone:'baixar',gerar:()=>baixar(r.blob,nome,'image/png')},
      {rótulo:'Baixar variáveis CSS',ícone:'baixar',gerar:()=>baixar(css,'paleta-cores.css','text/css;charset=utf-8')},
     ],
    };
   },
   aoMontar(){
    raiz.querySelector('[name="arquivo"]').accept='image/png,image/jpeg,image/webp';
    previa=montarPreviaImagem(raiz,{titulo:'Paleta encontrada'});
   },
  });
 },
};

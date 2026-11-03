/** F073 — Redimensionamento profissional em lote, proporção mantida e ZIP local. */
import { montarFerramenta,baixar,número,ErroDeEntrada } from '../núcleo/montador.js';
import { criarZip } from '../cálculos/zip.js';
import { validarLoteImagem,planejarRedimensionamento,formatoDaSaida,qualidadeImagem,
  nomeSeguroImagem,tamanhoHumano } from './auxiliares/imagens-puras.js';
import { abrirImagem,criarCanvas,exportarCanvas,montarPreviaImagem } from './auxiliares/imagens-navegador.js';

export function validarLoteOpcoes(dados){
 const largura=número(dados,'largura',{rótulo:'Largura máxima',mín:64,máx:8192,inteiro:true});
 const altura=número(dados,'altura',{rótulo:'Altura máxima',mín:64,máx:8192,inteiro:true});
 const qualidade=qualidadeImagem(dados.qualidade);
 const {formato,tipo,extensao}=formatoDaSaida(dados.formato);
 return {largura,altura,qualidade,formato,tipo,extensao};
}
export async function redimensionarLote(arquivos,dados){
 const lista=validarLoteImagem(arquivos),op=validarLoteOpcoes(dados);
 const resultados=[];
 for(const [indice,arquivo] of lista.entries()){
  const bitmap=await abrirImagem(arquivo,'arquivos');
  try{
   const plano=planejarRedimensionamento(bitmap.width,bitmap.height,op.largura,op.altura);
   const {tela,ctx}=criarCanvas(plano.largura,plano.altura);
   if(op.formato==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,tela.width,tela.height);}
   ctx.drawImage(bitmap,0,0,tela.width,tela.height);
   const blob=await exportarCanvas(tela,op.formato,op.qualidade);
   resultados.push({nome:nomeSeguroImagem(arquivo.name,String(indice+1).padStart(2,'0')+'-redim',op.extensao),
      blob,origem:arquivo.size,largura:plano.largura,altura:plano.altura,originalL:bitmap.width,originalA:bitmap.height});
  }finally{bitmap.close();}
 }
 const zipped=await criarZip(await Promise.all(resultados.map(async r=>({nome:r.nome,
   bytes:new Uint8Array(await r.blob.arrayBuffer())}))),{comprimir:false});
 return {resultados,zip:zipped.bytes,op};
}
export default{
 instruções:{
  passos:[
   'Selecione até 12 fotos JPG, PNG ou WebP; nenhum arquivo será enviado ao servidor.',
   'Informe largura e altura máximas, formato de saída e qualidade de compressão.',
   'Gere o lote: cada imagem será ajustada dentro da caixa de medidas sem distorcer e sem ampliar imagens pequenas.',
   'Confira os tamanhos individuais e baixe o ZIP de imagens prontas para loja, catálogo ou redes sociais.',
  ],
  exemplo:{texto:'Uma foto 4000×3000, com limite 1200×1200, sai em 1200×900. Uma imagem de 800×800 não é ampliada.'},
  limites:'Até 12 arquivos, máximo 18 MB cada, 56 MB somados, 24 megapixels por imagem. A ferramenta preserva proporções e não promete peso exato em KB. Saída JPEG perde transparência; PNG/WebP podem preservá-la. O ZIP é criado localmente.',
  perguntas:[
   {p:'Posso redimensionar fotos para um marketplace?',r:'Sim. Defina os limites aceitos pelo marketplace e confira a prévia e o resultado antes de publicar.'},
   {p:'O arquivo sempre fica menor?',r:'Não. Depende do formato original e das configurações. Os pesos reais aparecem na tabela.'},
  ],
 },
 montar(raiz,ferramenta){
  let previa;
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Processar lote',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'arquivos',rótulo:'Imagens (até 12)',tipo:'file',dica:'JPG, PNG ou WebP. Selecione vários arquivos de uma vez.'},
    {nome:'largura',rótulo:'Largura máxima (px)',tipo:'número',padrão:'1200'},
    {nome:'altura',rótulo:'Altura máxima (px)',tipo:'número',padrão:'1200'},
    {nome:'formato',rótulo:'Formato final',tipo:'seleção',padrão:'webp',opções:[
     {valor:'webp',rótulo:'WebP'},{valor:'jpeg',rótulo:'JPG'},{valor:'png',rótulo:'PNG'}]},
    {nome:'qualidade',rótulo:'Qualidade JPG/WebP (20–100)',tipo:'número',padrão:'85'},
   ],
   calcular:async(dados)=>{
    previa.limpar();
    const arquivos=raiz.querySelector('[name="arquivos"]').files;
    const r=await redimensionarLote(arquivos,dados);
    previa.mostrar(r.resultados.map(it=>({nome:it.nome,blob:it.blob,
      rotulo:it.largura+'×'+it.altura+' · '+tamanhoHumano(it.blob.size)})));
    const pesoOriginal=r.resultados.reduce((s,x)=>s+x.origem,0);
    const pesoFinal=r.resultados.reduce((s,x)=>s+x.blob.size,0);
    return {valor:r.resultados.length+' imagem(ns) prontas',
     resumo:'Pacote ZIP gerado no aparelho. Fotos originais preservadas.',
     linhas:[['Peso original total',tamanhoHumano(pesoOriginal)],['Peso das imagens finais',tamanhoHumano(pesoFinal)],
       ['Pacote ZIP',tamanhoHumano(r.zip.byteLength)]],
     tabela:{cabeçalho:['Arquivo','Original','Saída','Dimensões'],
       linhas:r.resultados.map(x=>[x.nome,tamanhoHumano(x.origem),tamanhoHumano(x.blob.size),x.largura+'×'+x.altura])},
     observações:['A proporção é preservada; imagens pequenas não são ampliadas. O ZIP contém imagens reais e nomes únicos.',
       'Não há promessa de tamanho exato em KB nem envio a servidores.'],
     arquivos:[{rótulo:'Baixar pacote ZIP',ícone:'baixar',
       gerar:()=>baixar(r.zip,'imagens-redimensionadas.zip','application/zip')}],
    };
   },
   aoMontar(){
    const input=raiz.querySelector('[name="arquivos"]');
    input.multiple=true;input.accept='image/png,image/jpeg,image/webp';
    previa=montarPreviaImagem(raiz,{titulo:'Prévia das imagens redimensionadas',varias:true});
   },
  });
 },
};

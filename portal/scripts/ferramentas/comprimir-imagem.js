/** Compressão de JPG/WebP no próprio navegador com prévia e comparação de tamanho. */
import { montarFerramenta, baixar, ErroDeEntrada } from '../núcleo/montador.js';
export const LIMITES={bytes:20*1024*1024,pixels:24_000_000,lado:8192};
export function validarOpcoes({qualidade,largura,formato},dimensoes){
 const q=Number(qualidade),w=Number(largura);
 if(!Number.isInteger(q)||q<20||q>95)throw new ErroDeEntrada('Qualidade deve ser um inteiro entre 20 e 95.','qualidade');
 if(!['jpeg','webp'].includes(formato))throw new ErroDeEntrada('Escolha JPG ou WebP.','formato');
 if(!Number.isInteger(w)||w<0||w>LIMITES.lado)throw new ErroDeEntrada('Largura máxima inválida (0 a 8192).','largura');
 if(!Number.isInteger(dimensoes.largura)||!Number.isInteger(dimensoes.altura)||
 dimensoes.largura<1||dimensoes.altura<1||dimensoes.largura*dimensoes.altura>LIMITES.pixels)
 throw new ErroDeEntrada('Imagem acima de 24 megapixels ou dimensões inválidas.','arquivo');
 const larguraFinal=w===0?dimensoes.largura:Math.min(w,dimensoes.largura);
 const altura=Math.max(1,Math.round(dimensoes.altura*larguraFinal/dimensoes.largura));
 if(larguraFinal>LIMITES.lado||altura>LIMITES.lado)throw new ErroDeEntrada('Imagem excede 8192 pixels de lado. Reduza a largura.','largura');
 return {qualidade:q/100,largura:larguraFinal,altura,tipo:formato==='jpeg'?'image/jpeg':'image/webp',extensao:formato==='jpeg'?'jpg':'webp'};
}
export function compararTamanhos(original,final){
 if(!Number.isFinite(original)||original<=0||!Number.isFinite(final)||final<=0)throw new Error('Tamanhos inválidos.');
 const percentual=(1-final/original)*100;
 return {percentual,economia:original-final,menor:final<original};
}
function tamanho(bytes){return (bytes/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB';}
export async function comprimirArquivo(arquivo,opcoes){
 if(!arquivo||arquivo.size===0||arquivo.size>LIMITES.bytes)throw new ErroDeEntrada('Escolha uma imagem de até 20 MB.','arquivo');
 if(!['image/jpeg','image/png','image/webp'].includes(arquivo.type))throw new ErroDeEntrada('Escolha JPG, PNG ou WebP.','arquivo');
 let bitmap;
 try{bitmap=await createImageBitmap(arquivo,{imageOrientation:'from-image'});}
 catch{throw new ErroDeEntrada('Imagem inválida ou não reconhecida pelo navegador.','arquivo');}
 try{
  const o=validarOpcoes(opcoes,{largura:bitmap.width,altura:bitmap.height});
  const tela=document.createElement('canvas');
  tela.width=o.largura;tela.height=o.altura;
  const ctx=tela.getContext('2d');
  if(!ctx)throw new Error('Memória insuficiente para processar a imagem.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,tela.width,tela.height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,0,0,tela.width,tela.height);
  const resultado=await new Promise(resolve=>tela.toBlob(resolve,o.tipo,o.qualidade));
  tela.width=1;tela.height=1;
  if(!resultado||resultado.type!==o.tipo)throw new Error('O navegador não conseguiu gerar o formato escolhido.');
  const comparacao=compararTamanhos(arquivo.size,resultado.size);
  return {blob:resultado,comparacao,largura:o.largura,altura:o.altura,extensao:o.extensao};
 }finally{bitmap.close();}
}
export default {
 instruções:{
  passos:['Selecione uma imagem JPG, PNG ou WebP (até 20 MB).','Escolha JPG ou WebP e ajuste a qualidade entre 20 e 95.','Opcionalmente defina uma largura menor; zero mantém as dimensões originais.','Clique em Comprimir, confira a prévia e a economia real em bytes e baixe a nova imagem.'],
  exemplo:{texto:'Uma imagem JPG de 2 MB pode diminuir ao usar WebP com qualidade 75. O resultado varia conforme o conteúdo e a compressão original.'},
  limites:'Arquivo de até 20 MB, imagem de até 24 megapixels e saída de até 8192 pixels de lado. PNG com transparência ganha fundo branco ao converter. O navegador pode não suportar WebP. O arquivo nunca é enviado ao servidor.',
  perguntas:[{p:'A imagem pode ficar maior?',r:'Sim. O resultado mostra o tamanho real, inclusive quando a recompressão aumenta o arquivo.'},{p:'Posso manter transparência?',r:'Não nesta ferramenta: JPG e WebP são gerados sobre fundo branco. Use o editor de fotos para manter PNG transparente.'}],
 },
 montar(raiz,ferramenta){
  let urlPrevia=null;
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Comprimir imagem',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'arquivo',rótulo:'Imagem (JPG, PNG ou WebP)',tipo:'file'},
    {nome:'formato',rótulo:'Formato de saída',tipo:'seleção',padrão:'webp',opções:[{valor:'webp',rótulo:'WebP'},{valor:'jpeg',rótulo:'JPG'}]},
    {nome:'qualidade',rótulo:'Qualidade (20 a 95)',tipo:'número',padrão:'75'},
    {nome:'largura',rótulo:'Largura máxima em pixels (0 = original)',tipo:'número',padrão:'0'},
   ],
   calcular:async(dados)=>{
    const arquivo=raiz.querySelector('[name="arquivo"]')?.files?.[0];
    const r=await comprimirArquivo(arquivo,dados);
    if(urlPrevia)URL.revokeObjectURL(urlPrevia);
    urlPrevia=URL.createObjectURL(r.blob);
    const nome=String(arquivo.name).replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60)||'imagem';
    return {valor:r.comparacao.menor?'Imagem reduzida':'Imagem processada',
      resumo:r.comparacao.menor?'Economia de '+r.comparacao.percentual.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%.':'O arquivo final não ficou menor. Experimente diminuir qualidade ou largura.',
      linhas:[['Original',tamanho(arquivo.size)],['Final',tamanho(r.blob.size)],['Diferença',tamanho(Math.abs(r.comparacao.economia))+(r.comparacao.menor?' economizados':' a mais')],['Dimensões',r.largura+' × '+r.altura+' px']],
      observações:['A prévia do resultado aparece abaixo. O arquivo original não é alterado.'],
      arquivos:[{rótulo:'Baixar imagem '+r.extensao.toUpperCase(),gerar:()=>baixar(r.blob,nome+'-comprimida.'+r.extensao,r.blob.type)}]};
   },
   aoMontar(){
    const form=raiz.querySelector('#formulário');
    const preview=document.createElement('div');
    preview.className='compressao-previa';preview.hidden=true;
    const titulo=document.createElement('p');titulo.textContent='Prévia do arquivo comprimido';
    const imagem=document.createElement('img');imagem.alt='Imagem comprimida pronta para baixar';
    preview.append(titulo,imagem);
    raiz.querySelector('#resultado').after(preview);
    const observar=new MutationObserver(()=>{
      if(!raiz.querySelector('#resultado').hidden&&urlPrevia){imagem.src=urlPrevia;preview.hidden=false;}
      else preview.hidden=true;
    });
    observar.observe(raiz.querySelector('#resultado'),{attributes:true,attributeFilter:['hidden']});
    form.addEventListener('reset',()=>{preview.hidden=true;imagem.removeAttribute('src');if(urlPrevia)URL.revokeObjectURL(urlPrevia);urlPrevia=null;});
    window.addEventListener('pagehide',()=>{if(urlPrevia)URL.revokeObjectURL(urlPrevia);},{once:true});
   },
  });
 },
};

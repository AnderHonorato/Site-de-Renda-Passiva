/** Regras e empacotamento do gerador de favicons, sem bibliotecas remotas. */
import { criarZip } from '../cálculos/zip.js';

export const LIMITES_FAVICON = Object.freeze({
  arquivo: 15*1024*1024, pixels: 16_000_000, lado: 8192,
});
export const TAMANHOS_FAVICON = Object.freeze([
  { nome:'favicon-16x16.png',lado:16 },
  { nome:'favicon-32x32.png',lado:32 },
  { nome:'favicon-48x48.png',lado:48 },
  { nome:'apple-touch-icon.png',lado:180 },
  { nome:'android-chrome-192x192.png',lado:192 },
  { nome:'android-chrome-512x512.png',lado:512 },
]);
const NOMES_ICO = ['favicon-16x16.png','favicon-32x32.png','favicon-48x48.png'];
const CODIFICADOR = new TextEncoder();

export class ErroFavicon extends Error {
  constructor(mensagem,campo='arquivo') {super(mensagem);this.name='ErroFavicon';this.campo=campo;}
}
export function validarOpcaoFavicon(opcoes={}) {
  const nome=String(opcoes.nome??'Meu site').trim();
  const encaixe=String(opcoes.encaixe??'conter');
  const fundo=String(opcoes.fundo??'transparente');
  if(!nome||nome.length>70||/[\x00-\x1F\x7F]/.test(nome))
    throw new ErroFavicon('Nome do site deve ter entre 1 e 70 caracteres, sem controles.','nome');
  if(!['conter','preencher'].includes(encaixe))
    throw new ErroFavicon('Escolha conter a imagem ou preencher o quadrado.','encaixe');
  if(!['transparente','branco','escuro'].includes(fundo))
    throw new ErroFavicon('Escolha uma das três opções de fundo.','fundo');
  return {nome,encaixe,fundo};
}

export function validarImagemFavicon(arquivo,largura,altura) {
  if(!arquivo||!Number.isFinite(arquivo.size)||arquivo.size<1||arquivo.size>LIMITES_FAVICON.arquivo)
    throw new ErroFavicon('Escolha um arquivo de imagem de até 15 MB.');
  if(!['image/png','image/jpeg','image/webp'].includes(arquivo.type))
    throw new ErroFavicon('Use somente imagem PNG, JPG ou WebP.');
  if(!Number.isInteger(largura)||!Number.isInteger(altura)||largura<1||altura<1||
      largura>LIMITES_FAVICON.lado||altura>LIMITES_FAVICON.lado||
      largura*altura>LIMITES_FAVICON.pixels)
    throw new ErroFavicon('Imagem inválida, maior que 8192 px de lado ou 16 megapixels.');
  return {largura,altura,pequena:Math.min(largura,altura)<64};
}

function conferirPng(png) {
  if(!(png instanceof Uint8Array)||png.length<24||
    ![137,80,78,71,13,10,26,10].every((x,i)=>png[i]===x))
    throw new ErroFavicon('O navegador não conseguiu gerar o PNG necessário.');
  return png;
}

/** ICO 0.0.1 contém três imagens PNG válidas, formato aceito por navegadores modernos. */
export function montarIco(pngs) {
  if(!Array.isArray(pngs)||pngs.length!==3)
    throw new ErroFavicon('ICO requer PNGs de 16, 32 e 48 pixels.');
  const lados=[16,32,48];
  for (let i=0;i<3;i++){
    if(pngs[i]?.lado!==lados[i])throw new ErroFavicon('Ordem ou tamanho da imagem ICO inválido.');
    conferirPng(pngs[i].bytes);
  }
  const total=6+16*3+pngs.reduce((n,p)=>n+p.bytes.length,0);
  const saida=new Uint8Array(total),visao=new DataView(saida.buffer);
  visao.setUint16(0,0,true);visao.setUint16(2,1,true);visao.setUint16(4,3,true);
  let pos=6+16*3;
  for(let i=0;i<3;i++){
    const e=6+i*16,p=pngs[i];
    saida[e]=p.lado;saida[e+1]=p.lado;
    saida[e+2]=0;saida[e+3]=0;
    visao.setUint16(e+4,1,true);
    visao.setUint16(e+6,32,true);
    visao.setUint32(e+8,p.bytes.length,true);
    visao.setUint32(e+12,pos,true);
    saida.set(p.bytes,pos);pos+=p.bytes.length;
  }
  return saida;
}

export function manifestoFavicon(nome, fundo='transparente'){
  const op=validarOpcaoFavicon({nome,fundo});
  return JSON.stringify({
    name:op.nome,
    short_name:op.nome.slice(0,24),
    icons:[
      {src:'./android-chrome-192x192.png',sizes:'192x192',type:'image/png'},
      {src:'./android-chrome-512x512.png',sizes:'512x512',type:'image/png'},
    ],
    theme_color:op.fundo==='escuro'?'#151515':'#ffffff',
    background_color:op.fundo==='escuro'?'#151515':'#ffffff',
    display:'standalone',
    start_url:'./',scope:'./',
  },null,2)+'\n';
}

export function codigoHtmlFavicon() {
  return [
    '<!-- Coloque os arquivos na mesma pasta pública que esta página -->',
    '<link rel="icon" href="./favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="./favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">',
    '<link rel="manifest" href="./site.webmanifest">',
  ].join('\n')+'\n';
}

export function prepararArquivosFavicon(pngs,configuracao){
  const op=validarOpcaoFavicon(configuracao);
  if(!Array.isArray(pngs)||pngs.length!==TAMANHOS_FAVICON.length)
    throw new ErroFavicon('O pacote deve conter seis resoluções.');
  const mapa=new Map(pngs.map(p=>[p.nome,p]));
  const arquivos=TAMANHOS_FAVICON.map(({nome,lado})=>{
    const encontrado=mapa.get(nome);
    if(!encontrado||encontrado.lado!==lado)
      throw new ErroFavicon('Resolução ausente ou incorreta: '+nome);
    return {nome,bytes:conferirPng(encontrado.bytes)};
  });
  const ico=montarIco(NOMES_ICO.map(nome=>mapa.get(nome)));
  arquivos.push({nome:'favicon.ico',bytes:ico});
  arquivos.push({nome:'site.webmanifest',bytes:CODIFICADOR.encode(manifestoFavicon(op.nome,op.fundo))});
  arquivos.push({nome:'codigo-para-head.html',bytes:CODIFICADOR.encode(codigoHtmlFavicon())});
  arquivos.push({nome:'LEIA-ME.txt',bytes:CODIFICADOR.encode([
    'PACOTE DE FAVICONS — INSTALAÇÃO',
    '',
    '1. Copie todos os arquivos do ZIP para a pasta pública de sua página inicial.',
    '2. Insira os links do arquivo codigo-para-head.html no elemento <head> da página.',
    '3. Se já houver links rel="icon" antigos, remova-os para evitar conflitos.',
    '4. Limpe o cache do navegador ou abra em uma aba privada para verificar os ícones.',
    '5. Para sites hospedados em subpasta, ajuste os caminhos ./ para a pasta pública real.',
    '6. O manifesto ajuda com ícones, mas NÃO torna o site um PWA instalável sozinho.',
    '',
    'Dimensões PNG: 16, 32, 48, 180, 192 e 512 pixels.',
    'favicon.ico: contém PNGs de 16, 32 e 48 pixels.',
    'Os pixels são recriados em canvas; metadados da imagem original não são copiados.',
  ].join('\n')+'\n')});
  return arquivos;
}

export async function gerarZipFavicon(pngs,opcoes){
  const arquivos=prepararArquivosFavicon(pngs,opcoes);
  const {bytes}=await criarZip(arquivos,{comprimir:false});
  return {bytes,arquivos};
}

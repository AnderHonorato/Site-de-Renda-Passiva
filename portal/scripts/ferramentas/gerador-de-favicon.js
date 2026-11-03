/** Gerador de favicon para sites: ICO + seis PNGs e arquivos de instalação. */
import { montarFerramenta, baixar, ErroDeEntrada, nomeDeArquivo } from '../núcleo/montador.js';
import {
  LIMITES_FAVICON, TAMANHOS_FAVICON, ErroFavicon, validarOpcaoFavicon,
  validarImagemFavicon, gerarZipFavicon, codigoHtmlFavicon,
} from './auxiliares/favicon-pacote.js';

async function renderizarPng(bitmap,lado,opcoes) {
  const canvas=document.createElement('canvas');
  canvas.width=lado;canvas.height=lado;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new ErroDeEntrada('Seu aparelho não tem memória suficiente para criar este PNG.','arquivo');
  if(opcoes.fundo!=='transparente'){
    ctx.fillStyle=opcoes.fundo==='branco'?'#FFFFFF':'#151515';
    ctx.fillRect(0,0,lado,lado);
  }
  const margem=opcoes.encaixe==='conter'?lado*.07:0;
  const disponivel=lado-2*margem;
  const fator=opcoes.encaixe==='conter'
    ?Math.min(disponivel/bitmap.width,disponivel/bitmap.height)
    :Math.max(lado/bitmap.width,lado/bitmap.height);
  const largura=bitmap.width*fator,altura=bitmap.height*fator;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,(lado-largura)/2,(lado-altura)/2,largura,altura);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  canvas.width=1;canvas.height=1;
  if(!blob||blob.type!=='image/png')
    throw new ErroDeEntrada('Não foi possível exportar PNG neste navegador.','arquivo');
  return new Uint8Array(await blob.arrayBuffer());
}
export async function criarPacoteDeFavicon(arquivo,dados) {
  let opcoes;
  try{opcoes=validarOpcaoFavicon(dados);}
  catch(e){if(e instanceof ErroFavicon)throw new ErroDeEntrada(e.message,e.campo);throw e;}
  if(!arquivo||arquivo.size<1||arquivo.size>LIMITES_FAVICON.arquivo||
    !['image/png','image/jpeg','image/webp'].includes(arquivo.type))
    throw new ErroDeEntrada('Escolha imagem PNG, JPG ou WebP com até 15 MB.','arquivo');
  if(typeof createImageBitmap!=='function')
    throw new ErroDeEntrada('Seu navegador não permite abrir imagens locais. Atualize-o.','arquivo');
  let bitmap;
  try{bitmap=await createImageBitmap(arquivo,{imageOrientation:'from-image'});}
  catch{throw new ErroDeEntrada('Não foi possível abrir a imagem escolhida.','arquivo');}
  try{
    let avaliacao;
    try{avaliacao=validarImagemFavicon(arquivo,bitmap.width,bitmap.height);}
    catch(e){if(e instanceof ErroFavicon)throw new ErroDeEntrada(e.message,e.campo);throw e;}
    const pngs=[];
    for(const {nome,lado} of TAMANHOS_FAVICON)
      pngs.push({nome,lado,bytes:await renderizarPng(bitmap,lado,opcoes)});
    const zip=await gerarZipFavicon(pngs,opcoes);
    return {pngs,bytes:zip.bytes,arquivos:zip.arquivos,opcoes,avaliacao};
  }finally{bitmap.close();}
}
function exibirTamanho(bytes){
  return bytes<1024?bytes+' B':(bytes/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' KB';
}
export default{
  instruções:{
    passos:[
      'Selecione um logotipo ou ícone JPG, PNG ou WebP. Para melhor nitidez, use imagem quadrada de ao menos 512 × 512 pixels.',
      'Escolha “Conter”, para manter a imagem inteira e adicionar uma margem, ou “Preencher”, para ocupar o quadrado e cortar as laterais se necessário.',
      'Escolha um fundo transparente, branco ou escuro e informe o nome do site.',
      'Clique em Gerar pacote, confira as prévias e baixe o ZIP com ICO, PNGs, manifesto e HTML de instalação.',
    ],
    exemplo:{texto:'A partir de uma imagem quadrada de 512 × 512 px, são gerados favicon.ico com 16/32/48 px, seis PNGs para navegadores e celulares, site.webmanifest e um trecho HTML para copiar ao cabeçalho.'},
    limites:'Imagem PNG, JPG ou WebP de até 15 MB, no máximo 16 megapixels e 8192 pixels por lado. Imagens muito pequenas podem gerar ícones borrados. O pacote não torna o site um PWA instalável sozinho. Nenhuma imagem é enviada ao servidor.',
    perguntas:[
      {p:'Como instalo no meu site?',r:'Extraia o ZIP na pasta pública do site, adicione os links do arquivo codigo-para-head.html dentro da tag <head> e remova referências antigas conflitantes.'},
      {p:'Por que gerar ICO além dos PNGs?',r:'O ICO reúne três resoluções populares em um arquivo para compatibilidade ampla. Os PNGs também atendem ícones para Apple e Android.'},
      {p:'Por que um JPG não fica transparente?',r:'JPG não tem transparência original. O modo de fundo transparente preserva a aparência dos pixels, inclusive o fundo da imagem original.'},
    ],
  },
  montar(raiz,ferramenta) {
    const preview=document.createElement('section');
    preview.className='favicon-previas';preview.hidden=true;
    const titulo=document.createElement('h3');titulo.textContent='Prévia dos tamanhos gerados';
    const grade=document.createElement('div');grade.className='favicon-previas__grade';
    preview.append(titulo,grade);
    let urls=[];
    function limpar() {
      for(const url of urls)URL.revokeObjectURL(url);
      urls=[];grade.replaceChildren();preview.hidden=true;
    }
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Gerar pacote de ícones',demorada:true,
      permitirSalvarTrabalho:false,registrarUsoAtivo:false,
      campos:[
        {nome:'arquivo',rótulo:'Imagem original (JPG, PNG ou WebP)',tipo:'file',dica:'Até 15 MB. Recomendado: quadrada, ao menos 512 × 512 px.'},
        {nome:'nome',rótulo:'Nome do site',padrão:'Minha loja'},
        {nome:'encaixe',rótulo:'Encaixe da imagem',tipo:'seleção',padrão:'conter',opções:[
          {valor:'conter',rótulo:'Conter (sem cortes, com margem)'},
          {valor:'preencher',rótulo:'Preencher (pode cortar as bordas)'},
        ]},
        {nome:'fundo',rótulo:'Fundo',tipo:'seleção',padrão:'transparente',opções:[
          {valor:'transparente',rótulo:'Transparente'},
          {valor:'branco',rótulo:'Branco'},
          {valor:'escuro',rótulo:'Escuro'},
        ]},
      ],
      calcular:async(dados)=>{
        limpar();
        const arquivo=raiz.querySelector('[name="arquivo"]')?.files?.[0];
        const r=await criarPacoteDeFavicon(arquivo,dados);
        for(const item of r.pngs){
          const card=document.createElement('div');
          card.className='favicon-previas__item';
          const imagem=document.createElement('img');
          imagem.alt='Favicon de '+item.lado+' pixels';
          imagem.width=item.lado;imagem.height=item.lado;
          const url=URL.createObjectURL(new Blob([item.bytes],{type:'image/png'}));
          urls.push(url);imagem.src=url;
          const texto=document.createElement('small');
          texto.textContent=item.lado+' × '+item.lado+' px';
          card.append(imagem,texto);grade.append(card);
        }
        preview.hidden=false;
        const observacoes=[
          'O ZIP tem 10 arquivos: favicon.ico, 6 PNGs, manifesto, HTML de instalação e instruções.',
          r.avaliacao.pequena?'A imagem original é pequena (menos de 64 px no menor lado). Os ícones grandes podem ficar borrados.':
            'Ícones gerados com redimensionamento proporcional de alta qualidade.',
          r.avaliacao.largura!==r.avaliacao.altura?
            'A imagem original não era quadrada; confira o encaixe na prévia e ajuste se necessário.':
            'A proporção quadrada da imagem de origem foi preservada.',
          'A prévia aparece abaixo do resultado. Todos os arquivos são gerados localmente; nenhuma imagem é enviada.',
          'Se o seu site estiver hospedado numa subpasta, ajuste os caminhos relativos do HTML conforme a estrutura da publicação.',
        ];
        const nome=nomeDeArquivo(r.opcoes.nome)||'favicon';
        return {
          valor:'Pacote de favicon pronto',
          resumo:'10 arquivos para instalar no site.',
          linhas:[['Origem',r.avaliacao.largura+' × '+r.avaliacao.altura+' px'],
            ['Resoluções PNG','16, 32, 48, 180, 192 e 512 px'],
            ['ICO','16, 32 e 48 px em um arquivo'],
            ['Pacote ZIP',exibirTamanho(r.bytes.length)]],
          observações:observacoes,
          texto:codigoHtmlFavicon(),
          arquivos:[{
            rótulo:'Baixar pacote ZIP',ícone:'baixar',
            gerar:()=>baixar(r.bytes,nome+'-favicon.zip','application/zip'),
          },{
            rótulo:'Baixar favicon.ico',ícone:'baixar',
            gerar:()=>baixar(r.arquivos.find(i=>i.nome==='favicon.ico').bytes,'favicon.ico','image/x-icon'),
          }],
        };
      },
      aoMontar(){
        raiz.querySelector('#resultado').after(preview);
        const form=raiz.querySelector('#formulário');
        const observer=new MutationObserver(()=>{
          if(raiz.querySelector('#resultado').hidden)preview.hidden=true;
        });
        observer.observe(raiz.querySelector('#resultado'),{attributes:true,attributeFilter:['hidden']});
        form.addEventListener('reset',limpar);
        window.addEventListener('pagehide',()=>{limpar();observer.disconnect();},{once:true});
      },
    });
  },
};

/** F075 — Conversor de formatos reais JPG, PNG e WebP; transparência configurável. */
import {montarFerramenta,baixar} from '../núcleo/montador.js';
import {validarArquivoImagem,formatoDaSaida,qualidadeImagem,nomeSeguroImagem,tamanhoHumano}
 from './auxiliares/imagens-puras.js';
import {transformarImagem,montarPreviaImagem} from './auxiliares/imagens-navegador.js';
export async function converterImagem(arquivo,dados){
 validarArquivoImagem(arquivo);
 const op=formatoDaSaida(dados.formato),qualidade=qualidadeImagem(dados.qualidade);
 if(!['branco','preto','transparente'].includes(dados.fundo)){
  const {ErroDeEntrada}=await import('../núcleo/montador.js');
  throw new ErroDeEntrada('Escolha um fundo válido.','fundo');
 }
 const fundo=op.formato==='jpeg'&&dados.fundo==='transparente'?'branco':dados.fundo;
 const r=await transformarImagem(arquivo,{formato:op.formato,qualidade,fundo});
 return {...r,nome:nomeSeguroImagem(arquivo.name,'convertida',op.extensao),formato:op.formato,
  fundoAplicado:fundo};
}
export default{
 instruções:{
  passos:[
   'Escolha uma imagem JPG, PNG ou WebP do aparelho.',
   'Selecione o formato de saída: PNG para transparência, JPG para fotos ou WebP para uso na web.',
   'Ajuste a qualidade (JPG/WebP) e o fundo para imagens transparentes.',
   'Converta, confira a prévia e baixe o arquivo sem enviar a imagem ao servidor.',
  ],
  exemplo:{texto:'Uma arte PNG com transparência pode ser convertida em WebP transparente; ao escolher JPG, as partes vazias recebem o fundo selecionado.'},
  limites:'Até 18 MB e 24 megapixels por arquivo. O navegador precisa oferecer codificação para o formato escolhido. JPEG não aceita transparência; converter para ele preenche o fundo. Converter não garante diminuir o tamanho.',
  perguntas:[
   {p:'O WebP mantém transparência?',r:'Sim, se o fundo escolhido for transparente e o navegador suportar WebP.'},
   {p:'Por que a versão JPG mudou o fundo?',r:'JPG não aceita canal alfa, então é necessário aplicar uma cor sólida.'},
  ],
 },
 montar(raiz,ferramenta){
  let previa;
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Converter imagem',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'arquivo',rótulo:'Imagem original',tipo:'file'},
    {nome:'formato',rótulo:'Formato final',tipo:'seleção',padrão:'webp',opções:[
     {valor:'webp',rótulo:'WebP'}, {valor:'jpeg',rótulo:'JPG'}, {valor:'png',rótulo:'PNG'},
    ]},
    {nome:'fundo',rótulo:'Fundo da imagem',tipo:'seleção',padrão:'transparente',opções:[
     {valor:'transparente',rótulo:'Manter transparência'}, {valor:'branco',rótulo:'Branco'},
     {valor:'preto',rótulo:'Preto'},
    ]},
    {nome:'qualidade',rótulo:'Qualidade JPG/WebP',tipo:'número',padrão:'85'},
   ],
   calcular:async(dados)=>{
    previa.limpar();
    const arquivo=raiz.querySelector('[name="arquivo"]')?.files?.[0];
    const r=await converterImagem(arquivo,dados);
    previa.mostrar([{nome:r.nome,blob:r.blob}]);
    return {valor:'Conversão concluída',resumo:'Novo arquivo '+r.formato.toUpperCase()+' disponível.',
     linhas:[['Formato original',arquivo.type],['Formato final',r.blob.type],
       ['Dimensões',r.largura+'×'+r.altura+' px'],['Original',tamanhoHumano(arquivo.size)],
       ['Final',tamanhoHumano(r.blob.size)]],
     observações:['A imagem foi recodificada. Metadados incorporados ao arquivo original normalmente não são mantidos.',
      r.formato==='jpeg'?'JPG não possui transparência; o fundo foi preenchido.':'Transparência é preservada quando o fundo escolhido permite.'],
     arquivos:[{rótulo:'Baixar arquivo convertido',ícone:'baixar',
      gerar:()=>baixar(r.blob,r.nome,r.blob.type)}]};
   },
   aoMontar(){
    raiz.querySelector('[name="arquivo"]').accept='image/png,image/jpeg,image/webp';
    previa=montarPreviaImagem(raiz,{titulo:'Prévia da conversão'});
   },
  });
 },
};

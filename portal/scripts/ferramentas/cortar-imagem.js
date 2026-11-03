/** F074 — Recorte não destrutivo de fotos por proporção, com posição ajustável. */
import {montarFerramenta,baixar,ErroDeEntrada} from '../núcleo/montador.js';
import {validarArquivoImagem,planejarRecorte,formatoDaSaida,qualidadeImagem,
 nomeSeguroImagem,tamanhoHumano} from './auxiliares/imagens-puras.js';
import {abrirImagem,criarCanvas,exportarCanvas,montarPreviaImagem} from './auxiliares/imagens-navegador.js';
export async function recortarArquivo(arquivo,dados){
 validarArquivoImagem(arquivo);
 const tipo=formatoDaSaida(dados.formato),qualidade=qualidadeImagem(dados.qualidade);
 const bitmap=await abrirImagem(arquivo);
 try{
  const plano=planejarRecorte(bitmap.width,bitmap.height,dados.proporcao,dados.posicao);
  const {tela,ctx}=criarCanvas(plano.largura,plano.altura);
  if(tipo.formato==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,tela.width,tela.height);}
  ctx.drawImage(bitmap,plano.x,plano.y,plano.largura,plano.altura,0,0,plano.largura,plano.altura);
  const blob=await exportarCanvas(tela,tipo.formato,qualidade);
  return {blob,nome:nomeSeguroImagem(arquivo.name,'recorte',tipo.extensao),plano,
    originalL:bitmap.width,originalA:bitmap.height};
 }finally{bitmap.close();}
}
export default{
 instruções:{
  passos:[
   'Envie uma imagem local JPG, PNG ou WebP (sem upload para o servidor).',
   'Selecione a proporção: quadrada, post 4:5, story 9:16, capa 16:9, foto 3:2 ou original.',
   'Escolha qual região manter no quadro: centro, topo, baixo, esquerda ou direita.',
   'Gere, confira a prévia, e baixe o recorte na resolução original da área escolhida.',
  ],
  exemplo:{texto:'Uma foto 4000×3000 no corte 1:1 resulta em área central 3000×3000, sem esticar ou ampliar a imagem.'},
  limites:'Corta pela proporção escolhida, sem edição livre por alças. O original não é sobrescrito. JPG recebe fundo branco nas transparências; PNG e WebP podem preservá-las. A imagem precisa ter no máximo 24 megapixels.',
  perguntas:[
   {p:'A imagem é esticada para caber?',r:'Não. A ferramenta recorta a área correspondente, sem mudar a proporção dos objetos.'},
   {p:'Posso criar capa e story?',r:'Sim, usando 16:9 ou 9:16; confira a prévia porque laterais ou topo podem ser cortados.'},
  ],
 },
 montar(raiz,ferramenta){
  let previa;
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Recortar imagem',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'arquivo',rótulo:'Imagem original',tipo:'file'},
    {nome:'proporcao',rótulo:'Proporção',tipo:'seleção',padrão:'4:5',opções:[
     {valor:'livre',rótulo:'Original, sem corte'}, {valor:'1:1',rótulo:'Quadrado 1:1'},
     {valor:'4:5',rótulo:'Post vertical 4:5'}, {valor:'9:16',rótulo:'Story 9:16'},
     {valor:'16:9',rótulo:'Capa horizontal 16:9'}, {valor:'3:2',rótulo:'Fotografia 3:2'},
    ]},
    {nome:'posicao',rótulo:'Região prioritária',tipo:'seleção',padrão:'centro',opções:[
     {valor:'centro',rótulo:'Central'}, {valor:'topo',rótulo:'Topo'}, {valor:'baixo',rótulo:'Base'},
     {valor:'esquerda',rótulo:'Esquerda'}, {valor:'direita',rótulo:'Direita'},
    ]},
    {nome:'formato',rótulo:'Formato de saída',tipo:'seleção',padrão:'png',opções:[
     {valor:'png',rótulo:'PNG'}, {valor:'webp',rótulo:'WebP'}, {valor:'jpeg',rótulo:'JPG'},
    ]},
    {nome:'qualidade',rótulo:'Qualidade JPG/WebP',tipo:'número',padrão:'90'},
   ],
   calcular:async(dados)=>{
    previa.limpar();
    const arquivo=raiz.querySelector('[name="arquivo"]')?.files?.[0];
    const r=await recortarArquivo(arquivo,dados);
    previa.mostrar([{nome:r.nome,blob:r.blob}]);
    return {valor:'Imagem recortada',resumo:r.plano.largura+'×'+r.plano.altura+' px, pronta para baixar.',
     linhas:[['Original',r.originalL+'×'+r.originalA],['Recorte',r.plano.largura+'×'+r.plano.altura],
       ['Posição',dados.posicao],['Arquivo',tamanhoHumano(r.blob.size)]],
     observações:['A área externa ao recorte foi removida da cópia. O original permanece intacto.',
       'A prévia mostra exatamente a imagem que será baixada.'],
     arquivos:[{rótulo:'Baixar imagem',ícone:'baixar',
      gerar:()=>baixar(r.blob,r.nome,r.blob.type)}]};
   },
   aoMontar(){
    raiz.querySelector('[name="arquivo"]').accept='image/png,image/jpeg,image/webp';
    previa=montarPreviaImagem(raiz,{titulo:'Recorte final'});
   },
  });
 },
};

/** F078 — Remove metadados reprocessando apenas pixels, sem copiar blocos EXIF/XMP. */
import {montarFerramenta,baixar,ErroDeEntrada} from '../núcleo/montador.js';
import {validarArquivoImagem,formatoDaSaida,qualidadeImagem,detectarBlocosDeMetadados,
 nomeSeguroImagem,tamanhoHumano} from './auxiliares/imagens-puras.js';
import {transformarImagem,montarPreviaImagem} from './auxiliares/imagens-navegador.js';
export async function limparMetadadosImagem(arquivo,dados){
 validarArquivoImagem(arquivo);
 const op=formatoDaSaida(dados.formato),qualidade=qualidadeImagem(dados.qualidade);
 const original=new Uint8Array(await arquivo.arrayBuffer());
 const encontrados=detectarBlocosDeMetadados(original,arquivo.type);
 // A saída é criada APENAS dos pixels; não recopia chunks do arquivo original.
 const r=await transformarImagem(arquivo,{formato:op.formato,qualidade,fundo:'branco'});
 const saida=new Uint8Array(await r.blob.arrayBuffer());
 const restantes=detectarBlocosDeMetadados(saida,r.blob.type);
 if(restantes.length)throw new ErroDeEntrada(
  'O navegador ainda gerou marcadores de metadados ('+restantes.join(', ')+'). Arquivo não liberado.','arquivo');
 return {...r,encontrados,restantes,nome:nomeSeguroImagem(arquivo.name,'sem-metadados',op.extensao)};
}
export default{
 instruções:{
  passos:[
    'Escolha uma foto JPG, PNG ou WebP diretamente do aparelho.',
    'Selecione PNG, JPG ou WebP para a nova cópia. JPG preenche transparência com branco.',
    'Clique em Limpar metadados. O navegador lê os pixels, aplica a orientação e recria o arquivo sem copiar blocos EXIF.',
    'Confira quais blocos foram identificados, a prévia e o arquivo de saída antes de compartilhar.',
  ],
  exemplo:{texto:'Uma foto com APP1/EXIF de câmera e localização é regravada como nova imagem; informações EXIF não são copiadas, preservando apenas a aparência visual.'},
  limites:'Aceita JPG/PNG/WebP de até 18 MB e 24 megapixels. Procura blocos usuais EXIF/XMP/IPTC/PNG/WebP; pode haver dados ocultos em conteúdo visual, marcas d’água ou formas de metadados não reconhecidas. O resultado pode mudar levemente de qualidade e tamanho. Não modifica a foto original.',
  perguntas:[
    {p:'Isso remove localização GPS?',r:'Dados GPS em blocos EXIF comuns deixam de ser copiados na nova imagem; o arquivo exportado é conferido contra os marcadores reconhecidos. Não apaga localização visível dentro da foto.'},
    {p:'Meu arquivo vai para algum servidor?',r:'Não. Tanto a leitura quanto a regravação usam a memória do navegador e são locais.'},
  ],
 },
 montar(raiz,ferramenta){
  let previa;
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Limpar metadados',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
     {nome:'arquivo',rótulo:'Foto que deseja proteger',tipo:'file'},
     {nome:'formato',rótulo:'Formato de saída',tipo:'seleção',padrão:'jpeg',opções:[
       {valor:'jpeg',rótulo:'JPG (fotos)'},{valor:'png',rótulo:'PNG (sem perda adicional)'},
       {valor:'webp',rótulo:'WebP (arquivo moderno)'},
     ]},
     {nome:'qualidade',rótulo:'Qualidade JPG/WebP (20–100)',tipo:'número',padrão:'92'},
   ],
   calcular:async(dados)=>{
    previa.limpar();
    const arquivo=raiz.querySelector('[name="arquivo"]')?.files?.[0];
    const r=await limparMetadadosImagem(arquivo,dados);
    previa.mostrar([{nome:r.nome,blob:r.blob}]);
    const observações=[
     'O arquivo de saída é criado dos pixels decodificados, sem copiar os marcadores encontrados.',
     r.encontrados.length?'Foram encontrados no original: '+r.encontrados.join(', ')+'.':
      'Não foram detectados marcadores EXIF/XMP/IPTC conhecidos no arquivo original.',
     'A imagem foi regravada e conferida: nenhum marcador reconhecido permanece na saída.',
     'O processamento não apaga textos, placas, rostos nem locais visíveis na própria foto.',
    ];
    return {valor:'Cópia sem metadados comuns',resumo:'Pronta para revisar e baixar.',
     linhas:[['Marcadores detectados no original',String(r.encontrados.length)],
      ['Marcadores detectados na saída',String(r.restantes.length)],
      ['Dimensões',r.largura+'×'+r.altura+' px'],
      ['Original',tamanhoHumano(arquivo.size)],['Cópia',tamanhoHumano(r.blob.size)]],
     tabela:{cabeçalho:['Marcador no original','Situação'],
       linhas:(r.encontrados.length?r.encontrados:['Nenhum marcador comum detectado'])
         .map(x=>[x,'Não copiado na nova imagem'])},
     observações,
     arquivos:[{rótulo:'Baixar imagem limpa',ícone:'baixar',
      gerar:()=>baixar(r.blob,r.nome,r.blob.type)}],
    };
   },
   aoMontar(){
    raiz.querySelector('[name="arquivo"]').accept='image/png,image/jpeg,image/webp';
    previa=montarPreviaImagem(raiz,{titulo:'Prévia sem metadados'});
   },
  });
 },
};

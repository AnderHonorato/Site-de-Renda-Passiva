/** Romaneio de expedição gerado no navegador, com PDF A4 e tabela exportável. */
import { montarFerramenta, texto, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
const n=(v,casas=2)=>formatarNúmero(v,{casas});
function dataBR(data){
 const v=String(data??'').trim();
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
 if(!m)throw new ErroDeEntrada('Informe uma data no formato AAAA-MM-DD.','data');
 const dt=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 if(dt.getUTCFullYear()!==+m[1]||dt.getUTCMonth()!==+m[2]-1||dt.getUTCDate()!==+m[3])
   throw new ErroDeEntrada('Data inexistente.','data');
 return m[3]+'/'+m[2]+'/'+m[1];
}
export function analisarRomaneio(itens){
 if(!Array.isArray(itens)||itens.length<1||itens.length>80)
   throw new ErroDeEntrada('Informe de 1 a 80 volumes.', 'volumes');
 let pesoTotal=0;const ids=new Set();
 const r=itens.map((item,i)=>{
  for(const [campo,max] of [['volume',24],['conteudo',80],['destinatario',80]]){
   const t=item[campo];
   if(typeof t!=='string'||!t.trim()||t.trim().length>max)
    throw new ErroDeEntrada('Linha '+(i+1)+': '+campo+' precisa ter 1 a '+max+' caracteres.', 'volumes');
  }
  const id=item.volume.toLocaleLowerCase('pt-BR');
  if(ids.has(id))throw new ErroDeEntrada('Identificação de volume repetida: '+item.volume, 'volumes');
  ids.add(id);
  if(!Number.isFinite(item.pesoKg)||item.pesoKg<=0||item.pesoKg>100_000)
    throw new ErroDeEntrada('Linha '+(i+1)+': peso deve ser positivo e no máximo 100.000 kg.', 'volumes');
  pesoTotal+=item.pesoKg;
  if(pesoTotal>10_000_000)throw new ErroDeEntrada('Peso total excedeu 10 milhões de kg.', 'volumes');
  return {...item};
 });
 return {itens:r,pesoTotal,volumes:r.length};
}
export function calcularRomaneioNaTela(dados){
 const numero=texto(dados,'numero',{rótulo:'Número do romaneio',máximo:40});
 const remetente=texto(dados,'remetente',{rótulo:'Remetente',máximo:100});
 const transporte=texto(dados,'transporte',{rótulo:'Transportadora',máximo:100,obrigatório:false});
 const data=dataBR(dados.data);
 const linhas=String(dados.volumes??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(linhas.length<1||linhas.length>80)throw new ErroDeEntrada('Informe de 1 a 80 volumes.', 'volumes');
 const itens=linhas.map((linha,i)=>{
  const p=linha.split(';').map(x=>x.trim());
  if(p.length!==4)throw new ErroDeEntrada('Linha '+(i+1)+': use volume; conteúdo; peso kg; destinatário.', 'volumes');
  return {volume:p[0],conteudo:p[1],pesoKg:paraNúmero(p[2]),destinatario:p[3]};
 });
 const r=analisarRomaneio(itens);
 const tabela={cabeçalho:['Volume','Conteúdo','Peso (kg)','Destinatário'],
    linhas:r.itens.map(x=>[x.volume,x.conteudo,n(x.pesoKg,3),x.destinatario])};
 const nome=nomeDeArquivo('romaneio-'+numero);
 const linhasResumo=[['Número',numero],['Emissão',data],['Remetente',remetente],
    ['Transportadora',transporte||'Não informada'],['Volumes',String(r.volumes)],['Peso total',n(r.pesoTotal,3)+' kg']];
 const obs=[
   'Romaneio é lista de conferência de volumes, não nota fiscal, manifesto de carga (MDF-e) nem comprovante de entrega.',
   'Confira fisicamente identificação, quantidade, peso e destinatário antes da expedição.',
   'O PDF e a tabela são gerados no navegador e não verificam dados junto à transportadora.',
 ];
 function gerarPdf(){
   const pdf=montarDocumentoPdf({título:'Romaneio nº '+numero,subtítulo:data,marca:remetente});
   pdf.seção('Dados da expedição');
   pdf.campo('Remetente',remetente);
   pdf.campo('Transportadora',transporte||'Não informada');
   pdf.campo('Volumes',String(r.volumes));
   pdf.seção('Relação de volumes');
   // Nomes longos são abreviados apenas na visualização PDF; a planilha contém o texto integral.
   pdf.tabela(tabela.cabeçalho,r.itens.map(x=>[x.volume.slice(0,14),
     x.conteudo.slice(0,27),n(x.pesoKg,3),x.destinatario.slice(0,25)]),[16,35,16,33]);
   pdf.destaque('Peso total',n(r.pesoTotal,3)+' kg');
   pdf.parágrafo(obs[0],{tamanho:8});
   baixar(pdf.gerarBytes(),nome+'.pdf','application/pdf');
 }
 return {valor:String(r.volumes)+' volume(s)',resumo:n(r.pesoTotal,3)+' kg de peso total.',
  linhas:linhasResumo,tabela,observações:obs,
  texto:['Romaneio de expedição',...linhasResumo.map(([k,v])=>k+': '+v),
    tabela.cabeçalho.join('; '),...tabela.linhas.map(l=>l.join('; ')),...obs].join('\n'),
  arquivos:[{rótulo:'Romaneio em PDF',ícone:'documento',gerar:gerarPdf}]};
}
export default{
 instruções:{
  passos:[
   'Informe o número do romaneio, remetente, data e, se houver, transportadora.',
   'Adicione os volumes: identificação; conteúdo; peso em kg; destinatário, um por linha.',
   'Calcule para consolidar todos os volumes, o peso total e a relação de destinatários.',
   'Baixe o PDF A4 ou exporte a tabela para CSV ou Excel.',
  ],
  exemplo:{texto:'V01; Camisetas; 2,5; Cliente A e V02; Calçados; 3,0; Cliente B geram um romaneio com 2 volumes e 5,5 kg totais.'},
  limites:'Até 80 volumes identificados sem repetição; o peso de cada um deve ser positivo. O romaneio não é documento fiscal, não substitui MDF-e ou NF-e e não comprova entrega. Dados são processados somente no navegador.',
  perguntas:[
   {p:'O romaneio substitui a nota fiscal?',r:'Não. É uma relação logística de volumes para conferência e transporte.'},
   {p:'Posso imprimir o PDF?',r:'Sim. O documento é A4 e repete cabeçalho quando precisa de várias páginas.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Gerar romaneio',
   permitirSalvarTrabalho:false, registrarUsoAtivo:false,
   campos:[
    {nome:'numero',rótulo:'Número do romaneio',padrão:'ROM-001'},
    {nome:'remetente',rótulo:'Remetente',padrão:'Minha loja'},
    {nome:'data',rótulo:'Data da expedição',tipo:'date',padrão:new Date().toLocaleDateString('sv-SE')},
    {nome:'transporte',rótulo:'Transportadora (opcional)',exemplo:'Nome da transportadora'},
    {nome:'volumes',rótulo:'Volumes a conferir',tipo:'área',linhas:7,
      padrão:'V01; Camisetas; 2,5; Cliente A\nV02; Calçados; 3,0; Cliente B',
      dica:'Uma linha por volume: número; conteúdo; peso em kg; destinatário.'},
   ],calcular:calcularRomaneioNaTela});
 },
};

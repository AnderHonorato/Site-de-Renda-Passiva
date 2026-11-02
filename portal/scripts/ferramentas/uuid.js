/** Identificadores em lote: UUID v4, tokens hex e códigos legíveis com aleatoriedade criptográfica. */
import {montarFerramenta,número,texto,ErroDeEntrada,baixar,nomeDeArquivo} from '../núcleo/montador.js';
export const ALFABETOS=Object.freeze({hex:'0123456789abcdef',legivel:'23456789ABCDEFGHJKLMNPQRSTUVWXYZ'});
function exigirFonte(fonte){
 if(!fonte||typeof fonte.getRandomValues!=='function')
  throw new ErroDeEntrada('Este navegador não oferece aleatoriedade segura. Use HTTPS.','tipo');
}
export function sortearCodigo(alfabeto,comprimento,fonte=globalThis.crypto){
 exigirFonte(fonte);
 if(typeof alfabeto!=='string'||alfabeto.length<2||alfabeto.length>128||
    !Number.isSafeInteger(comprimento)||comprimento<1||comprimento>64)
  throw new ErroDeEntrada('Formato ou tamanho inválido.','tamanho');
 // Rejection sampling: evita viés de módulo na distribuição dos caracteres.
 const teto=256-(256%alfabeto.length),bytes=new Uint8Array(128);
 let codigo='';
 while(codigo.length<comprimento){
  fonte.getRandomValues(bytes);
  for(const byte of bytes){
   if(byte<teto)codigo+=alfabeto[byte%alfabeto.length];
   if(codigo.length===comprimento)break;
  }
 }
 return codigo;
}
export function criarIdentificadores({tipo='uuid',quantidade=10,tamanho=12,prefixo=''},fonte=globalThis.crypto){
 exigirFonte(fonte);
 if(!['uuid','hex','legivel'].includes(tipo))
  throw new ErroDeEntrada('Escolha UUID, hexadecimal ou legível.','tipo');
 if(!Number.isSafeInteger(quantidade)||quantidade<1||quantidade>200)
  throw new ErroDeEntrada('Gere de 1 a 200 identificadores.','quantidade');
 if(!Number.isSafeInteger(tamanho)||tamanho<6||tamanho>32)
  throw new ErroDeEntrada('Escolha tamanho entre 6 e 32 caracteres.','tamanho');
 if(typeof prefixo!=='string'||prefixo.length>20||!/^[A-Za-z0-9_-]*$/.test(prefixo))
  throw new ErroDeEntrada('Prefixo pode conter até 20 letras, números, traços ou _.','prefixo');
 if(tipo==='uuid'&&typeof fonte.randomUUID!=='function')
  throw new ErroDeEntrada('UUID seguro indisponível. Abra pelo HTTPS.','tipo');
 const ids=[],vistos=new Set();
 for(let i=0;i<quantidade;i++){
  let id,vezes=0;
  do{
   const codigo=tipo==='uuid'?fonte.randomUUID():sortearCodigo(ALFABETOS[tipo],tamanho,fonte);
   id=prefixo+codigo;
   if(++vezes>30)throw new ErroDeEntrada('Não foi possível obter identificadores distintos. Tente novamente.','quantidade');
  }while(vistos.has(id));
  vistos.add(id);ids.push(id);
 }
 return ids;
}
export function gerarIdentificadoresNaTela(dados){
 const tipo=texto(dados,'tipo',{rótulo:'Formato',máximo:20});
 const quantidade=número(dados,'quantidade',{rótulo:'Quantidade',mín:1,máx:200,inteiro:true});
 const tamanho=número(dados,'tamanho',{rótulo:'Tamanho',mín:6,máx:32,inteiro:true});
 const prefixo=texto(dados,'prefixo',{rótulo:'Prefixo',obrigatório:false,máximo:20});
 const ids=criarIdentificadores({tipo,quantidade,tamanho,prefixo});
 const tabela={cabeçalho:['#','Identificador'],linhas:ids.map((id,i)=>[String(i+1),id])};
 const observações=[
  'Os identificadores são criados com aleatoriedade criptográfica do navegador (Web Crypto).',
  'UUID v4 segue o formato de 128 bits; códigos legíveis evitam caracteres ambíguos como 0/O e 1/I.',
  'O tamanho indicado aplica-se ao código hexadecimal/legível; UUID v4 tem comprimento fixo de 36 caracteres sem prefixo.',
  'A ferramenta evita repetições dentro deste lote, mas não consulta outros bancos de dados nem garante ausência de colisões entre execuções.',
  'Se forem usados como credenciais, proteja os downloads e analise o comprimento adequado. Os identificadores não são enviados à sua conta.',
 ];
 return {valor:ids.length+' identificador(es)',resumo:'Criados localmente, prontos para copiar ou exportar.',
  linhas:[['Formato',tipo==='uuid'?'UUID v4':tipo==='hex'?'Código hexadecimal':'Código legível'],['Total',String(ids.length)]],
  tabela,observações,
  texto:['Identificadores gerados',...ids,...observações].join('\n'),
  arquivos:[{rótulo:'Baixar lista TXT',ícone:'baixar',
   gerar:()=>baixar(ids.join('\n')+'\n',nomeDeArquivo('identificadores')+'.txt','text/plain;charset=utf-8')}]};
}
export default{
 instruções:{
  passos:[
   'Escolha UUID v4, hexadecimal ou código legível sem caracteres ambíguos.',
   'Informe quantidade até 200, tamanho (para códigos curtos) e um prefixo opcional.',
   'Gere uma lista criptograficamente aleatória sem duplicatas no mesmo lote.',
   'Copie, baixe TXT ou exporte CSV/Excel; a lista não é salva na conta.',
  ],
  exemplo:{texto:'Com formato legível, tamanho 12 e prefixo PED-, cada identificador tem 16 caracteres no total, como PED-7K3M8V2AQ9RP.'},
  limites:'Até 200 códigos por vez. O tamanho não altera UUID v4. IDs não são validados globalmente em banco de dados; colisões são possíveis embora improváveis. Não use códigos curtos como senhas sem avaliar a segurança.',
  perguntas:[
   {p:'Os IDs têm garantia absoluta de unicidade?',r:'Não. Evitamos duplicatas no lote, mas uma base de dados real ainda deve impor restrições de unicidade.'},
   {p:'Posso usar estes códigos em links públicos?',r:'Sim, como referência. Para autenticação ou recuperação de conta, adote mecanismos de segurança e tokens adequados.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Gerar identificadores',permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'tipo',rótulo:'Formato',tipo:'seleção',padrão:'uuid',opções:[
     {valor:'uuid',rótulo:'UUID v4'}, {valor:'hex',rótulo:'Hexadecimal seguro'},
     {valor:'legivel',rótulo:'Legível sem caracteres ambíguos'},
    ]},
    {nome:'quantidade',rótulo:'Quantidade (1–200)',tipo:'número',padrão:'10'},
    {nome:'tamanho',rótulo:'Tamanho do código (6–32)',tipo:'número',padrão:'12'},
    {nome:'prefixo',rótulo:'Prefixo (opcional)',exemplo:'PED-'},
   ],calcular:gerarIdentificadoresNaTela,
   aoMontar(){
    const form=raiz.querySelector('#formulário');
    const atualizar=()=>{form.querySelector('[data-campo="tamanho"]').hidden=form.elements.tipo.value==='uuid';};
    form.addEventListener('change',atualizar);atualizar();
   },
  });
 },
};

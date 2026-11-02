/** Peso volumétrico pela cubagem da carga e pelo fator próprio da transportadora. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
const n=(v,casas=3)=>formatarNúmero(v,{casas});

export function calcularPesoVolumetrico({comprimento,largura,altura,volumes,pesoRealKg,fatorKgM3}) {
  const dimensoes={comprimento,largura,altura};
  for(const [campo,valor] of Object.entries(dimensoes)) {
    if(!Number.isFinite(valor)||valor<0.1||valor>10_000)
      throw new ErroDeEntrada('Medida entre 0,1 e 10.000 cm.', campo);
  }
  if(!Number.isSafeInteger(volumes)||volumes<1||volumes>100_000)
    throw new ErroDeEntrada('Informe de 1 a 100.000 volumes inteiros.', 'volumes');
  if(!Number.isFinite(pesoRealKg)||pesoRealKg<0||pesoRealKg>10_000_000)
    throw new ErroDeEntrada('Peso total real precisa estar entre 0 e 10 milhões de kg.', 'pesoRealKg');
  if(!Number.isFinite(fatorKgM3)||fatorKgM3<=0||fatorKgM3>10_000)
    throw new ErroDeEntrada('Fator da transportadora precisa ser maior que zero e no máximo 10.000 kg/m³.', 'fatorKgM3');
  const cubagemM3=(comprimento*largura*altura/1_000_000)*volumes;
  const pesoCubadoKg=cubagemM3*fatorKgM3;
  if (!Number.isFinite(pesoCubadoKg)||pesoCubadoKg>1_000_000_000)
    throw new ErroDeEntrada('Peso cubado excedeu o limite de cálculo.', 'volumes');
  const pesoCobradoKg=Math.max(pesoRealKg,pesoCubadoKg);
  return { cubagemM3,pesoCubadoKg,pesoRealKg,pesoCobradoKg,critério:
    pesoCubadoKg>pesoRealKg?'cubado':pesoCubadoKg<pesoRealKg?'real':'iguais'};
}
export function calcularPesoVolumetricoNaTela(dados){
 const entrada={
  comprimento:número(dados,'comprimento',{rótulo:'Comprimento (cm)',mín:0.1,máx:10000}),
  largura:número(dados,'largura',{rótulo:'Largura (cm)',mín:0.1,máx:10000}),
  altura:número(dados,'altura',{rótulo:'Altura (cm)',mín:0.1,máx:10000}),
  volumes:número(dados,'volumes',{rótulo:'Volumes iguais',mín:1,máx:100000,inteiro:true}),
  pesoRealKg:número(dados,'pesoRealKg',{rótulo:'Peso real total (kg)',mín:0,máx:10_000_000}),
  fatorKgM3:número(dados,'fatorKgM3',{rótulo:'Fator da transportadora (kg/m³)',mín:0,máx:10000}),
 };
 const r=calcularPesoVolumetrico(entrada);
 const linhas=[
  ['Cubagem total',n(r.cubagemM3,6)+' m³'],
  ['Peso real total',n(r.pesoRealKg)+' kg'],
  ['Peso volumétrico total',n(r.pesoCubadoKg)+' kg'],
  ['Peso de referência para cobrança',n(r.pesoCobradoKg)+' kg'],
  ['Base do cálculo',r.critério==='cubado'?'Peso cubado':r.critério==='real'?'Peso real':'Pesos equivalentes'],
 ];
 const observações=[
  'Peso cubado = (comprimento × largura × altura em cm³ ÷ 1.000.000) × volumes × fator em kg/m³.',
  'O fator de 167 kg/m³ é somente um exemplo de preenchimento. Consulte a tabela da transportadora para a regra aplicada no seu frete.',
  'Peso de referência é o maior entre peso real e peso cubado. Preço final, arredondamentos comerciais e tarifas adicionais não são calculados.',
  'O peso real informado é o TOTAL da remessa, não o peso por caixa.',
 ];
 return {valor:n(r.pesoCobradoKg)+' kg',resumo:'Peso de referência pela regra do maior peso.',
 linhas,observações,texto:['Peso volumétrico',...linhas.map(([k,v])=>k+': '+v),...observações].join('\n')};
}
export default {
 instruções:{
  passos:[
   'Informe comprimento, largura e altura em centímetros para um tipo de caixa.',
   'Informe a quantidade de caixas iguais e o peso real TOTAL da remessa em kg.',
   'Preencha o fator kg/m³ indicado pela transportadora; a sugestão 167 é apenas ilustrativa.',
   'Calcule a cubagem, o peso volumétrico e o maior peso usado como referência do frete.',
  ],
  exemplo:{texto:'Uma caixa de 60×40×50 cm ocupa 0,12 m³. Com fator 167 kg/m³, pesa 20,04 kg volumétricos. Se o peso real total é 12 kg, a referência de cobrança é 20,04 kg.'},
  limites:'Serve para caixas com medidas iguais por linha. Transportadoras podem calcular por volume separadamente, usar divisor em cm³/kg, arredondar pesos ou adotar outros critérios. O resultado não é uma cotação de frete.',
  perguntas:[
   {p:'Por que o frete considera mais que o peso real?',r:'Caixas grandes e leves ocupam espaço. O fator de cubagem converte esse espaço em um peso de referência.'},
   {p:'O fator 167 vale para todas as entregas?',r:'Não. Consulte a transportadora e ajuste o fator ao contrato.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Calcular peso',
   campos:[
    {nome:'comprimento',rótulo:'Comprimento (cm)',tipo:'número',padrão:'60'},
    {nome:'largura',rótulo:'Largura (cm)',tipo:'número',padrão:'40'},
    {nome:'altura',rótulo:'Altura (cm)',tipo:'número',padrão:'50'},
    {nome:'volumes',rótulo:'Quantidade de volumes iguais',tipo:'número',padrão:'1'},
    {nome:'pesoRealKg',rótulo:'Peso real TOTAL (kg)',tipo:'número',padrão:'12'},
    {nome:'fatorKgM3',rótulo:'Fator da transportadora (kg/m³)',tipo:'número',padrão:'167',
     dica:'Exemplo de preenchimento. Consulte o fator contratual.'},
   ],calcular:calcularPesoVolumetricoNaTela});
 },
};

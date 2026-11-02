/** Comparação local de fretes por preço-base, peso tarifável e distância. Sem cotação online. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const n=(v,c=2)=>formatarNúmero(v,{casas:c});
function exigirNumero(v,campo,min,max) {
  if(!Number.isFinite(v)||v<min||v>max)throw new ErroDeEntrada('Informe '+campo+' entre '+min+' e '+max+'.',campo);
}
export function compararFretes({comprimento,largura,altura,volumes,pesoRealKg,distanciaKm,transportadoras}) {
  for(const [nome,valor] of Object.entries({comprimento,largura,altura}))exigirNumero(valor,nome,0.1,10000);
  exigirNumero(pesoRealKg,'pesoRealKg',0,10000000);
  exigirNumero(distanciaKm,'distanciaKm',0,100000);
  if(!Number.isSafeInteger(volumes)||volumes<1||volumes>100000)
    throw new ErroDeEntrada('Volumes devem estar entre 1 e 100.000 unidades inteiras.','volumes');
  if(!Array.isArray(transportadoras)||transportadoras.length<2||transportadoras.length>20)
    throw new ErroDeEntrada('Informe entre 2 e 20 transportadoras.','transportadoras');
  const cubagemM3=comprimento*largura*altura*volumes/1_000_000;
  const vistos=new Set();
  const resultados=transportadoras.map((item,i)=>{
    if(typeof item.nome!=='string'||!item.nome.trim()||item.nome.length>70)
      throw new ErroDeEntrada('Linha '+(i+1)+': nome de 1 a 70 caracteres.','transportadoras');
    const chave=item.nome.trim().toLocaleLowerCase('pt-BR');
    if(vistos.has(chave))throw new ErroDeEntrada('Linha '+(i+1)+': transportadora repetida.','transportadoras');
    vistos.add(chave);
    for(const [campo,max,min] of [['precoBase',1000000,0],['precoKg',10000,0],['precoKm',10000,0],
      ['fatorKgM3',10000,0.000001],['adicional',200,0]]){
      if(!Number.isFinite(item[campo])||item[campo]<min||item[campo]>max)
        throw new ErroDeEntrada('Linha '+(i+1)+': '+campo+' fora do limite.','transportadoras');
    }
    const pesoCubadoKg=cubagemM3*item.fatorKgM3;
    const pesoTarifadoKg=Math.max(pesoRealKg,pesoCubadoKg);
    const estimativa=(item.precoBase+pesoTarifadoKg*item.precoKg+distanciaKm*item.precoKm)
      *(1+item.adicional/100);
    if(!Number.isFinite(estimativa)||estimativa>10000000000)
      throw new ErroDeEntrada('Linha '+(i+1)+': preço estimado excede o limite.','transportadoras');
    return {...item,pesoTarifadoKg,pesoCubadoKg,estimativaCentavos:Math.round(estimativa*100),indice:i};
  }).sort((a,b)=>a.estimativaCentavos-b.estimativaCentavos||a.indice-b.indice);
  return {cubagemM3,resultados,maisBarata:resultados[0],maisCara:resultados.at(-1),
    economiaCentavos:resultados.at(-1).estimativaCentavos-resultados[0].estimativaCentavos};
}
export function calcularFreteNaTela(dados) {
 const entrada={
  comprimento:número(dados,'comprimento',{rótulo:'Comprimento (cm)',mín:0.1,máx:10000}),
  largura:número(dados,'largura',{rótulo:'Largura (cm)',mín:0.1,máx:10000}),
  altura:número(dados,'altura',{rótulo:'Altura (cm)',mín:0.1,máx:10000}),
  volumes:número(dados,'volumes',{rótulo:'Volumes iguais',mín:1,máx:100000,inteiro:true}),
  pesoRealKg:número(dados,'pesoRealKg',{rótulo:'Peso real TOTAL (kg)',mín:0,máx:10000000}),
  distanciaKm:número(dados,'distanciaKm',{rótulo:'Distância da entrega (km)',mín:0,máx:100000}),
 };
 const linhas=String(dados.transportadoras??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(linhas.length<2||linhas.length>20)
   throw new ErroDeEntrada('Informe de 2 a 20 transportadoras.','transportadoras');
 const transportadoras=linhas.map((linha,i)=>{
  const p=linha.split(';').map(x=>x.trim());
  if(p.length!==6)throw new ErroDeEntrada('Linha '+(i+1)+': use nome; base; R$/kg; R$/km; fator kg/m³; adicional %.','transportadoras');
  return {nome:p[0],precoBase:paraNúmero(p[1]),precoKg:paraNúmero(p[2]),
    precoKm:paraNúmero(p[3]),fatorKgM3:paraNúmero(p[4]),adicional:paraNúmero(p[5])};
 });
 const r=compararFretes({...entrada,transportadoras});
 const tabela={cabeçalho:['Transportadora','Fator kg/m³','Peso tarifado (kg)','Valor estimado (R$)','Posição'],
   linhas:r.resultados.map((x,i)=>[x.nome,n(x.fatorKgM3),n(x.pesoTarifadoKg,3),
     formatarMoeda(x.estimativaCentavos/100),i===0?'Mais barata':'Alternativa'])};
 const resumo=[
  ['Cubagem total',n(r.cubagemM3,6)+' m³'],
  ['Mais barata',r.maisBarata.nome],
  ['Preço estimado mais baixo',formatarMoeda(r.maisBarata.estimativaCentavos/100)],
  ['Diferença entre menor e maior',formatarMoeda(r.economiaCentavos/100)],
 ];
 const observações=[
  'Estimativa = (preço base + maior peso entre real e cubado × preço/kg + distância × preço/km) × (1 + adicional %).',
  'As tarifas e os fatores foram digitados por você, não consultados com as transportadoras.',
  'Não inclui valor declarado, seguro, pedágio, restrição de CEP, coleta, taxas regionais nem política específica de arredondamento.',
  'O frete real depende das regras e da cotação contratual; este comparativo é apenas uma simulação.',
 ];
 return {valor:formatarMoeda(r.maisBarata.estimativaCentavos/100),
   resumo:'Menor estimativa: '+r.maisBarata.nome+'.',linhas:resumo,tabela,observações,
   texto:['Comparador de frete',...resumo.map(([k,v])=>k+': '+v),
     tabela.cabeçalho.join('; '),...tabela.linhas.map(x=>x.join('; ')),...observações].join('\n')};
}
export default{
 instruções:{
  passos:[
   'Informe medidas em cm, quantidade de volumes iguais e peso REAL total da remessa.',
   'Informe a distância em quilômetros até o destino.',
   'Cole uma linha por transportadora: nome; tarifa base; preço/kg; preço/km; fator kg/m³; adicional percentual.',
   'Compare valores estimados por transportadora e exporte a tabela em CSV ou Excel.',
  ],
  exemplo:{texto:'Caixa 60×40×50 cm, 12 kg, 100 km. Transportadora A: base R$ 10, R$ 2/kg, R$ 0,50/km, fator 167 e 0% adicional: R$ 100,08. Os valores são apenas exemplos de entrada.'},
  limites:'De 2 a 20 transportadoras. Não consulta preços online nem fornece cotação contratual. Taxas e adicionais não informados são ignorados. Produtos, pesos, distâncias e fatores precisam representar a mesma remessa em todas as linhas.',
  perguntas:[
   {p:'Posso comparar fretes sem tabela contratual?',r:'Você pode simular, mas os preços não representam propostas reais. Busque as tarifas com as transportadoras.'},
   {p:'Por que o peso usado é maior do que o real?',r:'A maioria das tabelas pondera espaço ocupado pelo fator volumétrico. É possível alterar o fator para cada transportadora.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Comparar fretes',
   campos:[
    {nome:'comprimento',rótulo:'Comprimento (cm)',tipo:'número',padrão:'60'},
    {nome:'largura',rótulo:'Largura (cm)',tipo:'número',padrão:'40'},
    {nome:'altura',rótulo:'Altura (cm)',tipo:'número',padrão:'50'},
    {nome:'volumes',rótulo:'Volumes iguais',tipo:'número',padrão:'1'},
    {nome:'pesoRealKg',rótulo:'Peso real total (kg)',tipo:'número',padrão:'12'},
    {nome:'distanciaKm',rótulo:'Distância (km)',tipo:'número',padrão:'100'},
    {nome:'transportadoras',rótulo:'Transportadoras e tarifas',tipo:'área',linhas:7,
      padrão:'Transportadora A; 10; 2; 0,50; 167; 0\nTransportadora B; 15; 1,50; 0,50; 200; 0',
      dica:'nome; valor base; R$/kg; R$/km; fator kg/m³; adicional % (uma por linha).'},
   ],calcular:calcularFreteNaTela});
 },
};

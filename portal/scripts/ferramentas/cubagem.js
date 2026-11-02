/** Cubagem de vários tipos de volume em centímetros, com consolidação em m³. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
const formatar=(n,c=6)=>formatarNúmero(n,{casas:c});

export function analisarCubagem(itens) {
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > 80) {
    throw new ErroDeEntrada('Informe de 1 a 80 tipos de volume.', 'volumes');
  }
  let totalMetrosCubicos = 0;
  let totalVolumes = 0;
  const tabela = itens.map((item,i)=>{
    const { comprimento, largura, altura, quantidade } = item;
    if (![comprimento, largura, altura].every((n)=>Number.isFinite(n)&&n>=0.1&&n<=10_000)) {
      throw new ErroDeEntrada('Linha '+(i+1)+': medidas devem estar entre 0,1 e 10.000 cm.', 'volumes');
    }
    if (!Number.isSafeInteger(quantidade)||quantidade<1||quantidade>100_000) {
      throw new ErroDeEntrada('Linha '+(i+1)+': quantidade inteira entre 1 e 100.000.', 'volumes');
    }
    if (typeof item.descricao !== 'string' || item.descricao.trim().length<1 || item.descricao.length>90) {
      throw new ErroDeEntrada('Linha '+(i+1)+': descrição de 1 a 90 caracteres.', 'volumes');
    }
    const unitarioM3 = comprimento*largura*altura/1_000_000;
    const volumeM3=unitarioM3*quantidade;
    totalVolumes+=quantidade; totalMetrosCubicos+=volumeM3;
    if (!Number.isFinite(totalMetrosCubicos) || totalMetrosCubicos>100_000_000) {
      throw new ErroDeEntrada('Cubagem total excede 100 milhões de m³.', 'volumes');
    }
    return { ...item, unitarioM3, volumeM3 };
  });
  return { itens:tabela,totalMetrosCubicos,totalVolumes };
}
export function calcularCubagemNaTela(dados) {
  const linhas=String(dados.volumes??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (linhas.length<1||linhas.length>80)throw new ErroDeEntrada('Informe de 1 a 80 tipos de volume.', 'volumes');
  const itens=linhas.map((linha,indice)=>{
    const p=linha.split(';').map(x=>x.trim());
    if(p.length!==5)throw new ErroDeEntrada('Linha '+(indice+1)+': use descrição; comprimento; largura; altura; quantidade.', 'volumes');
    return { descricao:p[0],comprimento:paraNúmero(p[1]),largura:paraNúmero(p[2]),
      altura:paraNúmero(p[3]),quantidade:paraNúmero(p[4]) };
  });
  const r=analisarCubagem(itens);
  const tabela={cabeçalho:['Tipo de volume','Compr. (cm)','Larg. (cm)','Alt. (cm)','Qtd.','m³ total'],
    linhas:r.itens.map(it=>[it.descricao,formatar(it.comprimento,3),formatar(it.largura,3),
      formatar(it.altura,3),String(it.quantidade),formatar(it.volumeM3,9)])};
  const linhasResumo=[['Total de volumes',formatar(r.totalVolumes,0)],['Cubagem total',formatar(r.totalMetrosCubicos,9)+' m³']];
  const observações=[
    'Cada volume = comprimento × largura × altura em cm³; dividir por 1.000.000 converte para m³.',
    'A quantidade multiplica a cubagem de cada tipo de embalagem. O total representa espaço geométrico, sem folgas entre caixas.',
    'Não representa peso volumétrico ou preço de frete; a transportadora pode usar regras próprias.',
  ];
  return {valor:formatar(r.totalMetrosCubicos,9)+' m³',resumo:r.totalVolumes+' volume(s) somados.',
    linhas:linhasResumo,tabela,observações,texto:['Cubagem de carga',...linhasResumo.map(([k,v])=>k+': '+v),
      tabela.cabeçalho.join('; '),...tabela.linhas.map(l=>l.join('; ')),...observações].join('\n')};
}
export default{
 instruções:{
  passos:[
   'Para cada tipo de caixa, escreva uma linha no formato nome; comprimento; largura; altura; quantidade.',
   'Todas as dimensões devem estar em centímetros e cada quantidade deve ser inteira.',
   'Calcule para ver o volume de cada tipo, a quantidade de caixas e o volume total em metros cúbicos.',
   'Copie os resultados ou exporte a tabela em CSV ou Excel.',
  ],
  exemplo:{texto:'Caixa A; 60; 40; 50; 2 corresponde a 0,12 m³ por caixa e 0,24 m³ no total.'},
  limites:'Até 80 tipos de embalagem, cada dimensão de 0,1 a 10.000 cm. Volume físico de caixas retangulares, sem considerar espaços entre elas ou regras particulares de transportadoras. Cálculo no navegador.',
  perguntas:[
   {p:'Como transformar centímetros cúbicos em metros cúbicos?',r:'Divida por 1.000.000. Uma caixa de 100×100×100 cm ocupa exatamente 1 m³.'},
   {p:'Cubagem é igual a peso cubado?',r:'Não. Multiplique a cubagem pelo fator da transportadora na ferramenta Peso volumétrico.'},
  ],
 },
 montar(raiz,ferramenta) {
  montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Calcular cubagem',
   campos:[{nome:'volumes',rótulo:'Lista de volumes (cm)',tipo:'área',linhas:6,
    padrão:'Caixa A; 60; 40; 50; 2\nCaixa B; 30; 20; 10; 3',
    dica:'Uma linha por embalagem: nome; comprimento; largura; altura; quantidade.'}],
   calcular:calcularCubagemNaTela});
 },
};

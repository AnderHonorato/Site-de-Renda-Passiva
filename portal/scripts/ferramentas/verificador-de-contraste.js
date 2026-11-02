/** Auditor de contraste WCAG 2.2, sem conexão externa. */
import { montarFerramenta, texto, ErroDeEntrada } from '../núcleo/montador.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

export function normalizarCor(valor, campo='texto') {
  if(typeof valor!=='string') throw new ErroDeEntrada('Digite uma cor hexadecimal.',campo);
  const cor=valor.trim();
  if(/^#[0-9a-f]{3}$/i.test(cor))return '#'+[...cor.slice(1)].map(x=>x+x).join('').toUpperCase();
  if(/^#[0-9a-f]{6}$/i.test(cor))return cor.toUpperCase();
  throw new ErroDeEntrada('Informe #RGB ou #RRGGBB, sem transparência.',campo);
}
const rgb=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hex=(c)=>'#'+c.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('').toUpperCase();
export function luminancia(cor){
  const [r,g,b]=rgb(normalizarCor(cor)).map(x=>{
    const v=x/255; return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
  });
  return 0.2126*r+0.7152*g+0.0722*b;
}
export function razaoContraste(fg,bg){
  const a=luminancia(fg),b=luminancia(bg);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
export function sugerirCorTexto(fg,bg,alvo=4.5){
  const texto=normalizarCor(fg),fundo=normalizarCor(bg);
  if(razaoContraste(texto,fundo)>=alvo)return texto;
  const original=rgb(texto),alternativas=[];
  for(const destino of [0,255]){
    if(razaoContraste(hex([destino,destino,destino]),fundo)<alvo)continue;
    let baixo=0,alto=1;
    for(let i=0;i<24;i++){
      const t=(baixo+alto)/2;
      const candidata=hex(original.map(c=>c+(destino-c)*t));
      if(razaoContraste(candidata,fundo)>=alvo)alto=t;else baixo=t;
    }
    let candidata=hex(original.map(c=>c+(destino-c)*alto));
    if(razaoContraste(candidata,fundo)<alvo)candidata=hex([destino,destino,destino]);
    const delta=rgb(candidata).reduce((s,c,i)=>s+(c-original[i])**2,0);
    alternativas.push({cor:candidata,delta});
  }
  alternativas.sort((a,b)=>a.delta-b.delta);
  return alternativas[0]?.cor??null;
}
export function avaliarContraste(fg,bg){
  const texto=normalizarCor(fg,'texto'),fundo=normalizarCor(bg,'fundo');
  const razao=razaoContraste(texto,fundo),sugestao=sugerirCorTexto(texto,fundo);
  return {texto,fundo,razao,sugestao,aaNormal:razao>=4.5,aaaNormal:razao>=7,
    aaGrande:razao>=3,aaaGrande:razao>=4.5};
}
export function calcularContrasteNaTela(dados){
  const fg=texto(dados,'texto',{rótulo:'Cor do texto',máximo:7});
  const bg=texto(dados,'fundo',{rótulo:'Cor do fundo',máximo:7});
  const r=avaliarContraste(fg,bg);
  const n=formatarNúmero(r.razao,{casas:2});
  const linhas=[
    ['WCAG AA: texto normal (4,5:1)',r.aaNormal?'Aprovado':'Reprovado'],
    ['WCAG AAA: texto normal (7:1)',r.aaaNormal?'Aprovado':'Reprovado'],
    ['WCAG AA: texto grande (3:1)',r.aaGrande?'Aprovado':'Reprovado'],
    ['WCAG AAA: texto grande (4,5:1)',r.aaaGrande?'Aprovado':'Reprovado'],
    ['Texto sugerido para AA',r.sugestao??'Não disponível'],
    ['Razão da sugestão',r.sugestao?formatarNúmero(razaoContraste(r.sugestao,r.fundo),{casas:2})+':1':'Não disponível'],
  ];
  const observações=[
    'Usa os critérios 1.4.3 e 1.4.6 das WCAG 2.2, respectivamente AA e AAA.',
    'Texto grande significa ao menos 18 pt normal ou 14 pt negrito.',
    'Só compara cores sólidas e opacas: sobreposição, gradiente e imagem exigem análise adicional.',
    'Passar neste teste de contraste não significa que o site inteiro esteja acessível.',
  ];
  return {valor:n+':1',resumo:r.aaNormal?'Aprovado em AA para texto normal.':'Não atende AA para texto normal.',
    linhas,observações,texto:['Contraste WCAG', 'Texto: '+r.texto,'Fundo: '+r.fundo,'Razão: '+n+':1',
      ...linhas.map(x=>x[0]+': '+x[1]),...observações].join('\n')};
}
export default {
  instruções:{
    passos:['Informe a cor de texto e de fundo em hexadecimal.', 'Confira a prévia ao digitar as cores.',
      'Calcule a razão e veja os resultados AA/AAA para texto normal e grande.',
      'Se falhar, teste a cor de texto sugerida para AA.'],
    exemplo:{texto:'Texto #777777 sobre #FFFFFF apresenta contraste abaixo de 4,5:1, falhando AA em texto normal.'},
    limites:'Aplica contraste WCAG 2.2 somente a duas cores opacas. Não analisa gradientes ou toda a acessibilidade do produto.',
    perguntas:[
      {p:'Quais valores mínimos?',r:'Texto normal: AA 4,5:1, AAA 7:1. Texto grande: AA 3:1, AAA 4,5:1.'},
      {p:'A sugestão altera o meu site?',r:'Não. É apenas uma alternativa para copiar e testar no projeto.'},
    ],
  },
  montar(raiz,ferramenta){
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Verificar contraste',
      campos:[
        {nome:'texto',rótulo:'Cor do texto (hex)',padrão:'#777777'},
        {nome:'fundo',rótulo:'Cor do fundo (hex)',padrão:'#FFFFFF'},
      ],
      calcular:calcularContrasteNaTela,
      aoMontar(){
        const form=raiz.querySelector('#formulário');
        const previa=document.createElement('div');
        previa.className='contraste-amostra';
        previa.setAttribute('aria-label','Prévia das cores');
        previa.innerHTML='<span>Prévia do contraste</span><strong>Texto de exemplo: Aa Bb 123</strong>';
        form.querySelector('.campos').after(previa);
        const atualizar=()=>{
          try{
            const fg=normalizarCor(form.elements.texto.value);
            const bg=normalizarCor(form.elements.fundo.value,'fundo');
            previa.style.color=fg;previa.style.backgroundColor=bg;previa.hidden=false;
          }catch{previa.hidden=true;}
        };
        form.addEventListener('input',atualizar);atualizar();
      },
    });
  },
};

/** Cenas determinísticas da amostra pública, com o papel e a mola da apresentação inicial. */
import { papel, caminhoArredondado, progresso, curva, mola } from '../../vitrine/vitrine-motor.js';
import { formatoDemo } from './demonstracao-html.js';

const compactos = new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:2});
const grandes = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});

function fonte(ctx, tamanho, peso = 500) {
  ctx.font = `${peso} ${tamanho}px "Inter Variable", Inter, system-ui, sans-serif`;
}
function texto(ctx, valor, x, y, largura, tamanho = 24, cor = '#1a1a1a', peso = 500) {
  const s = formatoDemo(valor);
  fonte(ctx, tamanho, peso);
  let cortado = s;
  while (cortado.length > 1 && ctx.measureText(cortado).width > largura) cortado = cortado.slice(0, -2);
  if (cortado !== s) cortado = cortado.slice(0, -1) + '…';
  ctx.fillStyle = cor; ctx.fillText(cortado, x, y);
}
function numeroNoPalco(v) {
  if (typeof v !== 'number') return formatoDemo(v);
  if (Math.abs(v) >= 1000000) return compactos.format(v);
  if (Math.abs(v) >= 1000) return grandes.format(v);
  return formatoDemo(v);
}
function valorNoPalco(ctx, v, x, y, largura, tamanho, cor) {
  const s=numeroNoPalco(v);
  fonte(ctx,tamanho,600);
  while(tamanho>14 && ctx.measureText(s).width>largura){tamanho--;fonte(ctx,tamanho,600);}
  texto(ctx,s,x,y,largura,tamanho,cor,600);
}
function linhas(ctx, valor, x, y, largura, tamanho, cor, maximo = 3) {
  fonte(ctx, tamanho);
  const palavras = String(valor || '').split(/\s+/);
  let atual = '', numero = 0;
  for (let i = 0; i < palavras.length; i++) {
    const palavra = palavras[i];
    if (atual && ctx.measureText(`${atual} ${palavra}`).width > largura) {
      texto(ctx, atual, x, y + numero * tamanho * 1.4, largura, tamanho, cor);
      atual = palavra; numero++;
      if (numero === maximo - 1) { atual = palavras.slice(i).join(' '); break; }
    } else atual += (atual ? ' ' : '') + palavra;
  }
  if (numero < maximo) texto(ctx, atual, x, y + numero * tamanho * 1.4, largura, tamanho, cor);
}
function caixa(ctx, x, y, l, a, cor, raio = 16) {
  caminhoArredondado(ctx, x, y, l, a, raio); ctx.fillStyle = cor; ctx.fill();
}
function folha(ctx, x, y, l, a, c, escala = 1, giro = 0) {
  papel(ctx, { cx:x + l / 2, cy:y + a / 2, l, a, cor:c.papel, sombra:c.sombra, desvio:10, raio:20, escala, giro, contorno:c.borda, larguraContorno:1 });
}
function imagem(ctx, x, y, l, a, c) {
  caixa(ctx,x,y,l,a,c.fraca,12);
  ctx.save();caminhoArredondado(ctx,x,y,l,a,12);ctx.clip();
  ctx.fillStyle=c.marca;ctx.globalAlpha=.25;ctx.beginPath();ctx.arc(x+l*.77,y+a*.25,a*.12,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(x,y+a);ctx.lineTo(x+l*.35,y+a*.26);ctx.lineTo(x+l*.75,y+a);ctx.fill();
  ctx.globalAlpha=.85;ctx.beginPath();ctx.moveTo(x+l*.3,y+a);ctx.lineTo(x+l*.7,y+a*.4);ctx.lineTo(x+l*1.1,y+a);ctx.fill();ctx.restore();
}
function cabecalho(ctx, W, nome, fase, c) {
  texto(ctx, 'ANDER FLOW  /  EXEMPLO', 32, 38, W - 64, 18, c.marca, 600);
  texto(ctx, nome, 32, 80, W - 64, W < 800 ? 28 : 34, c.tinta, 600);
  texto(ctx, fase, 32, 115, W - 64, 20, c.suave);
}
function tabela(ctx, dados, x, y, l, c, { linhasMaximas = 5, tamanho = 20, revelar = 1 } = {}) {
  const colunas = dados.colunas || [], linhasDados = dados.linhas || [];
  if (!colunas.length) return;
  const passo = l / colunas.length, altura = tamanho * 2.15;
  caixa(ctx, x, y, l, altura, c.fraca, 8);
  colunas.forEach((col, i) => texto(ctx, col, x + i * passo + 10, y + altura * .65, passo - 18, tamanho - 1, c.marca, 600));
  linhasDados.slice(0, linhasMaximas).forEach((linha, j) => {
    const p = progresso(revelar, j * .12, j * .12 + .35);
    if (!p) return;
    ctx.save(); ctx.globalAlpha *= p;
    const top = y + altura * (j + 1);
    if (j % 2 === 0) caixa(ctx, x, top, l, altura, c.alternada, 0);
    colunas.forEach((_, i) => texto(ctx, linha[i], x + i * passo + 10, top + altura * .65, passo - 18, tamanho, c.tinta));
    ctx.restore();
  });
}
function entrada(ctx, t, W, H, demo, c) {
  cabecalho(ctx, W, demo.nome, '01  /  Um arquivo, uma pergunta.', c);
  const l = W * .82, a = H * .64, x = (W - l) / 2, y = H * .23;
  const p = Math.max(0, mola(t - .1));
  const imagemLocal=demo.slug==='redimensionar-imagens-em-lote';
  ctx.save(); ctx.translate(W / 2, H * .55); ctx.scale(p, p); ctx.translate(-W / 2, -H * .55);
  folha(ctx, x, y, l, a, c, 1, -.018 * (1 - progresso(t, .4, 2)));
  caixa(ctx, x + 22, y + 22, 86, 38, c.marca, 9);
  texto(ctx, imagemLocal?'IMG':demo.entrada.colunas?.length ? 'CSV' : (demo.entrada.arquivo?.split('.').pop() || 'TXT').toUpperCase(), x + 35, y + 48, 62, 20, c.sobre, 600);
  texto(ctx, 'TRECHO DO EXEMPLO', x + 128, y + 48, l - 152, 18, c.suave, 600);
  texto(ctx, imagemLocal?'Imagens de exemplo':demo.entrada.arquivo || 'documento-de-exemplo.txt', x + 24, y + 100, l - 48, 24, c.tinta, 600);
  if(imagemLocal)imagem(ctx,x+24,y+128,l-48,a-190,c);
  else if (demo.entrada.colunas?.length) tabela(ctx, demo.entrada, x + 24, y + 132, l - 48, c, { tamanho: W < 800 ? 20 : 24, revelar:progresso(t, .8, 2.8) });
  else linhas(ctx, demo.entrada.texto || demo.entrada.rotulo, x + 24, y + 150, l - 48, W < 800 ? 25 : 30, c.tinta, W < 800 ? 7 : 5);
  texto(ctx, 'Dados fictícios. O exemplo não usa arquivos seus.', x + 24, y + a - 28, l - 48, 18, c.suave);
  ctx.restore();
}
function analise(ctx, t, W, H, demo, c) {
  cabecalho(ctx, W, demo.nome, '02  /  Da informação à resposta.', c);
  const mobile = W < 800, p = progresso(t, 4.4, 8.2);
  const pts = mobile ? [[W*.22,H*.31],[W*.5,H*.48],[W*.78,H*.65]] : [[W*.19,H*.45],[W*.5,H*.45],[W*.81,H*.45]];
  ctx.save(); ctx.strokeStyle = c.borda; ctx.lineWidth = 3; ctx.setLineDash([8,10]);
  ctx.beginPath();ctx.moveTo(...pts[0]);ctx.lineTo(...pts[1]);ctx.lineTo(...pts[2]);ctx.stroke();ctx.restore();
  for (let i = 0; i < 12; i++) {
    const q = (p * 1.4 + i / 12) % 1;
    const seg = q < .5 ? 0 : 1, r = (q % .5) * 2;
    const x = pts[seg][0] + (pts[seg+1][0] - pts[seg][0]) * r;
    const y = pts[seg][1] + (pts[seg+1][1] - pts[seg][1]) * r - Math.sin(r * Math.PI) * 35;
    ctx.save();ctx.translate(x,y);ctx.rotate(q*4);caixa(ctx,-5,-5,10,10,c.marca,2);ctx.restore();
  }
  (demo.slug==='redimensionar-imagens-em-lote'?['Imagens','Ajustes','Arquivos']:['Dados','Análise','Relatório']).forEach((titulo,i) => {
    const [x,y] = pts[i], l = mobile ? 150 : 220, a = mobile ? 130 : 170;
    const pop = Math.max(0,mola(t - 4.4 - i * .18));
    folha(ctx,x-l/2,y-a/2,l,a,c,pop,(i-1)*.025);
    ctx.save();ctx.globalAlpha=progresso(t,4.4+i*.18,4.9+i*.18);
    texto(ctx,String(i+1).padStart(2,'0'),x-l/2+18,y-4,l-36,mobile?40:50,c.marca,600);
    texto(ctx,titulo,x-l/2+18,y+34,l-36,mobile?21:26,c.tinta,600);ctx.restore();
  });
  linhas(ctx,demo.metodo || 'As informações são organizadas em um resultado para revisão.',W*.08,H*(mobile?.83:.76),W*.84,mobile?22:27,c.suave,3);
}
function grafico(ctx, series, x, y, l, a, c, p) {
  const valores = series.map(s=>s.valor), min=Math.min(0,...valores),max=Math.max(0,...valores),amplitude=max-min||1;
  const sy=v=>y+a-(v-min)/amplitude*a,zero=sy(0),passo=l/series.length;
  ctx.strokeStyle=c.borda;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,zero);ctx.lineTo(x+l,zero);ctx.stroke();
  texto(ctx,'0',x-18,zero+5,16,14,c.suave);
  series.forEach((s,i)=>{
    const px=x+i*passo+passo*.15,py=sy(s.valor*p),altura=Math.max(1,Math.abs(zero-py));
    caixa(ctx,px,Math.min(py,zero),passo*.7,altura,c.marca,4);
    valorNoPalco(ctx,s.valor,px,y-9,passo*.9,19,c.tinta);
    texto(ctx,s.rotulo,px,y+a+26,passo*.9,14,c.suave);
  });
}
function resultado(ctx, t, W, H, demo, c) {
  cabecalho(ctx,W,demo.nome,'03  /  É isso que você recebe.',c);
  const mobile=W<800,l=W*.9,a=H*.76,x=(W-l)/2,y=H*.20;
  ctx.save();const e=curva.saidaCubica(progresso(t,8.1,8.8));ctx.globalAlpha=e;ctx.translate(0,(1-e)*45);
  folha(ctx,x,y,l,a,c);
  texto(ctx,demo.tipo==='calculado'?'RESULTADO DO EXEMPLO':'FLUXO ILUSTRATIVO',x+22,y+37,l-44,18,c.marca,600);
  const n=demo.indicadores.length, cw=(l-44)/Math.max(1,n);
  demo.indicadores.forEach(([nome,valor],i)=>{
    const p=Math.max(0,mola(t-8.5-i*.12));ctx.save();ctx.globalAlpha=Math.min(1,p);
    caixa(ctx,x+22+i*cw,y+58,cw-8,92,c.fraca,10);
    texto(ctx,nome,x+34+i*cw,y+85,cw-30,mobile?16:20,c.suave);
    valorNoPalco(ctx,valor,x+34+i*cw,y+126,cw-30,mobile?28:38,c.tinta);ctx.restore();
  });
  let proximo=y+(n?185:78);
  if(demo.slug==='redimensionar-imagens-em-lote'){
    const lado=(l-72)/3;
    for(let i=0;i<3;i++)imagem(ctx,x+22+i*(lado+14),proximo+18,lado,(H*.22)*(1-i*.16)*curva.saidaCubica(progresso(t,8.8+i*.15,9.8+i*.15)),c);
    proximo+=H*.22+60;
  }
  if(demo.series.length){
    texto(ctx,demo.medida||'Resultado por item · amostra',x+26,proximo-8,l-52,17,c.suave);
    const altura=H*(mobile?.15:.13);
    grafico(ctx,demo.series,x+38,proximo+24,l-70,altura,c,curva.saidaCubica(progresso(t,9,10.2)));
    proximo+=altura+82;
  }
  tabela(ctx,demo.tabela,x+22,proximo,l-44,c,{linhasMaximas:demo.series.length?2:5,tamanho:mobile?17:21,revelar:progresso(t,9.4,10.6)});
  const formatos=demo.exporta.filter(f=>['pdf','xlsx','txt','csv','json','svg','png'].includes(f)).slice(0,5);
  let xx=x+22;const fy=y+a-42;
  formatos.forEach((f,i)=>{const p=progresso(t,10.2+i*.12,10.7+i*.12);ctx.save();ctx.globalAlpha=p;caixa(ctx,xx,fy+(1-p)*12,f==='xlsx'?79:62,29,c.fraca,6);texto(ctx,f==='xlsx'?'Excel':f.toUpperCase(),xx+9,fy+21+(1-p)*12,70,15,c.marca,600);ctx.restore();xx+=f==='xlsx'?87:70;});
  ctx.restore();
}

export function desenharDemonstracao(ctx,t,p,demo,c) {
  const W=p.retrato?640:1200,H=ctx.canvas.height/ctx.canvas.width*W;
  ctx.setTransform(ctx.canvas.width/W,0,0,ctx.canvas.width/W,0,0);
  ctx.fillStyle=c.fundo;ctx.fillRect(0,0,W,H);
  // Pequenos recortes da mesma linguagem da abertura, sem representar dados.
  for(let i=0;i<6;i++){ctx.save();ctx.globalAlpha=.07;ctx.translate(W*(.08+i*.19),H*(i%2?.9:.16));ctx.rotate(.2*Math.sin(t*.3+i));caixa(ctx,-12,-12,24,24,c.marca,5);ctx.restore();}
  if(t<4.4) entrada(ctx,t,W,H,demo,c);
  else if(t<8.2) analise(ctx,t,W,H,demo,c);
  else resultado(ctx,t,W,H,demo,c);
}

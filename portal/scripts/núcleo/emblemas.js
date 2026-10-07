const NS='http://www.w3.org/2000/svg';
const desenhos={explorador:'M24 16 32 36 40 16 32 21Z M24 48 32 28 40 48 32 43Z',pratica:'M36 14 22 35h10l-4 15 16-24H33Z',conversa:'M18 20h28v19H32l-10 8v-8h-4Z',colecao:'M32 15 37 26 49 27 40 35 43 47 32 41 21 47 24 35 15 27 27 26Z',projetos:'M19 22h26v24H19Z M24 22v-6h16v6 M19 30h26',conexoes:'M21 26a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M43 26a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M12 44v-7c0-10 18-10 18 0v7 M34 44v-7c0-10 18-10 18 0v7',veterano:'M32 13 45 21v15c0 9-13 16-13 16S19 45 19 36V21Z M25 31l5 5 10-11'};
let contador=0;
export function criarIconeMedalha(medalha,{doc=document}={}){
  const svg=doc.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 64 72');svg.setAttribute('class','emblema');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${medalha.nome||'Medalha'} · ${medalha.patamar||''}`);
  const id=`metal-emblema-${++contador}`;
  function el(tag,attrs){const no=doc.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))no.setAttribute(k,String(v));return no;}
  const defs=el('defs'),gradiente=el('linearGradient',{id,x1:0,y1:0,x2:1,y2:1});
  const paletas=[['#d6d0c9','#aaa197','#6f665c','#ddd8d2'],['#edd4ad','#b48052','#774322','#d9a87b'],['#e9f0f7','#a7b9c8','#667b8c','#d8e0e9'],['#fff1ad','#d4b357','#967325','#edd18a'],['#d5f8f4','#77c4bc','#3b817e','#b3e4dd'],['#f9c7dc','#cd789c','#924b70','#f5aaca'],['#d8d2fb','#a096de','#665caa','#ccc3f6'],['#f6e7b3','#d1ac62','#99722d','#e7d097']];
  const cores=paletas[Math.max(0,Math.min(7,Number(medalha.tier)||0))];
  for(const [indice,offset]of [0,.32,.65,1].entries())gradiente.append(el('stop',{offset,'stop-color':cores[indice]}));defs.append(gradiente);svg.append(defs);
  svg.append(el('path',{d:'M19 47 14 68l12-5 6 7 5-24 M35 47l3 23 8-8 12 5-8-24',fill:'currentColor',opacity:.32}));
  svg.append(el('path',{d:'M32 3 53 15l7 22-14 21H18L4 37l7-22Z',fill:`url(#${id})`,stroke:'currentColor','stroke-width':1.2}));
  svg.append(el('path',{d:'M32 3 53 15 50 19 32 8 14 19 11 15Z',fill:'#fff',opacity:.5}));
  svg.append(el('circle',{cx:32,cy:31,r:22,fill:'var(--superfície, var(--fundo))',stroke:'currentColor','stroke-width':1.5}));
  svg.append(el('circle',{cx:32,cy:31,r:19,fill:'none',stroke:'currentColor','stroke-width':.8,'stroke-dasharray':'1 3',opacity:.6}));
  for(const lado of [-1,1])for(let i=0;i<4;i++){const x=32+lado*(23-i),y=19+i*8;svg.append(el('path',{d:`M${x} ${y}q${lado*5} -6 ${lado*8} -3q${lado*1} 6 ${-lado*7} 7Z`,fill:`url(#${id})`,stroke:cores[2],'stroke-width':.3}));}
  svg.append(el('path',{d:desenhos[medalha.id]||desenhos.colecao,fill:'none',stroke:'currentColor','stroke-width':2.2,'stroke-linejoin':'round','stroke-linecap':'round',transform:'translate(5 4) scale(.84)'}));
  if(Number(medalha.tier)>=4)svg.append(el('path',{d:'M32 0v6 M0 32h6 M58 32h6 M32 55v8',stroke:'currentColor','stroke-width':1.5,class:'emblema__brilho'}));
  svg.dataset.tier=String(medalha.tier||0);return svg;
}

import { rankDoNivel } from '../../dados/recompensas.js';
const NS='http://www.w3.org/2000/svg';
const formas=[
  'M28 39C13 35 17 18 31 18c14 0 20 15 4 23 M31 28v18',
  'M32 15 41 35 32 31 23 35Z M32 49 23 29 32 33 41 29Z',
  'M22 42 42 22 M20 18l7 7 M38 39l7 7 M19 46l7-2 20-20-7-7-20 20Z',
  'M32 13 47 27 32 48 17 27Z M17 27h30 M26 16 23 27l9 21 9-21-3-11',
  'M32 14 47 22v14c0 10-15 16-15 16S17 46 17 36V22Z M25 31l5 5 10-12',
  'M31 37 17 21 10 25 23 45h18l13-20-7-4-14 16 M26 19l6 11 6-11',
  'M32 12 38 24 51 26 42 36 44 50 32 43 20 50 22 36 13 26 26 24Z',
  'M16 23 24 28 32 16 40 28 48 23 43 43H21Z M22 48h20',
  'M32 12 37 25 51 32 37 39 32 52 27 39 13 32 27 25Z M18 16l4 4 M46 16l-4 4 M18 48l4-4 M46 48l-4-4',
];
export function criarSeloRank(nivel, { doc=document, ingles=false }={}) {
  const rank=rankDoNivel(nivel);
  const svg=doc.createElementNS(NS,'svg');
  for(const [k,v]of Object.entries({viewBox:'0 0 64 64',class:'selo-rank',role:'img','aria-label':(ingles?rank.nome_en:rank.nome)+' '+rank.subnivel}))svg.setAttribute(k,v);
  svg.dataset.rank=rank.id;svg.dataset.patamar=String(rank.indice);
  svg.style.setProperty('--rank-cor',rank.cor);
  const caminho=(d,classe)=>{const p=doc.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('class',classe);return p;};
  svg.append(caminho('M32 3 57 17v30L32 61 7 47V17Z','selo-rank__base'));
  svg.append(caminho('M32 8 53 20v24L32 56 11 44V20Z','selo-rank__borda'));
  svg.append(caminho(formas[rank.indice],'selo-rank__simbolo'));
  return svg;
}

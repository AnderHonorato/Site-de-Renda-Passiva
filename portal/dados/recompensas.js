/** Ranks do portal sobre os níveis e pontos existentes. Nenhum saldo é recalculado. */
export const RANKS = Object.freeze([
  { id:'iniciante', nome:'Iniciante', nome_en:'Newcomer', cor:'#927d68', simbolo:'semente' },
  { id:'explorador', nome:'Explorador', nome_en:'Explorer', cor:'#b77848', simbolo:'compasso' },
  { id:'criador', nome:'Criador', nome_en:'Creator', cor:'#6f91a5', simbolo:'ferramenta' },
  { id:'especialista', nome:'Especialista', nome_en:'Specialist', cor:'#a68b39', simbolo:'diamante' },
  { id:'veterano', nome:'Veterano', nome_en:'Veteran', cor:'#4a9483', simbolo:'escudo' },
  { id:'elite', nome:'Elite', nome_en:'Elite', cor:'#b37291', simbolo:'asas' },
  { id:'mestre', nome:'Mestre', nome_en:'Master', cor:'#8780bc', simbolo:'estrela' },
  { id:'lenda', nome:'Lenda', nome_en:'Legend', cor:'#bf974c', simbolo:'coroa' },
  { id:'mitico', nome:'Mítico', nome_en:'Mythic', cor:'#b397da', simbolo:'constelacao' },
]);
const ROMANOS = ['I','II','III','IV','V'];

export function rankDoNivel(nivel = 1) {
  const n = Math.max(1, Math.floor(Number(nivel) || 1));
  const indice = Math.min(RANKS.length-1, Math.floor((n-1)/5));
  return { ...RANKS[indice], indice, subnivel:indice===8?'':ROMANOS[(n-1)%5], nivel:n,
    rotulo: RANKS[indice].nome + (indice===8?'':' '+ROMANOS[(n-1)%5]),
    nivel_proximo_rank:indice===8?null:(indice+1)*5+1,
    proximo:indice===8?null:RANKS[indice+1].nome };
}

export function progressoDeRank(pontos = 0) {
  const p = Math.max(0,Number(pontos)||0);
  const nivel = 1 + Math.floor(Math.sqrt(p/10));
  const rank = rankDoNivel(nivel);
  const inicio = 10*(rank.indice*5)**2;
  const meta = rank.nivel_proximo_rank ? 10*(rank.nivel_proximo_rank-1)**2 : null;
  return { ...rank, pontos:p, inicio, meta, faltam:meta===null?0:Math.max(0,meta-p), percentual:meta===null?100:Math.min(100,Math.round((p-inicio)/(meta-inicio)*100)) };
}

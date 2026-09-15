// Decide em quantas folhas A4 um molde precisa ser dividido para ser impresso em tamanho
// real (nunca reduzindo a escala) e devolve a região (em mm, no sistema de coordenadas do
// molde) que cada folha deve mostrar, com uma margem de sobreposição para conferir o
// encaixe e recortar rente à marca de montagem. Função pura.
export function dividirMoldeEmFolhas({ retânguloEnvolvente, larguraÚtilMm, alturaÚtilMm, sobreposiçãoMm = 12 }) {
  const { larguraMm, alturaMm } = retânguloEnvolvente;
  if (!(larguraMm > 0) || !(alturaMm > 0) || !(larguraÚtilMm > 0) || !(alturaÚtilMm > 0)) return null;

  if (larguraMm <= larguraÚtilMm && alturaMm <= alturaÚtilMm) {
    return { colunas: 1, linhas: 1, folhas: [{ coluna: 0, linha: 0, x: 0, y: 0, larguraMm, alturaMm, número: 1 }] };
  }

  const passoXMm = Math.max(1, larguraÚtilMm - sobreposiçãoMm);
  const passoYMm = Math.max(1, alturaÚtilMm - sobreposiçãoMm);
  const colunas = Math.max(1, Math.ceil((larguraMm - sobreposiçãoMm) / passoXMm));
  const linhas = Math.max(1, Math.ceil((alturaMm - sobreposiçãoMm) / passoYMm));

  const folhas = [];
  let número = 1;
  for (let linha = 0; linha < linhas; linha += 1) {
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      const x = coluna * passoXMm;
      const y = linha * passoYMm;
      folhas.push({
        coluna,
        linha,
        x,
        y,
        larguraMm: Math.min(larguraÚtilMm, larguraMm - x),
        alturaMm: Math.min(alturaÚtilMm, alturaMm - y),
        número,
      });
      número += 1;
    }
  }
  return { colunas, linhas, folhas };
}

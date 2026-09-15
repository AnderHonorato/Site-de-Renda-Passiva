// Compara duas orientações de corte de uma peça retangular numa folha (sem girar peça a
// peça, e sem espaçamento entre peças por padrão): a peça "como informada" e a peça
// girada 90°. Devolve a melhor orientação e a grade de posições dessa orientação. Função
// pura, em milímetros.
function contarPeças(larguraDaFolhaMm, alturaDaFolhaMm, larguraDaPeçaMm, alturaDaPeçaMm, espaçamentoMm) {
  const colunas = Math.floor((larguraDaFolhaMm + espaçamentoMm) / (larguraDaPeçaMm + espaçamentoMm));
  const linhas = Math.floor((alturaDaFolhaMm + espaçamentoMm) / (alturaDaPeçaMm + espaçamentoMm));
  return { colunas: Math.max(0, colunas), linhas: Math.max(0, linhas), total: Math.max(0, colunas) * Math.max(0, linhas) };
}

export function calcularAproveitamentoDeFolha({ larguraDaFolhaMm, alturaDaFolhaMm, larguraDaPeçaMm, alturaDaPeçaMm, espaçamentoMm = 0 }) {
  for (const [campo, rótulo, valor] of [
    ['larguraDaFolhaMm', 'Largura da folha', larguraDaFolhaMm],
    ['alturaDaFolhaMm', 'Altura da folha', alturaDaFolhaMm],
    ['larguraDaPeçaMm', 'Largura da peça', larguraDaPeçaMm],
    ['alturaDaPeçaMm', 'Altura da peça', alturaDaPeçaMm],
  ]) {
    if (!Number.isFinite(valor) || valor <= 0) return { válido: false, campo, erro: `${rótulo} precisa ser maior que zero.` };
  }
  if (!Number.isFinite(espaçamentoMm) || espaçamentoMm < 0) return { válido: false, campo: 'espaçamentoMm', erro: 'O espaçamento não pode ser negativo.' };
  if (larguraDaPeçaMm > larguraDaFolhaMm && larguraDaPeçaMm > alturaDaFolhaMm) {
    return { válido: false, campo: 'larguraDaPeçaMm', erro: 'Essa peça não cabe na folha em nenhuma orientação.' };
  }

  const semGirar = contarPeças(larguraDaFolhaMm, alturaDaFolhaMm, larguraDaPeçaMm, alturaDaPeçaMm, espaçamentoMm);
  const girada = contarPeças(larguraDaFolhaMm, alturaDaFolhaMm, alturaDaPeçaMm, larguraDaPeçaMm, espaçamentoMm);

  if (semGirar.total === 0 && girada.total === 0) {
    return { válido: false, campo: 'larguraDaPeçaMm', erro: 'Essa peça não cabe na folha em nenhuma orientação, com esse espaçamento.' };
  }

  const melhorÉGirada = girada.total > semGirar.total;
  const melhor = melhorÉGirada ? girada : semGirar;
  const larguraUsadaMm = melhorÉGirada ? alturaDaPeçaMm : larguraDaPeçaMm;
  const alturaUsadaMm = melhorÉGirada ? larguraDaPeçaMm : alturaDaPeçaMm;

  const segmentosDeCorte = [];
  for (let linha = 0; linha < melhor.linhas; linha += 1) {
    for (let coluna = 0; coluna < melhor.colunas; coluna += 1) {
      const x = coluna * (larguraUsadaMm + espaçamentoMm);
      const y = linha * (alturaUsadaMm + espaçamentoMm);
      segmentosDeCorte.push(
        { x1: x, y1: y, x2: x + larguraUsadaMm, y2: y, tipo: 'corte' },
        { x1: x + larguraUsadaMm, y1: y, x2: x + larguraUsadaMm, y2: y + alturaUsadaMm, tipo: 'corte' },
        { x1: x + larguraUsadaMm, y1: y + alturaUsadaMm, x2: x, y2: y + alturaUsadaMm, tipo: 'corte' },
        { x1: x, y1: y + alturaUsadaMm, x2: x, y2: y, tipo: 'corte' },
      );
    }
  }

  return {
    válido: true,
    semGirar,
    girada,
    melhorOrientação: melhorÉGirada ? 'girada' : 'normal',
    totalDePeças: melhor.total,
    segmentosDeCorte,
    segmentosDeDobra: [],
    retânguloEnvolvente: { larguraMm: larguraDaFolhaMm, alturaMm: alturaDaFolhaMm },
  };
}

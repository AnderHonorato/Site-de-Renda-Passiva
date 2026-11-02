// Estimativa geométrica de rejunte: comprimento total de juntas de uma área revestida por
// peças retangulares, volume das juntas (largura × profundidade) e massa usando a densidade
// informada pelo fabricante na embalagem. Não usa nenhum consumo fixo por m² — tudo vem das
// medidas da peça e dos dados do produto escolhido.
export function calcularÁreaDeRejunte({ área, comprimentoDaPeçaEmMm, larguraDaPeçaEmMm, larguraDaJuntaEmMm, profundidadeDaJuntaEmMm, densidadeEmKgPorLitro }) {
  if (!Number.isFinite(área) || área <= 0) return { válido: false, erro: 'Informe a área revestida, maior que zero.' };
  if (!Number.isFinite(comprimentoDaPeçaEmMm) || comprimentoDaPeçaEmMm <= 0) return { válido: false, erro: 'Informe o comprimento da peça, maior que zero.' };
  if (!Number.isFinite(larguraDaPeçaEmMm) || larguraDaPeçaEmMm <= 0) return { válido: false, erro: 'Informe a largura da peça, maior que zero.' };
  if (!Number.isFinite(larguraDaJuntaEmMm) || larguraDaJuntaEmMm <= 0) return { válido: false, erro: 'Informe a largura da junta, maior que zero.' };
  if (!Number.isFinite(profundidadeDaJuntaEmMm) || profundidadeDaJuntaEmMm <= 0) return { válido: false, erro: 'Informe a profundidade da junta, maior que zero.' };
  if (!Number.isFinite(densidadeEmKgPorLitro) || densidadeEmKgPorLitro <= 0) {
    return { válido: false, erro: 'Informe a densidade do rejunte (kg por litro) conforme a ficha técnica do fabricante.' };
  }

  const comprimentoDaPeçaEmM = comprimentoDaPeçaEmMm / 1000;
  const larguraDaPeçaEmM = larguraDaPeçaEmMm / 1000;
  const comprimentoDeJuntaPorM2 = 1 / comprimentoDaPeçaEmM + 1 / larguraDaPeçaEmM;
  const comprimentoTotalDeJuntaEmM = área * comprimentoDeJuntaPorM2;
  const volumeEmM3 = comprimentoTotalDeJuntaEmM * (larguraDaJuntaEmMm / 1000) * (profundidadeDaJuntaEmMm / 1000);
  const volumeEmLitros = volumeEmM3 * 1000;
  const massaEmKg = volumeEmLitros * densidadeEmKgPorLitro;

  return { válido: true, comprimentoDeJuntaPorM2, comprimentoTotalDeJuntaEmM, volumeEmLitros, massaEmKg };
}

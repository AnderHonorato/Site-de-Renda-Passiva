// Soma a área de superfícies (paredes/tetos) informadas como largura × altura e desconta
// só as aberturas (portas, janelas...) marcadas para desconto, associadas cada uma a uma
// superfície. Nunca deixa a área de uma superfície ficar negativa: se as aberturas
// descontadas somarem mais do que a superfície, o cálculo é recusado com erro claro.
export function calcularÁreaDeParedes({ superfícies = [], aberturas = [] }) {
  if (!Array.isArray(superfícies) || superfícies.length === 0) {
    return { válido: false, erro: 'Adicione ao menos uma superfície (parede ou teto).' };
  }
  if (superfícies.length > 200) return { válido: false, erro: 'Use no máximo 200 superfícies.' };
  if (!Array.isArray(aberturas)) return { válido: false, erro: 'Lista de aberturas inválida.' };
  if (aberturas.length > 500) return { válido: false, erro: 'Use no máximo 500 aberturas.' };

  const áreaPorSuperfície = [];
  for (const [índice, superfície] of superfícies.entries()) {
    const posição = `Superfície ${índice + 1}`;
    const { largura, altura } = superfície ?? {};
    if (!Number.isFinite(largura) || largura <= 0) return { válido: false, erro: `${posição}: informe uma largura maior que zero.` };
    if (!Number.isFinite(altura) || altura <= 0) return { válido: false, erro: `${posição}: informe uma altura maior que zero.` };
    áreaPorSuperfície.push(largura * altura);
  }

  const áreaDescontadaPorSuperfície = new Array(superfícies.length).fill(0);
  const aberturasProcessadas = [];
  for (const [índice, abertura] of aberturas.entries()) {
    const posição = `Abertura ${índice + 1}`;
    const { largura, altura, superfícieId, descontar } = abertura ?? {};
    const índiceDaSuperfície = superfícies.findIndex((superfície) => superfície.id === superfícieId);
    if (índiceDaSuperfície === -1) return { válido: false, erro: `${posição}: selecione a superfície correspondente.` };
    if (!Number.isFinite(largura) || largura <= 0) return { válido: false, erro: `${posição}: informe uma largura maior que zero.` };
    if (!Number.isFinite(altura) || altura <= 0) return { válido: false, erro: `${posição}: informe uma altura maior que zero.` };
    const área = largura * altura;
    const superfície = superfícies[índiceDaSuperfície];
    const nomeDaSuperfície = superfície.nome || `Superfície ${índiceDaSuperfície + 1}`;
    if (área > áreaPorSuperfície[índiceDaSuperfície] + 1e-9) {
      return { válido: false, erro: `${posição}: a abertura é maior do que a superfície "${nomeDaSuperfície}".` };
    }
    if (descontar) {
      áreaDescontadaPorSuperfície[índiceDaSuperfície] += área;
      if (áreaDescontadaPorSuperfície[índiceDaSuperfície] > áreaPorSuperfície[índiceDaSuperfície] + 1e-9) {
        return { válido: false, erro: `As aberturas descontadas da superfície "${nomeDaSuperfície}" somam mais do que a área dela.` };
      }
    }
    aberturasProcessadas.push({ ...abertura, área, índiceDaSuperfície });
  }

  const porSuperfície = superfícies.map((superfície, índice) => ({
    ...superfície,
    área: áreaPorSuperfície[índice],
    áreaDescontada: áreaDescontadaPorSuperfície[índice],
    áreaÚtil: Math.max(áreaPorSuperfície[índice] - áreaDescontadaPorSuperfície[índice], 0),
  }));
  const áreaBruta = áreaPorSuperfície.reduce((total, área) => total + área, 0);
  const áreaDeAberturasDescontadas = áreaDescontadaPorSuperfície.reduce((total, área) => total + área, 0);
  const áreaÚtil = áreaBruta - áreaDeAberturasDescontadas;

  return { válido: true, áreaBruta, áreaDeAberturasDescontadas, áreaÚtil, porSuperfície, aberturas: aberturasProcessadas };
}

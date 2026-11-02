// Faixas e rolos de papel de parede, considerando a largura do rolo, a altura do ambiente
// (mais folga de corte) e a repetição do padrão (rapport): cada faixa é cortada num múltiplo
// da repetição para que o desenho continue de uma faixa para a outra.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

export function calcularPapelDeParede({ larguraDaParede, alturaDoAmbiente, larguraDoRolo, comprimentoDoRolo, repetiçãoDoPadrão = 0, folgaPorFaixa = 0 }) {
  if (!Number.isFinite(larguraDaParede) || larguraDaParede <= 0) return { válido: false, erro: 'Informe a largura total da parede, maior que zero.' };
  if (!Number.isFinite(alturaDoAmbiente) || alturaDoAmbiente <= 0) return { válido: false, erro: 'Informe a altura do ambiente (pé-direito), maior que zero.' };
  if (!Number.isFinite(larguraDoRolo) || larguraDoRolo <= 0) return { válido: false, erro: 'Informe a largura do rolo, maior que zero.' };
  if (!Number.isFinite(comprimentoDoRolo) || comprimentoDoRolo <= 0) return { válido: false, erro: 'Informe o comprimento do rolo, maior que zero.' };
  if (!Number.isFinite(repetiçãoDoPadrão) || repetiçãoDoPadrão < 0) return { válido: false, erro: 'A repetição do padrão não pode ser negativa.' };
  if (!Number.isFinite(folgaPorFaixa) || folgaPorFaixa < 0) return { válido: false, erro: 'A folga por faixa não pode ser negativa.' };

  const faixas = arredondarParaCima(larguraDaParede / larguraDoRolo);
  const alturaDaFaixaBase = alturaDoAmbiente + folgaPorFaixa;
  const alturaDaFaixaAjustada = repetiçãoDoPadrão > 0 ? arredondarParaCima(alturaDaFaixaBase / repetiçãoDoPadrão) * repetiçãoDoPadrão : alturaDaFaixaBase;
  if (alturaDaFaixaAjustada > comprimentoDoRolo + 1e-9) {
    return { válido: false, erro: 'A altura de cada faixa (com a folga e a repetição do padrão) é maior do que o comprimento do rolo informado.' };
  }

  const faixasPorRolo = Math.max(Math.floor(comprimentoDoRolo / alturaDaFaixaAjustada + 1e-9), 1);
  const rolos = arredondarParaCima(faixas / faixasPorRolo);

  return { válido: true, faixas, alturaDaFaixaAjustada, faixasPorRolo, rolos };
}

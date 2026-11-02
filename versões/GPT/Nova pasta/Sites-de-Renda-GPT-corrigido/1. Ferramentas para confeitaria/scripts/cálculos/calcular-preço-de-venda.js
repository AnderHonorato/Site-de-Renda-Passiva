// Preço de venda com margem sobre o preço de venda e taxas percentuais sobre o mesmo
// preço: preço = custo / (1 − margem − taxas). O arredondamento acontece uma única vez,
// no preço por unidade, e o preço do lote é unidade arredondada × quantidade.
import { arredondarParaCentavos } from '../comum/matemática/arredondar-para-centavos.js';

const MODOS = ['acima', 'próximo'];

export function calcularPreçoDeVenda({ custoTotal, quantidade, margemPercentual, taxasPercentuais = 0, modoDeArredondamento = 'acima' }) {
  if (!Number.isFinite(custoTotal) || custoTotal <= 0) return { válido: false, erro: 'O custo total precisa ser maior que zero.' };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { válido: false, erro: 'A quantidade precisa ser um número inteiro de pelo menos 1 unidade.' };
  if (!Number.isFinite(margemPercentual) || margemPercentual < 0 || margemPercentual >= 100) return { válido: false, erro: 'A margem precisa ficar entre 0% e 99,99%.' };
  if (!Number.isFinite(taxasPercentuais) || taxasPercentuais < 0 || taxasPercentuais >= 100) return { válido: false, erro: 'As taxas precisam ficar entre 0% e 99,99%.' };
  if (!MODOS.includes(modoDeArredondamento)) return { válido: false, erro: 'Modo de arredondamento desconhecido.' };

  const fraçãoDaMargem = margemPercentual / 100;
  const fraçãoDasTaxas = taxasPercentuais / 100;
  const denominador = 1 - fraçãoDaMargem - fraçãoDasTaxas;
  if (denominador <= 1e-9) {
    return { válido: false, erro: 'Margem e taxas somadas precisam ficar abaixo de 100% do preço de venda. Reduza uma delas.' };
  }

  const preçoDoLoteMatemático = custoTotal / denominador;
  const preçoUnitárioMatemático = preçoDoLoteMatemático / quantidade;
  const preçoUnitárioEmCentavos = arredondarParaCentavos(preçoUnitárioMatemático, modoDeArredondamento);
  const preçoDoLoteEmCentavos = preçoUnitárioEmCentavos * quantidade;
  const preçoDoLote = preçoDoLoteEmCentavos / 100;
  const valorDasTaxas = preçoDoLote * fraçãoDasTaxas;
  const margemEmReais = preçoDoLote - custoTotal - valorDasTaxas;

  return {
    válido: true,
    custoUnitário: custoTotal / quantidade,
    preçoDoLoteMatemático,
    preçoUnitárioMatemático,
    preçoUnitárioEmCentavos,
    preçoDoLoteEmCentavos,
    valorDasTaxas,
    margemEmReais,
    margemRealPercentual: (margemEmReais / preçoDoLote) * 100,
    acréscimoSobreCustoPercentual: (preçoDoLote / custoTotal - 1) * 100,
  };
}

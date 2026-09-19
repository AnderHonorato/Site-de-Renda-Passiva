// Calcula subtotal de cada item (quantidade × preço, arredondado ao centavo mais
// próximo uma única vez por item), subtotal geral, desconto limitado e total.
import { arredondarParaCentavos } from '../matemática/arredondar-para-centavos.js';

export function calcularTotaisDoOrçamento(orçamento) {
  const itens = orçamento.itens.map((item) => ({
    ...item,
    subtotalEmCentavos: arredondarParaCentavos((item.quantidade * item.preçoUnitárioEmCentavos) / 100),
  }));
  const subtotalEmCentavos = itens.reduce((total, item) => total + item.subtotalEmCentavos, 0);
  const descontoEmCentavos = Math.min(orçamento.descontoEmCentavos ?? 0, subtotalEmCentavos);
  return { itens, subtotalEmCentavos, descontoEmCentavos, totalEmCentavos: subtotalEmCentavos - descontoEmCentavos };
}

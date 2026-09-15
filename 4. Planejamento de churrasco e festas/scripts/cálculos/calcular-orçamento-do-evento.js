// Soma compras e serviços informados e acrescenta uma reserva percentual de imprevistos,
// calculada uma única vez sobre o subtotal (itens R$ 400 + reserva 10% → R$ 440). Função
// pura; o resultado alimenta o componente comum de orçamento (scripts/comum/orçamento/).
import { arredondarParaCentavos } from '../comum/matemática/arredondar-para-centavos.js';

export function calcularOrçamentoDoEvento({ itens, reservaPercentual = 0 }) {
  if (!Array.isArray(itens) || itens.length === 0) return { válido: false, erro: 'Inclua ao menos um item de compra ou serviço.' };
  if (!Number.isFinite(reservaPercentual) || reservaPercentual < 0 || reservaPercentual >= 100) {
    return { válido: false, erro: 'A reserva precisa ficar entre 0% e 99,99% do subtotal.' };
  }

  const itensCalculados = [];
  let subtotalEmCentavos = 0;
  for (const item of itens) {
    if (typeof item.descrição !== 'string' || item.descrição.trim().length === 0) return { válido: false, erro: 'Cada item precisa de uma descrição.' };
    if (!Number.isFinite(item.valor) || item.valor < 0) return { válido: false, erro: `O item "${item.descrição}" precisa de um valor maior ou igual a zero.` };
    const valorEmCentavos = arredondarParaCentavos(item.valor);
    subtotalEmCentavos += valorEmCentavos;
    itensCalculados.push({ descrição: item.descrição.trim(), categoria: item.categoria === 'serviço' ? 'serviço' : 'compra', valorEmCentavos });
  }

  const reservaEmCentavos = arredondarParaCentavos((subtotalEmCentavos / 100) * (reservaPercentual / 100));
  const totalEmCentavos = subtotalEmCentavos + reservaEmCentavos;

  return { válido: true, itens: itensCalculados, subtotalEmCentavos, reservaPercentual, reservaEmCentavos, totalEmCentavos };
}

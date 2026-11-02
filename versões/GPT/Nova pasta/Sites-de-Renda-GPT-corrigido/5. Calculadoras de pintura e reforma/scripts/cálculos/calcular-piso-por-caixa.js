// Quantidade de caixas de piso/revestimento a comprar: soma a margem de recorte à área
// informada e arredonda para cima com tolerância de ponto flutuante (22 ÷ 2,2 não pode virar
// 11 caixas por causa de 10,000000000000002). A área calculada aqui não é a paginação exata
// das peças no chão — é só a base para a compra.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

export function calcularPisoPorCaixa({ área, margemPercentual = 0, coberturaPorCaixa }) {
  if (!Number.isFinite(área) || área <= 0) return { válido: false, erro: 'Informe uma área maior que zero.' };
  if (!Number.isFinite(margemPercentual) || margemPercentual < 0) return { válido: false, erro: 'A margem de recorte não pode ser negativa.' };
  if (!Number.isFinite(coberturaPorCaixa) || coberturaPorCaixa <= 0) return { válido: false, erro: 'Informe a cobertura por caixa, maior que zero, conforme a embalagem.' };

  const áreaAjustada = área * (1 + margemPercentual / 100);
  const caixas = arredondarParaCima(áreaAjustada / coberturaPorCaixa);
  const áreaComprada = caixas * coberturaPorCaixa;

  return { válido: true, áreaAjustada, caixas, áreaComprada, sobraEmÁrea: áreaComprada - áreaAjustada };
}

// Converte área a pintar em litros de tinta necessários e depois em embalagens a comprar.
// Distingue "rendimento por demão" (multiplica pelo número de demãos) de "rendimento
// acabado" (o rendimento do rótulo já considera as demãos recomendadas pelo fabricante,
// então não multiplica de novo). Cada embalagem é arredondada para cima, mostrando a sobra.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

const TIPOS_DE_RENDIMENTO = ['porDemão', 'acabado'];

export function calcularQuantidadeDeTinta({ área, demãos, rendimento, tipoDeRendimento, reservaPercentual = 0, embalagens = [] }) {
  if (!Number.isFinite(área) || área <= 0) return { válido: false, erro: 'Informe uma área maior que zero.' };
  if (!Number.isInteger(demãos) || demãos < 1) return { válido: false, erro: 'O número de demãos precisa ser um número inteiro de 1 ou mais.' };
  if (!Number.isFinite(rendimento) || rendimento <= 0) return { válido: false, erro: 'Informe um rendimento maior que zero, conforme o rótulo do produto.' };
  if (!TIPOS_DE_RENDIMENTO.includes(tipoDeRendimento)) return { válido: false, erro: 'Escolha se o rendimento informado é por demão ou já acabado.' };
  if (!Number.isFinite(reservaPercentual) || reservaPercentual < 0) return { válido: false, erro: 'A reserva não pode ser negativa.' };
  if (!Array.isArray(embalagens)) return { válido: false, erro: 'Lista de embalagens inválida.' };

  const áreaTotalAPintar = tipoDeRendimento === 'porDemão' ? área * demãos : área;
  const litrosNecessários = áreaTotalAPintar / rendimento;
  const litrosComReserva = litrosNecessários * (1 + reservaPercentual / 100);

  const porEmbalagem = [];
  for (const [índice, embalagem] of embalagens.entries()) {
    const posição = `Embalagem ${índice + 1}`;
    const { litros } = embalagem ?? {};
    if (!Number.isFinite(litros) || litros <= 0) return { válido: false, erro: `${posição}: informe a capacidade em litros, maior que zero.` };
    const quantidade = arredondarParaCima(litrosComReserva / litros);
    const litrosComprados = quantidade * litros;
    porEmbalagem.push({ ...embalagem, quantidade, litrosComprados, sobraEmLitros: litrosComprados - litrosComReserva });
  }

  return { válido: true, áreaTotalAPintar, litrosNecessários, litrosComReserva, porEmbalagem };
}

// Planejador de encomendas: quantas horas o pedido exige, quantos dias produtivos isso
// ocupa e, a partir da data de início e dos dias da semana trabalhados, uma data estimada
// de entrega. Estimativa de planejamento pessoal, não compromisso jurídico de prazo.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

const LIMITE_DE_DIAS_PERCORRIDOS = 3660; // ~10 anos de calendário: teto de segurança contra laço sem fim

function analisarDataIso(texto) {
  const correspondência = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? ''));
  if (!correspondência) return null;
  const [, ano, mês, dia] = correspondência.map(Number);
  const data = new Date(Date.UTC(ano, mês - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mês - 1 || data.getUTCDate() !== dia) return null;
  return data;
}

export function calcularPlanejadorDeEncomendas({ quantidadeDePeças, horasPorPeça, capacidadeHorasPorDia, diasDaSemanaTrabalhados, dataDeInício }) {
  if (!Number.isInteger(quantidadeDePeças) || quantidadeDePeças < 1) return { válido: false, erro: 'A quantidade de peças precisa ser um número inteiro de pelo menos 1.' };
  if (!Number.isFinite(horasPorPeça) || horasPorPeça <= 0) return { válido: false, erro: 'As horas por peça precisam ser maiores que zero.' };
  if (!Number.isFinite(capacidadeHorasPorDia) || capacidadeHorasPorDia <= 0) return { válido: false, erro: 'A capacidade de horas por dia precisa ser maior que zero.' };
  if (!Array.isArray(diasDaSemanaTrabalhados) || diasDaSemanaTrabalhados.length !== 7 || diasDaSemanaTrabalhados.every((dia) => !dia)) {
    return { válido: false, erro: 'Selecione ao menos um dia da semana em que você produz.' };
  }
  const dataInício = analisarDataIso(dataDeInício);
  if (!dataInício) return { válido: false, erro: 'Informe uma data de início válida.' };

  const horasTotais = quantidadeDePeças * horasPorPeça;
  const diasProdutivosNecessários = arredondarParaCima(horasTotais / capacidadeHorasPorDia);

  const data = new Date(dataInício.getTime());
  let contagem = 0;
  let percorridos = 0;
  while (true) {
    if (diasDaSemanaTrabalhados[data.getUTCDay()]) {
      contagem += 1;
      if (contagem >= diasProdutivosNecessários) break;
    }
    data.setUTCDate(data.getUTCDate() + 1);
    percorridos += 1;
    if (percorridos > LIMITE_DE_DIAS_PERCORRIDOS) {
      return { válido: false, erro: 'Não foi possível estimar uma data de entrega com os dias de trabalho informados.' };
    }
  }

  return {
    válido: true,
    horasTotais,
    diasProdutivosNecessários,
    dataEstimadaDeEntrega: data.toISOString().slice(0, 10),
  };
}

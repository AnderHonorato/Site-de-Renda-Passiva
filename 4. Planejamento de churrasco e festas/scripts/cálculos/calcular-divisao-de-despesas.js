// Divide o total de uma lista de gastos (ou um total informado diretamente) entre as
// pessoas pagantes — que não são necessariamente todas as pessoas presentes no evento —,
// em partes iguais ou por pesos. Nenhum dado bancário é pedido ou guardado. Função pura.
import { arredondarParaCentavos } from '../comum/matemática/arredondar-para-centavos.js';

function calcularTotalEmCentavos(itens) {
  return itens.reduce((total, item) => total + arredondarParaCentavos(item.valor), 0);
}

export function calcularDivisãoDeDespesas({ itens, totalInformadoEmCentavos = null, pagantes, modo = 'igual' }) {
  if (!Array.isArray(pagantes) || pagantes.length === 0) {
    return { válido: false, erro: 'Adicione ao menos uma pessoa pagante para dividir os gastos.' };
  }
  if (pagantes.length > 200) return { válido: false, erro: 'A lista aceita até 200 pessoas pagantes.' };
  for (const pagante of pagantes) {
    if (typeof pagante.nome !== 'string' || pagante.nome.trim().length === 0) return { válido: false, erro: 'Cada pessoa pagante precisa de um nome.' };
  }
  if (modo !== 'igual' && modo !== 'pesos') return { válido: false, erro: 'Modo de divisão desconhecido.' };

  let totalEmCentavos;
  if (Array.isArray(itens) && itens.length > 0) {
    for (const item of itens) {
      if (!Number.isFinite(item.valor) || item.valor < 0) return { válido: false, erro: `O gasto "${item.descrição ?? ''}" precisa de um valor maior ou igual a zero.` };
    }
    totalEmCentavos = calcularTotalEmCentavos(itens);
  } else if (Number.isFinite(totalInformadoEmCentavos) && totalInformadoEmCentavos >= 0) {
    totalEmCentavos = Math.round(totalInformadoEmCentavos);
  } else {
    return { válido: false, erro: 'Informe uma lista de gastos ou um total.' };
  }
  if (totalEmCentavos === 0) return { válido: false, erro: 'O total dos gastos precisa ser maior que zero.' };

  let pesos;
  if (modo === 'igual') {
    pesos = pagantes.map(() => 1);
  } else {
    pesos = pagantes.map((pagante) => pagante.peso);
    for (const peso of pesos) if (!Number.isFinite(peso) || peso <= 0) return { válido: false, erro: 'Cada peso precisa ser um número maior que zero.' };
  }
  const somaDosPesos = pesos.reduce((soma, peso) => soma + peso, 0);

  // Calcula a parte de cada pagante proporcional ao peso, com resto de arredondamento
  // (sempre menor que a quantidade de pagantes, em centavos) distribuído um a um às
  // maiores frações decimais, para que a soma das partes seja sempre igual ao total.
  const partesBrutas = pesos.map((peso, índice) => ({ índice, exato: (totalEmCentavos * peso) / somaDosPesos }));
  const partes = partesBrutas.map(({ exato }) => Math.floor(exato));
  let restante = totalEmCentavos - partes.reduce((soma, valor) => soma + valor, 0);
  const ordemPorFração = [...partesBrutas].sort((a, b) => b.exato - Math.floor(b.exato) - (a.exato - Math.floor(a.exato)));
  for (const { índice } of ordemPorFração) {
    if (restante <= 0) break;
    partes[índice] += 1;
    restante -= 1;
  }

  const resultado = pagantes.map((pagante, índice) => ({ nome: pagante.nome.trim(), peso: pesos[índice], valorEmCentavos: partes[índice] }));
  return { válido: true, totalEmCentavos, quantidadeDePagantes: pagantes.length, partes: resultado };
}

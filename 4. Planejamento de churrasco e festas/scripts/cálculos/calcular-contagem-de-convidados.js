// Conta confirmados, pendentes e recusados de uma lista de convidados guardada só no
// aparelho, além de separar adultos e crianças entre os confirmados. Função pura.
const ESTADOS = ['confirmado', 'pendente', 'recusado'];

export function calcularContagemDeConvidados(convidados) {
  if (!Array.isArray(convidados)) return { válido: false, erro: 'Lista de convidados inválida.' };
  const contagem = { confirmado: 0, pendente: 0, recusado: 0 };
  let adultosConfirmados = 0;
  let criançasConfirmadas = 0;
  for (const convidado of convidados) {
    const estado = ESTADOS.includes(convidado?.estado) ? convidado.estado : 'pendente';
    contagem[estado] += 1;
    if (estado === 'confirmado') {
      if (convidado?.éCriança) criançasConfirmadas += 1;
      else adultosConfirmados += 1;
    }
  }
  return {
    válido: true,
    totalDeConvidados: convidados.length,
    confirmados: contagem.confirmado,
    pendentes: contagem.pendente,
    recusados: contagem.recusado,
    adultosConfirmados,
    criançasConfirmadas,
  };
}

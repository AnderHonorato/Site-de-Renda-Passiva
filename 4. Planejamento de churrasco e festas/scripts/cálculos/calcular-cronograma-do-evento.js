// Monta o cronograma de preparação de um evento a partir do horário de início da festa e
// de uma lista de etapas com a duração de cada uma (montagem, compras, preparo...),
// encadeadas de trás para frente a partir do horário da festa. Função pura, em minutos
// desde a meia-noite para evitar depender de fuso ou de objetos Date na lógica central.
function paraMinutos(horaTexto) {
  const correspondência = /^(\d{1,2}):(\d{2})$/.exec(String(horaTexto ?? '').trim());
  if (!correspondência) return null;
  const horas = Number(correspondência[1]);
  const minutos = Number(correspondência[2]);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function paraHoraTexto(minutosTotais) {
  const minutosNoDia = ((minutosTotais % 1440) + 1440) % 1440;
  const horas = Math.floor(minutosNoDia / 60);
  const minutos = minutosNoDia % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

export function calcularCronogramaDoEvento({ horárioDaFesta, etapas }) {
  const minutoDaFesta = paraMinutos(horárioDaFesta);
  if (minutoDaFesta === null) return { válido: false, erro: 'Informe o horário da festa no formato HH:MM.' };
  if (!Array.isArray(etapas) || etapas.length === 0) return { válido: false, erro: 'Inclua ao menos uma etapa de preparação.' };
  if (etapas.length > 50) return { válido: false, erro: 'A lista aceita até 50 etapas.' };

  let cursor = minutoDaFesta;
  const etapasCalculadas = [];
  for (let índice = etapas.length - 1; índice >= 0; índice -= 1) {
    const etapa = etapas[índice];
    if (typeof etapa.nome !== 'string' || etapa.nome.trim().length === 0) return { válido: false, erro: `A etapa ${índice + 1} precisa de um nome.` };
    if (!Number.isFinite(etapa.duraçãoEmMinutos) || etapa.duraçãoEmMinutos <= 0 || etapa.duraçãoEmMinutos > 1440) {
      return { válido: false, erro: `A duração da etapa "${etapa.nome}" precisa ficar entre 1 minuto e 24 horas.` };
    }
    const fim = cursor;
    const início = cursor - etapa.duraçãoEmMinutos;
    etapasCalculadas.unshift({ nome: etapa.nome.trim(), duraçãoEmMinutos: etapa.duraçãoEmMinutos, início: paraHoraTexto(início), fim: paraHoraTexto(fim), começaNoDiaAnterior: início < 0 });
    cursor = início;
  }

  return { válido: true, horárioDaFesta: paraHoraTexto(minutoDaFesta), horárioDeInício: paraHoraTexto(cursor), etapas: etapasCalculadas, totalDePreparaçãoEmMinutos: minutoDaFesta - cursor >= 0 ? minutoDaFesta - cursor : minutoDaFesta + 1440 - cursor };
}

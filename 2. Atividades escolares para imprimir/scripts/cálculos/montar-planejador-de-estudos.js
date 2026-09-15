// Monta a grade semanal de estudos: em cada dia escolhido, todas as disciplinas
// aparecem em sequência, com uma pausa entre uma sessão e a próxima (nunca depois da
// última). Calcula o total de minutos de estudo (soma pura das sessões) separado do
// total com pausas incluídas — nunca embaralha os dois números — e nunca promete
// aprovação nem qualquer resultado escolar: é só uma distribuição de tempo.
export const DIAS_DA_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
export const QUANTIDADE_MÁXIMA_DE_DISCIPLINAS = 12;

export function montarPlanejadorDeEstudos({ disciplinas = [], pausaMinutos = 5, diasDaSemana = [] } = {}) {
  const disciplinasLimpas = Array.isArray(disciplinas)
    ? disciplinas
        .map((disciplina) => ({ nome: String(disciplina?.nome ?? '').trim(), minutosPorSessão: Number(disciplina?.minutosPorSessão) }))
        .filter((disciplina) => disciplina.nome !== '')
    : [];
  if (disciplinasLimpas.length === 0) return { válido: false, erro: 'Adicione ao menos uma disciplina.' };
  if (disciplinasLimpas.length > QUANTIDADE_MÁXIMA_DE_DISCIPLINAS) {
    return { válido: false, erro: `Use no máximo ${QUANTIDADE_MÁXIMA_DE_DISCIPLINAS} disciplinas.` };
  }
  const disciplinaInválida = disciplinasLimpas.find(
    (disciplina) => disciplina.nome.length > 24 || !Number.isInteger(disciplina.minutosPorSessão) || disciplina.minutosPorSessão < 5 || disciplina.minutosPorSessão > 240,
  );
  if (disciplinaInválida) {
    return { válido: false, erro: 'Cada disciplina precisa de um nome curto (até 24 caracteres) e minutos por sessão entre 5 e 240.' };
  }

  if (!Number.isInteger(pausaMinutos) || pausaMinutos < 0 || pausaMinutos > 60) {
    return { válido: false, erro: 'A pausa entre sessões precisa ser um número inteiro entre 0 e 60 minutos.' };
  }

  const diasVálidos = Array.isArray(diasDaSemana) ? diasDaSemana.filter((dia) => DIAS_DA_SEMANA.includes(dia)) : [];
  if (diasVálidos.length === 0) return { válido: false, erro: 'Escolha ao menos um dia da semana.' };
  const diasOrdenados = DIAS_DA_SEMANA.filter((dia) => diasVálidos.includes(dia));

  const blocosDoDia = [];
  disciplinasLimpas.forEach((disciplina, índice) => {
    blocosDoDia.push({ tipo: 'sessão', disciplina: disciplina.nome, minutos: disciplina.minutosPorSessão });
    if (índice < disciplinasLimpas.length - 1 && pausaMinutos > 0) {
      blocosDoDia.push({ tipo: 'pausa', minutos: pausaMinutos });
    }
  });

  const minutosDeEstudoPorDia = disciplinasLimpas.reduce((soma, disciplina) => soma + disciplina.minutosPorSessão, 0);
  const quantidadeDePausasPorDia = Math.max(0, disciplinasLimpas.length - 1);
  const minutosDePausaPorDia = quantidadeDePausasPorDia * pausaMinutos;
  const minutosTotaisPorDia = minutosDeEstudoPorDia + minutosDePausaPorDia;

  return {
    válido: true,
    disciplinas: disciplinasLimpas,
    pausaMinutos,
    diasDaSemana: diasOrdenados,
    blocosDoDia,
    minutosDeEstudoPorDia,
    minutosDePausaPorDia,
    minutosTotaisPorDia,
    minutosDeEstudoPorSemana: minutosDeEstudoPorDia * diasOrdenados.length,
    minutosTotaisPorSemana: minutosTotaisPorDia * diasOrdenados.length,
  };
}

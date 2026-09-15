// Confere uma configuração de "Planejador de estudos" salva ou importada antes de aceitá-la.
import { DIAS_DA_SEMANA } from '../cálculos/montar-planejador-de-estudos.js';

export function validarPlanejadorDeEstudosSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Array.isArray(registro.disciplinas) &&
    registro.disciplinas.length >= 1 &&
    registro.disciplinas.length <= 12 &&
    registro.disciplinas.every(
      (disciplina) =>
        disciplina !== null &&
        typeof disciplina === 'object' &&
        typeof disciplina.nome === 'string' &&
        disciplina.nome.trim().length >= 1 &&
        disciplina.nome.length <= 24 &&
        Number.isInteger(disciplina.minutosPorSessão) &&
        disciplina.minutosPorSessão >= 5 &&
        disciplina.minutosPorSessão <= 240,
    ) &&
    Number.isInteger(registro.pausaMinutos) &&
    registro.pausaMinutos >= 0 &&
    registro.pausaMinutos <= 60 &&
    Array.isArray(registro.diasDaSemana) &&
    registro.diasDaSemana.length >= 1 &&
    registro.diasDaSemana.every((dia) => DIAS_DA_SEMANA.includes(dia)) &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}

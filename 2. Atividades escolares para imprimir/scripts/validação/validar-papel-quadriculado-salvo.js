// Confere uma configuração de "Papel quadriculado" salva ou importada antes de aceitá-la.
import { CORES_DE_LINHA } from '../cálculos/calcular-papel-quadriculado.js';

export function validarPapelQuadriculadoSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    Number.isFinite(registro.tamanhoDaQuadrículaMm) &&
    registro.tamanhoDaQuadrículaMm >= 2 &&
    registro.tamanhoDaQuadrículaMm <= 20 &&
    Number.isInteger(registro.margemMm) &&
    registro.margemMm >= 5 &&
    registro.margemMm <= 25 &&
    Object.hasOwn(CORES_DE_LINHA, registro.corDaLinha) &&
    typeof registro.comCabeçalho === 'boolean' &&
    typeof registro.tituloDaAtividade === 'string' &&
    registro.tituloDaAtividade.length <= 120
  );
}

// Confere um ingrediente dentro de uma receita salva ou importada.
import { UNIDADES_SUPORTADAS } from '../cálculos/converter-unidade.js';

const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarIngredienteSalvo(ingrediente) {
  return (
    ingrediente !== null &&
    typeof ingrediente === 'object' &&
    typeof ingrediente.nome === 'string' &&
    ingrediente.nome.trim().length >= 1 &&
    ingrediente.nome.length <= 80 &&
    númeroNaFaixa(ingrediente.preçoComprado, 0.01, 1e7) &&
    númeroNaFaixa(ingrediente.quantidadeComprada, 0.0001, 1e7) &&
    UNIDADES_SUPORTADAS.includes(ingrediente.unidadeComprada) &&
    númeroNaFaixa(ingrediente.quantidadeUsada, 0.0001, 1e7) &&
    UNIDADES_SUPORTADAS.includes(ingrediente.unidadeUsada)
  );
}

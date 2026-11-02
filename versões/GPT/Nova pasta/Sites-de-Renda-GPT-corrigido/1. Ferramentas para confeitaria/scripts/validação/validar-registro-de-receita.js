// Confere uma receita salva ou importada antes de aceitá-la: usado na página Salvos
// e na importação de cópia local (rejeita dados adulterados ou fora do esquema).
import { validarIngredienteSalvo } from './validar-ingrediente-salvo.js';

const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

export function validarRegistroDeReceita(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!Array.isArray(registro.ingredientes) || registro.ingredientes.length < 1 || registro.ingredientes.length > 40) return false;
  if (!registro.ingredientes.every(validarIngredienteSalvo)) return false;
  if (!Number.isInteger(registro.rendimentoAproveitável) || !númeroNaFaixa(registro.rendimentoAproveitável, 1, 100000)) return false;
  if (!númeroNaFaixa(registro.embalagemDeVendaPorUnidade, 0, 1e6)) return false;
  if (!númeroNaFaixa(registro.tempoDePreparoEmMinutos, 0, 100000)) return false;
  if (!númeroNaFaixa(registro.valorDaHora, 0, 1e6)) return false;
  if (!númeroNaFaixa(registro.custosAdicionais, 0, 1e7)) return false;
  return true;
}

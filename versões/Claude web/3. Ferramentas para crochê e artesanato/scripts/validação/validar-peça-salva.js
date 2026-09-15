// Confere uma ficha de preço de peça salva ou importada antes de aceitá-la.
const PERFIS_VÁLIDOS = ['crochê', 'amigurumi', 'peça-artesanal', 'personalizado'];
const MODOS_VÁLIDOS = ['acima', 'próximo'];
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

function materiaisVálidos(materiais) {
  return Array.isArray(materiais) && materiais.length <= 50 && materiais.every((item) => item && typeof item === 'object' && typeof item.nome === 'string' && item.nome.length <= 120 && númeroNaFaixa(item.custo, 0, 1e9));
}

export function validarPeçaSalva(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!PERFIS_VÁLIDOS.includes(registro.perfil)) return false;
  if (!materiaisVálidos(registro.materiais)) return false;
  if (!númeroNaFaixa(registro.horas, 0, 1e5)) return false;
  if (!númeroNaFaixa(registro.valorHora, 0, 1e6)) return false;
  if (!númeroNaFaixa(registro.embalagem, 0, 1e6)) return false;
  if (!númeroNaFaixa(registro.custosAdicionais, 0, 1e6)) return false;
  if (!Number.isInteger(registro.quantidadeDoConjunto) || !númeroNaFaixa(registro.quantidadeDoConjunto, 1, 1000)) return false;
  if (!númeroNaFaixa(registro.margemPercentual, 0, 99.99)) return false;
  if (!númeroNaFaixa(registro.taxasPercentuais, 0, 99.99)) return false;
  if (!MODOS_VÁLIDOS.includes(registro.modoDeArredondamento)) return false;
  if (registro.precoInformado !== null && !númeroNaFaixa(registro.precoInformado, 0, 1e9)) return false;
  return true;
}

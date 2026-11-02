// Sincronizado de compartilhado/scripts/validação/validar-quantidade.js — edite a origem e rode "npm run sincronizar" na raiz.
// Valida uma quantidade digitada e devolve mensagem pronta para exibir junto ao campo.
// Retorna { válido: true, valor } ou { válido: false, erro }.
import { interpretarNúmeroBrasileiro } from './interpretar-número-brasileiro.js';

function formatarLimite(valor) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(valor);
}

export function validarQuantidade(
  entrada,
  { rótulo = 'Valor', mínimo = 0, máximo = 1e9, inteiro = false, permitirZero = true, permitirNegativo = false, casasMáximas = 6, obrigatório = true } = {},
) {
  if (!obrigatório && String(entrada ?? '').trim() === '') return { válido: true, valor: null };
  const interpretado = interpretarNúmeroBrasileiro(entrada, { permitirNegativo, casasMáximas: inteiro ? 0 : casasMáximas });
  if (!interpretado.válido) {
    const detalhe = inteiro && /casa/.test(interpretado.erro) ? 'use um número inteiro.' : interpretado.erro.charAt(0).toLowerCase() + interpretado.erro.slice(1);
    return { válido: false, erro: `${rótulo}: ${detalhe}` };
  }
  const { valor } = interpretado;
  if (!permitirZero && valor === 0) return { válido: false, erro: `${rótulo}: informe um valor maior que zero.` };
  if (valor < mínimo) return { válido: false, erro: `${rótulo}: o mínimo é ${formatarLimite(mínimo)}.` };
  if (valor > máximo) return { válido: false, erro: `${rótulo}: o máximo é ${formatarLimite(máximo)}.` };
  return { válido: true, valor };
}

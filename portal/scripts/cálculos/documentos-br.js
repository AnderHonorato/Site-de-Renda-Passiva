/** Validação de documentos brasileiros pelos dígitos verificadores. */

/** Remove tudo que não for dígito. */
const dígitos = (valor) => String(valor ?? '').replace(/\D/g, '');

/**
 * Calcula um dígito verificador pelo módulo 11.
 * @param {number[]} números
 * @param {number[]} pesos
 * @returns {number}
 */
function dígitoModulo11(números, pesos) {
  const soma = números.reduce((total, n, i) => total + n * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Valida um CPF.
 * @param {string} entrada
 * @returns {{válido: boolean, motivo?: string, formatado?: string}}
 */
export function validarCpf(entrada) {
  const número = dígitos(entrada);
  if (número.length !== 11) return { válido: false, motivo: 'O CPF precisa ter 11 dígitos.' };
  if (/^(\d)\1{10}$/.test(número)) {
    return { válido: false, motivo: 'Sequência de dígitos repetidos não é um CPF válido.' };
  }
  const números = [...número].map(Number);
  const primeiro = dígitoModulo11(números.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = dígitoModulo11(números.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (primeiro !== números[9] || segundo !== números[10]) {
    return { válido: false, motivo: 'Os dígitos verificadores não conferem.' };
  }
  return {
    válido: true,
    formatado: número.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
  };
}

/**
 * Valida um CNPJ.
 * @param {string} entrada
 * @returns {{válido: boolean, motivo?: string, formatado?: string}}
 */
export function validarCnpj(entrada) {
  const número = dígitos(entrada);
  if (número.length !== 14) return { válido: false, motivo: 'O CNPJ precisa ter 14 dígitos.' };
  if (/^(\d)\1{13}$/.test(número)) {
    return { válido: false, motivo: 'Sequência de dígitos repetidos não é um CNPJ válido.' };
  }
  const números = [...número].map(Number);
  const pesosBase = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const primeiro = dígitoModulo11(números.slice(0, 12), pesosBase);
  const segundo = dígitoModulo11(números.slice(0, 13), [6, ...pesosBase]);
  if (primeiro !== números[12] || segundo !== números[13]) {
    return { válido: false, motivo: 'Os dígitos verificadores não conferem.' };
  }
  return {
    válido: true,
    formatado: número.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
  };
}

/**
 * Identifica o tipo pelo tamanho e valida.
 * @param {string} entrada
 * @returns {{tipo: 'CPF'|'CNPJ'|'indefinido', válido: boolean, motivo?: string, formatado?: string}}
 */
export function validarDocumento(entrada) {
  const número = dígitos(entrada);
  if (número.length === 11) return { tipo: 'CPF', ...validarCpf(número) };
  if (número.length === 14) return { tipo: 'CNPJ', ...validarCnpj(número) };
  return {
    tipo: 'indefinido',
    válido: false,
    motivo: `Um documento tem 11 dígitos (CPF) ou 14 (CNPJ). Este tem ${número.length}.`,
  };
}

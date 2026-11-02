// Sincronizado de compartilhado/scripts/apoio/validar-valor-pix.js — edite a origem e rode "npm run sincronizar" na raiz.
// Converte o valor digitado (formato brasileiro) em centavos inteiros, sem usar
// ponto flutuante. Aceita também um número inteiro de centavos (botões de valor rápido).
// Retorna { válido: true, centavos } ou { válido: false, erro }.

export const VALOR_MÍNIMO_PIX_EM_CENTAVOS = 1;
export const VALOR_MÁXIMO_PIX_EM_CENTAVOS = 9_999_999; // R$ 99.999,99

function verificarFaixa(centavos) {
  if (centavos < VALOR_MÍNIMO_PIX_EM_CENTAVOS) return { válido: false, erro: 'Informe um valor maior que zero.' };
  if (centavos > VALOR_MÁXIMO_PIX_EM_CENTAVOS) return { válido: false, erro: 'O valor máximo aceito aqui é R$ 99.999,99.' };
  return { válido: true, centavos };
}

export function validarValorPix(entrada) {
  if (typeof entrada === 'number') {
    if (!Number.isSafeInteger(entrada)) return { válido: false, erro: 'Valor em centavos inválido.' };
    return verificarFaixa(entrada);
  }
  const texto = String(entrada ?? '').replace(/^\s*R\$\s*/i, '').replace(/\s+/g, '');
  if (!texto) return { válido: false, erro: 'Digite um valor, por exemplo 15 ou 15,50.' };
  if (/^[-−]/.test(texto)) return { válido: false, erro: 'O valor não pode ser negativo.' };
  if (!/^[\d.,]+$/.test(texto)) return { válido: false, erro: 'Use apenas números e vírgula, por exemplo 15,50.' };

  let parteInteira;
  let parteDecimal = '';
  if (texto.includes(',')) {
    const partes = texto.split(',');
    if (partes.length !== 2) return { válido: false, erro: 'Use apenas uma vírgula para os centavos.' };
    [parteInteira, parteDecimal] = partes;
    if (parteInteira.includes('.')) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(parteInteira)) return { válido: false, erro: 'Separador de milhar inválido. Exemplo: 1.250,00.' };
      parteInteira = parteInteira.replace(/\./g, '');
    }
  } else if (texto.includes('.')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
      parteInteira = texto.replace(/\./g, '');
    } else if (/^\d+\.\d{1,2}$/.test(texto)) {
      [parteInteira, parteDecimal] = texto.split('.');
    } else {
      return { válido: false, erro: 'Formato de valor não reconhecido. Exemplo: 15,50.' };
    }
  } else {
    parteInteira = texto;
  }

  if (parteInteira === '') parteInteira = '0';
  if (!/^\d+$/.test(parteInteira) || (parteDecimal && !/^\d+$/.test(parteDecimal))) {
    return { válido: false, erro: 'Formato de valor não reconhecido. Exemplo: 15,50.' };
  }
  if (parteDecimal.length > 2) return { válido: false, erro: 'Use no máximo duas casas decimais (centavos).' };
  if (parteInteira.replace(/^0+/, '').length > 5) return { válido: false, erro: 'O valor máximo aceito aqui é R$ 99.999,99.' };

  const centavos = Number(parteInteira) * 100 + Number(parteDecimal.padEnd(2, '0') || '0');
  return verificarFaixa(centavos);
}

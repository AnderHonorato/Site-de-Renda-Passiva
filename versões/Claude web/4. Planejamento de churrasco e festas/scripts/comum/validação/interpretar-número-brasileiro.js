// Sincronizado de compartilhado/scripts/validação/interpretar-número-brasileiro.js — edite a origem e rode "npm run sincronizar" na raiz.
// Interpreta números digitados no formato brasileiro.
// Vírgula é decimal e ponto é milhar ("1.234,56"). Sem vírgula, "1.500" é mil e quinhentos
// e "2.5" é dois e meio. Rejeita vazio, expoente, Infinity e texto.
// Retorna { válido: true, valor } ou { válido: false, erro }.
export function interpretarNúmeroBrasileiro(entrada, { permitirNegativo = false, casasMáximas = 6 } = {}) {
  let texto = String(entrada ?? '').replace(/\s+/g, '').replace(/^R\$/i, '');
  if (!texto) return { válido: false, erro: 'Informe um número.' };

  let negativo = false;
  if (/^[-−]/.test(texto)) {
    negativo = true;
    texto = texto.slice(1);
  }
  if (!/^[\d.,]+$/.test(texto)) return { válido: false, erro: 'Use apenas números, com vírgula para decimais.' };

  let parteInteira;
  let parteDecimal = '';
  if (texto.includes(',')) {
    const partes = texto.split(',');
    if (partes.length !== 2) return { válido: false, erro: 'Use apenas uma vírgula decimal.' };
    [parteInteira, parteDecimal] = partes;
    if (parteInteira.includes('.')) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(parteInteira)) return { válido: false, erro: 'Separador de milhar inválido. Exemplo: 1.250,50.' };
      parteInteira = parteInteira.replace(/\./g, '');
    }
  } else if (texto.includes('.')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
      parteInteira = texto.replace(/\./g, '');
    } else if (/^\d*\.\d+$/.test(texto)) {
      [parteInteira, parteDecimal] = texto.split('.');
    } else {
      return { válido: false, erro: 'Número em formato não reconhecido. Exemplo: 1.250,50.' };
    }
  } else {
    parteInteira = texto;
  }

  if (parteInteira === '') parteInteira = '0';
  if (!/^\d+$/.test(parteInteira) || (parteDecimal !== '' && !/^\d+$/.test(parteDecimal))) {
    return { válido: false, erro: 'Número em formato não reconhecido. Exemplo: 1.250,50.' };
  }
  if (parteDecimal.length > casasMáximas) {
    return { válido: false, erro: `Use no máximo ${casasMáximas} ${casasMáximas === 1 ? 'casa decimal' : 'casas decimais'}.` };
  }
  if (parteInteira.replace(/^0+/, '').length > 15) return { válido: false, erro: 'Número grande demais.' };

  const absoluto = Number(`${parteInteira}.${parteDecimal || '0'}`);
  if (!Number.isFinite(absoluto)) return { válido: false, erro: 'Número grande demais.' };
  if (negativo && absoluto !== 0 && !permitirNegativo) return { válido: false, erro: 'Informe um valor positivo.' };
  return { válido: true, valor: negativo && absoluto !== 0 ? -absoluto : absoluto };
}

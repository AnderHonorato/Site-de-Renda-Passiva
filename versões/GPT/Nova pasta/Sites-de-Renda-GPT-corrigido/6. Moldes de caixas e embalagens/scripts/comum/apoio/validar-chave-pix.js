// Sincronizado de compartilhado/scripts/apoio/validar-chave-pix.js — edite a origem e rode "npm run sincronizar" na raiz.
// Valida o formato de uma chave Pix (CPF, CNPJ, telefone, e-mail ou chave aleatória).
// Retorna { válida, tipo, chaveNormalizada } ou { válida: false, erro }.
// A validação é de formato: só o banco confirma se a chave está registrada.

function dígitosVerificadoresCpfVálidos(cpf) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calcular = (quantidade) => {
    let soma = 0;
    for (let posição = 0; posição < quantidade; posição += 1) {
      soma += Number(cpf[posição]) * (quantidade + 1 - posição);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(cpf[9]) && calcular(10) === Number(cpf[10]);
}

function dígitosVerificadoresCnpjVálidos(cnpj) {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calcular = (quantidade) => {
    const pesos = quantidade === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((total, peso, posição) => total + peso * Number(cnpj[posição]), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13]);
}

export function validarChavePix(entrada) {
  const chave = String(entrada ?? '').trim();
  if (!chave) return { válida: false, erro: 'A chave Pix não foi informada.' };
  if (chave.length > 77) return { válida: false, erro: 'A chave Pix tem mais de 77 caracteres.' };

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) {
    return { válida: true, tipo: 'aleatória', chaveNormalizada: chave.toLowerCase() };
  }
  if (chave.includes('@')) {
    const email = chave.toLowerCase();
    if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
      return { válida: true, tipo: 'e-mail', chaveNormalizada: email };
    }
    return { válida: false, erro: 'O e-mail da chave Pix não tem formato válido.' };
  }
  if (chave.startsWith('+')) {
    if (/^\+55\d{10,11}$/.test(chave)) return { válida: true, tipo: 'telefone', chaveNormalizada: chave };
    return { válida: false, erro: 'Telefone da chave Pix deve estar no formato +55DDDNÚMERO.' };
  }
  const somenteDígitos = chave.replace(/[.\-/\s]/g, '');
  if (/^\d{11}$/.test(somenteDígitos)) {
    if (dígitosVerificadoresCpfVálidos(somenteDígitos)) return { válida: true, tipo: 'CPF', chaveNormalizada: somenteDígitos };
    return { válida: false, erro: 'O CPF da chave Pix tem dígitos verificadores inválidos. Se for telefone, use +55DDDNÚMERO.' };
  }
  if (/^\d{14}$/.test(somenteDígitos)) {
    if (dígitosVerificadoresCnpjVálidos(somenteDígitos)) return { válida: true, tipo: 'CNPJ', chaveNormalizada: somenteDígitos };
    return { válida: false, erro: 'O CNPJ da chave Pix tem dígitos verificadores inválidos.' };
  }
  return { válida: false, erro: 'Formato de chave Pix não reconhecido.' };
}

// Custo proporcional de um material (fio, tecido, miçanga...) a partir do preço de compra,
// da quantidade comprada e do consumo na peça. Peso e comprimento só se convertem entre si
// quando a pessoa informa a relação específica daquele fio (metros por 100 g); nunca
// presumimos uma densidade genérica. "Unidade" (un.) nunca se converte para peso/comprimento.
const CATEGORIA_DA_UNIDADE = { g: 'peso', kg: 'peso', cm: 'comprimento', m: 'comprimento', un: 'unidade' };

function paraGramas(valor, unidade) {
  return unidade === 'kg' ? valor * 1000 : valor;
}

function paraMetros(valor, unidade) {
  return unidade === 'cm' ? valor / 100 : valor;
}

function paraBaseComumOuNulo(valor, unidade, metrosPor100g) {
  const categoria = CATEGORIA_DA_UNIDADE[unidade];
  if (categoria === 'peso') return paraGramas(valor, unidade);
  if (categoria === 'comprimento') return (paraMetros(valor, unidade) * 100) / metrosPor100g;
  return null;
}

export function calcularCustoDoMaterial({ precoDeCompra, quantidadeComprada, unidadeComprada, consumo, unidadeConsumo, metrosPor100g = null }) {
  if (!Number.isFinite(precoDeCompra) || precoDeCompra <= 0) return { válido: false, erro: 'O preço de compra precisa ser maior que zero.' };
  if (!Number.isFinite(quantidadeComprada) || quantidadeComprada <= 0) return { válido: false, erro: 'A quantidade comprada precisa ser maior que zero.' };
  if (!Number.isFinite(consumo) || consumo <= 0) return { válido: false, erro: 'O consumo precisa ser maior que zero.' };
  if (!(unidadeComprada in CATEGORIA_DA_UNIDADE)) return { válido: false, erro: 'Unidade de compra desconhecida.' };
  if (!(unidadeConsumo in CATEGORIA_DA_UNIDADE)) return { válido: false, erro: 'Unidade de consumo desconhecida.' };

  const categoriaComprada = CATEGORIA_DA_UNIDADE[unidadeComprada];
  const categoriaConsumo = CATEGORIA_DA_UNIDADE[unidadeConsumo];

  let compradoBase;
  let consumoBase;

  if (categoriaComprada === categoriaConsumo) {
    if (categoriaComprada === 'unidade') {
      compradoBase = quantidadeComprada;
      consumoBase = consumo;
    } else if (categoriaComprada === 'peso') {
      compradoBase = paraGramas(quantidadeComprada, unidadeComprada);
      consumoBase = paraGramas(consumo, unidadeConsumo);
    } else {
      compradoBase = paraMetros(quantidadeComprada, unidadeComprada);
      consumoBase = paraMetros(consumo, unidadeConsumo);
    }
  } else if (categoriaComprada === 'unidade' || categoriaConsumo === 'unidade') {
    return { válido: false, erro: 'Unidades incompatíveis: “unidade” não se converte com peso ou comprimento.' };
  } else {
    if (!Number.isFinite(metrosPor100g) || metrosPor100g <= 0) {
      return { válido: false, erro: 'Peso e comprimento são unidades diferentes. Informe quantos metros esse fio rende a cada 100 g para converter.' };
    }
    compradoBase = paraBaseComumOuNulo(quantidadeComprada, unidadeComprada, metrosPor100g);
    consumoBase = paraBaseComumOuNulo(consumo, unidadeConsumo, metrosPor100g);
  }

  const custoPorUnidadeDeCompra = precoDeCompra / compradoBase;
  const custoProporcional = precoDeCompra * (consumoBase / compradoBase);
  const restanteNaBase = categoriaComprada === categoriaConsumo ? compradoBase - consumoBase : null;

  return {
    válido: true,
    custoProporcional,
    custoPorUnidadeDeCompra,
    convertido: categoriaComprada !== categoriaConsumo,
    restanteNaBase,
  };
}

// Preço mínimo da peça artesanal: soma materiais, mão de obra (horas × valor da hora),
// embalagem e custos adicionais — essa soma é o "custo do artesanato" e é conferida antes
// de aplicar a margem sobre a venda e as taxas, exatamente como no preço de venda da
// confeitaria (preço = custo ÷ (1 − margem − taxas)). O preço do conjunto multiplica o
// preço por peça arredondado pela quantidade de peças do conjunto.
import { arredondarParaCentavos } from '../comum/matemática/arredondar-para-centavos.js';

const MODOS = ['acima', 'próximo'];

export function calcularPreçoDaPeça({
  custoDeMateriais,
  horas,
  valorHora,
  embalagem = 0,
  custosAdicionais = 0,
  quantidadeDoConjunto = 1,
  margemPercentual,
  taxasPercentuais = 0,
  modoDeArredondamento = 'acima',
  precoInformado = null,
}) {
  if (!Number.isFinite(custoDeMateriais) || custoDeMateriais < 0) return { válido: false, erro: 'O custo de materiais precisa ser zero ou maior.' };
  if (!Number.isFinite(horas) || horas < 0) return { válido: false, erro: 'As horas de trabalho precisam ser zero ou maiores.' };
  if (!Number.isFinite(valorHora) || valorHora < 0) return { válido: false, erro: 'O valor da hora precisa ser zero ou maior.' };
  if (!Number.isFinite(embalagem) || embalagem < 0) return { válido: false, erro: 'O custo de embalagem precisa ser zero ou maior.' };
  if (!Number.isFinite(custosAdicionais) || custosAdicionais < 0) return { válido: false, erro: 'Os custos adicionais precisam ser zero ou maiores.' };
  if (!Number.isInteger(quantidadeDoConjunto) || quantidadeDoConjunto < 1) return { válido: false, erro: 'A quantidade de peças do conjunto precisa ser um número inteiro de pelo menos 1.' };
  if (!Number.isFinite(margemPercentual) || margemPercentual < 0 || margemPercentual >= 100) return { válido: false, erro: 'A margem precisa ficar entre 0% e 99,99%.' };
  if (!Number.isFinite(taxasPercentuais) || taxasPercentuais < 0 || taxasPercentuais >= 100) return { válido: false, erro: 'As taxas precisam ficar entre 0% e 99,99%.' };
  if (!MODOS.includes(modoDeArredondamento)) return { válido: false, erro: 'Modo de arredondamento desconhecido.' };

  const custoDeMãoDeObra = horas * valorHora;
  const custoDoArtesanato = custoDeMateriais + custoDeMãoDeObra + embalagem + custosAdicionais;
  if (custoDoArtesanato <= 0) {
    return { válido: false, erro: 'Informe ao menos um custo maior que zero: materiais, mão de obra, embalagem ou custos adicionais.' };
  }

  const denominador = 1 - margemPercentual / 100 - taxasPercentuais / 100;
  if (denominador <= 1e-9) {
    return { válido: false, erro: 'Margem e taxas somadas precisam ficar abaixo de 100% do preço de venda. Reduza uma delas.' };
  }

  const preçoPorPeçaMatemático = custoDoArtesanato / denominador;
  const preçoPorPeçaEmCentavos = arredondarParaCentavos(preçoPorPeçaMatemático, modoDeArredondamento);
  const preçoDoConjuntoEmCentavos = preçoPorPeçaEmCentavos * quantidadeDoConjunto;
  const preçoPorPeça = preçoPorPeçaEmCentavos / 100;
  const valorDasTaxas = preçoPorPeça * (taxasPercentuais / 100);
  const margemEmReais = preçoPorPeça - custoDoArtesanato - valorDasTaxas;

  let comparação = null;
  if (Number.isFinite(precoInformado) && precoInformado >= 0) {
    const precoInformadoEmCentavos = arredondarParaCentavos(precoInformado, 'próximo');
    comparação = {
      precoInformadoEmCentavos,
      diferençaEmCentavos: precoInformadoEmCentavos - preçoPorPeçaEmCentavos,
      cobre: precoInformadoEmCentavos >= preçoPorPeçaEmCentavos,
    };
  }

  return {
    válido: true,
    custoDeMãoDeObra,
    custoDoArtesanato,
    preçoPorPeçaMatemático,
    preçoPorPeçaEmCentavos,
    preçoDoConjuntoEmCentavos,
    valorDasTaxas,
    margemEmReais,
    margemRealPercentual: (margemEmReais / preçoPorPeça) * 100,
    comparação,
  };
}

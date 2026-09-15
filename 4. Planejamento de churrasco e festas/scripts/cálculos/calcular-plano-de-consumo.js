// Motor de cálculo comum às ferramentas de churrasco, festa infantil e almoço/encontro:
// a partir de quantas pessoas comem, do apetite, da duração e de um catálogo de itens
// (cada um com sua própria premissa de consumo, editável pela pessoa usuária), calcula
// a lista de compras com quantidades, separando cru/cozido e com/sem osso quando
// pertinente, sem aplicar nenhuma perda duas vezes. Função pura, sem DOM.
//
// Cada item do catálogo tem este formato:
// {
//   chave, descrição, grupo: 'carne' | 'acompanhamento' | 'vegetariano' |
//     'bebidaNãoAlcoólica' | 'bebidaAlcoólica',
//   categoriaDePúblico: 'geral' | 'carne' | 'vegetariano' | 'álcool',
//   unidadeBase: 'g' | 'ml' | 'un',
//   quantidadePorAdulto,      // premissa editável, na unidadeBase, por adulto de referência
//   fraçãoPorCriança,         // proporção da quantidade do adulto por criança (0 a 1)
//   comOsso, perdaDoOssoPercentual,       // aplicados uma única vez na compra
//   cru, fatorCruParaCozido,              // quantidadePorAdulto já é a quantidade crua;
//                                          // o fator só informa o rendimento cozido, não altera a compra
//   embalagemNaUnidadeBase,               // tamanho do pacote indivisível informado (opcional)
//   preçoPorUnidadeDeCompraEmCentavos,     // preço por kg/L (g/ml) ou por pacote/unidade (un), em centavos
//   incluído,                             // false remove o item do cálculo (excluir item)
//   fonte,                                // referência pública verificada, ou null
// }
import { arredondarParaEmbalagem } from './arredondar-para-embalagem.js';
import { calcularCustoDeCompra } from './calcular-custo-de-compra.js';

export const APETITES = ['leve', 'médio', 'alto'];
const FATORES_DE_APETITE = { leve: 0.85, médio: 1, alto: 1.2 };
export const DURAÇÃO_DE_REFERÊNCIA_EM_HORAS = 4;
const INCREMENTO_POR_HORA_A_MAIS = 0.08; // 8% a mais por hora além da referência (premissa inicial do site)
const REDUÇÃO_POR_HORA_A_MENOS = 0.08;
const FATOR_DE_DURAÇÃO_MÍNIMO = 0.5;
const REDUÇÃO_DE_CARNE_POR_ACOMPANHAMENTOS = 0.1; // com 3+ acompanhamentos incluídos
const MÍNIMO_DE_ACOMPANHAMENTOS_PARA_REDUZIR_CARNE = 3;

function fatorDeDuração(duraçãoEmHoras) {
  const diferença = duraçãoEmHoras - DURAÇÃO_DE_REFERÊNCIA_EM_HORAS;
  const incremento = diferença >= 0 ? INCREMENTO_POR_HORA_A_MAIS : REDUÇÃO_POR_HORA_A_MENOS;
  return Math.max(FATOR_DE_DURAÇÃO_MÍNIMO, 1 + diferença * incremento);
}

function públicoEquivalente(categoria, { adultos, crianças, vegetarianos, semCarneVermelha, adultosComConsumoDeÁlcool, éCarneVermelha, fraçãoPorCriança }) {
  if (categoria === 'álcool') return Math.max(0, adultosComConsumoDeÁlcool);
  if (categoria === 'vegetariano') return Math.max(0, vegetarianos);
  const equivalênciaGeral = adultos + crianças * fraçãoPorCriança;
  if (categoria === 'geral') return Math.max(0, equivalênciaGeral);
  if (categoria === 'carne') {
    const excluídos = vegetarianos + (éCarneVermelha ? semCarneVermelha : 0);
    return Math.max(0, equivalênciaGeral - excluídos);
  }
  return Math.max(0, equivalênciaGeral);
}

function validarEntradas({ adultos, crianças, duraçãoEmHoras, apetite, vegetarianos, semCarneVermelha, adultosComConsumoDeÁlcool, itens }) {
  if (!Number.isInteger(adultos) || adultos < 0) return 'A quantidade de adultos precisa ser um número inteiro de 0 em diante.';
  if (!Number.isInteger(crianças) || crianças < 0) return 'A quantidade de crianças precisa ser um número inteiro de 0 em diante.';
  if (adultos + crianças === 0) return 'Informe ao menos um adulto ou uma criança.';
  if (adultos + crianças > 5000) return 'A quantidade total de pessoas é grande demais para esta ferramenta (máximo 5.000).';
  if (!Number.isFinite(duraçãoEmHoras) || duraçãoEmHoras <= 0) return 'A duração precisa ser maior que zero.';
  if (duraçãoEmHoras > 72) return 'A duração precisa ser de até 72 horas.';
  if (!APETITES.includes(apetite)) return 'Apetite desconhecido.';
  if (!Number.isInteger(vegetarianos) || vegetarianos < 0) return 'A quantidade de pessoas vegetarianas precisa ser um número inteiro de 0 em diante.';
  if (!Number.isInteger(semCarneVermelha) || semCarneVermelha < 0) return 'A quantidade de pessoas sem carne vermelha precisa ser um número inteiro de 0 em diante.';
  if (vegetarianos + semCarneVermelha > adultos + crianças) return 'A soma de vegetarianos e de pessoas sem carne vermelha não pode passar do total de convidados.';
  if (!Number.isInteger(adultosComConsumoDeÁlcool) || adultosComConsumoDeÁlcool < 0) return 'A quantidade de adultos que consomem álcool precisa ser um número inteiro de 0 em diante.';
  if (adultosComConsumoDeÁlcool > adultos) return 'A quantidade de adultos que consomem álcool não pode ser maior que o total de adultos.';
  if (!Array.isArray(itens) || itens.length === 0) return 'Inclua ao menos um item no catálogo.';
  return null;
}

export function calcularPlanoDeConsumo({
  adultos,
  crianças = 0,
  duraçãoEmHoras,
  apetite = 'médio',
  vegetarianos = 0,
  semCarneVermelha = 0,
  adultosComConsumoDeÁlcool = 0,
  itens,
}) {
  const erroDeEntrada = validarEntradas({ adultos, crianças, duraçãoEmHoras, apetite, vegetarianos, semCarneVermelha, adultosComConsumoDeÁlcool, itens });
  if (erroDeEntrada) return { válido: false, erro: erroDeEntrada };

  const itensIncluídos = itens.filter((item) => item.incluído !== false);
  if (itensIncluídos.length === 0) return { válido: false, erro: 'Nenhum item foi incluído. Marque ao menos um item da lista.' };

  const fatorApetite = FATORES_DE_APETITE[apetite];
  const fatorDuração = fatorDeDuração(duraçãoEmHoras);
  const qtdAcompanhamentosIncluídos = itensIncluídos.filter((item) => item.grupo === 'acompanhamento').length;
  const reduzCarnePorAcompanhamentos = qtdAcompanhamentosIncluídos >= MÍNIMO_DE_ACOMPANHAMENTOS_PARA_REDUZIR_CARNE;

  const itensCalculados = [];
  let totalEmCentavos = 0;
  let quantidadeDeItensComPreço = 0;
  let quantidadeDeItensSemPreço = 0;

  for (const item of itensIncluídos) {
    const fraçãoPorCriança = Number.isFinite(item.fraçãoPorCriança) ? item.fraçãoPorCriança : 0.5;
    const éComida = item.grupo === 'carne' || item.grupo === 'acompanhamento' || item.grupo === 'vegetariano';
    const público = públicoEquivalente(item.categoriaDePúblico, {
      adultos,
      crianças,
      vegetarianos,
      semCarneVermelha,
      adultosComConsumoDeÁlcool,
      éCarneVermelha: Boolean(item.éCarneVermelha),
      fraçãoPorCriança,
    });

    let quantidadeLíquida = item.quantidadePorAdulto * público * fatorDuração * (éComida ? fatorApetite : 1);
    if (item.grupo === 'carne' && reduzCarnePorAcompanhamentos) quantidadeLíquida *= 1 - REDUÇÃO_DE_CARNE_POR_ACOMPANHAMENTOS;

    const notas = [];
    if (público === 0) {
      if (item.categoriaDePúblico === 'álcool') notas.push('Não incluído: 0 adultos consomem álcool.');
      else if (item.categoriaDePúblico === 'vegetariano') notas.push('Não incluído: nenhuma pessoa vegetariana informada.');
      else if (item.categoriaDePúblico === 'carne') notas.push('Não incluído: todas as pessoas estão marcadas como vegetarianas ou sem carne vermelha.');
      else notas.push('Não incluído: nenhuma pessoa neste grupo.');
    }
    let rendimentoCozidoInformativo = null;
    if (item.cru && Number.isFinite(item.fatorCruParaCozido) && item.fatorCruParaCozido > 0) {
      rendimentoCozidoInformativo = quantidadeLíquida * item.fatorCruParaCozido;
      notas.push(`Comprado cru; rende aproximadamente ${Math.round(rendimentoCozidoInformativo)} ${item.unidadeBase} depois de cozido (fator ${item.fatorCruParaCozido}×, aplicado só para esta estimativa).`);
    }

    let quantidadeParaComprar = quantidadeLíquida;
    if (item.comOsso && Number.isFinite(item.perdaDoOssoPercentual) && item.perdaDoOssoPercentual > 0) {
      if (item.perdaDoOssoPercentual >= 100) return { válido: false, erro: `O item "${item.descrição}" tem uma perda de osso igual ou maior que 100%; ajuste a premissa.` };
      quantidadeParaComprar = quantidadeLíquida / (1 - item.perdaDoOssoPercentual / 100);
      notas.push(`Com osso: ${item.perdaDoOssoPercentual}% de perda aplicada uma única vez na quantidade a comprar.`);
    }

    const embalagem = arredondarParaEmbalagem(quantidadeParaComprar, item.embalagemNaUnidadeBase ?? null);
    if (!embalagem.válido) return { válido: false, erro: `Item "${item.descrição}": ${embalagem.erro}` };
    if (embalagem.unidadesDeEmbalagem !== null) notas.push(`Arredondado para ${embalagem.unidadesDeEmbalagem} embalagem(ns) de ${item.embalagemNaUnidadeBase} ${item.unidadeBase}.`);

    const custoEmCentavos = calcularCustoDeCompra({
      quantidadeComprada: embalagem.quantidadeComprada,
      unidadeBase: item.unidadeBase,
      embalagemNaUnidadeBase: item.embalagemNaUnidadeBase ?? null,
      preçoPorUnidadeDeCompraEmCentavos: item.preçoPorUnidadeDeCompraEmCentavos ?? null,
    });
    if (custoEmCentavos !== null) {
      totalEmCentavos += custoEmCentavos;
      quantidadeDeItensComPreço += 1;
    } else {
      quantidadeDeItensSemPreço += 1;
    }

    itensCalculados.push({
      chave: item.chave,
      descrição: item.descrição,
      grupo: item.grupo,
      unidadeBase: item.unidadeBase,
      públicoEquivalente: público,
      quantidadeLíquida,
      quantidadeParaComprar: embalagem.quantidadeComprada,
      unidadesDeEmbalagem: embalagem.unidadesDeEmbalagem,
      rendimentoCozidoInformativo,
      custoEmCentavos,
      notas,
      fonte: item.fonte ?? null,
    });
  }

  return {
    válido: true,
    fatorApetite,
    fatorDuração,
    reduzCarnePorAcompanhamentos,
    totalDePessoas: adultos + crianças,
    itens: itensCalculados,
    totalEmCentavos,
    algumItemSemPreço: quantidadeDeItensSemPreço > 0,
    quantidadeDeItensComPreço,
    quantidadeDeItensSemPreço,
  };
}

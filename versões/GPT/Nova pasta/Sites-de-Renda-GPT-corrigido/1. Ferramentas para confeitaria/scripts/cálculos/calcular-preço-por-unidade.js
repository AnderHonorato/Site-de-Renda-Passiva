// Compara de duas a quatro embalagens pelo preço por quilo, litro ou unidade,
// convertendo cada uma para uma unidade de referência comum da mesma grandeza.
// Embalagens de grandezas diferentes (massa, volume, contagem) não são comparáveis
// entre si e geram um aviso em vez de um número enganoso.
const FATOR_PARA_BASE = { g: 1, kg: 1000, ml: 1, L: 1000, unidade: 1 };
const FAMÍLIA_DA_UNIDADE = { g: 'massa', kg: 'massa', ml: 'volume', L: 'volume', unidade: 'contagem' };
const UNIDADE_DE_REFERÊNCIA_DA_FAMÍLIA = { massa: 'kg', volume: 'L', contagem: 'unidade' };

export function calcularPreçoPorUnidade({ embalagens = [] } = {}) {
  if (!Array.isArray(embalagens) || embalagens.length < 2 || embalagens.length > 4) {
    return { válido: false, erro: 'Informe de duas a quatro embalagens para comparar.' };
  }
  for (const embalagem of embalagens) {
    const rótulo = embalagem.nome && embalagem.nome.trim() ? embalagem.nome.trim() : 'Embalagem';
    if (!Number.isFinite(embalagem.quantidade) || embalagem.quantidade <= 0) {
      return { válido: false, erro: `${rótulo}: informe uma quantidade maior que zero.` };
    }
    if (!Number.isFinite(embalagem.preço) || embalagem.preço <= 0) {
      return { válido: false, erro: `${rótulo}: informe um preço maior que zero.` };
    }
    if (!FAMÍLIA_DA_UNIDADE[embalagem.unidade]) {
      return { válido: false, erro: `${rótulo}: unidade desconhecida.` };
    }
  }

  const famílias = new Set(embalagens.map((embalagem) => FAMÍLIA_DA_UNIDADE[embalagem.unidade]));
  if (famílias.size > 1) {
    return {
      válido: false,
      erro: 'Todas as embalagens precisam usar a mesma grandeza (todas em massa, todas em volume ou todas em unidades) para serem comparadas.',
    };
  }
  const família = [...famílias][0];
  const unidadeDeReferência = UNIDADE_DE_REFERÊNCIA_DA_FAMÍLIA[família];

  const embalagensCalculadas = embalagens.map((embalagem) => {
    const quantidadeNaReferência = (embalagem.quantidade * FATOR_PARA_BASE[embalagem.unidade]) / FATOR_PARA_BASE[unidadeDeReferência];
    return { ...embalagem, preçoPorUnidadeDeReferência: embalagem.preço / quantidadeNaReferência };
  });

  const maisEconômica = embalagensCalculadas.reduce((menor, atual) => (atual.preçoPorUnidadeDeReferência < menor.preçoPorUnidadeDeReferência ? atual : menor));

  return { válido: true, unidadeDeReferência, embalagens: embalagensCalculadas, maisEconômicaNome: maisEconômica.nome };
}

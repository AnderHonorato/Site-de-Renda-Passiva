// Catálogo de itens padrão de cada perfil de evento (churrasco, festa infantil e
// almoço/encontro), no formato esperado por calcularPlanoDeConsumo. As premissas com
// fonte pública verificada trazem a referência em "fonte"; as demais são premissas
// iniciais do site (marcadas com fonte: null), pensadas para o caso mais comum e
// pensadas para serem ajustadas pela pessoa usuária antes de calcular.
const FONTE_IFOOD = 'Quantidade de carne para churrasco: cálculo por pessoa — institucional.ifood.com.br';
const FONTE_DESCORCHA = 'Bebida por pessoa na festa + calculadora grátis — br.descorcha.com';

function item(base) {
  return { fraçãoPorCriança: 0.5, incluído: true, comOsso: false, cru: false, embalagemNaUnidadeBase: null, preçoPorUnidadeDeCompraEmCentavos: null, fonte: null, éCarneVermelha: false, ...base };
}

const CATÁLOGOS = {
  churrasco: () => [
    item({ chave: 'carne-sem-osso', descrição: 'Carne bovina sem osso (picanha, alcatra, fraldinha)', grupo: 'carne', categoriaDePúblico: 'carne', unidadeBase: 'g', quantidadePorAdulto: 450, éCarneVermelha: true, embalagemNaUnidadeBase: 1000, fonte: FONTE_IFOOD }),
    item({ chave: 'costela-com-osso', descrição: 'Costela bovina com osso', grupo: 'carne', categoriaDePúblico: 'carne', unidadeBase: 'g', quantidadePorAdulto: 550, éCarneVermelha: true, comOsso: true, perdaDoOssoPercentual: 35, embalagemNaUnidadeBase: 1000, fonte: FONTE_IFOOD }),
    item({ chave: 'linguiça', descrição: 'Linguiça', grupo: 'carne', categoriaDePúblico: 'carne', unidadeBase: 'g', quantidadePorAdulto: 120, éCarneVermelha: true, embalagemNaUnidadeBase: 500, fonte: FONTE_IFOOD }),
    item({ chave: 'frango', descrição: 'Frango (coxa, asa ou sobrecoxa)', grupo: 'carne', categoriaDePúblico: 'carne', unidadeBase: 'g', quantidadePorAdulto: 300, éCarneVermelha: false, embalagemNaUnidadeBase: 1000 }),
    item({ chave: 'opção-vegetariana', descrição: 'Opção vegetariana (queijo coalho, legumes ou hambúrguer vegetal)', grupo: 'vegetariano', categoriaDePúblico: 'vegetariano', unidadeBase: 'g', quantidadePorAdulto: 350 }),
    item({ chave: 'pão-de-alho', descrição: 'Pão de alho', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'un', quantidadePorAdulto: 0.6, embalagemNaUnidadeBase: 4 }),
    item({ chave: 'vinagrete', descrição: 'Vinagrete', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 60 }),
    item({ chave: 'farofa', descrição: 'Farofa', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 50 }),
    item({ chave: 'maionese', descrição: 'Maionese de batata', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 40 }),
    item({ chave: 'água', descrição: 'Água', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml', quantidadePorAdulto: 700, embalagemNaUnidadeBase: 500, fonte: FONTE_DESCORCHA }),
    item({ chave: 'refrigerante-suco', descrição: 'Refrigerante ou suco', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml', quantidadePorAdulto: 700, embalagemNaUnidadeBase: 2000, fonte: FONTE_DESCORCHA }),
    item({ chave: 'cerveja', descrição: 'Cerveja', grupo: 'bebidaAlcoólica', categoriaDePúblico: 'álcool', unidadeBase: 'ml', quantidadePorAdulto: 1400, fraçãoPorCriança: 0, embalagemNaUnidadeBase: 350, fonte: FONTE_DESCORCHA }),
    item({ chave: 'vinho', descrição: 'Vinho', grupo: 'bebidaAlcoólica', categoriaDePúblico: 'álcool', unidadeBase: 'ml', quantidadePorAdulto: 300, fraçãoPorCriança: 0, embalagemNaUnidadeBase: 750, fonte: FONTE_DESCORCHA }),
  ],
  'festa-infantil': () => [
    item({ chave: 'salgados', descrição: 'Salgadinhos', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'un', quantidadePorAdulto: 8, fraçãoPorCriança: 0.75, embalagemNaUnidadeBase: 50 }),
    item({ chave: 'docinhos', descrição: 'Docinhos', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'un', quantidadePorAdulto: 4, fraçãoPorCriança: 0.75, embalagemNaUnidadeBase: 50 }),
    item({ chave: 'bolo', descrição: 'Bolo', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 100, fraçãoPorCriança: 1 }),
    item({ chave: 'opção-vegetariana', descrição: 'Opção vegetariana ou sem carne', grupo: 'vegetariano', categoriaDePúblico: 'vegetariano', unidadeBase: 'un', quantidadePorAdulto: 6 }),
    item({ chave: 'suco-refresco', descrição: 'Suco ou refresco', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml', quantidadePorAdulto: 500, fraçãoPorCriança: 0.8, embalagemNaUnidadeBase: 1000, fonte: FONTE_DESCORCHA }),
    item({ chave: 'água', descrição: 'Água', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml', quantidadePorAdulto: 500, fraçãoPorCriança: 0.6, embalagemNaUnidadeBase: 500, fonte: FONTE_DESCORCHA }),
    item({ chave: 'bebida-para-responsáveis', descrição: 'Cerveja ou vinho para os responsáveis (opcional)', grupo: 'bebidaAlcoólica', categoriaDePúblico: 'álcool', unidadeBase: 'ml', quantidadePorAdulto: 700, fraçãoPorCriança: 0, embalagemNaUnidadeBase: 350, fonte: FONTE_DESCORCHA, incluído: false }),
  ],
  almoço: () => [
    item({ chave: 'proteína-principal', descrição: 'Proteína principal sem osso (carne, frango ou peixe)', grupo: 'carne', categoriaDePúblico: 'carne', unidadeBase: 'g', quantidadePorAdulto: 200, éCarneVermelha: true, embalagemNaUnidadeBase: 1000 }),
    item({ chave: 'arroz', descrição: 'Arroz cru', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 100, cru: true, fatorCruParaCozido: 2.5, embalagemNaUnidadeBase: 1000 }),
    item({ chave: 'feijão', descrição: 'Feijão cru', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 60, cru: true, fatorCruParaCozido: 2.2, embalagemNaUnidadeBase: 1000 }),
    item({ chave: 'salada', descrição: 'Salada', grupo: 'acompanhamento', categoriaDePúblico: 'geral', unidadeBase: 'g', quantidadePorAdulto: 80 }),
    item({ chave: 'opção-vegetariana', descrição: 'Prato vegetariano', grupo: 'vegetariano', categoriaDePúblico: 'vegetariano', unidadeBase: 'g', quantidadePorAdulto: 300 }),
    item({ chave: 'suco-refresco', descrição: 'Suco ou refresco', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml', quantidadePorAdulto: 400, embalagemNaUnidadeBase: 1000, fonte: FONTE_DESCORCHA }),
    item({ chave: 'água', descrição: 'Água', grupo: 'bebidaNãoAlcoólica', categoriaDePúblico: 'geral', unidadeBase: 'ml', quantidadePorAdulto: 700, embalagemNaUnidadeBase: 500, fonte: FONTE_DESCORCHA }),
    item({ chave: 'cerveja', descrição: 'Cerveja', grupo: 'bebidaAlcoólica', categoriaDePúblico: 'álcool', unidadeBase: 'ml', quantidadePorAdulto: 700, fraçãoPorCriança: 0, embalagemNaUnidadeBase: 350, fonte: FONTE_DESCORCHA }),
    item({ chave: 'vinho', descrição: 'Vinho', grupo: 'bebidaAlcoólica', categoriaDePúblico: 'álcool', unidadeBase: 'ml', quantidadePorAdulto: 250, fraçãoPorCriança: 0, embalagemNaUnidadeBase: 750, fonte: FONTE_DESCORCHA }),
  ],
};

export function montarCatálogoDeItensPadrão(perfil) {
  const construtor = CATÁLOGOS[perfil];
  if (!construtor) return [];
  return construtor();
}

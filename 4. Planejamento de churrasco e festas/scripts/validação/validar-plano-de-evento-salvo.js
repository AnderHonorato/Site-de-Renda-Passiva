// Confere um plano de evento (churrasco, festa infantil ou almoço) salvo ou importado
// antes de aceitá-lo. Usado tanto ao reabrir um registro quanto ao importar uma cópia
// local, por isso é rigoroso: qualquer campo fora do esperado recusa o registro inteiro.
const PERFIS_VÁLIDOS = ['churrasco', 'festa-infantil', 'almoço'];
const APETITES_VÁLIDOS = ['leve', 'médio', 'alto'];

const inteiroNaFaixa = (valor, mínimo, máximo) => Number.isInteger(valor) && valor >= mínimo && valor <= máximo;
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;

function itemAjustadoVálido(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.chave === 'string' &&
    item.chave.length >= 1 &&
    item.chave.length <= 60 &&
    typeof item.incluído === 'boolean' &&
    númeroNaFaixa(item.quantidadePorAdulto, 0, 1e6) &&
    (item.embalagemNaUnidadeBase === null || númeroNaFaixa(item.embalagemNaUnidadeBase, 0.001, 1e6)) &&
    (item.preçoPorUnidadeDeCompraEmCentavos === null || (Number.isInteger(item.preçoPorUnidadeDeCompraEmCentavos) && item.preçoPorUnidadeDeCompraEmCentavos >= 0 && item.preçoPorUnidadeDeCompraEmCentavos <= 1e10))
  );
}

export function validarPlanoDeEventoSalvo(registro) {
  return (
    registro !== null &&
    typeof registro === 'object' &&
    typeof registro.nome === 'string' &&
    registro.nome.trim().length >= 1 &&
    registro.nome.length <= 120 &&
    PERFIS_VÁLIDOS.includes(registro.perfil) &&
    inteiroNaFaixa(registro.adultos, 0, 5000) &&
    inteiroNaFaixa(registro.crianças, 0, 5000) &&
    registro.adultos + registro.crianças >= 1 &&
    númeroNaFaixa(registro.duraçãoEmHoras, 0.01, 72) &&
    APETITES_VÁLIDOS.includes(registro.apetite) &&
    inteiroNaFaixa(registro.vegetarianos, 0, 5000) &&
    inteiroNaFaixa(registro.semCarneVermelha, 0, 5000) &&
    inteiroNaFaixa(registro.adultosComConsumoDeÁlcool, 0, registro.adultos) &&
    Array.isArray(registro.itens) &&
    registro.itens.length >= 1 &&
    registro.itens.length <= 60 &&
    registro.itens.every(itemAjustadoVálido)
  );
}

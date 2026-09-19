// Junta os ingredientes de várias receitas, cada uma multiplicada pela sua quantidade
// de lotes, somando por nome de ingrediente (convertendo unidades compatíveis).
// Ingredientes com o mesmo nome em unidades incompatíveis geram um erro claro,
// em vez de somar números que não podem ser somados.
import { converterUnidade } from './converter-unidade.js';

export function agregarItensDeProdução({ linhas = [] } = {}) {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return { válido: false, erro: 'Adicione pelo menos uma receita à produção.' };
  }

  const itensPorNome = new Map();
  for (const linha of linhas) {
    if (!Number.isFinite(linha.lotes) || linha.lotes <= 0) {
      return { válido: false, erro: `Informe uma quantidade de lotes maior que zero para "${linha.nomeDaReceita ?? 'a receita'}".` };
    }
    const ingredientes = Array.isArray(linha.ingredientes) ? linha.ingredientes : [];
    for (const ingrediente of ingredientes) {
      const chave = String(ingrediente.nome ?? '').trim().toLowerCase();
      if (!chave) continue;
      const quantidadeNecessária = ingrediente.quantidadeUsada * linha.lotes;
      const existente = itensPorNome.get(chave);
      if (!existente) {
        itensPorNome.set(chave, {
          nome: ingrediente.nome,
          unidadeNecessária: ingrediente.unidadeUsada,
          quantidadeNecessária,
          unidadeComprada: ingrediente.unidadeComprada,
          quantidadeComprada: ingrediente.quantidadeComprada,
          preçoComprado: ingrediente.preçoComprado,
        });
        continue;
      }
      const convertido = converterUnidade(quantidadeNecessária, ingrediente.unidadeUsada, existente.unidadeNecessária);
      if (!convertido.válido) {
        return {
          válido: false,
          erro: `"${ingrediente.nome}" aparece em receitas com unidades incompatíveis (${existente.unidadeNecessária} e ${ingrediente.unidadeUsada}). Ajuste as receitas para usar a mesma grandeza.`,
        };
      }
      existente.quantidadeNecessária += convertido.valor;
    }
  }

  if (itensPorNome.size === 0) {
    return { válido: false, erro: 'Nenhuma receita selecionada tem ingredientes para comprar.' };
  }
  return { válido: true, itens: [...itensPorNome.values()] };
}

// A partir de ingredientes já somados (ver agregar-itens-de-produção.js), calcula
// quantas embalagens inteiras comprar de cada um (arredondando para cima), o custo
// dessas embalagens e o valor que sobra em estoque depois da produção.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';
import { converterUnidade } from './converter-unidade.js';

export function calcularListaDeCompras({ itens = [] } = {}) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return { válido: false, erro: 'Nenhum ingrediente para comprar.' };
  }

  const itensCalculados = [];
  for (const item of itens) {
    const rótulo = item.nome && item.nome.trim() ? item.nome.trim() : 'Ingrediente';
    if (!Number.isFinite(item.preçoComprado) || item.preçoComprado <= 0) {
      return { válido: false, erro: `${rótulo}: informe o preço da embalagem comprada.` };
    }
    if (!Number.isFinite(item.quantidadeComprada) || item.quantidadeComprada <= 0) {
      return { válido: false, erro: `${rótulo}: a quantidade da embalagem comprada precisa ser maior que zero.` };
    }
    const convertido = converterUnidade(item.quantidadeNecessária, item.unidadeNecessária, item.unidadeComprada);
    if (!convertido.válido) {
      return { válido: false, erro: `${rótulo}: ${convertido.erro}` };
    }
    const necessáriaNaUnidadeComprada = convertido.valor;
    const pacotes = arredondarParaCima(necessáriaNaUnidadeComprada / item.quantidadeComprada);
    const custoDosPacotes = pacotes * item.preçoComprado;
    const sobraNaUnidadeComprada = pacotes * item.quantidadeComprada - necessáriaNaUnidadeComprada;
    const sobraEmReais = (sobraNaUnidadeComprada / item.quantidadeComprada) * item.preçoComprado;
    itensCalculados.push({ ...item, nome: rótulo, necessáriaNaUnidadeComprada, pacotes, custoDosPacotes, sobraNaUnidadeComprada, sobraEmReais });
  }

  const custoTotal = itensCalculados.reduce((soma, item) => soma + item.custoDosPacotes, 0);
  const sobraTotalEmReais = itensCalculados.reduce((soma, item) => soma + item.sobraEmReais, 0);

  return { válido: true, itens: itensCalculados, custoTotal, sobraTotalEmReais };
}

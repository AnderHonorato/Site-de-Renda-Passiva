// Página "Ficha técnica de receita": monta uma ficha imprimível de uma receita salva,
// com ingredientes, quantidades, rendimento, tempo de preparo e custo por unidade.
import { listarRegistrosLocais } from '../comum/armazenamento/listar-registros-locais.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { calcularCustoDaReceita } from '../cálculos/calcular-custo-da-receita.js';

const formulário = document.getElementById('formulário-ficha');
const seleçãoDeReceita = document.getElementById('receita-da-ficha');
const avisoSemReceitas = document.querySelector('[data-sem-receitas]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');

const formatadorDeData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const receitasSalvas = listarRegistrosLocais('receitas');
if (receitasSalvas.length === 0) {
  avisoSemReceitas.hidden = false;
  formulário.querySelector('button[type="submit"]').disabled = true;
} else {
  seleçãoDeReceita.replaceChildren(...receitasSalvas.map((receita) => criarElemento('option', { texto: receita.nome, atributos: { value: receita.id } })));
}

function linhaDeIngrediente(ingrediente, custoCalculado) {
  return criarElemento('tr', {}, [
    criarElemento('td', { texto: ingrediente.nome }),
    criarElemento('td', { texto: `${formatarNúmero(ingrediente.quantidadeUsada, { casas: 3 })} ${ingrediente.unidadeUsada}` }),
    criarElemento('td', { texto: `${formatarNúmero(ingrediente.quantidadeComprada, { casas: 3 })} ${ingrediente.unidadeComprada} por ${formatarMoeda(ingrediente.preçoComprado)}` }),
    criarElemento('td', { texto: formatarMoeda(custoCalculado.custoConsumido) }),
  ]);
}

function montarFicha(receita, custo) {
  return criarElemento('article', { classe: 'documento-de-orçamento' }, [
    criarElemento('header', {}, [
      criarElemento('p', { classe: 'sobretítulo', texto: 'Ficha técnica' }),
      criarElemento('h2', { texto: receita.nome }),
      criarElemento('p', { texto: `Emitida em ${formatadorDeData.format(new Date())}` }),
    ]),
    criarElemento('dl', { classe: 'lista-de-resultado' }, [
      criarElemento('div', {}, [criarElemento('dt', { texto: 'Rendimento' }), criarElemento('dd', { texto: `${receita.rendimentoAproveitável} unidades` })]),
      criarElemento('div', {}, [criarElemento('dt', { texto: 'Tempo de preparo' }), criarElemento('dd', { texto: `${receita.tempoDePreparoEmMinutos} minutos` })]),
      criarElemento('div', {}, [criarElemento('dt', { texto: 'Custo por unidade' }), criarElemento('dd', { texto: formatarMoeda(custo.custoPorUnidade) })]),
      criarElemento('div', {}, [criarElemento('dt', { texto: 'Custo consumido total' }), criarElemento('dd', { texto: formatarMoeda(custo.custoConsumidoTotal) })]),
    ]),
    criarElemento('div', { classe: 'tabela-rolável' }, [
      criarElemento('table', { classe: 'tabela' }, [
        criarElemento('thead', {}, [criarElemento('tr', {}, [criarElemento('th', { texto: 'Ingrediente', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Quantidade usada', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Embalagem comprada', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Custo consumido', atributos: { scope: 'col' } })])]),
        criarElemento('tbody', {}, receita.ingredientes.map((ingrediente, índice) => linhaDeIngrediente(ingrediente, custo.ingredientesCalculados[índice]))),
      ]),
    ]),
  ]);
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const receita = lerRegistroLocal('receitas', seleçãoDeReceita.value);
  if (!receita) {
    exibirMensagem('Escolha uma receita salva válida.', { tipo: 'erro' });
    return;
  }
  const custo = calcularCustoDaReceita(receita);
  if (!custo.válido) {
    exibirMensagem(`Não foi possível calcular essa receita: ${custo.erro}`, { tipo: 'erro' });
    return;
  }
  resultado.querySelector('[data-ficha]').replaceChildren(montarFicha(receita, custo));
  estadoVazio.hidden = true;
  resultado.hidden = false;
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());

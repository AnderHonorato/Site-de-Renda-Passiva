// Página "Simulador de desconto": efeito de um desconto percentual sobre o preço já
// calculado da peça, com aviso claro de prejuízo. Não salva ficha: é uma simulação rápida.
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularEfeitoDeDesconto } from '../cálculos/calcular-efeito-de-desconto.js';

const formulário = document.getElementById('formulário-desconto');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const avisoDePrejuízo = document.querySelector('[data-aviso-prejuízo]');
const campo = (id) => document.getElementById(id);

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const preço = validarQuantidade(campo('preço').value, { rótulo: 'Preço', mínimo: 0.01, máximo: 1e9, permitirZero: false, casasMáximas: 2 });
  if (!preço.válido) { mostrarErroDeCampo(campo('preço'), preço.erro); válido = false; }

  const custo = validarQuantidade(campo('custo').value, { rótulo: 'Custo', mínimo: 0, máximo: 1e9, permitirZero: true, casasMáximas: 2 });
  if (!custo.válido) { mostrarErroDeCampo(campo('custo'), custo.erro); válido = false; }

  const desconto = validarQuantidade(campo('desconto').value, { rótulo: 'Desconto', mínimo: 0, máximo: 99.99, permitirZero: true, casasMáximas: 2 });
  if (!desconto.válido) { mostrarErroDeCampo(campo('desconto'), desconto.erro); válido = false; }

  if (!válido) return null;
  return { preço: preço.valor, custo: custo.valor, descontoPercentual: desconto.valor };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-contribuição]');
  valorPrincipal.textContent = formatarMoeda(cálculo.contribuição);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  avisoDePrejuízo.hidden = !cálculo.prejuízo;

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Valor do desconto', formatarMoeda(cálculo.valorDoDesconto)),
    linha('Preço com desconto', formatarMoeda(cálculo.preçoComDesconto)),
    linha('Custo informado', formatarMoeda(entradas.custo)),
  );

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Preço com desconto = preço × (1 − desconto) = ${formatarMoeda(entradas.preço)} × ${formatarNúmero(1 - entradas.descontoPercentual / 100, { casas: 4 })} = ${formatarMoeda(cálculo.preçoComDesconto)}.` }),
    criarElemento('li', { texto: `Sobra = preço com desconto − custo = ${formatarMoeda(cálculo.preçoComDesconto)} − ${formatarMoeda(entradas.custo)} = ${formatarMoeda(cálculo.contribuição)}.` }),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularEfeitoDeDesconto(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('desconto'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  mostrarResultado(entradas, cálculo);
});

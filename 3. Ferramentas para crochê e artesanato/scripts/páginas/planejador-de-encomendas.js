// Página "Planejador de encomendas": horas totais, dias produtivos e data estimada de
// entrega a partir da capacidade diária e dos dias da semana marcados.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularPlanejadorDeEncomendas } from '../cálculos/calcular-planejador-de-encomendas.js';

const formulário = document.getElementById('formulário-encomenda');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
const formatadorDeData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' });

function dataLegível(iso) {
  return formatadorDeData.format(new Date(`${iso}T00:00:00Z`));
}

const entradaDeData = campo('data-de-início');
if (!entradaDeData.value) entradaDeData.value = new Date().toISOString().slice(0, 10);

function lerDiasDaSemana() {
  const dias = new Array(7).fill(false);
  for (const caixa of formulário.querySelectorAll('input[name="dia-da-semana"]:checked')) dias[Number(caixa.value)] = true;
  return dias;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const quantidade = validarQuantidade(campo('quantidade-de-peças').value, { rótulo: 'Quantidade de peças', mínimo: 1, máximo: 1e5, inteiro: true });
  if (!quantidade.válido) { mostrarErroDeCampo(campo('quantidade-de-peças'), quantidade.erro); válido = false; }

  const horasPorPeça = validarQuantidade(campo('horas-por-peça').value, { rótulo: 'Horas por peça', mínimo: 0.01, máximo: 1e4, casasMáximas: 2 });
  if (!horasPorPeça.válido) { mostrarErroDeCampo(campo('horas-por-peça'), horasPorPeça.erro); válido = false; }

  const capacidade = validarQuantidade(campo('capacidade-horas-dia').value, { rótulo: 'Capacidade por dia', mínimo: 0.01, máximo: 24, casasMáximas: 2 });
  if (!capacidade.válido) { mostrarErroDeCampo(campo('capacidade-horas-dia'), capacidade.erro); válido = false; }

  const diasDaSemanaTrabalhados = lerDiasDaSemana();
  const erroDeDias = document.getElementById('dias-da-semana-erro');
  if (diasDaSemanaTrabalhados.every((dia) => !dia)) {
    erroDeDias.textContent = 'Selecione ao menos um dia da semana em que você produz.';
    erroDeDias.hidden = false;
    válido = false;
  } else {
    erroDeDias.hidden = true;
  }

  if (!entradaDeData.value) { mostrarErroDeCampo(entradaDeData, 'Informe a data de início da produção.'); válido = false; }

  if (!válido) return null;
  return { quantidadeDePeças: quantidade.valor, horasPorPeça: horasPorPeça.valor, capacidadeHorasPorDia: capacidade.valor, diasDaSemanaTrabalhados, dataDeInício: entradaDeData.value };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-data-de-entrega]');
  valorPrincipal.textContent = dataLegível(cálculo.dataEstimadaDeEntrega);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Horas totais da encomenda', `${formatarNúmero(cálculo.horasTotais, { casas: 2 })} h`),
    linha('Dias produtivos necessários', String(cálculo.diasProdutivosNecessários)),
    linha('Data de início', dataLegível(entradas.dataDeInício)),
  );

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Horas totais = peças × horas por peça = ${entradas.quantidadeDePeças} × ${formatarNúmero(entradas.horasPorPeça, { casas: 2 })} h = ${formatarNúmero(cálculo.horasTotais, { casas: 2 })} h.` }),
    criarElemento('li', { texto: `Dias produtivos = horas totais ÷ capacidade por dia, arredondado para cima = ${formatarNúmero(cálculo.horasTotais, { casas: 2 })} ÷ ${formatarNúmero(entradas.capacidadeHorasPorDia, { casas: 2 })} = ${cálculo.diasProdutivosNecessários} dias.` }),
    criarElemento('li', { texto: `Contando só os dias da semana marcados a partir de ${dataLegível(entradas.dataDeInício)}, o ${cálculo.diasProdutivosNecessários}º dia produtivo cai em ${dataLegível(cálculo.dataEstimadaDeEntrega)}.` }),
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
  const cálculo = calcularPlanejadorDeEncomendas(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(entradaDeData, cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  mostrarResultado(entradas, cálculo);
});

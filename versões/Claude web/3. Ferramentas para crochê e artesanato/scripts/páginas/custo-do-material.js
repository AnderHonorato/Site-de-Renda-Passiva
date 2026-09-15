// Página "Custo do material": lê o formulário, valida, calcula, mostra resultado com
// memória de cálculo e permite salvar/reabrir o material neste aparelho.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularCustoDoMaterial } from '../cálculos/calcular-custo-do-material.js';

const COLEÇÃO = 'materiais';
const RÓTULOS_DE_UNIDADE = { g: 'g', kg: 'kg', cm: 'cm', m: 'm', un: 'un.' };
const formulário = document.getElementById('formulário-material');
const formulárioDeSalvar = document.getElementById('formulário-salvar-material');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const avisoDeConversão = document.querySelector('[data-aviso-conversão]');
const campo = (id) => document.getElementById(id);
let registroAtual = null;
let últimasEntradas = null;

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const preço = validarQuantidade(campo('preço-de-compra').value, { rótulo: 'Preço de compra', mínimo: 0.01, máximo: 1e9, permitirZero: false, casasMáximas: 2 });
  if (!preço.válido) { mostrarErroDeCampo(campo('preço-de-compra'), preço.erro); válido = false; }

  const quantidade = validarQuantidade(campo('quantidade-comprada').value, { rótulo: 'Quantidade comprada', mínimo: 0.0001, máximo: 1e9, permitirZero: false, casasMáximas: 4 });
  if (!quantidade.válido) { mostrarErroDeCampo(campo('quantidade-comprada'), quantidade.erro); válido = false; }

  const consumo = validarQuantidade(campo('consumo').value, { rótulo: 'Consumo', mínimo: 0.0001, máximo: 1e9, permitirZero: false, casasMáximas: 4 });
  if (!consumo.válido) { mostrarErroDeCampo(campo('consumo'), consumo.erro); válido = false; }

  const metros = validarQuantidade(campo('metros-por-100g').value, { rótulo: 'Metros por 100 g', mínimo: 0.01, máximo: 1e6, casasMáximas: 2, obrigatório: false });
  if (!metros.válido) { mostrarErroDeCampo(campo('metros-por-100g'), metros.erro); válido = false; }

  if (!válido) return null;
  return {
    precoDeCompra: preço.valor,
    quantidadeComprada: quantidade.valor,
    unidadeComprada: campo('unidade-comprada').value,
    consumo: consumo.valor,
    unidadeConsumo: campo('unidade-consumo').value,
    metrosPor100g: metros.valor,
  };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const unidadeComprada = RÓTULOS_DE_UNIDADE[entradas.unidadeComprada];
  const unidadeConsumo = RÓTULOS_DE_UNIDADE[entradas.unidadeConsumo];
  const valorPrincipal = resultado.querySelector('[data-custo-proporcional]');
  valorPrincipal.textContent = formatarMoeda(cálculo.custoProporcional);
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  avisoDeConversão.hidden = !cálculo.convertido;

  const linhas = [
    linha('Preço de compra', formatarMoeda(entradas.precoDeCompra)),
    linha('Quantidade comprada', `${formatarNúmero(entradas.quantidadeComprada, { casas: 4 })} ${unidadeComprada}`),
    linha('Consumo nesta peça', `${formatarNúmero(entradas.consumo, { casas: 4 })} ${unidadeConsumo}`),
    linha(`Custo por ${unidadeComprada} comprado`, formatarMoeda(cálculo.custoPorUnidadeDeCompra)),
  ];
  if (cálculo.restanteNaBase !== null) {
    linhas.push(linha('Resta do que foi comprado', `${formatarNúmero(cálculo.restanteNaBase, { casas: 4 })} ${unidadeComprada}`));
  }
  resultado.querySelector('[data-lista]').replaceChildren(...linhas);

  const memória = [
    criarElemento('li', { texto: `Custo por unidade comprada = preço ÷ quantidade comprada = ${formatarMoeda(entradas.precoDeCompra)} ÷ ${formatarNúmero(entradas.quantidadeComprada, { casas: 4 })} ${unidadeComprada} = ${formatarMoeda(cálculo.custoPorUnidadeDeCompra)} por ${unidadeComprada}.` }),
  ];
  if (cálculo.convertido) {
    memória.push(criarElemento('li', { texto: `O consumo (${formatarNúmero(entradas.consumo, { casas: 4 })} ${unidadeConsumo}) foi convertido para a mesma grandeza da compra usando ${formatarNúmero(entradas.metrosPor100g, { casas: 2 })} m por 100 g.` }));
  }
  memória.push(criarElemento('li', { texto: `Custo proporcional = custo por unidade × consumo convertido = ${formatarMoeda(cálculo.custoProporcional)}.` }));
  resultado.querySelector('[data-memória]').replaceChildren(...memória);

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularCustoDoMaterial(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('metros-por-100g'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  campo('preço-de-compra').value = decimal(registro.precoDeCompra);
  campo('quantidade-comprada').value = decimal(registro.quantidadeComprada);
  campo('unidade-comprada').value = registro.unidadeComprada;
  campo('consumo').value = decimal(registro.consumo);
  campo('unidade-consumo').value = registro.unidadeConsumo;
  campo('metros-por-100g').value = registro.metrosPor100g === null || registro.metrosPor100g === undefined ? '' : decimal(registro.metrosPor100g);
  campo('nome-do-material').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-material').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-material'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Novelo Alegria rosa”.');
    campo('nome-do-material').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Material salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    calcular();
  } else {
    exibirMensagem('O material salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}

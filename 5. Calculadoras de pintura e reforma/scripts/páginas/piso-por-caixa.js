// Página "Piso por caixa": aplica a margem de recorte à área informada e arredonda a
// compra para cima na cobertura de cada caixa, sem exceder por erro de ponto flutuante.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularPisoPorCaixa } from '../cálculos/calcular-piso-por-caixa.js';

const COLEÇÃO = 'cálculosDePiso';
const formulário = document.getElementById('formulário-piso');
const formulárioDeSalvar = document.getElementById('formulário-salvar-piso');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let registroAtual = null;
let últimasEntradas = null;

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-caixas]');
  valorPrincipal.textContent = `${cálculo.caixas} caixa${cálculo.caixas === 1 ? '' : 's'}`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Área informada', `${formatarNúmero(entradas.área, { casas: 2 })} m²`),
    linha('Área ajustada (com margem)', `${formatarNúmero(cálculo.áreaAjustada, { casas: 2 })} m²`),
    linha('Área efetivamente comprada', `${formatarNúmero(cálculo.áreaComprada, { casas: 2 })} m²`),
    linha('Sobra', `${formatarNúmero(cálculo.sobraEmÁrea, { casas: 2 })} m²`),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const área = validarQuantidade(campo('área-piso').value, { rótulo: 'Área', mínimo: 0.01, máximo: 1e6, casasMáximas: 3 });
  if (!área.válido) { mostrarErroDeCampo(campo('área-piso'), área.erro); válido = false; }

  const margem = validarQuantidade(campo('margem').value, { rótulo: 'Margem', mínimo: 0, máximo: 200, permitirZero: true, casasMáximas: 2 });
  if (!margem.válido) { mostrarErroDeCampo(campo('margem'), margem.erro); válido = false; }

  const cobertura = validarQuantidade(campo('cobertura').value, { rótulo: 'Cobertura por caixa', mínimo: 0.001, máximo: 1e4, casasMáximas: 4 });
  if (!cobertura.válido) { mostrarErroDeCampo(campo('cobertura'), cobertura.erro); válido = false; }

  if (!válido) return null;
  return { área: área.valor, margemPercentual: margem.valor, coberturaPorCaixa: cobertura.valor };
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularPisoPorCaixa(entradas);
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  campo('área-piso').value = decimal(registro.área);
  campo('margem').value = decimal(registro.margemPercentual);
  campo('cobertura').value = decimal(registro.coberturaPorCaixa);
  campo('nome-do-cálculo-de-piso').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-cálculo-de-piso').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-cálculo-de-piso'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Sala — porcelanato”.');
    campo('nome-do-cálculo-de-piso').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Cálculo de piso salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    calcular();
  } else {
    exibirMensagem('O cálculo salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}

// Página "Quantidade de rodapé": soma os lados do cômodo, desconta os trechos sem
// instalação, acrescenta a perda e arredonda para cima pelo comprimento da barra.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularRodapé } from '../cálculos/calcular-rodapé.js';

const COLEÇÃO = 'cálculosDeRodapé';
const formulário = document.getElementById('formulário-rodapé');
const formulárioDeSalvar = document.getElementById('formulário-salvar-rodapé');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const linhasDeLados = document.querySelector('[data-linhas-de-lados]');
const linhasDeTrechos = document.querySelector('[data-linhas-de-trechos]');
const campo = (id) => document.getElementById(id);
let contadorDeLados = 0;
let contadorDeTrechos = 0;
let registroAtual = null;
let últimasEntradas = null;

const SVG_NS = 'http://www.w3.org/2000/svg';
function íconeRemover(rótulo) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ícone');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(SVG_NS, 'use');
  uso.setAttribute('href', `${document.documentElement.getAttribute('data-raiz') || './'}recursos/ícones/ícones.svg#remover`);
  svg.append(uso);
  return criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': rótulo }, dados: { remover: '' } }, [svg]);
}

function novaLinhaDeMedida(contêiner, contador, rótuloDoCampo, rótuloDoBotãoRemover, valor = '') {
  const índice = contador();
  const idMedida = `${rótuloDoBotãoRemover.toLowerCase().replace(/\s+/g, '-')}-${índice}`;
  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: rótuloDoCampo, atributos: { for: idMedida } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idMedida, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 4' } }),
    ]),
    íconeRemover(rótuloDoBotãoRemover),
  ]);
  linha.querySelector(`#${idMedida}`).value = valor;
  contêiner.append(linha);
}

function novaLinhaDeLado(valor = '') {
  contadorDeLados += 1;
  novaLinhaDeMedida(linhasDeLados, () => contadorDeLados, 'Comprimento (m)', 'Remover lado', valor);
}
function novaLinhaDeTrecho(valor = '') {
  contadorDeTrechos += 1;
  novaLinhaDeMedida(linhasDeTrechos, () => contadorDeTrechos, 'Comprimento sem instalação (m)', 'Remover trecho', valor);
}

linhasDeLados.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover]');
  if (!botão) return;
  if (linhasDeLados.children.length <= 1) return;
  botão.closest('.linha-editável').remove();
});
linhasDeTrechos.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover]');
  if (!botão) return;
  botão.closest('.linha-editável').remove();
});
document.querySelector('[data-adicionar-lado]').addEventListener('click', () => novaLinhaDeLado());
document.querySelector('[data-adicionar-trecho]').addEventListener('click', () => novaLinhaDeTrecho());

function lerMedidas(contêiner, rótulo) {
  const valores = [];
  let válido = true;
  for (const linha of contêiner.querySelectorAll('.linha-editável')) {
    const entrada = linha.querySelector('input');
    const texto = entrada.value.trim();
    if (!texto) continue; // linha em branco: ignorada
    const medida = validarQuantidade(texto, { rótulo, mínimo: 0, máximo: 1000, permitirZero: true, casasMáximas: 3 });
    if (!medida.válido) { mostrarErroDeCampo(entrada, medida.erro); válido = false; continue; }
    valores.push(medida.valor);
  }
  return válido ? valores : null;
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(cálculo) {
  const valorPrincipal = resultado.querySelector('[data-barras]');
  valorPrincipal.textContent = `${cálculo.barras} barra${cálculo.barras === 1 ? '' : 's'}`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Perímetro total', `${formatarNúmero(cálculo.perímetroTotal, { casas: 2 })} m`),
    linha('Perímetro útil (com desconto dos trechos)', `${formatarNúmero(cálculo.perímetroÚtil, { casas: 2 })} m`),
    linha('Comprimento com perda', `${formatarNúmero(cálculo.comprimentoComPerda, { casas: 2 })} m`),
    linha('Comprimento comprado', `${formatarNúmero(cálculo.comprimentoComprado, { casas: 2 })} m`),
    linha('Sobra', `${formatarNúmero(cálculo.sobraEmComprimento, { casas: 2 })} m`),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const lados = lerMedidas(linhasDeLados, 'Lado');
  if (lados === null) válido = false;
  if (lados && lados.length === 0) { exibirMensagem('Adicione ao menos um lado do cômodo.', { tipo: 'erro' }); válido = false; }

  const trechos = lerMedidas(linhasDeTrechos, 'Trecho sem instalação');
  if (trechos === null) válido = false;

  const perda = validarQuantidade(campo('perda').value, { rótulo: 'Perda', mínimo: 0, máximo: 200, permitirZero: true, casasMáximas: 2 });
  if (!perda.válido) { mostrarErroDeCampo(campo('perda'), perda.erro); válido = false; }

  const comprimentoDaBarra = validarQuantidade(campo('comprimento-da-barra').value, { rótulo: 'Comprimento da barra', mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
  if (!comprimentoDaBarra.válido) { mostrarErroDeCampo(campo('comprimento-da-barra'), comprimentoDaBarra.erro); válido = false; }

  if (!válido) return null;
  return { lados, trechosSemInstalação: trechos, perdaPercentual: perda.valor, comprimentoDaBarra: comprimentoDaBarra.valor };
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularRodapé(entradas);
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  linhasDeLados.replaceChildren();
  linhasDeTrechos.replaceChildren();
  contadorDeLados = 0;
  contadorDeTrechos = 0;
  for (const lado of registro.lados) novaLinhaDeLado(decimal(lado));
  for (const trecho of registro.trechosSemInstalação ?? []) novaLinhaDeTrecho(decimal(trecho));
  campo('perda').value = decimal(registro.perdaPercentual);
  campo('comprimento-da-barra').value = decimal(registro.comprimentoDaBarra);
  campo('nome-do-cálculo-de-rodapé').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-cálculo-de-rodapé').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-cálculo-de-rodapé'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Sala de estar”.');
    campo('nome-do-cálculo-de-rodapé').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Cálculo de rodapé salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

novaLinhaDeLado();

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

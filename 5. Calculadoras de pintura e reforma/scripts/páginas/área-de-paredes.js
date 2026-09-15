// Página "Área de paredes": soma superfícies (largura × altura), desconta só as aberturas
// marcadas para desconto e mostra a área útil total e por superfície. Permite salvar e
// reabrir o cômodo neste aparelho.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularÁreaDeParedes } from '../cálculos/calcular-área-de-paredes.js';

const COLEÇÃO = 'cômodos';
const formulário = document.getElementById('formulário-cômodo');
const formulárioDeSalvar = document.getElementById('formulário-salvar-cômodo');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const linhasDeSuperfícies = document.querySelector('[data-linhas-de-superfícies]');
const linhasDeAberturas = document.querySelector('[data-linhas-de-aberturas]');
const campo = (id) => document.getElementById(id);
let contadorDeSuperfícies = 0;
let contadorDeAberturas = 0;
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

function listaDeSuperfícies() {
  return [...linhasDeSuperfícies.querySelectorAll('.linha-editável')].map((linha) => ({
    id: linha.dataset.idDaSuperfície,
    nome: linha.querySelector('input[data-campo-nome]').value.trim(),
  }));
}

function atualizarOpçõesDeSuperfícieEmAberturas() {
  const superfícies = listaDeSuperfícies();
  for (const linha of linhasDeAberturas.querySelectorAll('.linha-editável')) {
    const seleção = linha.querySelector('select');
    const selecionadoAntes = seleção.value;
    seleção.replaceChildren(
      ...superfícies.map((superfície, índice) => criarElemento('option', { texto: superfície.nome || `Superfície ${índice + 1}`, atributos: { value: superfície.id } })),
    );
    if (superfícies.some((superfície) => superfície.id === selecionadoAntes)) seleção.value = selecionadoAntes;
  }
}

function novaLinhaDeSuperfície(nome = '', largura = '', altura = '', idExistente = null) {
  contadorDeSuperfícies += 1;
  const índice = contadorDeSuperfícies;
  const id = idExistente ?? `superfície-${índice}`;
  const idNome = `superfície-nome-${índice}`;
  const idLargura = `superfície-largura-${índice}`;
  const idAltura = `superfície-altura-${índice}`;

  const entradaNome = criarElemento('input', { classe: 'entrada', atributos: { id: idNome, type: 'text', maxlength: 60, autocomplete: 'off', placeholder: 'Ex.: Parede norte' }, dados: { campoNome: '' } });
  const linha = criarElemento('div', { classe: 'linha-editável', dados: { idDaSuperfície: id } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Nome (opcional)', atributos: { for: idNome } }), entradaNome]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Largura (m)', atributos: { for: idLargura } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idLargura, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 4' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Altura (m)', atributos: { for: idAltura } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idAltura, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 2,6' } }),
    ]),
    íconeRemover('Remover superfície'),
  ]);
  linha.querySelector(`#${idNome}`).value = nome;
  linha.querySelector(`#${idLargura}`).value = largura;
  linha.querySelector(`#${idAltura}`).value = altura;
  linhasDeSuperfícies.append(linha);
  entradaNome.addEventListener('input', atualizarOpçõesDeSuperfícieEmAberturas);
  atualizarOpçõesDeSuperfícieEmAberturas();
}

function novaLinhaDeAbertura(nome = '', superfícieId = null, largura = '', altura = '', descontar = true) {
  contadorDeAberturas += 1;
  const índice = contadorDeAberturas;
  const idNome = `abertura-nome-${índice}`;
  const idSuperfície = `abertura-superfície-${índice}`;
  const idLargura = `abertura-largura-${índice}`;
  const idAltura = `abertura-altura-${índice}`;
  const idDescontar = `abertura-descontar-${índice}`;

  const seleçãoSuperfície = criarElemento('select', { classe: 'entrada seleção', atributos: { id: idSuperfície } });
  const caixaDescontar = criarElemento('input', { atributos: { id: idDescontar, type: 'checkbox' } });
  caixaDescontar.checked = Boolean(descontar);

  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Nome (opcional)', atributos: { for: idNome } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idNome, type: 'text', maxlength: 60, autocomplete: 'off', placeholder: 'Ex.: Porta' } }),
    ]),
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Superfície', atributos: { for: idSuperfície } }), seleçãoSuperfície]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Largura (m)', atributos: { for: idLargura } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idLargura, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 0,8' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Altura (m)', atributos: { for: idAltura } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idAltura, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 2,1' } }),
    ]),
    criarElemento('div', { classe: 'campo-estreito' }, [criarElemento('label', { classe: 'opção' }, [caixaDescontar, criarElemento('span', { texto: 'Descontar' })])]),
    íconeRemover('Remover abertura'),
  ]);
  linha.querySelector(`#${idNome}`).value = nome;
  linha.querySelector(`#${idLargura}`).value = largura;
  linha.querySelector(`#${idAltura}`).value = altura;
  linhasDeAberturas.append(linha);
  atualizarOpçõesDeSuperfícieEmAberturas();
  if (superfícieId) seleçãoSuperfície.value = superfícieId;
}

linhasDeSuperfícies.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover]');
  if (!botão) return;
  if (linhasDeSuperfícies.children.length <= 1) return;
  botão.closest('.linha-editável').remove();
  atualizarOpçõesDeSuperfícieEmAberturas();
});
linhasDeAberturas.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover]');
  if (!botão) return;
  botão.closest('.linha-editável').remove();
});
document.querySelector('[data-adicionar-superfície]').addEventListener('click', () => novaLinhaDeSuperfície());
document.querySelector('[data-adicionar-abertura]').addEventListener('click', () => novaLinhaDeAbertura());

function lerSuperfícies() {
  const superfícies = [];
  let válido = true;
  for (const linha of linhasDeSuperfícies.querySelectorAll('.linha-editável')) {
    const entradaLargura = linha.querySelectorAll('input')[1];
    const entradaAltura = linha.querySelectorAll('input')[2];
    const nome = linha.querySelector('input[data-campo-nome]').value.trim();
    const largura = validarQuantidade(entradaLargura.value, { rótulo: `${nome || 'Superfície'}: largura`, mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
    if (!largura.válido) { mostrarErroDeCampo(entradaLargura, largura.erro); válido = false; continue; }
    const altura = validarQuantidade(entradaAltura.value, { rótulo: `${nome || 'Superfície'}: altura`, mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
    if (!altura.válido) { mostrarErroDeCampo(entradaAltura, altura.erro); válido = false; continue; }
    superfícies.push({ id: linha.dataset.idDaSuperfície, nome, largura: largura.valor, altura: altura.valor });
  }
  return válido ? superfícies : null;
}

function lerAberturas() {
  const aberturas = [];
  let válido = true;
  for (const linha of linhasDeAberturas.querySelectorAll('.linha-editável')) {
    const entradaNome = linha.querySelectorAll('input')[0];
    const seleção = linha.querySelector('select');
    const entradaLargura = linha.querySelectorAll('input')[1];
    const entradaAltura = linha.querySelectorAll('input')[2];
    const caixaDescontar = linha.querySelector('input[type="checkbox"]');
    const nome = entradaNome.value.trim();
    const larguraTexto = entradaLargura.value.trim();
    const alturaTexto = entradaAltura.value.trim();
    if (!nome && !larguraTexto && !alturaTexto) continue; // linha em branco: ignorada
    const largura = validarQuantidade(larguraTexto, { rótulo: `${nome || 'Abertura'}: largura`, mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
    if (!largura.válido) { mostrarErroDeCampo(entradaLargura, largura.erro); válido = false; continue; }
    const altura = validarQuantidade(alturaTexto, { rótulo: `${nome || 'Abertura'}: altura`, mínimo: 0.01, máximo: 1000, casasMáximas: 3 });
    if (!altura.válido) { mostrarErroDeCampo(entradaAltura, altura.erro); válido = false; continue; }
    aberturas.push({ nome, superfícieId: seleção.value, largura: largura.valor, altura: altura.valor, descontar: caixaDescontar.checked });
  }
  return válido ? aberturas : null;
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(cálculo) {
  const valorPrincipal = resultado.querySelector('[data-área-útil]');
  valorPrincipal.textContent = `${formatarNúmero(cálculo.áreaÚtil, { casas: 2 })} m²`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Área bruta (soma das superfícies)', `${formatarNúmero(cálculo.áreaBruta, { casas: 2 })} m²`),
    linha('Área de aberturas descontada', `${formatarNúmero(cálculo.áreaDeAberturasDescontadas, { casas: 2 })} m²`),
  );

  resultado.querySelector('[data-corpo-superfícies]').replaceChildren(
    ...cálculo.porSuperfície.map((superfície, índice) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: superfície.nome || `Superfície ${índice + 1}` }),
        criarElemento('td', { texto: `${formatarNúmero(superfície.área, { casas: 2 })} m²`, atributos: { 'data-numérico': '' } }),
        criarElemento('td', { texto: `${formatarNúmero(superfície.áreaDescontada, { casas: 2 })} m²`, atributos: { 'data-numérico': '' } }),
        criarElemento('td', { texto: `${formatarNúmero(superfície.áreaÚtil, { casas: 2 })} m²`, atributos: { 'data-numérico': '' } }),
      ]),
    ),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function calcular() {
  limparErrosDeCampo(formulário);
  const superfícies = lerSuperfícies();
  const aberturas = superfícies ? lerAberturas() : null;
  if (!superfícies || !aberturas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularÁreaDeParedes({ superfícies, aberturas });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = { superfícies, aberturas };
  mostrarResultado(cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  linhasDeSuperfícies.replaceChildren();
  linhasDeAberturas.replaceChildren();
  contadorDeSuperfícies = 0;
  contadorDeAberturas = 0;
  for (const superfície of registro.superfícies) novaLinhaDeSuperfície(superfície.nome, decimal(superfície.largura), decimal(superfície.altura), superfície.id);
  for (const abertura of registro.aberturas ?? []) novaLinhaDeAbertura(abertura.nome, abertura.superfícieId, decimal(abertura.largura), decimal(abertura.altura), abertura.descontar);
  campo('nome-do-cômodo').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-cômodo').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-cômodo'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Quarto do casal”.');
    campo('nome-do-cômodo').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Cômodo salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

novaLinhaDeSuperfície();
novaLinhaDeAbertura();

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    calcular();
  } else {
    exibirMensagem('O cômodo salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}

// Página "Controle de materiais": soma entradas e consumos lançados a um saldo inicial,
// mostra o histórico acumulado e permite salvar/reabrir o controle neste aparelho.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularSaldoDeMaterial } from '../cálculos/calcular-saldo-de-material.js';

const COLEÇÃO = 'estoqueDeMateriais';
const RÓTULOS_DE_UNIDADE = { g: 'g', kg: 'kg', cm: 'cm', m: 'm', un: 'un.' };
const formulário = document.getElementById('formulário-estoque');
const formulárioDeSalvar = document.getElementById('formulário-salvar-estoque');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const avisoNegativo = document.querySelector('[data-aviso-negativo]');
const linhasDeLançamentos = document.querySelector('[data-linhas-de-lançamentos]');
const campo = (id) => document.getElementById(id);
let registroAtual = null;
let últimasEntradas = null;
let contadorDeLinhas = 0;

const SVG_NS = 'http://www.w3.org/2000/svg';
function íconeRemover() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ícone');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(SVG_NS, 'use');
  uso.setAttribute('href', `${document.documentElement.getAttribute('data-raiz') || './'}recursos/ícones/ícones.svg#remover`);
  svg.append(uso);
  return svg;
}

function novaLinhaDeLançamento(tipo = 'entrada', quantidade = '') {
  contadorDeLinhas += 1;
  const índice = contadorDeLinhas;
  const idTipo = `lançamento-tipo-${índice}`;
  const idQuantidade = `lançamento-quantidade-${índice}`;
  const seleçãoTipo = criarElemento('select', { classe: 'entrada seleção', atributos: { id: idTipo } }, [
    criarElemento('option', { texto: 'Entrada', atributos: { value: 'entrada' } }),
    criarElemento('option', { texto: 'Consumo', atributos: { value: 'consumo' } }),
  ]);
  seleçãoTipo.value = tipo;
  const botãoRemover = criarElemento(
    'button',
    { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover lançamento' }, dados: { removerLançamento: '' } },
    [íconeRemover()],
  );
  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Tipo', atributos: { for: idTipo } }), seleçãoTipo]),
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Quantidade', atributos: { for: idQuantidade } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idQuantidade, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 25' } }),
    ]),
    botãoRemover,
  ]);
  linha.querySelector(`#${idQuantidade}`).value = quantidade;
  linhasDeLançamentos.append(linha);
}

linhasDeLançamentos.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover-lançamento]');
  if (!botão) return;
  if (linhasDeLançamentos.children.length <= 1) return;
  botão.closest('.linha-editável').remove();
});

document.querySelector('[data-adicionar-lançamento]').addEventListener('click', () => novaLinhaDeLançamento());

function lerLançamentos() {
  const lançamentos = [];
  let válido = true;
  for (const linha of linhasDeLançamentos.querySelectorAll('.linha-editável')) {
    const tipo = linha.querySelector('select').value;
    const entradaQuantidade = linha.querySelector('input');
    const quantidadeTexto = entradaQuantidade.value.trim();
    if (!quantidadeTexto) continue; // linha em branco: ignorada, não é erro
    const quantidade = validarQuantidade(quantidadeTexto, { rótulo: tipo === 'entrada' ? 'Quantidade de entrada' : 'Quantidade de consumo', mínimo: 0.0001, máximo: 1e9, casasMáximas: 4 });
    if (!quantidade.válido) {
      mostrarErroDeCampo(entradaQuantidade, quantidade.erro);
      válido = false;
      continue;
    }
    lançamentos.push({ tipo, quantidade: quantidade.valor });
  }
  return válido ? lançamentos : null;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const saldoInicial = validarQuantidade(campo('saldo-inicial').value, { rótulo: 'Saldo inicial', mínimo: 0, máximo: 1e9, permitirZero: true, casasMáximas: 4 });
  if (!saldoInicial.válido) { mostrarErroDeCampo(campo('saldo-inicial'), saldoInicial.erro); válido = false; }

  const lançamentos = lerLançamentos();
  if (lançamentos === null) válido = false;
  if (lançamentos && lançamentos.length === 0) {
    exibirMensagem('Adicione ao menos um lançamento de entrada ou consumo.', { tipo: 'erro' });
    válido = false;
  }

  if (!válido) return null;
  return { unidade: campo('unidade').value, saldoInicial: saldoInicial.valor, lançamentos };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const unidade = RÓTULOS_DE_UNIDADE[entradas.unidade];
  const valorPrincipal = resultado.querySelector('[data-saldo-atual]');
  valorPrincipal.textContent = `${formatarNúmero(cálculo.saldoAtual, { casas: 4 })} ${unidade}`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  avisoNegativo.hidden = !cálculo.abaixoDeZero;

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Saldo inicial', `${formatarNúmero(entradas.saldoInicial, { casas: 4 })} ${unidade}`),
    linha('Total de entradas', `${formatarNúmero(cálculo.totalEntradas, { casas: 4 })} ${unidade}`),
    linha('Total de consumos', `${formatarNúmero(cálculo.totalConsumos, { casas: 4 })} ${unidade}`),
  );

  resultado.querySelector('[data-corpo-histórico]').replaceChildren(
    ...cálculo.histórico.map((item) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: item.tipo === 'entrada' ? 'Entrada' : 'Consumo' }),
        criarElemento('td', { texto: `${formatarNúmero(item.quantidade, { casas: 4 })} ${unidade}`, atributos: { 'data-numérico': '' } }),
        criarElemento('td', { texto: `${formatarNúmero(item.saldoAcumulado, { casas: 4 })} ${unidade}`, atributos: { 'data-numérico': '' } }),
      ]),
    ),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularSaldoDeMaterial(entradas);
  if (!cálculo.válido) {
    mostrarErroDeCampo(campo('saldo-inicial'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  campo('unidade').value = registro.unidade;
  campo('saldo-inicial').value = decimal(registro.saldoInicial);
  linhasDeLançamentos.replaceChildren();
  contadorDeLinhas = 0;
  for (const lançamento of registro.lançamentos.length ? registro.lançamentos : [{ tipo: 'entrada', quantidade: '' }]) novaLinhaDeLançamento(lançamento.tipo, decimal(lançamento.quantidade));
  campo('nome-do-estoque').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-estoque').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-estoque'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Fio Alegria rosa”.');
    campo('nome-do-estoque').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Controle salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

novaLinhaDeLançamento();

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    calcular();
  } else {
    exibirMensagem('O controle salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}

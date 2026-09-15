// Página "Quantidade de tinta": converte área a pintar em litros, distinguindo rendimento
// por demão de rendimento já acabado, aplica uma reserva opcional e converte para as
// embalagens vendidas. Pode reaproveitar a área de um cômodo salvo em Área de paredes.
import { listarRegistrosLocais } from '../comum/armazenamento/listar-registros-locais.js';
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
import { calcularQuantidadeDeTinta } from '../cálculos/calcular-quantidade-de-tinta.js';

const COLEÇÃO = 'cálculosDeTinta';
const formulário = document.getElementById('formulário-tinta');
const formulárioDeSalvar = document.getElementById('formulário-salvar-tinta');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const linhasDeEmbalagens = document.querySelector('[data-linhas-de-embalagens]');
const blocoDeEmbalagens = document.querySelector('[data-bloco-embalagens]');
const campo = (id) => document.getElementById(id);
let contadorDeEmbalagens = 0;
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

function novaLinhaDeEmbalagem(nome = '', litros = '') {
  contadorDeEmbalagens += 1;
  const índice = contadorDeEmbalagens;
  const idNome = `embalagem-nome-${índice}`;
  const idLitros = `embalagem-litros-${índice}`;
  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Nome da embalagem', atributos: { for: idNome } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idNome, type: 'text', maxlength: 40, autocomplete: 'off', placeholder: 'Ex.: Lata 3,6 L' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Litros', atributos: { for: idLitros } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idLitros, type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Ex.: 3,6' } }),
    ]),
    íconeRemover('Remover embalagem'),
  ]);
  linha.querySelector(`#${idNome}`).value = nome;
  linha.querySelector(`#${idLitros}`).value = litros;
  linhasDeEmbalagens.append(linha);
}

linhasDeEmbalagens.addEventListener('click', (evento) => {
  const botão = evento.target.closest('[data-remover]');
  if (!botão) return;
  botão.closest('.linha-editável').remove();
});
document.querySelector('[data-adicionar-embalagem]').addEventListener('click', () => novaLinhaDeEmbalagem());

function lerEmbalagens() {
  const embalagens = [];
  let válido = true;
  for (const linha of linhasDeEmbalagens.querySelectorAll('.linha-editável')) {
    const entradaNome = linha.querySelectorAll('input')[0];
    const entradaLitros = linha.querySelectorAll('input')[1];
    const nome = entradaNome.value.trim();
    const litrosTexto = entradaLitros.value.trim();
    if (!nome && !litrosTexto) continue; // linha em branco: ignorada
    const litros = validarQuantidade(litrosTexto, { rótulo: `${nome || 'Embalagem'}: litros`, mínimo: 0.01, máximo: 10000, casasMáximas: 3 });
    if (!litros.válido) { mostrarErroDeCampo(entradaLitros, litros.erro); válido = false; continue; }
    embalagens.push({ nome: nome || 'Embalagem', litros: litros.valor });
  }
  return válido ? embalagens : null;
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function mostrarResultado(entradas, cálculo) {
  const valorPrincipal = resultado.querySelector('[data-litros]');
  valorPrincipal.textContent = `${formatarNúmero(cálculo.litrosComReserva, { casas: 3 })} L`;
  delete valorPrincipal.dataset.atualizado;
  void valorPrincipal.offsetWidth;
  valorPrincipal.dataset.atualizado = '';

  const linhas = [
    linha('Área considerada', `${formatarNúmero(entradas.área, { casas: 2 })} m²`),
    linha('Área total a pintar (com demãos, se aplicável)', `${formatarNúmero(cálculo.áreaTotalAPintar, { casas: 2 })} m²`),
    linha('Litros necessários (sem reserva)', `${formatarNúmero(cálculo.litrosNecessários, { casas: 3 })} L`),
  ];
  if (entradas.reservaPercentual > 0) linhas.push(linha('Reserva aplicada', `${formatarNúmero(entradas.reservaPercentual, { casas: 2 })}%`));
  resultado.querySelector('[data-lista]').replaceChildren(...linhas);

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: entradas.tipoDeRendimento === 'porDemão'
      ? `Área total a pintar = ${formatarNúmero(entradas.área, { casas: 2 })} m² × ${entradas.demãos} demãos = ${formatarNúmero(cálculo.áreaTotalAPintar, { casas: 2 })} m².`
      : `Rendimento já acabado: a área não é multiplicada pelas demãos, área total = ${formatarNúmero(cálculo.áreaTotalAPintar, { casas: 2 })} m².` }),
    criarElemento('li', { texto: `Litros = ${formatarNúmero(cálculo.áreaTotalAPintar, { casas: 2 })} m² ÷ ${formatarNúmero(entradas.rendimento, { casas: 2 })} m²/L = ${formatarNúmero(cálculo.litrosNecessários, { casas: 3 })} L.` }),
    criarElemento('li', { texto: `Com reserva de ${formatarNúmero(entradas.reservaPercentual, { casas: 2 })}%: ${formatarNúmero(cálculo.litrosComReserva, { casas: 3 })} L.` }),
  );

  blocoDeEmbalagens.hidden = cálculo.porEmbalagem.length === 0;
  resultado.querySelector('[data-corpo-embalagens]').replaceChildren(
    ...cálculo.porEmbalagem.map((embalagem) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: embalagem.nome }),
        criarElemento('td', { texto: `${embalagem.quantidade}×`, atributos: { 'data-numérico': '' } }),
        criarElemento('td', { texto: `${formatarNúmero(embalagem.litrosComprados, { casas: 2 })} L`, atributos: { 'data-numérico': '' } }),
        criarElemento('td', { texto: `${formatarNúmero(embalagem.sobraEmLitros, { casas: 2 })} L`, atributos: { 'data-numérico': '' } }),
      ]),
    ),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const área = validarQuantidade(campo('área').value, { rótulo: 'Área', mínimo: 0.01, máximo: 1e6, casasMáximas: 3 });
  if (!área.válido) { mostrarErroDeCampo(campo('área'), área.erro); válido = false; }

  const demãos = validarQuantidade(campo('demãos').value, { rótulo: 'Número de demãos', mínimo: 1, máximo: 20, inteiro: true });
  if (!demãos.válido) { mostrarErroDeCampo(campo('demãos'), demãos.erro); válido = false; }

  const rendimento = validarQuantidade(campo('rendimento').value, { rótulo: 'Rendimento', mínimo: 0.01, máximo: 1e6, casasMáximas: 3 });
  if (!rendimento.válido) { mostrarErroDeCampo(campo('rendimento'), rendimento.erro); válido = false; }

  const reserva = validarQuantidade(campo('reserva').value, { rótulo: 'Reserva', mínimo: 0, máximo: 200, permitirZero: true, casasMáximas: 2 });
  if (!reserva.válido) { mostrarErroDeCampo(campo('reserva'), reserva.erro); válido = false; }

  const tipoDeRendimento = formulário.querySelector('input[name="tipo-de-rendimento"]:checked')?.value ?? 'porDemão';

  const embalagens = lerEmbalagens();
  if (embalagens === null) válido = false;

  if (!válido) return null;
  return { área: área.valor, demãos: demãos.valor, rendimento: rendimento.valor, tipoDeRendimento, reservaPercentual: reserva.valor, embalagens };
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const cálculo = calcularQuantidadeDeTinta(entradas);
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  mostrarResultado(entradas, cálculo);
}

function preencher(registro) {
  const decimal = (valor) => String(valor).replace('.', ',');
  campo('área').value = decimal(registro.área);
  campo('demãos').value = String(registro.demãos);
  campo('rendimento').value = decimal(registro.rendimento);
  campo('reserva').value = decimal(registro.reservaPercentual);
  formulário.querySelector(`input[name="tipo-de-rendimento"][value="${registro.tipoDeRendimento}"]`).checked = true;
  linhasDeEmbalagens.replaceChildren();
  contadorDeEmbalagens = 0;
  for (const embalagem of registro.embalagens ?? []) novaLinhaDeEmbalagem(embalagem.nome, decimal(embalagem.litros));
  campo('nome-do-cálculo-de-tinta').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-cálculo-de-tinta').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-cálculo-de-tinta'), 'Dê um nome de 1 a 120 caracteres, por exemplo “Sala — parede clara”.');
    campo('nome-do-cálculo-de-tinta').focus();
    return;
  }
  if (!últimasEntradas) return;
  const embalagensParaSalvar = últimasEntradas.embalagens.map((embalagem, índice) => ({ id: `embalagem-${índice + 1}`, ...embalagem }));
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, embalagens: embalagensParaSalvar, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Cálculo de tinta salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

// Reaproveita a área útil de um cômodo salvo em Área de paredes, se houver algum.
const cômodosSalvos = listarRegistrosLocais('cômodos');
if (cômodosSalvos.length > 0) {
  const seleçãoDeCômodo = campo('cômodo-salvo');
  for (const cômodo of cômodosSalvos) {
    seleçãoDeCômodo.append(criarElemento('option', { texto: cômodo.nome, atributos: { value: cômodo.id } }));
  }
  document.querySelector('[data-campo-cômodo-salvo]').hidden = false;
  seleçãoDeCômodo.addEventListener('change', () => {
    if (!seleçãoDeCômodo.value) return;
    const cômodo = cômodosSalvos.find((item) => item.id === seleçãoDeCômodo.value);
    if (!cômodo) return;
    const cálculoDoCômodo = calcularÁreaDeParedes(cômodo);
    if (cálculoDoCômodo.válido) campo('área').value = String(cálculoDoCômodo.áreaÚtil).replace('.', ',');
  });
}

novaLinhaDeEmbalagem();

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

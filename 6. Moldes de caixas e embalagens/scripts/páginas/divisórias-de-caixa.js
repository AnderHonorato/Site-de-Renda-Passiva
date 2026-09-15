// Página "Divisórias de caixa": lê o formulário, calcula as tiras com
// calcularDivisóriasDeCaixa (cálculos/), mostra uma prévia de cada tipo de tira (todas as
// tiras do mesmo tipo têm a mesma forma) e oferece PDF com todas as folhas e salvar.
import { calcularDivisóriasDeCaixa } from '../cálculos/calcular-divisórias-de-caixa.js';
import { converterParaMilímetros } from '../cálculos/converter-para-milímetros.js';
import { contarFolhasDoMolde } from '../geração/contar-folhas-do-molde.js';
import { desenharPréviaDoMolde } from '../interface/desenhar-prévia-do-molde.js';
import { mostrarAvisoDeFolhas } from '../interface/mostrar-aviso-de-folhas.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'divisórias';
const formulário = document.getElementById('formulário-divisórias');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const CAMPO_POR_CHAVE = { comprimentoInternoMm: 'comprimento', larguraInternoMm: 'largura', alturaInternoMm: 'altura', espessuraMm: 'espessura', linhas: 'linhas', colunas: 'colunas' };

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 100 : 1000;

  const valoresMm = {};
  for (const [id, rótulo] of [['comprimento', 'Comprimento interno'], ['largura', 'Largura interna'], ['altura', 'Altura interna']]) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, { rótulo, mínimo: unidade === 'cm' ? 2 : 20, máximo: máximoNaUnidade, permitirZero: false });
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valoresMm[id] = converterParaMilímetros(verificação.valor, unidade);
    }
  }

  const espessuraVerificação = validarQuantidade(campo('espessura').value, { rótulo: 'Espessura', mínimo: 0.1, máximo: 10, permitirZero: false });
  if (!espessuraVerificação.válido) {
    mostrarErroDeCampo(campo('espessura'), espessuraVerificação.erro);
    válido = false;
  }

  const linhasVerificação = validarQuantidade(campo('linhas').value, { rótulo: 'Linhas', mínimo: 1, máximo: 10, inteiro: true, permitirZero: false });
  if (!linhasVerificação.válido) {
    mostrarErroDeCampo(campo('linhas'), linhasVerificação.erro);
    válido = false;
  }
  const colunasVerificação = validarQuantidade(campo('colunas').value, { rótulo: 'Colunas', mínimo: 1, máximo: 10, inteiro: true, permitirZero: false });
  if (!colunasVerificação.válido) {
    mostrarErroDeCampo(campo('colunas'), colunasVerificação.erro);
    válido = false;
  }

  if (!válido) return null;
  return {
    unidade,
    comprimentoInternoMm: valoresMm.comprimento,
    larguraInternoMm: valoresMm.largura,
    alturaInternoMm: valoresMm.altura,
    espessuraMm: espessuraVerificação.valor,
    linhas: linhasVerificação.valor,
    colunas: colunasVerificação.valor,
    tipoDePapel: campo('tipo-de-papel').value,
    textoOpcional: '',
  };
}

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Medidas internas da caixa', `${resultadoDoCálculo.comprimentoInternoMm} × ${resultadoDoCálculo.larguraInternoMm} × ${resultadoDoCálculo.alturaInternoMm} mm`],
    ['Grade', `${resultadoDoCálculo.linhas} linhas × ${resultadoDoCálculo.colunas} colunas`],
    ['Tiras verticais necessárias', String(resultadoDoCálculo.tirasVerticais.length)],
    ['Tiras horizontais necessárias', String(resultadoDoCálculo.tirasHorizontais.length)],
    ['Espessura do material (largura do entalhe)', `${resultadoDoCálculo.espessuraMm} mm`],
  ];
  if (resultadoDoCálculo.tipoDePapel) linhas.push(['Material', resultadoDoCálculo.tipoDePapel]);
  for (const [rótulo, valor] of linhas) contêiner.append(criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor }));
}

function mostrarResultado(resultadoDoCálculo) {
  document.querySelector('[data-total-de-compartimentos]').textContent = String(resultadoDoCálculo.compartimentos);

  const blocoVertical = document.querySelector('[data-bloco-vertical]');
  const avisoVertical = document.querySelector('[data-aviso-vertical]');
  if (resultadoDoCálculo.tirasVerticais.length > 0) {
    const prévia = desenharPréviaDoMolde(document.querySelector('[data-prévia-vertical]'), resultadoDoCálculo.tirasVerticais[0]);
    document.querySelector('[data-escala-vertical]').textContent = `Prévia fora de escala real — ${Math.round(prévia.larguraMm)} × ${Math.round(prévia.alturaMm)} mm.`;
    avisoVertical.textContent = `Tira vertical (repita ${resultadoDoCálculo.tirasVerticais.length} vez${resultadoDoCálculo.tirasVerticais.length === 1 ? '' : 'es'}):`;
    avisoVertical.hidden = false;
    blocoVertical.hidden = false;
  } else {
    avisoVertical.hidden = true;
    blocoVertical.hidden = true;
  }

  const blocoHorizontal = document.querySelector('[data-bloco-horizontal]');
  const avisoHorizontal = document.querySelector('[data-aviso-horizontal]');
  if (resultadoDoCálculo.tirasHorizontais.length > 0) {
    const prévia = desenharPréviaDoMolde(document.querySelector('[data-prévia-horizontal]'), resultadoDoCálculo.tirasHorizontais[0]);
    document.querySelector('[data-escala-horizontal]').textContent = `Prévia fora de escala real — ${Math.round(prévia.larguraMm)} × ${Math.round(prévia.alturaMm)} mm.`;
    avisoHorizontal.textContent = `Tira horizontal (repita ${resultadoDoCálculo.tirasHorizontais.length} vez${resultadoDoCálculo.tirasHorizontais.length === 1 ? '' : 'es'}):`;
    avisoHorizontal.hidden = false;
    blocoHorizontal.hidden = false;
  } else {
    avisoHorizontal.hidden = true;
    blocoHorizontal.hidden = true;
  }

  mostrarResumoDeFolhas(resultadoDoCálculo);
  renderizarResumo(document.querySelector('[data-resumo-de-medidas]'), resultadoDoCálculo);
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function mostrarResumoDeFolhas(resultadoDoCálculo) {
  const quantidadeDeTiras = resultadoDoCálculo.tirasVerticais.length + resultadoDoCálculo.tirasHorizontais.length;
  // Todas as tiras verticais têm a mesma forma entre si (idem as horizontais), então basta
  // contar as folhas de uma tira de cada tipo e multiplicar pela quantidade de tiras.
  const folhasPorTiraVertical = resultadoDoCálculo.tirasVerticais.length > 0 ? contarFolhasDoMolde(resultadoDoCálculo.tirasVerticais[0].retânguloEnvolvente) : 0;
  const folhasPorTiraHorizontal = resultadoDoCálculo.tirasHorizontais.length > 0 ? contarFolhasDoMolde(resultadoDoCálculo.tirasHorizontais[0].retânguloEnvolvente) : 0;
  const total = folhasPorTiraVertical * resultadoDoCálculo.tirasVerticais.length + folhasPorTiraHorizontal * resultadoDoCálculo.tirasHorizontais.length;
  mostrarAvisoDeFolhas(document.querySelector('[data-resumo-de-folhas]'), total, Math.max(1, quantidadeDeTiras));
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const resultadoDoCálculo = calcularDivisóriasDeCaixa(entradas);
  if (!resultadoDoCálculo.válido) {
    const elementoDoCampo = CAMPO_POR_CHAVE[resultadoDoCálculo.campo];
    if (elementoDoCampo) mostrarErroDeCampo(campo(elementoDoCampo), resultadoDoCálculo.erro);
    exibirMensagem(resultadoDoCálculo.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimoResultado = resultadoDoCálculo;
  mostrarResultado(resultadoDoCálculo);
}

function preencher(registro) {
  formulário.querySelector(`input[name="unidade"][value="${registro.unidade}"]`).checked = true;
  const fator = registro.unidade === 'cm' ? 0.1 : 1;
  campo('comprimento').value = String(registro.comprimentoInternoMm * fator);
  campo('largura').value = String(registro.larguraInternoMm * fator);
  campo('altura').value = String(registro.alturaInternoMm * fator);
  campo('espessura').value = String(registro.espessuraMm);
  campo('linhas').value = String(registro.linhas);
  campo('colunas').value = String(registro.colunas);
  campo('tipo-de-papel').value = registro.tipoDePapel || '';
  campo('nome-do-registro').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  gerar();
});

resultado.querySelector('[data-ação="imprimir"]').addEventListener('click', () => imprimirPágina());

resultado.querySelector('[data-ação="baixar-pdf"]').addEventListener('click', async (evento) => {
  if (!últimoResultado) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDeDivisórias } = await import('../geração/gerar-pdf-de-divisórias.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeDivisórias({ resultado: últimoResultado, tituloDaAtividade: 'Divisórias de caixa' });
    baixarArquivo('divisórias-de-caixa.pdf', bytes, 'application/pdf');
  } catch {
    exibirMensagem('Não foi possível gerar o PDF neste aparelho. Tente novamente.', { tipo: 'erro' });
  } finally {
    botão.disabled = false;
  }
});

formulárioDeSalvar.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-registro').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-registro'), 'Dê um nome de 1 a 120 caracteres.');
    campo('nome-do-registro').focus();
    return;
  }
  if (!últimasEntradas) return;
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), ...últimasEntradas, nome });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Grade salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    gerar();
  } else {
    exibirMensagem('A grade salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}

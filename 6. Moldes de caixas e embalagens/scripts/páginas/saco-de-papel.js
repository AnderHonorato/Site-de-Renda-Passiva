// Página "Saco de papel": lê o formulário, calcula a folha escalada com
// calcularSacoDePapel (cálculos/), mostra a prévia SVG e oferece PDF/SVG sob demanda e
// salvar neste aparelho.
import { calcularSacoDePapel } from '../cálculos/calcular-saco-de-papel.js';
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

const COLEÇÃO = 'saco-de-papel';
const formulário = document.getElementById('formulário-saco');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const CAMPO_POR_CHAVE = { larguraMm: 'largura', profundidadeMm: 'profundidade', alturaMm: 'altura', abaSuperiorMm: 'aba-superior', abaDeColagemMm: 'aba-de-colagem' };

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 60 : 600;

  const valoresMm = {};
  for (const [id, rótulo] of [['largura', 'Largura'], ['profundidade', 'Profundidade'], ['altura', 'Altura']]) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, { rótulo, mínimo: unidade === 'cm' ? 3 : 30, máximo: máximoNaUnidade, permitirZero: false });
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valoresMm[id] = converterParaMilímetros(verificação.valor, unidade);
    }
  }

  const abaSuperiorVerificação = validarQuantidade(campo('aba-superior').value, { rótulo: 'Aba superior', mínimo: 0, máximo: 100, permitirZero: true });
  if (!abaSuperiorVerificação.válido) {
    mostrarErroDeCampo(campo('aba-superior'), abaSuperiorVerificação.erro);
    válido = false;
  }

  const abaDeColagemVerificação = validarQuantidade(campo('aba-de-colagem').value, { rótulo: 'Aba de colagem', mínimo: 8, máximo: 40, permitirZero: false });
  if (!abaDeColagemVerificação.válido) {
    mostrarErroDeCampo(campo('aba-de-colagem'), abaDeColagemVerificação.erro);
    válido = false;
  }

  const textoOpcional = campo('texto-opcional').value.trim();
  if (textoOpcional.length > 200) {
    mostrarErroDeCampo(campo('texto-opcional'), 'Use um texto de até 200 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    unidade,
    larguraMm: valoresMm.largura,
    profundidadeMm: valoresMm.profundidade,
    alturaMm: valoresMm.altura,
    abaSuperiorMm: abaSuperiorVerificação.valor,
    abaDeColagemMm: abaDeColagemVerificação.valor,
    tipoDePapel: campo('tipo-de-papel').value,
    textoOpcional,
  };
}

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Medidas', `${resultadoDoCálculo.larguraMm} × ${resultadoDoCálculo.profundidadeMm} × ${resultadoDoCálculo.alturaMm} mm (largura × profundidade × altura)`],
    ['Retângulo envolvente do molde', `${Math.round(resultadoDoCálculo.retânguloEnvolvente.larguraMm * 10) / 10} × ${Math.round(resultadoDoCálculo.retânguloEnvolvente.alturaMm * 10) / 10} mm`],
    ['Aba superior', `${resultadoDoCálculo.abaSuperiorMm} mm`],
    ['Aba de colagem lateral', `${resultadoDoCálculo.abaDeColagemMm} mm`],
  ];
  if (resultadoDoCálculo.tipoDePapel) linhas.push(['Papel', resultadoDoCálculo.tipoDePapel]);
  for (const [rótulo, valor] of linhas) contêiner.append(criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor }));
}

function mostrarResumoDeFolhas(resultadoDoCálculo) {
  mostrarAvisoDeFolhas(document.querySelector('[data-resumo-de-folhas]'), contarFolhasDoMolde(resultadoDoCálculo.retânguloEnvolvente));
}

function mostrarResultado(resultadoDoCálculo) {
  desenharPréviaDoMolde(document.querySelector('[data-prévia-do-molde]'), resultadoDoCálculo);
  document.querySelector('[data-escala-da-prévia]').textContent = `Prévia fora de escala real — ${Math.round(resultadoDoCálculo.retânguloEnvolvente.larguraMm)} × ${Math.round(resultadoDoCálculo.retânguloEnvolvente.alturaMm)} mm.`;
  renderizarResumo(document.querySelector('[data-resumo-de-medidas]'), resultadoDoCálculo);
  mostrarResumoDeFolhas(resultadoDoCálculo);
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const resultadoDoCálculo = calcularSacoDePapel(entradas);
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
  campo('largura').value = String(registro.larguraMm * fator);
  campo('profundidade').value = String(registro.profundidadeMm * fator);
  campo('altura').value = String(registro.alturaMm * fator);
  campo('aba-superior').value = String(registro.abaSuperiorMm);
  campo('aba-de-colagem').value = String(registro.abaDeColagemMm);
  campo('tipo-de-papel').value = registro.tipoDePapel || '';
  campo('texto-opcional').value = registro.textoOpcional || '';
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
    const { gerarPdfDeSacoDePapel } = await import('../geração/gerar-pdf-de-saco-de-papel.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeSacoDePapel({ resultado: últimoResultado, tituloDaAtividade: últimasEntradas.textoOpcional || 'Saco de papel' });
    baixarArquivo('saco-de-papel.pdf', bytes, 'application/pdf');
  } catch {
    exibirMensagem('Não foi possível gerar o PDF neste aparelho. Tente novamente.', { tipo: 'erro' });
  } finally {
    botão.disabled = false;
  }
});

resultado.querySelector('[data-ação="baixar-svg"]').addEventListener('click', async (evento) => {
  if (!últimoResultado) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarSvgDeMolde } = await import('../geração/gerar-svg-de-molde.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const svg = gerarSvgDeMolde({ ...últimoResultado, tituloDoMolde: 'Saco de papel' });
    baixarArquivo('saco-de-papel.svg', svg, 'image/svg+xml');
  } catch {
    exibirMensagem('Não foi possível gerar o SVG neste aparelho. Tente novamente.', { tipo: 'erro' });
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
  exibirMensagem('Molde salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    gerar();
  } else {
    exibirMensagem('O molde salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}

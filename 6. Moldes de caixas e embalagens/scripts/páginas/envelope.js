// Página "Envelope": lê o formulário, calcula o molde com calcularEnvelope (cálculos/),
// mostra a prévia SVG na escala indicada e oferece PDF/SVG sob demanda e salvar.
import { calcularEnvelope } from '../cálculos/calcular-envelope.js';
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

const COLEÇÃO = 'envelope';
const formulário = document.getElementById('formulário-envelope');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const CAMPO_POR_CHAVE = { larguraDoConteúdoMm: 'largura', alturaDoConteúdoMm: 'altura', folgaMm: 'folga', tamanhoDaAbaMm: 'tamanho-da-aba' };

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 50 : 500;

  const valoresMm = {};
  for (const [id, rótulo] of [['largura', 'Largura do conteúdo'], ['altura', 'Altura do conteúdo']]) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, { rótulo, mínimo: unidade === 'cm' ? 2 : 20, máximo: máximoNaUnidade, permitirZero: false });
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valoresMm[id] = converterParaMilímetros(verificação.valor, unidade);
    }
  }

  const folgaVerificação = validarQuantidade(campo('folga').value, { rótulo: 'Folga', mínimo: 0, máximo: 15, permitirZero: true });
  if (!folgaVerificação.válido) {
    mostrarErroDeCampo(campo('folga'), folgaVerificação.erro);
    válido = false;
  }

  const abaVerificação = validarQuantidade(campo('tamanho-da-aba').value, { rótulo: 'Tamanho da aba', mínimo: 0.1, máximo: 250, permitirZero: false });
  if (!abaVerificação.válido) {
    mostrarErroDeCampo(campo('tamanho-da-aba'), abaVerificação.erro);
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
    larguraDoConteúdoMm: valoresMm.largura,
    alturaDoConteúdoMm: valoresMm.altura,
    folgaMm: folgaVerificação.valor,
    tamanhoDaAbaMm: abaVerificação.valor,
    tipoDePapel: campo('tipo-de-papel').value,
    textoOpcional,
  };
}

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Conteúdo informado', `${resultadoDoCálculo.larguraDoConteúdoMm} × ${resultadoDoCálculo.alturaDoConteúdoMm} mm`],
    ['Bolso interno (conteúdo + folga)', `${resultadoDoCálculo.larguraDoBolsoMm} × ${resultadoDoCálculo.alturaDoBolsoMm} mm`],
    ['Retângulo envolvente do molde', `${Math.round(resultadoDoCálculo.retânguloEnvolvente.larguraMm * 10) / 10} × ${Math.round(resultadoDoCálculo.retânguloEnvolvente.alturaMm * 10) / 10} mm`],
    ['Tamanho da aba', `${resultadoDoCálculo.tamanhoDaAbaMm} mm`],
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
  const resultadoDoCálculo = calcularEnvelope(entradas);
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
  campo('largura').value = String(registro.larguraDoConteúdoMm * fator);
  campo('altura').value = String(registro.alturaDoConteúdoMm * fator);
  campo('folga').value = String(registro.folgaMm);
  campo('tamanho-da-aba').value = String(registro.tamanhoDaAbaMm);
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
    const { gerarPdfDeEnvelope } = await import('../geração/gerar-pdf-de-envelope.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeEnvelope({ resultado: últimoResultado, tituloDaAtividade: últimasEntradas.textoOpcional || 'Envelope' });
    baixarArquivo('envelope.pdf', bytes, 'application/pdf');
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
    const svg = gerarSvgDeMolde({ ...últimoResultado, tituloDoMolde: 'Envelope' });
    baixarArquivo('envelope.svg', svg, 'image/svg+xml');
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

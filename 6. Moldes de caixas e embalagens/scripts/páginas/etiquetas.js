// Página "Etiquetas e tags": lê o formulário, calcula a grade com
// calcularGradeDeEtiquetas (cálculos/), mostra a prévia SVG da folha inteira e oferece
// PDF/SVG sob demanda e salvar neste aparelho.
import { calcularGradeDeEtiquetas } from '../cálculos/calcular-grade-de-etiquetas.js';
import { converterParaMilímetros } from '../cálculos/converter-para-milímetros.js';
import { desenharPréviaDoMolde } from '../interface/desenhar-prévia-do-molde.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'etiquetas';
const formulário = document.getElementById('formulário-etiquetas');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const CAMPO_POR_CHAVE = { larguraDaEtiquetaMm: 'largura', alturaDaEtiquetaMm: 'altura', espaçamentoMm: 'espaçamento', margemMm: 'margem' };

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 19 : 190;

  const valoresMm = {};
  for (const [id, rótulo] of [['largura', 'Largura da etiqueta'], ['altura', 'Altura da etiqueta']]) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, { rótulo, mínimo: unidade === 'cm' ? 1 : 10, máximo: máximoNaUnidade, permitirZero: false });
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valoresMm[id] = converterParaMilímetros(verificação.valor, unidade);
    }
  }

  const espaçamentoVerificação = validarQuantidade(campo('espaçamento').value, { rótulo: 'Espaçamento', mínimo: 0, máximo: 20, permitirZero: true });
  if (!espaçamentoVerificação.válido) {
    mostrarErroDeCampo(campo('espaçamento'), espaçamentoVerificação.erro);
    válido = false;
  }

  const margemVerificação = validarQuantidade(campo('margem').value, { rótulo: 'Margem', mínimo: 5, máximo: 30, permitirZero: false });
  if (!margemVerificação.válido) {
    mostrarErroDeCampo(campo('margem'), margemVerificação.erro);
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
    larguraDaEtiquetaMm: valoresMm.largura,
    alturaDaEtiquetaMm: valoresMm.altura,
    espaçamentoMm: espaçamentoVerificação.valor,
    margemMm: margemVerificação.valor,
    textoOpcional,
  };
}

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Etiqueta', `${resultadoDoCálculo.larguraDaEtiquetaMm} × ${resultadoDoCálculo.alturaDaEtiquetaMm} mm`],
    ['Grade', `${resultadoDoCálculo.colunas} colunas × ${resultadoDoCálculo.linhas} linhas`],
    ['Espaçamento entre etiquetas', `${resultadoDoCálculo.espaçamentoMm} mm`],
    ['Margem imprimível considerada', `${resultadoDoCálculo.margemMm} mm`],
  ];
  for (const [rótulo, valor] of linhas) contêiner.append(criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor }));
}

function mostrarResultado(resultadoDoCálculo) {
  desenharPréviaDoMolde(document.querySelector('[data-prévia-do-molde]'), resultadoDoCálculo);
  document.querySelector('[data-escala-da-prévia]').textContent = 'Prévia fora de escala real — folha A4, 210 × 297 mm.';
  document.querySelector('[data-total-de-etiquetas]').textContent = String(resultadoDoCálculo.total);
  renderizarResumo(document.querySelector('[data-resumo-de-medidas]'), resultadoDoCálculo);
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const resultadoDoCálculo = calcularGradeDeEtiquetas(entradas);
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
  campo('largura').value = String(registro.larguraDaEtiquetaMm * fator);
  campo('altura').value = String(registro.alturaDaEtiquetaMm * fator);
  campo('espaçamento').value = String(registro.espaçamentoMm);
  campo('margem').value = String(registro.margemMm);
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
    const { gerarPdfDeEtiquetas } = await import('../geração/gerar-pdf-de-etiquetas.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeEtiquetas({ resultado: últimoResultado, tituloDaAtividade: 'Etiquetas' });
    baixarArquivo('etiquetas.pdf', bytes, 'application/pdf');
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
    const svg = gerarSvgDeMolde({ ...últimoResultado, tituloDoMolde: 'Etiquetas' });
    baixarArquivo('etiquetas.svg', svg, 'image/svg+xml');
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

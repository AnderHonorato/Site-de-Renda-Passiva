// Página "Cinta para embalagem": lê o formulário, calcula a faixa com calcularCinta
// (cálculos/), mostra a prévia SVG e oferece PDF/SVG sob demanda e salvar.
import { calcularCinta } from '../cálculos/calcular-cinta.js';
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

const COLEÇÃO = 'cinta';
const formulário = document.getElementById('formulário-cinta');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const CAMPO_POR_CHAVE = { perímetroMm: 'perímetro', sobreposiçãoMm: 'sobreposição', alturaMm: 'altura' };

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 300 : 3000;

  const perímetroVerificação = validarQuantidade(campo('perímetro').value, { rótulo: 'Perímetro', mínimo: unidade === 'cm' ? 2 : 20, máximo: máximoNaUnidade, permitirZero: false });
  if (!perímetroVerificação.válido) {
    mostrarErroDeCampo(campo('perímetro'), perímetroVerificação.erro);
    válido = false;
  }
  const perímetroMm = perímetroVerificação.válido ? converterParaMilímetros(perímetroVerificação.valor, unidade) : null;

  const sobreposiçãoVerificação = validarQuantidade(campo('sobreposição').value, { rótulo: 'Sobreposição', mínimo: unidade === 'cm' ? 0.5 : 5, máximo: máximoNaUnidade, permitirZero: false });
  if (!sobreposiçãoVerificação.válido) {
    mostrarErroDeCampo(campo('sobreposição'), sobreposiçãoVerificação.erro);
    válido = false;
  }

  const alturaVerificação = validarQuantidade(campo('altura').value, { rótulo: 'Altura', mínimo: unidade === 'cm' ? 1 : 10, máximo: máximoNaUnidade, permitirZero: false });
  if (!alturaVerificação.válido) {
    mostrarErroDeCampo(campo('altura'), alturaVerificação.erro);
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
    perímetroMm,
    sobreposiçãoMm: converterParaMilímetros(sobreposiçãoVerificação.valor, unidade),
    alturaMm: converterParaMilímetros(alturaVerificação.valor, unidade),
    tipoDePapel: campo('tipo-de-papel').value,
    textoOpcional,
  };
}

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Perímetro', `${resultadoDoCálculo.perímetroMm} mm`],
    ['Sobreposição', `${resultadoDoCálculo.sobreposiçãoMm} mm`],
    ['Comprimento total da cinta', `${resultadoDoCálculo.comprimentoTotalMm} mm`],
    ['Altura', `${resultadoDoCálculo.alturaMm} mm`],
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
  const resultadoDoCálculo = calcularCinta(entradas);
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
  campo('perímetro').value = String(registro.perímetroMm * fator);
  campo('sobreposição').value = String(registro.sobreposiçãoMm * fator);
  campo('altura').value = String(registro.alturaMm * fator);
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
    const { gerarPdfDeCinta } = await import('../geração/gerar-pdf-de-cinta.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeCinta({ resultado: últimoResultado, tituloDaAtividade: últimasEntradas.textoOpcional || 'Cinta para embalagem' });
    baixarArquivo('cinta-para-embalagem.pdf', bytes, 'application/pdf');
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
    const svg = gerarSvgDeMolde({ ...últimoResultado, tituloDoMolde: 'Cinta para embalagem' });
    baixarArquivo('cinta-para-embalagem.svg', svg, 'image/svg+xml');
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
  exibirMensagem('Cinta salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    gerar();
  } else {
    exibirMensagem('A cinta salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}

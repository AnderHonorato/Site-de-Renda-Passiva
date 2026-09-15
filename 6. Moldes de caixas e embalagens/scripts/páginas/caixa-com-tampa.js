// Página "Caixa com tampa": lê o formulário, calcula base e tampa com
// calcularCaixaComTampa (cálculos/), mostra as duas prévias SVG e oferece PDF (com as duas
// peças), SVG separado de cada peça e salvar neste aparelho.
import { calcularCaixaComTampa } from '../cálculos/calcular-caixa-com-tampa.js';
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

const COLEÇÃO = 'caixa-com-tampa';
const formulário = document.getElementById('formulário-caixa');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 100 : 1000;

  const regrasEmUnidade = {
    comprimento: 'Comprimento interno',
    largura: 'Largura interna',
    'altura-da-base': 'Altura da base',
    'altura-da-tampa': 'Altura da tampa',
  };
  const valoresMm = {};
  for (const [id, rótulo] of Object.entries(regrasEmUnidade)) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, { rótulo, mínimo: unidade === 'cm' ? 1 : 10, máximo: máximoNaUnidade, permitirZero: false });
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valoresMm[id] = converterParaMilímetros(verificação.valor, unidade);
    }
  }

  const folgaVerificação = validarQuantidade(campo('folga').value, { rótulo: 'Folga', mínimo: 0, máximo: 20, permitirZero: true });
  if (!folgaVerificação.válido) {
    mostrarErroDeCampo(campo('folga'), folgaVerificação.erro);
    válido = false;
  }

  const espessuraVerificação = validarQuantidade(campo('espessura').value, { rótulo: 'Espessura do papel', mínimo: 0, máximo: 3, permitirZero: true });
  if (!espessuraVerificação.válido) {
    mostrarErroDeCampo(campo('espessura'), espessuraVerificação.erro);
    válido = false;
  }

  const abaVerificação = validarQuantidade(campo('tamanho-da-aba').value, { rótulo: 'Tamanho da aba', mínimo: 0.1, máximo: 500, permitirZero: false });
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
    comprimentoInternoMm: valoresMm.comprimento,
    larguraInternoMm: valoresMm.largura,
    alturaDaBaseMm: valoresMm['altura-da-base'],
    alturaDaTampaMm: valoresMm['altura-da-tampa'],
    folgaMm: folgaVerificação.valor,
    espessuraDoPapelMm: espessuraVerificação.valor,
    tamanhoDaAbaMm: abaVerificação.valor,
    tipoDePapel: campo('tipo-de-papel').value,
    textoOpcional,
  };
}

const CAMPO_POR_CHAVE = {
  comprimentoInternoMm: 'comprimento',
  larguraInternoMm: 'largura',
  alturaDaBaseMm: 'altura-da-base',
  alturaDaTampaMm: 'altura-da-tampa',
  folgaMm: 'folga',
  espessuraDoPapelMm: 'espessura',
  tamanhoDaAbaMm: 'tamanho-da-aba',
};

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Base — medidas internas', `${resultadoDoCálculo.resumoDaFolga.comprimentoInternoDaBaseMm} × ${resultadoDoCálculo.resumoDaFolga.larguraInternaDaBaseMm} × ${resultadoDoCálculo.base.medidasInternasMm.altura} mm`],
    ['Tampa — medidas internas', `${resultadoDoCálculo.resumoDaFolga.comprimentoInternoDaTampaMm} × ${resultadoDoCálculo.resumoDaFolga.larguraInternaDaTampaMm} × ${resultadoDoCálculo.tampa.medidasInternasMm.altura} mm`],
    ['Folga aplicada (por lado)', `${resultadoDoCálculo.folgaMm} mm`],
  ];
  if (resultadoDoCálculo.tipoDePapel) linhas.push(['Papel', resultadoDoCálculo.tipoDePapel]);
  for (const [rótulo, valor] of linhas) contêiner.append(criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor }));
}

function mostrarResumoDeFolhas(resultadoDoCálculo) {
  const total = contarFolhasDoMolde(resultadoDoCálculo.base.retânguloEnvolvente) + contarFolhasDoMolde(resultadoDoCálculo.tampa.retânguloEnvolvente);
  mostrarAvisoDeFolhas(document.querySelector('[data-resumo-de-folhas]'), total, 2);
}

function mostrarResultado(resultadoDoCálculo) {
  const previaBase = desenharPréviaDoMolde(document.querySelector('[data-prévia-da-base]'), resultadoDoCálculo.base);
  document.querySelector('[data-escala-da-base]').textContent = `Prévia fora de escala real — ${Math.round(previaBase.larguraMm)} × ${Math.round(previaBase.alturaMm)} mm.`;
  const previaTampa = desenharPréviaDoMolde(document.querySelector('[data-prévia-da-tampa]'), resultadoDoCálculo.tampa);
  document.querySelector('[data-escala-da-tampa]').textContent = `Prévia fora de escala real — ${Math.round(previaTampa.larguraMm)} × ${Math.round(previaTampa.alturaMm)} mm.`;
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
  const resultadoDoCálculo = calcularCaixaComTampa(entradas);
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
  campo('altura-da-base').value = String(registro.alturaDaBaseMm * fator);
  campo('altura-da-tampa').value = String(registro.alturaDaTampaMm * fator);
  campo('folga').value = String(registro.folgaMm);
  campo('espessura').value = String(registro.espessuraDoPapelMm);
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
    const { gerarPdfDeCaixaComTampa } = await import('../geração/gerar-pdf-de-caixa-com-tampa.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeCaixaComTampa({ resultado: últimoResultado, tituloDaAtividade: últimasEntradas.textoOpcional || 'Caixa com tampa' });
    baixarArquivo('caixa-com-tampa.pdf', bytes, 'application/pdf');
  } catch {
    exibirMensagem('Não foi possível gerar o PDF neste aparelho. Tente novamente.', { tipo: 'erro' });
  } finally {
    botão.disabled = false;
  }
});

async function baixarSvgDaPeça(peça, nomeDoArquivo, título) {
  const { gerarSvgDeMolde } = await import('../geração/gerar-svg-de-molde.js');
  const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
  const svg = gerarSvgDeMolde({ ...peça, textoOpcional: últimasEntradas.textoOpcional, tituloDoMolde: título });
  baixarArquivo(nomeDoArquivo, svg, 'image/svg+xml');
}

resultado.querySelector('[data-ação="baixar-svg-base"]').addEventListener('click', async (evento) => {
  if (!últimoResultado) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    await baixarSvgDaPeça(últimoResultado.base, 'caixa-com-tampa-base.svg', 'Caixa com tampa — base');
  } catch {
    exibirMensagem('Não foi possível gerar o SVG neste aparelho. Tente novamente.', { tipo: 'erro' });
  } finally {
    botão.disabled = false;
  }
});

resultado.querySelector('[data-ação="baixar-svg-tampa"]').addEventListener('click', async (evento) => {
  if (!últimoResultado) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    await baixarSvgDaPeça(últimoResultado.tampa, 'caixa-com-tampa-tampa.svg', 'Caixa com tampa — tampa');
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

// Página "Papel quadriculado": lê o formulário, calcula a geometria com
// calcularPapelQuadriculado (mesma função usada pelo PDF) e desenha uma prévia em SVG —
// que também é o que a impressão do navegador usa. Inclui o quadrado de calibração de
// 10 mm, sempre no tamanho real, para conferir se a impressão saiu em escala real.
import { calcularPapelQuadriculado, CORES_DE_LINHA } from '../cálculos/calcular-papel-quadriculado.js';
import { criarElementoSvg } from '../interface/criar-elemento-svg.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'papel-quadriculado';
const formulário = document.getElementById('formulário-papel-quadriculado');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimaFolha = null;
let últimasEntradas = null;
let registroAtual = null;

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;

  const regras = {
    'tamanho-da-quadrícula': { rótulo: 'Tamanho da quadrícula', mínimo: 2, máximo: 20, inteiro: false, casasMáximas: 1 },
    margem: { rótulo: 'Margem', mínimo: 5, máximo: 25, inteiro: true },
  };
  const valores = {};
  for (const [id, regra] of Object.entries(regras)) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, regra);
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valores[id] = verificação.valor;
    }
  }

  const corDaLinha = campo('cor-da-linha').value;
  if (!Object.hasOwn(CORES_DE_LINHA, corDaLinha)) {
    mostrarErroDeCampo(campo('cor-da-linha'), 'Escolha uma cor de linha válida.');
    válido = false;
  }

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    tamanhoDaQuadrículaMm: valores['tamanho-da-quadrícula'],
    margemMm: valores.margem,
    corDaLinha,
    comCabeçalho: campo('com-cabeçalho').checked,
    tituloDaAtividade: título,
  };
}

function desenharSvg(folha) {
  const linhasVerticais = [];
  for (let coluna = 0; coluna <= folha.colunas; coluna += 1) {
    const x = folha.xInicialMm + coluna * folha.tamanhoDaQuadrículaMm;
    linhasVerticais.push(criarElementoSvg('line', { x1: x, y1: folha.yInicialMm, x2: x, y2: folha.yInicialMm + folha.alturaGradeMm, stroke: folha.corDaLinhaHex, 'stroke-width': 0.15 }));
  }
  const linhasHorizontais = [];
  for (let linha = 0; linha <= folha.linhas; linha += 1) {
    const y = folha.yInicialMm + linha * folha.tamanhoDaQuadrículaMm;
    linhasHorizontais.push(criarElementoSvg('line', { x1: folha.xInicialMm, y1: y, x2: folha.xInicialMm + folha.larguraGradeMm, y2: y, stroke: folha.corDaLinhaHex, 'stroke-width': 0.15 }));
  }
  const calibração = [
    criarElementoSvg('rect', {
      x: folha.calibraçãoXMm,
      y: folha.calibraçãoYMm,
      width: folha.tamanhoDaCalibraçãoMm,
      height: folha.tamanhoDaCalibraçãoMm,
      fill: 'none',
      stroke: '#c0392b',
      'stroke-width': 0.5,
    }),
    criarElementoSvg(
      'text',
      { x: folha.calibraçãoXMm + folha.tamanhoDaCalibraçãoMm, y: folha.calibraçãoYMm - 1.5, 'font-size': 3, 'text-anchor': 'end', fill: '#c0392b', 'font-family': "'Figtree', sans-serif" },
      [`${folha.tamanhoDaCalibraçãoMm} mm de calibração`],
    ),
  ];

  return criarElementoSvg(
    'svg',
    { class: 'papel-quadriculado-svg', viewBox: `0 0 ${folha.larguraPáginaMm} ${folha.alturaPáginaMm}`, role: 'img', 'aria-label': 'Prévia do papel quadriculado, com o quadrado de calibração de 10 mm' },
    [...linhasVerticais, ...linhasHorizontais, ...calibração],
  );
}

function mostrarResultado(entradas, folha) {
  const título = entradas.tituloDaAtividade || 'Papel quadriculado';
  document.querySelector('[data-título-impresso]').textContent = título;
  document.querySelector('[data-campos-impressos]').hidden = !entradas.comCabeçalho;

  document.querySelector('[data-papel-quadriculado-contêiner]').replaceChildren(desenharSvg(folha));

  document.querySelector('[data-resumo-da-folha]').textContent =
    `Quadrícula de ${folha.tamanhoDaQuadrículaMm} mm, margem de ${folha.margemMm} mm: ${folha.colunas} colunas × ${folha.linhas} linhas. Imprima em tamanho real (100%) e confira o quadrado vermelho: ele precisa medir exatamente ${folha.tamanhoDaCalibraçãoMm} mm com uma régua.`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const folha = calcularPapelQuadriculado(entradas);
  if (!folha.válido) {
    exibirMensagem(folha.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimaFolha = folha;
  mostrarResultado(entradas, folha);
}

function preencher(registro) {
  campo('tamanho-da-quadrícula').value = String(registro.tamanhoDaQuadrículaMm);
  campo('margem').value = String(registro.margemMm);
  campo('cor-da-linha').value = registro.corDaLinha;
  campo('título-da-atividade').value = registro.tituloDaAtividade;
  campo('com-cabeçalho').checked = registro.comCabeçalho;
  campo('nome-do-registro').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  gerar();
});

resultado.querySelector('[data-ação="imprimir"]').addEventListener('click', () => {
  imprimirPágina();
});

resultado.querySelector('[data-ação="baixar-pdf"]').addEventListener('click', async (evento) => {
  if (!últimaFolha || !últimasEntradas) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDePapelQuadriculado } = await import('../geração/gerar-pdf-de-papel-quadriculado.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDePapelQuadriculado({ folha: últimaFolha, tituloDaAtividade: últimasEntradas.tituloDaAtividade, comCabeçalho: últimasEntradas.comCabeçalho });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'papel-quadriculado'}.pdf`, bytes, 'application/pdf');
  } catch {
    exibirMensagem('Não foi possível gerar o PDF neste aparelho. Tente imprimir a prévia diretamente.', { tipo: 'erro' });
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
  exibirMensagem('Configuração salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    gerar();
  } else {
    exibirMensagem('O papel quadriculado salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}

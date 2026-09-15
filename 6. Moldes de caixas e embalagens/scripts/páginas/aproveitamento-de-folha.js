// Página "Aproveitamento de folha": lê o formulário, compara as duas orientações com
// calcularAproveitamentoDeFolha (cálculos/) e mostra a prévia da grade escolhida. Não gera
// PDF (é uma ferramenta de planejamento, não um molde para recortar).
import { calcularAproveitamentoDeFolha } from '../cálculos/calcular-aproveitamento-de-folha.js';
import { converterParaMilímetros } from '../cálculos/converter-para-milímetros.js';
import { desenharPréviaDoMolde } from '../interface/desenhar-prévia-do-molde.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'aproveitamento-de-folha';
const formulário = document.getElementById('formulário-aproveitamento');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const CAMPO_POR_CHAVE = { larguraDaFolhaMm: 'largura-da-folha', alturaDaFolhaMm: 'altura-da-folha', larguraDaPeçaMm: 'largura-da-peça', alturaDaPeçaMm: 'altura-da-peça', espaçamentoMm: 'espaçamento' };

function unidadeEscolhida() {
  return formulário.querySelector('input[name="unidade"]:checked').value;
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  let válido = true;
  const unidade = unidadeEscolhida();
  const máximoNaUnidade = unidade === 'cm' ? 300 : 3000;

  const valoresMm = {};
  for (const [id, rótulo] of [
    ['largura-da-folha', 'Largura da folha'],
    ['altura-da-folha', 'Altura da folha'],
    ['largura-da-peça', 'Largura da peça'],
    ['altura-da-peça', 'Altura da peça'],
  ]) {
    const entrada = campo(id);
    const verificação = validarQuantidade(entrada.value, { rótulo, mínimo: unidade === 'cm' ? 0.5 : 5, máximo: máximoNaUnidade, permitirZero: false });
    if (!verificação.válido) {
      mostrarErroDeCampo(entrada, verificação.erro);
      válido = false;
    } else {
      valoresMm[id] = converterParaMilímetros(verificação.valor, unidade);
    }
  }

  const espaçamentoVerificação = validarQuantidade(campo('espaçamento').value, { rótulo: 'Espaçamento', mínimo: 0, máximo: 50, permitirZero: true });
  if (!espaçamentoVerificação.válido) {
    mostrarErroDeCampo(campo('espaçamento'), espaçamentoVerificação.erro);
    válido = false;
  }

  if (!válido) return null;
  return {
    unidade,
    larguraDaFolhaMm: valoresMm['largura-da-folha'],
    alturaDaFolhaMm: valoresMm['altura-da-folha'],
    larguraDaPeçaMm: valoresMm['largura-da-peça'],
    alturaDaPeçaMm: valoresMm['altura-da-peça'],
    espaçamentoMm: espaçamentoVerificação.valor,
  };
}

function renderizarResumo(contêiner, resultadoDoCálculo) {
  contêiner.replaceChildren();
  const linhas = [
    ['Sem girar a peça', `${resultadoDoCálculo.semGirar.colunas} × ${resultadoDoCálculo.semGirar.linhas} = ${resultadoDoCálculo.semGirar.total} peças`],
    ['Peça girada 90°', `${resultadoDoCálculo.girada.colunas} × ${resultadoDoCálculo.girada.linhas} = ${resultadoDoCálculo.girada.total} peças`],
  ];
  for (const [rótulo, valor] of linhas) contêiner.append(criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor }));
}

function mostrarResultado(resultadoDoCálculo) {
  document.querySelector('[data-total-de-peças]').textContent = String(resultadoDoCálculo.totalDePeças);
  document.querySelector('[data-orientação-escolhida]').textContent =
    resultadoDoCálculo.melhorOrientação === 'girada' ? 'peças cabem com a peça girada 90°' : 'peças cabem sem girar a peça';
  renderizarResumo(document.querySelector('[data-resumo-de-medidas]'), resultadoDoCálculo);
  desenharPréviaDoMolde(document.querySelector('[data-prévia-do-molde]'), resultadoDoCálculo);
  document.querySelector('[data-escala-da-prévia]').textContent = `Prévia fora de escala real — folha de ${Math.round(resultadoDoCálculo.retânguloEnvolvente.larguraMm)} × ${Math.round(resultadoDoCálculo.retânguloEnvolvente.alturaMm)} mm.`;
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const resultadoDoCálculo = calcularAproveitamentoDeFolha(entradas);
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
  campo('largura-da-folha').value = String(registro.larguraDaFolhaMm * fator);
  campo('altura-da-folha').value = String(registro.alturaDaFolhaMm * fator);
  campo('largura-da-peça').value = String(registro.larguraDaPeçaMm * fator);
  campo('altura-da-peça').value = String(registro.alturaDaPeçaMm * fator);
  campo('espaçamento').value = String(registro.espaçamentoMm);
  campo('nome-do-registro').value = registro.nome;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  gerar();
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
  exibirMensagem('Comparação salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    preencher(registro);
    gerar();
  } else {
    exibirMensagem('A comparação salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}

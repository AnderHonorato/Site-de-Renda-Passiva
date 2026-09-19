// Página "Tabuada": lê o formulário, valida, gera com gerarTabuada (determinística pela
// semente quando embaralhada), mostra a prévia (também usada na impressão), oferece PDF
// sob demanda e permite salvar a configuração neste aparelho.
import { gerarSementeAleatória } from '../geração/criar-gerador-pseudoaleatório.js';
import { gerarTabuada } from '../cálculos/gerar-tabuada.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'tabuada';
const formulário = document.getElementById('formulário-tabuada');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimaTabuada = null;
let últimasEntradas = null;
let registroAtual = null;

campo('semente').value = String(gerarSementeAleatória());
campo('botão-nova-semente').addEventListener('click', () => {
  campo('semente').value = String(gerarSementeAleatória());
});

function fatoresSelecionados() {
  return [...formulário.querySelectorAll('input[name="fator"]:checked')].map((entrada) => Number(entrada.value));
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  campo('fatores-erro').hidden = true;
  let válido = true;

  const fatores = fatoresSelecionados();
  if (fatores.length === 0) {
    campo('fatores-erro').hidden = false;
    campo('fatores-erro').textContent = 'Escolha ao menos um fator.';
    válido = false;
  }

  const regras = {
    'multiplicador-mínimo': { rótulo: 'Multiplicador inicial', mínimo: 0, máximo: 1000, inteiro: true },
    'multiplicador-máximo': { rótulo: 'Multiplicador final', mínimo: 0, máximo: 1000, inteiro: true },
    semente: { rótulo: 'Semente', mínimo: 0, máximo: 4_294_967_295, inteiro: true },
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
  if (válido && valores['multiplicador-mínimo'] > valores['multiplicador-máximo']) {
    mostrarErroDeCampo(campo('multiplicador-máximo'), 'O multiplicador final precisa ser maior ou igual ao inicial.');
    válido = false;
  }

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    fatores,
    multiplicadorMínimo: valores['multiplicador-mínimo'],
    multiplicadorMáximo: valores['multiplicador-máximo'],
    ordem: formulário.querySelector('input[name="ordem"]:checked').value,
    semente: valores.semente,
    comCabeçalho: campo('com-cabeçalho').checked,
    tituloDaAtividade: título,
  };
}

function renderizarItens(contêiner, itens, mostrarResposta) {
  const grade = criarElemento('div', { classe: 'grade-de-tabuada' });
  itens.forEach((item, índice) => {
    const resposta = mostrarResposta ? String(item.resposta) : '_____';
    grade.append(criarElemento('p', { classe: 'item-de-operação', texto: `${índice + 1})  ${item.fator} × ${item.multiplicador} = ${resposta}` }));
  });
  contêiner.replaceChildren(grade);
}

function mostrarResultado(entradas, tabuada) {
  const título = entradas.tituloDaAtividade || 'Tabuada';
  document.querySelector('[data-título-impresso]').textContent = título;
  document.querySelector('[data-título-gabarito]').textContent = `Gabarito — ${título}`;
  document.querySelector('[data-campos-impressos]').hidden = !entradas.comCabeçalho;

  renderizarItens(document.querySelector('[data-conteúdo-da-atividade]'), tabuada.itens, false);
  renderizarItens(document.querySelector('[data-conteúdo-do-gabarito]'), tabuada.itens, true);

  document.querySelector('[data-resumo-da-semente]').textContent =
    entradas.ordem === 'embaralhada' ? `Ordem embaralhada com a semente ${tabuada.sementeUsada}.` : `Ordem sequencial (a semente ${tabuada.sementeUsada} não altera esta folha).`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const tabuada = gerarTabuada(entradas);
  if (!tabuada.válido) {
    exibirMensagem(tabuada.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimaTabuada = tabuada;
  mostrarResultado(entradas, tabuada);
}

function preencher(registro) {
  for (const entrada of formulário.querySelectorAll('input[name="fator"]')) entrada.checked = registro.fatores.includes(Number(entrada.value));
  campo('multiplicador-mínimo').value = String(registro.multiplicadorMínimo);
  campo('multiplicador-máximo').value = String(registro.multiplicadorMáximo);
  formulário.querySelector(`input[name="ordem"][value="${registro.ordem}"]`).checked = true;
  campo('título-da-atividade').value = registro.tituloDaAtividade;
  campo('com-cabeçalho').checked = registro.comCabeçalho;
  campo('semente').value = String(registro.semente);
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
  if (!últimaTabuada || !últimasEntradas) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDeTabuada } = await import('../geração/gerar-pdf-de-tabuada.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeTabuada({
      itens: últimaTabuada.itens,
      tituloDaAtividade: últimasEntradas.tituloDaAtividade,
      comCabeçalho: últimasEntradas.comCabeçalho,
      sementeUsada: últimaTabuada.sementeUsada,
      ordem: últimasEntradas.ordem,
    });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'tabuada'}.pdf`, bytes, 'application/pdf');
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
    exibirMensagem('A tabuada salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}

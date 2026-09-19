// Página "Operações matemáticas": lê o formulário, valida, gera a folha com
// gerarListaDeOperações (determinística pela semente), mostra a prévia (que também é o
// que a impressão usa), oferece PDF (gerado sob demanda) e permite salvar a configuração.
import { criarGeradorPseudoaleatório, gerarSementeAleatória } from '../geração/criar-gerador-pseudoaleatório.js';
import { gerarListaDeOperações } from '../cálculos/gerar-lista-de-operações.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'operações-matemáticas';
const SÍMBOLO = { '+': '+', '−': '−', '×': '×', '÷': '÷' };
const FAIXAS_DE_DIFICULDADE = { fácil: [0, 20], médio: [0, 100], difícil: [0, 1000] };

const formulário = document.getElementById('formulário-operações');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let últimaLista = null;
let últimasEntradas = null;
let registroAtual = null;

campo('semente').value = String(gerarSementeAleatória());

campo('dificuldade').addEventListener('change', (evento) => {
  const faixa = FAIXAS_DE_DIFICULDADE[evento.target.value];
  if (!faixa) return;
  campo('mínimo').value = String(faixa[0]);
  campo('máximo').value = String(faixa[1]);
});

campo('botão-nova-semente').addEventListener('click', () => {
  campo('semente').value = String(gerarSementeAleatória());
});

function operadoresSelecionados() {
  return [...formulário.querySelectorAll('input[name="operador"]:checked')].map((entrada) => entrada.value);
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  campo('operadores-erro').hidden = true;
  let válido = true;

  const operadores = operadoresSelecionados();
  if (operadores.length === 0) {
    campo('operadores-erro').hidden = false;
    campo('operadores-erro').textContent = 'Escolha ao menos uma operação.';
    válido = false;
  }

  const regras = {
    quantidade: { rótulo: 'Quantidade de exercícios', mínimo: 1, máximo: 200, inteiro: true },
    mínimo: { rótulo: 'Menor número', mínimo: 0, máximo: 1_000_000, inteiro: true },
    máximo: { rótulo: 'Maior número', mínimo: 0, máximo: 1_000_000, inteiro: true },
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
  if (válido && valores.mínimo > valores.máximo) {
    mostrarErroDeCampo(campo('máximo'), 'O maior número precisa ser maior ou igual ao menor número.');
    válido = false;
  }

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return {
    operadores,
    quantidade: valores.quantidade,
    mínimo: valores.mínimo,
    máximo: valores.máximo,
    permitirNegativos: campo('permitir-negativos').checked,
    reserva: campo('reserva').value,
    divisão: campo('divisão').value,
    apresentação: formulário.querySelector('input[name="apresentação"]:checked').value,
    semente: valores.semente,
    comCabeçalho: campo('com-cabeçalho').checked,
    tituloDaAtividade: título,
  };
}

function textoDaResposta(operação) {
  if (operação.operador === '÷' && operação.resto) return `${operação.resposta} (resto ${operação.resto})`;
  return String(operação.resposta);
}

function renderizarEmLinha(contêiner, operações, mostrarResposta) {
  const lista = criarElemento('div', { classe: 'grade-de-operações' });
  operações.forEach((operação, índice) => {
    const resposta = mostrarResposta ? textoDaResposta(operação) : '______';
    lista.append(
      criarElemento('p', { classe: 'item-de-operação', texto: `${índice + 1})  ${operação.operandoA} ${SÍMBOLO[operação.operador]} ${operação.operandoB} = ${resposta}` }),
    );
  });
  contêiner.append(lista);
}

function renderizarArmada(contêiner, operações, mostrarResposta) {
  const grade = criarElemento('div', { classe: 'grade-de-operações-armada' });
  operações.forEach((operação, índice) => {
    const linhaOperandoA = criarElemento('div', { classe: 'operação-armada-linha' }, [criarElemento('span', { texto: String(operação.operandoA) })]);
    const linhaOperandoB = criarElemento('div', { classe: 'operação-armada-linha' }, [
      criarElemento('span', { classe: 'operação-armada-operador', texto: SÍMBOLO[operação.operador] }),
      criarElemento('span', { texto: String(operação.operandoB) }),
    ]);
    const filhos = [
      criarElemento('span', { classe: 'operação-armada-numeração', texto: `${índice + 1})` }),
      linhaOperandoA,
      linhaOperandoB,
      criarElemento('div', { classe: 'operação-armada-régua' }),
    ];
    if (mostrarResposta) {
      filhos.push(criarElemento('div', { classe: 'operação-armada-linha', texto: textoDaResposta(operação) }));
    } else {
      filhos.push(criarElemento('div', { classe: 'operação-armada-espaço-resposta' }));
    }
    grade.append(criarElemento('div', { classe: 'operação-armada' }, filhos));
  });
  contêiner.append(grade);
}

function renderizarConteúdo(contêiner, operações, apresentação, mostrarResposta) {
  contêiner.replaceChildren();
  if (apresentação === 'armada') renderizarArmada(contêiner, operações, mostrarResposta);
  else renderizarEmLinha(contêiner, operações, mostrarResposta);
}

function mostrarResultado(entradas, lista) {
  const título = entradas.tituloDaAtividade || 'Operações matemáticas';
  document.querySelector('[data-título-impresso]').textContent = título;
  document.querySelector('[data-título-gabarito]').textContent = `Gabarito — ${título}`;
  document.querySelector('[data-campos-impressos]').hidden = !entradas.comCabeçalho;

  renderizarConteúdo(document.querySelector('[data-conteúdo-da-atividade]'), lista.operações, entradas.apresentação, false);
  renderizarConteúdo(document.querySelector('[data-conteúdo-do-gabarito]'), lista.operações, entradas.apresentação, true);

  const aviso = lista.restriçõesRelaxadas > 0 ? ` ${lista.restriçõesRelaxadas} exercício(s) não conseguiram satisfazer exatamente a regra de reserva/empréstimo escolhida dentro do intervalo informado.` : '';
  document.querySelector('[data-resumo-da-semente]').textContent = `Semente desta folha: ${lista.sementeUsada}.${aviso}`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const lista = gerarListaDeOperações(entradas);
  if (!lista.válido) {
    exibirMensagem(lista.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimaLista = lista;
  mostrarResultado(entradas, lista);
}

function preencher(registro) {
  for (const entrada of formulário.querySelectorAll('input[name="operador"]')) entrada.checked = registro.operadores.includes(entrada.value);
  campo('quantidade').value = String(registro.quantidade);
  campo('dificuldade').value = 'personalizado';
  campo('mínimo').value = String(registro.mínimo);
  campo('máximo').value = String(registro.máximo);
  formulário.querySelector(`input[name="apresentação"][value="${registro.apresentação}"]`).checked = true;
  campo('reserva').value = registro.reserva;
  campo('divisão').value = registro.divisão;
  campo('permitir-negativos').checked = registro.permitirNegativos;
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
  if (!últimaLista || !últimasEntradas) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDeOperações } = await import('../geração/gerar-pdf-de-operações.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDeOperações({
      operações: últimaLista.operações,
      apresentação: últimasEntradas.apresentação,
      tituloDaAtividade: últimasEntradas.tituloDaAtividade,
      comCabeçalho: últimasEntradas.comCabeçalho,
      sementeUsada: últimaLista.sementeUsada,
    });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'operacoes-matematicas'}.pdf`, bytes, 'application/pdf');
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
    exibirMensagem('A atividade salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}

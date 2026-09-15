// Página "Planejador de estudos": mantém a lista editável de disciplinas, monta a grade
// semanal com montarPlanejadorDeEstudos (mesma função usada pelo PDF), mostra a prévia em
// tabela (também usada na impressão), oferece PDF sob demanda e permite salvar. Não avalia
// conteúdo nem promete aprovação: só distribui o tempo informado.
import { montarPlanejadorDeEstudos, QUANTIDADE_MÁXIMA_DE_DISCIPLINAS } from '../cálculos/montar-planejador-de-estudos.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { criarElementoSvg } from '../interface/criar-elemento-svg.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';

const COLEÇÃO = 'planejador-de-estudos';
const NOMES_DOS_DIAS = { segunda: 'Segunda', terça: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sábado: 'Sábado', domingo: 'Domingo' };
const formulário = document.getElementById('formulário-planejador-de-estudos');
const formulárioDeSalvar = document.getElementById('formulário-salvar');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const listaDeDisciplinas = document.querySelector('[data-lista-de-disciplinas]');
const campo = (id) => document.getElementById(id);
let últimoResultado = null;
let últimasEntradas = null;
let registroAtual = null;

const DISCIPLINAS_DE_EXEMPLO = [
  { nome: 'Matemática', minutosPorSessão: 30 },
  { nome: 'Português', minutosPorSessão: 30 },
];

function íconeRemover() {
  return criarElementoSvg('svg', { class: 'ícone', 'aria-hidden': 'true', focusable: 'false' }, [criarElementoSvg('use', { href: `${obterRaiz()}recursos/ícones/ícones.svg#excluir` })]);
}

function criarLinhaDeDisciplina(nome = '', minutosPorSessão = 30) {
  const campoNome = criarElemento('input', { classe: 'entrada', atributos: { type: 'text', maxlength: 24, autocomplete: 'off', placeholder: 'Disciplina' }, dados: { campo: 'nome' } });
  campoNome.value = nome;
  const campoMinutos = criarElemento('input', {
    classe: 'entrada',
    atributos: { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Minutos' },
    dados: { campo: 'minutos' },
  });
  campoMinutos.value = String(minutosPorSessão);

  const botãoRemover = criarElemento('button', { classe: 'botão botão-secundário botão-ícone', atributos: { type: 'button', 'aria-label': 'Remover esta disciplina' } }, [íconeRemover()]);
  botãoRemover.addEventListener('click', () => linha.remove());

  const linha = criarElemento('div', { classe: 'par-de-flashcard' }, [
    criarElemento('label', { classe: 'campo par-de-flashcard-campo' }, [criarElemento('span', { classe: 'visualmente-oculto', texto: 'Nome da disciplina' }), campoNome]),
    criarElemento('label', { classe: 'campo par-de-flashcard-campo' }, [criarElemento('span', { classe: 'visualmente-oculto', texto: 'Minutos por sessão' }), campoMinutos]),
    botãoRemover,
  ]);
  return linha;
}

for (const disciplina of DISCIPLINAS_DE_EXEMPLO) listaDeDisciplinas.append(criarLinhaDeDisciplina(disciplina.nome, disciplina.minutosPorSessão));

document.getElementById('botão-adicionar-disciplina').addEventListener('click', () => {
  if (listaDeDisciplinas.children.length >= QUANTIDADE_MÁXIMA_DE_DISCIPLINAS) {
    exibirMensagem(`Use no máximo ${QUANTIDADE_MÁXIMA_DE_DISCIPLINAS} disciplinas.`, { tipo: 'aviso' });
    return;
  }
  const linha = criarLinhaDeDisciplina();
  listaDeDisciplinas.append(linha);
  linha.querySelector('input').focus();
});

function disciplinasDoFormulário() {
  return [...listaDeDisciplinas.children].map((linha) => ({
    nome: linha.querySelector('[data-campo="nome"]').value.trim(),
    minutosTexto: linha.querySelector('[data-campo="minutos"]').value,
  }));
}

function diasSelecionados() {
  return [...formulário.querySelectorAll('input[name="dia"]:checked')].map((entrada) => entrada.value);
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  campo('dias-erro').hidden = true;
  let válido = true;

  const linhas = disciplinasDoFormulário();
  const preenchidas = linhas.filter((linha) => linha.nome || linha.minutosTexto.trim());
  if (preenchidas.length === 0) {
    mostrarErroDeCampo(listaDeDisciplinas, 'Adicione ao menos uma disciplina.');
    válido = false;
  }
  const disciplinas = [];
  for (const linha of preenchidas) {
    const verificação = validarQuantidade(linha.minutosTexto, { rótulo: 'Minutos por sessão', mínimo: 5, máximo: 240, inteiro: true });
    if (!linha.nome || linha.nome.length > 24 || !verificação.válido) {
      mostrarErroDeCampo(listaDeDisciplinas, 'Cada disciplina precisa de um nome curto (até 24 caracteres) e minutos por sessão entre 5 e 240.');
      válido = false;
      break;
    }
    disciplinas.push({ nome: linha.nome, minutosPorSessão: verificação.valor });
  }

  const verificaçãoDaPausa = validarQuantidade(campo('pausa-minutos').value, { rótulo: 'Pausa entre sessões', mínimo: 0, máximo: 60, inteiro: true });
  if (!verificaçãoDaPausa.válido) {
    mostrarErroDeCampo(campo('pausa-minutos'), verificaçãoDaPausa.erro);
    válido = false;
  }

  const dias = diasSelecionados();
  if (dias.length === 0) {
    campo('dias-erro').hidden = false;
    campo('dias-erro').textContent = 'Escolha ao menos um dia da semana.';
    válido = false;
  }

  const título = campo('título-da-atividade').value.trim();
  if (título.length > 120) {
    mostrarErroDeCampo(campo('título-da-atividade'), 'Use um nome de até 120 caracteres.');
    válido = false;
  }

  if (!válido) return null;
  return { disciplinas, pausaMinutos: verificaçãoDaPausa.valor, diasDaSemana: dias, comCabeçalho: campo('com-cabeçalho').checked, tituloDaAtividade: título };
}

function criarTabela(gerado) {
  const cabeçalho = criarElemento('tr', {}, [
    criarElemento('th', { texto: 'Sessão' }),
    ...gerado.diasDaSemana.map((dia) => criarElemento('th', { texto: NOMES_DOS_DIAS[dia] })),
  ]);
  const linhas = gerado.blocosDoDia.map((bloco) => {
    const rótulo = bloco.tipo === 'pausa' ? `Pausa — ${bloco.minutos} min` : `${bloco.disciplina} — ${bloco.minutos} min`;
    return criarElemento('tr', { atributos: { 'data-pausa': bloco.tipo === 'pausa' || undefined } }, [
      criarElemento('td', { texto: rótulo }),
      ...gerado.diasDaSemana.map(() => criarElemento('td', { texto: rótulo })),
    ]);
  });
  const linhaDeTotal = criarElemento('tr', { classe: 'linha-de-total' }, [
    criarElemento('td', { texto: 'Total do dia' }),
    ...gerado.diasDaSemana.map(() => criarElemento('td', { texto: `${gerado.minutosTotaisPorDia} min` })),
  ]);
  return criarElemento('table', { classe: 'tabela grade-semanal-de-estudos' }, [
    criarElemento('thead', {}, [cabeçalho]),
    criarElemento('tbody', {}, linhas),
    criarElemento('tfoot', {}, [linhaDeTotal]),
  ]);
}

function mostrarResultado(entradas, gerado) {
  const título = entradas.tituloDaAtividade || 'Planejador de estudos';
  document.querySelector('[data-título-impresso]').textContent = título;
  document.querySelector('[data-campos-impressos]').hidden = !entradas.comCabeçalho;

  document.querySelector('[data-tabela-contêiner]').replaceChildren(criarTabela(gerado));

  document.querySelector('[data-resumo]').textContent =
    `Estudo por dia: ${gerado.minutosDeEstudoPorDia} min (${gerado.minutosTotaisPorDia} min com pausas). Na semana, em ${gerado.diasDaSemana.length} dia(s): ${gerado.minutosDeEstudoPorSemana} min de estudo (${gerado.minutosTotaisPorSemana} min com pausas). Este planejador só distribui o tempo informado; não avalia conteúdo nem promete aprovação.`;

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

function gerar() {
  const entradas = lerEntradas();
  if (!entradas) {
    focarPrimeiroErro(formulário);
    return;
  }
  const gerado = montarPlanejadorDeEstudos(entradas);
  if (!gerado.válido) {
    exibirMensagem(gerado.erro, { tipo: 'erro' });
    return;
  }
  últimasEntradas = entradas;
  últimoResultado = gerado;
  mostrarResultado(entradas, gerado);
}

function preencher(registro) {
  listaDeDisciplinas.replaceChildren(...registro.disciplinas.map((disciplina) => criarLinhaDeDisciplina(disciplina.nome, disciplina.minutosPorSessão)));
  campo('pausa-minutos').value = String(registro.pausaMinutos);
  for (const entrada of formulário.querySelectorAll('input[name="dia"]')) entrada.checked = registro.diasDaSemana.includes(entrada.value);
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
  if (!últimoResultado || !últimasEntradas) return;
  const botão = evento.currentTarget;
  botão.disabled = true;
  try {
    const { gerarPdfDePlanejadorDeEstudos } = await import('../geração/gerar-pdf-de-planejador-de-estudos.js');
    const { baixarArquivo } = await import('../comum/armazenamento/baixar-arquivo.js');
    const bytes = gerarPdfDePlanejadorDeEstudos({ gerado: últimoResultado, tituloDaAtividade: últimasEntradas.tituloDaAtividade, comCabeçalho: últimasEntradas.comCabeçalho });
    baixarArquivo(`${últimasEntradas.tituloDaAtividade || 'planejador-de-estudos'}.pdf`, bytes, 'application/pdf');
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
    exibirMensagem('O planejador salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}
